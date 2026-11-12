// Copies text the way the Web Server app does, then reads the clipboard back.
import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';
import System from 'system';
Gtk.init();
const clip = Gdk.Display.get_default().get_clipboard();
const text = 'pa$$-wörd-123';
clip.set_content(Gdk.ContentProvider.new_for_bytes('text/plain;charset=utf-8', new GLib.Bytes(new TextEncoder().encode(text))));
const loop = new GLib.MainLoop(null, false);
let code = 1;
clip.read_text_async(null, (c, res) => {
    const got = c.read_text_finish(res);
    print(got === text ? 'CLIPBOARD OK' : `CLIPBOARD WRONG: ${got}`);
    code = got === text ? 0 : 1;
    loop.quit();
});
loop.run();
System.exit(code);
