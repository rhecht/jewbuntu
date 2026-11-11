// jewbuntu-jewish-service: per-user D-Bus service (session bus, no root).
//
//   name   org.jewbuntu.Jewish1     object /org/jewbuntu/Jewish1
//   InterfaceVersion (u)            contract version; a breaking change gets a new name
//   GetDay() -> s                   JSON of computeDay(now, settings)
//   GetDayAt(x unix_ms) -> s        same for another instant (Hub calendar view)
//   Reload()                        re-read settings now
//   DayChanged(s)                   emitted at boundaries: next zman/sunset, local midnight,
//                                   settings change, resume from suspend, clock jumps
//
// Event-driven: one timer to the next boundary plus a cheap 15-minute sanity check
// that also catches wall-clock corrections. Network access: none.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {computeDay, API_VERSION} from './day.js';
import {readSettings, monitorSettings} from './settings.js';

const BUS_NAME = 'org.jewbuntu.Jewish1';
const OBJECT_PATH = '/org/jewbuntu/Jewish1';
const IFACE_XML = `
<node>
  <interface name="org.jewbuntu.Jewish1">
    <property name="InterfaceVersion" type="u" access="read"/>
    <method name="GetDay"><arg type="s" direction="out" name="json"/></method>
    <method name="GetDayAt"><arg type="x" direction="in" name="unix_ms"/><arg type="s" direction="out" name="json"/></method>
    <method name="Reload"/>
    <signal name="DayChanged"><arg type="s" name="json"/></signal>
  </interface>
</node>`;

const SANITY_SECONDS = 15 * 60;

class JewishService {
    constructor() {
        this._timer = 0;
        this._lastJson = null;
        this._lastWall = Date.now();
        this._lastMono = GLib.get_monotonic_time();
        this._load();
    }

    _load() {
        const {settings, warning} = readSettings();
        this._settings = settings;
        this._warning = warning;
    }

    day(at = new Date()) {
        const d = computeDay(at, this._settings);
        if (this._warning)
            d.warnings.push(this._warning);
        return d;
    }

    // Interface methods (names match the XML).
    get InterfaceVersion() {
        return API_VERSION;
    }

    GetDay() {
        return JSON.stringify(this.day());
    }

    GetDayAt(unixMs) {
        return JSON.stringify(this.day(new Date(Number(unixMs))));
    }

    Reload() {
        this._load();
        this.refresh('reload');
    }

    export(connection) {
        this._impl = Gio.DBusExportedObject.wrapJSObject(IFACE_XML, this);
        this._impl.export(connection, OBJECT_PATH);
        this._monitor = monitorSettings(() => {
            this._load();
            this.refresh('settings');
        });
        this._watchSleep();
        GLib.timeout_add_seconds(GLib.PRIORITY_LOW, SANITY_SECONDS, () => {
            this._checkClockJump();
            this.refresh('sanity');
            return GLib.SOURCE_CONTINUE;
        });
        this.refresh('start');
    }

    /** Emit DayChanged when the computed view changed, and arm the next boundary timer. */
    refresh(reason) {
        const now = new Date();
        const d = this.day(now);
        const json = JSON.stringify({...d, computedAt: undefined});
        if (json !== this._lastJson) {
            this._lastJson = json;
            this._impl?.emit_signal('DayChanged', new GLib.Variant('(s)', [JSON.stringify(d)]));
            log(`day changed (${reason}): ${d.hebrewDate.en}`);
        }
        this._armTimer(now, d);
    }

    _armTimer(now, d) {
        if (this._timer)
            GLib.source_remove(this._timer);
        const candidates = [];
        for (const z of d.zmanim)
            if (z.time)
                candidates.push(new Date(z.time));
        for (const t of [d.candleLighting?.time, d.havdalah?.time])
            if (t)
                candidates.push(new Date(t));
        // Next local midnight in the location's timezone (approximate: +1 day from civil date, refined by the sanity timer).
        candidates.push(new Date(now.getTime() + 24 * 3600e3));
        const next = candidates.filter(t => t > now).sort((a, b) => a - b)[0];
        const seconds = Math.max(1, Math.min(SANITY_SECONDS, Math.ceil((next - now) / 1000) + 1));
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
            this._timer = 0;
            this.refresh('boundary');
            return GLib.SOURCE_REMOVE;
        });
    }

    _checkClockJump() {
        const wall = Date.now();
        const mono = GLib.get_monotonic_time();
        const drift = Math.abs((wall - this._lastWall) - (mono - this._lastMono) / 1000);
        if (drift > 60e3)
            log(`wall clock jumped by ${Math.round(drift / 1000)} s`);
        this._lastWall = wall;
        this._lastMono = mono;
    }

    _watchSleep() {
        try {
            const system = Gio.bus_get_sync(Gio.BusType.SYSTEM, null);
            system.signal_subscribe('org.freedesktop.login1', 'org.freedesktop.login1.Manager', 'PrepareForSleep',
                '/org/freedesktop/login1', null, Gio.DBusSignalFlags.NONE, (_c, _s, _p, _i, _n, params) => {
                    const [sleeping] = params.deep_unpack();
                    if (!sleeping)
                        this.refresh('resume');
                });
        } catch (e) {
            log(`no system bus, resume detection off: ${e.message}`);
        }
    }
}

export function main() {
    const loop = new GLib.MainLoop(null, false);
    const service = new JewishService();
    Gio.bus_own_name(Gio.BusType.SESSION, BUS_NAME, Gio.BusNameOwnerFlags.NONE,
        connection => service.export(connection),
        () => log(`owning ${BUS_NAME}`),
        () => {
            log(`could not own ${BUS_NAME} (already running?)`);
            loop.quit();
        });
    loop.run();
}

main();
