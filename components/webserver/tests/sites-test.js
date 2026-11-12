// Headless: create one site of each kind through the same code the app uses (sites.js).
// Run as a normal user with JEWBUNTU_WEBSERVER_ELEVATE=sudo (see ci/webserver-check.sh).
import GLib from 'gi://GLib';
import System from 'system';
import {createSite, readStatus, KINDS} from 'file:///usr/share/jewbuntu/webserver/src/sites.js';

const loop = new GLib.MainLoop(null, false);
let failures = 0;
(async () => {
    for (const [name, kind] of [['wp', KINDS.wordpress], ['ci4', KINDS.codeigniter], ['plain', KINDS.empty]]) {
        try {
            const r = await createSite(name, kind, t => print(`  … ${t.split('\n')[0]}`));
            print(`CREATED ${name} ${r.url}${r.creds ? ` db=${r.creds.database}` : ''}`);
        } catch (e) {
            print(`ERROR ${name}: ${e.message}`);
            failures++;
        }
    }
    try {
        await createSite('wp', KINDS.wordpress);
        print('ERROR duplicate WordPress name was accepted');
        failures++;
    } catch (e) {
        print(`REFUSED duplicate: ${e.message}`);
    }
    const s = await readStatus();
    print(`STATUS composer=${s.composer} sites=${s.sites.join(',')}`);
    loop.quit();
})();
loop.run();
System.exit(failures);
