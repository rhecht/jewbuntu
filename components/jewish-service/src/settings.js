// Read-only access to the user's Jewbuntu settings for GJS code (service, Hub).
// Writes and schema migrations belong to the Python core (`jewbuntu config set`),
// so validation and migration logic exist in exactly one place.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

export const KNOWN_SCHEMA = 2;

export function settingsPath() {
    return GLib.build_filenamev([GLib.get_user_config_dir(), 'jewbuntu', 'settings.json']);
}

/** Returns {settings, warning}. Never throws; a missing or unreadable file yields defaults. */
export function readSettings() {
    const path = settingsPath();
    try {
        const [ok, bytes] = GLib.file_get_contents(path);
        if (!ok)
            return {settings: {}, warning: null};
        const doc = JSON.parse(new TextDecoder().decode(bytes));
        let warning = null;
        if ((doc.schema_version ?? 1) > KNOWN_SCHEMA)
            warning = 'Settings come from a newer Jewbuntu; some options may be ignored.';
        return {settings: normalise(doc), warning};
    } catch (e) {
        if (e instanceof GLib.Error && e.matches(GLib.FileError, GLib.FileError.NOENT))
            return {settings: {}, warning: null};
        return {settings: {}, warning: `Settings could not be read (${e.message}); using defaults.`};
    }
}

/** Accept schema 1 shapes in memory (the Python migrator persists the upgrade at login). */
function normalise(doc) {
    const out = {...doc};
    if (out.sound && typeof out.sound.startup === 'boolean')
        out.sound = {...out.sound, startup: {enabled: out.sound.startup}};
    return out;
}

export function monitorSettings(callback) {
    const file = Gio.File.new_for_path(settingsPath());
    const monitor = file.monitor_file(Gio.FileMonitorFlags.WATCH_MOVES, null);
    monitor.connect('changed', (_m, _f, _o, event) => {
        if ([Gio.FileMonitorEvent.CHANGES_DONE_HINT, Gio.FileMonitorEvent.CREATED, Gio.FileMonitorEvent.DELETED,
            Gio.FileMonitorEvent.RENAMED, Gio.FileMonitorEvent.MOVED_IN].includes(event))
            callback();
    });
    return monitor;
}
