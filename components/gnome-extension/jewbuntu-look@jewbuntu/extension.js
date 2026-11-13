// Jewbuntu Look: Mac-style clear top bar whose text colour follows the wallpaper.
//
// The bar is transparent; text and icons are dark on light wallpapers and white on
// darker ones. The choice uses the WCAG contrast rule against the average relative
// luminance of the strip of wallpaper behind the bar, recomputed only when the
// wallpaper or colour scheme changes (no timers). In the overview the text stays white.
// Declared for tested GNOME Shell majors only (metadata.json).
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {AppFolderDialog} from 'resource:///org/gnome/shell/ui/appDisplay.js';

const PANEL_CLASS = 'jewbuntu-panel';
const DARK_TEXT_CLASS = 'jewbuntu-panel-dark-text';
const STRIP = 0.06; // top 6% of the image approximates the area behind the bar

function srgbToLinear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Average relative luminance (0..1) of the top strip of a pixbuf. */
export function topStripLuminance(pixbuf) {
    const w = pixbuf.get_width();
    const h = pixbuf.get_height();
    const n = pixbuf.get_n_channels();
    const stride = pixbuf.get_rowstride();
    const px = pixbuf.read_pixel_bytes().toArray();
    const rows = Math.max(1, Math.round(h * STRIP));
    let sum = 0;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * stride + x * n;
            sum += 0.2126 * srgbToLinear(px[i]) + 0.7152 * srgbToLinear(px[i + 1]) + 0.0722 * srgbToLinear(px[i + 2]);
        }
    }
    return sum / (rows * w);
}

/** WCAG: dark text when it out-contrasts white text (switch point L ≈ 0.18). */
export function prefersDarkText(luminance) {
    return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05);
}

// Open app folders shade the app grid behind them. GNOME hard-codes 80% black (alpha 204), and
// 33% (alpha 85) while an icon is dragged out. Jewbuntu uses half of each, so the backdrop
// stays light enough to see the wallpaper (the owner found 80% too dark). GNOME eases to its
// shade first; easing the same property again replaces that transition with ours.
export const FOLDER_SHADE_ALPHA = 102;
export const FOLDER_SHADE_DRAG_ALPHA = 43;
const FOLDER_SHADE_MS = 200;

function easeShade(dialog, alpha) {
    dialog.ease({
        background_color: new Cogl.Color({red: 0, green: 0, blue: 0, alpha}),
        duration: FOLDER_SHADE_MS,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
    });
}

export default class JewbuntuLookExtension extends Extension {
    enable() {
        this._injections = new InjectionManager();
        this._injections.overrideMethod(AppFolderDialog.prototype, '_zoomAndFadeIn', original => function (...args) {
            const ret = original.apply(this, args);
            easeShade(this, FOLDER_SHADE_ALPHA);
            return ret;
        });
        this._injections.overrideMethod(AppFolderDialog.prototype, '_setLighterBackground', () => function (lighter) {
            easeShade(this, lighter ? FOLDER_SHADE_DRAG_ALPHA : FOLDER_SHADE_ALPHA);
        });

        this._bg = new Gio.Settings({schema_id: 'org.gnome.desktop.background'});
        this._iface = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._bgIds = ['changed::picture-uri', 'changed::picture-uri-dark'].map(s => this._bg.connect(s, () => this._queue()));
        this._ifaceId = this._iface.connect('changed::color-scheme', () => this._queue());
        this._overviewIds = [
            Main.overview.connect('showing', () => this._apply()),
            Main.overview.connect('hidden', () => this._apply()),
        ];
        this._darkText = false;
        Main.panel.add_style_class_name(PANEL_CLASS);
        this._queue();
    }

    disable() {
        this._injections?.clear();
        this._injections = null;
        if (this._idle)
            GLib.source_remove(this._idle);
        this._idle = 0;
        this._bgIds.forEach(id => this._bg.disconnect(id));
        this._iface.disconnect(this._ifaceId);
        this._overviewIds.forEach(id => Main.overview.disconnect(id));
        Main.panel.remove_style_class_name(DARK_TEXT_CLASS);
        Main.panel.remove_style_class_name(PANEL_CLASS);
        this._bg = this._iface = null;
    }

    _queue() {
        if (this._idle)
            return;
        this._idle = GLib.idle_add(GLib.PRIORITY_LOW, () => {
            this._idle = 0;
            this._darkText = this._measure();
            this._apply();
            return GLib.SOURCE_REMOVE;
        });
    }

    _measure() {
        try {
            const dark = this._iface.get_string('color-scheme') === 'prefer-dark';
            const uri = this._bg.get_string(dark ? 'picture-uri-dark' : 'picture-uri') || this._bg.get_string('picture-uri');
            const path = Gio.File.new_for_uri(uri).get_path();
            if (!path || path.endsWith('.xml'))
                return false; // slideshow XML or remote: keep white text
            const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 96, -1, true);
            return prefersDarkText(topStripLuminance(pixbuf));
        } catch (e) {
            console.warn(`Jewbuntu Look: could not read wallpaper (${e.message}); using white text`);
            return false;
        }
    }

    _apply() {
        if (this._darkText && !Main.overview.visible)
            Main.panel.add_style_class_name(DARK_TEXT_CLASS);
        else
            Main.panel.remove_style_class_name(DARK_TEXT_CLASS);
    }
}
