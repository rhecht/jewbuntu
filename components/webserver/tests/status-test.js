// Headless: print what the app's status code (sites.js readStatus) sees, as one JSON line.
// Run as a normal user (see ci/fedora-webserver-check-inner.sh).
import GLib from 'gi://GLib';
import {readStatus, PLATFORM} from 'file:///usr/share/jewbuntu/webserver/src/sites.js';

const loop = new GLib.MainLoop(null, false);
readStatus().then(s => {
    print(JSON.stringify({platform: PLATFORM.name, ...s}));
    loop.quit();
}).catch(e => {
    print(`ERROR ${e.message}`);
    loop.quit();
});
loop.run();
