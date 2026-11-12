// Jewbuntu Web Server: everything that is not UI (status, helper calls, site creation).
// main.js is the GTK front end; ci/webserver-sites-test.js drives these functions headless.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup?version=3.0';

export const HELPER = GLib.getenv('JEWBUNTU_WEBSERVER_HELPER') || '/usr/libexec/jewbuntu/jewbuntu-webserver-helper';
// pkexec on the desktop; tests set JEWBUNTU_WEBSERVER_ELEVATE=sudo (needs root rights anyway).
const ELEVATE = (GLib.getenv('JEWBUNTU_WEBSERVER_ELEVATE') || 'pkexec').split(' ');
const USER = GLib.get_user_name();
export const SITES = GLib.build_filenamev([GLib.get_home_dir(), 'Sites']);
export const NAME_RE = /^[a-z0-9][a-z0-9-]{0,30}$/;
export const KINDS = {empty: 'Empty PHP site', wordpress: 'WordPress', codeigniter: 'CodeIgniter 4'};

// ---------- small async helpers ----------

export function run(argv, {input = null} = {}) {
    return new Promise(resolve => {
        try {
            const flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE | (input ? Gio.SubprocessFlags.STDIN_PIPE : 0);
            const p = Gio.Subprocess.new(argv, flags);
            p.communicate_utf8_async(input, null, (proc, res) => {
                try {
                    const [, out, err] = proc.communicate_utf8_finish(res);
                    resolve({ok: proc.get_successful(), out: (out ?? '').trim(), err: (err ?? '').trim(), status: proc.get_exit_status()});
                } catch (e) {
                    resolve({ok: false, out: '', err: e.message});
                }
            });
        } catch (e) {
            resolve({ok: false, out: '', err: e.message});
        }
    });
}

/** Run the privileged helper; returns the parsed JSON line it prints. */
export async function helper(...args) {
    const r = await run([...ELEVATE, HELPER, ...args]);
    const line = r.out.split('\n').filter(l => l.startsWith('{')).pop();
    if (line) {
        const j = JSON.parse(line);
        if (!j.ok)
            throw new Error(j.error || 'the helper reported an error');
        return j;
    }
    if (r.status === 126 || r.status === 127)
        throw new Error('Not authorised (the password prompt was cancelled).');
    throw new Error(r.err || 'the helper did not answer');
}

function readFile(path) {
    try {
        const [ok, bytes] = GLib.file_get_contents(path);
        return ok ? new TextDecoder().decode(bytes) : null;
    } catch (e) {
        return null;
    }
}

function readBinary(path, n) {
    const stream = Gio.File.new_for_path(path).read(null);
    const bytes = stream.read_bytes(n, null).toArray();
    stream.close(null);
    if (bytes.length < n)
        throw new Error(`short read from ${path}`);
    return bytes;
}

/** Status without root: packages, services, sharing, this user's enabled sites. */
export async function readStatus() {
    const dpkg = await run(['dpkg-query', '-W', '-f', '${db:Status-Abbrev}\n', 'apache2', 'mariadb-server', 'php']);
    const installed = dpkg.out.split('\n').filter(l => l.startsWith('ii')).length === 3;
    let running = false, sharing = false;
    const sites = [];
    if (installed) {
        const a = await run(['systemctl', 'is-active', 'apache2']);
        const m = await run(['systemctl', 'is-active', 'mariadb']);
        running = a.out === 'active' && m.out === 'active';
        sharing = /^Listen 80$/m.test(readFile('/etc/apache2/ports.conf') ?? '');
        const dir = Gio.File.new_for_path('/etc/apache2/sites-enabled');
        try {
            const en = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
            let info;
            const prefix = `jewbuntu-${USER}-`;
            while ((info = en.next_file(null))) {
                const n = info.get_name();
                if (n.startsWith(prefix) && n.endsWith('.conf'))
                    sites.push(n.slice(prefix.length, -5));
            }
        } catch (e) {}
        sites.sort();
    }
    const composer = (await run(['sh', '-c', 'command -v composer'])).ok;
    return {installed, running, sharing, sites, composer};
}

function randomSalt(len = 64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#%^&*()-_[]{}<>~+=,.;:/?|';
    // Salts come from the kernel CSPRNG, not Math.random.
    const raw = readBinary('/dev/urandom', len);
    let s = '';
    for (let i = 0; i < len; i++)
        s += chars[raw[i] % chars.length];
    return s;
}

async function download(url) {
    const session = new Soup.Session({user_agent: 'Jewbuntu-WebServer/0.1'});
    const msg = Soup.Message.new('GET', url);
    const bytes = await new Promise((resolve, reject) => {
        session.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (s, res) => {
            try {
                resolve(s.send_and_read_finish(res));
            } catch (e) {
                reject(e);
            }
        });
    });
    if (msg.get_status() !== Soup.Status.OK)
        throw new Error(`${url} answered ${msg.get_status()}`);
    return bytes;
}

/** Download WordPress from wordpress.org, verify the published SHA-1, unpack into dir. */
async function fetchWordPress(dir, progress) {
    progress('Downloading WordPress from wordpress.org…');
    const tarball = await download('https://wordpress.org/latest.tar.gz');
    const expected = new TextDecoder().decode((await download('https://wordpress.org/latest.tar.gz.sha1')).toArray()).trim().slice(0, 40);
    const actual = GLib.compute_checksum_for_bytes(GLib.ChecksumType.SHA1, tarball);
    if (!expected || actual !== expected)
        throw new Error('The WordPress download did not match its published checksum, so it was not used.');
    progress('Unpacking WordPress…');
    const tmp = GLib.build_filenamev([GLib.get_user_cache_dir(), 'jewbuntu-webserver-wordpress.tar.gz']);
    GLib.mkdir_with_parents(GLib.path_get_dirname(tmp), 0o700);
    GLib.file_set_contents(tmp, tarball.toArray());
    GLib.mkdir_with_parents(dir, 0o755);
    const r = await run(['tar', '-xzf', tmp, '-C', dir, '--strip-components=1']);
    GLib.unlink(tmp);
    if (!r.ok)
        throw new Error(`Could not unpack WordPress: ${r.err}`);
}

function writeWpConfig(dir, db) {
    let cfg = readFile(GLib.build_filenamev([dir, 'wp-config-sample.php']));
    if (!cfg)
        throw new Error('wp-config-sample.php is missing from the download');
    cfg = cfg.replace("'database_name_here'", `'${db.database}'`)
        .replace("'username_here'", `'${db.user}'`)
        .replace("'password_here'", `'${db.password}'`)
        .replace(/'put your unique phrase here'/g, () => `'${randomSalt()}'`)
        // Plugin and theme installs write directly (Apache has write access via ACLs)
        // instead of asking for FTP details, which a local site never has.
        .replace("/* That's all, stop editing!", "define( 'FS_METHOD', 'direct' );\n\n/* That's all, stop editing!");
    const path = GLib.build_filenamev([dir, 'wp-config.php']);
    GLib.file_set_contents(path, cfg);
    GLib.chmod(path, 0o640);
}

/**
 * Create a site of the given kind. Returns {url, creds} (creds only for WordPress).
 * progress(text) is called with human-readable steps.
 */
export async function createSite(name, kind, progress = () => {}) {
    if (!NAME_RE.test(name))
        throw new Error('Site names use lowercase letters, digits and dashes (up to 31 characters).');
    const dir = GLib.build_filenamev([SITES, name]);
    let creds = null;
    if (kind === KINDS.wordpress) {
        if (GLib.file_test(dir, GLib.FileTest.EXISTS))
            throw new Error(`${dir} already exists; choose another name for a fresh WordPress site.`);
        await fetchWordPress(dir, progress);
        progress('Creating the database…');
        creds = await helper('create-db', name);
        writeWpConfig(dir, creds);
        progress('Turning on the site…');
        await helper('add-site', name);
        return {url: `http://${name}.localhost/wp-admin/install.php`, creds};
    }
    if (kind === KINDS.codeigniter) {
        if (GLib.file_test(dir, GLib.FileTest.EXISTS))
            throw new Error(`${dir} already exists; choose another name for a new CodeIgniter project.`);
        progress('Creating a CodeIgniter 4 project with Composer…\nThis downloads the framework and can take a minute.');
        GLib.mkdir_with_parents(SITES, 0o755);
        const r = await run(['composer', 'create-project', '--no-interaction', '--no-progress', 'codeigniter4/appstarter', dir]);
        if (!r.ok)
            throw new Error(`Composer could not create the project: ${r.err.split('\n').slice(-3).join(' ')}`);
        progress('Turning on the site…');
        await helper('add-site', name, 'public');
        return {url: `http://${name}.localhost/`, creds};
    }
    await helper('add-site', name);
    return {url: `http://${name}.localhost/`, creds};
}
