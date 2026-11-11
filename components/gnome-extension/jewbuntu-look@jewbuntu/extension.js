// Jewbuntu Look: cosmetic top-bar changes only. No data, no network, no timers.
// Declared for tested GNOME Shell majors only (metadata.json); never force-enabled elsewhere.
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class JewbuntuLookExtension extends Extension {
    enable() {
        this._moved = null;
        const panel = Main.panel;
        const clock = panel?.statusArea?.dateMenu?.container;
        const right = panel?._rightBox;
        if (clock && right) {
            const parent = clock.get_parent();
            if (parent && parent !== right) {
                const index = parent.get_children().indexOf(clock);
                parent.remove_child(clock);
                right.add_child(clock); // last item, like a Mac menu-bar clock
                this._moved = {clock, parent, index};
            }
        }
        panel?.add_style_class_name('jewbuntu-panel');
    }

    disable() {
        const panel = Main.panel;
        panel?.remove_style_class_name('jewbuntu-panel');
        if (this._moved) {
            const {clock, parent, index} = this._moved;
            clock.get_parent()?.remove_child(clock);
            parent.insert_child_at_index(clock, Math.max(0, index));
            this._moved = null;
        }
    }
}
