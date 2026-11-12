// Jewbuntu Web Server: run websites on this computer, the friendly way.
// The app runs as the user. Anything needing root goes through one narrow helper via pkexec
// (polkit action org.jewbuntu.webserver.manage). Status is read without a password prompt.
// Defaults are local-only: Apache on 127.0.0.1/::1, "Require local", MariaDB on 127.0.0.1.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import System from 'system';
import {helper, readStatus, createSite, SITES, NAME_RE, KINDS} from './sites.js';

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
        const kinds = [KINDS.empty, KINDS.wordpress];
        if (this.status.composer)
            kinds.push(KINDS.codeigniter);
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
        let result = null;
        this.guard(`Creating ${name}.localhost…`, async progress => {
            result = await createSite(name, kind, progress);
        }).then(() => {
            if (!result)
                return;
            const {url, creds} = result;
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
            } else {
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
