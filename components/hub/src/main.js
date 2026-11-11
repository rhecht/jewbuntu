// Jewbuntu Hub: standalone GTK4/libadwaita app. Works without the GNOME extension and,
// if the calendar service is unavailable, computes the same data in-process.
// Settings are written through `jewbuntu config set`, so validation lives in one place.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import System from 'system';

// Static imports on purpose: a top-level `await` would make app.run() execute inside a
// promise job, and GJS would then never resume later awaits (the UI would stay empty).
// Same relative layout in the source tree and under /usr/share/jewbuntu/.
import {computeDay, PRESETS, HAVDALAH_METHODS} from '../../jewish-service/src/day.js';
import {readSettings} from '../../jewish-service/src/settings.js';

const BUS = 'org.jewbuntu.Jewish1';
const PATH = '/org/jewbuntu/Jewish1';
const CLI = GLib.getenv('JEWBUNTU_CLI') || 'jewbuntu';

function fmtTime(iso, tz) {
    if (!iso)
        return null;
    return new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit', timeZone: tz}).format(new Date(iso));
}

function fmtDate(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, {weekday: 'short', month: 'short', day: 'numeric'}).format(new Date(y, m - 1, d, 12));
}

function countdown(iso) {
    const mins = Math.round((new Date(iso) - Date.now()) / 60000);
    if (mins < 1)
        return 'now';
    if (mins < 60)
        return `in ${mins} min`;
    return `in ${Math.floor(mins / 60)} h ${mins % 60} min`;
}

function row(title, subtitle = '', suffix = null) {
    const r = new Adw.ActionRow({title, subtitle, use_markup: false});
    if (suffix !== null)
        r.add_suffix(new Gtk.Label({label: suffix, css_classes: ['numeric', 'title-4'], valign: Gtk.Align.CENTER}));
    return r;
}

function group(title, description = '') {
    return new Adw.PreferencesGroup({title, description});
}

function runCli(args) {
    return new Promise(resolve => {
        try {
            const p = Gio.Subprocess.new([CLI, ...args], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
            p.communicate_utf8_async(null, null, (proc, res) => {
                const [, out, err] = proc.communicate_utf8_finish(res);
                resolve({ok: proc.get_successful(), out: out?.trim() ?? '', err: err?.trim() ?? ''});
            });
        } catch (e) {
            resolve({ok: false, out: '', err: e.message});
        }
    });
}

class DataSource {
    // D-Bus first, in-process fallback; never blocks the UI.
    constructor(onChange) {
        this._onChange = onChange;
        this.viaService = false;
        try {
            this._proxy = Gio.DBusProxy.new_for_bus_sync(Gio.BusType.SESSION, Gio.DBusProxyFlags.DO_NOT_LOAD_PROPERTIES,
                null, BUS, PATH, 'org.jewbuntu.Jewish1', null);
            this._proxy.connect('g-signal', (_p, _s, name, params) => {
                if (name === 'DayChanged')
                    this._onChange(JSON.parse(params.deep_unpack()[0]), true);
            });
        } catch (e) {
            this._proxy = null;
        }
    }

    fetch(at = null) {
        return new Promise(resolve => {
            const local = () => {
                const {settings, warning} = readSettings();
                const d = computeDay(at ?? new Date(), settings);
                if (warning)
                    d.warnings.push(warning);
                this.viaService = false;
                resolve(d);
            };
            if (!this._proxy)
                return local();
            const [method, args] = at ? ['GetDayAt', new GLib.Variant('(x)', [at.getTime()])] : ['GetDay', null];
            this._proxy.call(method, args, Gio.DBusCallFlags.NONE, 2000, null, (p, res) => {
                try {
                    const v = p.call_finish(res);
                    this.viaService = true;
                    resolve(JSON.parse(v.deep_unpack()[0]));
                } catch (e) {
                    local();
                }
            });
        });
    }
}

const HubWindow = class {
    constructor(app) {
        this.win = new Adw.ApplicationWindow({application: app, title: 'Jewbuntu Hub', default_width: 760, default_height: 820});
        this.toasts = new Adw.ToastOverlay();
        const view = new Adw.ToolbarView();
        this.stack = new Adw.ViewStack();
        const header = new Adw.HeaderBar({title_widget: new Adw.ViewSwitcher({stack: this.stack, policy: Adw.ViewSwitcherPolicy.WIDE})});
        view.add_top_bar(header);
        this.banner = new Adw.Banner({revealed: false});
        view.add_top_bar(this.banner);
        view.set_content(this.stack);
        this.toasts.set_child(view);
        this.win.set_content(this.toasts);

        this.todayPage = this._page('today', 'Today', 'x-office-calendar-symbolic');
        this.calendarPage = this._page('calendar', 'Calendar', 'month-view-symbolic');
        this._buildMinyanim();
        this._buildResources();
        this.settingsPage = this._page('settings', 'Settings', 'emblem-system-symbolic');

        this.source = new DataSource(d => this.renderToday(d));
        this.refresh();
        this._tick = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 30, () => {
            if (this.day)
                this.renderToday(this.day);
            return GLib.SOURCE_CONTINUE;
        });
        this.win.connect('close-request', () => {
            GLib.source_remove(this._tick);
            return false;
        });
    }

    _page(name, title, icon) {
        const page = new Adw.PreferencesPage();
        this.stack.add_titled_with_icon(page, name, title, icon);
        return page;
    }

    _clear(page) {
        for (const g of [...(page._groups ?? [])])
            page.remove(g);
        page._groups = [];
    }

    _add(page, g) {
        page.add(g);
        page._groups.push(g);
    }

    async refresh() {
        try {
            const d = await this.source.fetch();
            this.renderToday(d);
            this.renderCalendar(d);
            this.renderSettings();
        } catch (e) {
            logError(e, 'Hub refresh failed');
            this.banner.set_title(`Could not load the calendar: ${e.message}`);
            this.banner.set_revealed(true);
        }
    }

    renderToday(d) {
        this.day = d;
        const page = this.todayPage;
        this._clear(page);
        const tz = d.location?.timezone;
        const warnings = [...d.warnings];
        if (!this.source.viaService)
            warnings.unshift('Calendar service not running; computed in the Hub.');
        this.banner.set_title(warnings.join('  ·  '));
        this.banner.set_revealed(warnings.length > 0);

        const head = group('');
        const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 4, margin_top: 6, margin_bottom: 6});
        box.append(new Gtk.Label({label: d.hebrewDate.he, css_classes: ['title-1'], xalign: 0.5}));
        box.append(new Gtk.Label({label: d.hebrewDate.en, css_classes: ['title-3'], xalign: 0.5}));
        const sub = [fmtDate(d.civilDate)];
        if (d.hebrewDate.afterSunset)
            sub.push('Hebrew date advanced at sunset');
        if (d.location)
            sub.push(d.location.name || `${d.location.latitude.toFixed(2)}, ${d.location.longitude.toFixed(2)}`);
        box.append(new Gtk.Label({label: sub.join('  ·  '), css_classes: ['dim-label'], xalign: 0.5}));
        head.add(box);
        this._add(page, head);

        if (d.nextZman) {
            const g = group('Next');
            g.add(row(d.nextZman.label, d.nextZman.method, `${fmtTime(d.nextZman.time, tz)}  (${countdown(d.nextZman.time)})`));
            this._add(page, g);
        }

        const shabbat = group('Shabbat and Yom Tov', d.location ? `Candle lighting ${d.method.candleLightingMinutes} min before sunset · ${d.location.region === 'israel' ? 'Israel' : 'Diaspora'} calendar` : '');
        if (d.parsha)
            shabbat.add(row(`Parashat ${d.parsha.en}`, fmtDate(d.parsha.date)));
        if (d.candleLighting)
            shabbat.add(row('Candle lighting', fmtDate(d.candleLighting.date), fmtTime(d.candleLighting.time, tz)));
        if (d.havdalah)
            shabbat.add(row('Havdalah', `${fmtDate(d.havdalah.date)} · ${d.havdalah.method}`, fmtTime(d.havdalah.time, tz)));
        this._add(page, shabbat);

        if (d.omer) {
            const g = group('Sefirat HaOmer', d.omer.note);
            g.add(row(d.omer.en, d.omer.he));
            this._add(page, g);
        }

        if (d.zmanim.length) {
            const g = group(`Zmanim · ${d.method.presetTitle}`, d.method.presetDescription);
            for (const z of d.zmanim)
                g.add(row(z.label, z.unavailable ? z.unavailable : z.method, z.time ? fmtTime(z.time, tz) : 'Unavailable'));
            this._add(page, g);
        }

        const up = group('Coming up');
        for (const e of d.upcoming.slice(0, 10))
            up.add(row(e.en, `${fmtDate(e.date)} · ${e.he}`));
        if (!d.upcoming.length)
            up.add(row('Nothing in the next week'));
        this._add(page, up);
    }

    renderCalendar(d) {
        const page = this.calendarPage;
        this._clear(page);
        const g = group('Pick a date');
        const cal = new Gtk.Calendar({margin_top: 6, margin_bottom: 6});
        g.add(cal);
        this._add(page, g);
        const details = group('');
        this._add(page, details);
        const show = async () => {
            const dt = cal.get_date();
            const at = new Date(dt.get_year(), dt.get_month() - 1, dt.get_day_of_month(), 12);
            const day = await this.source.fetch(at);
            details.set_title(`${day.hebrewDate.en}  ·  ${day.hebrewDate.he}`);
            for (const c of [...(details._rows ?? [])])
                details.remove(c);
            details._rows = [];
            const add = r => {
                details.add(r);
                details._rows.push(r);
            };
            const today = day.upcoming.filter(e => e.date === day.civilDate);
            for (const e of today)
                add(row(e.en, e.he));
            if (day.parsha)
                add(row(`Parashat ${day.parsha.en}`, `Shabbat ${fmtDate(day.parsha.date)}`));
            if (!today.length && !day.parsha)
                add(row('No holidays on this date'));
        };
        cal.connect('day-selected', show);
        show();
    }

    _buildMinyanim() {
        // Nearby minyanim, events and mikvaos come from ShulGo (jewbuntu-shulgo). The Hub hands
        // off to it rather than duplicating it; nothing here contacts the network.
        const shulgo = Gio.DesktopAppInfo.new('org.jewbuntu.ShulGo.desktop');
        const page = new Adw.StatusPage({
            icon_name: shulgo ? 'org.jewbuntu.ShulGo' : 'find-location-symbolic',
            title: 'Nearby Minyanim',
            description: shulgo
                ? 'Minyanim, events, mikvaos and zmanim near you come from ShulGo. It needs a ShulGo API key the first time: open its settings, paste the key and press "Save and test".'
                : 'Install ShulGo (the jewbuntu-shulgo package) to see nearby minyanim, events and mikvaos here.',
        });
        if (shulgo) {
            const box = new Gtk.Box({spacing: 12, halign: Gtk.Align.CENTER});
            const open = new Gtk.Button({label: 'Open ShulGo', css_classes: ['suggested-action', 'pill']});
            open.connect('clicked', () => {
                try {
                    shulgo.launch([], null);
                } catch (e) {
                    this.toasts.add_toast(new Adw.Toast({title: `Could not open ShulGo: ${e.message}`, timeout: 5}));
                }
            });
            const settings = new Gtk.Button({label: 'ShulGo settings and API key', css_classes: ['pill']});
            settings.connect('clicked', async () => {
                const r = await new Promise(resolve => {
                    try {
                        const proc = Gio.Subprocess.new(['gnome-extensions', 'prefs', 'shulgo@jewbuntu.org'], Gio.SubprocessFlags.STDERR_PIPE);
                        proc.wait_check_async(null, (pr, res) => {
                            try {
                                resolve(pr.wait_check_finish(res));
                            } catch (e) {
                                resolve(false);
                            }
                        });
                    } catch (e) {
                        resolve(false);
                    }
                });
                if (!r) {
                    // Settings live with the panel widget; if it is not available, the window has them too.
                    try {
                        shulgo.launch([], null);
                    } catch (e) {}
                }
            });
            box.append(open);
            box.append(settings);
            page.set_child(box);
        }
        this.stack.add_titled_with_icon(page, 'minyanim', 'Minyanim', 'find-location-symbolic');
    }

    _buildResources() {
        const page = new Adw.PreferencesPage();
        const g = group('Resources', 'Links and offline libraries will be added here, each with its source and licence recorded.');
        g.add(row('Calendar calculations', 'Hebcal (@hebcal/core 6.16.0, GPL-2.0-or-later), computed on this computer'));
        g.add(row('Settings file', '~/.config/jewbuntu/settings.json · export with: jewbuntu export'));
        page.add(g);
        this.stack.add_titled_with_icon(page, 'resources', 'Resources', 'bookmark-new-symbolic');
    }

    async _set(key, value, label) {
        const res = await runCli(['config', 'set', key, value]);
        this.toasts.add_toast(new Adw.Toast({title: res.ok ? `${label} saved` : `Not saved: ${res.err || res.out}`, timeout: res.ok ? 2 : 6}));
        if (res.ok)
            setTimeout(() => this.refresh(), 300);
        return res.ok;
    }

    renderSettings() {
        const page = this.settingsPage;
        this._clear(page);
        const s = readSettings().settings;
        const loc = s.location ?? {};
        const cal = s.calendar ?? {};

        const lg = group('Location', 'Used only on this computer to calculate times. Coordinates, timezone and calendar region are set separately; nothing is looked up online.');
        const name = new Adw.EntryRow({title: 'Place name', text: loc.name ?? ''});
        const lat = new Adw.EntryRow({title: 'Latitude (−90 to 90)', text: loc.latitude?.toString() ?? ''});
        const lon = new Adw.EntryRow({title: 'Longitude (−180 to 180)', text: loc.longitude?.toString() ?? ''});
        const tz = new Adw.EntryRow({title: 'Timezone (e.g. America/Toronto)', text: loc.timezone ?? ''});
        for (const w of [name, lat, lon, tz])
            lg.add(w);
        const save = new Gtk.Button({label: 'Save location', css_classes: ['suggested-action'], halign: Gtk.Align.END, margin_top: 8});
        save.connect('clicked', async () => {
            const doc = {name: name.text || null, latitude: Number(lat.text), longitude: Number(lon.text), timezone: tz.text.trim(), elevation_m: loc.elevation_m ?? 0};
            if (!Number.isFinite(doc.latitude) || !Number.isFinite(doc.longitude) || !doc.timezone) {
                this.toasts.add_toast(new Adw.Toast({title: 'Enter latitude, longitude and timezone', timeout: 4}));
                return;
            }
            await this._set('location', JSON.stringify(doc), 'Location');
        });
        lg.add(save);
        this._add(page, lg);

        const cg = group('Calendar and zmanim', 'Methods are labelled wherever times are shown. Ask your rav which to follow.');
        const combo = (title, key, options, current, label) => {
            const keys = Object.keys(options);
            const r = new Adw.ComboRow({title, model: Gtk.StringList.new(Object.values(options)), selected: Math.max(0, keys.indexOf(current))});
            r.connect('notify::selected', () => this._set(key, JSON.stringify(keys[r.selected]), label));
            cg.add(r);
        };
        combo('Calendar', 'calendar.region', {diaspora: 'Diaspora', israel: 'Israel'}, cal.region ?? 'diaspora', 'Calendar region');
        combo('Display', 'calendar.display', {transliterated: 'English transliteration', hebrew: 'Hebrew'}, cal.display ?? 'transliterated', 'Display');
        combo('Transliteration', 'calendar.transliteration', {ashkenazi: 'Ashkenazi (Shabbos)', sephardi: 'Sephardi (Shabbat)'}, cal.transliteration ?? 'ashkenazi', 'Transliteration');
        combo('Zmanim method', 'zmanim.preset', Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, v.title])), s.zmanim?.preset ?? 'standard', 'Zmanim method');
        combo('Havdalah', 'calendar.havdalah', Object.fromEntries(Object.entries(HAVDALAH_METHODS).map(([k, v]) => [k, v.label])), cal.havdalah ?? 'tzeit-8.5deg', 'Havdalah method');
        const mins = new Adw.SpinRow({title: 'Candle lighting (minutes before sunset)', adjustment: new Gtk.Adjustment({lower: 0, upper: 60, step_increment: 1, value: cal.candle_lighting_minutes ?? 18})});
        mins.connect('notify::value', () => this._set('calendar.candle_lighting_minutes', String(Math.round(mins.value)), 'Candle lighting'));
        cg.add(mins);
        this._add(page, cg);

        const sg = group('Sound');
        const startup = s.sound?.startup ?? {};
        const sw = new Adw.SwitchRow({title: 'Startup sound', subtitle: 'Plays once per boot at login; respects mute and the quiet schedule', active: startup.enabled ?? true});
        sw.connect('notify::active', () => this._set('sound.startup.enabled', sw.active ? 'true' : 'false', 'Startup sound'));
        const preview = new Gtk.Button({label: 'Preview', valign: Gtk.Align.CENTER});
        preview.connect('clicked', () => runCli(['startup-sound', 'preview']));
        sw.add_suffix(preview);
        sg.add(sw);
        const quiet = new Adw.SwitchRow({title: 'Shabbos / Yom Tov quiet schedule', subtitle: "Silences Jewbuntu's own sounds and notifications only. It is not a halachic determination.", active: s.quiet_schedule?.enabled ?? false});
        quiet.connect('notify::active', () => this._set('quiet_schedule.enabled', quiet.active ? 'true' : 'false', 'Quiet schedule'));
        sg.add(quiet);
        this._add(page, sg);

        const look = group('Desktop look');
        const lr = row('Jewbuntu look', 'Mac-style dock and top bar, Hebrew keyboard. Your previous settings are saved first.');
        const apply = new Gtk.Button({label: 'Apply', valign: Gtk.Align.CENTER});
        apply.connect('clicked', async () => {
            const r = await runCli(['skin', 'apply']);
            this.toasts.add_toast(new Adw.Toast({title: r.ok ? 'Applied. Log out and in to see every change.' : r.err, timeout: 4}));
        });
        const undo = new Gtk.Button({label: 'Undo', valign: Gtk.Align.CENTER});
        undo.connect('clicked', async () => {
            const r = await runCli(['skin', 'undo']);
            this.toasts.add_toast(new Adw.Toast({title: r.ok ? 'Previous look restored' : r.err, timeout: 4}));
        });
        lr.add_suffix(apply);
        lr.add_suffix(undo);
        look.add(lr);
        this._add(page, look);
    }
};

const app = new Adw.Application({application_id: 'org.jewbuntu.Hub', flags: Gio.ApplicationFlags.DEFAULT_FLAGS});
app.connect('activate', () => {
    const existing = app.get_active_window();
    if (existing) {
        existing.present();
        return;
    }
    const hub = new HubWindow(app);
    const page = GLib.getenv('JEWBUNTU_HUB_PAGE');
    if (page)
        hub.stack.set_visible_child_name(page);
    hub.win.present();
});
app.run([System.programInvocationName, ...System.programArgs]);
