// gjs -m tests/gjs-smoke.js  (run from components/jewish-service)
import {HDate, HebrewCalendar, Location, Zmanim, Sedra} from '../vendor/hebcal.bundle.js';
const loc = new Location(43.6532, -79.3832, false, 'America/Toronto', 'Toronto', 'CA', undefined, 76);
const d = new Date(2026, 10, 13); // Fri 13 Nov 2026
const hd = new HDate(d);
const z = new Zmanim(loc, d, false);
const fmt = t => Zmanim.formatISOWithTimeZone('America/Toronto', t);
const ev = HebrewCalendar.calendar({start: d, end: new Date(2026, 10, 14), location: loc, candlelighting: true, sedrot: true, havdalahDeg: 8.5});
print(JSON.stringify({
  runtime: typeof imports !== 'undefined' ? 'gjs' : 'other',
  hebrew: hd.toString(), gematriya: hd.renderGematriya(),
  parsha: new Sedra(hd.getFullYear(), false).lookup(hd).parsha.join('-'),
  sunrise: fmt(z.sunrise()), sunset: fmt(z.sunset()), tzeit85: fmt(z.tzeit(8.5)),
  events: ev.map(e => [e.getDesc(), e.eventTime ? fmt(e.eventTime) : null]),
}, null, 1));
