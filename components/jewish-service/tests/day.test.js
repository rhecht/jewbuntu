// node --test tests/   (also run with TZ=UTC and TZ=Asia/Tokyo: results must not depend on the machine's timezone)
// Fixtures in tests/fixtures/ were fetched from hebcal.com's public API on 2026-11-11 (see README there).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computeDay, civilDate} from '../src/day.js';

const fx = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));
const TORONTO = {name: 'Toronto', latitude: 43.65333, longitude: -79.38389, timezone: 'America/Toronto'};
const JERUSALEM = {name: 'Jerusalem', latitude: 31.76904, longitude: 35.21633, timezone: 'Asia/Jerusalem'};
const TROMSO = {name: 'Tromsø', latitude: 69.6489, longitude: 18.95508, timezone: 'Europe/Oslo'};

const settings = (location, extra = {}) => ({schema_version: 2, location, calendar: {region: 'diaspora', candle_lighting_minutes: 18, havdalah: 'tzeit-8.5deg', ...extra}, zmanim: {preset: 'standard'}});

function minutesApart(a, b) {
    return Math.abs(new Date(a) - new Date(b)) / 60000;
}

const MAP = {alot: 'alotHaShachar', misheyakir: 'misheyakir', sunrise: 'sunrise', shmaMGA: 'sofZmanShmaMGA', shmaGRA: 'sofZmanShma',
    tfillaGRA: 'sofZmanTfilla', chatzot: 'chatzot', minchaGedola: 'minchaGedola', minchaKetana: 'minchaKetana', plag: 'plagHaMincha',
    sunset: 'sunset', tzeit: 'tzeit85deg'};

function checkZmanim(fixtureName, location, isoNoon) {
    const ref = fx(fixtureName);
    const day = computeDay(new Date(isoNoon), settings(location));
    let compared = 0;
    for (const z of day.zmanim) {
        const expected = ref.times[MAP[z.id]];
        if (expected === undefined)
            continue;
        compared++;
        if (expected === null) {
            assert.equal(z.time, null, `${fixtureName} ${z.id} should be unavailable`);
            assert.ok(z.unavailable);
        } else {
            assert.ok(z.time, `${fixtureName} ${z.id} missing`);
            assert.ok(minutesApart(z.time, expected) <= 1, `${fixtureName} ${z.id}: ${z.time} vs hebcal.com ${expected}`);
        }
    }
    assert.ok(compared >= 6, `compared only ${compared} zmanim`);
}

test('Toronto zmanim match hebcal.com within a minute', () => checkZmanim('toronto-zmanim-2026-11-13', TORONTO, '2026-11-13T17:00:00Z'));
test('Jerusalem zmanim match hebcal.com', () => checkZmanim('jerusalem-zmanim-2026-11-13', JERUSALEM, '2026-11-13T10:00:00Z'));
test('DST change day (Toronto, 2026-03-08) matches hebcal.com', () => checkZmanim('toronto-zmanim-2026-03-08-dst', TORONTO, '2026-03-08T17:00:00Z'));
test('Polar night: sunrise/sunset unavailable, never invented', () => {
    checkZmanim('tromso-zmanim-2026-12-15-polar', TROMSO, '2026-12-15T11:00:00Z');
    const day = computeDay(new Date('2026-12-15T11:00:00Z'), settings(TROMSO));
    assert.ok(day.warnings.some(w => w.includes('No sunset')));
});

test('Candle lighting: Toronto 18 min (diaspora), Jerusalem 40 min (Israel) match hebcal.com', () => {
    const t = computeDay(new Date('2026-11-12T15:00:00Z'), settings(TORONTO));
    const tRef = fx('toronto-shabbat-2026-11-13').items.find(i => i.category === 'candles');
    assert.equal(t.candleLighting.time, tRef.date);
    const j = computeDay(new Date('2026-11-12T10:00:00Z'), settings(JERUSALEM, {region: 'israel', candle_lighting_minutes: 40}));
    const jRef = fx('jerusalem-shabbat-2026-11-13').items.find(i => i.category === 'candles');
    assert.equal(j.candleLighting.time, jRef.date);
    assert.equal(t.parsha.en, 'Toldot');
    assert.ok(t.havdalah.time.startsWith('2026-11-14T17:'));
});

test('Hebrew date conversion, including leap-year Adar II', () => {
    const a = computeDay(new Date('2026-11-11T15:00:00Z'), settings(TORONTO));
    assert.deepEqual([a.hebrewDate.day, a.hebrewDate.month, a.hebrewDate.year], [1, 'Kislev', 5787]);
    const ref = fx('converter-2027-03-23-adar2');
    const b = computeDay(new Date('2027-03-23T15:00:00Z'), settings(TORONTO));
    assert.deepEqual([b.hebrewDate.day, b.hebrewDate.month, b.hebrewDate.year], [ref.hd, ref.hm, ref.hy]);
    assert.equal(b.hebrewDate.leapYear, true);
    assert.ok(b.upcoming.some(e => e.desc === 'Purim' && e.date === '2027-03-23'));
});

test('Hebrew date rolls over at sunset, not midnight; civil date stays', () => {
    const before = computeDay(new Date('2026-11-13T21:50:00Z'), settings(TORONTO)); // 16:50 EST, sunset 16:54
    const after = computeDay(new Date('2026-11-13T21:58:00Z'), settings(TORONTO)); // 16:58 EST
    assert.equal(before.hebrewDate.day, 3);
    assert.equal(before.hebrewDate.afterSunset, false);
    assert.equal(after.hebrewDate.day, 4);
    assert.equal(after.hebrewDate.afterSunset, true);
    assert.equal(after.civilDate, '2026-11-13');
});

test('Israel vs diaspora: Pesach VIII only in the diaspora (matches hebcal.com)', () => {
    const now = new Date('2027-04-22T12:00:00Z');
    const dia = computeDay(now, settings(TORONTO)).upcoming.map(e => e.desc);
    const isr = computeDay(now, settings(JERUSALEM, {region: 'israel'})).upcoming.map(e => e.desc);
    const diaRef = fx('diaspora-holidays-5787-nisan').items.map(i => i.title);
    assert.ok(diaRef.includes('Pesach VIII') && dia.includes('Pesach VIII'));
    assert.ok(!isr.includes('Pesach VIII'));
});

test('Omer status for the current Hebrew date, without claiming the user counted', () => {
    const d = computeDay(new Date('2027-04-24T16:00:00Z'), settings(TORONTO)); // 17 Nisan
    assert.equal(d.omer.day, 2);
    assert.match(d.omer.note, /current Hebrew date/);
});

test('No location: Hebrew date by civil date, no zmanim, clear warning', () => {
    const d = computeDay(new Date('2026-11-11T15:00:00Z'), {schema_version: 2});
    assert.equal(d.zmanim.length, 0);
    assert.equal(d.location, null);
    assert.ok(d.warnings[0].includes('Set a location'));
});

test('Methods are labelled; presets and havdalah choices change results', () => {
    const now = new Date('2026-11-13T15:00:00Z');
    const std = computeDay(now, settings(TORONTO));
    const mga = computeDay(now, {...settings(TORONTO, {havdalah: 'fixed-72min'}), zmanim: {preset: 'magen-avraham'}});
    assert.ok(std.zmanim.every(z => z.method && z.label));
    assert.notEqual(std.zmanim.find(z => z.id === 'tzeit').time, mga.zmanim.find(z => z.id === 'tzeit').time);
    assert.equal(mga.havdalah.method, '72 minutes after sunset (Rabbeinu Tam)');
});

test('civilDate respects the location timezone across midnight', () => {
    assert.deepEqual(civilDate(new Date('2026-11-14T03:30:00Z'), 'America/Toronto'), {y: 2026, m: 11, d: 13});
    assert.deepEqual(civilDate(new Date('2026-11-14T03:30:00Z'), 'Asia/Jerusalem'), {y: 2026, m: 11, d: 14});
});
