// Jewbuntu Web Server: run websites on this computer, the friendly way.
// The app runs as the user. Anything needing root goes through one narrow helper via pkexec
// (polkit action org.jewbuntu.webserver.manage). Status is read without a password prompt.
// Defaults are local-only: Apache on 127.0.0.1/::1, "Require local", MariaDB on 127.0.0.1.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import Soup from 'gi://Soup?version=3.0';
import System from 'system';

const HELPER = GLib.getenv('JEWBUNTU_WEBSERVER_HELPER') || '/usr/libexec/jewbuntu/jewbuntu-webserver-helper';
const USER = GLib.get_user_name();
const SITES = GLib.build_filenamev([GLib.get_home_dir(), 'Sites']);
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,30}$/;

// ---------- small async helpers ----------

function run(argv, {input = null} = {}) {
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
async function helper(...args) {
    const r = await run(['pkexec', HELPER, ...args]);
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
async function readStatus() {
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
        .replace(/'put your unique phrase here'/g, () => `'${randomSalt()}'`);
    const path = GLib.build_filenamev([dir, 'wp-config.php']);
    GLib.file_set_contents(path, cfg);
    GLib.chmod(path, 0o640);
}

// ---------- UI ----------

class WebServerWindow {
    constructor(app) {
        this.win = new Adw.ApplicationWindow({application: app, title: 'Web Server', default_width: 680, default_height: 720});
        this.toasts = new Adw.ToastOverlay();
        const view = new Adw.ToolbarView();
        const header = new Adw.HeaderBar();
        this.refreshButton = new Gtk.Button({icon_name: 'view-refresh-symbolic', tooltip_text: 'Refresh'});
        this.refreshButton.connect('clicked', () => this.refresh());
        header.pack_start(this.refreshButton);
        view.add_top_bar(header);
        this.banner = new Adw.Banner({revealed: false});
        view.add_top_bar(this.banner);
        this.content = new Adw.Bin();
        view.set_content(this.content);
        this.toasts.set_child(view);
        this.win.set_content(this.toasts);
        this.refresh();
    }

    toast(title, timeout = 3) {
        this.toasts.add_toast(new Adw.Toast({title, timeout}));
    }

    busy(text) {
        const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 18, valign: Gtk.Align.CENTER, halign: Gtk.Align.CENTER});
        box.append(new Adw.Spinner({width_request: 48, height_request: 48}));
        this.busyLabel = new Gtk.Label({label: text, wrap: true, justify: Gtk.Justification.CENTER, css_classes: ['title-4']});
        box.append(this.busyLabel);
        this.content.set_child(box);
    }

    async guard(text, fn) {
        this.busy(text);
        try {
            await fn(t => this.busyLabel?.set_label(t));
        } catch (e) {
            this.error(e.message);
        }
        await this.refresh();
    }

    error(message) {
        const d = new Adw.AlertDialog({heading: 'Something went wrong', body: message});
        d.add_response('ok', 'OK');
        d.present(this.win);
    }

    async refresh() {
        const s = await readStatus();
        this.status = s;
        this.banner.set_revealed(s.installed && s.sharing);
        this.banner.set_title('Sharing is on: anyone on your network can open your sites.');
        if (!s.installed)
            this.content.set_child(this.setupPage());
        else
            this.content.set_child(this.mainPage(s));
    }

    setupPage() {
        const page = new Adw.StatusPage({
            icon_name: 'org.jewbuntu.WebServer',
            title: 'Run websites on this computer',
            description: 'Set up Apache, MariaDB and PHP from Ubuntu with one click. Your sites stay private to this computer unless you choose to share them. Each folder in ~/Sites becomes a site at http://name.localhost.',
        });
        const btn = new Gtk.Button({label: 'Set up the web server', css_classes: ['suggested-action', 'pill'], halign: Gtk.Align.CENTER});
        btn.connect('clicked', () => this.guard('Setting up Apache, MariaDB and PHP…\nThis downloads packages from Ubuntu and can take a few minutes.', () => helper('install')));
        const note = new Gtk.Label({label: 'Needs your password once.', css_classes: ['dim-label']});
        const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 12});
        box.append(btn);
        box.append(note);
        page.set_child(box);
        return page;
    }

    mainPage(s) {
        const page = new Adw.PreferencesPage();
        const server = new Adw.PreferencesGroup({title: 'Server'});
        const running = new Adw.SwitchRow({title: s.running ? 'Running' : 'Stopped', subtitle: 'Apache, MariaDB and PHP', active: s.running});
        running.connect('notify::active', () => {
            if (running.active !== this.status.running)
                this.guard(running.active ? 'Starting…' : 'Stopping…', () => helper(running.active ? 'start' : 'stop'));
        });
        server.add(running);
        const share = new Adw.SwitchRow({title: 'Share on my network', subtitle: s.sharing ? 'Anyone on your network can open your sites' : 'Only this computer can open your sites (recommended)', active: s.sharing});
        share.connect('notify::active', () => {
            if (share.active === this.status.sharing)
                return;
            if (!share.active) {
                this.guard('Making your sites private again…', () => helper('share', 'off'));
                return;
            }
            const d = new Adw.AlertDialog({
                heading: 'Share your sites on the network?',
                body: 'Other devices on the same network (for example your home Wi-Fi) will be able to open your sites and anything in them. Only do this on networks you trust, and switch it off when you are done.',
            });
            d.add_response('cancel', 'Keep private');
            d.add_response('share', 'Share');
            d.set_response_appearance('share', Adw.ResponseAppearance.DESTRUCTIVE);
            d.connect('response', (_d, r) => {
                if (r === 'share')
                    this.guard('Sharing your sites…', () => helper('share', 'on'));
                else
                    share.set_active(false);
            });
            d.present(this.win);
        });
        server.add(share);
        page.add(server);

        const sites = new Adw.PreferencesGroup({title: 'Your sites', description: `Files live in ${SITES}. Edit them with any editor; refresh the browser to see changes.`});
        const add = new Gtk.Button({icon_name: 'list-add-symbolic', css_classes: ['flat'], tooltip_text: 'New site', valign: Gtk.Align.CENTER});
        add.connect('clicked', () => this.newSiteDialog());
        sites.set_header_suffix(add);
        if (!s.sites.length)
            sites.add(new Adw.ActionRow({title: 'No sites yet', subtitle: 'Press + to make your first site, or a WordPress site in one go.'}));
        for (const name of s.sites) {
            const url = `http://${name}.localhost/`;
            const row = new Adw.ActionRow({title: name, subtitle: url});
            const open = new Gtk.Button({icon_name: 'web-browser-symbolic', tooltip_text: 'Open in browser', valign: Gtk.Align.CENTER, css_classes: ['flat']});
            open.connect('clicked', () => new Gtk.UriLauncher({uri: url}).launch(this.win, null, null));
            const folder = new Gtk.Button({icon_name: 'folder-open-symbolic', tooltip_text: 'Open folder', valign: Gtk.Align.CENTER, css_classes: ['flat']});
            folder.connect('clicked', () => new Gtk.FileLauncher({file: Gio.File.new_for_path(GLib.build_filenamev([SITES, name]))}).launch(this.win, null, null));
            const remove = new Gtk.Button({icon_name: 'user-trash-symbolic', tooltip_text: 'Remove site (keeps files)', valign: Gtk.Align.CENTER, css_classes: ['flat']});
            remove.connect('clicked', () => this.removeSite(name));
            row.add_suffix(open);
            row.add_suffix(folder);
            row.add_suffix(remove);
            sites.add(row);
        }
        page.add(sites);

        const help = new Adw.PreferencesGroup({title: 'Good to know'});
        help.add(new Adw.ActionRow({title: 'Databases', use_markup: false, subtitle: 'MariaDB listens only on this computer. WordPress sites get their own database and password automatically.'}));
        help.add(new Adw.ActionRow({title: 'Logs', subtitle: '/var/log/apache2/jewbuntu-SITE-error.log', use_markup: false}));
        page.add(help);
        return page;
    }

    newSiteDialog() {
        const d = new Adw.AlertDialog({heading: 'New site', body: 'Use lowercase letters, digits and dashes. The site opens at http://name.localhost.'});
        const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 12});
        const entry = new Gtk.Entry({placeholder_text: 'my-site', activates_default: true});
        const kinds = ['Empty PHP site', 'WordPress'];
        if (this.status.composer)
            kinds.push('CodeIgniter 4');
        const kind = new Gtk.DropDown({model: Gtk.StringList.new(kinds)});
        box.append(entry);
        box.append(kind);
        if (!this.status.composer)
            box.append(new Gtk.Label({label: 'CodeIgniter needs Composer (sudo apt install composer).', css_classes: ['dim-label', 'caption'], wrap: true}));
        d.set_extra_child(box);
        d.add_response('cancel', 'Cancel');
        d.add_response('create', 'Create');
        d.set_response_appearance('create', Adw.ResponseAppearance.SUGGESTED);
        d.set_default_response('create');
        d.connect('response', (_d, r) => {
            if (r !== 'create')
                return;
            const name = entry.text.trim().toLowerCase();
            if (!NAME_RE.test(name)) {
                this.error('Site names use lowercase letters, digits and dashes (up to 31 characters), starting with a letter or digit.');
                return;
            }
            if (this.status.sites.includes(name)) {
                this.error(`There is already a site called ${name}.`);
                return;
            }
            this.createSite(name, kinds[kind.selected]);
        });
        d.present(this.win);
    }

    createSite(name, kind) {
        const dir = GLib.build_filenamev([SITES, name]);
        let creds = null;
        this.guard(`Creating ${name}.localhost…`, async progress => {
            if (kind === 'WordPress') {
                if (GLib.file_test(dir, GLib.FileTest.EXISTS))
                    throw new Error(`${dir} already exists; choose another name for a fresh WordPress site.`);
                await fetchWordPress(dir, progress);
                progress('Creating the database…');
                creds = await helper('create-db', name);
                writeWpConfig(dir, creds);
                progress('Turning on the site…');
                await helper('add-site', name);
            } else if (kind === 'CodeIgniter 4') {
                progress('Creating a CodeIgniter 4 project with Composer…');
                GLib.mkdir_with_parents(SITES, 0o755);
                const r = await run(['composer', 'create-project', '--no-interaction', 'codeigniter4/appstarter', dir]);
                if (!r.ok)
                    throw new Error(`Composer could not create the project: ${r.err.split('\n').slice(-3).join(' ')}`);
                await helper('add-site', name, 'public');
            } else {
                await helper('add-site', name);
            }
        }).then(() => {
            const url = kind === 'WordPress' ? `http://${name}.localhost/wp-admin/install.php` : `http://${name}.localhost/`;
            if (creds) {
                const d = new Adw.AlertDialog({
                    heading: `${name} is ready`,
                    body: `Database: ${creds.database}\nUser: ${creds.user}\nPassword: ${creds.password}\n\nWordPress already knows these (they are in wp-config.php). Next, finish the WordPress setup in your browser.`,
                });
                d.add_response('close', 'Close');
                d.add_response('open', 'Open WordPress setup');
                d.set_response_appearance('open', Adw.ResponseAppearance.SUGGESTED);
                d.connect('response', (_d, r) => {
                    if (r === 'open')
                        new Gtk.UriLauncher({uri: url}).launch(this.win, null, null);
                });
                d.present(this.win);
            } else if (this.status.sites.includes(name)) {
                this.toast(`${name}.localhost is ready`);
                new Gtk.UriLauncher({uri: url}).launch(this.win, null, null);
            }
        });
    }

    removeSite(name) {
        const d = new Adw.AlertDialog({heading: `Remove ${name}?`, body: `The site stops being served. Its files stay in ${GLib.build_filenamev([SITES, name])} and any database is kept.`});
        d.add_response('cancel', 'Cancel');
        d.add_response('remove', 'Remove');
        d.set_response_appearance('remove', Adw.ResponseAppearance.DESTRUCTIVE);
        d.connect('response', (_d, r) => {
            if (r === 'remove')
                this.guard(`Removing ${name}…`, () => helper('remove-site', name));
        });
        d.present(this.win);
    }
}

const app = new Adw.Application({application_id: 'org.jewbuntu.WebServer', flags: Gio.ApplicationFlags.DEFAULT_FLAGS});
app.connect('activate', () => {
    const w = app.get_active_window();
    if (w) {
        w.present();
        return;
    }
    new WebServerWindow(app).win.present();
});
app.run([System.programInvocationName, ...System.programArgs]);
