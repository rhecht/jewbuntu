// Jewbuntu calendar core: one pure function that turns (instant, settings) into
// everything the Hub and panel show. Runs unchanged in GJS (service/Hub) and Node (tests).
//
// All calendar and astronomical work is done by Hebcal (@hebcal/core, GPL-2.0-or-later).
// This file only chooses options, labels methods, and handles edge cases explicitly.
// It never invents a time: anything the library cannot compute is returned as null
// with a reason.

import {HDate, HebrewCalendar, Location, Zmanim, Sedra, flags} from '../vendor/hebcal.bundle.js';

export const API_VERSION = 1;

// Calculation presets. Each zman carries its own method label so the UI never
// presents one opinion as universal.
export const PRESETS = {
    standard: {
        title: 'Standard',
        description: 'Dawn and nightfall by solar depression angle (16.1° / 8.5°). Latest Shema shown by both Magen Avraham and the Vilna Gaon (GRA).',
        zmanim: [
            ['alot', 'Dawn (Alot HaShachar)', '16.1° below horizon', z => z.alotHaShachar()],
            ['misheyakir', 'Earliest tallit and tefillin (Misheyakir)', '11.5° below horizon', z => z.misheyakir()],
            ['sunrise', 'Sunrise (Netz)', 'sea-level sunrise', z => z.sunrise()],
            ['shmaMGA', 'Latest Shema', 'Magen Avraham, 72-minute day', z => z.sofZmanShmaMGA()],
            ['shmaGRA', 'Latest Shema', 'GRA, sunrise to sunset', z => z.sofZmanShma()],
            ['tfillaGRA', 'Latest Shacharit', 'GRA, sunrise to sunset', z => z.sofZmanTfilla()],
            ['chatzot', 'Midday (Chatzot)', 'midpoint of sunrise and sunset', z => z.chatzot()],
            ['minchaGedola', 'Earliest Mincha (Mincha Gedola)', 'GRA', z => z.minchaGedola()],
            ['minchaKetana', 'Mincha Ketana', 'GRA', z => z.minchaKetana()],
            ['plag', 'Plag HaMincha', 'GRA', z => z.plagHaMincha()],
            ['sunset', 'Sunset (Shkiah)', 'sea-level sunset', z => z.sunset()],
            ['tzeit', 'Nightfall (Tzeit HaKochavim)', '8.5° below horizon', z => z.tzeit(8.5)],
        ],
    },
    'magen-avraham': {
        title: 'Magen Avraham (72 minutes)',
        description: 'Day counted from 72 minutes before sunrise to 72 minutes after sunset.',
        zmanim: [
            ['alot', 'Dawn (Alot HaShachar)', '72 minutes before sunrise', z => z.alotHaShachar72()],
            ['sunrise', 'Sunrise (Netz)', 'sea-level sunrise', z => z.sunrise()],
            ['shmaMGA', 'Latest Shema', 'Magen Avraham, 72-minute day', z => z.sofZmanShmaMGA()],
            ['tfillaMGA', 'Latest Shacharit', 'Magen Avraham, 72-minute day', z => z.sofZmanTfillaMGA()],
            ['chatzot', 'Midday (Chatzot)', 'midpoint of sunrise and sunset', z => z.chatzot()],
            ['minchaGedola', 'Earliest Mincha (Mincha Gedola)', 'Magen Avraham', z => z.minchaGedolaMGA()],
            ['minchaKetana', 'Mincha Ketana', 'Magen Avraham', z => z.minchaKetanaMGA()],
            ['sunset', 'Sunset (Shkiah)', 'sea-level sunset', z => z.sunset()],
            ['tzeit', 'Nightfall (Tzeit)', '72 minutes after sunset', z => z.tzeit72()],
        ],
    },
};

export const HAVDALAH_METHODS = {
    'tzeit-8.5deg': {label: 'Nightfall, 8.5° below horizon', opts: {havdalahDeg: 8.5}},
    'tzeit-7.083deg': {label: 'Nightfall, 7.083° below horizon (three medium stars)', opts: {havdalahDeg: 7.083}},
    'fixed-42min': {label: '42 minutes after sunset', opts: {havdalahMins: 42}},
    'fixed-50min': {label: '50 minutes after sunset', opts: {havdalahMins: 50}},
    'fixed-72min': {label: '72 minutes after sunset (Rabbeinu Tam)', opts: {havdalahMins: 72}},
};

const UNAVAILABLE = 'The sun does not reach this position here on this date (high latitude).';

function valid(d) {
    return d instanceof Date && !Number.isNaN(d.getTime());
}

/** Civil Y-M-D of an instant in an IANA timezone. */
export function civilDate(instant, tz) {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'})
        .formatToParts(instant);
    const get = t => Number(parts.find(p => p.type === t).value);
    return {y: get('year'), m: get('month'), d: get('day')};
}

/** A Date at local noon for a civil Y-M-D. Hebcal reads the local Y/M/D, so noon avoids DST edges. */
function civilToDate({y, m, d}) {
    return new Date(y, m - 1, d, 12, 0, 0);
}

function iso(date, tz) {
    return valid(date) ? Zmanim.formatISOWithTimeZone(tz, date) : null;
}

function localeFor(settings) {
    const cal = settings.calendar ?? {};
    if (cal.display === 'hebrew')
        return 'he';
    return cal.transliteration === 'sephardi' ? 'en' : 'ashkenazi';
}

export function describeSettings(settings) {
    const preset = PRESETS[settings.zmanim?.preset] ? settings.zmanim.preset : 'standard';
    const havdalah = HAVDALAH_METHODS[settings.calendar?.havdalah] ? settings.calendar.havdalah : 'tzeit-8.5deg';
    return {
        preset, presetTitle: PRESETS[preset].title, presetDescription: PRESETS[preset].description,
        havdalah, havdalahLabel: HAVDALAH_METHODS[havdalah].label,
        candleLightingMinutes: Number.isInteger(settings.calendar?.candle_lighting_minutes) ? settings.calendar.candle_lighting_minutes : 18,
        israel: settings.calendar?.region === 'israel',
        locale: localeFor(settings),
    };
}

/**
 * Compute the day view.
 * @param {Date} now        the current instant (wall clock; never trusted to be in the location's timezone)
 * @param {object} settings Jewbuntu settings document (schema 2; missing keys use defaults)
 */
export function computeDay(now, settings = {}) {
    const m = describeSettings(settings);
    const loc = settings.location ?? {};
    const hasLocation = Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude) && typeof loc.timezone === 'string';
    const tz = hasLocation ? loc.timezone : (settings.location?.timezone || 'UTC');
    const warnings = [];

    const civil = civilDate(now, tz);
    const civilDay = civilToDate(civil);
    let hd = new HDate(civilDay);
    let afterSunset = false;
    let gloc = null;
    let zmanim = [];
    let sunsetToday = null;

    if (hasLocation) {
        gloc = new Location(loc.latitude, loc.longitude, m.israel, tz, loc.name || 'Selected location', undefined, undefined, loc.elevation_m || 0);
        const z = new Zmanim(gloc, civilDay, false);
        sunsetToday = z.sunset();
        if (valid(sunsetToday) && now >= sunsetToday) {
            hd = hd.next();
            afterSunset = true;
        } else if (!valid(sunsetToday)) {
            warnings.push('No sunset today at this latitude; the Hebrew date shown follows the civil date.');
        }
        zmanim = PRESETS[m.preset].zmanim.map(([id, label, method, fn]) => {
            const t = fn(z);
            return {id, label, method, time: iso(t, tz), unavailable: valid(t) ? null : UNAVAILABLE};
        });
    } else {
        warnings.push('Set a location to see zmanim and an accurate Hebrew date after sunset.');
    }

    // Holidays, Rosh Chodesh, fasts and Omer for the halachic day and the coming week.
    const start = civilDay;
    const end = new Date(civilDay.getTime() + 8 * 86400e3);
    const calOpts = {
        start, end, il: m.israel, noModern: true, omer: true, sedrot: false,
        ...(gloc ? {location: gloc, candlelighting: true, candleLightingMins: m.candleLightingMinutes, ...HAVDALAH_METHODS[m.havdalah].opts} : {}),
    };
    const events = HebrewCalendar.calendar(calOpts);
    const render = e => ({en: e.render(m.locale), he: e.render('he')});
    const upcoming = [];
    let candleLighting = null;
    let havdalah = null;
    let omer = null;
    for (const e of events) {
        const f = e.getFlags();
        const date = e.getDate().greg();
        const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (f & flags.OMER_COUNT) {
            if (e.getDate().isSameDate(hd))
                omer = {day: e.omer, ...render(e), note: 'Counted at night; this is the count for the current Hebrew date.'};
            continue;
        }
        // Holiday entries carry candle-lighting *flags* too; only the timed
        // "Candle lighting" / "Havdalah" events are times to show.
        const desc = e.getDesc();
        if (desc === 'Candle lighting') {
            if (!candleLighting && e.eventTime)
                candleLighting = {time: iso(e.eventTime, tz), date: day, title: render(e), minutesBeforeSunset: m.candleLightingMinutes};
            continue;
        }
        if (desc === 'Havdalah') {
            if (!havdalah && e.eventTime)
                havdalah = {time: iso(e.eventTime, tz), date: day, title: render(e), method: m.havdalahLabel};
            continue;
        }
        upcoming.push({date: day, desc: e.getDesc(), ...render(e), roshChodesh: Boolean(f & flags.ROSH_CHODESH), fast: Boolean(f & (flags.MAJOR_FAST | flags.MINOR_FAST))});
    }

    // Parsha of the coming (or current) Shabbat.
    const sedra = new Sedra(hd.getFullYear(), m.israel);
    const sat = hd.onOrAfter(6);
    const pr = sedra.lookup(sat);
    const parsha = pr.chag ? null : {names: pr.parsha, en: pr.parsha.join('-'), date: sat.greg().toISOString().slice(0, 10)};

    return {
        api: API_VERSION,
        computedAt: now.toISOString(),
        civilDate: `${civil.y}-${String(civil.m).padStart(2, '0')}-${String(civil.d).padStart(2, '0')}`,
        hebrewDate: {
            en: hd.render(m.locale === 'he' ? 'en' : m.locale), he: hd.renderGematriya(),
            year: hd.getFullYear(), month: hd.getMonthName(), day: hd.getDate(),
            afterSunset, leapYear: HDate.isLeapYear(hd.getFullYear()),
        },
        location: hasLocation ? {name: loc.name || null, latitude: loc.latitude, longitude: loc.longitude, timezone: tz, region: m.israel ? 'israel' : 'diaspora'} : null,
        method: m,
        zmanim,
        nextZman: zmanim.find(z => z.time && new Date(z.time) > now) || null,
        parsha,
        candleLighting,
        havdalah,
        omer,
        upcoming,
        warnings,
    };
}
