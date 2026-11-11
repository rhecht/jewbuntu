// Prints computeDay() for fixed cases; run under both `node` and `gjs -m`, outputs must be identical.
import {computeDay} from '../src/day.js';
const out = typeof print === 'function' ? print : console.log;
const T = {name: 'Toronto', latitude: 43.65333, longitude: -79.38389, timezone: 'America/Toronto'};
const J = {name: 'Jerusalem', latitude: 31.76904, longitude: 35.21633, timezone: 'Asia/Jerusalem'};
const cases = [
    ['2026-11-13T21:58:00Z', {location: T}],
    ['2027-03-23T15:00:00Z', {location: T, calendar: {display: 'hebrew'}}],
    ['2027-04-22T12:00:00Z', {location: J, calendar: {region: 'israel', candle_lighting_minutes: 40}}],
    ['2026-12-15T11:00:00Z', {location: {name: 'Tromso', latitude: 69.6489, longitude: 18.95508, timezone: 'Europe/Oslo'}}],
];
for (const [when, s] of cases)
    out(JSON.stringify(computeDay(new Date(when), s)));
