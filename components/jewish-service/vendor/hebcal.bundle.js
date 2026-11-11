// node_modules/@hebcal/core/dist/esm/pkgVersion.js
var version = "6.16.0";

// node_modules/@hebcal/hdate/dist/esm/greg.js
var monthLengths = [
  [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
];
function mod(x, y) {
  return x - y * Math.floor(x / y);
}
function quotient(x, y) {
  return Math.floor(x / y);
}
function yearFromFixed(abs) {
  const l0 = abs - 1;
  const n400 = quotient(l0, 146097);
  const d1 = mod(l0, 146097);
  const n100 = quotient(d1, 36524);
  const d2 = mod(d1, 36524);
  const n4 = quotient(d2, 1461);
  const d3 = mod(d2, 1461);
  const n1 = quotient(d3, 365);
  const year = 400 * n400 + 100 * n100 + 4 * n4 + n1;
  return n100 !== 4 && n1 !== 4 ? year + 1 : year;
}
function isGregLeapYear(year) {
  return !(year % 4) && (!!(year % 100) || !(year % 400));
}
function daysInGregMonth(month, year) {
  return monthLengths[+isGregLeapYear(year)][month];
}
function isDate(obj) {
  return obj instanceof Date;
}
function toFixed(year, month, day) {
  const py = year - 1;
  return 365 * py + quotient(py, 4) - quotient(py, 100) + quotient(py, 400) + quotient(367 * month - 362, 12) + (month <= 2 ? 0 : isGregLeapYear(year) ? -1 : -2) + day;
}
function greg2abs(date) {
  if (!isDate(date)) {
    throw new TypeError(`not a Date: ${date}`);
  } else if (isNaN(date.getTime())) {
    throw new RangeError("Invalid Date");
  }
  const abs = toFixed(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return abs;
}
function abs2greg(abs) {
  if (typeof abs !== "number" || isNaN(abs)) {
    throw new TypeError(`not a Number: ${abs}`);
  }
  abs = Math.trunc(abs);
  const year = yearFromFixed(abs);
  const priorDays = abs - toFixed(year, 1, 1);
  const correction = abs < toFixed(year, 3, 1) ? 0 : isGregLeapYear(year) ? 1 : 2;
  const month = quotient(12 * (priorDays + correction) + 373, 367);
  const day = abs - toFixed(year, month, 1) + 1;
  const dt = new Date(year, month - 1, day);
  if (year < 100 && year >= 0) {
    dt.setFullYear(year);
  }
  return dt;
}

// node_modules/@hebcal/hdate/dist/esm/hebrewStripNikkud.js
function hebrewStripNikkud(str) {
  if (typeof str !== "string") {
    throw new TypeError(`bad nikkud str: ${str}`);
  }
  const a = str.normalize();
  return a.replace(/[\u0590-\u05bd]/g, "").replace(/[\u05bf-\u05c7]/g, "");
}

// node_modules/@hebcal/hdate/dist/esm/hdateBase.js
var NISAN = 1;
var IYYAR = 2;
var SIVAN = 3;
var TAMUZ = 4;
var AV = 5;
var ELUL = 6;
var TISHREI = 7;
var CHESHVAN = 8;
var KISLEV = 9;
var TEVET = 10;
var SHVAT = 11;
var ADAR_I = 12;
var ADAR_II = 13;
var months = {
  /** Nissan / ניסן */
  NISAN,
  /** Iyyar / אייר */
  IYYAR,
  /** Sivan / סיון */
  SIVAN,
  /** Tamuz (sometimes Tammuz) / תמוז */
  TAMUZ,
  /** Av / אב */
  AV,
  /** Elul / אלול */
  ELUL,
  /** Tishrei / תִּשְׁרֵי */
  TISHREI,
  /** Cheshvan / חשון */
  CHESHVAN,
  /** Kislev / כסלו */
  KISLEV,
  /** Tevet / טבת */
  TEVET,
  /** Sh'vat / שבט */
  SHVAT,
  /** Adar or Adar Rishon / אדר */
  ADAR_I,
  /** Adar Sheini (only on leap years) / אדר ב׳ */
  ADAR_II
};
var NISAN_STR = "Nisan";
var monthNames0 = [
  "",
  NISAN_STR,
  "Iyyar",
  "Sivan",
  "Tamuz",
  "Av",
  "Elul",
  "Tishrei",
  "Cheshvan",
  "Kislev",
  "Tevet",
  "Sh'vat"
];
var monthNames = [
  [...monthNames0, "Adar", NISAN_STR],
  [...monthNames0, "Adar I", "Adar II", NISAN_STR]
];
var ED_CACHE_MIN = 5e3;
var ED_CACHE_MAX = 6999;
var edCache = new Int32Array(ED_CACHE_MAX - ED_CACHE_MIN + 1);
var EPOCH = -1373428;
var AVG_HEBYEAR_DAYS = 365.24682220597794;
function assertNumber(n, name) {
  if (typeof n !== "number" || isNaN(n)) {
    throw new TypeError(`param '${name}' not a number: ${n}`);
  }
}
function hebrew2abs(year, month, day) {
  assertNumber(year, "year");
  assertNumber(month, "month");
  assertNumber(day, "day");
  if (year < 1) {
    throw new RangeError(`hebrew2abs: invalid year ${year}`);
  }
  let tempabs = day;
  if (month < TISHREI) {
    const endMonth = monthsInYear(year);
    for (let m = TISHREI; m <= endMonth; m++) {
      tempabs += daysInMonth(m, year);
    }
    for (let m = NISAN; m < month; m++) {
      tempabs += daysInMonth(m, year);
    }
  } else {
    for (let m = TISHREI; m < month; m++) {
      tempabs += daysInMonth(m, year);
    }
  }
  return EPOCH + elapsedDays(year) + tempabs - 1;
}
function newYear(year) {
  return EPOCH + elapsedDays(year);
}
function abs2hebrew(abs) {
  assertNumber(abs, "abs");
  abs = Math.trunc(abs);
  if (abs <= EPOCH) {
    throw new RangeError(`abs2hebrew: ${abs} is before epoch`);
  }
  let year = Math.floor((abs - EPOCH) / AVG_HEBYEAR_DAYS);
  while (newYear(year) <= abs) {
    ++year;
  }
  --year;
  let month = abs < hebrew2abs(year, 1, 1) ? 7 : 1;
  while (abs > hebrew2abs(year, month, daysInMonth(month, year))) {
    ++month;
  }
  const day = 1 + abs - hebrew2abs(year, month, 1);
  return { yy: year, mm: month, dd: day };
}
function isLeapYear(year) {
  return (1 + year * 7) % 19 < 7;
}
function monthsInYear(year) {
  return 12 + +isLeapYear(year);
}
var STATIC_DAYS_IN_MONTH = [
  0,
  30,
  29,
  30,
  29,
  30,
  29,
  30,
  0,
  0,
  29,
  30,
  0,
  29
];
function daysInMonth(month, year) {
  const d2 = STATIC_DAYS_IN_MONTH[month];
  if (d2 !== 0)
    return d2;
  if (month === ADAR_I)
    return isLeapYear(year) ? 30 : 29;
  if (month === CHESHVAN)
    return longCheshvan(year) ? 30 : 29;
  return shortKislev(year) ? 29 : 30;
}
function getMonthName(month, year) {
  assertNumber(month, "month");
  assertNumber(year, "year");
  if (month < 1 || month > 14) {
    throw new TypeError(`bad monthNum: ${month}`);
  }
  return monthNames[+isLeapYear(year)][month];
}
function elapsedDays(year) {
  if (year >= ED_CACHE_MIN && year <= ED_CACHE_MAX) {
    const idx = year - ED_CACHE_MIN;
    const n = edCache[idx];
    if (n !== 0)
      return n;
    const elapsed = elapsedDays0(year);
    edCache[idx] = elapsed;
    return elapsed;
  }
  return elapsedDays0(year);
}
function elapsedDays0(year) {
  const prevYear = year - 1;
  const mElapsed = 235 * Math.floor(prevYear / 19) + // Months in complete 19 year lunar (Metonic) cycles so far
  12 * (prevYear % 19) + // Regular months in this cycle
  Math.floor((prevYear % 19 * 7 + 1) / 19);
  const pElapsed = 204 + 793 * (mElapsed % 1080);
  const hElapsed = 5 + 12 * mElapsed + 793 * Math.floor(mElapsed / 1080) + Math.floor(pElapsed / 1080);
  const parts = pElapsed % 1080 + 1080 * (hElapsed % 24);
  const day = 1 + 29 * mElapsed + Math.floor(hElapsed / 24);
  let altDay = day;
  if (parts >= 19440 || 2 === day % 7 && parts >= 9924 && !isLeapYear(year) || 1 === day % 7 && parts >= 16789 && isLeapYear(prevYear)) {
    altDay++;
  }
  if (altDay % 7 === 0 || altDay % 7 === 3 || altDay % 7 === 5) {
    return altDay + 1;
  } else {
    return altDay;
  }
}
function daysInYear(year) {
  return elapsedDays(year + 1) - elapsedDays(year);
}
function longCheshvan(year) {
  return daysInYear(year) % 10 === 5;
}
function shortKislev(year) {
  return daysInYear(year) % 10 === 3;
}
function adarFromName(c) {
  const suffix = c.replace(/^(adar|אדר)/, "").replace(/[\s.'`\-׳״]/g, "");
  if (suffix === "1" || suffix === "i" || suffix === "a" || suffix === "\u05D0" || suffix.startsWith("alef") || suffix.startsWith("aleph") || suffix.startsWith("alaph") || suffix.startsWith("rish") || suffix.startsWith("\u05E8\u05D0\u05E9") || suffix.startsWith("\u05D0\u05DC")) {
    return ADAR_I;
  }
  return ADAR_II;
}
function monthFromName(monthName) {
  if (typeof monthName === "number") {
    if (isNaN(monthName) || monthName < 1 || monthName > 14) {
      throw new RangeError(`bad monthName: ${monthName}`);
    }
    return monthName;
  }
  if (typeof monthName !== "string") {
    throw new TypeError(`bad monthName: ${monthName}`);
  }
  let c = monthName.trim().toLowerCase();
  c = hebrewStripNikkud(c).replace(/׳$/, "");
  if (c.startsWith("\u05D1")) {
    c = c.substring(1);
  }
  switch (c[0]) {
    case "n":
    case "\u05E0":
      if (c[1] === "o") {
        break;
      }
      return NISAN;
    case "i":
      return IYYAR;
    case "e":
      return ELUL;
    case "c":
    case "\u05D7":
      return CHESHVAN;
    case "k":
    case "\u05DB":
      return KISLEV;
    case "s":
      switch (c[1]) {
        case "i":
          return SIVAN;
        case "h":
          return SHVAT;
        default:
          break;
      }
      break;
    case "t":
      switch (c[1]) {
        case "a":
          return TAMUZ;
        case "i":
          return TISHREI;
        case "e":
          return TEVET;
        default:
          break;
      }
      break;
    case "a":
      switch (c[1]) {
        case "v":
          return AV;
        case "d":
          return adarFromName(c);
        default:
          break;
      }
      break;
    case "\u05E1":
      return SIVAN;
    case "\u05D8":
      return TEVET;
    case "\u05E9":
      return SHVAT;
    case "\u05D0":
      switch (c[1]) {
        case "\u05D1":
          return AV;
        case "\u05D3":
          return adarFromName(c);
        case "\u05D9":
          return IYYAR;
        case "\u05DC":
          return ELUL;
        default:
          break;
      }
      break;
    case "\u05EA":
      switch (c[1]) {
        case "\u05DE":
          return TAMUZ;
        case "\u05E9":
          return TISHREI;
        default:
          break;
      }
      break;
  }
  throw new RangeError(`bad monthName: ${monthName}`);
}

// node_modules/@hebcal/hdate/dist/esm/anniversary.js
var NISAN2 = months.NISAN;
var CHESHVAN2 = months.CHESHVAN;
var KISLEV2 = months.KISLEV;
var TEVET2 = months.TEVET;
var SHVAT2 = months.SHVAT;
var ADAR_I2 = months.ADAR_I;
var ADAR_II2 = months.ADAR_II;
function isSimpleHebrewDate(obj) {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const hd = obj;
  return typeof hd.yy === "number" && typeof hd.mm === "number" && typeof hd.dd === "number";
}
function toSimpleHebrewDate(obj) {
  if (isSimpleHebrewDate(obj)) {
    return { yy: obj.yy, mm: obj.mm, dd: obj.dd };
  } else if (isDate(obj)) {
    return abs2hebrew(greg2abs(obj));
  } else {
    return abs2hebrew(obj);
  }
}
function getYahrzeitHD(hyear, date) {
  let hDeath = toSimpleHebrewDate(date);
  if (hyear <= hDeath.yy) {
    return void 0;
  }
  if (hDeath.mm === CHESHVAN2 && hDeath.dd === 30 && !longCheshvan(hDeath.yy + 1)) {
    hDeath = abs2hebrew(hebrew2abs(hyear, KISLEV2, 1) - 1);
  } else if (hDeath.mm === KISLEV2 && hDeath.dd === 30 && shortKislev(hDeath.yy + 1)) {
    hDeath = abs2hebrew(hebrew2abs(hyear, TEVET2, 1) - 1);
  } else if (hDeath.mm === ADAR_II2) {
    hDeath.mm = monthsInYear(hyear);
  } else if (hDeath.mm === ADAR_I2 && hDeath.dd === 30 && !isLeapYear(hyear)) {
    hDeath.dd = 30;
    hDeath.mm = SHVAT2;
  }
  if (hDeath.mm === CHESHVAN2 && hDeath.dd === 30 && !longCheshvan(hyear)) {
    hDeath.mm = KISLEV2;
    hDeath.dd = 1;
  } else if (hDeath.mm === KISLEV2 && hDeath.dd === 30 && shortKislev(hyear)) {
    hDeath.mm = TEVET2;
    hDeath.dd = 1;
  }
  hDeath.yy = hyear;
  return hDeath;
}
function getBirthdayHD(hyear, date) {
  const orig = toSimpleHebrewDate(date);
  const origYear = orig.yy;
  if (hyear === origYear) {
    return orig;
  } else if (hyear < origYear) {
    return void 0;
  }
  const isOrigLeap = isLeapYear(origYear);
  let month = orig.mm;
  let day = orig.dd;
  if (month === ADAR_I2 && !isOrigLeap || month === ADAR_II2 && isOrigLeap) {
    month = monthsInYear(hyear);
  } else if (month === CHESHVAN2 && day === 30 && !longCheshvan(hyear)) {
    month = KISLEV2;
    day = 1;
  } else if (month === KISLEV2 && day === 30 && shortKislev(hyear)) {
    month = TEVET2;
    day = 1;
  } else if (month === ADAR_I2 && day === 30 && isOrigLeap && !isLeapYear(hyear)) {
    month = NISAN2;
    day = 1;
  }
  return { yy: hyear, mm: month, dd: day };
}

// node_modules/@hebcal/hdate/dist/esm/gematriya.js
var GERESH = "\u05F3";
var GERSHAYIM = "\u05F4";
var heb2num = {
  \u05D0: 1,
  \u05D1: 2,
  \u05D2: 3,
  \u05D3: 4,
  \u05D4: 5,
  \u05D5: 6,
  \u05D6: 7,
  \u05D7: 8,
  \u05D8: 9,
  \u05D9: 10,
  \u05DB: 20,
  \u05DC: 30,
  \u05DE: 40,
  \u05E0: 50,
  \u05E1: 60,
  \u05E2: 70,
  \u05E4: 80,
  \u05E6: 90,
  \u05E7: 100,
  \u05E8: 200,
  \u05E9: 300,
  \u05EA: 400
};
var num2heb = {};
for (const [key, val] of Object.entries(heb2num)) {
  num2heb[val] = key;
}
var sofit2num = {
  \u05DA: 20,
  \u05DD: 40,
  \u05DF: 50,
  \u05E3: 80,
  \u05E5: 90
};
function num2digits(num) {
  const digits = [];
  while (num > 0) {
    if (num === 15 || num === 16) {
      digits.push(9, num - 9);
      break;
    }
    let incr = 100;
    let i;
    for (i = 400; i > num; i -= incr) {
      if (i === incr) {
        incr = incr / 10;
      }
    }
    digits.push(i);
    num -= i;
  }
  return digits;
}
function gematriya(num) {
  const num1 = parseInt(String(num), 10);
  if (!num1 || num1 < 0) {
    throw new TypeError(`invalid number: ${num}`);
  }
  let str = "";
  const thousands = Math.floor(num1 / 1e3);
  if (thousands > 0 && thousands !== 5) {
    const tdigits = num2digits(thousands);
    for (const tdig of tdigits) {
      str += num2heb[tdig];
    }
    str += GERESH;
  }
  const digits = num2digits(num1 % 1e3);
  if (digits.length === 1) {
    return str + num2heb[digits[0]] + GERESH;
  }
  for (let i = 0; i < digits.length; i++) {
    if (i + 1 === digits.length) {
      str += GERSHAYIM;
    }
    str += num2heb[digits[i]];
  }
  return str;
}
function gematriyaStrToNum(str) {
  if (typeof str !== "string") {
    throw new TypeError(`bad gematriya str: ${str}`);
  }
  let num = 0;
  const gereshIdx = str.indexOf(GERESH);
  if (gereshIdx !== -1 && gereshIdx !== str.length - 1) {
    const thousands = str.substring(0, gereshIdx);
    num += gematriyaStrToNum(thousands) * 1e3;
    str = str.substring(gereshIdx);
  }
  for (const ch of str) {
    const n = heb2num[ch] ?? sofit2num[ch];
    if (typeof n === "number") {
      num += n;
    }
  }
  return num;
}

// node_modules/@hebcal/hdate/dist/esm/pad.js
function pad4(num) {
  if (num < 0) {
    return "-00" + pad4(-num);
  } else if (num < 10) {
    return "000" + num;
  } else if (num < 100) {
    return "00" + num;
  } else if (num < 1e3) {
    return "0" + num;
  }
  return String(num);
}
function pad2(num) {
  if (num >= 0 && num < 10) {
    return "0" + num;
  }
  return String(num);
}

// node_modules/@hebcal/hdate/dist/esm/dateFormat.js
var _formatters = /* @__PURE__ */ new Map();
function getFormatter(tzid) {
  const fmt = _formatters.get(tzid);
  if (fmt)
    return fmt;
  const f = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: tzid
  });
  _formatters.set(tzid, f);
  return f;
}
var dateFormatRegex = /^(\d+).(\d+).(\d+),?\s+(\d+).(\d+).(\d+)/;
function getPseudoISO(tzid, date) {
  const str = getFormatter(tzid).format(date);
  const m = dateFormatRegex.exec(str);
  if (m === null) {
    throw new Error(`Unable to parse formatted string: ${str}`);
  }
  let hour = m[4];
  if (hour === "24") {
    hour = "00";
  }
  m[3] = pad4(parseInt(m[3], 10));
  return `${m[3]}-${m[1]}-${m[2]}T${hour}:${m[5]}:${m[6]}Z`;
}
function getTimezoneOffset(tzid, date) {
  const utcStr = getPseudoISO("UTC", date);
  const localStr = getPseudoISO(tzid, date);
  const diffMs = new Date(utcStr).getTime() - new Date(localStr).getTime();
  return Math.ceil(diffMs / 1e3 / 60);
}
function isoDateString(dt) {
  return pad4(dt.getFullYear()) + "-" + pad2(dt.getMonth() + 1) + "-" + pad2(dt.getDate());
}

// node_modules/@hebcal/hdate/dist/esm/ashkenazi.po.js
var ashkenazi_po_default = { "headers": { "plural-forms": "nplurals=2; plural=(n > 1);", "language": "und-x-ashkenaz" }, "contexts": { "": { "Tevet": ["Teves"] } } };

// node_modules/@hebcal/hdate/dist/esm/he.po.js
var he_po_default = { "headers": { "plural-forms": "nplurals=2; plural=(n > 1);", "language": "he" }, "contexts": { "": { "Adar": ["\u05D0\u05B2\u05D3\u05B8\u05E8"], "Adar I": ["\u05D0\u05B2\u05D3\u05B8\u05E8 \u05D0\u05F3"], "Adar II": ["\u05D0\u05B2\u05D3\u05B8\u05E8 \u05D1\u05F3"], "Av": ["\u05D0\u05B8\u05D1"], "Cheshvan": ["\u05D7\u05B6\u05E9\u05B0\u05C1\u05D5\u05B8\u05DF"], "Elul": ["\u05D0\u05B1\u05DC\u05D5\u05BC\u05DC"], "Iyyar": ["\u05D0\u05B4\u05D9\u05B8\u05BC\u05D9\u05E8"], "Kislev": ["\u05DB\u05B4\u05BC\u05E1\u05B0\u05DC\u05B5\u05D5"], "Nisan": ["\u05E0\u05B4\u05D9\u05E1\u05B8\u05DF"], "Sh'vat": ["\u05E9\u05B0\u05C1\u05D1\u05B8\u05D8"], "Sivan": ["\u05E1\u05B4\u05D9\u05D5\u05B8\u05DF"], "Tamuz": ["\u05EA\u05B7\u05BC\u05DE\u05BC\u05D5\u05BC\u05D6"], "Tammuz": ["\u05EA\u05B7\u05BC\u05DE\u05BC\u05D5\u05BC\u05D6"], "Tevet": ["\u05D8\u05B5\u05D1\u05B5\u05EA"], "Tishrei": ["\u05EA\u05B4\u05BC\u05E9\u05B0\u05C1\u05E8\u05B5\u05D9"] } } };

// node_modules/@hebcal/hdate/dist/esm/locale.js
var noopLocale = {
  headers: { "plural-forms": "nplurals=2; plural=(n!=1);" },
  contexts: { "": {} }
};
var alias = {
  h: "he",
  a: "ashkenazi",
  s: "en",
  "": "en"
};
var locales = /* @__PURE__ */ new Map();
function getEnOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function checkLocale(locale) {
  if (typeof locale !== "string") {
    throw new TypeError(`Invalid locale name: ${locale}`);
  }
  locale = alias[locale] || locale;
  return locale.toLowerCase();
}
function getExistingLocale(locale) {
  const locale1 = checkLocale(locale);
  const loc = locales.get(locale1);
  if (!loc) {
    throw new RangeError(`Locale '${locale}' not found`);
  }
  return loc;
}
var Locale = class _Locale {
  /**
   * Returns translation only if `locale` offers a non-empty translation for `id`.
   * Otherwise, returns `undefined`.
   * @param id Message ID to translate
   * @param [locale] Optional locale name (i.e: `'he'`, `'fr'`). Defaults to no-op locale.
   * @example
   * Locale.lookupTranslation('Adar II', 'he-x-NoNikud'); // 'אדר ב׳'
   * Locale.lookupTranslation('Foobar', 'he-x-NoNikud');  // undefined
   */
  static lookupTranslation(id, locale) {
    const loc = typeof locale === "string" && locales.get(checkLocale(locale)) || noopLocale.contexts[""];
    const array = loc[id];
    if (array?.length && array[0].length) {
      return array[0];
    }
    return void 0;
  }
  /**
   * By default, if no translation was found, returns `id`.
   * @param id Message ID to translate
   * @param [locale] Optional locale name (i.e: `'he'`, `'fr'`). Defaults to no-op locale.
   * @example
   * Locale.gettext('Elul', 'he');          // 'אֱלוּל'
   * Locale.gettext('Tevet', 'ashkenazi');  // 'Teves'
   * Locale.gettext('Unknown', 'he');       // 'Unknown' (falls back to id)
   */
  static gettext(id, locale) {
    const text = this.lookupTranslation(id, locale);
    if (text === void 0) {
      return id;
    }
    return text;
  }
  /**
   * Register locale translations, replacing the locale entirely if it
   * was already registered. Use {@link Locale.addTranslations} to merge
   * into an existing locale instead.
   * @param locale Locale name (i.e.: `'he'`, `'fr'`)
   * @param data parsed data from a `.po` file.
   * @throws {TypeError} if `data` is not in the compact `.po` format
   * @example
   * import {Locale} from '@hebcal/hdate';
   * // typically `import poFr from './fr.po'` — inlined here for clarity
   * const poFr = {headers: {}, contexts: {'': {Shabbat: ['Chabbat']}}};
   * Locale.addLocale('fr', poFr);
   * Locale.gettext('Shabbat', 'fr'); // 'Chabbat'
   */
  static addLocale(locale, data) {
    locale = checkLocale(locale);
    const ctx = data.contexts;
    if (typeof ctx !== "object" || typeof ctx[""] !== "object") {
      throw new TypeError(`Locale '${locale}' invalid compact format`);
    }
    locales.set(locale, ctx[""]);
  }
  /**
   * Adds a translation to `locale`, replacing any previous translation.
   * @param locale Locale name (i.e: `'he'`, `'fr'`).
   * @param id Message ID to translate
   * @param translation Translation text
   * @example
   * Locale.addTranslation('ashkenazi', 'Foobar', 'Quux');
   * Locale.gettext('Foobar', 'ashkenazi'); // 'Quux'
   */
  static addTranslation(locale, id, translation) {
    const loc = getExistingLocale(locale);
    if (typeof id !== "string" || id.length === 0) {
      throw new TypeError(`Invalid id string: ${id}`);
    }
    const isArray = Array.isArray(translation);
    if (isArray) {
      const t0 = translation[0];
      if (typeof t0 !== "string" || t0.length === 0) {
        throw new TypeError(`Invalid translation array: ${translation}`);
      }
    } else if (typeof translation !== "string") {
      throw new TypeError(`Invalid translation string: ${translation}`);
    }
    loc[id] = isArray ? translation : [translation];
  }
  /**
   * Adds multiple translations to `locale`, replacing any previous translations.
   *
   * The locale must already be registered (typically via `addLocale`);
   * to register a brand-new locale instead, call `addLocale` directly.
   * Use this method to merge an additional `.po` file (e.g. holiday
   * translations supplied by a separate `@hebcal/*` package) into an
   * existing locale.
   * @param locale Locale name (i.e: `'he'`, `'fr'`).
   * @param data parsed data from a `.po` file.
   * @throws {RangeError} if `locale` has not been registered
   * @throws {TypeError} if `data` is not in the compact `.po` format
   * @example
   * import {Locale} from '@hebcal/hdate';
   * Locale.addTranslations('ashkenazi', {
   *   headers: {},
   *   contexts: {'': {Sukkot: ['Sukkos'], Shavuot: ['Shavuos']}},
   * });
   * Locale.gettext('Sukkot', 'ashkenazi'); // 'Sukkos'
   * Locale.gettext('Tevet', 'ashkenazi');  // 'Teves' (existing translations kept)
   */
  static addTranslations(locale, data) {
    const loc = getExistingLocale(locale);
    const ctx = data.contexts;
    if (typeof ctx !== "object" || typeof ctx[""] !== "object") {
      throw new TypeError(`Locale '${locale}' invalid compact format`);
    }
    Object.assign(loc, ctx[""]);
  }
  /**
   * Returns the names of registered locales
   * @example
   * Locale.getLocaleNames(); // ['ashkenazi', 'en', 'he', 'he-x-nonikud']
   */
  static getLocaleNames() {
    const keys = Array.from(locales.keys());
    return keys.sort((a, b) => a.localeCompare(b));
  }
  /**
   * Checks whether a locale has been registered
   * @param locale Locale name (i.e: `'he'`, `'fr'`).
   * @example
   * Locale.hasLocale('he'); // true
   * Locale.hasLocale('fr'); // false
   */
  static hasLocale(locale) {
    const locale1 = checkLocale(locale);
    return locales.has(locale1);
  }
  /**
   * Renders a number in ordinal, such as 1st, 2nd or 3rd
   * @param [locale] Optional locale name (i.e: `'he'`, `'fr'`). Defaults to no-op locale.
   * @example
   * Locale.ordinal(3, 'en'); // '3rd'
   * Locale.ordinal(3, 'es'); // '3º'
   * Locale.ordinal(3, 'fr'); // '3.'
   * Locale.ordinal(3, 'he'); // '3'
   */
  static ordinal(n, locale) {
    const locale1 = checkLocale(locale || "");
    if (locale1 === "en" || locale1.startsWith("ashkenazi")) {
      return getEnOrdinal(n);
    } else if (_Locale.isHebrewLocale(locale1)) {
      return String(n);
    } else if (locale1 === "es") {
      return n + "\xBA";
    }
    return n + ".";
  }
  /**
   * Removes nekudot from Hebrew string
   * @example
   * Locale.hebrewStripNikkud('אֱלוּל'); // 'אלול'
   */
  static hebrewStripNikkud(str) {
    return hebrewStripNikkud(str);
  }
  /**
   * Returns a new `LocaleData` derived from `data` with niqqud (vowel
   * points) stripped from every translation value. The input is not
   * modified.
   *
   * This is the helper used internally to build the `he-x-NoNikud`
   * locale from `he`; call it when registering a derived "no nikud"
   * variant of a custom Hebrew-script locale.
   * @param data locale data to copy
   * @returns a new `LocaleData` with niqqud removed
   * @see {@link Locale.hebrewStripNikkud}
   * @example
   * import {Locale} from '@hebcal/hdate';
   * const withNikud = {
   *   headers: {},
   *   contexts: {'': {Elul: ['אֱלוּל']}},
   * };
   * const stripped = Locale.copyLocaleNoNikud(withNikud);
   * stripped.contexts[''].Elul[0];   // 'אלול'
   * withNikud.contexts[''].Elul[0];  // 'אֱלוּל' (input unchanged)
   */
  static copyLocaleNoNikud(data) {
    const strs = data.contexts[""];
    const m = {};
    for (const [key, val] of Object.entries(strs)) {
      m[key] = [hebrewStripNikkud(val[0])];
    }
    return {
      headers: data.headers,
      contexts: { "": m }
    };
  }
  /**
   * Returns true if `locale` is a Hebrew locale (i.e. `he` or `he-x-NoNikud`)
   * @example
   * Locale.isHebrewLocale('he');           // true
   * Locale.isHebrewLocale('he-x-NoNikud'); // true
   * Locale.isHebrewLocale('en');           // false
   */
  static isHebrewLocale(locale) {
    if (typeof locale !== "string") {
      return false;
    }
    locale = alias[locale] || locale;
    locale = locale.toLowerCase();
    return locale.startsWith("he");
  }
};
Locale.addLocale("en", noopLocale);
Locale.addLocale("ashkenazi", ashkenazi_po_default);
Locale.addLocale("he", he_po_default);
var poHeNoNikud = Locale.copyLocaleNoNikud(he_po_default);
Locale.addLocale("he-x-NoNikud", poHeNoNikud);

// node_modules/@hebcal/hdate/dist/esm/hdate.js
function mod2(x, y) {
  return x - y * Math.floor(x / y);
}
function isSimpleHebrewDate2(obj) {
  return obj.yy !== void 0;
}
var UNITS_DAY = "day";
var UNITS_WEEK = "week";
var UNITS_MONTH = "month";
var UNITS_YEAR = "year";
var HDate = class _HDate {
  /** Hebrew year, 1-9999 */
  yy;
  /** Hebrew month of year (1=NISAN, 7=TISHREI) */
  mm;
  /** Hebrew day within the month (1-30) */
  dd;
  /** absolute Rata Die (R.D.) days */
  rd;
  /**
   * Create a Hebrew date. There are 3 basic forms for the `HDate()` constructor.
   *
   * 1. No parameters - represents the current Hebrew date at time of instantiation
   * 2. One parameter
   *    * `Date` - represents the Hebrew date corresponding to the Gregorian date using
   *       local time. Hours, minutes, seconds and milliseconds are ignored.
   *    * `HDate` - clones a copy of the given Hebrew date
   *    * `number` - Converts absolute R.D. days to Hebrew date.
   *       R.D. 1 == the imaginary date January 1, 1 (Gregorian)
   * 3. Three parameters: Hebrew day, Hebrew month, Hebrew year. Hebrew day should
   *    be a number between 1-30, Hebrew month can be a number or string, and
   *    Hebrew year is always a number.
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   *
   * const hd1 = new HDate();
   * const hd2 = new HDate(new Date(2008, 10, 13));
   * const hd3 = new HDate(15, 'Cheshvan', 5769);
   * const hd4 = new HDate(15, months.CHESHVAN, 5769);
   * const hd5 = new HDate(733359); // ==> 15 Cheshvan 5769
   * const monthName = 'אייר';
   * const hd6 = new HDate(5, monthName, 5773);
   * @param [day] - Day of month (1-30) if a `number`.
   *   If a `Date` is specified, represents the Hebrew date corresponding to the
   *   Gregorian date using local time.
   *   If an `HDate` is specified, clones a copy of the given Hebrew date.
   * @param [month] - Hebrew month of year (1=NISAN, 7=TISHREI)
   * @param [year] - Hebrew year
   */
  constructor(day, month, year) {
    if (arguments.length === 2 || arguments.length > 3) {
      throw new TypeError("HDate constructor requires 0, 1 or 3 arguments");
    }
    if (arguments.length === 3) {
      this.dd = this.mm = 1;
      const yy = typeof year === "string" ? parseInt(year, 10) : year;
      if (isNaN(yy)) {
        throw new TypeError(`HDate called with bad year: ${year}`);
      }
      this.yy = yy;
      setMonth(this, month);
      const dd = typeof day === "string" ? parseInt(day, 10) : day;
      if (isNaN(dd)) {
        throw new TypeError(`HDate called with bad day: ${day}`);
      }
      setDate(this, dd);
    } else {
      if (day === void 0 || day === null) {
        day = /* @__PURE__ */ new Date();
      }
      const abs0 = typeof day === "number" && !isNaN(day) ? day : isDate(day) ? greg2abs(day) : isSimpleHebrewDate2(day) ? day : null;
      if (abs0 === null) {
        throw new TypeError(`HDate called with bad arg: ${day}`);
      }
      const isNumber = typeof abs0 === "number";
      const d2 = isNumber ? abs2hebrew(abs0) : abs0;
      this.yy = d2.yy;
      this.mm = d2.mm;
      this.dd = d2.dd;
      if (isNumber) {
        this.rd = abs0;
      }
    }
  }
  /**
   * Returns the Hebrew year of this Hebrew date
   * @returns an integer >= 1
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.getFullYear(); // 5769
   */
  getFullYear() {
    return this.yy;
  }
  /**
   * Returns `true` if this Hebrew date occurs during a Hebrew leap year
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.isLeapYear(); // false
   */
  isLeapYear() {
    return isLeapYear(this.yy);
  }
  /**
   * Returns the Hebrew month (1=NISAN, 7=TISHREI) of this Hebrew date
   * @returns an integer 1-13
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.getMonth(); // 8
   */
  getMonth() {
    return this.mm;
  }
  /**
   * The Tishrei-based month of this Hebrew date. 1 is Tishrei, 7 is Nisan, 13 is Elul in a leap year
   * @returns an integer 1-13
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.getTishreiMonth(); // 2
   */
  getTishreiMonth() {
    const nummonths = monthsInYear(this.getFullYear());
    return (this.getMonth() + nummonths - 6) % nummonths || nummonths;
  }
  /**
   * Number of days in the month of this Hebrew date (29 or 30)
   * @returns an integer 29-30
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.daysInMonth(); // 29
   */
  daysInMonth() {
    return daysInMonth(this.getMonth(), this.getFullYear());
  }
  /**
   * Gets the day within the month (1-30)
   * @returns an integer 1-30
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.getDate(); // 15
   */
  getDate() {
    return this.dd;
  }
  /**
   * Returns the day of the week for this Hebrew date,
   * where 0 represents Sunday, 1 represents Monday, 6 represents Saturday.
   *
   * For the day of the month, see `getDate()`
   * @returns an integer 0-6
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.getDay(); // 4 (Thursday)
   */
  getDay() {
    return mod2(this.abs(), 7);
  }
  /**
   * Converts this Hebrew date to the corresponding Gregorian date.
   *
   * The returned `Date` object will be in the local (i.e. host system) time zone.
   * Hours, minutes, seconds and milliseconds will all be zero.
   *
   * Note that this function returns the daytime portion of the date.
   * For example, the 15th of Cheshvan 5769 began at sundown on
   * 12 November 2008 and continues through 13 November 2008. This
   * function would return only the date 13 November 2008.
   * @example
   * const hd = new HDate(15, 'Cheshvan', 5769);
   * const date = hd.greg(); // 13 November 2008
   * const year = date.getFullYear(); // 2008
   * const monthNum = date.getMonth() + 1; // 11
   * const day = date.getDate(); // 13
   */
  greg() {
    return abs2greg(this.abs());
  }
  /**
   * Converts from Hebrew date representation to R.D. (Rata Die) fixed days.
   * R.D. 1 is the imaginary date Monday, January 1, 1 (Gregorian).
   * Note also that R.D. = Julian Date − 1,721,424.5
   * @see {@link https://en.wikipedia.org/wiki/Rata_Die | Rata Die}
   * @example
   * const hd = new HDate(15, 'Cheshvan', 5769);
   * hd.abs(); // 733359
   */
  abs() {
    if (typeof this.rd !== "number") {
      this.rd = hebrew2abs(this.yy, this.mm, this.dd);
    }
    return this.rd;
  }
  /**
   * Converts Hebrew date to R.D. (Rata Die) fixed days.
   * R.D. 1 is the imaginary date Monday, January 1, 1 on the Gregorian
   * Calendar.
   * @param year Hebrew year
   * @param month Hebrew month (1=NISAN, 7=TISHREI)
   * @param day Hebrew date (1-30)
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   * HDate.hebrew2abs(5769, months.CHESHVAN, 15); // 733359
   */
  static hebrew2abs(year, month, day) {
    return hebrew2abs(year, month, day);
  }
  /**
   * Returns a transliterated Hebrew month name, e.g. `'Elul'` or `'Cheshvan'`.
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.getMonthName(); // 'Cheshvan'
   */
  getMonthName() {
    return getMonthName(this.getMonth(), this.getFullYear());
  }
  /**
   * Renders this Hebrew date as a translated or transliterated string,
   * including ordinal e.g. `'15th of Cheshvan, 5769'`.
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   *
   * const hd = new HDate(15, months.CHESHVAN, 5769);
   * console.log(hd.render('en')); // '15th of Cheshvan, 5769'
   * console.log(hd.render('he')); // '15 חֶשְׁוָן, 5769'
   * console.log(hd.render('en', false)); // '15th of Cheshvan'
   * console.log(hd.render('he', false)); // '15 חֶשְׁוָן'
   * @param [locale] Optional locale name (defaults to active locale).
   * @param [showYear=true] Display year (defaults to true).
   * @see {@link Locale}
   */
  render(locale, showYear = true) {
    const locale0 = locale || "en";
    const day = this.getDate();
    const monthName0 = Locale.gettext(this.getMonthName(), locale0);
    const monthName = monthName0.replaceAll("'", "\u2019");
    const nth = Locale.ordinal(day, locale0);
    const dayOf = getDayOfTranslation(locale0);
    const dateStr = `${nth}${dayOf} ${monthName}`;
    if (showYear) {
      const fullYear = this.getFullYear();
      return `${dateStr}, ${fullYear}`;
    } else {
      return dateStr;
    }
  }
  /**
   * Renders this Hebrew date in Hebrew gematriya, regardless of locale.
   * @param suppressNikud - suppress nekudot (default false)
   * @param suppressYear - suppress Hebrew year (default false)
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   * const hd = new HDate(15, months.CHESHVAN, 5769);
   * hd.renderGematriya(); // 'ט״ו חֶשְׁוָן תשס״ט'
   * hd.renderGematriya(true); // 'ט״ו חשון תשס״ט'
   * hd.renderGematriya(false, true); // 'ט״ו חֶשְׁוָן'
   */
  renderGematriya(suppressNikud = false, suppressYear = false) {
    const d2 = this.getDate();
    const locale = suppressNikud ? "he-x-NoNikud" : "he";
    const m = Locale.gettext(this.getMonthName(), locale);
    const prefix = gematriya(d2) + " " + m;
    if (suppressYear) {
      return prefix;
    }
    const y = this.getFullYear();
    return prefix + " " + gematriya(y);
  }
  /**
   * Returns an `HDate` corresponding to the specified day of week
   * **before** this Hebrew date.
   *
   * Strictly before: if this date already falls on `dayOfWeek`, the
   * previous occurrence a week earlier is returned.
   * @example
   * const wed = new HDate(new Date('Wednesday February 19, 2014'));
   * wed.before(6).greg().toDateString(); // 'Sat Feb 15 2014'
   * @param dayOfWeek day of week: Sunday=0, Saturday=6
   * @returns a new `HDate`; the original is not modified
   */
  before(dayOfWeek) {
    return onOrBefore(dayOfWeek, this, -1);
  }
  /**
   * Returns an `HDate` corresponding to the specified day of week
   * **on or before** this Hebrew date
   * @example
   * const wed = new HDate(new Date('Wednesday February 19, 2014'));
   * const sat = new HDate(new Date('Saturday February 22, 2014'));
   * const sun = new HDate(new Date('Sunday February 23, 2014'));
   * wed.onOrBefore(6).greg().toDateString(); // 'Sat Feb 15 2014'
   * sat.onOrBefore(6).greg().toDateString(); // 'Sat Feb 22 2014'
   * sun.onOrBefore(6).greg().toDateString(); // 'Sat Feb 22 2014'
   * @param dayOfWeek day of week: Sunday=0, Saturday=6
   * @returns a new `HDate`; the original is not modified
   */
  onOrBefore(dayOfWeek) {
    return onOrBefore(dayOfWeek, this, 0);
  }
  /**
   * Returns an `HDate` corresponding to the specified day of week
   * **nearest** to this Hebrew date.
   *
   * Ties are broken forward: a date exactly 3 days from `dayOfWeek` in
   * both directions resolves to the later one.
   * @example
   * const wed = new HDate(new Date('Wednesday February 19, 2014'));
   * const tue = new HDate(new Date('Tuesday February 18, 2014'));
   * wed.nearest(6).greg().toDateString(); // 'Sat Feb 22 2014'
   * tue.nearest(6).greg().toDateString(); // 'Sat Feb 15 2014'
   * @param dayOfWeek day of week: Sunday=0, Saturday=6
   * @returns a new `HDate`; the original is not modified
   */
  nearest(dayOfWeek) {
    return onOrBefore(dayOfWeek, this, 3);
  }
  /**
   * Returns an `HDate` corresponding to the specified day of week
   * **on or after** this Hebrew date
   * @example
   * const wed = new HDate(new Date('Wednesday February 19, 2014'));
   * const sat = new HDate(new Date('Saturday February 22, 2014'));
   * const sun = new HDate(new Date('Sunday February 23, 2014'));
   * wed.onOrAfter(6).greg().toDateString(); // 'Sat Feb 22 2014'
   * sat.onOrAfter(6).greg().toDateString(); // 'Sat Feb 22 2014'
   * sun.onOrAfter(6).greg().toDateString(); // 'Sat Mar 01 2014'
   * @param dayOfWeek day of week: Sunday=0, Saturday=6
   * @returns a new `HDate`; the original is not modified
   */
  onOrAfter(dayOfWeek) {
    return onOrBefore(dayOfWeek, this, 6);
  }
  /**
   * Returns an `HDate` corresponding to the specified day of week
   * **after** this Hebrew date.
   *
   * Strictly after: if this date already falls on `dayOfWeek`, the next
   * occurrence a week later is returned.
   * @example
   * const wed = new HDate(new Date('Wednesday February 19, 2014'));
   * const sat = new HDate(new Date('Saturday February 22, 2014'));
   * const sun = new HDate(new Date('Sunday February 23, 2014'));
   * wed.after(6).greg().toDateString(); // 'Sat Feb 22 2014'
   * sat.after(6).greg().toDateString(); // 'Sat Mar 01 2014'
   * sun.after(6).greg().toDateString(); // 'Sat Mar 01 2014'
   * @param dayOfWeek day of week: Sunday=0, Saturday=6
   * @returns a new `HDate`; the original is not modified
   */
  after(dayOfWeek) {
    return onOrBefore(dayOfWeek, this, 7);
  }
  /**
   * Returns the next Hebrew date
   * @returns a new `HDate` one day later; the original is not modified
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.next().toString(); // '16 Cheshvan 5769'
   */
  next() {
    return new _HDate(this.abs() + 1);
  }
  /**
   * Returns the previous Hebrew date
   * @returns a new `HDate` one day earlier; the original is not modified
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.prev().toString(); // '14 Cheshvan 5769'
   */
  prev() {
    return new _HDate(this.abs() - 1);
  }
  /**
   * Returns a cloned `HDate` object with a specified amount of time added
   *
   * Units are case insensitive, and support plural and short forms.
   * Note, short forms are case sensitive.
   *
   * | Unit | Shorthand | Description
   * | --- | --- | --- |
   * | `day` | `d` | days |
   * | `week` | `w` | weeks |
   * | `month` | `M` | months |
   * | `year` | `y` | years |
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   *
   * const hd1 = new HDate(15, months.CHESHVAN, 5769);
   * hd1.add(7, 'd').toString();     // '22 Cheshvan 5769'
   * hd1.add(1, 'weeks').toString(); // '22 Cheshvan 5769'
   * hd1.add(1, 'year').toString();  // '15 Cheshvan 5770'
   * @param amount number of units to add (negative values subtract)
   * @param [units=d] unit of time, defaults to days
   * @returns a new `HDate`; the original is not modified
   * @throws {TypeError} if `units` is not a recognized unit of time
   */
  add(amount, units = "d") {
    amount = typeof amount === "string" ? parseInt(amount, 10) : amount;
    if (!amount) {
      return new _HDate(this);
    }
    units = standardizeUnits(units);
    if (units === UNITS_DAY) {
      return new _HDate(this.abs() + amount);
    } else if (units === UNITS_WEEK) {
      return new _HDate(this.abs() + 7 * amount);
    } else if (units === UNITS_YEAR) {
      return new _HDate(this.getDate(), this.getMonth(), this.getFullYear() + amount);
    } else {
      let hd = new _HDate(this);
      const sign = amount > 0 ? 1 : -1;
      amount = Math.abs(amount);
      for (let i = 0; i < amount; i++) {
        hd = new _HDate(hd.abs() + sign * hd.daysInMonth());
      }
      return hd;
    }
  }
  /**
   * Returns a cloned `HDate` object with a specified amount of time subracted
   *
   * Units are case insensitive, and support plural and short forms.
   * Note, short forms are case sensitive.
   *
   * | Unit | Shorthand | Description
   * | --- | --- | --- |
   * | `day` | `d` | days |
   * | `week` | `w` | weeks |
   * | `month` | `M` | months |
   * | `year` | `y` | years |
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   *
   * const hd1 = new HDate(15, months.CHESHVAN, 5769);
   * hd1.subtract(1, 'weeks').toString(); // '8 Cheshvan 5769'
   * hd1.subtract(3, 'M').toString();     // '16 Av 5768'
   * @param amount number of units to subtract (negative values add)
   * @param [units=d] unit of time, defaults to days
   * @returns a new `HDate`; the original is not modified
   * @throws {TypeError} if `units` is not a recognized unit of time
   */
  subtract(amount, units = "d") {
    return this.add(amount * -1, units);
  }
  /**
   * Returns the difference in days between the two given HDates.
   *
   * The result is positive if `this` date is comes chronologically
   * after the `other` date, and negative
   * if the order of the two dates is reversed.
   *
   * The result is zero if the two dates are identical.
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   *
   * const hd1 = new HDate(25, months.KISLEV, 5770);
   * const hd2 = new HDate(15, months.CHESHVAN, 5769);
   * const days = hd1.deltaDays(hd2); // 394
   * @param other Hebrew date to compare
   */
  deltaDays(other) {
    return this.abs() - other.abs();
  }
  /**
   * Compares this Hebrew date to another date, returning `true` if the dates match.
   * @param other Hebrew date to compare
   * @example
   * const hd1 = new HDate(new Date(2008, 10, 13));
   * const hd2 = new HDate(15, 'Cheshvan', 5769);
   * hd1.isSameDate(hd2); // true
   */
  isSameDate(other) {
    return this.yy === other.yy && this.mm === other.mm && this.dd === other.dd;
  }
  /**
   * Returns a string representation of this Hebrew date using English transliterations
   * @example
   * const hd = new HDate(new Date(2008, 10, 13)); // 15 Cheshvan 5769
   * hd.toString(); // '15 Cheshvan 5769'
   */
  toString() {
    const day = this.getDate();
    const fullYear = this.getFullYear();
    const monthName = this.getMonthName();
    return `${day} ${monthName} ${fullYear}`;
  }
  /**
   * Returns true if Hebrew year is a leap year
   * @param year Hebrew year
   * @example
   * HDate.isLeapYear(5783); // false
   * HDate.isLeapYear(5784); // true
   */
  static isLeapYear(year) {
    return isLeapYear(year);
  }
  /**
   * Number of months in this Hebrew year (either 12 or 13 depending on leap year)
   * @param year Hebrew year
   * @example
   * HDate.monthsInYear(5783); // 12
   * HDate.monthsInYear(5784); // 13
   */
  static monthsInYear(year) {
    return monthsInYear(year);
  }
  /**
   * Number of days in Hebrew month in a given year (29 or 30)
   * @param month Hebrew month (e.g. months.TISHREI)
   * @param year Hebrew year
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   * HDate.daysInMonth(months.CHESHVAN, 5769); // 29
   */
  static daysInMonth(month, year) {
    return daysInMonth(month, year);
  }
  /**
   * Returns a transliterated string name of Hebrew month in year,
   * for example 'Elul' or 'Cheshvan'.
   * @param month Hebrew month (e.g. months.TISHREI)
   * @param year Hebrew year
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   * HDate.getMonthName(months.CHESHVAN, 5769); // 'Cheshvan'
   */
  static getMonthName(month, year) {
    return getMonthName(month, year);
  }
  /**
   * Returns the Hebrew month number (NISAN=1, TISHREI=7)
   * @param month A number, or Hebrew month name string
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   * HDate.monthNum(months.CHESHVAN); // 8
   * HDate.monthNum('Cheshvan'); // 8
   * HDate.monthNum('חשון'); // 8
   */
  static monthNum(month) {
    if (typeof month === "number") {
      if (isNaN(month) || month > 14) {
        throw new RangeError(`bad monthNum: ${month}`);
      }
      return month;
    }
    if (typeof month !== "string") {
      throw new TypeError(`bad monthNum: ${month}`);
    }
    return month.charCodeAt(0) >= 48 && month.charCodeAt(0) <= 57 ? parseInt(month, 10) : monthFromName(month);
  }
  /**
   * Number of days in the Hebrew year.
   * Regular years can have 353, 354, or 355 days.
   * Leap years can have 383, 384, or 385 days.
   * @param year Hebrew year
   * @example
   * HDate.daysInYear(5783); // 355
   * HDate.daysInYear(5784); // 383
   */
  static daysInYear(year) {
    return daysInYear(year);
  }
  /**
   * true if Cheshvan is long in Hebrew year
   * @param year Hebrew year
   * @example
   * HDate.longCheshvan(5783); // true
   * HDate.longCheshvan(5784); // false
   */
  static longCheshvan(year) {
    return longCheshvan(year);
  }
  /**
   * true if Kislev is short in Hebrew year
   * @param year Hebrew year
   * @example
   * HDate.shortKislev(5783); // false
   * HDate.shortKislev(5784); // true
   */
  static shortKislev(year) {
    return shortKislev(year);
  }
  /**
   * Converts Hebrew month string name to numeric
   * @example
   * import {HDate, months} from '@hebcal/hdate';
   * HDate.monthFromName(months.CHESHVAN); // 8
   * HDate.monthFromName('Cheshvan'); // 8
   * HDate.monthFromName('חשון'); // 8
   */
  static monthFromName(monthName) {
    return monthFromName(monthName);
  }
  /**
   * Convenience function for determining the R.D. date
   * near a specified R.D. date, corresponding to the specified day of week.
   *
   * Note: Applying this function to d+6 gives us the `dayOfWeek` on or after an
   * absolute day d. Similarly, applying it to d+3 gives the `dayOfWeek` nearest to
   * absolute date d, applying it to d-1 gives the `dayOfWeek` previous to absolute
   * date d, and applying it to d+7 gives the `dayOfWeek` following absolute date d.
   *
   * The instance methods {@link HDate.before}, {@link HDate.onOrBefore},
   * {@link HDate.nearest}, {@link HDate.onOrAfter} and {@link HDate.after}
   * wrap this with those offsets already applied.
   * @param dayOfWeek day of week: Sunday=0, Saturday=6
   * @param absdate R.D. number of days
   * @returns R.D. number of days
   * @example
   * import {HDate} from '@hebcal/hdate';
   * // 733359 is Thursday 13 November 2008
   * HDate.dayOnOrBefore(6, 733359); // 733354 (Saturday 8 November 2008)
   * HDate.dayOnOrBefore(6, 733359 + 6); // 733361 (Saturday 15 November 2008)
   */
  static dayOnOrBefore(dayOfWeek, absdate) {
    return absdate - mod2(absdate - dayOfWeek, 7);
  }
  /**
   * Tests if the object is an instance of `HDate`
   * @example
   * HDate.isHDate(new HDate()); // true
   * HDate.isHDate(new Date()); // false
   * HDate.isHDate(null); // false
   * HDate.isHDate(12345); // false
   * HDate.isHDate('15 Cheshvan 5769'); // false
   */
  static isHDate(obj) {
    if (typeof obj !== "object" || obj === null) {
      return false;
    }
    const hd = obj;
    return typeof hd.yy === "number" && typeof hd.mm === "number" && typeof hd.dd === "number" && typeof hd.greg === "function" && typeof hd.abs === "function";
  }
  /**
   * Construct a new instance of `HDate` from a Gematriya-formatted string.
   *
   * The string must have the form day-month-year, with the month name
   * written in Hebrew script (nikud optional, an optional bet prefix
   * allowed). A year below 1000 is assumed to omit the thousands and has
   * `currentThousands` added to it.
   * @param str Hebrew date in gematriya, e.g. `'כ״ז בְּתַמּוּז תשפ״ג'`
   * @param [currentThousands=5000] added to a year below 1000
   * @returns the parsed Hebrew date
   * @throws {TypeError} if `str` is not a string
   * @throws {RangeError} if `str` is not 3 or 4 space-separated parts,
   *   or the month name is not recognized
   * @example
   * HDate.fromGematriyaString('כ״ז בְּתַמּוּז תשפ״ג').toString(); // '27 Tamuz 5783'
   * HDate.fromGematriyaString('כ׳ סיון תש״ד').toString(); // '20 Sivan 5704'
   * HDate.fromGematriyaString('ה׳ אִיָיר תש״ח').toString(); // '5 Iyyar 5708'
   */
  static fromGematriyaString(str, currentThousands = 5e3) {
    if (typeof str !== "string") {
      throw new TypeError(`bad gematriya str: ${str}`);
    }
    const parts = str.split(" ").filter((x) => x.length !== 0);
    const numParts = parts.length;
    if (numParts !== 3 && numParts !== 4) {
      throw new RangeError(`cannot parse gematriya str: "${str}"`);
    }
    const day = gematriyaStrToNum(parts[0]);
    const monthStr = numParts === 3 ? parts[1] : parts[1] + " " + parts[2];
    const month = monthFromName(monthStr);
    const yearStr = numParts === 3 ? parts[2] : parts[3];
    let year = gematriyaStrToNum(yearStr);
    if (year < 1e3) {
      year += currentThousands;
    }
    return new _HDate(day, month, year);
  }
};
function standardizeUnits(units) {
  switch (units) {
    case "d":
      return UNITS_DAY;
    case "w":
      return UNITS_WEEK;
    case "M":
      return UNITS_MONTH;
    case "y":
      return UNITS_YEAR;
  }
  const str = String(units || "").toLowerCase().replace(/s$/, "");
  switch (str) {
    case UNITS_DAY:
    case UNITS_WEEK:
    case UNITS_MONTH:
    case UNITS_YEAR:
      return str;
  }
  throw new TypeError(`Invalid units '${units}'`);
}
function getDayOfTranslation(locale) {
  switch (locale) {
    case "en":
    case "s":
    case "a":
    case "ashkenazi":
      return " of";
    default:
      break;
  }
  const ofStr = Locale.lookupTranslation("of", locale);
  if (ofStr) {
    return " " + ofStr;
  }
  if (locale.startsWith("ashkenazi")) {
    return " of";
  }
  return "";
}
function setMonth(hd, month) {
  hd.mm = HDate.monthNum(month);
  fix(hd);
  return hd;
}
function setDate(hd, date) {
  hd.dd = date;
  fix(hd);
  return hd;
}
function fix(hd) {
  fixMonth(hd);
  fixDate(hd);
}
function fixDate(hd) {
  if (hd.dd < 1) {
    if (hd.mm === months.TISHREI) {
      hd.yy -= 1;
    }
    hd.dd += daysInMonth(hd.mm, hd.yy);
    hd.mm -= 1;
    fix(hd);
  }
  if (hd.dd > daysInMonth(hd.mm, hd.yy)) {
    if (hd.mm === months.ELUL) {
      hd.yy += 1;
    }
    hd.dd -= daysInMonth(hd.mm, hd.yy);
    if (hd.mm === monthsInYear(hd.yy)) {
      hd.mm = 1;
    } else {
      hd.mm += 1;
    }
    fix(hd);
  }
  fixMonth(hd);
}
function fixMonth(hd) {
  if (hd.mm === months.ADAR_II && !hd.isLeapYear()) {
    hd.mm -= 1;
    fix(hd);
  } else if (hd.mm < 1) {
    hd.mm += monthsInYear(hd.yy);
    hd.yy -= 1;
    fix(hd);
  } else if (hd.mm > monthsInYear(hd.yy)) {
    hd.mm -= monthsInYear(hd.yy);
    hd.yy += 1;
    fix(hd);
  }
  delete hd.rd;
}
function onOrBefore(day, t, offset) {
  return new HDate(HDate.dayOnOrBefore(day, t.abs() + offset));
}

// node_modules/@hebcal/hdate/dist/esm/anniversaryHDate.js
function yahrzeit(hyear, date) {
  const hd = getYahrzeitHD(hyear, date);
  return hd && new HDate(hd);
}
function birthdayOrAnniversary(hyear, date) {
  const hd = getBirthdayHD(hyear, date);
  return hd && new HDate(hd);
}

// node_modules/@hebcal/core/dist/esm/ashkenazi.po.js
var poAshkenazi = { "headers": { "plural-forms": "nplurals=2; plural=(n > 1);", "language": "und-x-ashkenaz" }, "contexts": { "": { "Shabbat": ["Shabbos"], "Achrei Mot": ["Achrei Mos"], "Bechukotai": ["Bechukosai"], "Beha'alotcha": ["Beha\u2019aloscha"], "Bereshit": ["Bereshis"], "Chukat": ["Chukas"], "Erev Shavuot": ["Erev Shavuos"], "Erev Sukkot": ["Erev Sukkos"], "Ki Tavo": ["Ki Savo"], "Ki Teitzei": ["Ki Seitzei"], "Ki Tisa": ["Ki Sisa"], "Matot": ["Matos"], "Pesach Shabbat Chol ha-Moed": ["Pesach Shabbos Chol ha-Moed"], "Purim Katan": ["Purim Koton"], "Rosh Hashana LaBehemot": ["Rosh Hashana LaBeheimos"], "Shabbat Chazon": ["Shabbos Chazon"], "Shabbat HaChodesh": ["Shabbos HaChodesh"], "Shabbat HaGadol": ["Shabbos HaGadol"], "Shabbat Nachamu": ["Shabbos Nachamu"], "Shabbat Parah": ["Shabbos Parah"], "Shabbat Shekalim": ["Shabbos Shekalim"], "Shabbat Shuva": ["Shabbos Shuvah"], "Shabbat Zachor": ["Shabbos Zachor"], "Shavuot": ["Shavuos"], "Shavuot I": ["Shavuos I"], "Shavuot II": ["Shavuos II"], "Shemot": ["Shemos"], "Shmini Atzeret": ["Shmini Atzeres"], "Simchat Torah": ["Simchas Torah"], "Sukkot": ["Sukkos"], "Sukkot I": ["Sukkos I"], "Sukkot II": ["Sukkos II"], "Sukkot II (CH''M)": ["Sukkos II (CH\u2019\u2019M)"], "Sukkot III (CH''M)": ["Sukkos III (CH\u2019\u2019M)"], "Sukkot IV (CH''M)": ["Sukkos IV (CH\u2019\u2019M)"], "Sukkot V (CH''M)": ["Sukkos V (CH\u2019\u2019M)"], "Sukkot VI (CH''M)": ["Sukkos VI (CH\u2019\u2019M)"], "Sukkot VII (Hoshana Raba)": ["Sukkos VII (Hoshana Raba)"], "Sukkot Shabbat Chol ha-Moed": ["Sukkos Shabbos Chol ha-Moed"], "Ta'anit Bechorot": ["Ta\u2019anis Bechoros"], "Ta'anit BeHaB": ["Ta\u2019anis BeHaB"], "Ta'anit Esther": ["Ta\u2019anis Esther"], "Toldot": ["Toldos"], "Vaetchanan": ["Vaeschanan"], "Yitro": ["Yisro"], "Vezot Haberakhah": ["Vezos Haberakhah"], "Parashat": ["Parshas"], "Leil Selichot": ["Leil Selichos"], "Shabbat Mevarchim Chodesh": ["Shabbos Mevorchim Chodesh"], "Shabbat Shirah": ["Shabbos Shirah"], "Asara B'Tevet": ["Asara B\u2019Teves"], "Birkat Hachamah": ["Birkas HaChamah"], "Birkat HaChamah": ["Birkas HaChamah"], "Shushan Purim Katan": ["Shushan Purim Koton"], "Alot HaShachar": ["Alos HaShachar"], "Misheyakir": ["Misheyakir"], "Misheyakir Machmir": ["Misheyakir Machmir"], "Sunrise": ["Sunrise"], "Kriat Shema, sof zeman": ["Krias Shema, sof zman"], "Tefilah, sof zeman": ["Tefilah, sof zman"], "Kriat Shema, sof zeman (MGA)": ["Krias Shema, sof zman (MGA)"], "Kriat Shema, sof zeman (GRA)": ["Krias Shema, sof zman (GRA)"], "Tefilah, sof zeman (MGA)": ["Tefilah, sof zman (MGA)"], "Tefilah, sof zeman (GRA)": ["Tefilah, sof zman (GRA)"], "Chatzot HaLailah": ["Chatzos HaLailah"], "Chatzot HaYom": ["Chatzos"], "Chatzot hayom": ["Chatzos"], "Mincha Gedolah": ["Mincha Gedolah"], "Mincha Ketanah": ["Mincha Ketanah"], "Plag HaMincha": ["Plag HaMincha"], "Sunset": ["Sunset"], "Bein HaShemashot": ["Bein HaShemashos"], "Tzeit HaKochavim": ["Tzeis HaKochavim"], "Latest Kiddush Levana": ["Latest Kiddush Levanah"] } } };

// node_modules/@hebcal/core/dist/esm/he.po.js
var poHe = { "headers": { "plural-forms": "nplurals=2; plural=(n > 1);", "language": "he_IL" }, "contexts": { "": { "Shabbat": ["\u05E9\u05B7\u05C1\u05D1\u05B8\u05BC\u05EA"], "Parashat": ["\u05E4\u05B8\u05BC\u05E8\u05B8\u05E9\u05B7\u05C1\u05EA"], "Achrei Mot": ["\u05D0\u05B7\u05D7\u05B2\u05E8\u05B5\u05D9 \u05DE\u05D5\u05B9\u05EA"], "Balak": ["\u05D1\u05B8\u05BC\u05DC\u05B8\u05E7"], "Bamidbar": ["\u05D1\u05B0\u05BC\u05DE\u05B4\u05D3\u05B0\u05D1\u05B7\u05BC\u05E8"], "Bechukotai": ["\u05D1\u05B0\u05BC\u05D7\u05BB\u05E7\u05B9\u05BC\u05EA\u05B7\u05D9"], "Beha'alotcha": ["\u05D1\u05B0\u05BC\u05D4\u05B7\u05E2\u05B2\u05DC\u05B9\u05EA\u05B0\u05DA\u05B8"], "Behar": ["\u05D1\u05B0\u05BC\u05D4\u05B7\u05E8"], "Bereshit": ["\u05D1\u05B0\u05BC\u05E8\u05B5\u05D0\u05E9\u05B4\u05C1\u05D9\u05EA"], "Beshalach": ["\u05D1\u05B0\u05BC\u05E9\u05B7\u05C1\u05DC\u05B7\u05BC\u05D7"], "Bo": ["\u05D1\u05B9\u05BC\u05D0"], "Chayei Sara": ["\u05D7\u05B7\u05D9\u05B5\u05BC\u05D9 \u05E9\u05B8\u05B9\u05E8\u05B8\u05D4"], "Chukat": ["\u05D7\u05BB\u05E7\u05B7\u05BC\u05EA"], "Devarim": ["\u05D3\u05B0\u05BC\u05D1\u05B8\u05E8\u05B4\u05D9\u05DD"], "Eikev": ["\u05E2\u05B5\u05E7\u05B6\u05D1"], "Emor": ["\u05D0\u05B1\u05DE\u05D5\u05B9\u05E8"], "Ha'azinu": ["\u05D4\u05B7\u05D0\u05B2\u05D6\u05B4\u05D9\u05E0\u05D5\u05BC"], "Kedoshim": ["\u05E7\u05B0\u05D3\u05B9\u05E9\u05B4\u05C1\u05D9\u05DD"], "Ki Tavo": ["\u05DB\u05B4\u05BC\u05D9\u05BE\u05EA\u05B8\u05D1\u05D5\u05B9\u05D0"], "Ki Teitzei": ["\u05DB\u05B4\u05BC\u05D9\u05BE\u05EA\u05B5\u05E6\u05B5\u05D0"], "Ki Tisa": ["\u05DB\u05B4\u05BC\u05D9 \u05EA\u05B4\u05E9\u05B8\u05BC\u05C2\u05D0"], "Korach": ["\u05E7\u05B9\u05E8\u05B7\u05D7"], "Lech-Lecha": ["\u05DC\u05B6\u05DA\u05B0\u05BE\u05DC\u05B0\u05DA\u05B8"], "Masei": ["\u05DE\u05B7\u05E1\u05B0\u05E2\u05B5\u05D9"], "Matot": ["\u05DE\u05B7\u05D8\u05BC\u05D5\u05B9\u05EA"], "Metzora": ["\u05DE\u05B0\u05E6\u05B9\u05E8\u05B8\u05E2"], "Miketz": ["\u05DE\u05B4\u05E7\u05B5\u05BC\u05E5"], "Mishpatim": ["\u05DE\u05B4\u05E9\u05B0\u05C1\u05E4\u05B8\u05BC\u05D8\u05B4\u05D9\u05DD"], "Nasso": ["\u05E0\u05B8\u05E9\u05C2\u05D0"], "Nitzavim": ["\u05E0\u05B4\u05E6\u05B8\u05BC\u05D1\u05B4\u05D9\u05DD"], "Noach": ["\u05E0\u05B9\u05D7\u05B7"], "Pekudei": ["\u05E4\u05B0\u05E7\u05D5\u05BC\u05D3\u05B5\u05D9"], "Pinchas": ["\u05E4\u05B4\u05BC\u05D9\u05E0\u05B0\u05D7\u05B8\u05E1"], "Re'eh": ["\u05E8\u05B0\u05D0\u05B5\u05D4"], "Sh'lach": ["\u05E9\u05B0\u05C1\u05DC\u05B7\u05D7\u05BE\u05DC\u05B0\u05DA\u05B8"], "Shemot": ["\u05E9\u05B0\u05C1\u05DE\u05D5\u05B9\u05EA"], "Shmini": ["\u05E9\u05B0\u05BC\u05C1\u05DE\u05B4\u05D9\u05E0\u05B4\u05D9"], "Shoftim": ["\u05E9\u05C1\u05D5\u05B9\u05E4\u05B0\u05D8\u05B4\u05D9\u05DD"], "Tazria": ["\u05EA\u05B7\u05D6\u05B0\u05E8\u05B4\u05D9\u05E2\u05B7"], "Terumah": ["\u05EA\u05B0\u05BC\u05E8\u05D5\u05BC\u05DE\u05B8\u05D4"], "Tetzaveh": ["\u05EA\u05B0\u05BC\u05E6\u05B7\u05D5\u05B6\u05BC\u05D4"], "Toldot": ["\u05EA\u05BC\u05D5\u05B9\u05DC\u05B0\u05D3\u05D5\u05B9\u05EA"], "Tzav": ["\u05E6\u05B7\u05D5"], "Vaera": ["\u05D5\u05B8\u05D0\u05B5\u05E8\u05B8\u05D0"], "Vaetchanan": ["\u05D5\u05B8\u05D0\u05B6\u05EA\u05B0\u05D7\u05B7\u05E0\u05B7\u05BC\u05DF"], "Vayakhel": ["\u05D5\u05B7\u05D9\u05B7\u05BC\u05E7\u05B0\u05D4\u05B5\u05DC"], "Vayechi": ["\u05D5\u05B7\u05D9\u05B0\u05D7\u05B4\u05D9"], "Vayeilech": ["\u05D5\u05B7\u05D9\u05B5\u05BC\u05DC\u05B6\u05DA\u05B0"], "Vayera": ["\u05D5\u05B7\u05D9\u05B5\u05BC\u05E8\u05B8\u05D0"], "Vayeshev": ["\u05D5\u05B7\u05D9\u05B5\u05BC\u05E9\u05B6\u05C1\u05D1"], "Vayetzei": ["\u05D5\u05B7\u05D9\u05B5\u05BC\u05E6\u05B5\u05D0"], "Vayigash": ["\u05D5\u05B7\u05D9\u05B4\u05BC\u05D2\u05B7\u05BC\u05E9\u05C1"], "Vayikra": ["\u05D5\u05B7\u05D9\u05B4\u05BC\u05E7\u05B0\u05E8\u05B8\u05D0"], "Vayishlach": ["\u05D5\u05B7\u05D9\u05B4\u05BC\u05E9\u05B0\u05C1\u05DC\u05B7\u05D7"], "Vezot Haberakhah": ["\u05D5\u05B0\u05D6\u05B9\u05D0\u05EA \u05D4\u05B7\u05D1\u05B0\u05BC\u05E8\u05B8\u05DB\u05B8\u05D4"], "Yitro": ["\u05D9\u05B4\u05EA\u05B0\u05E8\u05D5\u05B9"], "Asara B'Tevet": ["\u05E2\u05B2\u05E9\u05B8\u05C2\u05E8\u05B8\u05D4 \u05D1\u05B0\u05BC\u05D8\u05B5\u05D1\u05B5\u05EA"], "Candle lighting": ["\u05D4\u05B7\u05D3\u05B0\u05DC\u05B8\u05E7\u05B7\u05EA \u05E0\u05B5\u05E8\u05D5\u05B9\u05EA"], "Chanukah": ["\u05D7\u05B2\u05E0\u05D5\u05BC\u05DB\u05B8\u05BC\u05D4"], "Chanukah: 1 Candle": ["\u05D7\u05B2\u05E0\u05D5\u05BC\u05DB\u05B8\u05BC\u05D4: \u05D0\u05F3 \u05E0\u05B5\u05E8"], "Chanukah: 2 Candles": ["\u05D7\u05B2\u05E0\u05D5\u05BC\u05DB\u05B8\u05BC\u05D4: \u05D1\u05F3 \u05E0\u05B5\u05E8\u05D5\u05B9\u05EA"], "Chanukah: 3 Candles": ["\u05D7\u05B2\u05E0\u05D5\u05BC\u05DB\u05B8\u05BC\u05D4: \u05D2\u05F3 \u05E0\u05B5\u05E8\u05D5\u05B9\u05EA"], "Chanukah: 4 Candles": ["\u05D7\u05B2\u05E0\u05D5\u05BC\u05DB\u05B8\u05BC\u05D4: \u05D3\u05F3 \u05E0\u05B5\u05E8\u05D5\u05B9\u05EA"], "Chanukah: 5 Candles": ["\u05D7\u05B2\u05E0\u05D5\u05BC\u05DB\u05B8\u05BC\u05D4: \u05D4\u05F3 \u05E0\u05B5\u05E8\u05D5\u05B9\u05EA"], "Chanukah: 6 Candles": ["\u05D7\u05B2\u05E0\u05D5\u05BC\u05DB\u05B8\u05BC\u05D4: \u05D5\u05F3 \u05E0\u05B5\u05E8\u05D5\u05B9\u05EA"], "Chanukah: 7 Candles": ["\u05D7\u05B2\u05E0\u05D5\u05BC\u05DB\u05B8\u05BC\u05D4: \u05D6\u05F3 \u05E0\u05B5\u05E8\u05D5\u05B9\u05EA"], "Chanukah: 8 Candles": ["\u05D7\u05B2\u05E0\u05D5\u05BC\u05DB\u05B8\u05BC\u05D4: \u05D7\u05F3 \u05E0\u05B5\u05E8\u05D5\u05B9\u05EA"], "Chanukah: 8th Day": ["\u05D7\u05B2\u05E0\u05D5\u05BC\u05DB\u05B8\u05BC\u05D4: \u05D9\u05D5\u05B9\u05DD \u05D7\u05F3"], "Days of the Omer": ["\u05E1\u05B0\u05E4\u05B4\u05D9\u05E8\u05B7\u05EA \u05D4\u05B8\u05E2\u05D5\u05B9\u05DE\u05B6\u05E8"], "Omer": ["\u05E2\u05D5\u05B9\u05DE\u05B6\u05E8"], "day of the Omer": ["\u05D1\u05B8\u05BC\u05E2\u05D5\u05B9\u05DE\u05B6\u05E8"], "Erev Pesach": ["\u05E2\u05B6\u05E8\u05B6\u05D1 \u05E4\u05B6\u05BC\u05E1\u05B7\u05D7"], "Erev Purim": ["\u05E2\u05B6\u05E8\u05B6\u05D1 \u05E4\u05BC\u05D5\u05BC\u05E8\u05B4\u05D9\u05DD"], "Erev Rosh Hashana": ["\u05E2\u05B6\u05E8\u05B6\u05D1 \u05E8\u05B9\u05D0\u05E9\u05C1 \u05D4\u05B7\u05E9\u05B8\u05BC\u05C1\u05E0\u05B8\u05D4"], "Erev Shavuot": ["\u05E2\u05B6\u05E8\u05B6\u05D1 \u05E9\u05B8\u05C1\u05D1\u05D5\u05BC\u05E2\u05D5\u05B9\u05EA"], "Erev Simchat Torah": ["\u05E2\u05B6\u05E8\u05B6\u05D1 \u05E9\u05B4\u05C2\u05DE\u05B0\u05D7\u05B7\u05EA \u05EA\u05BC\u05D5\u05B9\u05E8\u05B8\u05D4"], "Erev Sukkot": ["\u05E2\u05B6\u05E8\u05B6\u05D1 \u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA"], "Erev Tish'a B'Av": ["\u05E2\u05B6\u05E8\u05B6\u05D1 \u05EA\u05B4\u05BC\u05E9\u05B0\u05C1\u05E2\u05B8\u05D4 \u05D1\u05B0\u05BC\u05D0\u05B8\u05D1"], "Erev Yom Kippur": ["\u05E2\u05B6\u05E8\u05B6\u05D1 \u05D9\u05D5\u05B9\u05DD \u05DB\u05B4\u05BC\u05E4\u05BC\u05D5\u05BC\u05E8"], "Havdalah": ["\u05D4\u05B7\u05D1\u05B0\u05D3\u05B8\u05BC\u05DC\u05B8\u05D4"], "Lag BaOmer": ["\u05DC\u05F4\u05D2 \u05D1\u05B8\u05BC\u05E2\u05D5\u05B9\u05DE\u05B6\u05E8"], "Leil Selichot": ["\u05E1\u05B0\u05DC\u05B4\u05D9\u05D7\u05D5\u05B9\u05EA"], "Pesach": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7"], "Pesach I": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7 \u05D0\u05F3"], "Pesach II": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7 \u05D1\u05F3"], "Pesach II (CH''M)": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7 \u05D1\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Pesach III (CH''M)": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7 \u05D2\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Pesach IV (CH''M)": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7 \u05D3\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Pesach Sheni": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7 \u05E9\u05B5\u05C1\u05E0\u05B4\u05D9"], "Pesach V (CH''M)": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7 \u05D4\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Pesach VI (CH''M)": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7 \u05D5\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Pesach VII": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7 \u05D6\u05F3"], "Pesach VIII": ["\u05E4\u05B6\u05BC\u05E1\u05B7\u05D7 \u05D7\u05F3"], "Pesach Shabbat Chol ha-Moed": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05D7\u05B9\u05DC \u05D4\u05B7\u05DE\u05BC\u05D5\u05B9\u05E2\u05B5\u05D3 \u05E4\u05B6\u05BC\u05E1\u05B7\u05D7"], "Purim": ["\u05E4\u05BC\u05D5\u05BC\u05E8\u05B4\u05D9\u05DD"], "Purim Katan": ["\u05E4\u05BC\u05D5\u05BC\u05E8\u05B4\u05D9\u05DD \u05E7\u05B8\u05D8\u05B8\u05DF"], "Rosh Chodesh": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1"], "Rosh Hashana": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D4\u05B7\u05E9\u05B8\u05BC\u05C1\u05E0\u05B8\u05D4"], "Rosh Hashana I": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D4\u05B7\u05E9\u05B8\u05BC\u05C1\u05E0\u05B8\u05D4 \u05D0\u05F3"], "Rosh Hashana II": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D4\u05B7\u05E9\u05B8\u05BC\u05C1\u05E0\u05B8\u05D4 \u05D1\u05F3"], "Shabbat Chazon": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05D7\u05B2\u05D6\u05D5\u05B9\u05DF"], "Shabbat HaChodesh": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05D4\u05B7\u05D7\u05B9\u05D3\u05B6\u05E9\u05C1"], "Shabbat HaGadol": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05D4\u05B7\u05D2\u05B8\u05BC\u05D3\u05D5\u05B9\u05DC"], "Shabbat Nachamu": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05E0\u05B7\u05D7\u05B2\u05DE\u05D5\u05BC"], "Shabbat Parah": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05E4\u05B8\u05BC\u05E8\u05B8\u05D4"], "Shabbat Shekalim": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05E9\u05B0\u05C1\u05E7\u05B8\u05DC\u05B4\u05D9\u05DD"], "Shabbat Shuva": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05E9\u05C1\u05D5\u05BC\u05D1\u05B8\u05D4"], "Shabbat Zachor": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05D6\u05B8\u05DB\u05D5\u05B9\u05E8"], "Shavuot": ["\u05E9\u05B8\u05C1\u05D1\u05D5\u05BC\u05E2\u05D5\u05B9\u05EA"], "Shavuot I": ["\u05E9\u05B8\u05C1\u05D1\u05D5\u05BC\u05E2\u05D5\u05B9\u05EA \u05D0\u05F3"], "Shavuot II": ["\u05E9\u05B8\u05C1\u05D1\u05D5\u05BC\u05E2\u05D5\u05B9\u05EA \u05D1\u05F3"], "Shmini Atzeret": ["\u05E9\u05B0\u05C1\u05DE\u05B4\u05D9\u05E0\u05B4\u05D9 \u05E2\u05B2\u05E6\u05B6\u05E8\u05B6\u05EA"], "Shushan Purim": ["\u05E9\u05C1\u05D5\u05BC\u05E9\u05B8\u05C1\u05DF \u05E4\u05BC\u05D5\u05BC\u05E8\u05B4\u05D9\u05DD"], "Sigd": ["\u05D7\u05B7\u05D2 \u05D4\u05B7\u05E1\u05B4\u05BC\u05D9\u05D2\u05B0\u05D3"], "Simchat Torah": ["\u05E9\u05B4\u05C2\u05DE\u05B0\u05D7\u05B7\u05EA \u05EA\u05BC\u05D5\u05B9\u05E8\u05B8\u05D4"], "Sukkot": ["\u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA"], "Sukkot I": ["\u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA \u05D0\u05F3"], "Sukkot II": ["\u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA \u05D1\u05F3"], "Sukkot II (CH''M)": ["\u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA \u05D1\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Sukkot III (CH''M)": ["\u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA \u05D2\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Sukkot IV (CH''M)": ["\u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA \u05D3\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Sukkot V (CH''M)": ["\u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA \u05D4\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Sukkot VI (CH''M)": ["\u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA \u05D5\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Sukkot VII (Hoshana Raba)": ["\u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA \u05D6\u05F3 (\u05D4\u05D5\u05B9\u05E9\u05B7\u05C1\u05E2\u05B0\u05E0\u05B8\u05D0 \u05E8\u05B7\u05D1\u05B8\u05BC\u05D4)"], "Sukkot Shabbat Chol ha-Moed": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05D7\u05B9\u05DC \u05D4\u05B7\u05DE\u05BC\u05D5\u05B9\u05E2\u05B5\u05D3 \u05E1\u05BB\u05DB\u05BC\u05D5\u05B9\u05EA"], "Ta'anit Bechorot": ["\u05EA\u05B7\u05BC\u05E2\u05B2\u05E0\u05B4\u05D9\u05EA \u05D1\u05B0\u05BC\u05DB\u05D5\u05B9\u05E8\u05D5\u05B9\u05EA"], "Ta'anit BeHaB": ["\u05EA\u05B7\u05BC\u05E2\u05B2\u05E0\u05B4\u05D9\u05EA \u05D1\u05D4\u05F4\u05D1"], "Ta'anit Esther": ["\u05EA\u05B7\u05BC\u05E2\u05B2\u05E0\u05B4\u05D9\u05EA \u05D0\u05B6\u05E1\u05B0\u05EA\u05B5\u05BC\u05E8"], "Tish'a B'Av": ["\u05EA\u05B4\u05BC\u05E9\u05B0\u05C1\u05E2\u05B8\u05D4 \u05D1\u05B0\u05BC\u05D0\u05B8\u05D1"], "Tu B'Av": ["\u05D8\u05F4\u05D5\u05BC \u05D1\u05B0\u05BC\u05D0\u05B8\u05D1"], "Tu BiShvat": ["\u05D8\u05F4\u05D5\u05BC \u05D1\u05B4\u05BC\u05E9\u05B0\u05C1\u05D1\u05B8\u05D8"], "Tu B'Shvat": ["\u05D8\u05F4\u05D5\u05BC \u05D1\u05B4\u05BC\u05E9\u05B0\u05C1\u05D1\u05B8\u05D8"], "Tzom Gedaliah": ["\u05E6\u05D5\u05B9\u05DD \u05D2\u05B0\u05BC\u05D3\u05B7\u05DC\u05B0\u05D9\u05B8\u05D4"], "Tzom Tammuz": ["\u05E6\u05D5\u05B9\u05DD \u05D9\u05F4\u05D6 \u05D1\u05B0\u05BC\u05EA\u05B7\u05DE\u05BC\u05D5\u05BC\u05D6"], "Yom HaAtzma'ut": ["\u05D9\u05D5\u05B9\u05DD \u05D4\u05B8\u05E2\u05B7\u05E6\u05B0\u05DE\u05B8\u05D0\u05D5\u05BC\u05EA"], "Yom HaShoah": ["\u05D9\u05D5\u05B9\u05DD \u05D4\u05B7\u05E9\u05BC\u05C1\u05D5\u05B9\u05D0\u05B8\u05D4"], "Yom HaZikaron": ["\u05D9\u05D5\u05B9\u05DD \u05D4\u05B7\u05D6\u05B4\u05BC\u05DB\u05B8\u05BC\u05E8\u05D5\u05B9\u05DF"], "Yom Kippur": ["\u05D9\u05D5\u05B9\u05DD \u05DB\u05B4\u05BC\u05E4\u05BC\u05D5\u05BC\u05E8"], "Yom Yerushalayim": ["\u05D9\u05D5\u05B9\u05DD \u05D9\u05B0\u05E8\u05D5\u05BC\u05E9\u05B8\u05C1\u05DC\u05B7\u05D9\u05B4\u05DD"], "Yom HaAliyah": ["\u05D9\u05D5\u05B9\u05DD \u05D4\u05B7\u05E2\u05B2\u05DC\u05B4\u05D9\u05B8\u05BC\u05D4"], "Yom HaAliyah School Observance": ["\u05E9\u05B0\u05C1\u05DE\u05B4\u05D9\u05E8\u05B8\u05EA \u05D1\u05B5\u05BC\u05D9\u05EA \u05D4\u05B7\u05E1\u05B5\u05E4\u05B6\u05E8 \u05DC\u05B0\u05D9\u05D5\u05B9\u05DD \u05D4\u05B7\u05E2\u05B2\u05DC\u05B4\u05D9\u05B8\u05BC\u05D4"], "Rosh Chodesh Adar": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05D0\u05B2\u05D3\u05B8\u05E8"], "Rosh Chodesh Adar I": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05D0\u05B2\u05D3\u05B8\u05E8 \u05D0\u05F3"], "Rosh Chodesh Adar II": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05D0\u05B2\u05D3\u05B8\u05E8 \u05D1\u05F3"], "Rosh Chodesh Av": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05D0\u05B8\u05D1"], "Rosh Chodesh Cheshvan": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05D7\u05B6\u05E9\u05B0\u05C1\u05D5\u05B8\u05DF"], "Rosh Chodesh Elul": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05D0\u05B1\u05DC\u05D5\u05BC\u05DC"], "Rosh Chodesh Iyyar": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05D0\u05B4\u05D9\u05B8\u05BC\u05D9\u05E8"], "Rosh Chodesh Kislev": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05DB\u05B4\u05BC\u05E1\u05B0\u05DC\u05B5\u05D5"], "Rosh Chodesh Nisan": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05E0\u05B4\u05D9\u05E1\u05B8\u05DF"], "Rosh Chodesh Sh'vat": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05E9\u05B0\u05C1\u05D1\u05B8\u05D8"], "Rosh Chodesh Sivan": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05E1\u05B4\u05D9\u05D5\u05B8\u05DF"], "Rosh Chodesh Tamuz": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05EA\u05B7\u05BC\u05DE\u05BC\u05D5\u05BC\u05D6"], "Rosh Chodesh Tammuz": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05EA\u05B7\u05BC\u05DE\u05BC\u05D5\u05BC\u05D6"], "Rosh Chodesh Tevet": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1 \u05D8\u05B5\u05D1\u05B5\u05EA"], "min": ["\u05D3\u05B7\u05BC\u05E7\u05BC\u05D5\u05B9\u05EA"], "Fast begins": ["\u05EA\u05B0\u05BC\u05D7\u05B4\u05D9\u05DC\u05B7\u05BC\u05EA \u05D4\u05B7\u05E6\u05D5\u05B9\u05DD"], "Fast ends": ["\u05E1\u05B4\u05D9\u05BC\u05D5\u05BC\u05DD \u05D4\u05B7\u05E6\u05D5\u05B9\u05DD"], "Rosh Hashana LaBehemot": ["\u05E8\u05B9\u05D0\u05E9\u05C1 \u05D4\u05B7\u05E9\u05B8\u05BC\u05C1\u05E0\u05B8\u05D4 \u05DC\u05B0\u05DE\u05B7\u05E2\u05B0\u05E9\u05B7\u05C2\u05E8 \u05D1\u05B0\u05BC\u05D4\u05B5\u05DE\u05B8\u05D4"], "Tish'a B'Av (observed)": ["(\u05EA\u05B4\u05BC\u05E9\u05B0\u05C1\u05E2\u05B8\u05D4 \u05D1\u05B0\u05BC\u05D0\u05B8\u05D1 (\u05E0\u05B4\u05D3\u05B0\u05D7\u05B8\u05D4"], "Shabbat Mevarchim Chodesh": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05DE\u05B0\u05D1\u05B8\u05E8\u05B0\u05DB\u05B4\u05D9\u05DD \u05D7\u05D5\u05B9\u05D3\u05B6\u05E9\u05C1"], "Shabbat Shirah": ["\u05E9\u05B7\u05C1\u05D1\u05B7\u05BC\u05EA \u05E9\u05B4\u05C1\u05D9\u05E8\u05B8\u05D4"], "Lovingkindness": ["\u05D7\u05B6\u05E1\u05B6\u05D3"], "Might": ["\u05D2\u05B0\u05BC\u05D1\u05D5\u05BC\u05E8\u05B8\u05D4"], "Beauty": ["\u05EA\u05B4\u05BC\u05E4\u05B0\u05D0\u05B6\u05E8\u05B6\u05EA"], "Eternity": ["\u05E0\u05B6\u05BC\u05E6\u05B7\u05D7"], "Splendor": ["\u05D4\u05D5\u05B9\u05D3"], "Foundation": ["\u05D9\u05B0\u05BC\u05E1\u05D5\u05B9\u05D3"], "Majesty": ["\u05DE\u05B7\u05BC\u05DC\u05B0\u05DB\u05D5\u05BC\u05EA"], "day": ["\u05D9\u05D5\u05B9\u05DD"], "Yom Kippur Katan": ["\u05D9\u05D5\u05B9\u05DD \u05DB\u05B4\u05BC\u05E4\u05BC\u05D5\u05BC\u05E8 \u05E7\u05B8\u05D8\u05B8\u05DF"], "Yizkor": ["\u05D9\u05B4\u05D6\u05B0\u05DB\u05BC\u05D5\u05B9\u05E8"], "Family Day": ["\u05D9\u05D5\u05B9\u05DD \u05D4\u05B7\u05DE\u05B4\u05BC\u05E9\u05C1\u05E4\u05B8\u05BC\u05D7\u05B8\u05D4"], "Yitzhak Rabin Memorial Day": ["\u05D9\u05D5\u05B9\u05DD \u05D4\u05B7\u05D6\u05B4\u05BC\u05DB\u05B8\u05BC\u05E8\u05D5\u05B9\u05DF \u05DC\u05B0\u05D9\u05B4\u05E6\u05B0\u05D7\u05B8\u05E7 \u05E8\u05B7\u05D1\u05B4\u05BC\u05D9\u05DF"], "Jabotinsky Day": ["\u05D9\u05D5\u05B9\u05DD \u05D6\u05B7\u05F3\u05D1\u05BC\u05D5\u05B9\u05D8\u05B4\u05D9\u05E0\u05B0\u05E1\u05B0\u05E7\u05B4\u05D9"], "Herzl Day": ["\u05D9\u05D5\u05B9\u05DD \u05D4\u05B6\u05E8\u05B0\u05E6\u05B0\u05DC"], "Ben-Gurion Day": ["\u05D9\u05D5\u05B9\u05DD \u05D1\u05B6\u05BC\u05DF\u05BE\u05D2\u05BC\u05D5\u05BC\u05E8\u05B4\u05D9\u05BC\u05D5\u05B9\u05DF"], "Hebrew Language Day": ["\u05D9\u05D5\u05B9\u05DD \u05D4\u05B7\u05E9\u05B8\u05C2\u05E4\u05B8\u05D4 \u05D4\u05B7\u05E2\u05B4\u05D1\u05E8\u05B4\u05D9\u05EA"], "Birkat Hachamah": ["\u05D1\u05B4\u05BC\u05E8\u05B0\u05DB\u05B7\u05BC\u05EA \u05D4\u05B7\u05D7\u05B7\u05DE\u05B8\u05BC\u05D4"], "Birkat HaChamah": ["\u05D1\u05B4\u05BC\u05E8\u05B0\u05DB\u05B7\u05BC\u05EA \u05D4\u05B7\u05D7\u05B7\u05DE\u05B8\u05BC\u05D4"], "Shushan Purim Katan": ["\u05E9\u05C1\u05D5\u05BC\u05E9\u05B8\u05C1\u05DF \u05E4\u05BC\u05D5\u05BC\u05E8\u05B4\u05D9\u05DD \u05E7\u05B8\u05D8\u05B8\u05DF"], "Purim Meshulash": ["\u05E4\u05BC\u05D5\u05BC\u05E8\u05B4\u05D9\u05DD \u05DE\u05B0\u05E9\u05C1\u05D5\u05BC\u05DC\u05B8\u05BC\u05E9\u05C1"], "Chag HaBanot": ["\u05D7\u05B7\u05D2 \u05D4\u05B7\u05D1\u05B8\u05BC\u05E0\u05D5\u05B9\u05EA"], "Molad": ["\u05DE\u05D5\u05B9\u05DC\u05B8\u05D3 \u05D4\u05B8\u05DC\u05B0\u05BC\u05D1\u05B8\u05E0\u05B8\u05D4"], "chalakim": ["\u05D7\u05B2\u05DC\u05B8\u05E7\u05B4\u05D9\u05DD"], "Alot HaShachar": ["\u05E2\u05B2\u05DC\u05D5\u05B9\u05EA \u05D4\u05B7\u05E9\u05B7\u05BC\u05C1\u05D7\u05B7\u05E8"], "Misheyakir": ["\u05DE\u05B4\u05E9\u05B6\u05BC\u05C1\u05D9\u05B7\u05BC\u05DB\u05B4\u05BC\u05D9\u05E8"], "Misheyakir Machmir": ["\u05DE\u05B4\u05E9\u05B6\u05BC\u05C1\u05D9\u05B7\u05BC\u05DB\u05B4\u05BC\u05D9\u05E8 \u05DE\u05B7\u05D7\u05B0\u05DE\u05B4\u05D9\u05E8"], "Sunrise": ["\u05E0\u05B5\u05E5 \u05D4\u05B7\u05D7\u05B7\u05DE\u05B8\u05BC\u05D4"], "Kriat Shema, sof zeman": ["\u05E1\u05D5\u05B9\u05E3 \u05D6\u05B0\u05DE\u05B7\u05DF \u05E7\u05B0\u05E8\u05B4\u05D9\u05D0\u05B7\u05EA \u05E9\u05B0\u05C1\u05DE\u05B7\u05E2"], "Tefilah, sof zeman": ["\u05E1\u05D5\u05B9\u05E3 \u05D6\u05B0\u05DE\u05B7\u05DF \u05EA\u05B0\u05BC\u05E4\u05B4\u05DC\u05B8\u05BC\u05D4"], "Kriat Shema, sof zeman (MGA)": ["\u05E1\u05D5\u05B9\u05E3 \u05D6\u05B0\u05DE\u05B7\u05DF \u05E7\u05B0\u05E8\u05B4\u05D9\u05D0\u05B7\u05EA \u05E9\u05B0\u05C1\u05DE\u05B7\u05E2 (\u05DE\u05D2\u05F4\u05D0)"], "Kriat Shema, sof zeman (GRA)": ["\u05E1\u05D5\u05B9\u05E3 \u05D6\u05B0\u05DE\u05B7\u05DF \u05E7\u05B0\u05E8\u05B4\u05D9\u05D0\u05B7\u05EA \u05E9\u05B0\u05C1\u05DE\u05B7\u05E2 (\u05D2\u05B0\u05BC\u05E8\u05B8\u05F4\u05D0)"], "Tefilah, sof zeman (MGA)": ["\u05E1\u05D5\u05B9\u05E3 \u05D6\u05B0\u05DE\u05B7\u05DF \u05EA\u05B0\u05BC\u05E4\u05B4\u05DC\u05B8\u05BC\u05D4 (\u05DE\u05D2\u05F4\u05D0)"], "Tefilah, sof zeman (GRA)": ["\u05E1\u05D5\u05B9\u05E3 \u05D6\u05B0\u05DE\u05B7\u05DF \u05EA\u05B0\u05BC\u05E4\u05B4\u05DC\u05B8\u05BC\u05D4 (\u05D2\u05B0\u05BC\u05E8\u05B8\u05F4\u05D0)"], "Chatzot HaLailah": ["\u05D7\u05B2\u05E6\u05D5\u05B9\u05EA \u05D4\u05B7\u05DC\u05B7\u05BC\u05D9\u05B0\u05DC\u05B8\u05D4"], "Chatzot HaYom": ["\u05D7\u05B2\u05E6\u05D5\u05B9\u05EA \u05D4\u05B7\u05D9\u05BC\u05D5\u05B9\u05DD"], "Chatzot hayom": ["\u05D7\u05B2\u05E6\u05D5\u05B9\u05EA \u05D4\u05B7\u05D9\u05BC\u05D5\u05B9\u05DD"], "Mincha Gedolah": ["\u05DE\u05B4\u05E0\u05B0\u05D7\u05B8\u05D4 \u05D2\u05B0\u05BC\u05D3\u05D5\u05B9\u05DC\u05B8\u05D4"], "Mincha Ketanah": ["\u05DE\u05B4\u05E0\u05B0\u05D7\u05B8\u05D4 \u05E7\u05B0\u05D8\u05B7\u05E0\u05B8\u05BC\u05D4"], "Plag HaMincha": ["\u05E4\u05B0\u05BC\u05DC\u05B7\u05D2 \u05D4\u05B7\u05DE\u05B4\u05BC\u05E0\u05B0\u05D7\u05B8\u05D4"], "Sunset": ["\u05E9\u05B0\u05C1\u05E7\u05B4\u05D9\u05E2\u05B7\u05EA \u05D4\u05B7\u05D7\u05B7\u05DE\u05B8\u05BC\u05D4"], "Bein HaShemashot": ["\u05D1\u05B5\u05BC\u05D9\u05DF \u05D4\u05B7\u05E9\u05B0\u05BC\u05C1\u05DE\u05B8\u05E9\u05C1\u05D5\u05B9\u05EA"], "Tzeit HaKochavim": ["\u05E6\u05B5\u05D0\u05EA \u05D4\u05B7\u05DB\u05BC\u05D5\u05B9\u05DB\u05B8\u05D1\u05B4\u05D9\u05DD"], "Biur Chametz": ["\u05D1\u05B4\u05BC\u05E2\u05D5\u05BC\u05E8 \u05D7\u05B8\u05DE\u05B5\u05E5"], "Finish eating chametz": ["\u05E1\u05D5\u05B9\u05E3 \u05D6\u05B0\u05DE\u05B7\u05DF \u05D0\u05B2\u05DB\u05B4\u05D9\u05DC\u05B7\u05EA \u05D7\u05B8\u05DE\u05B5\u05E5"], "Swords of Iron War Memorial Day": ["\u05D9\u05D5\u05B9\u05DD \u05D4\u05B7\u05D6\u05B4\u05BC\u05DB\u05B8\u05BC\u05E8\u05D5\u05B9\u05DF \u05DC\u05B0\u05D7\u05B7\u05DC\u05B0\u05DC\u05B5\u05D9 \u05DE\u05B4\u05DC\u05B0\u05D7\u05B6\u05DE\u05B6\u05EA \u05D7\u05B7\u05E8\u05B0\u05D1\u05D5\u05B9\u05EA \u05D1\u05B7\u05BC\u05E8\u05B0\u05D6\u05B6\u05DC"], "Latest Kiddush Levana": ["\u05E1\u05D5\u05B9\u05E3 \u05D6\u05B0\u05DE\u05B7\u05DF \u05E7\u05B4\u05D3\u05BC\u05D5\u05BC\u05E9\u05C1 \u05DC\u05B0\u05D1\u05B8\u05E0\u05B8\u05D4"] } } };

// node_modules/@hebcal/core/dist/esm/he-x-NoNikud.po.js
var noNikudOverride = { "headers": { "plural-forms": "nplurals=2; plural=(n != 1);", "language": "he-x-NoNikud" }, "contexts": { "": { "Korach": ["\u05E7\u05D5\u05E8\u05D7"], "Chukat": ["\u05D7\u05D5\u05E7\u05EA"], "Erev Yom Kippur": ["\u05E2\u05E8\u05D1 \u05D9\u05D5\u05DD \u05DB\u05D9\u05E4\u05D5\u05E8"], "Yom Kippur": ["\u05D9\u05D5\u05DD \u05DB\u05D9\u05E4\u05D5\u05E8"], "Yom Kippur Katan": ["\u05D9\u05D5\u05DD \u05DB\u05D9\u05E4\u05D5\u05E8 \u05E7\u05D8\u05DF"], "Pesach Shabbat Chol ha-Moed": ["\u05E9\u05D1\u05EA \u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E4\u05E1\u05D7"], "Sukkot Shabbat Chol ha-Moed": ["\u05E9\u05D1\u05EA \u05D7\u05D5\u05DC \u05D4\u05DE\u05D5\u05E2\u05D3 \u05E1\u05D5\u05DB\u05D5\u05EA"], "Erev Sukkot": ["\u05E2\u05E8\u05D1 \u05E1\u05D5\u05DB\u05D5\u05EA"], "Sukkot": ["\u05E1\u05D5\u05DB\u05D5\u05EA"], "Sukkot I": ["\u05E1\u05D5\u05DB\u05D5\u05EA \u05D0\u05F3"], "Sukkot II": ["\u05E1\u05D5\u05DB\u05D5\u05EA \u05D1\u05F3"], "Sukkot II (CH''M)": ["\u05E1\u05D5\u05DB\u05D5\u05EA \u05D1\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Sukkot III (CH''M)": ["\u05E1\u05D5\u05DB\u05D5\u05EA \u05D2\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Sukkot IV (CH''M)": ["\u05E1\u05D5\u05DB\u05D5\u05EA \u05D3\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Sukkot V (CH''M)": ["\u05E1\u05D5\u05DB\u05D5\u05EA \u05D4\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Sukkot VI (CH''M)": ["\u05E1\u05D5\u05DB\u05D5\u05EA \u05D5\u05F3 (\u05D7\u05D5\u05D4\u05F4\u05DE)"], "Sukkot VII (Hoshana Raba)": ["\u05E1\u05D5\u05DB\u05D5\u05EA \u05D6\u05F3 (\u05D4\u05D5\u05E9\u05E2\u05E0\u05D0 \u05E8\u05D1\u05D4)"], "Swords of Iron War Memorial Day": ["\u05D9\u05D5\u05DD \u05D4\u05D6\u05D9\u05DB\u05E8\u05D5\u05DF \u05DC\u05D7\u05DC\u05DC\u05D9 \u05DE\u05DC\u05D7\u05DE\u05EA \u05D7\u05E8\u05D1\u05D5\u05EA \u05D1\u05E8\u05D6\u05DC"], "Latest Kiddush Levana": ["\u05E1\u05D5\u05E3 \u05D6\u05DE\u05DF \u05E7\u05D9\u05D3\u05D5\u05E9 \u05DC\u05D1\u05E0\u05D4"] } } };

// node_modules/@hebcal/core/dist/esm/locale.js
Locale.addTranslations("he", poHe);
Locale.addTranslations("ashkenazi", poAshkenazi);
var poHeNoNikud2 = Locale.copyLocaleNoNikud(poHe);
Locale.addTranslations("he-x-NoNikud", poHeNoNikud2);
Locale.addTranslations("he-x-NoNikud", noNikudOverride);

// node_modules/@hebcal/core/dist/esm/event.js
var flags = {
  /** Chag, yontiff, yom tov */
  CHAG: 1,
  /** Light candles before sundown */
  LIGHT_CANDLES: 2,
  /** End of holiday (end of Yom Tov)  */
  YOM_TOV_ENDS: 4,
  /** Observed only in the Diaspora (chutz l'aretz)  */
  CHUL_ONLY: 8,
  /** Observed only in Israel */
  IL_ONLY: 16,
  /** Light candles in the evening at Tzeit time (3 small stars) */
  LIGHT_CANDLES_TZEIS: 32,
  /** Candle-lighting for Chanukah */
  CHANUKAH_CANDLES: 64,
  /** Rosh Chodesh, beginning of a new Hebrew month */
  ROSH_CHODESH: 128,
  /** Minor fasts like Tzom Tammuz, Ta'anit Esther, ... */
  MINOR_FAST: 256,
  /** Shabbat Shekalim, Zachor, ... */
  SPECIAL_SHABBAT: 512,
  /** Weekly sedrot on Saturdays */
  PARSHA_HASHAVUA: 1024,
  /** Daily page of Talmud (Bavli) */
  DAF_YOMI: 2048,
  /** Days of the Omer */
  OMER_COUNT: 4096,
  /** Yom HaShoah, Yom HaAtzma'ut, ... */
  MODERN_HOLIDAY: 8192,
  /** Yom Kippur and Tish'a B'Av */
  MAJOR_FAST: 16384,
  /** On the Saturday before Rosh Chodesh */
  SHABBAT_MEVARCHIM: 32768,
  /** Molad */
  MOLAD: 65536,
  /** Yahrzeit or Hebrew Anniversary */
  USER_EVENT: 131072,
  /** Daily Hebrew date ("11th of Sivan, 5780") */
  HEBREW_DATE: 262144,
  /** A holiday that's not major, modern, rosh chodesh, or a fast day */
  MINOR_HOLIDAY: 524288,
  /** Evening before a major or minor holiday */
  EREV: 1048576,
  /** Chol haMoed, intermediate days of Pesach or Sukkot */
  CHOL_HAMOED: 2097152,
  /** Mishna Yomi */
  MISHNA_YOMI: 4194304,
  /** Yom Kippur Katan, minor day of atonement on the day preceeding each Rosh Chodesh */
  YOM_KIPPUR_KATAN: 8388608,
  /** Daily page of Jerusalem Talmud (Yerushalmi) */
  YERUSHALMI_YOMI: 16777216,
  /** Nach Yomi */
  NACH_YOMI: 33554432,
  /** Daily Learning */
  DAILY_LEARNING: 67108864,
  /** Yizkor */
  YIZKOR: 134217728,
  /** BeHaB fast days on Monday, Thursday and Monday after Pesach and Sukkot */
  BEHAB: 268435456,
  /** Latest time for Kiddush Levana (Sanctification of the Moon) */
  KIDDUSH_LEVANA: 536870912
};
var flagEntries = Object.entries(flags);
function flagBit(name) {
  if (!Object.hasOwn(flags, name)) {
    throw new RangeError(`Unknown flag name: ${String(name)}`);
  }
  return flags[name];
}
var flagToCategory = [
  [flags.MAJOR_FAST, "holiday", "major", "fast"],
  [flags.CHANUKAH_CANDLES, "holiday", "minor"],
  [flags.HEBREW_DATE, "hebdate"],
  [flags.MINOR_FAST, "holiday", "fast"],
  [flags.MINOR_HOLIDAY, "holiday", "minor"],
  [flags.MODERN_HOLIDAY, "holiday", "modern"],
  [flags.MOLAD, "molad"],
  [flags.OMER_COUNT, "omer"],
  [flags.PARSHA_HASHAVUA, "parashat"],
  // backwards-compat
  [flags.ROSH_CHODESH, "roshchodesh"],
  [flags.SHABBAT_MEVARCHIM, "mevarchim"],
  [flags.SPECIAL_SHABBAT, "holiday", "shabbat"],
  [flags.USER_EVENT, "user"],
  [flags.YIZKOR, "yizkor"]
];
var Event = class {
  /** Hebrew date of this event */
  date;
  /**
   * Untranslated title of this event. Note that these description
   * strings are always in English and will remain stable across releases.
   * To get the title of the event in another language, use the
   * `render()` method.
   */
  desc;
  /** Bitmask of optional event flags. See {@link flags} */
  mask;
  /** Optional emoji character such as ✡️, 🕯️, 🕎, 🕍, 🌒 */
  emoji;
  /** Optional longer description or memo text */
  memo;
  /** Alarms are used by iCalendar feeds */
  alarm;
  /**
   * Constructs Event
   * @param date Hebrew date event occurs
   * @param desc Description (not translated)
   * @param [mask=0] optional bitmask of holiday flags (see {@link flags})
   * @param [attrs={}] optional additional attributes (e.g. `eventTimeStr`, `cholHaMoedDay`)
   */
  constructor(date, desc, mask = 0, attrs) {
    if (!HDate.isHDate(date)) {
      throw new TypeError(`Invalid Event date: ${date}`);
    }
    if (typeof desc !== "string") {
      throw new TypeError(`Invalid Event description: ${desc}`);
    }
    this.date = date;
    this.desc = desc;
    this.mask = +mask;
    if (typeof attrs === "object" && attrs !== null) {
      Object.assign(this, attrs);
    }
  }
  /**
   * Hebrew date of this event
   */
  getDate() {
    return this.date;
  }
  /**
   * Gregorian date of this event
   */
  greg() {
    return this.date.greg();
  }
  /**
   * Untranslated title of this event. Note that these description
   * strings are always in English and will remain stable across releases.
   * To get the title of the event in another language, use the
   * `render()` method.
   */
  getDesc() {
    return this.desc;
  }
  /**
   * Bitmask of optional event flags. See {@link flags}
   * @deprecated Use {@link Event.hasFlag} to test for a flag, or
   * {@link Event.flagNames} to list them. Code that genuinely needs the
   * raw bitmask can read {@link Event.mask}.
   */
  getFlags() {
    return this.mask;
  }
  /**
   * Does this event have the given flag?
   *
   * A readable alternative to testing the bitmask with `&`.
   * @example
   * import {Event, HDate, flags} from '@hebcal/core';
   * const ev = new Event(new HDate(7, 'Sivan', 5749), 'Shavuot II',
   *   flags.CHAG | flags.CHUL_ONLY);
   * ev.hasFlag('CHAG');        // true
   * ev.hasFlag('CHUL_ONLY');   // true
   * ev.hasFlag('MINOR_FAST');  // false
   * @param name flag name, one of the keys of {@link flags}
   * @throws {RangeError} if `name` is not a key of {@link flags}
   */
  hasFlag(name) {
    return (this.mask & flagBit(name)) !== 0;
  }
  /**
   * Does this event have at least one of the given flags?
   *
   * Returns `false` when called with no arguments.
   * @example
   * import {Event, HDate, flags} from '@hebcal/core';
   * const ev = new Event(new HDate(10, 'Tishrei', 5784), 'Yom Kippur',
   *   flags.CHAG | flags.MAJOR_FAST);
   * ev.hasAnyFlag('MAJOR_FAST', 'MINOR_FAST');  // true
   * ev.hasAnyFlag('ROSH_CHODESH', 'MINOR_FAST'); // false
   * @param names flag names, each one of the keys of {@link flags}
   * @throws {RangeError} if any name is not a key of {@link flags}
   */
  hasAnyFlag(...names) {
    let bits = 0;
    for (const name of names) {
      bits |= flagBit(name);
    }
    return (this.mask & bits) !== 0;
  }
  /**
   * Names of all {@link flags} set on this event, in ascending bit order.
   * Returns an empty array for an event with no flags.
   * @example
   * import {Event, HDate, flags} from '@hebcal/core';
   * const ev = new Event(new HDate(7, 'Sivan', 5749), 'Shavuot II',
   *   flags.CHAG | flags.CHUL_ONLY);
   * ev.flagNames(); // ['CHAG', 'CHUL_ONLY']
   */
  flagNames() {
    return flagEntries.filter(([, bit]) => this.mask & bit).map(([name]) => name);
  }
  /**
   * Returns (translated) description of this event
   * @example
   * const ev = new Event(new HDate(6, 'Sivan', 5749), 'Shavuot', flags.CHAG);
   * ev.render('en'); // 'Shavuot'
   * ev.render('he'); // 'שָׁבוּעוֹת'
   * ev.render('ashkenazi'); // 'Shavuos'
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  render(locale) {
    return Locale.gettext(this.desc, locale);
  }
  /**
   * Returns a brief (translated) description of this event.
   *
   * For most events this is the same as {@link render}. Some subclasses
   * (e.g. {@link CandleLightingEvent}, {@link HavdalahEvent},
   * {@link OmerEvent}) produce shorter text without an attached time or
   * extra qualifier — useful for compact UI display.
   * @example
   * import {CandleLightingEvent} from '@hebcal/core';
   * // For a regular Event, renderBrief() == render():
   * const ev = new Event(new HDate(6, 'Sivan', 5749), 'Shavuot', flags.CHAG);
   * ev.renderBrief('en'); // 'Shavuot'
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  renderBrief(locale) {
    return this.render(locale);
  }
  /**
   * Returns the event's emoji character (e.g. `🕯️`, `🕎`, `🇮🇱`, `🍏🍯`),
   * or `null` if no emoji is associated with this event.
   * Subclasses override this to provide holiday-specific emoji.
   */
  getEmoji() {
    return this.emoji || null;
  }
  /**
   * Returns a simplified (untranslated) description for this event, suitable
   * for grouping related events under a single name.
   *
   * For example, {@link HolidayEvent} strips qualifiers so that
   * `"Erev Pesach"` → `"Pesach"` and `"Sukkot III (CH''M)"` → `"Sukkot"`.
   * For many events the basename and the event description are identical.
   * @example
   * import {HolidayEvent, HDate, months, flags} from '@hebcal/core';
   * const ev = new HolidayEvent(
   *   new HDate(14, months.NISAN, 5784), 'Erev Pesach', flags.EREV);
   * ev.getDesc();    // 'Erev Pesach'
   * ev.basename();   // 'Pesach'
   */
  basename() {
    return this.getDesc();
  }
  /**
   * Returns a URL to hebcal.com or sefaria.org for more detail on the event,
   * or `undefined` for events with no detail page.
   *
   * Subclasses such as {@link HolidayEvent}, {@link ChanukahEvent},
   * {@link AsaraBTevetEvent}, {@link ParshaEvent}, and {@link OmerEvent}
   * override this with their own URL patterns.
   */
  url() {
    return void 0;
  }
  /**
   * Is this event observed in Israel?
   * @example
   * const ev1 = new Event(new HDate(7, 'Sivan', 5749), 'Shavuot II', flags.CHAG | flags.CHUL_ONLY);
   * ev1.observedInIsrael(); // false
   * const ev2 = new Event(new HDate(26, 'Kislev', 5749), 'Chanukah: 3 Candles', 0);
   * ev2.observedInIsrael(); // true
   */
  observedInIsrael() {
    return !this.hasFlag("CHUL_ONLY");
  }
  /**
   * Is this event observed in the Diaspora?
   * @example
   * const ev1 = new Event(new HDate(7, 'Sivan', 5749), 'Shavuot II', flags.CHAG | flags.CHUL_ONLY);
   * ev1.observedInDiaspora(); // true
   * const ev2 = new Event(new HDate(26, 'Kislev', 5749), 'Chanukah: 3 Candles', 0);
   * ev2.observedInDiaspora(); // true
   */
  observedInDiaspora() {
    return !this.hasFlag("IL_ONLY");
  }
  /**
   * Is this event observed in Israel/Diaspora?
   * @example
   * const ev1 = new Event(new HDate(7, 'Sivan', 5749), 'Shavuot II', flags.CHAG | flags.CHUL_ONLY);
   * ev1.observedIn(false); // true
   * ev1.observedIn(true); // false
   * const ev2 = new Event(new HDate(26, 'Kislev', 5749), 'Chanukah: 3 Candles', 0);
   * ev2.observedIn(false); // true
   * ev2.observedIn(true); // true
   * @param il
   */
  observedIn(il) {
    return il ? this.observedInIsrael() : this.observedInDiaspora();
  }
  /**
   * Returns an array of category strings classifying this event, derived
   * from its {@link flags} bitmask. The first element is the broad category
   * (e.g. `'holiday'`, `'roshchodesh'`, `'parashat'`, `'omer'`), followed
   * by zero or more refinements (e.g. `'major'`, `'minor'`, `'fast'`).
   *
   * Returns `['unknown']` if no flag maps to a known category.
   * @example
   * import {Event, HDate, flags} from '@hebcal/core';
   * new Event(new HDate(10, 'Tishrei', 5784), 'Yom Kippur', flags.MAJOR_FAST)
   *   .getCategories(); // ['holiday', 'major', 'fast']
   * new Event(new HDate(1, 'Shvat', 5784), 'Rosh Chodesh Sh\'vat', flags.ROSH_CHODESH)
   *   .getCategories(); // ['roshchodesh']
   */
  getCategories() {
    for (const [bit, ...categories] of flagToCategory) {
      if (this.mask & bit) {
        return categories;
      }
    }
    return ["unknown"];
  }
};

// node_modules/@hebcal/core/dist/esm/HebrewDateEvent.js
var HebrewDateEvent = class extends Event {
  /**
   * @param date
   */
  constructor(date) {
    super(date, date.toString(), flags.HEBREW_DATE);
  }
  /**
   * @param [locale] Optional locale name (defaults to empty locale)
   * @example
   * import {HDate, HebrewDateEvent, months} from '@hebcal/core';
   *
   * const hd = new HDate(15, months.CHESHVAN, 5769);
   * const ev = new HebrewDateEvent(hd);
   * console.log(ev.render('en')); // '15th of Cheshvan, 5769'
   * console.log(ev.render('he')); // 'ט״ו חֶשְׁוָן תשס״ט'
   */
  render(locale) {
    const locale1 = locale?.toLowerCase();
    const locale0 = locale1 ?? "en";
    const hd = this.getDate();
    switch (locale0) {
      case "h":
      case "he":
        return hd.renderGematriya(false);
      case "he-x-nonikud":
        return hd.renderGematriya(true);
      default:
        return hd.render(locale0, true);
    }
  }
  renderBriefHebrew(locale) {
    const hd = this.getDate();
    const dd = hd.getDate();
    const mm = Locale.gettext(hd.getMonthName(), locale);
    return `${gematriya(dd)} ${mm}`;
  }
  /**
   * @param [locale] Optional locale name (defaults to empty locale)
   * @example
   * import {HDate, HebrewDateEvent, months} from '@hebcal/core';
   *
   * const hd = new HDate(15, months.CHESHVAN, 5769);
   * const ev = new HebrewDateEvent(hd);
   * console.log(ev.renderBrief()); // '15th of Cheshvan'
   * console.log(ev.renderBrief('he')); // 'ט״ו חֶשְׁוָן'
   */
  renderBrief(locale) {
    const locale1 = locale?.toLowerCase();
    const locale0 = locale1 ?? "en";
    const hd = this.getDate();
    if (hd.getMonth() === months.TISHREI && hd.getDate() === 1) {
      return this.render(locale0);
    }
    switch (locale0) {
      case "h":
      case "he":
      case "he-x-nonikud":
        return this.renderBriefHebrew(locale0);
      default:
        return hd.render(locale0, false);
    }
  }
};

// node_modules/temporal-utils/dist/errorMessages.js
var expectedPositive = (entityName, num) => `Non-positive ${entityName}: ${num}`;
var expectedFinite = (entityName, num) => `Non-finite ${entityName}: ${num}`;
var forbiddenBigIntToNumber = (entityName) => `Cannot convert bigint to ${entityName}`;
var invalidObject = "Invalid object";
var numberOutOfRange = (entityName, val, min, max) => invalidEntity(entityName, val) + `; must be between ${min}-${max}`;
var invalidEntity = (fieldName, val) => `Invalid ${fieldName}: ${val}`;

// node_modules/temporal-utils/dist/utils.js
var nanoInMicro = 1e3;
var nanoInMilli = 1e6;
var nanoInSec = 1e9;
var nanoInMinute = 6e10;
var nanoInHour = 36e11;
function normalizeOptions(options) {
  if (options === void 0) {
    return /* @__PURE__ */ Object.create(null);
  }
  return requireObjectLike(options);
}
function toFiniteNumber(arg, entityName = "number") {
  if (typeof arg === "bigint") {
    throw new TypeError(forbiddenBigIntToNumber(entityName));
  }
  arg = Number(arg);
  if (!Number.isFinite(arg)) {
    throw new RangeError(expectedFinite(entityName, arg));
  }
  return arg;
}
function toIntegerWithTrunc(arg, entityName) {
  return Math.trunc(toFiniteNumber(arg, entityName)) || 0;
}
function toPositiveIntegerWithTruncation(arg, entityName) {
  return requireNumberIsPositive(toIntegerWithTrunc(arg, entityName), entityName);
}
function requireNumberIsPositive(num, entityName = "number") {
  if (num <= 0) {
    throw new RangeError(expectedPositive(entityName, num));
  }
  return num;
}
function constrainToRange(num, min, max) {
  return Math.min(Math.max(num, min), max);
}
function isObjectLike(arg) {
  return arg !== null && (typeof arg === "object" || typeof arg === "function");
}
function requireObjectLike(arg) {
  if (!isObjectLike(arg)) {
    throw new TypeError(invalidObject);
  }
  return arg;
}

// node_modules/temporal-polyfill/chunks/internal.js
var invalidEntity2 = invalidEntity;
var missingField = (fieldName) => `Missing ${fieldName}`;
var invalidBag = "Invalid bag";
var invalidChoice = (fieldName, val, choiceMap) => invalidEntity(fieldName, val) + "; must be " + Object.keys(choiceMap).join();
var forbiddenValueOf = "Cannot use valueOf";
var invalidCallingContext = "Invalid calling context";
var missingYear = (allowEra) => "Missing year" + (allowEra ? "/era/eraYear" : "");
var invalidLeapMonth = "Invalid leap month";
var invalidCalendar = (calendarId) => invalidEntity("Calendar", calendarId);
var exoticCalendarRequired = (calendarId, remedy) => `Unknown calendar ${calendarId}; might need ${remedy}`;
var invalidTimeZone = (calendarId) => invalidEntity("TimeZone", calendarId);
var outOfBoundsDate = "Out-of-bounds date";
var failedParse = (s) => `Cannot parse: ${s}`;
var invalidFormatType = (branding) => `Cannot format ${branding}`;
var mismatchingFormatTypes = "Mismatching types for formatting";
var constrainToRange2 = constrainToRange;
var isObjectLike2 = isObjectLike;
function throwRangeError(message) {
  throw new RangeError(message);
}
function throwTypeError(message) {
  throw new TypeError(message);
}
function clampProp(props, propName, min, max, overflow) {
  return clampEntity(propName, ((props2, propName2) => {
    const propVal = props2[propName2];
    return void 0 === propVal && throwTypeError(missingField(propName2)), propVal;
  })(props, propName), min, max, overflow);
}
function clampEntity(entityName, num, min, max, overflow, choices) {
  const clamped = constrainToRange2(num, min, max);
  return overflow && num !== clamped && throwRangeError(((entityName2, val, min2, max2, choices2) => choices2 ? numberOutOfRange(entityName2, choices2[val], choices2[min2], choices2[max2]) : numberOutOfRange(entityName2, val, min2, max2))(entityName, num, min, max, choices)), clamped;
}
function memoize(generator, MapClass = Map, maxSize = 1e4) {
  const map = new MapClass();
  return (key, ...otherArgs) => {
    if (map.has(key)) {
      return map.get(key);
    }
    map.size >= maxSize && map.clear();
    const val = generator(key, ...otherArgs);
    return map.set(key, val), val;
  };
}
var createNameDescriptors = (name) => createPropDescriptors({
  name
}, 1);
var createPropDescriptors = (propVals, readonly) => mapProps((value) => ({
  value,
  configurable: 1,
  writable: !readonly
}), propVals);
var createStringTagDescriptors = (value) => ({
  [Symbol.toStringTag]: {
    value,
    configurable: 1
  }
});
function mapProps(transformer, props) {
  const res = {};
  for (const propName in props) {
    res[propName] = transformer(props[propName], propName);
  }
  return res;
}
function zipPropsConst(propNames, propVal) {
  const res = {};
  for (const propName of propNames) {
    res[propName] = propVal;
  }
  return res;
}
function createPropGetters(propNames) {
  const getters = {};
  for (const propName of propNames) {
    getters[propName] = (slots) => slots[propName];
  }
  return getters;
}
function pluckProps(propNames, props, dest = /* @__PURE__ */ Object.create(null)) {
  for (const propName of propNames) {
    dest[propName] = props[propName];
  }
  return dest;
}
function allPropsEqual(propNames, props0, props1) {
  for (const propName of propNames) {
    if (props0[propName] !== props1[propName]) {
      return 0;
    }
  }
  return 1;
}
function zeroOutProps(propNames, clearUntilI, props) {
  const copy = {
    ...props
  };
  for (let i = 0; i < clearUntilI; i++) {
    copy[propNames[i]] = 0;
  }
  return copy;
}
function bindArgs(f, ...boundArgs) {
  return (...dynamicArgs) => f(...boundArgs, ...dynamicArgs);
}
function identity(arg) {
  return arg;
}
function noop() {
}
function capitalize(s) {
  return s[0].toUpperCase() + s.substring(1);
}
function sortStrings(...strss) {
  return [].concat(...strss).sort();
}
function createRegExp(meat) {
  return new RegExp(`^${meat}$`);
}
function parseSubsecNano(fracStr) {
  return parseInt(fracStr.padEnd(9, "0"));
}
function parseInt0(s) {
  return void 0 === s ? 0 : parseInt(s);
}
function padNumber(digits, num) {
  return String(num).padStart(digits, "0");
}
var padNumber2 = /* @__PURE__ */ bindArgs(padNumber, 2);
function compareNumbers(a, b) {
  return Math.sign(a - b);
}
function compareBigInts(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function divFloorBigInt(num, denom) {
  const whole = num / denom;
  return num % denom < 0n ? whole - 1n : whole;
}
function divModFloorBigInt(num, divisor) {
  const quotient2 = divFloorBigInt(num, divisor);
  return [quotient2, num - quotient2 * divisor];
}
function divModFloor(num, divisor) {
  return [Math.floor(num / divisor), modFloor(num, divisor)];
}
function modFloor(num, divisor) {
  return (num % divisor + divisor) % divisor;
}
function divTrunc(num, divisor) {
  return Math.trunc(num / divisor) || 0;
}
function modTrunc(num, divisor) {
  return num % divisor || 0;
}
function fabricateNearHalfFraction(halfCompare, sign = 1) {
  return sign * (0.5 + halfCompare / 5);
}
function hasHalf(num) {
  return 0.5 === Math.abs(num % 1);
}
var isoCalendarId = "iso8601";
var gregoryCalendarId = "gregory";
var gregoryEraOrigins = {
  "bce": -1,
  "ce": 0
};
function normalizeEraName(era) {
  const normalized = era.normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "");
  return "bc" === normalized || "b" === normalized ? "bce" : "ad" === normalized || "a" === normalized ? "ce" : normalized;
}
var isoCalendarImpl = void 0;
var gregoryCalendarImpl = 0;
function getCalendarSlotId(calendar2) {
  return calendar2 === isoCalendarImpl ? "iso8601" : 0 === calendar2 ? "gregory" : calendar2.id;
}
var monthCodeRegExp = /^M(\d{2})(L?)$/;
function parseMonthCode(monthCode) {
  const m = monthCodeRegExp.exec(monthCode);
  return m || throwRangeError(((monthCode2) => `Invalid monthCode: ${monthCode2}`)(monthCode)), [parseInt(m[1]), Boolean(m[2])];
}
function formatMonthCode(monthCodeNumber, isLeapMonth) {
  return "M" + padNumber2(monthCodeNumber) + (isLeapMonth ? "L" : "");
}
function monthCodeNumberToMonth(monthCodeNumber, isLeapMonth, leapMonth) {
  return monthCodeNumber + (isLeapMonth || leapMonth && monthCodeNumber >= leapMonth ? 1 : 0);
}
var unitNameMap = {
  nanosecond: 0,
  microsecond: 1,
  millisecond: 2,
  second: 3,
  minute: 4,
  hour: 5,
  day: 6,
  week: 7,
  month: 8,
  year: 9
};
var unitNamesAsc = /* @__PURE__ */ Object.keys(unitNameMap);
var nanoInMicro2 = nanoInMicro;
var nanoInMilli2 = nanoInMilli;
var nanoInSec2 = nanoInSec;
var nanoInMinute2 = nanoInMinute;
var nanoInHour2 = nanoInHour;
var nanoInUtcDay = 864e11;
var unitNanoMap = [1, nanoInMicro2, nanoInMilli2, nanoInSec2, nanoInMinute2, nanoInHour2, nanoInUtcDay];
var bigNanoInMicro = /* @__PURE__ */ BigInt(nanoInMicro2);
var bigNanoInMilli = /* @__PURE__ */ BigInt(nanoInMilli2);
var bigNanoInSec = /* @__PURE__ */ BigInt(nanoInSec2);
var bigNanoInMinute = /* @__PURE__ */ BigInt(nanoInMinute2);
var bigNanoInHour = /* @__PURE__ */ BigInt(nanoInHour2);
var bigNanoInUtcDay = /* @__PURE__ */ BigInt(nanoInUtcDay);
function divideBigNanoToExactNumber(bigNano, divisorNano) {
  const days = Number(bigNano / bigNanoInUtcDay);
  const timeNano = Number(bigNano % bigNanoInUtcDay);
  return days * (nanoInUtcDay / divisorNano) + (Math.trunc(timeNano / divisorNano) + timeNano % divisorNano / divisorNano);
}
var timeFieldNamesAsc = /* @__PURE__ */ unitNamesAsc.slice(0, 6);
var timeGetters = /* @__PURE__ */ createPropGetters(timeFieldNamesAsc);
var yearFieldNamesAsc = ["year"];
var dayFieldNamesAsc = ["day"];
var calendarDateFieldNamesAsc = ["day", "month", "year"];
var offsetFieldNames = ["offset"];
var timeZoneFieldNames = ["timeZone"];
var eraYearFieldNames = ["era", "eraYear"];
var allYearFieldNames = ["era", "eraYear", "year"];
var monthFieldNames = ["month", "monthCode"];
var monthDayFieldNames = ["day", "month", "monthCode"];
var timeFieldNamesAlpha = /* @__PURE__ */ sortStrings(timeFieldNamesAsc);
var yearFieldNamesWithEraAlpha = /* @__PURE__ */ sortStrings(eraYearFieldNames, yearFieldNamesAsc);
var yearMonthFieldNamesAlpha = /* @__PURE__ */ sortStrings(monthFieldNames, yearFieldNamesAsc);
var yearMonthFieldNamesWithEraAlpha = /* @__PURE__ */ sortStrings(eraYearFieldNames, yearMonthFieldNamesAlpha);
var yearMonthCodeFieldNamesAlpha = /* @__PURE__ */ sortStrings(["monthCode"], yearFieldNamesAsc);
var yearMonthCodeFieldNamesWithEraAlpha = /* @__PURE__ */ sortStrings(eraYearFieldNames, yearMonthCodeFieldNamesAlpha);
var monthCodeDayFieldNamesAlpha = /* @__PURE__ */ sortStrings(dayFieldNamesAsc, ["monthCode"]);
var dateFieldNamesAlpha = /* @__PURE__ */ sortStrings(dayFieldNamesAsc, yearMonthFieldNamesAlpha);
var dateFieldNamesWithEraAlpha = /* @__PURE__ */ sortStrings(dayFieldNamesAsc, eraYearFieldNames, yearMonthFieldNamesAlpha);
var dateTimeFieldNamesAlpha = /* @__PURE__ */ sortStrings(dateFieldNamesAlpha, timeFieldNamesAsc);
var dateTimeFieldNamesWithEraAlpha = /* @__PURE__ */ sortStrings(dateFieldNamesWithEraAlpha, timeFieldNamesAsc);
var dateTimeAndOffsetFieldNamesAlpha = /* @__PURE__ */ sortStrings(dateFieldNamesAlpha, timeFieldNamesAsc, offsetFieldNames);
var dateTimeAndOffsetFieldNamesWithEraAlpha = /* @__PURE__ */ sortStrings(dateFieldNamesWithEraAlpha, timeFieldNamesAsc, offsetFieldNames);
var dateTimeAndZoneFieldNamesAlpha = /* @__PURE__ */ sortStrings(dateFieldNamesAlpha, timeFieldNamesAsc, offsetFieldNames, timeZoneFieldNames);
var dateTimeAndZoneFieldNamesWithEraAlpha = /* @__PURE__ */ sortStrings(dateFieldNamesWithEraAlpha, timeFieldNamesAsc, offsetFieldNames, timeZoneFieldNames);
var yearMonthCodeDayFieldNamesAlpha = /* @__PURE__ */ sortStrings(dayFieldNamesAsc, yearMonthCodeFieldNamesAlpha);
var yearMonthCodeDayFieldNamesWithEraAlpha = /* @__PURE__ */ sortStrings(dayFieldNamesAsc, eraYearFieldNames, yearMonthCodeFieldNamesAlpha);
var timeFieldDefaults = /* @__PURE__ */ zipPropsConst(timeFieldNamesAsc, 0);
function validateTimeFields(timeFields) {
  return constrainTimeFields(timeFields, 1), timeFields;
}
var maxValues = {
  hour: 23,
  minute: 59,
  second: 59
};
function constrainTimeFields(timeFields, overflow) {
  const constrainedFields = {};
  for (const fieldName of timeFieldNamesAsc) {
    constrainedFields[fieldName] = clampEntity(fieldName, timeFields[fieldName], 0, maxValues[fieldName] || 999, overflow);
  }
  return constrainedFields;
}
function timeFieldsToNano(timeFields) {
  return timeFieldsToSec(timeFields) * nanoInSec2 + timeFieldsToSubsecNano(timeFields);
}
function timeFieldsToMilli(timeFields) {
  return 1e3 * timeFieldsToSec(timeFields) + timeFields.millisecond;
}
function timeFieldsToSec(timeFields) {
  return 3600 * timeFields.hour + 60 * timeFields.minute + timeFields.second;
}
function timeFieldsToSubsecNano(timeFields) {
  return timeFields.millisecond * nanoInMilli2 + timeFields.microsecond * nanoInMicro2 + timeFields.nanosecond;
}
function nanoToTimeAndDay(nano) {
  const [dayDelta, timeNano] = divModFloor(nano, nanoInUtcDay);
  return [nanoToTimeFields(timeNano), dayDelta];
}
function nanoToTimeFields(timeNano) {
  const [timeMilli, nanoAfterMilli] = divModFloor(timeNano, nanoInMilli2);
  const [microsecond, nanosecond] = divModFloor(nanoAfterMilli, nanoInMicro2);
  return milliToTimeFields(timeMilli, microsecond, nanosecond);
}
function milliToTimeFields(timeMilli, microsecond = 0, nanosecond = 0) {
  const [hour, milliAfterHour] = divModFloor(timeMilli, 36e5);
  const [minute, milliAfterMinute] = divModFloor(milliAfterHour, 6e4);
  const [second, millisecond] = divModFloor(milliAfterMinute, 1e3);
  return {
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  };
}
function epochNanoToSecMod(epochNano) {
  const [epochSec, nano] = divModFloorBigInt(epochNano, bigNanoInSec);
  return [Number(epochSec), Number(nano)];
}
function epochNanoToMilli(epochNano) {
  return Number(divFloorBigInt(epochNano, bigNanoInMilli));
}
function isoDateTimeToEpochNano(isoDateTime) {
  return isoDateToEpochNano(isoDateTime) + BigInt(timeFieldsToNano(isoDateTime));
}
function isoDateTimeToEpochMilli(isoDateTime) {
  return isoDateToEpochMilli(isoDateTime) + timeFieldsToMilli(isoDateTime);
}
function isoDateToEpochNano(isoDate) {
  return BigInt(isoDateToEpochDays(isoDate)) * bigNanoInUtcDay;
}
function isoDateToEpochMilli(isoDate) {
  return 864e5 * isoDateToEpochDays(isoDate);
}
function isoDateToEpochDays(isoDate) {
  return isoPartsToEpochDays(isoDate.year, isoDate.month, isoDate.day);
}
function isoPartsToEpochDays(isoYear, isoMonth = 1, isoDay = 1) {
  const monthIndex = isoMonth - 1;
  return isoYear += Math.floor(monthIndex / 12), isoMonth = modFloor(monthIndex, 12), Date.UTC(isoYear % 400 - 400, isoMonth, 0) / 864e5 + 146097 * (divTrunc(isoYear, 400) + 1) + isoDay;
}
function epochNanoToIsoDateTime(epochNano) {
  const [epochDays, nanoAfterDay] = divModFloorBigInt(epochNano, bigNanoInUtcDay);
  return {
    ...epochDaysToIsoDate(Number(epochDays)),
    ...nanoToTimeFields(Number(nanoAfterDay))
  };
}
function epochDaysToIsoDate(epochDays) {
  const legacyDate = new Date(864e5 * modFloor(epochDays, 146097));
  return {
    year: legacyDate.getUTCFullYear() + 400 * Math.floor(epochDays / 146097),
    month: legacyDate.getUTCMonth() + 1,
    day: legacyDate.getUTCDate()
  };
}
var isoEpochFirstLeapYear = 1972;
function computeIsoMonthCodeParts(month) {
  return [month, 0];
}
function computeIsoYearMonthFieldsForMonthDay(monthCodeNumber, isLeapMonth) {
  if (!isLeapMonth) {
    return {
      year: 1972,
      month: monthCodeNumber
    };
  }
}
function computeIsoFieldsFromParts(year, month, day) {
  return {
    year,
    month,
    day
  };
}
function computeIsoDaysInMonth(year, month) {
  switch (month) {
    case 2:
      return computeIsoInLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
  }
  return 31;
}
function computeIsoDaysInYear(year) {
  return computeIsoInLeapYear(year) ? 366 : 365;
}
function computeIsoInLeapYear(year) {
  return year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
}
function addIsoMonths(year, month, monthDelta) {
  return year += divTrunc(monthDelta, 12), (month += modTrunc(monthDelta, 12)) < 1 ? (year--, month += 12) : month > 12 && (year++, month -= 12), {
    year,
    month
  };
}
function diffIsoMonthSlots(year0, month0, year1, month1) {
  return 12 * (year1 - year0) + month1 - month0;
}
function computeIsoDayOfWeek(isoDate) {
  return modFloor(isoPartsToEpochDays(isoDate.year, isoDate.month, isoDate.day) + 4, 7) || 7;
}
function computeIsoDayOfYear(isoDate) {
  return isoPartsToEpochDays(isoDate.year, isoDate.month, isoDate.day) - isoPartsToEpochDays(isoDate.year) + 1;
}
function computeIsoWeekFields(isoDate) {
  let yearOfWeek = isoDate.year;
  let weekOfYear = Math.floor((computeIsoDayOfYear(isoDate) - computeIsoDayOfWeek(isoDate) + 10) / 7);
  let weeksInYear = computeIsoWeeksInYear(yearOfWeek);
  return weekOfYear < 1 ? weekOfYear = weeksInYear = computeIsoWeeksInYear(--yearOfWeek) : weekOfYear > weeksInYear && (weekOfYear = 1, weeksInYear = computeIsoWeeksInYear(++yearOfWeek)), {
    weekOfYear,
    yearOfWeek,
    De: weeksInYear
  };
}
function computeIsoWeeksInYear(year) {
  const y0DayOfWeek = computeIsoDayOfWeek({
    year,
    month: 1,
    day: 1
  });
  return 4 === y0DayOfWeek || 3 === y0DayOfWeek && computeIsoInLeapYear(year) ? 53 : 52;
}
function computeGregoryEraFields({ year }) {
  return year < 1 ? {
    era: "bce",
    eraYear: 1 - year
  } : {
    era: "ce",
    eraYear: year
  };
}
function validateIsoDateTimeFields(isoDateTime) {
  return validateIsoDateFields(isoDateTime), validateTimeFields(isoDateTime);
}
function validateIsoDateFields(isoInternals) {
  return constrainIsoDateFields(isoInternals, 1), isoInternals;
}
function constrainIsoDateFields(isoDate, overflow) {
  const { year } = isoDate;
  const month = clampProp(isoDate, "month", 1, 12, overflow);
  return {
    year,
    month,
    day: clampProp(isoDate, "day", 1, computeIsoDaysInMonth(year, month), overflow)
  };
}
function computeCalendarDateFields(calendar2, isoDate) {
  return calendar2 ? calendar2.de(isoDate) : isoDate;
}
function computeCalendarMonthCodeParts(calendar2, year, month) {
  return calendar2 ? calendar2.L(year, month) : computeIsoMonthCodeParts(month);
}
function computeCalendarEraFields(calendar2, isoDate) {
  return 0 === calendar2 ? computeGregoryEraFields(isoDate) : calendar2 && calendar2.h?.(isoDate) || {};
}
function computeCalendarIsoFieldsFromParts(calendar2, year, month, day) {
  return calendar2 ? calendar2.fe(year, month, day) : computeIsoFieldsFromParts(year, month, day);
}
function computeCalendarMonthsInYearForYear(calendar2, year) {
  return calendar2 ? calendar2.j(year) : 12;
}
function computeCalendarDaysInMonthForYearMonth(calendar2, year, month) {
  return calendar2 ? calendar2.o(year, month) : computeIsoDaysInMonth(year, month);
}
function computeCalendarMonthCode(calendar2, isoDate) {
  const { year, month } = computeCalendarDateFields(calendar2, isoDate);
  const [monthCodeNumber, isLeapMonth] = computeCalendarMonthCodeParts(calendar2, year, month);
  return formatMonthCode(monthCodeNumber, isLeapMonth);
}
function computeCalendarInLeapYear(calendar2, isoDate) {
  const { year } = computeCalendarDateFields(calendar2, isoDate);
  return calendar2 ? calendar2.q(year) : computeIsoInLeapYear(year);
}
function computeCalendarMonthsInYear(calendar2, isoDate) {
  const { year } = computeCalendarDateFields(calendar2, isoDate);
  return computeCalendarMonthsInYearForYear(calendar2, year);
}
function computeCalendarDaysInMonth(calendar2, isoDate) {
  const { year, month } = computeCalendarDateFields(calendar2, isoDate);
  return computeCalendarDaysInMonthForYearMonth(calendar2, year, month);
}
function computeCalendarDaysInYear(calendar2, isoDate) {
  const { year } = computeCalendarDateFields(calendar2, isoDate);
  return calendar2 ? calendar2.i(year) : computeIsoDaysInYear(year);
}
function computeCalendarDayOfYear(calendar2, isoDate) {
  if (!calendar2) {
    return computeIsoDayOfYear(isoDate);
  }
  const { year } = computeCalendarDateFields(calendar2, isoDate);
  const yearStartIsoDate = computeCalendarIsoFieldsFromParts(calendar2, year, 1, 1);
  return isoDateToEpochDays(isoDate) - isoDateToEpochDays(yearStartIsoDate) + 1;
}
function computeCalendarWeekOfYear(calendar2, isoDate) {
  return calendar2 === isoCalendarImpl ? computeIsoWeekFields(isoDate).weekOfYear : void 0;
}
function computeCalendarYearOfWeek(calendar2, isoDate) {
  return calendar2 === isoCalendarImpl ? computeIsoWeekFields(isoDate).yearOfWeek : void 0;
}
var durationFieldNamesAsc = /* @__PURE__ */ unitNamesAsc.map((unitName) => unitName + "s");
var durationGetters = /* @__PURE__ */ createPropGetters(durationFieldNamesAsc);
var durationFieldNamesAlpha = /* @__PURE__ */ sortStrings(durationFieldNamesAsc);
var durationTimeFieldNamesAsc = /* @__PURE__ */ durationFieldNamesAsc.slice(0, 6);
var durationDateFieldNamesAsc = /* @__PURE__ */ durationFieldNamesAsc.slice(6);
var durationCalendarFieldNamesAsc = /* @__PURE__ */ durationDateFieldNamesAsc.slice(1);
var durationFieldDefaults = /* @__PURE__ */ zipPropsConst(durationFieldNamesAsc, 0);
var durationTimeFieldDefaults = /* @__PURE__ */ zipPropsConst(durationTimeFieldNamesAsc, 0);
var clearDurationFields = /* @__PURE__ */ bindArgs(zeroOutProps, durationFieldNamesAsc);
function requirePropDefined(optionName, optionVal) {
  return null == optionVal && throwRangeError(missingField(optionName)), optionVal;
}
var requireString = /* @__PURE__ */ bindArgs(requireType, "string");
function requireType(typeName, arg, entityName = typeName) {
  return typeof arg !== typeName && throwTypeError(invalidEntity2(entityName, arg)), arg;
}
function requireNumberIsInteger(num, entityName = "number") {
  return Number.isInteger(num) || throwRangeError(((entityName2, num2) => `Non-integer ${entityName2}: ${num2}`)(entityName, num)), num || 0;
}
function toString(arg) {
  return "symbol" == typeof arg && throwTypeError("Cannot convert Symbol to string"), String(arg);
}
function toPrimitiveWithStringHint(arg) {
  if (!isObjectLike(arg)) {
    return arg;
  }
  const exoticToPrimitive = arg[Symbol.toPrimitive];
  if (null != exoticToPrimitive) {
    "function" != typeof exoticToPrimitive && throwTypeError();
    const primitive = Reflect.apply(exoticToPrimitive, arg, ["string"]);
    return isObjectLike(primitive) && throwTypeError(), primitive;
  }
  return Date.prototype[Symbol.toPrimitive].call(arg, "string");
}
function toBigInt(bi) {
  return "boolean" == typeof bi ? BigInt(bi ? 1 : 0) : "string" == typeof bi ? BigInt(bi) : ("bigint" != typeof bi && throwTypeError(`Invalid bigint: ${bi}`), bi);
}
function toStrictInteger(arg, entityName) {
  return requireNumberIsInteger(toFiniteNumber(arg, entityName), entityName);
}
var smallestUnitStr = "smallestUnit";
var overflowMap = {
  constrain: 0,
  reject: 1
};
var epochDisambigMap = {
  compatible: 0,
  reject: 1,
  earlier: 2,
  later: 3
};
var offsetDisambigMap = {
  reject: 0,
  use: 1,
  prefer: 2,
  ignore: 3
};
var calendarDisplayMap = {
  auto: 0,
  never: 1,
  critical: 2,
  always: 3
};
var timeZoneDisplayMap = {
  auto: 0,
  never: 1,
  critical: 2
};
var offsetDisplayMap = {
  auto: 0,
  never: 1
};
var roundingModeMap = {
  floor: 0,
  halfFloor: 1,
  ceil: 2,
  halfCeil: 3,
  trunc: 4,
  halfTrunc: 5,
  expand: 6,
  halfExpand: 7,
  halfEven: 8
};
var roundingModeFuncs = [Math.floor, (num) => hasHalf(num) ? Math.floor(num) : Math.round(num), Math.ceil, (num) => hasHalf(num) ? Math.ceil(num) : Math.round(num), Math.trunc, (num) => hasHalf(num) ? Math.trunc(num) || 0 : Math.round(num), (num) => num < 0 ? Math.floor(num) : Math.ceil(num), (num) => Math.sign(num) * Math.round(Math.abs(num)) || 0, (num) => hasHalf(num) ? (num = Math.trunc(num) || 0) + num % 2 : Math.round(num)];
var directionMap = {
  previous: -1,
  next: 1
};
function coerceRoundingIncInteger(options) {
  const roundingInc = options.roundingIncrement;
  if (void 0 === roundingInc) {
    return 1;
  }
  const integer = toIntegerWithTrunc(roundingInc, "roundingIncrement");
  return (integer < 1 || integer > 10 ** 9) && throwRangeError(invalidEntity2("roundingIncrement", integer)), integer;
}
function coerceFractionalSecondDigits(options) {
  let subsecDigits = options.fractionalSecondDigits;
  if (void 0 !== subsecDigits) {
    if ("number" != typeof subsecDigits) {
      if ("auto" === toString(subsecDigits)) {
        return;
      }
      throwRangeError(invalidEntity2("fractionalSecondDigits", subsecDigits));
    }
    subsecDigits = clampEntity("fractionalSecondDigits", Math.floor(subsecDigits), 0, 9, 1);
  }
  return subsecDigits;
}
function coerceUnitOption(optionName, options, minUnit = 0, ensureDefined) {
  let unitStr = options[optionName];
  if (void 0 === unitStr) {
    return ensureDefined ? minUnit : void 0;
  }
  if (unitStr = toString(unitStr), "auto" === unitStr) {
    return ensureDefined ? minUnit : null;
  }
  let unit = unitNameMap[unitStr];
  return void 0 === unit && (unit = durationFieldNamesAsc.indexOf(unitStr)), unit < 0 && throwRangeError(invalidChoice(optionName, unitStr, unitNameMap)), unit;
}
function coerceChoiceOption(optionName, enumNameMap, options, defaultChoice = 0) {
  const enumArg = options[optionName];
  if (void 0 === enumArg) {
    return defaultChoice;
  }
  const enumStr = toString(enumArg);
  const enumNum = enumNameMap[enumStr];
  return void 0 === enumNum && throwRangeError(invalidChoice(optionName, enumStr, enumNameMap)), enumNum;
}
var coerceSmallestUnit = /* @__PURE__ */ bindArgs(coerceUnitOption, smallestUnitStr);
var coerceLargestUnit = /* @__PURE__ */ bindArgs(coerceUnitOption, "largestUnit");
var coerceTotalUnit = /* @__PURE__ */ bindArgs(coerceUnitOption, "unit");
var coerceOverflow = /* @__PURE__ */ bindArgs(coerceChoiceOption, "overflow", overflowMap);
var coerceEpochDisambig = /* @__PURE__ */ bindArgs(coerceChoiceOption, "disambiguation", epochDisambigMap);
var coerceOffsetDisambig = /* @__PURE__ */ bindArgs(coerceChoiceOption, "offset", offsetDisambigMap);
var coerceCalendarDisplay = /* @__PURE__ */ bindArgs(coerceChoiceOption, "calendarName", calendarDisplayMap);
var coerceTimeZoneDisplay = /* @__PURE__ */ bindArgs(coerceChoiceOption, "timeZoneName", timeZoneDisplayMap);
var coerceOffsetDisplay = /* @__PURE__ */ bindArgs(coerceChoiceOption, "offset", offsetDisplayMap);
var coerceRoundingMode = /* @__PURE__ */ bindArgs(coerceChoiceOption, "roundingMode", roundingModeMap);
var coerceDirection = /* @__PURE__ */ bindArgs(coerceChoiceOption, "direction", directionMap);
function normalizeOptionsOrString(options, optionName) {
  return "string" == typeof options ? ((optionName2, optionVal) => {
    const res = /* @__PURE__ */ Object.create(null);
    return res[optionName2] = optionVal, res;
  })(optionName, options) : requireObjectLike(options);
}
function validateRoundingInc(roundingInc, smallestUnit, allowManyLargeUnits, solarMode) {
  const upUnitNano = solarMode ? nanoInUtcDay : unitNanoMap[smallestUnit + 1];
  if (upUnitNano) {
    const incNano = roundingInc * unitNanoMap[smallestUnit];
    (upUnitNano % incNano || !solarMode && incNano === upUnitNano) && throwRangeError(invalidEntity2("roundingIncrement", roundingInc));
  } else {
    !allowManyLargeUnits && roundingInc > 1 && throwRangeError(invalidEntity2("roundingIncrement", roundingInc));
  }
  return roundingInc;
}
function validateUnitRange(optionName, unit, minUnit, maxUnit) {
  return null != unit && clampEntity(optionName, unit, minUnit, maxUnit, 1, unitNamesAsc), unit;
}
function checkLargestSmallestUnit(largestUnit, smallestUnit) {
  smallestUnit > largestUnit && throwRangeError("smallestUnit > largestUnit");
}
function refineDiffOptions(roundingModeInvert, options, defaultLargestUnit, maxUnit = 9, minUnit = 0, defaultRoundingMode = 4) {
  options = normalizeOptions(options);
  let largestUnit = coerceLargestUnit(options, minUnit);
  let roundingInc = coerceRoundingIncInteger(options);
  let roundingMode = coerceRoundingMode(options, defaultRoundingMode);
  let smallestUnit = coerceSmallestUnit(options, minUnit, 1);
  return largestUnit = validateUnitRange("largestUnit", largestUnit, minUnit, maxUnit), smallestUnit = validateUnitRange(smallestUnitStr, smallestUnit, minUnit, maxUnit), null == largestUnit ? largestUnit = Math.max(defaultLargestUnit, smallestUnit) : checkLargestSmallestUnit(largestUnit, smallestUnit), roundingInc = validateRoundingInc(roundingInc, smallestUnit, 1), roundingModeInvert && (roundingMode = ((roundingMode2) => roundingMode2 < 4 ? (roundingMode2 + 2) % 4 : roundingMode2)(roundingMode)), [largestUnit, smallestUnit, roundingInc, roundingMode];
}
function refineRoundingOptions(options, maxUnit = 6, solarMode) {
  let roundingInc = coerceRoundingIncInteger(options = normalizeOptionsOrString(options, smallestUnitStr));
  const roundingMode = coerceRoundingMode(options, 7);
  let smallestUnit = coerceSmallestUnit(options);
  return smallestUnit = requirePropDefined(smallestUnitStr, smallestUnit), smallestUnit = validateUnitRange(smallestUnitStr, smallestUnit, 0, maxUnit), roundingInc = validateRoundingInc(roundingInc, smallestUnit, void 0, solarMode), [smallestUnit, roundingInc, roundingMode];
}
function combineDateAndTime(isoDate, time) {
  return pluckProps(calendarDateFieldNamesAsc, isoDate, pluckProps(timeFieldNamesAsc, time));
}
var epochNanoMax = /* @__PURE__ */ BigInt(1e8) * bigNanoInUtcDay;
var epochNanoMin = /* @__PURE__ */ BigInt(-1e8) * bigNanoInUtcDay;
var plainDateEpochNanoMin = epochNanoMin - bigNanoInUtcDay;
function checkIsoYearMonthInBounds(isoDate) {
  const isoYearMonthIndex = 12 * isoDate.year + isoDate.month;
  return (isoYearMonthIndex < -3261848 || isoYearMonthIndex > 3309129) && throwRangeError(outOfBoundsDate), isoDate;
}
function checkIsoDateInBounds(isoDate, allowPlainDateLowerEdge = 1) {
  const epochNano = isoDateToEpochNano(isoDate);
  return (epochNano < (allowPlainDateLowerEdge ? plainDateEpochNanoMin : epochNanoMin) || epochNano > epochNanoMax) && throwRangeError(outOfBoundsDate), isoDate;
}
function checkIsoDateTimeInBounds(isoDateTime) {
  return checkIsoDateTimeEpochNanoInBounds(isoDateTimeToEpochNano(isoDateTime)), isoDateTime;
}
function checkIsoDateTimeEpochNanoInBounds(epochNano) {
  return (epochNano <= plainDateEpochNanoMin || epochNano >= epochNanoMax + bigNanoInUtcDay) && throwRangeError(outOfBoundsDate), epochNano;
}
function checkEpochNanoInBounds(epochNano) {
  return (epochNano < epochNanoMin || epochNano > epochNanoMax) && throwRangeError(outOfBoundsDate), epochNano;
}
function isoDateTimeAndOffsetToEpochNano(isoDateTime, offsetNano) {
  return checkEpochNanoInBounds(isoDateToEpochNano(isoDateTime) + BigInt(timeFieldsToNano(isoDateTime) - offsetNano));
}
function roundNumberToInc(num, roundingInc, roundingMode) {
  return roundWithMode(num / roundingInc, roundingMode) * roundingInc || 0;
}
function roundWithMode(num, roundingMode) {
  return roundingModeFuncs[roundingMode](num);
}
function totalRelativeUnit(wholeValue, sign, endEpochNano, moveValueToEpochNano) {
  const unitWindow = clampRelativeUnitValue(wholeValue, sign, moveValueToEpochNano, endEpochNano);
  return interpolateRelativeUnitWindow(unitWindow, Number(endEpochNano - unitWindow.N) / Number(unitWindow.te - unitWindow.N));
}
function roundRelativeUnitWindow(unitWindow, endEpochNano, roundingInc, roundingMode) {
  return roundNumberToInc(interpolateRelativeUnitWindow(unitWindow, computeEpochNanoFrac(endEpochNano, unitWindow.N, unitWindow.te)), roundingInc, roundingMode);
}
function clampRelativeUnitValue(startValue, valueDelta, moveValueToEpochNano, epochNanoProgress) {
  let unitWindow = computeRelativeUnitWindow(startValue, valueDelta, moveValueToEpochNano);
  return ((epochNanoProgress2, epochNano0, epochNano1, sign) => sign > 0 ? epochNano0 <= epochNanoProgress2 && epochNanoProgress2 <= epochNano1 : epochNano1 <= epochNanoProgress2 && epochNanoProgress2 <= epochNano0)(epochNanoProgress, unitWindow.N, unitWindow.te, Math.sign(valueDelta)) || (unitWindow = computeRelativeUnitWindow(startValue + valueDelta, valueDelta, moveValueToEpochNano)), unitWindow;
}
function computeRelativeUnitWindow(startValue, valueDelta, moveValueToEpochNano) {
  const endValue = startValue + valueDelta;
  return {
    ve: startValue,
    pe: endValue,
    N: moveValueToEpochNano(startValue),
    te: moveValueToEpochNano(endValue)
  };
}
function interpolateRelativeUnitWindow(unitWindow, fraction) {
  return unitWindow.ve + fraction * (unitWindow.pe - unitWindow.ve);
}
function computeEpochNanoFrac(epochNanoProgress, epochNano0, epochNano1) {
  const denomBig = epochNano1 - epochNano0;
  const numeratorBig = epochNanoProgress - epochNano0;
  if (!numeratorBig) {
    return 0;
  }
  const absNumerator = numeratorBig < 0n ? -numeratorBig : numeratorBig;
  const absDenom = denomBig < 0n ? -denomBig : denomBig;
  const fracSign = compareBigInts(numeratorBig, 0n) === compareBigInts(denomBig, 0n) ? 1 : -1;
  return compareBigInts(absNumerator, absDenom) <= 0 ? absNumerator === absDenom ? fracSign : fabricateNearHalfFraction(compareBigInts(2n * absNumerator, absDenom), fracSign) : Number(numeratorBig) / Number(denomBig);
}
function createEpochNanoSlots(epochNano) {
  return {
    epochNanoseconds: epochNano
  };
}
function createZonedEpochNanoSlots(epochNano, timeZone, calendar2) {
  return {
    calendar: calendar2,
    timeZone,
    epochNanoseconds: epochNano
  };
}
function createDateTimeSlots(isoDateTime, calendar2) {
  return pluckProps(timeFieldNamesAsc, isoDateTime, createDateSlots(isoDateTime, calendar2));
}
function createDateSlots(isoDate, calendar2) {
  return pluckProps(calendarDateFieldNamesAsc, isoDate, {
    calendar: calendar2
  });
}
function createTimeSlots(time) {
  return pluckProps(timeFieldNamesAsc, time);
}
function createDurationSlots(durationFields) {
  return pluckProps(durationFieldNamesAsc, durationFields, {
    sign: computeDurationSign(durationFields)
  });
}
function roundZonedEpochSlotsToUnit(slots, smallestUnit, roundingInc, roundingMode) {
  return createZonedEpochNanoSlots(6 === smallestUnit ? roundZonedEpochToDay(slots, roundingMode) : roundZonedEpochToTime(slots, smallestUnit, roundingInc, roundingMode), slots.timeZone, slots.calendar);
}
function computeZonedHoursInDay(slots) {
  const [epochNano0, epochNano1] = computeZonedDayEpochInterval(slots);
  return divideBigNanoToExactNumber(epochNano1 - epochNano0, nanoInHour2);
}
function computeZonedStartOfDay(slots) {
  const { timeZone, calendar: calendar2 } = slots;
  return createZonedEpochNanoSlots(getStartOfDayInstantFor(timeZone, combineDateAndTime(zonedEpochSlotsToIso(slots), timeFieldDefaults)), timeZone, calendar2);
}
function roundRelativeDuration(durationFields, endEpochNano, largestUnit, smallestUnit, roundingInc, roundingMode, relativeOps, isZoned) {
  if (0 === smallestUnit && 1 === roundingInc) {
    return durationFields;
  }
  const sign = computeDurationSign(durationFields) || 1;
  const nudgeFunc = isUniformUnit(smallestUnit, isZoned) ? isZoned && smallestUnit < 6 && largestUnit >= 6 ? nudgeZonedTimeDuration : nudgeDayTimeDuration : nudgeRelativeDuration;
  let [roundedDurationFields, roundedEpochNano, grewBigUnit] = nudgeFunc(sign, durationFields, endEpochNano, largestUnit, smallestUnit, roundingInc, roundingMode, relativeOps);
  return grewBigUnit && 7 !== smallestUnit && (roundedDurationFields = ((durationFields2, endEpochNano2, largestUnit2, smallestUnit2, sign2, relativeOps2) => {
    for (let currentUnit = smallestUnit2 + 1; currentUnit <= largestUnit2; currentUnit++) {
      if (7 === currentUnit && 7 !== largestUnit2) {
        continue;
      }
      const baseDurationFields = clearDurationFields(currentUnit, durationFields2);
      baseDurationFields[durationFieldNamesAsc[currentUnit]] += sign2;
      const thresholdCompare = compareBigInts(endEpochNano2, moveRelativeMarkerToEpochNano(relativeOps2, baseDurationFields));
      if (thresholdCompare && thresholdCompare !== sign2) {
        break;
      }
      durationFields2 = baseDurationFields;
    }
    return durationFields2;
  })(roundedDurationFields, roundedEpochNano, largestUnit, Math.max(6, smallestUnit), sign, relativeOps)), roundedDurationFields;
}
function roundDayTimeDurationByInc(durationFields, nanoInc, roundingMode) {
  const maxUnit = Math.max(Math.min(getMaxDurationUnit(durationFields), 6), 3);
  return nanoToDurationDayTimeFields(roundBigNanoToInc(durationDayTimeToBigNano(durationFields), BigInt(nanoInc), roundingMode), maxUnit);
}
function roundZonedEpochToDay(slots, roundingMode) {
  const [epochNano0, epochNano1] = computeZonedDayEpochInterval(slots);
  return roundZonedEpochToBounds(slots.epochNanoseconds, epochNano0, epochNano1, roundingMode);
}
function roundZonedEpochToTime(slots, smallestUnit, roundingInc, roundingMode) {
  if (0 === smallestUnit && 1 === roundingInc) {
    return slots.epochNanoseconds;
  }
  const isoDateTime = zonedEpochSlotsToIso(slots);
  return getInstantPreferringOffset(slots.timeZone, roundDateTimeToUnit(isoDateTime, smallestUnit, roundingInc, roundingMode), isoDateTime.offsetNanoseconds);
}
function roundDateTimeToUnit(isoDateTime, smallestUnit, roundingInc, roundingMode) {
  return roundDateTimeToInc(isoDateTime, computeNanoInc(smallestUnit, roundingInc), roundingMode, unitNanoMap[smallestUnit + 1]);
}
function roundTimeToUnit(timeFields, smallestUnit, roundingInc, roundingMode) {
  return roundTimeToInc(timeFields, computeNanoInc(smallestUnit, roundingInc), roundingMode, unitNanoMap[smallestUnit + 1]);
}
function roundDateTimeToInc(isoDateTime, nanoInc, roundingMode, spanNano) {
  const [roundedTimeFields, dayDelta] = roundTimeToInc(isoDateTime, nanoInc, roundingMode, spanNano);
  const roundedIsoDateTime = combineDateAndTime(moveDateByDays(isoDateTime, dayDelta), roundedTimeFields);
  return checkIsoDateTimeInBounds(roundedIsoDateTime), roundedIsoDateTime;
}
function roundTimeToInc(timeFields, nanoInc, roundingMode, spanNano = nanoInUtcDay) {
  const timeNano = timeFieldsToNano(timeFields);
  const remainderNano = timeNano % spanNano;
  return nanoToTimeAndDay(timeNano - remainderNano + roundNumberToInc(remainderNano, nanoInc, roundingMode));
}
function nudgeRelativeDuration(sign, durationFields, endEpochNano, _largestUnit, smallestUnit, roundingInc, roundingMode, relativeOps) {
  const smallestUnitFieldName = durationFieldNamesAsc[smallestUnit];
  const baseDurationFields = clearDurationFields(smallestUnit, durationFields);
  7 === smallestUnit && (durationFields = {
    ...durationFields,
    weeks: durationFields.weeks + Math.trunc(durationFields.days / 7)
  });
  const truncedVal = divTrunc(durationFields[smallestUnitFieldName], roundingInc) * roundingInc;
  const nudgeWindow = clampRelativeUnitValue(truncedVal, roundingInc * sign, (value) => (baseDurationFields[smallestUnitFieldName] = value, moveRelativeMarkerToEpochNano(relativeOps, baseDurationFields)), endEpochNano);
  const roundedVal = roundRelativeUnitWindow(nudgeWindow, endEpochNano, roundingInc, roundingMode);
  return baseDurationFields[smallestUnitFieldName] = roundedVal, [baseDurationFields, roundedVal === nudgeWindow.pe ? nudgeWindow.te : nudgeWindow.N, roundedVal !== truncedVal];
}
function nudgeZonedTimeDuration(sign, durationFields, _endEpochNano, _largestUnit, smallestUnit, roundingInc, roundingMode, relativeOps) {
  const timeNano = Number(durationTimeToBigNano(durationFields));
  const nanoInc = computeNanoInc(smallestUnit, roundingInc);
  let roundedTimeNano = roundNumberToInc(timeNano, nanoInc, roundingMode);
  const dateDurationFields = {
    ...durationFields,
    ...durationTimeFieldDefaults
  };
  const dayEpochNano0 = relativeOps.X(dateDurationFields);
  const dayEpochNano1 = relativeOps.X({
    ...dateDurationFields,
    days: dateDurationFields.days + sign
  });
  const daySpanNano = Number(dayEpochNano1 - dayEpochNano0);
  Math.sign(daySpanNano) !== sign && throwRangeError("Out-of-bounds TimeZone gap");
  const beyondDayNano = roundedTimeNano - daySpanNano;
  let dayDelta = 0;
  let nudgedEpochNano;
  beyondDayNano && Math.sign(beyondDayNano) !== sign ? nudgedEpochNano = dayEpochNano0 + BigInt(roundedTimeNano) : (dayDelta += sign, roundedTimeNano = roundNumberToInc(beyondDayNano, nanoInc, roundingMode), nudgedEpochNano = dayEpochNano1 + BigInt(roundedTimeNano));
  const durationTimeFields = nanoToDurationTimeFields(roundedTimeNano);
  return [{
    ...durationFields,
    ...durationTimeFields,
    days: durationFields.days + dayDelta
  }, nudgedEpochNano, Boolean(dayDelta)];
}
function nudgeDayTimeDuration(sign, durationFields, endEpochNano, largestUnit, smallestUnit, roundingInc, roundingMode) {
  const bigNano = durationDayTimeToBigNano(durationFields);
  const roundedBigNano = roundBigNanoToInc(bigNano, computeBigNanoInc(smallestUnit, roundingInc), roundingMode);
  const nanoDiff = roundedBigNano - bigNano;
  const expandedBigUnit = Math.sign(Number(roundedBigNano / bigNanoInUtcDay) - Number(bigNano / bigNanoInUtcDay)) === sign;
  const roundedDayTimeFields = nanoToDurationDayTimeFields(roundedBigNano, Math.min(largestUnit, 6));
  return [{
    ...durationFields,
    ...roundedDayTimeFields
  }, endEpochNano + nanoDiff, expandedBigUnit];
}
function computeZonedDayEpochInterval(slots) {
  const { timeZone } = slots;
  const isoDateTime0 = combineDateAndTime(zonedEpochSlotsToIso(slots), timeFieldDefaults);
  const isoDateTime1 = combineDateAndTime(moveDateByDays(isoDateTime0, 1), timeFieldDefaults);
  return [getStartOfDayInstantFor(timeZone, isoDateTime0), getStartOfDayInstantFor(timeZone, isoDateTime1)];
}
function roundZonedEpochToBounds(epochNano, epochNano0, epochNano1, roundingMode) {
  return roundWithMode(computeEpochNanoFrac(epochNano < epochNano1 ? epochNano : epochNano1 - 1n, epochNano0, epochNano1), roundingMode) ? epochNano1 : epochNano0;
}
function roundToMinute(offsetNano) {
  return roundNumberToInc(offsetNano, nanoInMinute2, 7);
}
function roundBigNanoToInc(bigNano, bigNanoInc, roundingMode) {
  return roundBigNanoToIncWithTail(bigNano, bigNanoInc, roundingMode, bigNano / bigNanoInc % 2n);
}
function roundBigNanoToDayOriginInc(bigNano, bigNanoInc, roundingMode) {
  const [day, timeNano] = divModFloorBigInt(bigNano, bigNanoInUtcDay);
  const dayOriginNano = day * bigNanoInUtcDay;
  return dayOriginNano + roundBigNanoToIncWithTail(timeNano, bigNanoInc, roundingMode, dayOriginNano / bigNanoInc + timeNano / bigNanoInc & 1n);
}
function roundBigNanoToIncWithTail(bigNano, bigNanoInc, roundingMode, quotientTail) {
  const quotient2 = bigNano / bigNanoInc;
  const remainder = bigNano % bigNanoInc;
  let fraction = 0;
  remainder && (fraction = fabricateNearHalfFraction(compareBigInts(2n * (remainder < 0n ? -remainder : remainder), bigNanoInc), Math.sign(Number(remainder))));
  const roundedTail = roundWithMode(Number(quotientTail) + fraction, roundingMode);
  return (quotient2 - quotientTail + BigInt(roundedTail)) * bigNanoInc;
}
function computeNanoInc(smallestUnit, roundingInc) {
  return unitNanoMap[smallestUnit] * roundingInc;
}
function computeBigNanoInc(smallestUnit, roundingInc) {
  return BigInt(unitNanoMap[smallestUnit]) * BigInt(roundingInc);
}
var zonedEpochSlotsToIso = /* @__PURE__ */ memoize(_zonedEpochSlotsToIso, WeakMap);
function _zonedEpochSlotsToIso(slots) {
  const { epochNanoseconds, timeZone } = slots;
  const offsetNanoseconds = timeZone.B(epochNanoseconds);
  return {
    ...epochNanoToIsoDateTime(epochNanoseconds + BigInt(offsetNanoseconds)),
    offsetNanoseconds
  };
}
function getInstantPreferringOffset(timeZone, isoDateTime, offsetNano) {
  return getMatchingInstantFor(timeZone, isoDateTime, offsetNano, 2, 0);
}
function getMatchingInstantFor(timeZone, isoDateTime, offsetNano, offsetDisambig = 0, epochDisambig = 0, epochFuzzy, hasZ) {
  if (hasZ || void 0 !== offsetNano && 1 === offsetDisambig) {
    return isoDateTimeAndOffsetToEpochNano(isoDateTime, offsetNano || 0);
  }
  const possibleEpochNanos = timeZone.O(isoDateTime);
  if (void 0 !== offsetNano && 3 !== offsetDisambig) {
    checkIsoDateInBounds(isoDateTime, 0);
    const matchingEpochNano = ((possibleEpochNanos2, isoDateTime2, offsetNano2, fuzzy) => {
      const zonedEpochNano = isoDateTimeToEpochNano(isoDateTime2);
      fuzzy && (offsetNano2 = roundToMinute(offsetNano2));
      for (const possibleEpochNano of possibleEpochNanos2) {
        let possibleOffsetNano = Number(zonedEpochNano - possibleEpochNano);
        if (fuzzy && (possibleOffsetNano = roundToMinute(possibleOffsetNano)), possibleOffsetNano === offsetNano2) {
          return possibleEpochNano;
        }
      }
    })(possibleEpochNanos, isoDateTime, offsetNano, epochFuzzy);
    if (void 0 !== matchingEpochNano) {
      return matchingEpochNano;
    }
    0 === offsetDisambig && throwRangeError("Invalid TimeZone offset");
  }
  return getSingleInstantFor(timeZone, isoDateTime, epochDisambig, possibleEpochNanos);
}
function getSingleInstantFor(timeZone, isoDateTime, disambig = 0, possibleEpochNanos = timeZone.O(isoDateTime)) {
  if (1 === possibleEpochNanos.length) {
    return possibleEpochNanos[0];
  }
  if (1 === disambig && throwRangeError("Ambiguous offset"), possibleEpochNanos.length) {
    return possibleEpochNanos[3 === disambig ? 1 : 0];
  }
  const zonedEpochNano = isoDateTimeToEpochNano(isoDateTime);
  const gapNano = ((timeZone2, zonedEpochNano2) => {
    const startOffsetNano = timeZone2.B(zonedEpochNano2 - bigNanoInUtcDay);
    return ((gapNano2) => (gapNano2 > nanoInUtcDay && throwRangeError("Out-of-bounds TimeZone gap"), gapNano2))(timeZone2.B(zonedEpochNano2 + bigNanoInUtcDay) - startOffsetNano);
  })(timeZone, zonedEpochNano);
  const shiftedIsoDateTime = epochNanoToIsoDateTime(zonedEpochNano + BigInt(gapNano * (2 === disambig ? -1 : 1)));
  return (possibleEpochNanos = timeZone.O(shiftedIsoDateTime))[2 === disambig ? 0 : possibleEpochNanos.length - 1];
}
function getStartOfDayInstantFor(timeZone, isoDateTime) {
  const possibleEpochNanos = timeZone.O(isoDateTime);
  if (possibleEpochNanos.length) {
    return possibleEpochNanos[0];
  }
  const zonedEpochNanoDayBefore = isoDateTimeToEpochNano(isoDateTime) - bigNanoInUtcDay;
  return timeZone.C(zonedEpochNanoDayBefore, 1);
}
function moveYearMonth(calendar2, isoDate, durationSlots, overflow = 0) {
  computeDurationSign(durationSlots) && clampEntity("unit", getMaxDurationUnit(durationSlots), 8, 9, 1, durationFieldNamesAsc);
  const first = checkIsoDateInBounds(moveToStartOfMonth(calendar2, isoDate));
  return moveToStartOfMonth(calendar2, moveDate(calendar2, first, durationSlots, overflow));
}
function moveZonedEpochSlots(slots, durationFields, overflow = 0) {
  const { calendar: calendar2, epochNanoseconds: epochNano, timeZone } = slots;
  const timeOnlyNano = durationTimeToBigNano(durationFields);
  let movedEpochNano = epochNano;
  if (durationHasDateParts(durationFields)) {
    const isoDateTime = zonedEpochSlotsToIso(slots);
    movedEpochNano = getSingleInstantFor(timeZone, combineDateAndTime(moveDate(calendar2, isoDateTime, {
      ...durationFields,
      ...durationTimeFieldDefaults
    }, overflow), isoDateTime)) + timeOnlyNano;
  } else {
    movedEpochNano += timeOnlyNano;
  }
  return {
    ...slots,
    epochNanoseconds: checkEpochNanoInBounds(movedEpochNano)
  };
}
function moveDateTime(calendar2, isoDateTime, durationFields, overflow = 0) {
  const [movedTimeFields, dayDelta] = moveTime(isoDateTime, durationFields);
  return checkIsoDateTimeInBounds(combineDateAndTime(moveDate(calendar2, isoDateTime, {
    ...durationFields,
    ...durationTimeFieldDefaults,
    days: durationFields.days + dayDelta
  }, overflow), movedTimeFields));
}
function moveTime(timeFields, durationFields) {
  return moveTimeByNano(timeFields, durationTimeToBigNano(durationFields));
}
function moveEpochNano(epochNano, durationFields) {
  return moveEpochNanoByNano(epochNano, (clampEntity("unit", getMaxDurationUnit(fields = durationFields), 0, 5, 1, durationFieldNamesAsc), durationTimeToBigNano(fields)));
  var fields;
}
function moveDate(calendar2, isoDate, durationFields, overflow = 0) {
  let { years, months: months2, weeks, days } = durationFields;
  let movedIsoDate;
  if (days += Number(durationTimeToBigNano(durationFields) / bigNanoInUtcDay), years || months2) {
    movedIsoDate = moveDateByCalendarUnits(calendar2, isoDate, years, months2, overflow);
  } else {
    if (!weeks && !days) {
      return isoDate;
    }
    movedIsoDate = isoDate;
  }
  return (weeks || days) && (movedIsoDate = moveDateByDays(movedIsoDate, 7 * weeks + days)), checkIsoDateInBounds(movedIsoDate);
}
function moveToStartOfMonth(calendar2, isoDate) {
  return moveDateByDays(isoDate, 1 - computeCalendarDateFields(calendar2, isoDate).day);
}
function moveDateByCalendarUnits(calendar2, isoDate, years, months2, overflow) {
  const dateParts = computeCalendarDateFields(calendar2, isoDate);
  let { year, month, day } = dateParts;
  if (years) {
    const [monthCodeNumber, isLeapMonth] = computeCalendarMonthCodeParts(calendar2, year, month);
    year += years, month = resolveMonthInMovedYear(calendar2, monthCodeNumber, isLeapMonth, calendar2 ? calendar2.p(year) : void 0, overflow), month = clampEntity("month", month, 1, computeCalendarMonthsInYearForYear(calendar2, year), overflow);
  }
  if (months2) {
    const yearMonthParts = addCalendarMonths(calendar2, year, month, months2);
    ({ year, month } = yearMonthParts);
  }
  return day = clampEntity("day", day, 1, computeCalendarDaysInMonthForYearMonth(calendar2, year, month), overflow), computeCalendarIsoFieldsFromParts(calendar2, year, month, day);
}
function addCalendarMonths(calendar2, year, month, monthDelta) {
  return calendar2 ? calendar2.ae(year, month, monthDelta) : addIsoMonths(year, month, monthDelta);
}
function resolveMonthInMovedYear(calendar2, monthCodeNumber, isLeapMonth, targetLeapMonth, overflow) {
  if (isLeapMonth) {
    const leapMonthMeta = calendar2 ? calendar2.l : void 0;
    if (void 0 !== targetLeapMonth && (leapMonthMeta < 0 || targetLeapMonth === monthCodeNumber + 1)) {
      return targetLeapMonth;
    }
    if (1 === overflow && throwRangeError(invalidLeapMonth), leapMonthMeta < 0) {
      return -leapMonthMeta;
    }
  }
  return monthCodeNumberToMonth(monthCodeNumber, 0, targetLeapMonth);
}
function moveTimeByNano(timeFields, durationBigNano) {
  const durDays = Number(durationBigNano / bigNanoInUtcDay);
  const durTimeNano = Number(durationBigNano % bigNanoInUtcDay);
  const [newTimeFields, overflowDays] = nanoToTimeAndDay(timeFieldsToNano(timeFields) + durTimeNano);
  return [newTimeFields, durDays + overflowDays];
}
function moveEpochNanoByNano(epochNano, deltaNano) {
  return checkEpochNanoInBounds(epochNano + deltaNano);
}
function moveDateByDays(isoDate, days) {
  return days ? epochDaysToIsoDate(isoDateToEpochDays(isoDate) + days) : isoDate;
}
function getCommonCalendar(a, b) {
  return getCalendarSlotId(a) !== getCalendarSlotId(b) && throwRangeError("Mismatching Calendars"), a;
}
function getCommonTimeZone(a, b) {
  return a.m !== b.m && throwRangeError("Mismatching TimeZones"), a;
}
function getZonedTimeZoneId(slots) {
  return slots.timeZone.id;
}
function diffZonedDateTimesRounded(calendar2, startZoned, endZoned, largestUnit, smallestUnit, roundingInc, roundingMode) {
  return largestUnit < 6 ? diffEpochNanosRounded(startZoned.epochNanoseconds, endZoned.epochNanoseconds, largestUnit, smallestUnit, roundingInc, roundingMode) : ((calendar3, startZoned2, endZoned2, largestUnit2, smallestUnit2, roundingInc2, roundingMode2) => {
    const timeZone = getCommonTimeZone(startZoned2.timeZone, endZoned2.timeZone);
    const endEpochNano = endZoned2.epochNanoseconds;
    if (endEpochNano === startZoned2.epochNanoseconds) {
      return durationFieldDefaults;
    }
    let durationFields;
    return durationFields = diffZonedEpochsExact(timeZone, calendar3, startZoned2, endZoned2, largestUnit2), durationFields = roundRelativeDuration(durationFields, endEpochNano, largestUnit2, smallestUnit2, roundingInc2, roundingMode2, createZonedRelativeOps(calendar3, timeZone, startZoned2), 1), durationFields;
  })(calendar2, startZoned, endZoned, largestUnit, smallestUnit, roundingInc, roundingMode);
}
function diffDateTimesRounded(calendar2, startIsoDateTime, endIsoDateTime, largestUnit, smallestUnit, roundingInc, roundingMode) {
  return largestUnit <= 6 ? diffEpochNanosRounded(isoDateTimeToEpochNano(startIsoDateTime), isoDateTimeToEpochNano(endIsoDateTime), largestUnit, smallestUnit, roundingInc, roundingMode) : ((calendar3, startIsoDateTime2, endIsoDateTime2, largestUnit2, smallestUnit2, roundingInc2, roundingMode2) => {
    const endEpochNano = isoDateTimeToEpochNano(endIsoDateTime2);
    const sign = compareBigInts(endEpochNano, isoDateTimeToEpochNano(startIsoDateTime2));
    if (!sign) {
      return durationFieldDefaults;
    }
    let durationFields;
    return durationFields = diffDateTimesBig(calendar3, startIsoDateTime2, endIsoDateTime2, sign, largestUnit2), durationFields = roundRelativeDuration(durationFields, endEpochNano, largestUnit2, smallestUnit2, roundingInc2, roundingMode2, ((calendar4, origin) => ({
      ne: isoDateTimeToEpochNano(origin),
      X: (duration) => isoDateTimeToEpochNano(combineDateAndTime(moveDate(calendar4, origin, duration), origin))
    }))(calendar3, startIsoDateTime2)), durationFields;
  })(calendar2, startIsoDateTime, endIsoDateTime, largestUnit, smallestUnit, roundingInc, roundingMode);
}
function diffYearMonthsRounded(calendar2, startIsoDate, endIsoDate, largestUnit, smallestUnit, roundingInc, roundingMode) {
  const firstOfMonth0 = moveToStartOfMonth(calendar2, startIsoDate);
  const firstOfMonth1 = moveToStartOfMonth(calendar2, endIsoDate);
  return compareIsoDates(firstOfMonth0, firstOfMonth1) ? diffDateCalendarUnitsRounded(calendar2, checkIsoDateInBounds(firstOfMonth0), checkIsoDateInBounds(firstOfMonth1), largestUnit, smallestUnit, roundingInc, roundingMode, 8) : durationFieldDefaults;
}
function diffDatesRounded(calendar2, startIsoDate, endIsoDate, largestUnit, smallestUnit, roundingInc, roundingMode, smallestPrecision = 6) {
  return 6 === largestUnit ? diffEpochNanosRounded(isoDateToEpochNano(startIsoDate), isoDateToEpochNano(endIsoDate), largestUnit, smallestUnit, roundingInc, roundingMode) : diffDateCalendarUnitsRounded(calendar2, startIsoDate, endIsoDate, largestUnit, smallestUnit, roundingInc, roundingMode, smallestPrecision);
}
function diffTimesRounded(plainTimeSlots0, plainTimeSlots1, largestUnit, smallestUnit, roundingInc, roundingMode) {
  const timeDiffNano = roundNumberToInc(timeFieldsToNano(plainTimeSlots1) - timeFieldsToNano(plainTimeSlots0), computeNanoInc(smallestUnit, roundingInc), roundingMode);
  return {
    ...durationFieldDefaults,
    ...nanoToDurationTimeFields(timeDiffNano, largestUnit)
  };
}
function diffDateCalendarUnitsRounded(calendar2, startIsoDate, endIsoDate, largestUnit, smallestUnit, roundingInc, roundingMode, smallestPrecision = 6) {
  const endEpochNano = isoDateToEpochNano(endIsoDate);
  if (!compareIsoDates(startIsoDate, endIsoDate)) {
    return durationFieldDefaults;
  }
  let durationFields;
  return durationFields = diffCalendarDates(calendar2, startIsoDate, endIsoDate, largestUnit), smallestUnit === smallestPrecision && 1 === roundingInc || (durationFields = roundRelativeDuration(durationFields, endEpochNano, largestUnit, smallestUnit, roundingInc, roundingMode, createDateRelativeOps(calendar2, startIsoDate))), durationFields;
}
function diffEpochNanosRounded(startEpochNano, endEpochNano, largestUnit, smallestUnit, roundingInc, roundingMode) {
  return {
    ...durationFieldDefaults,
    ...nanoToDurationDayTimeFields(roundBigNanoToInc(endEpochNano - startEpochNano, computeBigNanoInc(smallestUnit, roundingInc), roundingMode), largestUnit)
  };
}
function diffZonedEpochsExact(timeZone, calendar2, startZoned, endZoned, largestUnit) {
  return largestUnit < 6 ? {
    ...durationFieldDefaults,
    ...nanoToDurationDayTimeFields(endZoned.epochNanoseconds - startZoned.epochNanoseconds, largestUnit)
  } : ((timeZone2, startZoned2, endZoned2) => {
    const sign = compareBigInts(endZoned2.epochNanoseconds, startZoned2.epochNanoseconds);
    if (!sign) {
      return durationFieldDefaults;
    }
    if (!compareIsoDates(zonedEpochSlotsToIso(startZoned2), zonedEpochSlotsToIso(endZoned2))) {
      return {
        ...durationFieldDefaults,
        ...nanoToDurationDayTimeFields(endZoned2.epochNanoseconds - startZoned2.epochNanoseconds, 5)
      };
    }
    const [startIsoDateTime, endIsoDate, remainderNano] = prepareZonedEpochDiff(timeZone2, startZoned2, endZoned2, sign);
    return {
      ...(start = startIsoDateTime, end = endIsoDate, diffCalendarDates(calendar2, start, end, largestUnit)),
      ...nanoToDurationTimeFields(remainderNano)
    };
    var start, end;
  })(timeZone, startZoned, endZoned);
}
function diffDateTimesExact(calendar2, startIsoDateTime, endIsoDateTime, largestUnit) {
  const startEpochNano = isoDateTimeToEpochNano(startIsoDateTime);
  const endEpochNano = isoDateTimeToEpochNano(endIsoDateTime);
  const sign = compareBigInts(endEpochNano, startEpochNano);
  return sign ? largestUnit <= 6 ? {
    ...durationFieldDefaults,
    ...nanoToDurationDayTimeFields(endEpochNano - startEpochNano, largestUnit)
  } : diffDateTimesBig(calendar2, startIsoDateTime, endIsoDateTime, sign, largestUnit) : durationFieldDefaults;
}
function diffDateTimesBig(calendar2, startIsoDateTime, endIsoDateTime, sign, largestUnit) {
  let diffEndDate = endIsoDateTime;
  let timeNano = timeFieldsToNano(endIsoDateTime) - timeFieldsToNano(startIsoDateTime);
  return Math.sign(timeNano) === -sign && (diffEndDate = moveDateByDays(endIsoDateTime, -sign), timeNano += nanoInUtcDay * sign), {
    ...diffCalendarDates(calendar2, startIsoDateTime, diffEndDate, largestUnit),
    ...nanoToDurationTimeFields(timeNano)
  };
}
function prepareZonedEpochDiff(timeZone, startZoned, endZoned, sign) {
  const startIsoDate = zonedEpochSlotsToIso(startZoned);
  const endIsoDate = zonedEpochSlotsToIso(endZoned);
  const endEpochNano = endZoned.epochNanoseconds;
  let dayCorrection = 0;
  const timeDiffNano = timeFieldsToNano(endIsoDate) - timeFieldsToNano(startIsoDate);
  Math.sign(timeDiffNano) === -sign && dayCorrection++;
  const maxDayCorrection = sign > 0 ? 2 : 1;
  for (; ; dayCorrection++) {
    const midIsoDate = moveDateByDays(endIsoDate, dayCorrection * -sign);
    const midEpochNano = getSingleInstantFor(timeZone, combineDateAndTime(midIsoDate, startIsoDate));
    if (dayCorrection === maxDayCorrection || compareBigInts(endEpochNano, midEpochNano) !== -sign) {
      return [startIsoDate, midIsoDate, Number(endEpochNano - midEpochNano)];
    }
  }
}
function diffCalendarDates(calendar2, startIsoDate, endIsoDate, largestUnit) {
  if (largestUnit <= 7) {
    return ((asWeeks, start, end) => {
      const days = countIsoDays(start, end);
      return asWeeks ? {
        ...durationFieldDefaults,
        weeks: divTrunc(days, 7),
        days: modTrunc(days, 7)
      } : {
        ...durationFieldDefaults,
        days
      };
    })(7 === largestUnit, startIsoDate, endIsoDate);
  }
  const yearMonthDayStart = computeCalendarDateFields(calendar2, startIsoDate);
  const yearMonthDayEnd = computeCalendarDateFields(calendar2, endIsoDate);
  if (8 === largestUnit) {
    const { year: year02, month: month02, day: day02 } = yearMonthDayStart;
    const { year: year12, month: month12, day: day12 } = yearMonthDayEnd;
    const sign = Math.sign(compareNumbers(year12, year02) || compareNumbers(month12, month02) || countIsoDays(startIsoDate, endIsoDate));
    let months2 = 0;
    let days = 0;
    if (sign) {
      months2 = calendar2 ? calendar2.ee(year02, month02, year12, month12) : diffIsoMonthSlots(year02, month02, year12, month12);
      let anchorIsoDate = moveDateByCalendarUnits(calendar2, startIsoDate, 0, months2, 0);
      sign * compareNumbers(day02, day12) > 0 && (months2 -= sign, anchorIsoDate = moveDateByCalendarUnits(calendar2, startIsoDate, 0, months2, 0)), days = countIsoDays(anchorIsoDate, endIsoDate);
    }
    return {
      ...durationFieldDefaults,
      months: months2,
      days
    };
  }
  const { year: year0, month: month0, day: day0 } = yearMonthDayStart;
  let { year: year1, month: month1, day: day1 } = yearMonthDayEnd;
  let yearDiff = year1 - year0;
  let monthDiff = month1 - month0;
  let dayDiff = day1 - day0;
  if (yearDiff || monthDiff) {
    const sign = Math.sign(yearDiff || monthDiff);
    let daysInMonth1 = computeCalendarDaysInMonthForYearMonth(calendar2, year1, month1);
    let dayCorrect = 0;
    if (Math.sign(day1 - day0) === -sign) {
      const origDaysInMonth1 = daysInMonth1;
      const yearMonthParts = addCalendarMonths(calendar2, year1, month1, -sign);
      ({ year: year1, month: month1 } = yearMonthParts), yearDiff = year1 - year0, monthDiff = month1 - month0, daysInMonth1 = computeCalendarDaysInMonthForYearMonth(calendar2, year1, month1), dayCorrect = sign < 0 ? -origDaysInMonth1 : daysInMonth1;
    }
    if (dayDiff = day1 - Math.min(day0, daysInMonth1) + dayCorrect, yearDiff) {
      const [monthCodeNumber0, isLeapMonth0] = computeCalendarMonthCodeParts(calendar2, year0, month0);
      const [monthCodeNumber1, isLeapMonth1] = computeCalendarMonthCodeParts(calendar2, year1, month1);
      const leapMonthMeta = calendar2 ? calendar2.l : void 0;
      if (monthDiff = void 0 !== leapMonthMeta && isLeapMonth0 && !isLeapMonth1 && (leapMonthMeta < 0 ? sign > 0 && monthCodeNumber1 === -leapMonthMeta : sign < 0 && monthCodeNumber1 === monthCodeNumber0) ? 0 : monthCodeNumber1 - monthCodeNumber0 || Number(isLeapMonth1) - Number(isLeapMonth0), Math.sign(monthDiff) === -sign) {
        const monthCorrect = sign < 0 && -computeCalendarMonthsInYearForYear(calendar2, year1);
        year1 -= sign, yearDiff = year1 - year0, monthDiff = month1 - resolveMonthInMovedYear(calendar2, monthCodeNumber0, isLeapMonth0, calendar2 ? calendar2.p(year1) : void 0, 0) + (monthCorrect || computeCalendarMonthsInYearForYear(calendar2, year1));
      } else if (calendar2) {
        const month0Projected = resolveMonthInMovedYear(calendar2, monthCodeNumber0, isLeapMonth0, calendar2.p(year1), 0);
        monthDiff = calendar2.ee(year1, month0Projected, year1, month1);
      }
    }
  }
  return {
    ...durationFieldDefaults,
    years: yearDiff,
    months: monthDiff,
    days: dayDiff
  };
}
function compareIsoDates(isoDate0, isoDate1) {
  return compareNumbers(isoDate0.year, isoDate1.year) || compareNumbers(isoDate0.month, isoDate1.month) || compareNumbers(isoDate0.day, isoDate1.day);
}
function countIsoDays(startIsoDate, endIsoDate) {
  return isoDateToEpochDays(endIsoDate) - isoDateToEpochDays(startIsoDate);
}
function spanRelativeDuration(relativeToSlots, durationFields, largestUnit) {
  return isZonedEpochSlots(relativeToSlots) ? ((relativeToSlots2, durationFields2, largestUnit2) => {
    const { calendar: calendar2, timeZone } = relativeToSlots2;
    const endSlots = moveZonedEpochSlots(relativeToSlots2, durationFields2);
    return [diffZonedEpochsExact(timeZone, calendar2, relativeToSlots2, endSlots, largestUnit2), endSlots.epochNanoseconds, createZonedRelativeOps(calendar2, timeZone, relativeToSlots2)];
  })(relativeToSlots, durationFields, largestUnit) : ((relativeToSlots2, durationFields2, largestUnit2) => {
    const { calendar: calendar2 } = relativeToSlots2;
    const origin = checkIsoDateTimeInBounds(combineDateAndTime(relativeToSlots2, timeFieldDefaults));
    const end = moveDateTime(calendar2, origin, durationFields2);
    return [diffDateTimesExact(calendar2, origin, end, largestUnit2), isoDateTimeToEpochNano(end), createDateRelativeOps(calendar2, relativeToSlots2)];
  })(relativeToSlots, durationFields, largestUnit);
}
function moveRelativeEndpointToEpochNano(relativeToSlots, durationFields) {
  return isZonedEpochSlots(relativeToSlots) ? moveZonedEpochSlots(relativeToSlots, durationFields).epochNanoseconds : isoDateTimeToEpochNano(moveDateTime(relativeToSlots.calendar, combineDateAndTime(relativeToSlots, timeFieldDefaults), durationFields));
}
function moveRelativeMarkerToEpochNano(relativeOps, dateDuration) {
  return durationHasDateParts(dateDuration) ? relativeOps.X(dateDuration) : relativeOps.ne;
}
function createZonedRelativeOps(calendar2, timeZone, slots) {
  const origin = zonedEpochSlotsToIso(slots);
  return {
    ne: slots.epochNanoseconds,
    X: (duration) => getSingleInstantFor(timeZone, combineDateAndTime(moveDate(calendar2, origin, duration), origin))
  };
}
function createDateRelativeOps(calendar2, origin) {
  return {
    ne: isoDateToEpochNano(origin),
    X: (duration) => isoDateToEpochNano(moveDate(calendar2, origin, duration))
  };
}
function isZonedEpochSlots(slots) {
  return "timeZone" in slots;
}
function isUniformUnit(unit, isZoned) {
  return unit <= 6 - (isZoned ? 1 : 0);
}
function nanoToGivenFields(nano, largestUnit, fieldNames) {
  const fields = {};
  for (let unit = largestUnit; unit >= 0; unit--) {
    const divisor = unitNanoMap[unit];
    fields[fieldNames[unit]] = divTrunc(nano, divisor), nano = modTrunc(nano, divisor);
  }
  return fields;
}
var maxDurationSeconds = 2 ** 53;
function addDurationsWithoutRelativeTo(doSubtract, slots, otherSlots) {
  const maxUnit = Math.max(getMaxDurationUnit(slots), getMaxDurationUnit(otherSlots));
  return clampEntity("unit", maxUnit, 0, 6, 1, durationFieldNamesAsc), ((doSubtract2, slots2, otherSlots2, maxUnit2) => createDurationSlots(validateDurationFields(((a, b, largestUnit, doSubtract3) => {
    const combined = durationDayTimeToBigNano(a) + durationDayTimeToBigNano(b) * BigInt(doSubtract3 ? -1 : 1);
    return Number.isFinite(Number(combined / bigNanoInUtcDay)) || throwRangeError(outOfBoundsDate), {
      ...durationFieldDefaults,
      ...nanoToDurationDayTimeFields(combined, largestUnit)
    };
  })(slots2, otherSlots2, maxUnit2, doSubtract2))))(doSubtract, slots, otherSlots, maxUnit);
}
function roundDuration(refineRelativeTo, slots, options) {
  const durationLargestUnit = getMaxDurationUnit(slots);
  const [largestUnit, smallestUnit, roundingInc, roundingMode, relativeToSlots] = ((options2, defaultLargestUnit, refineRelativeTo2) => {
    options2 = normalizeOptionsOrString(options2, smallestUnitStr);
    let largestUnit2 = coerceLargestUnit(options2);
    const relativeToInternals = refineRelativeTo2(options2.relativeTo);
    let roundingInc2 = coerceRoundingIncInteger(options2);
    const roundingMode2 = coerceRoundingMode(options2, 7);
    let smallestUnit2 = coerceSmallestUnit(options2);
    return void 0 === largestUnit2 && void 0 === smallestUnit2 && throwRangeError("Required smallestUnit or largestUnit"), null == smallestUnit2 && (smallestUnit2 = 0), null == largestUnit2 && (largestUnit2 = Math.max(smallestUnit2, defaultLargestUnit)), checkLargestSmallestUnit(largestUnit2, smallestUnit2), roundingInc2 = validateRoundingInc(roundingInc2, smallestUnit2, 1), roundingInc2 > 1 && smallestUnit2 > 5 && largestUnit2 !== smallestUnit2 && throwRangeError("For calendar units with roundingIncrement > 1, use largestUnit = smallestUnit"), [largestUnit2, smallestUnit2, roundingInc2, roundingMode2, relativeToInternals];
  })(options, durationLargestUnit, refineRelativeTo);
  if (!relativeToSlots && Math.max(durationLargestUnit, largestUnit) <= 6) {
    return createDurationSlots(validateDurationFields(((durationFields, largestUnit2, smallestUnit2, roundingInc2, roundingMode2) => {
      const roundedBigNano = roundBigNanoToInc(durationDayTimeToBigNano(durationFields), computeBigNanoInc(smallestUnit2, roundingInc2), roundingMode2);
      return {
        ...durationFieldDefaults,
        ...nanoToDurationDayTimeFields(roundedBigNano, largestUnit2)
      };
    })(slots, largestUnit, smallestUnit, roundingInc, roundingMode)));
  }
  relativeToSlots || throwRangeError("Missing relativeTo");
  const isZoned = isZonedEpochSlots(relativeToSlots);
  if (!slots.sign && (!isZoned || largestUnit < 6)) {
    return slots;
  }
  const [balancedDuration, endEpochNano, relativeOps] = spanRelativeDuration(relativeToSlots, slots, largestUnit);
  return createDurationSlots(roundRelativeDuration(balancedDuration, endEpochNano, largestUnit, smallestUnit, roundingInc, roundingMode, relativeOps, isZoned));
}
function absDuration(slots) {
  return -1 === slots.sign ? negateDuration(slots) : slots;
}
function negateDuration(slots) {
  return createDurationSlots(negateDurationFields(slots));
}
function negateDurationFields(fields) {
  const res = {};
  for (const fieldName of durationFieldNamesAsc) {
    res[fieldName] = -1 * fields[fieldName] || 0;
  }
  return res;
}
function computeDurationSign(fields, fieldNames = durationFieldNamesAsc) {
  let sign = 0;
  for (const fieldName of fieldNames) {
    const fieldSign = Math.sign(fields[fieldName]);
    fieldSign && (sign && sign !== fieldSign && throwRangeError("Cannot mix duration signs"), sign = fieldSign);
  }
  return sign;
}
function validateDurationFields(fields) {
  for (const calendarUnit of durationCalendarFieldNamesAsc) {
    validateDurationCalendarUnit(calendarUnit, fields[calendarUnit]);
  }
  const bigNano = durationDayTimeToBigNano(fields);
  return validateDurationTimeUnit(Number(bigNano / bigNanoInSec)), fields;
}
function validateDurationCalendarUnit(unit, value) {
  return clampEntity(unit, value, -4294967295, 4294967295, 1);
}
function validateDurationTimeUnit(n) {
  Number.isSafeInteger(n) || throwRangeError("Out-of-bounds duration");
}
function durationDayTimeToBigNano(fields) {
  return BigInt(fields.days) * bigNanoInUtcDay + durationTimeToBigNano(fields);
}
function durationTimeToBigNano(fields) {
  return BigInt(fields.hours) * bigNanoInHour + BigInt(fields.minutes) * bigNanoInMinute + durationSubMinuteToBigNano(fields);
}
function durationSubMinuteToBigNano(fields) {
  return BigInt(fields.seconds) * bigNanoInSec + BigInt(fields.milliseconds) * bigNanoInMilli + BigInt(fields.microseconds) * bigNanoInMicro + BigInt(fields.nanoseconds);
}
function nanoToDurationDayTimeFields(bigNano, largestUnit = 6) {
  const days = Number(bigNano / bigNanoInUtcDay);
  const timeNano = Number(bigNano % bigNanoInUtcDay);
  const unitNano = unitNanoMap[largestUnit];
  const largestUnitVal = largestUnit <= 3 ? Number(bigNano / BigInt(unitNano)) : days * (nanoInUtcDay / unitNano) + divTrunc(timeNano, unitNano);
  Number.isFinite(largestUnitVal) || throwRangeError(outOfBoundsDate), largestUnit <= 3 && Math.abs(largestUnitVal) / (nanoInSec2 / unitNanoMap[largestUnit]) >= maxDurationSeconds && throwRangeError(outOfBoundsDate);
  const dayTimeFields = nanoToGivenFields(timeNano, largestUnit, durationFieldNamesAsc);
  return dayTimeFields[durationFieldNamesAsc[largestUnit]] = largestUnitVal, dayTimeFields;
}
function nanoToDurationTimeFields(nano, largestUnit = 5) {
  return nanoToGivenFields(nano, largestUnit, durationFieldNamesAsc);
}
function durationHasDateParts(fields) {
  return Boolean(computeDurationSign(fields, durationDateFieldNamesAsc));
}
function getMaxDurationUnit(fields) {
  let unit = 9;
  for (; unit > 0 && !fields[durationFieldNamesAsc[unit]]; unit--) {
  }
  return unit;
}
function compareZonedEpochSlots(zonedEpochSlots0, zonedEpochSlots1) {
  return compareBigInts(zonedEpochSlots0.epochNanoseconds, zonedEpochSlots1.epochNanoseconds);
}
function compareDurations(refineRelativeTo, durationSlots0, durationSlots1, options) {
  const relativeToSlots = refineRelativeTo(normalizeOptions(options).relativeTo);
  const maxUnit = Math.max(getMaxDurationUnit(durationSlots0), getMaxDurationUnit(durationSlots1));
  return allPropsEqual(durationFieldNamesAsc, durationSlots0, durationSlots1) ? 0 : isUniformUnit(maxUnit, relativeToSlots && isZonedEpochSlots(relativeToSlots)) ? compareBigInts(durationDayTimeToBigNano(durationSlots0), durationDayTimeToBigNano(durationSlots1)) : (relativeToSlots || throwRangeError("Missing relativeTo"), compareBigInts(moveRelativeEndpointToEpochNano(relativeToSlots, durationSlots0), moveRelativeEndpointToEpochNano(relativeToSlots, durationSlots1)));
}
function compareIsoDateTimeFields(isoDateTime0, isoDateTime1) {
  return compareIsoDateFields(isoDateTime0, isoDateTime1) || compareTimeFields(isoDateTime0, isoDateTime1);
}
function compareIsoDateFields(isoDate0, isoDate1) {
  return compareNumbers(isoDateToEpochDays(isoDate0), isoDateToEpochDays(isoDate1));
}
function compareTimeFields(timeFields0, timeFields1) {
  return compareNumbers(timeFieldsToNano(timeFields0), timeFieldsToNano(timeFields1));
}
function instantsEqual(instantSlots0, instantSlots1) {
  return !compareZonedEpochSlots(instantSlots0, instantSlots1);
}
function zonedDateTimesEqual(zonedDateTimeSlots0, zonedDateTimeSlots1) {
  return !compareZonedEpochSlots(zonedDateTimeSlots0, zonedDateTimeSlots1) && zonedDateTimeSlots0.timeZone.m === zonedDateTimeSlots1.timeZone.m && zonedDateTimeSlots0.calendar === zonedDateTimeSlots1.calendar;
}
function plainDateTimesEqual(plainDateTimeSlots0, plainDateTimeSlots1) {
  return !compareIsoDateTimeFields(plainDateTimeSlots0, plainDateTimeSlots1) && plainDateTimeSlots0.calendar === plainDateTimeSlots1.calendar;
}
function plainDatesEqual(plainDateSlots0, plainDateSlots1) {
  return !compareIsoDateFields(plainDateSlots0, plainDateSlots1) && plainDateSlots0.calendar === plainDateSlots1.calendar;
}
function plainYearMonthsEqual(plainYearMonthSlots0, plainYearMonthSlots1) {
  return !compareIsoDateFields(plainYearMonthSlots0, plainYearMonthSlots1) && plainYearMonthSlots0.calendar === plainYearMonthSlots1.calendar;
}
function plainMonthDaysEqual(plainMonthDaySlots0, plainMonthDaySlots1) {
  return !compareIsoDateFields(plainMonthDaySlots0, plainMonthDaySlots1) && plainMonthDaySlots0.calendar === plainMonthDaySlots1.calendar;
}
function plainTimesEqual(plainTimeSlots0, plainTimeSlots1) {
  return !compareTimeFields(plainTimeSlots0, plainTimeSlots1);
}
function getCalendarEraOrigins(calendar2) {
  return 0 === calendar2 ? gregoryEraOrigins : calendar2 ? calendar2.k : void 0;
}
function getCalendarFieldNames(calendar2, fieldNames, fieldNamesWithEra = fieldNames) {
  return getCalendarEraOrigins(calendar2) ? fieldNamesWithEra : fieldNames;
}
function resolveCalendarYear(fields, calendar2) {
  const exoticCalendar = calendar2 || void 0;
  const eraOrigins = getCalendarEraOrigins(calendar2);
  let { era, eraYear, year } = fields;
  if (void 0 !== year && (year = toIntegerWithTrunc(year, "year")), void 0 !== eraYear && (eraYear = toIntegerWithTrunc(eraYear, "eraYear")), void 0 !== era || void 0 !== eraYear) {
    void 0 !== era && void 0 !== eraYear || throwTypeError("Mismatching era/eraYear"), eraOrigins || throwRangeError("Forbidden era/eraYear");
    const normalizedEra = normalizeEraName(era);
    const eraOrigin = eraOrigins[normalizedEra];
    void 0 === eraOrigin && throwRangeError(((era2) => `Invalid era: ${era2}`)(era));
    const yearByEra = exoticCalendar?._ ? exoticCalendar._(eraYear, normalizedEra, eraOrigin) : eraYearToYear(eraYear, eraOrigin);
    void 0 !== year && year !== yearByEra && throwRangeError("Mismatching year/eraYear"), year = yearByEra;
  } else {
    void 0 === year && throwTypeError(missingYear(eraOrigins));
  }
  return year;
}
function resolveCalendarMonth(fields, calendar2, year, monthCodeParts, overflow) {
  let { month, monthCode } = fields;
  if (void 0 !== monthCode) {
    const monthByCode = ((calendar3, monthCode2, year2, overflow2, monthCodeParts2 = parseMonthCode(monthCode2)) => {
      const leapMonth = calendar3 ? calendar3.p(year2) : void 0;
      const [monthCodeNumber, wantsLeapMonth] = monthCodeParts2;
      let month2 = monthCodeNumberToMonth(monthCodeNumber, wantsLeapMonth, leapMonth);
      if (wantsLeapMonth) {
        const leapMonthMeta = calendar3 ? calendar3.l : void 0;
        void 0 === leapMonthMeta && throwRangeError(invalidLeapMonth), leapMonthMeta > 0 ? (month2 > leapMonthMeta && throwRangeError(invalidLeapMonth), leapMonth !== month2 && (1 === overflow2 && throwRangeError(invalidLeapMonth), month2 = monthCodeNumberToMonth(monthCodeNumber, 0, leapMonth))) : (month2 !== -leapMonthMeta && throwRangeError(invalidLeapMonth), void 0 === leapMonth && 1 === overflow2 && throwRangeError(invalidLeapMonth));
      }
      return month2;
    })(calendar2, monthCode, year, overflow, monthCodeParts);
    void 0 !== month && month !== monthByCode && throwRangeError("Mismatching month/monthCode"), month = monthByCode, overflow = 1;
  } else {
    void 0 === month && throwTypeError("Missing month/monthCode");
  }
  return clampEntity("month", month, 1, computeCalendarMonthsInYearForYear(calendar2, year), overflow);
}
function resolveCalendarDay(fields, calendar2, year, month, overflow) {
  return clampProp(fields, "day", 1, computeCalendarDaysInMonthForYearMonth(calendar2, year, month), overflow);
}
function eraYearToYear(eraYear, eraOrigin) {
  return (eraOrigin + eraYear) * (Math.sign(eraOrigin) || 1) || 0;
}
function resolveTimeFields(fields, overflow) {
  return constrainTimeFields(pluckProps(timeFieldNamesAsc, {
    ...timeFieldDefaults,
    ...fields
  }), overflow);
}
var offsetRegExp = /^([+-])([01]\d|2[0-3])(?:(:?)([0-5]\d)(?:\3([0-5]\d)(?:[.,](\d{1,9}))?)?)?$/;
function parseOffsetNano(s) {
  const offsetNano = parseOffsetNanoMaybe(s);
  return void 0 === offsetNano && throwRangeError(failedParse(s)), offsetNano;
}
function parseOffsetNanoMaybe(s, onlyHourMinute) {
  const parts = offsetRegExp.exec(s);
  if (parts) {
    return onlyHourMinute && parts[5] && throwRangeError(failedParse(s)), /* @__PURE__ */ ((s2) => s2 && "+" !== s2 ? -1 : 1)(parts[1]) * (parseInt(parts[2]) * nanoInHour2 + parseInt0(parts[4]) * nanoInMinute2 + parseInt0(parts[5]) * nanoInSec2 + parseSubsecNano(parts[6] || ""));
  }
}
var dateFieldRefiners = {
  era: toString,
  month: toPositiveIntegerWithTruncation,
  monthCode(monthCode, fieldName) {
    return requireString(toPrimitiveWithStringHint(monthCode), fieldName);
  },
  day: toPositiveIntegerWithTruncation
};
var timeFieldRefiners = /* @__PURE__ */ zipPropsConst(timeFieldNamesAsc, toIntegerWithTrunc);
var durationFieldRefiners = /* @__PURE__ */ zipPropsConst(durationFieldNamesAsc, toStrictInteger);
var dateTimeFieldRefiners = /* @__PURE__ */ Object.assign({}, dateFieldRefiners, timeFieldRefiners);
var zonedDateTimeFieldRefiners = {
  offset(offsetString) {
    return parseOffsetNano(requireString(toPrimitiveWithStringHint(offsetString)));
  },
  ...dateTimeFieldRefiners
};
function readAndRefineBagFields(bag, validFieldNames, fieldRefiners, requiredFieldNames, disallowEmpty = !requiredFieldNames) {
  const res = {};
  let anyMatching = 0;
  for (const fieldName of validFieldNames) {
    let fieldVal = bag[fieldName];
    if (void 0 !== fieldVal) {
      anyMatching = 1;
      const refiner = fieldRefiners[fieldName];
      refiner && (fieldVal = refiner(fieldVal, fieldName)), res[fieldName] = fieldVal;
    } else {
      requiredFieldNames && requiredFieldNames.includes(fieldName) && throwTypeError(missingField(fieldName));
    }
  }
  return disallowEmpty && !anyMatching && throwTypeError("No valid fields: " + validFieldNames.join()), res;
}
function refineOverflowOptions(options) {
  return void 0 === options ? 0 : coerceOverflow(requireObjectLike(options));
}
function refineZonedFieldOptions(options, defaultOffsetDisambig = 0) {
  options = normalizeOptions(options);
  const epochDisambig = coerceEpochDisambig(options);
  const offsetDisambig = coerceOffsetDisambig(options, defaultOffsetDisambig);
  return [coerceOverflow(options), offsetDisambig, epochDisambig];
}
function refineEpochDisambigOptions(options) {
  return coerceEpochDisambig(normalizeOptions(options));
}
function refineCalendarDateFields(fields, calendar2, allowMissingDay) {
  const eraOrigins = getCalendarEraOrigins(calendar2);
  void 0 !== fields.year || void 0 !== fields.era && void 0 !== fields.eraYear || throwTypeError(missingYear(eraOrigins)), void 0 === fields.monthCode && void 0 === fields.month && throwTypeError("Missing month/monthCode"), allowMissingDay || void 0 !== fields.day || throwTypeError(missingField("day"));
  const monthCodeParts = parseMonthCodeField(fields);
  return [resolveCalendarYear(fields, calendar2), monthCodeParts];
}
function refineMonthDayFields(fields, calendar2) {
  const isIso = calendar2 === isoCalendarImpl;
  const eraOrigins = getCalendarEraOrigins(calendar2);
  void 0 === fields.day && throwTypeError(missingField("day")), isIso || void 0 === fields.month || void 0 !== fields.year || void 0 !== fields.era && void 0 !== fields.eraYear || throwTypeError(missingYear(eraOrigins));
  const monthCodeParts = parseMonthCodeField(fields);
  return [void 0 !== fields.eraYear || void 0 !== fields.year ? resolveCalendarYear(fields, calendar2) : void 0, monthCodeParts];
}
function createDateTimeFromRefinedFields(isoDate, timeFields = timeFieldDefaults, calendar2) {
  const isoDateTime = combineDateAndTime(isoDate, timeFields);
  return checkIsoDateTimeInBounds(isoDateTime), createDateTimeSlots(isoDateTime, calendar2);
}
function createDateFromRefinedFields(fields, calendar2, year, monthCodeParts, overflow) {
  const month = resolveCalendarMonth(fields, calendar2, year, monthCodeParts, overflow);
  return createDateSlots(checkIsoDateInBounds(computeCalendarIsoFieldsFromParts(calendar2, year, month, resolveCalendarDay(fields, calendar2, year, month, overflow))), calendar2);
}
function createYearMonthFromRefinedFields(fields, calendar2, year, monthCodeParts, overflow) {
  return createYearMonthFromCalendarParts(calendar2, year, resolveCalendarMonth(fields, calendar2, year, monthCodeParts, overflow));
}
function createMonthDayFromRefinedFields(fields, calendar2, year, monthCodeParts, overflow) {
  const isIso = calendar2 === isoCalendarImpl;
  let yearMaybe = year;
  let day;
  let monthCodeNumber;
  let isLeapMonth;
  if (void 0 === yearMaybe && isIso && (yearMaybe = 1972), void 0 !== yearMaybe) {
    isIso || checkIsoDateInBounds(computeCalendarIsoFieldsFromParts(calendar2, yearMaybe, 1, 1));
    const month = resolveCalendarMonth(fields, calendar2, yearMaybe, monthCodeParts, overflow);
    day = resolveCalendarDay(fields, calendar2, yearMaybe, month, overflow), [monthCodeNumber, isLeapMonth] = computeCalendarMonthCodeParts(calendar2, yearMaybe, month);
  } else {
    void 0 === fields.monthCode && throwTypeError("Missing month/monthCode"), [monthCodeNumber, isLeapMonth] = monthCodeParts;
    const referenceYear = calendar2 ? calendar2.re : 1972;
    if (void 0 !== referenceYear) {
      day = resolveCalendarDay(fields, calendar2, referenceYear, resolveCalendarMonth(fields, calendar2, referenceYear, monthCodeParts, overflow), overflow);
    } else {
      const constrainedDay = 0 === overflow && calendar2 ? calendar2.ge?.(monthCodeNumber, isLeapMonth, fields.day) : void 0;
      day = void 0 !== constrainedDay ? constrainedDay : fields.day;
    }
  }
  return createMonthDayFromMonthCodeParts(calendar2, monthCodeNumber, isLeapMonth, day, fields.day, overflow);
}
function createYearMonthFromCalendarParts(calendar2, year, month) {
  return createDateSlots(checkIsoYearMonthInBounds(computeCalendarIsoFieldsFromParts(calendar2, year, month, 1)), calendar2);
}
function createMonthDayFromMonthCodeParts(calendar2, monthCodeNumber, isLeapMonthArg, day, requestedDay, overflow) {
  let isLeapMonth = isLeapMonthArg;
  isLeapMonth && ((calendar2 && calendar2.U?.[monthCodeNumber]) ?? 1 / 0) < requestedDay && (1 === overflow && throwRangeError(invalidLeapMonth), isLeapMonth = 0, day = constrainToRange2(requestedDay, 1, (calendar2 && calendar2.R) ?? 1 / 0));
  let res = calendar2 ? calendar2.u(monthCodeNumber, Boolean(isLeapMonth), day) : computeIsoYearMonthFieldsForMonthDay(monthCodeNumber, Boolean(isLeapMonth));
  for (; !res && 0 === overflow && day > 1; ) {
    day--, res = calendar2 ? calendar2.u(monthCodeNumber, Boolean(isLeapMonth), day) : computeIsoYearMonthFieldsForMonthDay(monthCodeNumber, Boolean(isLeapMonth));
  }
  res || throwRangeError("Cannot guess year");
  const { year: finalYear, month: finalMonth } = res;
  return createDateSlots(checkIsoDateInBounds(computeCalendarIsoFieldsFromParts(calendar2, finalYear, finalMonth, day)), calendar2);
}
function parseMonthCodeField(fields) {
  if (void 0 !== fields.monthCode) {
    return parseMonthCode(fields.monthCode);
  }
}
var RawDateTimeFormat = Intl.DateTimeFormat;
function formatEpochMilliToPartsRecord(intlFormat, epochMilli) {
  epochMilli < -864e13 && throwRangeError(outOfBoundsDate);
  const parts = intlFormat.formatToParts(epochMilli);
  const hash = {};
  for (const part of parts) {
    hash[part.type] = part.value;
  }
  return hash;
}
var timeZonePeriodDaysByName = {
  "El_Aaiun": 16,
  "Tucuman": 12,
  "Tirane": 11,
  "Riga": 10,
  "Simferopol": 9,
  "Vienna": 9,
  "Tunis": 8,
  "Boa_Vista": 6,
  "Fortaleza": 6,
  "Maceio": 6,
  "Noronha": 6,
  "Recife": 6,
  "Gaza": 6,
  "Hebron": 6,
  "DeNoronha": 6
};
var minPossibleTransitionSec = -4e9;
function refineTimeDisplayTuple(options, maxSmallestUnit = 4) {
  const subsecDigits = coerceFractionalSecondDigits(options);
  const roundingMode = coerceRoundingMode(options, 4);
  const smallestUnit = coerceSmallestUnit(options);
  return [roundingMode, ...resolveSmallestUnitAndSubsecDigits(validateUnitRange(smallestUnitStr, smallestUnit, 0, maxSmallestUnit), subsecDigits)];
}
function refineDateDisplayOptions(options) {
  return coerceCalendarDisplay(normalizeOptions(options));
}
function refineTimeDisplayOptions(options, maxSmallestUnit) {
  return refineTimeDisplayTuple(normalizeOptions(options), maxSmallestUnit);
}
function resolveSmallestUnitAndSubsecDigits(smallestUnit, subsecDigits) {
  return null != smallestUnit ? [unitNanoMap[smallestUnit], smallestUnit < 4 ? 9 - 3 * smallestUnit : -1] : [void 0 === subsecDigits ? 1 : 10 ** (9 - subsecDigits), subsecDigits];
}
function formatInstantIso(refineTimeZoneString, instantSlots, options) {
  const [timeZoneArg, roundingMode, nanoInc, subsecDigits] = ((options2) => {
    const subsecDigits2 = coerceFractionalSecondDigits(options2 = normalizeOptions(options2));
    const roundingMode2 = coerceRoundingMode(options2, 4);
    const smallestUnit = coerceSmallestUnit(options2);
    return [options2.timeZone, roundingMode2, ...resolveSmallestUnitAndSubsecDigits(validateUnitRange(smallestUnitStr, smallestUnit, 0, 4), subsecDigits2)];
  })(options);
  const providedTimeZone = void 0 !== timeZoneArg;
  return ((providedTimeZone2, timeZone, epochNano, roundingMode2, nanoInc2, subsecDigits2) => {
    epochNano = roundBigNanoToDayOriginInc(epochNano, BigInt(nanoInc2), roundingMode2);
    const offsetNano = timeZone.B(epochNano);
    return formatIsoDateTimeFields(epochNanoToIsoDateTime(epochNano + BigInt(offsetNano)), subsecDigits2) + (providedTimeZone2 ? formatOffsetNano(roundToMinute(offsetNano)) : "Z");
  })(providedTimeZone, queryTimeZone(providedTimeZone ? refineTimeZoneString(timeZoneArg) : "UTC"), instantSlots.epochNanoseconds, roundingMode, nanoInc, subsecDigits);
}
function formatZonedDateTimeIso(zonedDateTimeSlots0, options) {
  const displayOptions = ((options2) => {
    options2 = normalizeOptions(options2);
    const calendarDisplay = coerceCalendarDisplay(options2);
    const subsecDigits = coerceFractionalSecondDigits(options2);
    const offsetDisplay = coerceOffsetDisplay(options2);
    const roundingMode = coerceRoundingMode(options2, 4);
    const smallestUnit = coerceSmallestUnit(options2);
    return [calendarDisplay, coerceTimeZoneDisplay(options2), offsetDisplay, roundingMode, ...resolveSmallestUnitAndSubsecDigits(validateUnitRange(smallestUnitStr, smallestUnit, 0, 4), subsecDigits)];
  })(options);
  return ((calendar2, timeZoneId, timeZone, epochNano, calendarDisplay, timeZoneDisplay, offsetDisplay, roundingMode, nanoInc, subsecDigits) => {
    epochNano = roundBigNanoToDayOriginInc(epochNano, BigInt(nanoInc), roundingMode);
    const offsetNano = timeZone.B(epochNano);
    return formatIsoDateTimeFields(epochNanoToIsoDateTime(epochNano + BigInt(offsetNano)), subsecDigits) + formatOffsetNano(roundToMinute(offsetNano), offsetDisplay) + formatTimeZone(timeZoneId, timeZoneDisplay) + formatCalendar(calendar2, calendarDisplay);
  })(zonedDateTimeSlots0.calendar, zonedDateTimeSlots0.timeZone.id, zonedDateTimeSlots0.timeZone, zonedDateTimeSlots0.epochNanoseconds, ...displayOptions);
}
function formatPlainDateTimeIso(plainDateTimeSlots0, options) {
  const displayOptions = ((options2) => (options2 = normalizeOptions(options2), [coerceCalendarDisplay(options2), ...refineTimeDisplayTuple(options2)]))(options);
  return ((calendar2, isoDateTime, calendarDisplay, roundingMode, nanoInc, subsecDigits) => formatIsoDateTimeFields(roundDateTimeToInc(isoDateTime, nanoInc, roundingMode), subsecDigits) + formatCalendar(calendar2, calendarDisplay))(plainDateTimeSlots0.calendar, plainDateTimeSlots0, ...displayOptions);
}
function formatPlainDateIso(plainDateSlots, options) {
  return calendar2 = plainDateSlots.calendar, isoDate = plainDateSlots, calendarDisplay = refineDateDisplayOptions(options), formatIsoDateFields(isoDate) + formatCalendar(calendar2, calendarDisplay);
  var calendar2, isoDate, calendarDisplay;
}
function formatPlainYearMonthIso(plainYearMonthSlots, options) {
  return formatDateLikeIso(plainYearMonthSlots.calendar, formatIsoYearMonthFields, plainYearMonthSlots, refineDateDisplayOptions(options));
}
function formatPlainMonthDayIso(plainMonthDaySlots, options) {
  return formatDateLikeIso(plainMonthDaySlots.calendar, formatIsoMonthDayFields, plainMonthDaySlots, refineDateDisplayOptions(options));
}
function formatDateLikeIso(calendar2, formatSimple, isoDate, calendarDisplay) {
  const showCalendar = calendarDisplay > 1 || 0 === calendarDisplay && calendar2 !== isoCalendarImpl;
  return 1 === calendarDisplay ? calendar2 === isoCalendarImpl ? formatSimple(isoDate) : formatIsoDateFields(isoDate) : showCalendar ? formatIsoDateFields(isoDate) + formatCalendarId(getCalendarSlotId(calendar2), 2 === calendarDisplay) : formatSimple(isoDate);
}
function formatPlainTimeIso(slots, options) {
  return ((fields, roundingMode, nanoInc, subsecDigits) => formatTimeFields(roundTimeToInc(fields, nanoInc, roundingMode)[0], subsecDigits))(slots, ...refineTimeDisplayOptions(options));
}
function formatDurationIso(slots, options) {
  const [roundingMode, nanoInc, subsecDigits] = refineTimeDisplayOptions(options, 3);
  return nanoInc > 1 && ((slots = {
    ...slots,
    ...roundDayTimeDurationByInc(slots, nanoInc, roundingMode)
  }).sign = computeDurationSign(slots), validateDurationFields(slots)), formatDurationSlots(slots, subsecDigits);
}
function formatDurationSlots(durationSlots, subsecDigits) {
  const { sign } = durationSlots;
  const abs = -1 === sign ? negateDurationFields(durationSlots) : durationSlots;
  const { hours, minutes } = abs;
  const bigNano = durationSubMinuteToBigNano(abs);
  const wholeSec = Number(bigNano / bigNanoInSec);
  const subsecNano = Number(bigNano % bigNanoInSec);
  validateDurationTimeUnit(wholeSec);
  const subsecNanoString = formatSubsecNano(subsecNano, subsecDigits);
  const forceSec = subsecDigits >= 0 || !sign || subsecNanoString;
  return (sign < 0 ? "-" : "") + "P" + formatDurationFragments({
    "Y": formatDurationNumber(abs.years),
    "M": formatDurationNumber(abs.months),
    "W": formatDurationNumber(abs.weeks),
    "D": formatDurationNumber(abs.days)
  }) + (hours || minutes || wholeSec || forceSec ? "T" + formatDurationFragments({
    "H": formatDurationNumber(hours),
    "M": formatDurationNumber(minutes),
    "S": formatDurationNumber(wholeSec, forceSec) + subsecNanoString
  }) : "");
}
function formatDurationFragments(fragObj) {
  const parts = [];
  for (const fragName in fragObj) {
    const fragVal = fragObj[fragName];
    fragVal && parts.push(fragVal, fragName);
  }
  return parts.join("");
}
function formatDurationNumber(n, force) {
  if (!n && !force) {
    return "";
  }
  const options = /* @__PURE__ */ Object.create(null);
  return options.useGrouping = 0, n.toLocaleString("fullwide", options);
}
function formatIsoDateTimeFields(isoDateTime, subsecDigits) {
  return formatIsoDateFields(isoDateTime) + "T" + formatTimeFields(isoDateTime, subsecDigits);
}
function formatIsoDateFields(isoDate) {
  return formatIsoYearMonthFields(isoDate) + "-" + padNumber2(isoDate.day);
}
function formatIsoYearMonthFields(isoDate) {
  const { year } = isoDate;
  return (year < 0 || year > 9999 ? getSignStr(year) + padNumber(6, Math.abs(year)) : padNumber(4, year)) + "-" + padNumber2(isoDate.month);
}
function formatIsoMonthDayFields(isoDate) {
  return padNumber2(isoDate.month) + "-" + padNumber2(isoDate.day);
}
function formatTimeFields(timeFields, subsecDigits) {
  const parts = [padNumber2(timeFields.hour), padNumber2(timeFields.minute)];
  return -1 !== subsecDigits && parts.push(padNumber2(timeFields.second) + ((millisecond, microsecond, nanosecond, subsecDigits2) => formatSubsecNano(millisecond * nanoInMilli2 + microsecond * nanoInMicro2 + nanosecond, subsecDigits2))(timeFields.millisecond, timeFields.microsecond, timeFields.nanosecond, subsecDigits)), parts.join(":");
}
function formatOffsetNano(offsetNano, offsetDisplay = 0) {
  if (1 === offsetDisplay) {
    return "";
  }
  const [hour, nanoRemainder0] = divModFloor(Math.abs(offsetNano), nanoInHour2);
  const [minute, nanoRemainder1] = divModFloor(nanoRemainder0, nanoInMinute2);
  const [second, nanoRemainder2] = divModFloor(nanoRemainder1, nanoInSec2);
  return getSignStr(offsetNano) + padNumber2(hour) + ":" + padNumber2(minute) + (second || nanoRemainder2 ? ":" + padNumber2(second) + formatSubsecNano(nanoRemainder2) : "");
}
function formatTimeZone(timeZoneId, timeZoneDisplay) {
  return 1 !== timeZoneDisplay ? "[" + (2 === timeZoneDisplay ? "!" : "") + timeZoneId + "]" : "";
}
function formatCalendar(calendar2, calendarDisplay) {
  return calendarDisplay > 1 || 0 === calendarDisplay && calendar2 !== isoCalendarImpl ? formatCalendarId(getCalendarSlotId(calendar2), 2 === calendarDisplay) : "";
}
function formatCalendarId(calendarId, isCritical) {
  return "[" + (isCritical ? "!" : "") + "u-ca=" + calendarId + "]";
}
var trailingZerosRE = /0+$/;
function formatSubsecNano(totalNano, subsecDigits) {
  let s = padNumber(9, totalNano);
  return s = void 0 === subsecDigits ? s.replace(trailingZerosRE, "") : s.slice(0, subsecDigits), s ? "." + s : "";
}
function getSignStr(num) {
  return num < 0 ? "-" : "+";
}
var icuRegExp = /^(AC|AE|AG|AR|AS|BE|BS|CA|CN|CS|CT|EA|EC|IE|IS|JS|MI|NE|NS|PL|PN|PR|PS|SS|VS)T$/;
var badCharactersRegExp = /[^\w\/:+-]+/;
function refineTimeZoneId(rawId) {
  return resolveTimeZoneId(requireString(rawId));
}
function resolveTimeZoneId(rawId) {
  return resolveTimeZoneRecord(rawId).id;
}
var resolveTimeZoneRecord = /* @__PURE__ */ memoize((rawId) => {
  const upperRawId = rawId.toUpperCase();
  const offsetRecord = ((upperRawId2) => {
    const offsetNano = parseOffsetNanoMaybe(upperRawId2, 1);
    if (void 0 !== offsetNano) {
      return {
        id: formatOffsetNano(offsetNano),
        Z: offsetNano,
        m: offsetNano
      };
    }
  })(upperRawId);
  if (offsetRecord) {
    return {
      kind: "fixed",
      ...offsetRecord
    };
  }
  const normId = "UTC" === upperRawId ? "UTC" : ((rawId2) => (badCharactersRegExp.test(rawId2) && throwRangeError(invalidTimeZone(rawId2)), icuRegExp.test(rawId2) && throwRangeError("Forbidden ICU TimeZone"), rawId2.toLowerCase().split("/").map((part, partI) => (part.length <= 3 || /\d/.test(part)) && !/etc|yap/.test(part) ? part.toUpperCase() : part.replace(/baja|dumont|[a-z]+/g, (a, i) => a.length <= 2 && !partI || "in" === a || "chat" === a ? a.toUpperCase() : a.length > 2 || !i ? capitalize(a).replace(/island|noronha|murdo|rivadavia|urville/, capitalize) : a)).join("/")))(rawId);
  return queryNamedTimeZoneRecord(normId);
});
var queryNamedTimeZoneRecord = /* @__PURE__ */ memoize((normId) => {
  if ("UTC" === normId) {
    return {
      kind: "utc",
      id: normId,
      m: normId
    };
  }
  const format = (upperNormId = normId.toUpperCase(), new RawDateTimeFormat("en-u-hc-h23", {
    calendar: "iso8601",
    timeZone: upperNormId,
    era: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  }));
  var upperNormId;
  return {
    kind: "named",
    id: normId,
    format,
    m: format.resolvedOptions().timeZone
  };
});
function queryTimeZone(rawTimeZoneId) {
  const record = resolveTimeZoneRecord(rawTimeZoneId);
  return queryTimeZoneRecord(record.id, record);
}
var queryTimeZoneRecord = /* @__PURE__ */ memoize((normTimeZoneId, record) => "named" === record.kind ? new IntlTimeZone(normTimeZoneId, record.m, record.format) : new FixedTimeZone(normTimeZoneId, record.m, "fixed" === record.kind ? record.Z : 0));
var FixedTimeZone = class {
  constructor(id, compareKey, offsetNano) {
    this.id = id, this.m = compareKey, this.Z = offsetNano;
  }
  B() {
    return this.Z;
  }
  O(isoDateTime) {
    return [isoDateTimeAndOffsetToEpochNano(isoDateTime, this.Z)];
  }
  C() {
  }
};
var IntlTimeZone = class {
  constructor(id, compareKey, format) {
    this.id = id, this.m = compareKey, this.me = ((computeOffsetSec, periodDays) => {
      const getSample = memoize(computeOffsetSec);
      const getSplit = memoize(createSplitTuple);
      const periodSec = 86400 * periodDays;
      function getOffsetSec(epochSec) {
        const [startEpochSec, endEpochSec] = computePeriod(epochSec, periodSec);
        const clampedStartEpochSec = clampIntlSampleEpochSec(startEpochSec);
        const clampedEndEpochSec = clampIntlSampleEpochSec(endEpochSec);
        const startOffsetSec = getSample(clampedStartEpochSec);
        const endOffsetSec = getSample(clampedEndEpochSec);
        return startOffsetSec === endOffsetSec ? startOffsetSec : pinch(getSplit(clampedStartEpochSec, clampedEndEpochSec), startOffsetSec, endOffsetSec, epochSec);
      }
      function searchTransition(searchEpochSec, direction, searchLimit, epochSec = searchEpochSec) {
        let [startEpochSec, endEpochSec] = computePeriod(searchEpochSec, periodSec);
        const inc = periodSec * direction;
        const inBounds = () => direction < 0 ? endEpochSec > searchLimit : startEpochSec < searchLimit;
        for (; inBounds(); ) {
          const clampedStartEpochSec = clampIntlSampleEpochSec(startEpochSec);
          const clampedEndEpochSec = clampIntlSampleEpochSec(endEpochSec);
          const startOffsetSec = getSample(clampedStartEpochSec);
          const endOffsetSec = getSample(clampedEndEpochSec);
          if (startOffsetSec !== endOffsetSec) {
            const split = getSplit(clampedStartEpochSec, clampedEndEpochSec);
            pinch(split, startOffsetSec, endOffsetSec);
            const transitionEpochSec = split[0];
            if ((compareNumbers(transitionEpochSec, epochSec) || 1) === direction) {
              return transitionEpochSec;
            }
          }
          startEpochSec += inc, endEpochSec += inc;
        }
      }
      function pinch(split, startOffsetSec, endOffsetSec, forEpochSec) {
        let offsetSec;
        let splitDurSec;
        for (; (void 0 === forEpochSec || void 0 === (offsetSec = forEpochSec < split[0] ? startOffsetSec : forEpochSec >= split[1] ? endOffsetSec : void 0)) && (splitDurSec = split[1] - split[0]); ) {
          const middleEpochSec = split[0] + Math.floor(splitDurSec / 2);
          computeOffsetSec(middleEpochSec) === endOffsetSec ? split[1] = middleEpochSec : split[0] = middleEpochSec + 1;
        }
        return offsetSec;
      }
      return {
        Ae(zonedEpochSec) {
          const wideOffsetSec0 = getOffsetSec(zonedEpochSec - 86400);
          const wideOffsetSec1 = getOffsetSec(zonedEpochSec + 86400);
          const wideUtcEpochSec0 = zonedEpochSec - wideOffsetSec0;
          const wideUtcEpochSec1 = zonedEpochSec - wideOffsetSec1;
          if (wideOffsetSec0 === wideOffsetSec1) {
            return [wideUtcEpochSec0];
          }
          const narrowOffsetSec0 = getOffsetSec(wideUtcEpochSec0);
          return narrowOffsetSec0 === getOffsetSec(wideUtcEpochSec1) ? [zonedEpochSec - narrowOffsetSec0] : wideOffsetSec0 > wideOffsetSec1 ? [wideUtcEpochSec0, wideUtcEpochSec1] : [];
        },
        ze: getOffsetSec,
        C(epochSec, direction) {
          if (!(direction > 0 && epochSec >= 864e10)) {
            if (direction < 0) {
              if (epochSec <= minPossibleTransitionSec) {
                return;
              }
              return epochSec > 4e9 ? searchTransition(epochSec, -1, epochSec - 94867200) ?? searchTransition(4e9, -1, minPossibleTransitionSec) : searchTransition(epochSec, -1, minPossibleTransitionSec);
            }
            return searchTransition(Math.max(epochSec, minPossibleTransitionSec) - 1, 1, Math.max(epochSec, Math.floor(Date.now() / 1e3)) + 94867200, epochSec);
          }
        }
      };
    })(/* @__PURE__ */ ((format2) => (epochSec) => {
      const intlParts = formatEpochMilliToPartsRecord(format2, 1e3 * epochSec);
      return 86400 * isoPartsToEpochDays(((intlParts2) => {
        const relatedYear = intlParts2.relatedYear;
        if (void 0 !== relatedYear) {
          return parseInt(relatedYear);
        }
        const year = parseInt(intlParts2.year);
        return void 0 !== intlParts2.era && "bce" === normalizeEraName(intlParts2.era) ? 1 - year : year;
      })(intlParts), parseInt(intlParts.month), parseInt(intlParts.day)) + 3600 * parseInt(intlParts.hour) + 60 * parseInt(intlParts.minute) + parseInt(intlParts.second) - epochSec;
    })(format), ((timeZoneId) => {
      const timeZoneName = timeZoneId.split("/").pop();
      return timeZonePeriodDaysByName[timeZoneName] || 19;
    })(id));
  }
  B(epochNano) {
    return this.me.ze(((epochNano2) => epochNanoToSecMod(epochNano2)[0])(epochNano)) * nanoInSec2;
  }
  O(isoDateTime) {
    const zonedEpochSec = 86400 * isoDateToEpochDays(isoDateTime) + timeFieldsToSec(isoDateTime);
    const subsecNano = timeFieldsToSubsecNano(isoDateTime);
    return this.me.Ae(zonedEpochSec).map((epochSec) => checkEpochNanoInBounds(BigInt(epochSec) * bigNanoInSec + BigInt(subsecNano)));
  }
  C(epochNano, direction) {
    const [epochSec, subsecNano] = epochNanoToSecMod(epochNano);
    const resEpochSec = this.me.C(epochSec + (direction > 0 || subsecNano ? 1 : 0), direction);
    if (void 0 !== resEpochSec) {
      return BigInt(resEpochSec) * bigNanoInSec;
    }
  }
};
function createSplitTuple(startEpochSec, endEpochSec) {
  return [startEpochSec, endEpochSec];
}
function computePeriod(epochSec, periodSec) {
  const startEpochSec = Math.floor(epochSec / periodSec) * periodSec;
  return [startEpochSec, startEpochSec + periodSec];
}
function clampIntlSampleEpochSec(epochSec) {
  return constrainToRange2(epochSec, -1e10, 864e10);
}
function refineMaybeZonedDateTimeObjectLike(refineTimeZoneString, calendar2, bag) {
  const fields = readAndRefineBagFields(bag, getCalendarFieldNames(calendar2, dateTimeAndZoneFieldNamesAlpha, dateTimeAndZoneFieldNamesWithEraAlpha), zonedDateTimeFieldRefiners, [], 0);
  const isZoned = void 0 !== fields.timeZone;
  const [year, monthCodeParts] = refineCalendarDateFields(fields, calendar2);
  const isoDate = createDateFromRefinedFields(fields, calendar2, year, monthCodeParts, 0);
  if (isZoned) {
    const timeFields = resolveTimeFields(fields);
    const timeZone = queryTimeZone(refineTimeZoneString(fields.timeZone));
    return {
      epochNanoseconds: getMatchingInstantFor(timeZone, combineDateAndTime(isoDate, timeFields), fields.offset),
      timeZone,
      calendar: calendar2
    };
  }
  return isoDate;
}
function refineZonedDateTimeObjectLike(refineTimeZoneString, calendar2, bag, options) {
  const fields = readAndRefineBagFields(bag, getCalendarFieldNames(calendar2, dateTimeAndZoneFieldNamesAlpha, dateTimeAndZoneFieldNamesWithEraAlpha), zonedDateTimeFieldRefiners, timeZoneFieldNames, 0);
  const timeZoneId = refineTimeZoneString(fields.timeZone);
  const [year, monthCodeParts] = refineCalendarDateFields(fields, calendar2);
  const [overflow, offsetDisambig, epochDisambig] = refineZonedFieldOptions(options);
  const isoDate = createDateFromRefinedFields(fields, calendar2, year, monthCodeParts, overflow);
  const timeFields = resolveTimeFields(fields, overflow);
  const timeZone = queryTimeZone(timeZoneId);
  return createZonedEpochNanoSlots(getMatchingInstantFor(timeZone, combineDateAndTime(isoDate, timeFields), fields.offset, offsetDisambig, epochDisambig), timeZone, calendar2);
}
function refinePlainDateTimeObjectLike(calendar2, bag, options) {
  const fields = readAndRefineBagFields(bag, getCalendarFieldNames(calendar2, dateTimeFieldNamesAlpha, dateTimeFieldNamesWithEraAlpha), dateTimeFieldRefiners, [], 0);
  const [year, monthCodeParts] = refineCalendarDateFields(fields, calendar2);
  const overflow = refineOverflowOptions(options);
  return createDateTimeFromRefinedFields(createDateFromRefinedFields(fields, calendar2, year, monthCodeParts, overflow), resolveTimeFields(fields, overflow), calendar2);
}
function refinePlainDateObjectLike(calendar2, bag, options, requireFields = []) {
  const fields = readAndRefineBagFields(bag, getCalendarFieldNames(calendar2, dateFieldNamesAlpha, dateFieldNamesWithEraAlpha), dateFieldRefiners, requireFields);
  const [year, monthCodeParts] = refineCalendarDateFields(fields, calendar2);
  return createDateFromRefinedFields(fields, calendar2, year, monthCodeParts, refineOverflowOptions(options));
}
function refinePlainYearMonthObjectLike(calendar2, bag, options, requireFields) {
  const fields = readAndRefineBagFields(bag, getCalendarFieldNames(calendar2, yearMonthFieldNamesAlpha, yearMonthFieldNamesWithEraAlpha), dateFieldRefiners, requireFields);
  const [year, monthCodeParts] = refineCalendarDateFields(fields, calendar2, 1);
  return createYearMonthFromRefinedFields(fields, calendar2, year, monthCodeParts, refineOverflowOptions(options));
}
function refinePlainMonthDayObjectLike(calendar2, calendarAbsent, bag, options) {
  const fields = readAndRefineBagFields(bag, getCalendarFieldNames(calendar2, dateFieldNamesAlpha, dateFieldNamesWithEraAlpha), dateFieldRefiners, dayFieldNamesAsc, 0);
  calendarAbsent && void 0 !== fields.month && void 0 === fields.monthCode && void 0 === fields.year && (fields.year = 1972);
  const [year, monthCodeParts] = refineMonthDayFields(fields, calendar2);
  return createMonthDayFromRefinedFields(fields, calendar2, year, monthCodeParts, refineOverflowOptions(options));
}
function refinePlainTimeObjectLike(bag, options) {
  return resolveTimeFields(readAndRefineBagFields(bag, timeFieldNamesAlpha, timeFieldRefiners, [], 1), refineOverflowOptions(options));
}
function refineDurationObjectLike(bag) {
  const durationFields = readAndRefineBagFields(bag, durationFieldNamesAlpha, durationFieldRefiners);
  return createDurationSlots(validateDurationFields({
    ...durationFieldDefaults,
    ...durationFields
  }));
}
function throwFailedParse(s) {
  throwRangeError(failedParse(s));
}
function parseInstant(s) {
  const organized = parseDateTimeLike(s = requireString(toPrimitiveWithStringHint(s)));
  let offsetNano;
  return organized || throwFailedParse(s), organized.I ? offsetNano = 0 : organized.offset ? offsetNano = parseOffsetNano(organized.offset) : throwFailedParse(s), createEpochNanoSlots(isoDateTimeAndOffsetToEpochNano(organized, offsetNano));
}
function parseRelativeToSlots(s, resolveCalendar) {
  const organized = parseDateTimeLike(requireString(s));
  return organized && organized.timeZoneId ? finalizeZonedDateTime(organized, resolveCalendar, void 0) : finalizeDate(parsePlainDateLike(s), resolveCalendar);
}
function parseZonedDateTime(s, resolveCalendar, options) {
  const organized = parseDateTimeLike(requireString(s));
  return organized && organized.timeZoneId || throwFailedParse(s), finalizeZonedDateTime(organized, resolveCalendar, options);
}
function parsePlainDateTime(s, resolveCalendar) {
  const organized = parsePlainDateLike(s);
  return checkIsoDateTimeInBounds(organized), {
    ...combineDateAndTime(organized, organized),
    calendar: resolveCalendar(organized.calendarId)
  };
}
function parsePlainDate(s, resolveCalendar) {
  return finalizeDate(parsePlainDateLike(s), resolveCalendar);
}
function parsePlainYearMonth(s, resolveCalendar) {
  const organized = parseYearMonthOnly(requireString(s)) || parsePlainDateLike(s);
  const calendar2 = resolveCalendar(organized.calendarId);
  return createDateSlots(checkIsoYearMonthInBounds(moveToStartOfMonth(calendar2, checkIsoYearMonthInBounds(organized))), calendar2);
}
function parsePlainMonthDay(s, resolveCalendar) {
  const organized = parseMonthDayOnly(requireString(s)) || parsePlainDateLike(s);
  if ("iso8601" === organized.calendarId) {
    return createDateSlots({
      ...organized,
      year: 1972
    }, resolveCalendar("iso8601"));
  }
  const { calendar: calendar2 } = finalizeDate(organized, resolveCalendar);
  const { year: origYear, month: origMonth, day } = computeCalendarDateFields(calendar2, organized);
  const [monthCodeNumber, isLeapMonth] = computeCalendarMonthCodeParts(calendar2, origYear, origMonth);
  const yearMonthFields = calendar2 ? calendar2.u(monthCodeNumber, isLeapMonth, day) : computeIsoYearMonthFieldsForMonthDay(monthCodeNumber, isLeapMonth);
  return yearMonthFields || throwRangeError("Cannot guess year"), createDateSlots(checkIsoDateInBounds(computeCalendarIsoFieldsFromParts(calendar2, yearMonthFields.year, yearMonthFields.month, day)), calendar2);
}
function parsePlainTime(s) {
  const organized = parseDateTimeLike(s = requireString(s)) || parseTimeOnly(s);
  return (!organized || !organized.qe || organized.I || parseYearMonthOnly(s) || parseMonthDayOnly(s)) && throwFailedParse(s), createTimeSlots(organized);
}
function parseDuration(s) {
  const parts = durationRegExp.exec(requireString(s));
  parts && !invalidDurationRegExp.test(s) || throwFailedParse(s);
  const fraction = nanoToGivenFields(3600 * parseSubsecNano(parts[7] || "") + 60 * parseSubsecNano(parts[9] || "") + parseSubsecNano(parts[11] || ""), 4, durationFieldNamesAsc);
  const durationFields = {
    ...fraction,
    years: parseInt0(parts[2]),
    months: parseInt0(parts[3]),
    weeks: parseInt0(parts[4]),
    days: parseInt0(parts[5]),
    hours: parseInt0(parts[6]),
    minutes: parseInt0(parts[8]) + fraction.minutes,
    seconds: parseInt0(parts[10]) + fraction.seconds
  };
  return createDurationSlots(validateDurationFields("-" === parts[1] ? negateDurationFields(durationFields) : durationFields));
}
function parseCalendarId(s) {
  const organized = parseDateTimeLike(s) || parseYearMonthOnly(s) || parseMonthDayOnly(s) || parseTimeOnly(s);
  return organized ? organized.calendarId : s;
}
function parseTimeZoneId(s) {
  const parsed = parseDateTimeLike(s);
  return parsed && (parsed.timeZoneId || parsed.I && "UTC" || parsed.offset) || s;
}
function parsePlainDateLike(s) {
  const organized = parseDateTimeLike(requireString(s));
  return organized && !organized.I || throwFailedParse(s), organized;
}
function finalizeZonedDateTime(organized, resolveCalendar, options) {
  const timeZone = queryTimeZone(resolveTimeZoneId(organized.timeZoneId));
  let epochNano;
  if (organized.qe) {
    const offsetNano = organized.offset ? parseOffsetNano(organized.offset) : void 0;
    const [, offsetDisambig, epochDisambig] = refineZonedFieldOptions(options);
    epochNano = getMatchingInstantFor(timeZone, organized, offsetNano, offsetDisambig, epochDisambig, !(timeZone.Z || void 0 === organized.offset || (offset = organized.offset, offset.length > 6)), organized.I);
  } else {
    refineZonedFieldOptions(options), epochNano = getStartOfDayInstantFor(timeZone, organized);
  }
  var offset;
  return checkEpochNanoInBounds(epochNano), createZonedEpochNanoSlots(epochNano, timeZone, resolveCalendar(organized.calendarId));
}
function finalizeDate(organized, resolveCalendar) {
  return createDateSlots(checkIsoDateInBounds(organized), resolveCalendar(organized.calendarId));
}
function timeRegExpStr(separatorIndex, leapSecondStr = "") {
  return `([01]\\d|2[0-3])(?:(:?)([0-5]\\d)(?:\\${separatorIndex}([0-5]\\d${leapSecondStr})(?:[.,](\\d{1,9}))?)?)?`;
}
var dateTimeRegExpStr = "((?!-0{6})[+-]\\d{6}|\\d{4})(-?)(0[1-9]|1[0-2])\\2(0[1-9]|[12]\\d|3[01])(?:[Tt ]" + timeRegExpStr(6, "|60") + "(?:([Zz])|(([+-])" + timeRegExpStr(14) + "))?)?";
var yearMonthRegExp = /* @__PURE__ */ createRegExp("((?!-0{6})[+-]\\d{6}|\\d{4})-?(0[1-9]|1[0-2])(?:\\[!?([+-](?:[01]\\d|2[0-3])(?::?[0-5]\\d)?|[a-zA-Z._][\\w.+-]*(?:/[a-zA-Z._][\\w.+-]*)*)\\])?((?:\\[!?[a-z_][a-z\\d_-]*=[a-zA-Z\\d]+(?:-[a-zA-Z\\d]+)*\\])*)");
var monthDayRegExp = /* @__PURE__ */ createRegExp("(?:--)?(0[1-9]|1[0-2])-?(0[1-9]|[12]\\d|3[01])(?:\\[!?([+-](?:[01]\\d|2[0-3])(?::?[0-5]\\d)?|[a-zA-Z._][\\w.+-]*(?:/[a-zA-Z._][\\w.+-]*)*)\\])?((?:\\[!?[a-z_][a-z\\d_-]*=[a-zA-Z\\d]+(?:-[a-zA-Z\\d]+)*\\])*)");
var dateTimeRegExp = /* @__PURE__ */ createRegExp(dateTimeRegExpStr + "(?:\\[!?([+-](?:[01]\\d|2[0-3])(?::?[0-5]\\d)?|[a-zA-Z._][\\w.+-]*(?:/[a-zA-Z._][\\w.+-]*)*)\\])?((?:\\[!?[a-z_][a-z\\d_-]*=[a-zA-Z\\d]+(?:-[a-zA-Z\\d]+)*\\])*)");
var annotationRegExp = /\[(!?)([^=]+)=([^\]]+)/g;
var durationRegExp = /^([+-])?P(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(?:T(?:(\d+)(?:[.,](\d{1,9}))?H)?(?:(\d+)(?:[.,](\d{1,9}))?M)?(?:(\d+)(?:[.,](\d{1,9}))?S)?)?$/i;
var invalidDurationRegExp = /[PT]$|[.,]\d+[HMS]./i;
function parseDateTimeLike(s) {
  const parts = dateTimeRegExp.exec(s);
  if (!parts) {
    return;
  }
  const organized = ((parts2) => ({
    year: parseInt(parts2[1]),
    month: parseInt(parts2[3]),
    day: parseInt(parts2[4]),
    ...nanoToTimeAndDay(parseSubsecNano(parts2[9] || ""))[0],
    hour: parseInt0(parts2[5]),
    minute: parseInt0(parts2[7]),
    second: Math.min(parseInt0(parts2[8]), 59),
    ...organizeAnnotationParts(parts2[18], parts2[19]),
    qe: !!parts2[5],
    I: !!parts2[10],
    offset: parts2[11]
  }))(parts);
  return validateIsoDateFields(organized);
}
function parseYearMonthOnly(s) {
  const parts = yearMonthRegExp.exec(s);
  return parts ? requireIsoCalendar(((parts2) => ({
    year: parseInt(parts2[1]),
    month: parseInt(parts2[2]),
    day: 1,
    ...organizeAnnotationParts(parts2[3], parts2[4])
  }))(parts)) : void 0;
}
function parseMonthDayOnly(s) {
  const parts = monthDayRegExp.exec(s);
  if (parts) {
    const organized = ((parts2) => ({
      year: 1972,
      month: parseInt(parts2[1]),
      day: parseInt(parts2[2]),
      ...organizeAnnotationParts(parts2[3], parts2[4])
    }))(parts);
    if (allPropsEqual(calendarDateFieldNamesAsc, isoDate = organized, constrainIsoDateFields(isoDate))) {
      return requireIsoCalendar(organized);
    }
  }
  var isoDate;
}
function requireIsoCalendar(organized) {
  return "iso8601" !== organized.calendarId && throwFailedParse(organized.calendarId), organized;
}
function parseTimeOnly(s) {
  const organized = parseDateTimeLike(s.replace(/^t?/i, "0000-01-01T"));
  return organized && !organized.I ? organized : void 0;
}
function organizeAnnotationParts(timeZoneId, s) {
  let calendarIsCritical;
  const calendarIds = [];
  return s.replace(annotationRegExp, (whole, criticalStr, key, value) => ("u-ca" === key ? (calendarIds.push(value.toLowerCase()), calendarIsCritical || (calendarIsCritical = criticalStr)) : criticalStr && throwFailedParse(whole), "")), calendarIds.length > 1 && calendarIsCritical && throwFailedParse(s), {
    timeZoneId,
    calendarId: calendarIds[0] || "iso8601"
  };
}
function mergeCalendarFields(calendar2, baseFields, additionalFields) {
  const merged = Object.assign(/* @__PURE__ */ Object.create(null), baseFields);
  return spliceFields(merged, additionalFields, monthFieldNames), getCalendarEraOrigins(calendar2) && (spliceFields(merged, additionalFields, allYearFieldNames), calendar2 && calendar2.je && spliceFields(merged, additionalFields, monthDayFieldNames, eraYearFieldNames)), merged;
}
function spliceFields(dest, additional, allPropNames, deletablePropNames) {
  let anyMatching = 0;
  const nonMatchingPropNames = [];
  for (const propName of allPropNames) {
    void 0 !== additional[propName] ? anyMatching = 1 : nonMatchingPropNames.push(propName);
  }
  if (Object.assign(dest, additional), anyMatching) {
    for (const deletablePropName of deletablePropNames || nonMatchingPropNames) {
      delete dest[deletablePropName];
    }
  }
}
function mergeZonedDateTimeFields(calendar2, zonedDateTimeSlots, modFields) {
  const validFieldNames = getCalendarFieldNames(calendar2, dateTimeAndOffsetFieldNamesAlpha, dateTimeAndOffsetFieldNamesWithEraAlpha);
  const zonedSlots = zonedEpochSlotsToIso(zonedDateTimeSlots);
  const { year, month, day } = computeCalendarDateFields(calendar2, zonedSlots);
  const origFields = {
    year,
    monthCode: computeMonthCode(calendar2, year, month),
    day,
    hour: zonedSlots.hour,
    minute: zonedSlots.minute,
    second: zonedSlots.second,
    millisecond: zonedSlots.millisecond,
    microsecond: zonedSlots.microsecond,
    nanosecond: zonedSlots.nanosecond,
    offset: zonedSlots.offsetNanoseconds
  };
  const partialFields = readAndRefineBagFields(modFields, validFieldNames, zonedDateTimeFieldRefiners);
  const mergedCalendarFields = mergeCalendarFields(calendar2, origFields, partialFields);
  return [{
    ...origFields,
    ...partialFields
  }, mergedCalendarFields];
}
function mergeDateTimeFields(calendar2, plainDateTimeSlots, modFields) {
  const validFieldNames = getCalendarFieldNames(calendar2, dateTimeFieldNamesAlpha, dateTimeFieldNamesWithEraAlpha);
  const { year, month, day } = computeCalendarDateFields(calendar2, plainDateTimeSlots);
  const origFields = {
    year,
    monthCode: computeMonthCode(calendar2, year, month),
    day,
    hour: plainDateTimeSlots.hour,
    minute: plainDateTimeSlots.minute,
    second: plainDateTimeSlots.second,
    millisecond: plainDateTimeSlots.millisecond,
    microsecond: plainDateTimeSlots.microsecond,
    nanosecond: plainDateTimeSlots.nanosecond
  };
  const partialFields = readAndRefineBagFields(modFields, validFieldNames, dateTimeFieldRefiners);
  const mergedCalendarFields = mergeCalendarFields(calendar2, origFields, partialFields);
  return [{
    ...origFields,
    ...partialFields
  }, mergedCalendarFields];
}
function mergeDateFields(calendar2, plainDateSlots, modFields) {
  const validFieldNames = getCalendarFieldNames(calendar2, dateFieldNamesAlpha, dateFieldNamesWithEraAlpha);
  const { year, month, day } = computeCalendarDateFields(calendar2, plainDateSlots);
  return mergeCalendarFields(calendar2, {
    year,
    monthCode: computeMonthCode(calendar2, year, month),
    day
  }, readAndRefineBagFields(modFields, validFieldNames, dateFieldRefiners));
}
function mergeYearMonthFields(calendar2, plainYearMonthSlots, modFields) {
  const validFieldNames = getCalendarFieldNames(calendar2, yearMonthFieldNamesAlpha, yearMonthFieldNamesWithEraAlpha);
  const { year, month } = computeCalendarDateFields(calendar2, plainYearMonthSlots);
  return mergeCalendarFields(calendar2, {
    year,
    monthCode: computeMonthCode(calendar2, year, month)
  }, readAndRefineBagFields(modFields, validFieldNames, dateFieldRefiners));
}
function mergeMonthDayFields(calendar2, plainMonthDaySlots, modFields) {
  const validFieldNames = getCalendarFieldNames(calendar2, dateFieldNamesAlpha, dateFieldNamesWithEraAlpha);
  const { year, month, day } = computeCalendarDateFields(calendar2, plainMonthDaySlots);
  return mergeCalendarFields(calendar2, {
    monthCode: computeMonthCode(calendar2, year, month),
    day
  }, readAndRefineBagFields(modFields, validFieldNames, dateFieldRefiners));
}
function createZonedDateTimeFromMergedFields(zonedDateTimeSlots, mergedAllFields, calendarFields, year, monthCodeParts, overflow, offsetDisambig, epochDisambig) {
  const { calendar: calendar2, timeZone } = zonedDateTimeSlots;
  return createZonedEpochNanoSlots(getMatchingInstantFor(timeZone, combineDateAndTime(createDateFromRefinedFields(calendarFields, calendar2, year, monthCodeParts, overflow), constrainTimeFields(mergedAllFields, overflow)), mergedAllFields.offset, offsetDisambig, epochDisambig), timeZone, calendar2);
}
function createDateTimeFromMergedFields(mergedAllFields, calendarFields, calendar2, year, monthCodeParts, overflow) {
  return createDateTimeFromRefinedFields(createDateFromRefinedFields(calendarFields, calendar2, year, monthCodeParts, overflow), constrainTimeFields(mergedAllFields, overflow), calendar2);
}
function mergeTimeFields(initialFields, modFields) {
  return {
    ...pluckProps(timeFieldNamesAlpha, initialFields),
    ...readAndRefineBagFields(modFields, timeFieldNamesAlpha, timeFieldRefiners)
  };
}
function mergeDurationFields(slots, fields) {
  return createDurationSlots((initialFields = slots, modFields = fields, validateDurationFields({
    ...initialFields,
    ...readAndRefineBagFields(modFields, durationFieldNamesAlpha, durationFieldRefiners)
  })));
  var initialFields, modFields;
}
function computeMonthCode(calendar2, year, month) {
  const [monthCodeNumber, isLeapMonth] = computeCalendarMonthCodeParts(calendar2, year, month);
  return formatMonthCode(monthCodeNumber, isLeapMonth);
}
function totalDuration(refineRelativeTo, slots, options) {
  const [totalUnit, relativeToSlots] = ((options2, refineRelativeTo2) => {
    const relativeToInternals = refineRelativeTo2((options2 = normalizeOptionsOrString(options2, "unit")).relativeTo);
    let totalUnit2 = coerceTotalUnit(options2);
    return totalUnit2 = requirePropDefined("unit", totalUnit2), [totalUnit2, relativeToInternals];
  })(options, refineRelativeTo);
  const maxDurationUnit = getMaxDurationUnit(slots);
  const maxUnit = Math.max(totalUnit, maxDurationUnit);
  const isZoned = relativeToSlots && isZonedEpochSlots(relativeToSlots);
  if (!relativeToSlots && isUniformUnit(maxUnit, isZoned)) {
    return totalDayTimeDuration(slots, totalUnit);
  }
  if (relativeToSlots || throwRangeError("Missing relativeTo"), !slots.sign && (!isZoned || totalUnit < 6)) {
    return 0;
  }
  const [balancedDuration, endEpochNano, relativeOps] = spanRelativeDuration(relativeToSlots, slots, totalUnit);
  return isUniformUnit(totalUnit, isZoned) ? totalDayTimeDuration(balancedDuration, totalUnit) : ((durationFields, endEpochNano2, totalUnit2, relativeOps2) => {
    const fieldName = durationFieldNamesAsc[totalUnit2];
    const baseDurationFields = clearDurationFields(totalUnit2, durationFields);
    return totalRelativeUnit(durationFields[fieldName], computeDurationSign(durationFields) || 1, endEpochNano2, (value) => (baseDurationFields[fieldName] = value, moveRelativeMarkerToEpochNano(relativeOps2, baseDurationFields)));
  })(balancedDuration, endEpochNano, totalUnit, relativeOps);
}
function totalDayTimeDuration(durationFields, totalUnit) {
  return divideBigNanoToExactNumber(durationDayTimeToBigNano(durationFields), unitNanoMap[totalUnit]);
}
function instantToZonedDateTime(instantSlots, timeZone, calendar2) {
  return createZonedEpochNanoSlots(instantSlots.epochNanoseconds, timeZone, calendar2);
}
function zonedDateTimeToInstant(zonedDateTimeSlots0) {
  return createEpochNanoSlots(zonedDateTimeSlots0.epochNanoseconds);
}
function zonedDateTimeToDateTime(zonedDateTimeSlots0) {
  return createDateTimeSlots(zonedEpochSlotsToIso(zonedDateTimeSlots0), zonedDateTimeSlots0.calendar);
}
function zonedDateTimeToDate(zonedDateTimeSlots0) {
  return createDateSlots(zonedEpochSlotsToIso(zonedDateTimeSlots0), zonedDateTimeSlots0.calendar);
}
function zonedDateTimeToTime(zonedDateTimeSlots0) {
  return createTimeSlots(zonedEpochSlotsToIso(zonedDateTimeSlots0));
}
function dateTimeToZonedDateTime(plainDateTimeSlots, timeZone, epochDisambig) {
  return createZonedEpochNanoSlots(checkEpochNanoInBounds(getSingleInstantFor(timeZone, plainDateTimeSlots, epochDisambig)), timeZone, plainDateTimeSlots.calendar);
}
function dateToZonedDateTime(plainDateSlots, timeZone, timeFields) {
  let epochNano;
  return epochNano = timeFields ? getSingleInstantFor(timeZone, combineDateAndTime(plainDateSlots, timeFields)) : getStartOfDayInstantFor(timeZone, combineDateAndTime(plainDateSlots, timeFieldDefaults)), createZonedEpochNanoSlots(epochNano, timeZone, plainDateSlots.calendar);
}
function yearMonthToDate(calendar2, input, bag) {
  return mergeFieldsIntoDate(calendar2, pluckProps(getCalendarFieldNames(calendar2, yearMonthCodeFieldNamesAlpha, yearMonthCodeFieldNamesWithEraAlpha), input), readAndRefineBagFields(requireObjectLike(bag), dayFieldNamesAsc, dateFieldRefiners, []));
}
function monthDayToDate(calendar2, input, bag) {
  const extraFieldNames = getCalendarFieldNames(calendar2, yearFieldNamesAsc, yearFieldNamesWithEraAlpha);
  return mergeFieldsIntoDate(calendar2, pluckProps(monthCodeDayFieldNamesAlpha, input), readAndRefineBagFields(requireObjectLike(bag), extraFieldNames, dateFieldRefiners, []));
}
function fieldsToMonthDay(calendar2, input) {
  const refinedFields = readAndRefineBagFields(input, monthCodeDayFieldNamesAlpha, dateFieldRefiners);
  const [year, monthCodeParts] = refineMonthDayFields(refinedFields, calendar2);
  return createMonthDayFromRefinedFields(refinedFields, calendar2, year, monthCodeParts, 0);
}
function fieldsToYearMonth(calendar2, input) {
  const refinedFields = readAndRefineBagFields(input, getCalendarFieldNames(calendar2, yearMonthCodeFieldNamesAlpha, yearMonthCodeFieldNamesWithEraAlpha), dateFieldRefiners);
  const [year, monthCodeParts] = refineCalendarDateFields(refinedFields, calendar2, 1);
  return createYearMonthFromRefinedFields(refinedFields, calendar2, year, monthCodeParts, 0);
}
function mergeFieldsIntoDate(calendar2, inputFields, extraFields) {
  const mergedFieldNames = getCalendarFieldNames(calendar2, yearMonthCodeDayFieldNamesAlpha, yearMonthCodeDayFieldNamesWithEraAlpha);
  let mergedFields = mergeCalendarFields(calendar2, inputFields, extraFields);
  mergedFields = readAndRefineBagFields(mergedFields, mergedFieldNames, dateFieldRefiners, []);
  const [year, monthCodeParts] = refineCalendarDateFields(mergedFields, calendar2);
  return createDateFromRefinedFields(mergedFields, calendar2, year, monthCodeParts, 0);
}
function epochMilliToInstant(epochMilli) {
  return createEpochNanoSlots(checkEpochNanoInBounds(BigInt(toStrictInteger(epochMilli)) * bigNanoInMilli));
}
function epochNanoToInstant(epochNano) {
  return createEpochNanoSlots(checkEpochNanoInBounds(toBigInt(epochNano)));
}
function applyPlainFormatTimeZone(options) {
  return options.timeZone = "UTC", ["full", "long"].includes(options.timeStyle) && (options.timeStyle = "medium"), options;
}
function applyZonedFormatTimeZone(options, timeZoneId) {
  return void 0 !== options.timeZone && throwTypeError("Cannot specify TimeZone"), options.timeZone = timeZoneId, options;
}
function checkResolvedCalendarCompatible(format, slots, strictCalendarCheck) {
  const resolvedCalendarId = format.resolvedOptions().calendar;
  !strictCalendarCheck && slots.calendar === isoCalendarImpl || getCalendarSlotId(slots.calendar) === resolvedCalendarId || throwRangeError("Mismatching Calendars");
}
function createOptionsTransformer(shapeFieldNames, invalidShapeFieldNames, ignoredFieldNames, defaultShapeFields, dateStyleReplacementFields) {
  const shapeFieldNameSet = new Set(shapeFieldNames);
  const invalidShapeFieldNameSet = new Set(invalidShapeFieldNames);
  const ignoredFieldNameSet = new Set(ignoredFieldNames);
  return (options, allowPartialOverlap) => {
    let dateStyle;
    let timeStyle;
    const granularShapeFields = {};
    const modifierFields = {};
    const otherFields = {};
    let hasInvalidGranularShapeFields = 0;
    let hasInvalidStyleFields = 0;
    for (const name of Object.keys(options)) {
      const value = options[name];
      void 0 === value || ignoredFieldNameSet.has(name) || (shapeFieldNameSet.has(name) ? "dateStyle" === name ? dateStyle = value : "timeStyle" === name ? timeStyle = value : granularShapeFields[name] = value : "era" === name ? modifierFields[name] = value : invalidShapeFieldNameSet.has(name) ? "dateStyle" === name || "timeStyle" === name ? hasInvalidStyleFields = 1 : hasInvalidGranularShapeFields = 1 : otherFields[name] = value);
    }
    const hasDateStyle = void 0 !== dateStyle;
    const hasTimeStyle = void 0 !== timeStyle;
    const hasAnyStyle = hasDateStyle || hasTimeStyle;
    const hasGranularShapeFields = Object.keys(granularShapeFields).length > 0;
    const hasInvalids = hasInvalidGranularShapeFields || hasInvalidStyleFields;
    const hasShapeFields = hasGranularShapeFields || hasDateStyle || hasTimeStyle;
    const hasModifierFields = Object.keys(modifierFields).length > 0;
    (!allowPartialOverlap && hasInvalids || allowPartialOverlap && hasInvalids && !hasShapeFields || hasAnyStyle && (hasGranularShapeFields || hasModifierFields || hasInvalidGranularShapeFields)) && throwTypeError("Invalid formatting options");
    const transformedOptions = {};
    return hasAnyStyle || hasShapeFields || Object.assign(transformedOptions, defaultShapeFields), Object.assign(transformedOptions, granularShapeFields, modifierFields, otherFields), hasDateStyle && (dateStyleReplacementFields ? Object.assign(transformedOptions, dateStyleReplacementFields[dateStyle]) : transformedOptions.dateStyle = dateStyle), hasTimeStyle && (transformedOptions.timeStyle = timeStyle), transformedOptions;
  };
}
var dateDefaultShapeFields = {
  year: "numeric",
  month: "numeric",
  day: "numeric"
};
var timeDefaultShapeFields = {
  hour: "numeric",
  minute: "numeric",
  second: "numeric"
};
var dateTimeDefaultShapeFields = /* @__PURE__ */ Object.assign({}, dateDefaultShapeFields, timeDefaultShapeFields);
var dateShapeFieldNames = ["weekday", "year", "month", "day", "dateStyle"];
var timeShapeFieldNames = ["dayPeriod", "hour", "minute", "second", "fractionalSecondDigits", "timeStyle"];
var dateTimeShapeFieldNames = /* @__PURE__ */ dateShapeFieldNames.concat(timeShapeFieldNames);
var yearMonthIgnoredFieldNames = /* @__PURE__ */ ["weekday", "day"].concat(timeShapeFieldNames);
var monthDayIgnoredFieldNames = /* @__PURE__ */ ["weekday", "year"].concat(timeShapeFieldNames);
var transformInstantOptions = /* @__PURE__ */ createOptionsTransformer(dateTimeShapeFieldNames, [], [], dateTimeDefaultShapeFields);
var transformZonedOptions = /* @__PURE__ */ createOptionsTransformer(dateTimeShapeFieldNames, [], [], {
  ...dateTimeDefaultShapeFields,
  timeZoneName: "short"
});
var transformDateTimeOptions = /* @__PURE__ */ createOptionsTransformer(dateTimeShapeFieldNames, [], ["timeZoneName"], dateTimeDefaultShapeFields);
var transformDateOptions = /* @__PURE__ */ createOptionsTransformer(dateShapeFieldNames, timeShapeFieldNames, ["timeZoneName"], dateDefaultShapeFields);
var transformTimeOptions = /* @__PURE__ */ createOptionsTransformer(timeShapeFieldNames, dateShapeFieldNames, ["timeZoneName", "era"], timeDefaultShapeFields);
var transformYearMonthOptions = /* @__PURE__ */ createOptionsTransformer(["year", "month", "dateStyle"], yearMonthIgnoredFieldNames, ["timeZoneName"], {
  year: "numeric",
  month: "numeric"
}, {
  full: {
    year: "numeric",
    month: "long"
  },
  long: {
    year: "numeric",
    month: "long"
  },
  medium: {
    year: "numeric",
    month: "short"
  },
  short: {
    year: "2-digit",
    month: "numeric"
  }
});
var transformMonthDayOptions = /* @__PURE__ */ createOptionsTransformer(["month", "day", "dateStyle"], monthDayIgnoredFieldNames, ["timeZoneName", "era"], {
  month: "numeric",
  day: "numeric"
}, {
  full: {
    month: "long",
    day: "numeric"
  },
  long: {
    month: "long",
    day: "numeric"
  },
  medium: {
    month: "short",
    day: "numeric"
  },
  short: {
    month: "numeric",
    day: "numeric"
  }
});
function zonedDateTimeWithPlainTime(zonedDateTimeSlots, plainTimeFields) {
  const { timeZone } = zonedDateTimeSlots;
  const newIsoDateTime = combineDateAndTime(zonedEpochSlotsToIso(zonedDateTimeSlots), plainTimeFields || timeFieldDefaults);
  return createZonedEpochNanoSlots(plainTimeFields ? getSingleInstantFor(timeZone, newIsoDateTime) : getStartOfDayInstantFor(timeZone, newIsoDateTime), timeZone, zonedDateTimeSlots.calendar);
}
function refineDirectionOptions(options) {
  const normalizedOptions = normalizeOptionsOrString(options, "direction");
  const res = coerceDirection(normalizedOptions, 0);
  return res || throwRangeError(invalidEntity2("direction", res)), res;
}
function getCurrentIsoDateTime(timeZone) {
  const epochNano = getCurrentEpochNano();
  const offsetNano = timeZone.B(epochNano);
  return epochNanoToIsoDateTime(epochNano + BigInt(offsetNano));
}
function getCurrentEpochNano() {
  return BigInt(Date.now()) * bigNanoInMilli;
}
function getCurrentTimeZoneId() {
  return new RawDateTimeFormat().resolvedOptions().timeZone || "UTC";
}
function createDateTimeFormatShell(createArgsProvider, transformOptions = identity) {
  const internalsMap = /* @__PURE__ */ new WeakMap();
  function getInternals(format) {
    const internals = internalsMap.get(format);
    return internals || throwTypeError("Invalid calling context"), internals;
  }
  class ShimDateTimeFormat {
    constructor(locales2, options = /* @__PURE__ */ Object.create(null)) {
      const transformedOptions = transformOptions(options);
      const observedOptionNames = [];
      const trackedOptions = new Proxy(/* @__PURE__ */ Object.create(null), {
        get(_target, name) {
          const value = transformedOptions[name];
          return void 0 !== value && observedOptionNames.push(name), value;
        }
      });
      const baseFormat = new RawDateTimeFormat(locales2, trackedOptions);
      const resolvedOptions = baseFormat.resolvedOptions();
      const copiedOptions = pluckProps(observedOptionNames, resolvedOptions);
      internalsMap.set(this, {
        $: createArgsProvider({
          t: baseFormat,
          Ce: resolvedOptions.locale,
          F: copiedOptions,
          Ee: transformedOptions
        }),
        t: baseFormat
      });
    }
    get format() {
      const internals = getInternals(this);
      return internals.we || (internals.we = (record) => {
        const [format, ...rest] = internals.$.A(record);
        return format.format(...rest);
      });
    }
    formatToParts(record) {
      const { $: argsProvider } = getInternals(this);
      const [format, ...rest] = argsProvider.A(record);
      return format.formatToParts(...rest);
    }
    resolvedOptions() {
      return getInternals(this).t.resolvedOptions();
    }
  }
  const { prototype } = ShimDateTimeFormat;
  function DateTimeFormat2(locales2, options) {
    return new ShimDateTimeFormat(locales2, options);
  }
  RawDateTimeFormat.prototype.formatRange && Object.defineProperties(prototype, createPropDescriptors({
    formatRange(record0, record1) {
      const { $: argsProvider } = getInternals(this);
      const [format, epochMilli0, epochMilli1] = argsProvider.v(record0, record1);
      return format.formatRange(epochMilli0, epochMilli1);
    },
    formatRangeToParts(record0, record1) {
      const { $: argsProvider } = getInternals(this);
      const [format, epochMilli0, epochMilli1] = argsProvider.v(record0, record1);
      return format.formatRangeToParts(epochMilli0, epochMilli1);
    }
  }));
  const rawStaticDescriptors = Object.getOwnPropertyDescriptors(RawDateTimeFormat);
  return rawStaticDescriptors.prototype.value = prototype, Object.defineProperties(DateTimeFormat2, rawStaticDescriptors), prototype.constructor = DateTimeFormat2, Object.defineProperties(prototype, createStringTagDescriptors("Intl.DateTimeFormat")), DateTimeFormat2;
}

// node_modules/temporal-polyfill/chunks/root.js
var NativeTemporal = globalThis.Temporal;

// node_modules/temporal-polyfill/chunks/apiHelpers.js
var PlainYearMonthBranding = "PlainYearMonth";
var PlainMonthDayBranding = "PlainMonthDay";
var PlainDateBranding = "PlainDate";
var PlainDateTimeBranding = "PlainDateTime";
var PlainTimeBranding = "PlainTime";
var ZonedDateTimeBranding = "ZonedDateTime";
var InstantBranding = "Instant";
var DurationBranding = "Duration";
function defineTemporalClass(branding, cls, getSlots, ...getterMaps) {
  return Object.defineProperties(cls, createNameDescriptors(branding)), Object.defineProperties(cls.prototype, createStringTagDescriptors("Temporal." + branding)), Object.defineProperties(cls.prototype, mapProps((getter) => ({
    get() {
      return getter(getSlots(this));
    },
    configurable: 1
  }), Object.assign({}, ...getterMaps))), cls;
}
var attachDebugString = "noop" !== noop.name || globalThis.process ? noop : (instance) => {
  Object.defineProperty(instance, "_str_", {
    value: instance.toJSON()
  });
};
function invalidRecordType() {
  throwTypeError(invalidCallingContext);
}
function forbiddenValueOf2() {
  throwTypeError(forbiddenValueOf);
}
var yearMonthFieldGetters$1 = {
  era(slots) {
    return computeCalendarEraFields(slots.calendar, slots).era;
  },
  eraYear(slots) {
    return computeCalendarEraFields(slots.calendar, slots).eraYear;
  },
  year(slots) {
    return computeCalendarDateFields(slots.calendar, slots).year;
  },
  month(slots) {
    return computeCalendarDateFields(slots.calendar, slots).month;
  },
  monthCode(slots) {
    return computeCalendarMonthCode(slots.calendar, slots);
  }
};
var dateFieldGetters$1 = {
  era(slots) {
    return computeCalendarEraFields(slots.calendar, slots).era;
  },
  eraYear(slots) {
    return computeCalendarEraFields(slots.calendar, slots).eraYear;
  },
  year(slots) {
    return computeCalendarDateFields(slots.calendar, slots).year;
  },
  month(slots) {
    return computeCalendarDateFields(slots.calendar, slots).month;
  },
  monthCode(slots) {
    return computeCalendarMonthCode(slots.calendar, slots);
  },
  day(slots) {
    return computeCalendarDateFields(slots.calendar, slots).day;
  }
};
var monthDayFieldGetters$1 = {
  monthCode(slots) {
    return computeCalendarMonthCode(slots.calendar, slots);
  },
  day(slots) {
    return computeCalendarDateFields(slots.calendar, slots).day;
  }
};
var yearMonthDerivedGetters = {
  daysInMonth(slots) {
    return computeCalendarDaysInMonth(slots.calendar, slots);
  },
  daysInYear(slots) {
    return computeCalendarDaysInYear(slots.calendar, slots);
  },
  monthsInYear(slots) {
    return computeCalendarMonthsInYear(slots.calendar, slots);
  },
  inLeapYear(slots) {
    return computeCalendarInLeapYear(slots.calendar, slots);
  }
};
var dateDerivedGetters = {
  dayOfWeek(slots) {
    return computeIsoDayOfWeek(slots);
  },
  dayOfYear(slots) {
    return computeCalendarDayOfYear(slots.calendar, slots);
  },
  weekOfYear(slots) {
    return computeCalendarWeekOfYear(slots.calendar, slots);
  },
  yearOfWeek(slots) {
    return computeCalendarYearOfWeek(slots.calendar, slots);
  },
  daysInWeek() {
    return 7;
  },
  daysInMonth(slots) {
    return computeCalendarDaysInMonth(slots.calendar, slots);
  },
  daysInYear(slots) {
    return computeCalendarDaysInYear(slots.calendar, slots);
  },
  monthsInYear(slots) {
    return computeCalendarMonthsInYear(slots.calendar, slots);
  },
  inLeapYear(slots) {
    return computeCalendarInLeapYear(slots.calendar, slots);
  }
};
function diffInstants(invert, instantSlots0, instantSlots1, options) {
  const [largestUnit, smallestUnit, roundingInc, roundingMode] = refineDiffOptions(invert, options, 3, 5);
  return createDiffDurationSlots(invert, diffEpochNanosRounded(instantSlots0.epochNanoseconds, instantSlots1.epochNanoseconds, largestUnit, smallestUnit, roundingInc, roundingMode));
}
function diffZonedDateTimes(invert, slots0, slots1, options) {
  const calendar2 = getCommonCalendar(slots0.calendar, slots1.calendar);
  const [largestUnit, smallestUnit, roundingInc, roundingMode] = refineDiffOptions(invert, options, 5);
  return createDiffDurationSlots(invert, diffZonedDateTimesRounded(calendar2, slots0, slots1, largestUnit, smallestUnit, roundingInc, roundingMode));
}
function diffDateTimes(invert, plainDateTimeSlots0, plainDateTimeSlots1, options) {
  const calendar2 = getCommonCalendar(plainDateTimeSlots0.calendar, plainDateTimeSlots1.calendar);
  const [largestUnit, smallestUnit, roundingInc, roundingMode] = refineDiffOptions(invert, options, 6);
  return createDiffDurationSlots(invert, diffDateTimesRounded(calendar2, plainDateTimeSlots0, plainDateTimeSlots1, largestUnit, smallestUnit, roundingInc, roundingMode));
}
function diffDates(invert, plainDateSlots0, plainDateSlots1, options) {
  const calendar2 = getCommonCalendar(plainDateSlots0.calendar, plainDateSlots1.calendar);
  const [largestUnit, smallestUnit, roundingInc, roundingMode] = refineDiffOptions(invert, options, 6, 9, 6);
  return createDiffDurationSlots(invert, diffDatesRounded(calendar2, plainDateSlots0, plainDateSlots1, largestUnit, smallestUnit, roundingInc, roundingMode));
}
function diffYearMonths(invert, plainYearMonthSlots0, plainYearMonthSlots1, options) {
  const calendar2 = getCommonCalendar(plainYearMonthSlots0.calendar, plainYearMonthSlots1.calendar);
  const [largestUnit, smallestUnit, roundingInc, roundingMode] = refineDiffOptions(invert, options, 9, 9, 8);
  return createDiffDurationSlots(invert, diffYearMonthsRounded(calendar2, plainYearMonthSlots0, plainYearMonthSlots1, largestUnit, smallestUnit, roundingInc, roundingMode));
}
function diffTimes(invert, plainTimeSlots0, plainTimeSlots1, options) {
  const [largestUnit, smallestUnit, roundingInc, roundingMode] = refineDiffOptions(invert, options, 5, 5);
  return createDiffDurationSlots(invert, diffTimesRounded(plainTimeSlots0, plainTimeSlots1, largestUnit, smallestUnit, roundingInc, roundingMode));
}
function createDiffDurationSlots(invert, durationFields) {
  return createDurationSlots(invert ? negateDurationFields(durationFields) : durationFields);
}
function withDateFields(slots, modFields, options) {
  const { calendar: calendar2 } = slots;
  const fields = mergeDateFields(calendar2, slots, modFields);
  const [year, monthCodeParts] = refineCalendarDateFields(fields, calendar2);
  const overflow = refineOverflowOptions(options);
  return createDateFromRefinedFields(fields, calendar2, year, monthCodeParts, overflow);
}
function withDateTimeFields(slots, modFields, options) {
  const { calendar: calendar2 } = slots;
  const [mergedFields, calendarFields] = mergeDateTimeFields(calendar2, slots, modFields);
  const [year, monthCodeParts] = refineCalendarDateFields(calendarFields, calendar2);
  const overflow = refineOverflowOptions(options);
  return createDateTimeFromMergedFields(mergedFields, calendarFields, calendar2, year, monthCodeParts, overflow);
}
function withYearMonthFields(slots, modFields, options) {
  const { calendar: calendar2 } = slots;
  const fields = mergeYearMonthFields(calendar2, slots, modFields);
  const [year, monthCodeParts] = refineCalendarDateFields(fields, calendar2, 1);
  const overflow = refineOverflowOptions(options);
  return createYearMonthFromRefinedFields(fields, calendar2, year, monthCodeParts, overflow);
}
function withMonthDayFields(slots, modFields, options) {
  const { calendar: calendar2 } = slots;
  const fields = mergeMonthDayFields(calendar2, slots, modFields);
  const [year, monthCodeParts] = refineMonthDayFields(fields, calendar2);
  const overflow = refineOverflowOptions(options);
  return createMonthDayFromRefinedFields(fields, calendar2, year, monthCodeParts, overflow);
}
function withTimeFields(slots, modFields, options) {
  const refinedFields = mergeTimeFields(slots, modFields);
  const overflow = refineOverflowOptions(options);
  return resolveTimeFields(refinedFields, overflow);
}
function withZonedDateTimeFields(slots, modFields, options) {
  const { calendar: calendar2 } = slots;
  const [mergedFields, calendarFields] = mergeZonedDateTimeFields(calendar2, slots, modFields);
  const [year, monthCodeParts] = refineCalendarDateFields(calendarFields, calendar2);
  const [overflow, offsetDisambig, epochDisambig] = refineZonedFieldOptions(options, 2);
  return createZonedDateTimeFromMergedFields(slots, mergedFields, calendarFields, year, monthCodeParts, overflow, offsetDisambig, epochDisambig);
}

// node_modules/temporal-polyfill/chunks/classApi.js
function createDateTimeFormatClass(getTemporalBrandingAndSlots2) {
  return createDateTimeFormatShell((internals) => {
    const getTemporalFormat = memoize((branding) => {
      let options;
      switch (branding) {
        case InstantBranding:
          options = transformInstantOptions(internals.F, 1);
          break;
        case PlainDateTimeBranding:
          options = applyPlainFormatTimeZone(transformDateTimeOptions(internals.F, 1));
          break;
        case PlainDateBranding:
          options = applyPlainFormatTimeZone(transformDateOptions(internals.F, 1));
          break;
        case PlainTimeBranding:
          options = applyPlainFormatTimeZone(transformTimeOptions(internals.F, 1));
          break;
        case PlainYearMonthBranding:
          options = applyPlainFormatTimeZone(transformYearMonthOptions(internals.F, 1));
          break;
        case PlainMonthDayBranding:
          options = applyPlainFormatTimeZone(transformMonthDayOptions(internals.F, 1));
          break;
        default:
          throwTypeError(invalidFormatType(branding));
      }
      return new RawDateTimeFormat(internals.Ce, options);
    });
    return {
      A(formattable) {
        if (void 0 === formattable) {
          return [internals.t];
        }
        const brandingAndSlots = getTemporalBrandingAndSlots2(formattable);
        if (!brandingAndSlots) {
          return [internals.t, Number(formattable)];
        }
        const [branding, slots] = brandingAndSlots;
        const format = getTemporalFormat(branding);
        return checkTemporalDateTimeFormatCompatible(format, branding, slots), [format, temporalDateTimeToEpochMilli(branding, slots)];
      },
      v(start, end) {
        void 0 !== start && void 0 !== end || throwTypeError(mismatchingFormatTypes);
        const startBrandingAndSlots = getTemporalBrandingAndSlots2(start);
        const startEpochMilli = startBrandingAndSlots ? void 0 : Number(start);
        const endBrandingAndSlots = getTemporalBrandingAndSlots2(end);
        const endEpochMilli = endBrandingAndSlots ? void 0 : Number(end);
        if (!startBrandingAndSlots && !endBrandingAndSlots) {
          return [internals.t, startEpochMilli, endEpochMilli];
        }
        startBrandingAndSlots && endBrandingAndSlots || throwTypeError(mismatchingFormatTypes);
        const [startBranding, startSlots] = startBrandingAndSlots;
        const [endBranding, endSlots] = endBrandingAndSlots;
        startBranding !== endBranding && throwTypeError(mismatchingFormatTypes);
        const format = getTemporalFormat(startBranding);
        return checkTemporalDateTimeFormatCompatible(format, startBranding, startSlots), checkTemporalDateTimeFormatCompatible(format, startBranding, endSlots), [format, temporalDateTimeToEpochMilli(startBranding, startSlots), temporalDateTimeToEpochMilli(startBranding, endSlots)];
      }
    };
  });
}
function checkTemporalDateTimeFormatCompatible(format, branding, slots) {
  switch (branding) {
    case InstantBranding:
    case PlainTimeBranding:
      return;
    case PlainDateTimeBranding:
    case PlainDateBranding:
      return void checkResolvedCalendarCompatible(format, slots);
    case PlainYearMonthBranding:
    case PlainMonthDayBranding:
      return void checkResolvedCalendarCompatible(format, slots, 1);
    default:
      throwTypeError(invalidFormatType(branding));
  }
}
function temporalDateTimeToEpochMilli(branding, slots) {
  switch (branding) {
    case InstantBranding:
      return epochNanoToMilli(slots.epochNanoseconds);
    case PlainDateTimeBranding:
      return isoDateTimeToEpochMilli(slots);
    case PlainDateBranding:
    case PlainYearMonthBranding:
    case PlainMonthDayBranding:
      return isoDateToEpochMilli(slots);
    case PlainTimeBranding:
      return timeFieldsToMilli(slots);
    default:
      throwTypeError(invalidFormatType(branding));
  }
}

// node_modules/temporal-polyfill/chunks/classApi-basic.js
function resolveBasicCalendarId(rawCalendarId) {
  const lowerRawCalendarId = requireString(rawCalendarId).toLowerCase();
  return lowerRawCalendarId === isoCalendarId ? isoCalendarImpl : lowerRawCalendarId === gregoryCalendarId ? gregoryCalendarImpl : void throwRangeError(exoticCalendarRequired(rawCalendarId, "temporal-polyfill/full"));
}
function resolveBasicCalendarArg(rawCalendarId = isoCalendarId) {
  return resolveBasicCalendarId(rawCalendarId);
}
var zonedDateTimeSlotsMap = /* @__PURE__ */ new WeakMap();
var ZonedDateTime = /* @__PURE__ */ defineTemporalClass(ZonedDateTimeBranding, class {
  constructor(epochNanoseconds, timeZoneId, calendar2 = void 0) {
    const epochNano = checkEpochNanoInBounds(toBigInt(epochNanoseconds));
    const timeZone = queryTimeZone(refineTimeZoneId(timeZoneId));
    const calendarImpl = resolveBasicCalendarArg(calendar2);
    initZonedDateTime(this, createZonedEpochNanoSlots(epochNano, timeZone, calendarImpl));
  }
  static from(arg, options = void 0) {
    return createZonedDateTime(toZonedDateTimeSlots(arg, options));
  }
  static compare(arg0, arg1) {
    return compareZonedEpochSlots(toZonedDateTimeSlots(arg0), toZonedDateTimeSlots(arg1));
  }
  get calendarId() {
    return getCalendarSlotId(getZonedDateTimeSlots(this).calendar);
  }
  get timeZoneId() {
    return getZonedDateTimeSlots(this).timeZone.id;
  }
  get epochMilliseconds() {
    return epochNanoToMilli(getZonedDateTimeSlots(this).epochNanoseconds);
  }
  get epochNanoseconds() {
    return getZonedDateTimeSlots(this).epochNanoseconds;
  }
  get offset() {
    return formatOffsetNano(zonedEpochSlotsToIso(getZonedDateTimeSlots(this)).offsetNanoseconds);
  }
  get offsetNanoseconds() {
    return zonedEpochSlotsToIso(getZonedDateTimeSlots(this)).offsetNanoseconds;
  }
  get hoursInDay() {
    return computeZonedHoursInDay(getZonedDateTimeSlots(this));
  }
  with(mod3, options = void 0) {
    return createZonedDateTime(withZonedDateTimeFields(getZonedDateTimeSlots(this), validateBag(mod3), options));
  }
  withCalendar(calendarArg) {
    return createZonedDateTime({
      ...getZonedDateTimeSlots(this),
      calendar: refineCalendarArg(calendarArg)
    });
  }
  withTimeZone(timeZoneArg) {
    return createZonedDateTime({
      ...getZonedDateTimeSlots(this),
      timeZone: queryTimeZone(refineTimeZoneArg(timeZoneArg))
    });
  }
  withPlainTime(plainTimeArg = void 0) {
    return createZonedDateTime(zonedDateTimeWithPlainTime(getZonedDateTimeSlots(this), optionalToPlainTimeFields(plainTimeArg)));
  }
  add(durationArg, options = void 0) {
    const slots = getZonedDateTimeSlots(this);
    return createZonedDateTime(moveZonedEpochSlots(slots, toDurationSlots(durationArg), refineOverflowOptions(options)));
  }
  subtract(durationArg, options = void 0) {
    const slots = getZonedDateTimeSlots(this);
    return createZonedDateTime(moveZonedEpochSlots(slots, negateDurationFields(toDurationSlots(durationArg)), refineOverflowOptions(options)));
  }
  until(otherArg, options = void 0) {
    const slots = getZonedDateTimeSlots(this);
    const other = toZonedDateTimeSlots(otherArg);
    return createDuration(diffZonedDateTimes(0, slots, other, options));
  }
  since(otherArg, options = void 0) {
    const slots = getZonedDateTimeSlots(this);
    const other = toZonedDateTimeSlots(otherArg);
    return createDuration(diffZonedDateTimes(1, slots, other, options));
  }
  round(options) {
    const slots = getZonedDateTimeSlots(this);
    const [smallestUnit, roundingInc, roundingMode] = refineRoundingOptions(options);
    return createZonedDateTime(roundZonedEpochSlotsToUnit(slots, smallestUnit, roundingInc, roundingMode));
  }
  startOfDay() {
    return createZonedDateTime(computeZonedStartOfDay(getZonedDateTimeSlots(this)));
  }
  equals(otherArg) {
    return zonedDateTimesEqual(getZonedDateTimeSlots(this), toZonedDateTimeSlots(otherArg));
  }
  toInstant() {
    return createInstant(zonedDateTimeToInstant(getZonedDateTimeSlots(this)));
  }
  toPlainDateTime() {
    return createPlainDateTime(zonedDateTimeToDateTime(getZonedDateTimeSlots(this)));
  }
  toPlainDate() {
    return createPlainDate(zonedDateTimeToDate(getZonedDateTimeSlots(this)));
  }
  toPlainTime() {
    return createPlainTime(zonedDateTimeToTime(getZonedDateTimeSlots(this)));
  }
  toLocaleString(locales2 = void 0, options = {}) {
    const slots = getZonedDateTimeSlots(this);
    const format = new RawDateTimeFormat(locales2, applyZonedFormatTimeZone(transformZonedOptions(options), getZonedTimeZoneId(slots)));
    return checkResolvedCalendarCompatible(format, slots), format.format(epochNanoToMilli(slots.epochNanoseconds));
  }
  toString(options = void 0) {
    return formatZonedDateTimeIso(getZonedDateTimeSlots(this), options);
  }
  toJSON() {
    return formatZonedDateTimeIso(getZonedDateTimeSlots(this));
  }
  getTimeZoneTransition(options) {
    const slots = getZonedDateTimeSlots(this);
    const newEpochNano = slots.timeZone.C(slots.epochNanoseconds, refineDirectionOptions(options));
    return void 0 !== newEpochNano ? createZonedDateTime({
      ...slots,
      epochNanoseconds: newEpochNano
    }) : null;
  }
  valueOf() {
    return forbiddenValueOf2();
  }
}, getZonedDateTimeIsoSlots, dateFieldGetters$1, dateDerivedGetters, timeGetters);
function createZonedDateTime(slots) {
  return initZonedDateTime(Object.create(ZonedDateTime.prototype), slots);
}
function getZonedDateTimeSlots(obj) {
  return getZonedDateTimeSlotsIfPresent(obj) || invalidRecordType();
}
function getZonedDateTimeIsoSlots(obj) {
  const slots = getZonedDateTimeSlots(obj);
  return {
    ...zonedEpochSlotsToIso(slots),
    calendar: slots.calendar
  };
}
function getZonedDateTimeSlotsIfPresent(obj) {
  return zonedDateTimeSlotsMap.get(obj);
}
function toZonedDateTimeSlots(arg, options) {
  if (isObjectLike2(arg)) {
    const ownSlots = getZonedDateTimeSlotsIfPresent(arg);
    if (ownSlots) {
      return refineZonedFieldOptions(options), ownSlots;
    }
    const calendar2 = getCalendarFromBag(arg);
    return refineZonedDateTimeObjectLike(refineTimeZoneArg, calendar2, arg, options);
  }
  return parseZonedDateTime(arg, resolveBasicCalendarId, options);
}
function initZonedDateTime(instance, slots) {
  return zonedDateTimeSlotsMap.set(instance, slots), attachDebugString(instance), instance;
}
function refineTimeZoneArg(arg) {
  if (isObjectLike2(arg)) {
    const slots = getZonedDateTimeSlotsIfPresent(arg);
    return slots || throwTypeError(invalidTimeZone(arg)), slots.timeZone.id;
  }
  return ((arg2) => resolveTimeZoneId(parseTimeZoneId(requireString(arg2))))(arg);
}
var instantSlotsMap = /* @__PURE__ */ new WeakMap();
var Instant = /* @__PURE__ */ defineTemporalClass(InstantBranding, class {
  constructor(epochNanoseconds) {
    const epochNano = checkEpochNanoInBounds(toBigInt(epochNanoseconds));
    initInstant(this, createEpochNanoSlots(epochNano));
  }
  static from(arg) {
    return createInstant(toInstantSlots(arg));
  }
  static fromEpochMilliseconds(epochMilli) {
    return createInstant(epochMilliToInstant(epochMilli));
  }
  static fromEpochNanoseconds(epochNano) {
    return createInstant(epochNanoToInstant(epochNano));
  }
  static compare(a, b) {
    return compareZonedEpochSlots(toInstantSlots(a), toInstantSlots(b));
  }
  get epochMilliseconds() {
    return epochNanoToMilli(getInstantSlots(this).epochNanoseconds);
  }
  get epochNanoseconds() {
    return getInstantSlots(this).epochNanoseconds;
  }
  add(durationArg) {
    const slots = getInstantSlots(this);
    return createInstant(createEpochNanoSlots(moveEpochNano(slots.epochNanoseconds, toDurationSlots(durationArg))));
  }
  subtract(durationArg) {
    const slots = getInstantSlots(this);
    return createInstant(createEpochNanoSlots(moveEpochNano(slots.epochNanoseconds, negateDurationFields(toDurationSlots(durationArg)))));
  }
  until(otherArg, options = void 0) {
    return createDuration(diffInstants(0, getInstantSlots(this), toInstantSlots(otherArg), options));
  }
  since(otherArg, options = void 0) {
    return createDuration(diffInstants(1, getInstantSlots(this), toInstantSlots(otherArg), options));
  }
  round(options) {
    const slots = getInstantSlots(this);
    const [smallestUnit, roundingInc, roundingMode] = refineRoundingOptions(options, 5, 1);
    return createInstant(createEpochNanoSlots(roundBigNanoToDayOriginInc(slots.epochNanoseconds, computeBigNanoInc(smallestUnit, roundingInc), roundingMode)));
  }
  equals(otherArg) {
    return instantsEqual(getInstantSlots(this), toInstantSlots(otherArg));
  }
  toZonedDateTimeISO(timeZoneArg) {
    return createZonedDateTime(instantToZonedDateTime(getInstantSlots(this), queryTimeZone(refineTimeZoneArg(timeZoneArg))));
  }
  toLocaleString(locales2 = void 0, options = {}) {
    const slots = getInstantSlots(this);
    return new RawDateTimeFormat(locales2, transformInstantOptions(options)).format(epochNanoToMilli(slots.epochNanoseconds));
  }
  toString(options = void 0) {
    return formatInstantIso(refineTimeZoneArg, getInstantSlots(this), options);
  }
  toJSON() {
    return formatInstantIso(refineTimeZoneArg, getInstantSlots(this));
  }
  valueOf() {
    return forbiddenValueOf2();
  }
});
function createInstant(slots) {
  return initInstant(Object.create(Instant.prototype), slots);
}
function getInstantSlots(obj) {
  return getInstantSlotsIfPresent(obj) || invalidRecordType();
}
function getInstantSlotsIfPresent(obj) {
  return instantSlotsMap.get(obj);
}
function toInstantSlots(arg) {
  if (isObjectLike2(arg)) {
    const ownSlots = getInstantSlotsIfPresent(arg);
    if (ownSlots) {
      return ownSlots;
    }
    const zonedDateTimeSlots = getZonedDateTimeSlotsIfPresent(arg);
    if (zonedDateTimeSlots) {
      return createEpochNanoSlots(zonedDateTimeSlots.epochNanoseconds);
    }
  }
  return parseInstant(arg);
}
var { toTemporalInstant } = {
  toTemporalInstant() {
    const epochMilli = Date.prototype.valueOf.call(this);
    return createInstant(createEpochNanoSlots(BigInt(requireNumberIsInteger(epochMilli)) * bigNanoInMilli));
  }
};
function initInstant(instance, slots) {
  return instantSlotsMap.set(instance, slots), attachDebugString(instance), instance;
}
var plainMonthDaySlotsMap = /* @__PURE__ */ new WeakMap();
var PlainMonthDay = /* @__PURE__ */ defineTemporalClass(PlainMonthDayBranding, class {
  constructor(isoMonth, isoDay, calendar2 = void 0, referenceIsoYear) {
    const isoMonthInt = toIntegerWithTrunc(isoMonth);
    const isoDayInt = toIntegerWithTrunc(isoDay);
    const calendarImpl = resolveBasicCalendarArg(calendar2);
    const isoYearInt = toIntegerWithTrunc(referenceIsoYear ?? isoEpochFirstLeapYear);
    const fields = checkIsoDateInBounds(validateIsoDateFields({
      year: isoYearInt,
      month: isoMonthInt,
      day: isoDayInt
    }));
    initPlainMonthDay(this, createDateSlots(fields, calendarImpl));
  }
  static from(arg, options = void 0) {
    return createPlainMonthDay(toPlainMonthDaySlots(arg, options));
  }
  get calendarId() {
    return getCalendarSlotId(getPlainMonthDaySlots(this).calendar);
  }
  with(mod3, options = void 0) {
    return createPlainMonthDay(withMonthDayFields(getPlainMonthDaySlots(this), validateBag(mod3), options));
  }
  equals(otherArg) {
    return plainMonthDaysEqual(getPlainMonthDaySlots(this), toPlainMonthDaySlots(otherArg));
  }
  toPlainDate(bag) {
    const slots = getPlainMonthDaySlots(this);
    return createPlainDate(monthDayToDate(slots.calendar, this, bag));
  }
  toLocaleString(locales2 = void 0, options = {}) {
    const slots = getPlainMonthDaySlots(this);
    const format = new RawDateTimeFormat(locales2, applyPlainFormatTimeZone(transformMonthDayOptions(options)));
    return checkResolvedCalendarCompatible(format, slots, 1), format.format(isoDateToEpochMilli(slots));
  }
  toString(options = void 0) {
    return formatPlainMonthDayIso(getPlainMonthDaySlots(this), options);
  }
  toJSON() {
    return formatPlainMonthDayIso(getPlainMonthDaySlots(this));
  }
  valueOf() {
    return forbiddenValueOf2();
  }
}, getPlainMonthDaySlots, monthDayFieldGetters$1);
function createPlainMonthDay(slots) {
  return initPlainMonthDay(Object.create(PlainMonthDay.prototype), slots);
}
function getPlainMonthDaySlots(obj) {
  return getPlainMonthDaySlotsIfPresent(obj) || invalidRecordType();
}
function getPlainMonthDaySlotsIfPresent(obj) {
  return plainMonthDaySlotsMap.get(obj);
}
function toPlainMonthDaySlots(arg, options) {
  if (isObjectLike2(arg)) {
    const ownSlots = getPlainMonthDaySlotsIfPresent(arg);
    if (ownSlots) {
      return refineOverflowOptions(options), ownSlots;
    }
    const calendarMaybe = extractCalendarFromBag(arg);
    return refinePlainMonthDayObjectLike(void 0 === calendarMaybe ? isoCalendarImpl : calendarMaybe, void 0 === calendarMaybe, arg, options);
  }
  const res = parsePlainMonthDay(arg, resolveBasicCalendarId);
  return refineOverflowOptions(options), res;
}
function initPlainMonthDay(instance, slots) {
  return plainMonthDaySlotsMap.set(instance, slots), attachDebugString(instance), instance;
}
var plainYearMonthSlotsMap = /* @__PURE__ */ new WeakMap();
var PlainYearMonth = /* @__PURE__ */ defineTemporalClass(PlainYearMonthBranding, class {
  constructor(isoYear, isoMonth, calendar2 = void 0, referenceIsoDay) {
    const isoYearInt = toIntegerWithTrunc(isoYear);
    const isoMonthInt = toIntegerWithTrunc(isoMonth);
    const calendarImpl = resolveBasicCalendarArg(calendar2);
    const isoDayInt = toIntegerWithTrunc(referenceIsoDay ?? 1);
    const fields = checkIsoYearMonthInBounds(validateIsoDateFields({
      year: isoYearInt,
      month: isoMonthInt,
      day: isoDayInt
    }));
    initPlainYearMonth(this, createDateSlots(fields, calendarImpl));
  }
  static from(arg, options = void 0) {
    return createPlainYearMonth(toPlainYearMonthSlots(arg, options));
  }
  static compare(arg0, arg1) {
    return compareIsoDateFields(toPlainYearMonthSlots(arg0), toPlainYearMonthSlots(arg1));
  }
  get calendarId() {
    return getCalendarSlotId(getPlainYearMonthSlots(this).calendar);
  }
  with(mod3, options = void 0) {
    return createPlainYearMonth(withYearMonthFields(getPlainYearMonthSlots(this), validateBag(mod3), options));
  }
  add(durationArg, options = void 0) {
    const slots = getPlainYearMonthSlots(this);
    return createPlainYearMonth(createDateSlots(moveYearMonth(slots.calendar, slots, toDurationSlots(durationArg), refineOverflowOptions(options)), slots.calendar));
  }
  subtract(durationArg, options = void 0) {
    const slots = getPlainYearMonthSlots(this);
    return createPlainYearMonth(createDateSlots(moveYearMonth(slots.calendar, slots, negateDurationFields(toDurationSlots(durationArg)), refineOverflowOptions(options)), slots.calendar));
  }
  until(otherArg, options = void 0) {
    const slots = getPlainYearMonthSlots(this);
    const other = toPlainYearMonthSlots(otherArg);
    return createDuration(diffYearMonths(0, slots, other, options));
  }
  since(otherArg, options = void 0) {
    const slots = getPlainYearMonthSlots(this);
    const other = toPlainYearMonthSlots(otherArg);
    return createDuration(diffYearMonths(1, slots, other, options));
  }
  equals(otherArg) {
    return plainYearMonthsEqual(getPlainYearMonthSlots(this), toPlainYearMonthSlots(otherArg));
  }
  toPlainDate(bag) {
    const slots = getPlainYearMonthSlots(this);
    return createPlainDate(yearMonthToDate(slots.calendar, this, bag));
  }
  toLocaleString(locales2 = void 0, options = {}) {
    const slots = getPlainYearMonthSlots(this);
    const format = new RawDateTimeFormat(locales2, applyPlainFormatTimeZone(transformYearMonthOptions(options)));
    return checkResolvedCalendarCompatible(format, slots, 1), format.format(isoDateToEpochMilli(slots));
  }
  toString(options = void 0) {
    return formatPlainYearMonthIso(getPlainYearMonthSlots(this), options);
  }
  toJSON() {
    return formatPlainYearMonthIso(getPlainYearMonthSlots(this));
  }
  valueOf() {
    return forbiddenValueOf2();
  }
}, getPlainYearMonthSlots, yearMonthFieldGetters$1, yearMonthDerivedGetters);
function createPlainYearMonth(slots) {
  return initPlainYearMonth(Object.create(PlainYearMonth.prototype), slots);
}
function getPlainYearMonthSlots(obj) {
  return getPlainYearMonthSlotsIfPresent(obj) || invalidRecordType();
}
function getPlainYearMonthSlotsIfPresent(obj) {
  return plainYearMonthSlotsMap.get(obj);
}
function toPlainYearMonthSlots(arg, options) {
  if (isObjectLike2(arg)) {
    const ownSlots = getPlainYearMonthSlotsIfPresent(arg);
    if (ownSlots) {
      return refineOverflowOptions(options), ownSlots;
    }
    const calendar2 = getCalendarFromBag(arg);
    return refinePlainYearMonthObjectLike(calendar2, arg, options);
  }
  const res = parsePlainYearMonth(arg, resolveBasicCalendarId);
  return refineOverflowOptions(options), res;
}
function initPlainYearMonth(instance, slots) {
  return plainYearMonthSlotsMap.set(instance, slots), attachDebugString(instance), instance;
}
function getTemporalBrandingAndSlots(obj) {
  if (!isObjectLike2(obj)) {
    return;
  }
  let slots = getInstantSlotsIfPresent(obj);
  return slots ? [InstantBranding, slots] : (slots = getZonedDateTimeSlotsIfPresent(obj), slots ? [ZonedDateTimeBranding, slots] : (slots = getPlainDateTimeSlotsIfPresent(obj), slots ? [PlainDateTimeBranding, slots] : (slots = getPlainDateSlotsIfPresent(obj), slots ? [PlainDateBranding, slots] : (slots = getPlainTimeSlotsIfPresent(obj), slots ? [PlainTimeBranding, slots] : (slots = getPlainYearMonthSlotsIfPresent(obj), slots ? [PlainYearMonthBranding, slots] : (slots = getPlainMonthDaySlotsIfPresent(obj), slots ? [PlainMonthDayBranding, slots] : (slots = getDurationSlotsIfPresent(obj), slots ? [DurationBranding, slots] : void 0)))))));
}
function validateBag(bag) {
  return (getTemporalBrandingAndSlots(bag) || void 0 !== bag.calendar || void 0 !== bag.timeZone) && throwTypeError(invalidBag), bag;
}
var plainTimeSlotsMap = /* @__PURE__ */ new WeakMap();
var PlainTime = /* @__PURE__ */ defineTemporalClass(PlainTimeBranding, class {
  constructor(hour = 0, minute = 0, second = 0, millisecond = 0, microsecond = 0, nanosecond = 0) {
    const fields = validateTimeFields(mapProps(toIntegerWithTrunc, {
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    }));
    initPlainTime(this, createTimeSlots(fields));
  }
  static from(arg, options = void 0) {
    return createPlainTime(toPlainTimeSlots(arg, options));
  }
  static compare(arg0, arg1) {
    return compareTimeFields(toPlainTimeSlots(arg0), toPlainTimeSlots(arg1));
  }
  with(mod3, options = void 0) {
    return createPlainTime(withTimeFields(getPlainTimeSlots(this), validateBag(mod3), options));
  }
  add(durationArg) {
    const slots = getPlainTimeSlots(this);
    return createPlainTime(moveTime(slots, toDurationSlots(durationArg))[0]);
  }
  subtract(durationArg) {
    const slots = getPlainTimeSlots(this);
    return createPlainTime(moveTime(slots, negateDurationFields(toDurationSlots(durationArg)))[0]);
  }
  until(otherArg, options = void 0) {
    return createDuration(diffTimes(0, getPlainTimeSlots(this), toPlainTimeSlots(otherArg), options));
  }
  since(otherArg, options = void 0) {
    return createDuration(diffTimes(1, getPlainTimeSlots(this), toPlainTimeSlots(otherArg), options));
  }
  round(options) {
    const slots = getPlainTimeSlots(this);
    const [smallestUnit, roundingInc, roundingMode] = refineRoundingOptions(options, 5);
    return createPlainTime(roundTimeToUnit(slots, smallestUnit, roundingInc, roundingMode)[0]);
  }
  equals(other) {
    return plainTimesEqual(getPlainTimeSlots(this), toPlainTimeSlots(other));
  }
  toLocaleString(locales2 = void 0, options = {}) {
    const slots = getPlainTimeSlots(this);
    return new RawDateTimeFormat(locales2, applyPlainFormatTimeZone(transformTimeOptions(options))).format(timeFieldsToMilli(slots));
  }
  toString(options = void 0) {
    return formatPlainTimeIso(getPlainTimeSlots(this), options);
  }
  toJSON() {
    return formatPlainTimeIso(getPlainTimeSlots(this));
  }
  valueOf() {
    return forbiddenValueOf2();
  }
}, getPlainTimeSlots, timeGetters);
function createPlainTime(slots) {
  return initPlainTime(Object.create(PlainTime.prototype), slots);
}
function getPlainTimeSlots(obj) {
  return getPlainTimeSlotsIfPresent(obj) || invalidRecordType();
}
function getPlainTimeSlotsIfPresent(obj) {
  return plainTimeSlotsMap.get(obj);
}
function toPlainTimeSlots(arg, options) {
  if (isObjectLike2(arg)) {
    const ownSlots = getPlainTimeSlotsIfPresent(arg);
    if (ownSlots) {
      return refineOverflowOptions(options), ownSlots;
    }
    const dateTimeSlots = getPlainDateTimeSlotsIfPresent(arg);
    if (dateTimeSlots) {
      return refineOverflowOptions(options), createTimeSlots(dateTimeSlots);
    }
    const zonedDateTimeSlots = getZonedDateTimeSlotsIfPresent(arg);
    return zonedDateTimeSlots ? (refineOverflowOptions(options), zonedDateTimeToTime(zonedDateTimeSlots)) : refinePlainTimeObjectLike(arg, options);
  }
  const timeSlots = parsePlainTime(arg);
  return refineOverflowOptions(options), timeSlots;
}
function optionalToPlainTimeFields(timeArg) {
  return void 0 === timeArg ? void 0 : toPlainTimeSlots(timeArg);
}
function initPlainTime(instance, slots) {
  return plainTimeSlotsMap.set(instance, slots), attachDebugString(instance), instance;
}
var plainDateTimeSlotsMap = /* @__PURE__ */ new WeakMap();
var PlainDateTime = /* @__PURE__ */ defineTemporalClass(PlainDateTimeBranding, class {
  constructor(isoYear, isoMonth, isoDay, hour = 0, minute = 0, second = 0, millisecond = 0, microsecond = 0, nanosecond = 0, calendar2 = void 0) {
    const fields = checkIsoDateTimeInBounds(validateIsoDateTimeFields(mapProps(toIntegerWithTrunc, {
      year: isoYear,
      month: isoMonth,
      day: isoDay,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    })));
    const calendarImpl = resolveBasicCalendarArg(calendar2);
    initPlainDateTime(this, createDateTimeSlots(fields, calendarImpl));
  }
  static from(arg, options = void 0) {
    return createPlainDateTime(toPlainDateTimeSlots(arg, options));
  }
  static compare(arg0, arg1) {
    const slots0 = toPlainDateTimeSlots(arg0);
    const slots1 = toPlainDateTimeSlots(arg1);
    return compareIsoDateTimeFields(slots0, slots1);
  }
  get calendarId() {
    return getCalendarSlotId(getPlainDateTimeSlots(this).calendar);
  }
  with(mod3, options = void 0) {
    return createPlainDateTime(withDateTimeFields(getPlainDateTimeSlots(this), validateBag(mod3), options));
  }
  withCalendar(calendarArg) {
    const slots = getPlainDateTimeSlots(this);
    return createPlainDateTime(createDateTimeSlots(slots, refineCalendarArg(calendarArg)));
  }
  withPlainTime(plainTimeArg = void 0) {
    const slots = getPlainDateTimeSlots(this);
    return createPlainDateTime(createDateTimeFromRefinedFields(slots, optionalToPlainTimeFields(plainTimeArg), slots.calendar));
  }
  add(durationArg, options = void 0) {
    const slots = getPlainDateTimeSlots(this);
    return createPlainDateTime(createDateTimeSlots(moveDateTime(slots.calendar, slots, toDurationSlots(durationArg), refineOverflowOptions(options)), slots.calendar));
  }
  subtract(durationArg, options = void 0) {
    const slots = getPlainDateTimeSlots(this);
    return createPlainDateTime(createDateTimeSlots(moveDateTime(slots.calendar, slots, negateDurationFields(toDurationSlots(durationArg)), refineOverflowOptions(options)), slots.calendar));
  }
  until(otherArg, options = void 0) {
    const slots = getPlainDateTimeSlots(this);
    const other = toPlainDateTimeSlots(otherArg);
    return createDuration(diffDateTimes(0, slots, other, options));
  }
  since(otherArg, options = void 0) {
    const slots = getPlainDateTimeSlots(this);
    const other = toPlainDateTimeSlots(otherArg);
    return createDuration(diffDateTimes(1, slots, other, options));
  }
  round(options) {
    const slots = getPlainDateTimeSlots(this);
    const [smallestUnit, roundingInc, roundingMode] = refineRoundingOptions(options);
    return createPlainDateTime(createDateTimeSlots(roundDateTimeToUnit(slots, smallestUnit, roundingInc, roundingMode), slots.calendar));
  }
  equals(otherArg) {
    return plainDateTimesEqual(getPlainDateTimeSlots(this), toPlainDateTimeSlots(otherArg));
  }
  toZonedDateTime(timeZoneArg, options = void 0) {
    return createZonedDateTime(dateTimeToZonedDateTime(getPlainDateTimeSlots(this), queryTimeZone(refineTimeZoneArg(timeZoneArg)), refineEpochDisambigOptions(options)));
  }
  toPlainDate() {
    const slots = getPlainDateTimeSlots(this);
    return createPlainDate(createDateSlots(slots, slots.calendar));
  }
  toPlainTime() {
    return createPlainTime(createTimeSlots(getPlainDateTimeSlots(this)));
  }
  toLocaleString(locales2 = void 0, options = {}) {
    const slots = getPlainDateTimeSlots(this);
    const format = new RawDateTimeFormat(locales2, applyPlainFormatTimeZone(transformDateTimeOptions(options)));
    return checkResolvedCalendarCompatible(format, slots), format.format(isoDateTimeToEpochMilli(slots));
  }
  toString(options = void 0) {
    return formatPlainDateTimeIso(getPlainDateTimeSlots(this), options);
  }
  toJSON() {
    return formatPlainDateTimeIso(getPlainDateTimeSlots(this));
  }
  valueOf() {
    return forbiddenValueOf2();
  }
}, getPlainDateTimeSlots, dateFieldGetters$1, dateDerivedGetters, timeGetters);
function createPlainDateTime(slots) {
  return initPlainDateTime(Object.create(PlainDateTime.prototype), slots);
}
function getPlainDateTimeSlots(obj) {
  return getPlainDateTimeSlotsIfPresent(obj) || invalidRecordType();
}
function getPlainDateTimeSlotsIfPresent(obj) {
  return plainDateTimeSlotsMap.get(obj);
}
function toPlainDateTimeSlots(arg, options) {
  if (isObjectLike2(arg)) {
    const ownSlots = getPlainDateTimeSlotsIfPresent(arg);
    if (ownSlots) {
      return refineOverflowOptions(options), ownSlots;
    }
    const dateSlots = getPlainDateSlotsIfPresent(arg);
    if (dateSlots) {
      return refineOverflowOptions(options), createDateTimeSlots(combineDateAndTime(dateSlots, timeFieldDefaults), dateSlots.calendar);
    }
    const zonedDateTimeSlots = getZonedDateTimeSlotsIfPresent(arg);
    if (zonedDateTimeSlots) {
      return refineOverflowOptions(options), zonedDateTimeToDateTime(zonedDateTimeSlots);
    }
    const calendar2 = getCalendarFromBag(arg);
    return refinePlainDateTimeObjectLike(calendar2, arg, options);
  }
  const res = parsePlainDateTime(arg, resolveBasicCalendarId);
  return refineOverflowOptions(options), res;
}
function initPlainDateTime(instance, slots) {
  return plainDateTimeSlotsMap.set(instance, slots), attachDebugString(instance), instance;
}
var plainDateSlotsMap = /* @__PURE__ */ new WeakMap();
var PlainDate = /* @__PURE__ */ defineTemporalClass(PlainDateBranding, class {
  constructor(isoYear, isoMonth, isoDay, calendar2 = void 0) {
    const fields = checkIsoDateInBounds(validateIsoDateFields(mapProps(toIntegerWithTrunc, {
      year: isoYear,
      month: isoMonth,
      day: isoDay
    })));
    const calendarImpl = resolveBasicCalendarArg(calendar2);
    initPlainDate(this, createDateSlots(fields, calendarImpl));
  }
  static from(arg, options = void 0) {
    return createPlainDate(toPlainDateSlots(arg, options));
  }
  static compare(arg0, arg1) {
    return compareIsoDateFields(toPlainDateSlots(arg0), toPlainDateSlots(arg1));
  }
  get calendarId() {
    return getCalendarSlotId(getPlainDateSlots(this).calendar);
  }
  with(mod3, options = void 0) {
    return createPlainDate(withDateFields(getPlainDateSlots(this), validateBag(mod3), options));
  }
  withCalendar(calendarArg) {
    const slots = getPlainDateSlots(this);
    return createPlainDate(createDateSlots(slots, refineCalendarArg(calendarArg)));
  }
  add(durationArg, options = void 0) {
    const slots = getPlainDateSlots(this);
    return createPlainDate(createDateSlots(moveDate(slots.calendar, slots, toDurationSlots(durationArg), refineOverflowOptions(options)), slots.calendar));
  }
  subtract(durationArg, options = void 0) {
    const slots = getPlainDateSlots(this);
    return createPlainDate(createDateSlots(moveDate(slots.calendar, slots, negateDurationFields(toDurationSlots(durationArg)), refineOverflowOptions(options)), slots.calendar));
  }
  until(otherArg, options = void 0) {
    const slots = getPlainDateSlots(this);
    const other = toPlainDateSlots(otherArg);
    return createDuration(diffDates(0, slots, other, options));
  }
  since(otherArg, options = void 0) {
    const slots = getPlainDateSlots(this);
    const other = toPlainDateSlots(otherArg);
    return createDuration(diffDates(1, slots, other, options));
  }
  equals(otherArg) {
    return plainDatesEqual(getPlainDateSlots(this), toPlainDateSlots(otherArg));
  }
  toZonedDateTime(options) {
    const optionsObj = isObjectLike2(options) ? {
      timeZone: options.timeZone,
      plainTime: options.plainTime
    } : {
      timeZone: options
    };
    const slots = getPlainDateSlots(this);
    const timeZoneId = refineTimeZoneArg(optionsObj.timeZone);
    const plainTimeArg = optionsObj.plainTime;
    const timeFields = void 0 !== plainTimeArg ? toPlainTimeSlots(plainTimeArg) : void 0;
    return createZonedDateTime(dateToZonedDateTime(slots, queryTimeZone(timeZoneId), timeFields));
  }
  toPlainDateTime(plainTimeArg = void 0) {
    const slots = getPlainDateSlots(this);
    return createPlainDateTime(createDateTimeFromRefinedFields(slots, optionalToPlainTimeFields(plainTimeArg), slots.calendar));
  }
  toPlainYearMonth() {
    const slots = getPlainDateSlots(this);
    return createPlainYearMonth(fieldsToYearMonth(slots.calendar, this));
  }
  toPlainMonthDay() {
    const slots = getPlainDateSlots(this);
    return createPlainMonthDay(fieldsToMonthDay(slots.calendar, this));
  }
  toLocaleString(locales2 = void 0, options = {}) {
    const slots = getPlainDateSlots(this);
    const format = new RawDateTimeFormat(locales2, applyPlainFormatTimeZone(transformDateOptions(options)));
    return checkResolvedCalendarCompatible(format, slots), format.format(isoDateToEpochMilli(slots));
  }
  toString(options = void 0) {
    return formatPlainDateIso(getPlainDateSlots(this), options);
  }
  toJSON() {
    return formatPlainDateIso(getPlainDateSlots(this));
  }
  valueOf() {
    return forbiddenValueOf2();
  }
}, getPlainDateSlots, dateFieldGetters$1, dateDerivedGetters);
function createPlainDate(slots) {
  return initPlainDate(Object.create(PlainDate.prototype), slots);
}
function getPlainDateSlots(obj) {
  return getPlainDateSlotsIfPresent(obj) || invalidRecordType();
}
function getPlainDateSlotsIfPresent(obj) {
  return plainDateSlotsMap.get(obj);
}
function toPlainDateSlots(arg, options) {
  if (isObjectLike2(arg)) {
    const ownSlots = getPlainDateSlotsIfPresent(arg);
    if (ownSlots) {
      return refineOverflowOptions(options), ownSlots;
    }
    const dateTimeSlots = getPlainDateTimeSlotsIfPresent(arg);
    if (dateTimeSlots) {
      return refineOverflowOptions(options), createDateSlots(dateTimeSlots, dateTimeSlots.calendar);
    }
    const zonedDateTimeSlots = getZonedDateTimeSlotsIfPresent(arg);
    if (zonedDateTimeSlots) {
      return refineOverflowOptions(options), zonedDateTimeToDate(zonedDateTimeSlots);
    }
    const calendar2 = getCalendarFromBag(arg);
    return refinePlainDateObjectLike(calendar2, arg, options);
  }
  const res = parsePlainDate(arg, resolveBasicCalendarId);
  return refineOverflowOptions(options), res;
}
function initPlainDate(instance, slots) {
  return plainDateSlotsMap.set(instance, slots), attachDebugString(instance), instance;
}
function getCalendarFromBag(bag) {
  const calendar2 = extractCalendarFromBag(bag);
  return void 0 === calendar2 ? isoCalendarImpl : calendar2;
}
function extractCalendarFromBag(bag) {
  const { calendar: calendarArg } = bag;
  if (void 0 !== calendarArg) {
    return refineCalendarArg(calendarArg);
  }
}
function refineCalendarArg(arg) {
  if (isObjectLike2(arg)) {
    const slots = getPlainDateSlotsIfPresent(arg) || getPlainDateTimeSlotsIfPresent(arg) || getZonedDateTimeSlotsIfPresent(arg) || getPlainMonthDaySlotsIfPresent(arg) || getPlainYearMonthSlotsIfPresent(arg);
    return slots || throwTypeError(invalidCalendar(arg)), slots.calendar;
  }
  return ((arg2) => resolveBasicCalendarId(parseCalendarId(requireString(arg2))))(arg);
}
var durationSlotsMap = /* @__PURE__ */ new WeakMap();
var Duration = /* @__PURE__ */ defineTemporalClass(DurationBranding, class {
  constructor(years = 0, months2 = 0, weeks = 0, days = 0, hours = 0, minutes = 0, seconds = 0, milliseconds = 0, microseconds = 0, nanoseconds = 0) {
    const fields = validateDurationFields(mapProps(toStrictInteger, {
      years,
      months: months2,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    }));
    initDuration(this, createDurationSlots(fields));
  }
  static from(arg) {
    return createDuration(toDurationSlots(arg));
  }
  static compare(durationArg0, durationArg1, options = void 0) {
    return compareDurations(refinePublicRelativeTo, toDurationSlots(durationArg0), toDurationSlots(durationArg1), options);
  }
  get sign() {
    return getDurationSlots(this).sign;
  }
  get blank() {
    return !getDurationSlots(this).sign;
  }
  with(mod3) {
    return createDuration(mergeDurationFields(getDurationSlots(this), mod3));
  }
  negated() {
    return createDuration(negateDuration(getDurationSlots(this)));
  }
  abs() {
    return createDuration(absDuration(getDurationSlots(this)));
  }
  add(otherArg) {
    return createDuration(addDurationsWithoutRelativeTo(0, getDurationSlots(this), toDurationSlots(otherArg)));
  }
  subtract(otherArg) {
    return createDuration(addDurationsWithoutRelativeTo(1, getDurationSlots(this), toDurationSlots(otherArg)));
  }
  round(roundTo) {
    return createDuration(roundDuration(refinePublicRelativeTo, getDurationSlots(this), roundTo));
  }
  total(totalOf) {
    return totalDuration(refinePublicRelativeTo, getDurationSlots(this), totalOf);
  }
  toLocaleString(locales2 = void 0, options) {
    const slots = getDurationSlots(this);
    return Intl.DurationFormat ? new Intl.DurationFormat(locales2, options).format(slots) : formatDurationIso(slots, options);
  }
  toString(options = void 0) {
    return formatDurationIso(getDurationSlots(this), options);
  }
  toJSON() {
    return formatDurationIso(getDurationSlots(this));
  }
  valueOf() {
    return forbiddenValueOf2();
  }
}, getDurationSlots, durationGetters);
function createDuration(slots) {
  return initDuration(Object.create(Duration.prototype), slots);
}
function getDurationSlots(obj) {
  return getDurationSlotsIfPresent(obj) || invalidRecordType();
}
function getDurationSlotsIfPresent(obj) {
  return durationSlotsMap.get(obj);
}
function toDurationSlots(arg) {
  if (isObjectLike2(arg)) {
    return getDurationSlotsIfPresent(arg) || refineDurationObjectLike(arg);
  }
  return parseDuration(arg);
}
function refinePublicRelativeTo(relativeTo) {
  if (void 0 !== relativeTo) {
    if (isObjectLike2(relativeTo)) {
      const zonedDateTimeSlots = getZonedDateTimeSlotsIfPresent(relativeTo);
      if (zonedDateTimeSlots) {
        return zonedDateTimeSlots;
      }
      const dateSlots = getPlainDateSlotsIfPresent(relativeTo);
      if (dateSlots) {
        return dateSlots;
      }
      const dateTimeSlots = getPlainDateTimeSlotsIfPresent(relativeTo);
      if (dateTimeSlots) {
        return createDateSlots(dateTimeSlots, dateTimeSlots.calendar);
      }
      const calendar2 = getCalendarFromBag(relativeTo);
      return refineMaybeZonedDateTimeObjectLike(refineTimeZoneArg, calendar2, relativeTo);
    }
    return parseRelativeToSlots(relativeTo, resolveBasicCalendarId);
  }
}
function initDuration(instance, slots) {
  return durationSlotsMap.set(instance, slots), attachDebugString(instance), instance;
}
var Now = /* @__PURE__ */ Object.defineProperties({}, {
  ...createStringTagDescriptors("Temporal.Now"),
  ...createPropDescriptors({
    timeZoneId() {
      return getCurrentTimeZoneId();
    },
    instant() {
      return createInstant(createEpochNanoSlots(getCurrentEpochNano()));
    },
    zonedDateTimeISO(timeZoneArg = getCurrentTimeZoneId()) {
      const timeZone = queryTimeZone(refineTimeZoneArg(timeZoneArg));
      return createZonedDateTime(createZonedEpochNanoSlots(getCurrentEpochNano(), timeZone));
    },
    plainDateTimeISO(timeZoneArg = getCurrentTimeZoneId()) {
      const isoDateTime = getCurrentIsoDateTime(queryTimeZone(refineTimeZoneArg(timeZoneArg)));
      return createPlainDateTime(createDateTimeSlots(isoDateTime));
    },
    plainDateISO(timeZoneArg = getCurrentTimeZoneId()) {
      const isoDateTime = getCurrentIsoDateTime(queryTimeZone(refineTimeZoneArg(timeZoneArg)));
      return createPlainDate(createDateSlots(isoDateTime));
    },
    plainTimeISO(timeZoneArg = getCurrentTimeZoneId()) {
      const isoDateTime = getCurrentIsoDateTime(queryTimeZone(refineTimeZoneArg(timeZoneArg)));
      return createPlainTime(createTimeSlots(isoDateTime));
    }
  })
});
var Temporal2 = /* @__PURE__ */ Object.defineProperties({}, {
  ...createStringTagDescriptors("Temporal"),
  ...createPropDescriptors({
    PlainYearMonth,
    PlainMonthDay,
    PlainDate,
    PlainTime,
    PlainDateTime,
    ZonedDateTime,
    Instant,
    Duration,
    Now
  })
});
var DateTimeFormat = /* @__PURE__ */ createDateTimeFormatClass(getTemporalBrandingAndSlots);

// node_modules/temporal-polyfill/shim.js
function installImplementation() {
  Object.defineProperties(globalThis, createPropDescriptors({
    Temporal: Temporal2
  })), Object.defineProperties(Intl, createPropDescriptors({
    DateTimeFormat
  })), Object.defineProperties(Date.prototype, createPropDescriptors({
    toTemporalInstant
  }));
}
function install() {
  NativeTemporal || installImplementation();
}

// node_modules/temporal-polyfill/global.esm.js
install();

// node_modules/@hebcal/noaa/dist/index.js
function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}
function radiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}
var GeoLocation = class {
  /**
   * GeoLocation constructor with parameters for all required fields.
   *
   * @param {string} name
   *            The location name for display use such as &quot;Lakewood, NJ&quot;
   * @param {number} latitude
   *            the latitude in a double format such as 40.095965 for Lakewood, NJ.
   *            <b>Note: </b> For latitudes south of the equator, a negative value should be used.
   * @param {number} longitude
   *            double the longitude in a double format such as -74.222130 for Lakewood, NJ.
   *            <b>Note: </b> For longitudes west of the <a href="http://en.wikipedia.org/wiki/Prime_Meridian">Prime
   *            Meridian </a> (Greenwich), a negative value should be used.
   * @param {number} elevation
   *            the elevation above sea level in Meters. Elevation is not used in most algorithms used for calculating
   *            sunrise and set.
   * @param {string} timeZoneId
   *            the <code>TimeZone</code> for the location.
   */
  constructor(name, latitude, longitude, elevation, timeZoneId) {
    this.setLocationName(name);
    this.setLatitude(latitude);
    this.setLongitude(longitude);
    this.setElevation(elevation);
    this.setTimeZone(timeZoneId);
  }
  latitude;
  longitude;
  locationName = null;
  timeZoneId;
  elevation;
  /**
   * Method to get the elevation in Meters.
   *
   * @return {number} Returns the elevation in Meters.
   */
  getElevation() {
    return this.elevation;
  }
  /**
   * Method to set the elevation in Meters <b>above </b> sea level.
   *
   * @param {number} elevation
   *            The elevation to set in Meters. An Error will be thrown if the value is a negative.
   */
  setElevation(elevation) {
    if (typeof elevation !== "number")
      throw new TypeError("Invalid elevation");
    if (elevation < 0) {
      throw new RangeError(`elevation ${elevation} must be zero or positive`);
    }
    this.elevation = elevation;
  }
  setLatitude(latitude) {
    if (typeof latitude !== "number")
      throw new TypeError("Invalid latitude");
    if (latitude < -90 || latitude > 90) {
      throw new RangeError(`Latitude ${latitude} out of range [-90,90]`);
    }
    this.latitude = latitude;
  }
  /**
   * @return {number} Returns the latitude.
   */
  getLatitude() {
    return this.latitude;
  }
  setLongitude(longitude) {
    if (typeof longitude !== "number")
      throw new TypeError("Invalid longitude");
    if (longitude < -180 || longitude > 180) {
      throw new RangeError(`Longitude ${longitude} out of range [-180,180]`);
    }
    this.longitude = longitude;
  }
  /**
   * @return {number} Returns the longitude.
   */
  getLongitude() {
    return this.longitude;
  }
  /**
   * @return {string|null} Returns the location name.
   */
  getLocationName() {
    return this.locationName;
  }
  /**
   * @param {string|null} name
   *            The setter method for the display name.
   */
  setLocationName(name) {
    this.locationName = name;
  }
  /**
   * @return {string} Returns the timeZone.
   */
  getTimeZone() {
    return this.timeZoneId;
  }
  /**
   * Method to set the TimeZone.
   * @param {string} timeZoneId
   *            The timeZone to set.
   */
  setTimeZone(timeZoneId) {
    if (!timeZoneId) {
      throw new RangeError("Invalid timeZoneId");
    }
    this.timeZoneId = timeZoneId;
  }
  /**
   * A method that will return the location's local mean time offset in milliseconds from local
   * [standard time](https://en.wikipedia.org/wiki/Standard_time). The globe is split into 360&deg;, with
   * 15&deg; per hour of the day. For a local that is at a longitude that is evenly divisible by 15
   * (longitude % 15 == 0), at solar noon (with adjustment for the
   * [equation of time](https://en.wikipedia.org/wiki/Equation_of_time)) the sun should be directly overhead,
   * so a user who is 1&deg; west of this will have noon at 4 minutes after standard time noon, and conversely,
   * a user who is 1&deg; east of the 15&deg; longitude will have noon at 11:56 AM.
   * @param instant the instant at which to read the time zone offset (DST is taken into account)
   * @return the offset in milliseconds not accounting for Daylight saving time. A positive value will be returned
   *         East of the 15&deg; timezone line, and a negative value West of it.
   */
  getLocalMeanTimeOffset(instant) {
    const timezoneOffsetMillis = instant.toZonedDateTimeISO(this.timeZoneId).offsetNanoseconds / 1e6;
    return this.longitude * 4 * 60 * 1e3 - timezoneOffsetMillis;
  }
  /**
   * Adjust the date for [antimeridian](https://en.wikipedia.org/wiki/180th_meridian) crossover. This is
   * needed to deal with edge cases such as Samoa that use a different calendar date than expected based on their
   * geographic location.
   *
   * The actual Time Zone offset may deviate from the expected offset based on the longitude. Since the 'absolute time'
   * calculations are always based on longitudinal offset from UTC for a given date, the date is presumed to only
   * increase East of the Prime Meridian, and to only decrease West of it. For Time Zones that cross the antimeridian,
   * the date will be artificially adjusted before calculation to conform with this presumption.
   *
   * For example, Apia, Samoa with a longitude of -171.75 uses a local offset of +14:00. When calculating sunrise for
   * 2018-02-03, the calculator should operate using 2018-02-02 since the expected zone is -11. After determining the
   * UTC time, the local DST offset of [UTC+14:00](https://en.wikipedia.org/wiki/UTC%2B14:00) should be applied
   * to bring the date back to 2018-02-03.
   * @param date the date, at the start of which (in this location's time zone) the offset is read
   * @return the number of days to adjust the date This will typically be 0 unless the date crosses the antimeridian
   */
  getAntimeridianAdjustment(date) {
    if (this.longitude > -90 && this.longitude < 120) {
      return 0;
    }
    const midnight = date.toZonedDateTime(this.timeZoneId).toInstant();
    const localHoursOffset = this.getLocalMeanTimeOffset(midnight) / 36e5;
    if (localHoursOffset >= 20) {
      return 1;
    } else if (localHoursOffset <= -20) {
      return -1;
    }
    return 0;
  }
};
var refraction = 34 / 60;
var solarRadius = 16 / 60;
var earthRadius = 6356.9;
var NOAACalculator = class _NOAACalculator {
  /**
   * A constructor that takes in <a href="http://en.wikipedia.org/wiki/Geolocation">geolocation</a> information as a
   * parameter.
   *
   * @param {GeoLocation} geoLocation
   *            The location information used for calculating astronomical sun times.
   * @param {Temporal.PlainDate} date
   */
  constructor(geoLocation, date) {
    this.date = date;
    this.geoLocation = geoLocation;
  }
  /**
   * The zenith of astronomical sunrise and sunset. The sun is 90&deg; from the vertical 0&deg;
   * @private
   */
  static GEOMETRIC_ZENITH = 90;
  /**
   * Default value for Sun's zenith and true rise/set Zenith (used in this class and subclasses) is the angle that the
   * center of the Sun makes to a line perpendicular to the Earth's surface. If the Sun were a point and the Earth
   * were without an atmosphere, true sunset and sunrise would correspond to a 90&deg; zenith. Because the Sun is not
   * a point, and because the atmosphere refracts light, this 90&deg; zenith does not, in fact, correspond to true
   * sunset or sunrise, instead the center of the Sun's disk must lie just below the horizon for the upper edge to be
   * obscured. This means that a zenith of just above 90&deg; must be used. The Sun subtends an angle of 16 minutes of
   * arc, and atmospheric refraction accounts for
   * 34 minutes or so, giving a total of 50
   * arcminutes. The total value for ZENITH is 90+(5/6) or 90.8333333&deg; for true sunrise/sunset.
   */
  // const ZENITH: number = GEOMETRIC_ZENITH + 5.0 / 6.0;
  /** Sun's zenith at civil twilight (96&deg;). */
  static CIVIL_ZENITH = 96;
  /** Sun's zenith at nautical twilight (102&deg;). */
  static NAUTICAL_ZENITH = 102;
  /** Sun's zenith at astronomical twilight (108&deg;). */
  static ASTRONOMICAL_ZENITH = 108;
  /**
   * The Java Calendar encapsulated by this class to track the current date used by the class
   * @private
   */
  date;
  /**
   * the {@link GeoLocation} used for calculations.
   * @private
   */
  geoLocation;
  /**
   * The getSunrise method Returns a `Date` representing the
   * {@link getElevationAdjustment elevation adjusted} sunrise time. The zenith used
   * for the calculation uses {@link GEOMETRIC_ZENITH geometric zenith} of 90&deg; plus
   * {@link getElevationAdjustment}. This is adjusted
   * to add approximately 50/60 of a degree to account for 34 archminutes of refraction
   * and 16 archminutes for the sun's radius for a total of {@link adjustZenith 90.83333&deg;}.
   *
   * @return {Temporal.ZonedDateTime | null} the `Date` representing the exact sunrise time. If the calculation can't be computed such as
   *         in the Arctic Circle where there is at least one day a year where the sun does not rise, and one where it
   *         does not set, a null will be returned. See detailed explanation on top of the page.
   * @see adjustZenith
   * @see getSeaLevelSunrise()
   * @see getUTCSunrise
   */
  getSunrise() {
    const sunrise = this.getUTCSunrise0(_NOAACalculator.GEOMETRIC_ZENITH);
    if (isNaN(sunrise))
      return null;
    return this.getDateFromTime(sunrise, true);
  }
  /**
   * A method that returns the sunrise without {@link getElevationAdjustment elevation
   * adjustment}. Non-sunrise and sunset calculations such as dawn and dusk, depend on the amount of visible light,
   * something that is not affected by elevation. This method returns sunrise calculated at sea level. This forms the
   * base for dawn calculations that are calculated as a dip below the horizon before sunrise.
   *
   * @return {Temporal.ZonedDateTime | null} the `Date` representing the exact sea-level sunrise time. If the calculation can't be computed
   *         such as in the Arctic Circle where there is at least one day a year where the sun does not rise, and one
   *         where it does not set, a null will be returned. See detailed explanation on top of the page.
   * @see getSunrise
   * @see getUTCSeaLevelSunrise
   * @see getSeaLevelSunset()
   */
  getSeaLevelSunrise() {
    const sunrise = this.getUTCSeaLevelSunrise(_NOAACalculator.GEOMETRIC_ZENITH);
    if (isNaN(sunrise))
      return null;
    return this.getDateFromTime(sunrise, true);
  }
  /**
   * A method that returns the beginning of civil twilight (dawn) using a zenith of {@link CIVIL_ZENITH 96&deg;}.
   *
   * @return {Temporal.ZonedDateTime | null} The `Date` of the beginning of civil twilight using a zenith of 96&deg;. If the calculation
   *         can't be computed, null will be returned. See detailed explanation on top of the page.
   * @see CIVIL_ZENITH
   */
  getBeginCivilTwilight() {
    return this.getSunriseOffsetByDegrees(_NOAACalculator.CIVIL_ZENITH);
  }
  /**
   * A method that returns the beginning of nautical twilight using a zenith of {@link NAUTICAL_ZENITH 102&deg;}.
   *
   * @return {Temporal.ZonedDateTime | null} The `Date` of the beginning of nautical twilight using a zenith of 102&deg;. If the
   *         calculation can't be computed null will be returned. See detailed explanation on top of the page.
   * @see NAUTICAL_ZENITH
   */
  getBeginNauticalTwilight() {
    return this.getSunriseOffsetByDegrees(_NOAACalculator.NAUTICAL_ZENITH);
  }
  /**
   * A method that returns the beginning of astronomical twilight using a zenith of {@link ASTRONOMICAL_ZENITH
   * 108&deg;}.
   *
   * @return {Temporal.ZonedDateTime | null} The `Date` of the beginning of astronomical twilight using a zenith of 108&deg;. If the
   *         calculation can't be computed, null will be returned. See detailed explanation on top of the page.
   * @see ASTRONOMICAL_ZENITH
   */
  getBeginAstronomicalTwilight() {
    return this.getSunriseOffsetByDegrees(_NOAACalculator.ASTRONOMICAL_ZENITH);
  }
  /**
   * The getSunset method Returns a `Date` representing the
   * {@link getElevationAdjustment elevation adjusted} sunset time. The zenith used for
   * the calculation uses {@link GEOMETRIC_ZENITH geometric zenith} of 90&deg; plus
   * {@link getElevationAdjustment}. This is adjusted
   * to add approximately 50/60 of a degree to account for 34 archminutes of refraction
   * and 16 archminutes for the sun's radius for a total of {@link adjustZenith 90.83333&deg;}.
   * Note:
   * In certain cases the calculates sunset will occur before sunrise. This will typically happen when a timezone
   * other than the local timezone is used (calculating Los Angeles sunset using a GMT timezone for example). In this
   * case the sunset date will be incremented to the following date.
   *
   * @return {Temporal.ZonedDateTime | null} The `Date` representing the exact sunset time. If the calculation can't be computed such as in
   *         the Arctic Circle where there is at least one day a year where the sun does not rise, and one where it
   *         does not set, a null will be returned. See detailed explanation on top of the page.
   * @see adjustZenith
   * @see getSeaLevelSunset()
   * @see getUTCSunset
   */
  getSunset() {
    const sunset = this.getUTCSunset0(_NOAACalculator.GEOMETRIC_ZENITH);
    if (isNaN(sunset))
      return null;
    return this.getDateFromTime(sunset, false);
  }
  /**
   * A method that returns the sunset without {@link getElevationAdjustment elevation
   * adjustment}. Non-sunrise and sunset calculations such as dawn and dusk, depend on the amount of visible light,
   * something that is not affected by elevation. This method returns sunset calculated at sea level. This forms the
   * base for dusk calculations that are calculated as a dip below the horizon after sunset.
   *
   * @return {Temporal.ZonedDateTime | null} The `Date` representing the exact sea-level sunset time. If the calculation can't be computed
   *         such as in the Arctic Circle where there is at least one day a year where the sun does not rise, and one
   *         where it does not set, a null will be returned. See detailed explanation on top of the page.
   * @see getSunset
   * @see getUTCSeaLevelSunset
   */
  getSeaLevelSunset() {
    const sunset = this.getUTCSeaLevelSunset(_NOAACalculator.GEOMETRIC_ZENITH);
    if (isNaN(sunset))
      return null;
    return this.getDateFromTime(sunset, false);
  }
  /**
   * A method that returns the end of civil twilight using a zenith of {@link CIVIL_ZENITH 96&deg;}.
   *
   * @return {Temporal.ZonedDateTime | null} The `Date` of the end of civil twilight using a zenith of {@link CIVIL_ZENITH 96&deg;}. If
   *         the calculation can't be computed, null will be returned. See detailed explanation on top of the page.
   * @see CIVIL_ZENITH
   */
  getEndCivilTwilight() {
    return this.getSunsetOffsetByDegrees(_NOAACalculator.CIVIL_ZENITH);
  }
  /**
   * A method that returns the end of nautical twilight using a zenith of {@link NAUTICAL_ZENITH 102&deg;}.
   *
   * @return {Temporal.ZonedDateTime | null} The `Date` of the end of nautical twilight using a zenith of {@link NAUTICAL_ZENITH 102&deg;}
   *         . If the calculation can't be computed, null will be returned. See detailed explanation on top of the
   *         page.
   * @see NAUTICAL_ZENITH
   */
  getEndNauticalTwilight() {
    return this.getSunsetOffsetByDegrees(_NOAACalculator.NAUTICAL_ZENITH);
  }
  /**
   * A method that returns the end of astronomical twilight using a zenith of {@link ASTRONOMICAL_ZENITH 108&deg;}.
   *
   * @return {Temporal.ZonedDateTime | null} The `Date` of the end of astronomical twilight using a zenith of {@link ASTRONOMICAL_ZENITH
   *         108&deg;}. If the calculation can't be computed, null will be returned. See detailed explanation on top
   *         of the page.
   * @see ASTRONOMICAL_ZENITH
   */
  getEndAstronomicalTwilight() {
    return this.getSunsetOffsetByDegrees(_NOAACalculator.ASTRONOMICAL_ZENITH);
  }
  /**
   * A utility method that returns a date offset by the offset time passed in. Please note that the level of light
   * during twilight is not affected by elevation, so if this is being used to calculate an offset before sunrise or
   * after sunset with the intent of getting a rough "level of light" calculation, the sunrise or sunset time passed
   * to this method should be sea level sunrise and sunset.
   *
   * @param {Temporal.ZonedDateTime | null} time
   *            the start time
   * @param {number} offset
   *            the offset in milliseconds to add to the time.
   * @return {Temporal.ZonedDateTime | null} the `Date` with the offset in milliseconds added to it
   */
  static getTimeOffset(time, offset) {
    if (time === null || isNaN(offset)) {
      return null;
    }
    return time.add({ milliseconds: offset });
  }
  /**
   * A utility method that returns the time of an offset by degrees below or above the horizon of
   * {@link getSunrise() sunrise}. Note that the degree offset is from the vertical, so for a calculation of 14&deg;
   * before sunrise, an offset of 14 + {@link GEOMETRIC_ZENITH} = 104 would have to be passed as a parameter.
   *
   * @param {number} offsetZenith
   *            the degrees before {@link getSunrise} to use in the calculation. For time after sunrise use
   *            negative numbers. Note that the degree offset is from the vertical, so for a calculation of 14&deg;
   *            before sunrise, an offset of 14 + {@link GEOMETRIC_ZENITH} = 104 would have to be passed as a
   *            parameter.
   * @return {Temporal.ZonedDateTime | null} The `Date` of the offset after (or before) {@link getSunrise}. If the calculation
   *         can't be computed such as in the Arctic Circle where there is at least one day a year where the sun does
   *         not rise, and one where it does not set, a null will be returned. See detailed explanation on top of the
   *         page.
   */
  getSunriseOffsetByDegrees(offsetZenith) {
    const dawn = this.getUTCSunrise0(offsetZenith);
    if (isNaN(dawn))
      return null;
    return this.getDateFromTime(dawn, true);
  }
  /**
   * A utility method that returns the time of an offset by degrees below or above the horizon of {@link getSunset()
   * sunset}. Note that the degree offset is from the vertical, so for a calculation of 14&deg; after sunset, an
   * offset of 14 + {@link GEOMETRIC_ZENITH} = 104 would have to be passed as a parameter.
   *
   * @param {number} offsetZenith
   *            the degrees after {@link getSunset} to use in the calculation. For time before sunset use negative
   *            numbers. Note that the degree offset is from the vertical, so for a calculation of 14&deg; after
   *            sunset, an offset of 14 + {@link GEOMETRIC_ZENITH} = 104 would have to be passed as a parameter.
   * @return {Temporal.ZonedDateTime | null} The `Date`of the offset after (or before) {@link getSunset}. If the calculation can't
   *         be computed such as in the Arctic Circle where there is at least one day a year where the sun does not
   *         rise, and one where it does not set, a null will be returned. See detailed explanation on top of the
   *         page.
   */
  getSunsetOffsetByDegrees(offsetZenith) {
    const sunset = this.getUTCSunset0(offsetZenith);
    if (isNaN(sunset))
      return null;
    return this.getDateFromTime(sunset, false);
  }
  /**
   * A method that returns the sunrise in UTC time without correction for time zone offset from GMT and without using
   * daylight savings time.
   *
   * @param {number} zenith
   *            the degrees below the horizon. For time after sunrise use negative numbers.
   * @return {number} The time in the format: 18.75 for 18:45:00 UTC/GMT. If the calculation can't be computed such as in the
   *         Arctic Circle where there is at least one day a year where the sun does not rise, and one where it does
   *         not set, `NaN` will be returned. See detailed explanation on top of the page.
   */
  getUTCSunrise0(zenith) {
    return this.getUTCSunrise(this.getAdjustedDate(), this.geoLocation, zenith, true);
  }
  /**
   * A method that returns the sunrise in UTC time without correction for time zone offset from GMT and without using
   * daylight savings time. Non-sunrise and sunset calculations such as dawn and dusk, depend on the amount of visible
   * light, something that is not affected by elevation. This method returns UTC sunrise calculated at sea level. This
   * forms the base for dawn calculations that are calculated as a dip below the horizon before sunrise.
   *
   * @param {number} zenith
   *            the degrees below the horizon. For time after sunrise use negative numbers.
   * @return {number} The time in the format: 18.75 for 18:45:00 UTC/GMT. If the calculation can't be computed such as in the
   *         Arctic Circle where there is at least one day a year where the sun does not rise, and one where it does
   *         not set, `NaN` will be returned. See detailed explanation on top of the page.
   * @see getUTCSunrise
   * @see getUTCSeaLevelSunset
   */
  getUTCSeaLevelSunrise(zenith) {
    return this.getUTCSunrise(this.getAdjustedDate(), this.geoLocation, zenith, false);
  }
  /**
   * A method that returns the sunset in UTC time without correction for time zone offset from GMT and without using
   * daylight savings time.
   *
   * @param {number} zenith
   *            the degrees below the horizon. For time after sunset use negative numbers.
   * @return {number} The time in the format: 18.75 for 18:45:00 UTC/GMT. If the calculation can't be computed such as in the
   *         Arctic Circle where there is at least one day a year where the sun does not rise, and one where it does
   *         not set, `NaN` will be returned. See detailed explanation on top of the page.
   * @see getUTCSeaLevelSunset
   */
  getUTCSunset0(zenith) {
    return this.getUTCSunset(this.getAdjustedDate(), this.geoLocation, zenith, true);
  }
  /**
   * A method that returns the sunset in UTC time without correction for elevation, time zone offset from GMT and
   * without using daylight savings time. Non-sunrise and sunset calculations such as dawn and dusk, depend on the
   * amount of visible light, something that is not affected by elevation. This method returns UTC sunset calculated
   * at sea level. This forms the base for dusk calculations that are calculated as a dip below the horizon after
   * sunset.
   *
   * @param {number} zenith
   *            the degrees below the horizon. For time before sunset use negative numbers.
   * @return {number} The time in the format: 18.75 for 18:45:00 UTC/GMT. If the calculation can't be computed such as in the
   *         Arctic Circle where there is at least one day a year where the sun does not rise, and one where it does
   *         not set, `NaN` will be returned. See detailed explanation on top of the page.
   * @see getUTCSunset
   * @see getUTCSeaLevelSunrise
   */
  getUTCSeaLevelSunset(zenith) {
    return this.getUTCSunset(this.getAdjustedDate(), this.geoLocation, zenith, false);
  }
  /**
   * Adjusts the <code>Calendar</code> to deal with edge cases where the location crosses the antimeridian.
   * @private
   * @see GeoLocation#getAntimeridianAdjustment()
   * @return the adjusted Calendar
   */
  getAdjustedDate() {
    if (this.adjustedDate === void 0) {
      const offset = this.geoLocation.getAntimeridianAdjustment(this.date);
      this.adjustedDate = offset === 0 ? this.date : this.date.add({ days: offset });
    }
    return this.adjustedDate;
  }
  /** Memoized result of {@link getAdjustedDate} */
  adjustedDate;
  /**
   * Method to return the adjustment to the zenith required to account for the elevation. Since a person at a higher
   * elevation can see farther below the horizon, the calculation for sunrise / sunset is calculated below the horizon
   * used at sea level. This is only used for sunrise and sunset and not times before or after it such as
   * {@link getBeginNauticalTwilight() nautical twilight} since those
   * calculations are based on the level of available light at the given dip below the horizon, something that is not
   * affected by elevation, the adjustment should only made if the zenith == 90&deg; {@link adjustZenith adjusted}
   * for refraction and solar radius. The algorithm used is
   *
   * <pre>
   * elevationAdjustment = Math.toDegrees(Math.acos(earthRadiusInMeters / (earthRadiusInMeters + elevationMeters)));
   * </pre>
   *
   * The source of this algorithm is <a href="http://www.calendarists.com">Calendrical Calculations</a> by Edward M.
   * Reingold and Nachum Dershowitz. An alternate algorithm that produces an almost identical (but not accurate)
   * result found in Ma'aglay Tzedek by Moishe Kosower and other sources is:
   *
   * <pre>
   * elevationAdjustment = 0.0347 * Math.sqrt(elevationMeters);
   * </pre>
   *
   * @param {number} elevation
   *            elevation in Meters.
   * @return {number} the adjusted zenith
   */
  getElevationAdjustment(elevation) {
    const elevationAdjustment = radiansToDegrees(Math.acos(earthRadius / (earthRadius + elevation / 1e3)));
    return elevationAdjustment;
  }
  /**
   * Adjusts the zenith of astronomical sunrise and sunset to account for solar refraction, solar radius and
   * elevation. The value for Sun's zenith and true rise/set Zenith (used in this class and subclasses) is the angle
   * that the center of the Sun makes to a line perpendicular to the Earth's surface. If the Sun were a point and the
   * Earth were without an atmosphere, true sunset and sunrise would correspond to a 90&deg; zenith. Because the Sun
   * is not a point, and because the atmosphere refracts light, this 90&deg; zenith does not, in fact, correspond to
   * true sunset or sunrise, instead the centre of the Sun's disk must lie just below the horizon for the upper edge
   * to be obscured. This means that a zenith of just above 90&deg; must be used. The Sun subtends an angle of 16
   * minutes of arc, and atmospheric refraction
   * accounts for 34 minutes or so, giving a total
   * of 50 arcminutes. The total value for ZENITH is 90+(5/6) or 90.8333333&deg; for true sunrise/sunset. Since a
   * person at an elevation can see blow the horizon of a person at sea level, this will also adjust the zenith to
   * account for elevation if available. Note that this will only adjust the value if the zenith is exactly 90 degrees.
   * For values below and above this no correction is done. As an example, astronomical twilight is when the sun is
   * 18&deg; below the horizon or {@link ASTRONOMICAL_ZENITH 108&deg;
   * below the zenith}. This is traditionally calculated with none of the above mentioned adjustments. The same goes
   * for various <em>tzais</em> and <em>alos</em> times such as the
   * {@link ZmanimCalendar#ZENITH_16_POINT_1 16.1&deg;} dip used in
   * {@link ComplexZmanimCalendar#getAlos16Point1Degrees}.
   *
   * @param {number} zenith
   *            the azimuth below the vertical zenith of 90&deg;. For sunset typically the {@link adjustZenith
   *            zenith} used for the calculation uses geometric zenith of 90&deg; and {@link adjustZenith adjusts}
   *            this slightly to account for solar refraction and the sun's radius. Another example would be
   *            {@link getEndNauticalTwilight} that passes
   *            {@link NAUTICAL_ZENITH} to this method.
   * @param {number} elevation
   *            elevation in Meters.
   * @return {number} The zenith adjusted to include the sun's radius, refracton
   *         and {@link getElevationAdjustment elevation} adjustment. This will only be adjusted for
   *         sunrise and sunset (if the zenith == 90&deg;)
   * @see getElevationAdjustment
   */
  adjustZenith(zenith, elevation) {
    let adjustedZenith = zenith;
    if (zenith === _NOAACalculator.GEOMETRIC_ZENITH) {
      adjustedZenith = zenith + (solarRadius + refraction + this.getElevationAdjustment(elevation));
    }
    return adjustedZenith;
  }
  /**
   * The <a href="http://en.wikipedia.org/wiki/Julian_day">Julian day</a> of January 1, 2000
   * @private
   */
  static JULIAN_DAY_JAN_1_2000 = 2451545;
  /**
   * Julian days per century
   * @private
   */
  static JULIAN_DAYS_PER_CENTURY = 36525;
  /**
   * A method that calculates UTC sunrise as well as any time based on an angle above or below sunrise.
   * @param date
   *            Used to calculate day of year.
   * @param geoLocation
   *            The location information used for astronomical calculating sun times.
   * @param zenith
   *            the azimuth below the vertical zenith of 90 degrees. for sunrise typically the {@link adjustZenith
   *            zenith} used for the calculation uses geometric zenith of 90&deg; and {@link adjustZenith adjusts}
   *            this slightly to account for solar refraction and the sun's radius. Another example would be
   *            {@link getBeginNauticalTwilight} that passes
   *            {@link NAUTICAL_ZENITH} to this method.
   * @param adjustForElevation
   *            Should the time be adjusted for elevation
   * @return The UTC time of sunrise in 24 hour format. 5:45:00 AM will return 5.75.0. If an error was encountered in
   *         the calculation (expected behavior for some locations such as near the poles,
   *         `NaN` will be returned.
   */
  getUTCSunrise(date, geoLocation, zenith, adjustForElevation) {
    const elevation = adjustForElevation ? geoLocation.getElevation() : 0;
    const adjustedZenith = this.adjustZenith(zenith, elevation);
    let sunrise = _NOAACalculator.getSunriseUTC(_NOAACalculator.getJulianDay(date), geoLocation.getLatitude(), -geoLocation.getLongitude(), adjustedZenith);
    sunrise = sunrise / 60;
    while (sunrise < 0) {
      sunrise += 24;
    }
    while (sunrise >= 24) {
      sunrise -= 24;
    }
    return sunrise;
  }
  /**
   * A method that calculates UTC sunset as well as any time based on an angle above or below sunset.
   * @param date
   *            Used to calculate day of year.
   * @param geoLocation
   *            The location information used for astronomical calculating sun times.
   * @param zenith
   *            the azimuth below the vertical zenith of 90&deg;. For sunset typically the {@link adjustZenith
   *            zenith} used for the calculation uses geometric zenith of 90&deg; and {@link adjustZenith adjusts}
   *            this slightly to account for solar refraction and the sun's radius. Another example would be
   *            {@link getEndNauticalTwilight} that passes
   *            {@link NAUTICAL_ZENITH} to this method.
   * @param adjustForElevation
   *            Should the time be adjusted for elevation
   * @return The UTC time of sunset in 24 hour format. 5:45:00 AM will return 5.75.0. If an error was encountered in
   *         the calculation (expected behavior for some locations such as near the poles,
   *         `NaN` will be returned.
   */
  getUTCSunset(date, geoLocation, zenith, adjustForElevation) {
    const elevation = adjustForElevation ? geoLocation.getElevation() : 0;
    const adjustedZenith = this.adjustZenith(zenith, elevation);
    let sunset = _NOAACalculator.getSunsetUTC(_NOAACalculator.getJulianDay(date), geoLocation.getLatitude(), -geoLocation.getLongitude(), adjustedZenith);
    sunset = sunset / 60;
    while (sunset < 0) {
      sunset += 24;
    }
    while (sunset >= 24) {
      sunset -= 24;
    }
    return sunset;
  }
  /**
   * A utility method that will allow the calculation of a temporal (solar) hour based on the sunrise and sunset
   * passed as parameters to this method. An example of the use of this method would be the calculation of a
   * non-elevation adjusted temporal hour by passing in {@link getSeaLevelSunrise() sea level sunrise} and
   * {@link getSeaLevelSunset() sea level sunset} as parameters.
   *
   * @param {Temporal.ZonedDateTime | null} startOfDay
   *            The start of the day.
   * @param {Temporal.ZonedDateTime | null} endOfDay
   *            The end of the day.
   *
   * @return {number} the <code>long</code> millisecond length of the temporal hour. If the calculation can't be computed a
   *         `NaN` will be returned. See detailed explanation on top of the page.
   *
   * @see getTemporalHour()
   */
  getTemporalHour(startOfDay = this.getSeaLevelSunrise(), endOfDay = this.getSeaLevelSunset()) {
    if (startOfDay === null || endOfDay === null) {
      return NaN;
    }
    const delta = endOfDay.epochMilliseconds - startOfDay.epochMilliseconds;
    return Math.floor(delta / 12);
  }
  /**
   * A method that returns sundial or solar noon. It occurs when the Sun is <a href
   * ="http://en.wikipedia.org/wiki/Transit_%28astronomy%29">transiting</a> the <a
   * href="http://en.wikipedia.org/wiki/Meridian_%28astronomy%29">celestial meridian</a>. In this class it is
   * calculated as halfway between the sunrise and sunset passed to this method. This time can be slightly off the
   * real transit time due to changes in declination (the lengthening or shortening day).
   *
   * @param {Temporal.ZonedDateTime | null} startOfDay
   *            the start of day for calculating the sun's transit. This can be sea level sunrise, visual sunrise (or
   *            any arbitrary start of day) passed to this method.
   * @param {Temporal.ZonedDateTime | null} endOfDay
   *            the end of day for calculating the sun's transit. This can be sea level sunset, visual sunset (or any
   *            arbitrary end of day) passed to this method.
   *
   * @return {Temporal.ZonedDateTime | null} The `Date` representing Sun's transit. If the calculation can't be computed such as in the
   *         Arctic Circle where there is at least one day a year where the sun does not rise, and one where it does
   *         not set, null will be returned. See detailed explanation on top of the page.
   */
  getSunTransit(startOfDay = this.getSeaLevelSunrise(), endOfDay = this.getSeaLevelSunset()) {
    const temporalHour = this.getTemporalHour(startOfDay, endOfDay);
    return _NOAACalculator.getTimeOffset(startOfDay, temporalHour * 6);
  }
  /**
   * A method that returns a `Date` from the time passed in as a parameter.
   * @protected
   * @param {number} time
   *            The time to be set as the time for the `Date`. The time expected is in the format: 18.75
   *            for 6:45:00 PM.
   * @param {boolean} isSunrise true if the time is sunrise, and false if it is sunset
   * @return {Temporal.ZonedDateTime | null} The Date.
   */
  getDateFromTime(time, isSunrise) {
    const epochMillis = this.getEpochMillisFromTime(time, isSunrise);
    if (isNaN(epochMillis)) {
      return null;
    }
    return Temporal.Instant.fromEpochMilliseconds(epochMillis).toZonedDateTimeISO(this.geoLocation.getTimeZone());
  }
  /**
   * The instant that {@link getDateFromTime} describes, as milliseconds since
   * the epoch, without building a `Temporal.ZonedDateTime`.
   *
   * Constructing a `ZonedDateTime` costs roughly 750ns because the IANA zone
   * has to be resolved, and that dominates this calculation. Callers that only
   * want an instant — a `Date`, or the difference between two times — can skip
   * it. Deriving the instant arithmetically also avoids a `PlainTime`
   * allocation and turns the day rollover into a subtraction rather than a
   * ~610ns `PlainDate.add({days})`.
   *
   * @param {number} time
   *            The time in the format 18.75 for 6:45:00 PM, as returned by
   *            {@link getUTCSunrise} / {@link getUTCSunset}, i.e. already
   *            normalized to `[0, 24)`.
   * @param {boolean} isSunrise true if the time is sunrise, and false if it is sunset
   * @return {number} milliseconds since the epoch, or `NaN` if `time` is `NaN`
   */
  getEpochMillisFromTime(time, isSunrise) {
    if (isNaN(time)) {
      return NaN;
    }
    let calculatedTime = time;
    const cal = this.getAdjustedDate();
    const hours = Math.trunc(calculatedTime);
    calculatedTime -= hours;
    const minutes = Math.trunc(calculatedTime *= 60);
    calculatedTime -= minutes;
    const seconds = Math.trunc(calculatedTime *= 60);
    calculatedTime -= seconds;
    const localTimeHours = Math.trunc(this.geoLocation.getLongitude() / 15);
    let dayOffset = 0;
    if (isSunrise && localTimeHours + hours > 18) {
      dayOffset = -1;
    } else if (!isSunrise && localTimeHours + hours < 6) {
      dayOffset = 1;
    }
    const year = cal.year;
    let millis = Date.UTC(year, cal.month - 1, cal.day, hours, minutes, seconds, Math.trunc(calculatedTime * 1e3));
    if (year >= 0 && year < 100) {
      const d2 = new Date(millis);
      d2.setUTCFullYear(year);
      millis = d2.getTime();
    }
    return millis + dayOffset * 864e5;
  }
  /**
   * Return the <a href="http://en.wikipedia.org/wiki/Julian_day">Julian day</a> from a Java Calendar
   * @private
   * @param {Temporal.ZonedDateTime} date
   *            The Java Calendar
   * @return the Julian day corresponding to the date Note: Number is returned for start of day. Fractional days
   *         should be added later.
   */
  static getJulianDay(date) {
    let { year, month } = date;
    const { day } = date;
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    const a = Math.trunc(year / 100);
    const b = 2 - a + Math.trunc(a / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
  }
  /**
   * Convert <a href="http://en.wikipedia.org/wiki/Julian_day">Julian day</a> to centuries since J2000.0.
   * @private
   * @param julianDay
   *            the Julian Day to convert
   * @return the centuries since 2000 Julian corresponding to the Julian Day
   */
  static getJulianCenturiesFromJulianDay(julianDay) {
    return (julianDay - _NOAACalculator.JULIAN_DAY_JAN_1_2000) / _NOAACalculator.JULIAN_DAYS_PER_CENTURY;
  }
  /**
   * Convert centuries since J2000.0 to <a href="http://en.wikipedia.org/wiki/Julian_day">Julian day</a>.
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return the Julian Day corresponding to the Julian centuries passed in
   */
  static getJulianDayFromJulianCenturies(julianCenturies) {
    return julianCenturies * _NOAACalculator.JULIAN_DAYS_PER_CENTURY + _NOAACalculator.JULIAN_DAY_JAN_1_2000;
  }
  /**
   * Returns the Geometric <a href="http://en.wikipedia.org/wiki/Mean_longitude">Mean Longitude</a> of the Sun.
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return the Geometric Mean Longitude of the Sun in degrees
   */
  static getSunGeometricMeanLongitude(julianCenturies) {
    let longitude = 280.46646 + julianCenturies * (36000.76983 + 3032e-7 * julianCenturies);
    while (longitude > 360) {
      longitude -= 360;
    }
    while (longitude < 0) {
      longitude += 360;
    }
    return longitude;
  }
  /**
   * Returns the Geometric <a href="http://en.wikipedia.org/wiki/Mean_anomaly">Mean Anomaly</a> of the Sun.
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return the Geometric Mean Anomaly of the Sun in degrees
   */
  static getSunGeometricMeanAnomaly(julianCenturies) {
    return 357.52911 + julianCenturies * (35999.05029 - 1537e-7 * julianCenturies);
  }
  /**
   * Return the <a href="http://en.wikipedia.org/wiki/Eccentricity_%28orbit%29">eccentricity of earth's orbit</a>.
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return the unitless eccentricity
   */
  static getEarthOrbitEccentricity(julianCenturies) {
    return 0.016708634 - julianCenturies * (42037e-9 + 1267e-10 * julianCenturies);
  }
  /**
   * Returns the <a href="http://en.wikipedia.org/wiki/Equation_of_the_center">equation of center</a> for the sun.
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return the equation of center for the sun in degrees
   */
  static getSunEquationOfCenter(julianCenturies) {
    const m = _NOAACalculator.getSunGeometricMeanAnomaly(julianCenturies);
    const mrad = degreesToRadians(m);
    const sinm = Math.sin(mrad);
    const sin2m = Math.sin(mrad + mrad);
    const sin3m = Math.sin(mrad + mrad + mrad);
    return sinm * (1.914602 - julianCenturies * (4817e-6 + 14e-6 * julianCenturies)) + sin2m * (0.019993 - 101e-6 * julianCenturies) + sin3m * 289e-6;
  }
  /**
   * Return the true longitude of the sun
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return the sun's true longitude in degrees
   */
  static getSunTrueLongitude(julianCenturies) {
    const sunLongitude = _NOAACalculator.getSunGeometricMeanLongitude(julianCenturies);
    const center = _NOAACalculator.getSunEquationOfCenter(julianCenturies);
    return sunLongitude + center;
  }
  /**
   * Return the apparent longitude of the sun
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return sun's apparent longitude in degrees
   */
  static getSunApparentLongitude(julianCenturies) {
    const sunTrueLongitude = _NOAACalculator.getSunTrueLongitude(julianCenturies);
    const omega = 125.04 - 1934.136 * julianCenturies;
    const lambda = sunTrueLongitude - 569e-5 - 478e-5 * Math.sin(degreesToRadians(omega));
    return lambda;
  }
  /**
   * Returns the mean <a href="http://en.wikipedia.org/wiki/Axial_tilt">obliquity of the ecliptic</a> (Axial tilt).
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return the mean obliquity in degrees
   */
  static getMeanObliquityOfEcliptic(julianCenturies) {
    const seconds = 21.448 - julianCenturies * (46.815 + julianCenturies * (59e-5 - julianCenturies * 1813e-6));
    return 23 + (26 + seconds / 60) / 60;
  }
  /**
   * Returns the corrected <a href="http://en.wikipedia.org/wiki/Axial_tilt">obliquity of the ecliptic</a> (Axial
   * tilt).
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return the corrected obliquity in degrees
   */
  static getObliquityCorrection(julianCenturies) {
    const obliquityOfEcliptic = _NOAACalculator.getMeanObliquityOfEcliptic(julianCenturies);
    const omega = 125.04 - 1934.136 * julianCenturies;
    return obliquityOfEcliptic + 256e-5 * Math.cos(degreesToRadians(omega));
  }
  /**
   * Return the <a href="http://en.wikipedia.org/wiki/Declination">declination</a> of the sun.
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return
   *            the sun's declination in degrees
   */
  static getSunDeclination(julianCenturies) {
    const obliquityCorrection = _NOAACalculator.getObliquityCorrection(julianCenturies);
    const lambda = _NOAACalculator.getSunApparentLongitude(julianCenturies);
    const sint = Math.sin(degreesToRadians(obliquityCorrection)) * Math.sin(degreesToRadians(lambda));
    const theta = radiansToDegrees(Math.asin(sint));
    return theta;
  }
  /**
   * Return the <a href="http://en.wikipedia.org/wiki/Equation_of_time">Equation of Time</a> - the difference between
   * true solar time and mean solar time
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @return equation of time in minutes of time
   */
  static getEquationOfTime(julianCenturies) {
    const epsilon = _NOAACalculator.getObliquityCorrection(julianCenturies);
    const geomMeanLongSun = _NOAACalculator.getSunGeometricMeanLongitude(julianCenturies);
    const eccentricityEarthOrbit = _NOAACalculator.getEarthOrbitEccentricity(julianCenturies);
    const geomMeanAnomalySun = _NOAACalculator.getSunGeometricMeanAnomaly(julianCenturies);
    let y = Math.tan(degreesToRadians(epsilon) / 2);
    y *= y;
    const sin2l0 = Math.sin(2 * degreesToRadians(geomMeanLongSun));
    const sinm = Math.sin(degreesToRadians(geomMeanAnomalySun));
    const cos2l0 = Math.cos(2 * degreesToRadians(geomMeanLongSun));
    const sin4l0 = Math.sin(4 * degreesToRadians(geomMeanLongSun));
    const sin2m = Math.sin(2 * degreesToRadians(geomMeanAnomalySun));
    const equationOfTime = y * sin2l0 - 2 * eccentricityEarthOrbit * sinm + 4 * eccentricityEarthOrbit * y * sinm * cos2l0 - 0.5 * y * y * sin4l0 - 1.25 * eccentricityEarthOrbit * eccentricityEarthOrbit * sin2m;
    return radiansToDegrees(equationOfTime) * 4;
  }
  /**
   * Return the <a href="http://en.wikipedia.org/wiki/Hour_angle">hour angle</a> of the sun at sunrise for the
   * latitude.
   * @private
   * @param {number} lat
   *            , the latitude of observer in degrees
   * @param solarDec
   *            the declination angle of sun in degrees
   * @param {number} zenith
   *            the zenith
   * @return hour angle of sunrise in radians
   */
  static getSunHourAngleAtSunrise(lat, solarDec, zenith) {
    const latRad = degreesToRadians(lat);
    const sdRad = degreesToRadians(solarDec);
    return Math.acos(Math.cos(degreesToRadians(zenith)) / (Math.cos(latRad) * Math.cos(sdRad)) - Math.tan(latRad) * Math.tan(sdRad));
  }
  /**
   * Returns the <a href="http://en.wikipedia.org/wiki/Hour_angle">hour angle</a> of the sun at sunset for the
   * latitude.
   * @private
   * @param {number} lat
   *            the latitude of observer in degrees
   * @param solarDec
   *            the declination angle of sun in degrees
   * @param {number} zenith
   *            the zenith
   * @return the hour angle of sunset in radians
   */
  static getSunHourAngleAtSunset(lat, solarDec, zenith) {
    const latRad = degreesToRadians(lat);
    const sdRad = degreesToRadians(solarDec);
    const hourAngle = Math.acos(Math.cos(degreesToRadians(zenith)) / (Math.cos(latRad) * Math.cos(sdRad)) - Math.tan(latRad) * Math.tan(sdRad));
    return -hourAngle;
  }
  /**
   * Return the <a href="http://en.wikipedia.org/wiki/Celestial_coordinate_system">Solar Elevation</a> for the
   * horizontal coordinate system at the given location at the given time. Can be negative if the sun is below the
   * horizon. Not corrected for altitude.
   *
   * @param {Temporal.ZonedDateTime} date
   *            time of calculation
   * @param {number} lat
   *            latitude of location for calculation
   * @param {number} lon
   *            longitude of location for calculation
   * @return {number} solar elevation in degrees - horizon is 0 degrees, civil twilight is -6 degrees
   */
  static getSolarElevation(date, lat, lon) {
    const julianDay = _NOAACalculator.getJulianDay(date.toPlainDate());
    const julianCenturies = _NOAACalculator.getJulianCenturiesFromJulianDay(julianDay);
    const equationOfTime = _NOAACalculator.getEquationOfTime(julianCenturies);
    let longitude = date.hour + 12 + (date.minute + equationOfTime + date.second / 60) / 60;
    longitude = -(longitude * 360 / 24) % 360;
    const hourAngleRad = degreesToRadians(lon - longitude);
    const declination = _NOAACalculator.getSunDeclination(julianCenturies);
    const decRad = degreesToRadians(declination);
    const latRad = degreesToRadians(lat);
    return radiansToDegrees(Math.asin(Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngleRad)));
  }
  /**
   * Return the <a href="http://en.wikipedia.org/wiki/Celestial_coordinate_system">Solar Azimuth</a> for the
   * horizontal coordinate system at the given location at the given time. Not corrected for altitude. True south is 0
   * degrees.
   *
   * @param {Temporal.ZonedDateTime} date
   *            time of calculation
   * @param {number} latitude
   *            latitude of location for calculation
   * @param {number} lon
   *            longitude of location for calculation
   * @return {number}
   */
  static getSolarAzimuth(date, latitude, lon) {
    const julianDay = _NOAACalculator.getJulianDay(date.toPlainDate());
    const julianCenturies = _NOAACalculator.getJulianCenturiesFromJulianDay(julianDay);
    const equationOfTime = _NOAACalculator.getEquationOfTime(julianCenturies);
    let longitude = date.hour + 12 + (date.minute + equationOfTime + date.second / 60) / 60;
    longitude = -(longitude * 360 / 24) % 360;
    const hourAngleRad = degreesToRadians(lon - longitude);
    const declination = _NOAACalculator.getSunDeclination(julianCenturies);
    const decRad = degreesToRadians(declination);
    const latRad = degreesToRadians(latitude);
    return radiansToDegrees(Math.atan(Math.sin(hourAngleRad) / (Math.cos(hourAngleRad) * Math.sin(latRad) - Math.tan(decRad) * Math.cos(latRad)))) + 180;
  }
  /**
   * Return the <a href="http://en.wikipedia.org/wiki/Universal_Coordinated_Time">Universal Coordinated Time</a> (UTC)
   * of sunrise for the given day at the given location on earth
   * @private
   * @param julianDay
   *            the Julian day
   * @param {number} latitude
   *            the latitude of observer in degrees
   * @param {number} longitude
   *            the longitude of observer in degrees
   * @param {number} zenith
   *            the zenith
   * @return the time in minutes from zero UTC
   */
  static getSunriseUTC(julianDay, latitude, longitude, zenith) {
    const julianCenturies = _NOAACalculator.getJulianCenturiesFromJulianDay(julianDay);
    const noonmin = _NOAACalculator.getSolarNoonUTC(julianCenturies, longitude);
    const tnoon = _NOAACalculator.getJulianCenturiesFromJulianDay(julianDay + noonmin / 1440);
    let eqTime = _NOAACalculator.getEquationOfTime(tnoon);
    let solarDec = _NOAACalculator.getSunDeclination(tnoon);
    let hourAngle = _NOAACalculator.getSunHourAngleAtSunrise(latitude, solarDec, zenith);
    let delta = longitude - radiansToDegrees(hourAngle);
    let timeDiff = 4 * delta;
    let timeUTC = 720 + timeDiff - eqTime;
    const newt = _NOAACalculator.getJulianCenturiesFromJulianDay(_NOAACalculator.getJulianDayFromJulianCenturies(julianCenturies) + timeUTC / 1440);
    eqTime = _NOAACalculator.getEquationOfTime(newt);
    solarDec = _NOAACalculator.getSunDeclination(newt);
    hourAngle = _NOAACalculator.getSunHourAngleAtSunrise(latitude, solarDec, zenith);
    delta = longitude - radiansToDegrees(hourAngle);
    timeDiff = 4 * delta;
    timeUTC = 720 + timeDiff - eqTime;
    return timeUTC;
  }
  /**
   * Return the <a href="http://en.wikipedia.org/wiki/Universal_Coordinated_Time">Universal Coordinated Time</a> (UTC)
   * of <a href="http://en.wikipedia.org/wiki/Noon#Solar_noon">solar noon</a> for the given day at the given location
   * on earth.
   * @private
   * @param julianCenturies
   *            the number of Julian centuries since J2000.0
   * @param {number} longitude
   *            the longitude of observer in degrees
   * @return the time in minutes from zero UTC
   */
  static getSolarNoonUTC(julianCenturies, longitude) {
    const tnoon = _NOAACalculator.getJulianCenturiesFromJulianDay(_NOAACalculator.getJulianDayFromJulianCenturies(julianCenturies) + longitude / 360);
    let eqTime = _NOAACalculator.getEquationOfTime(tnoon);
    const solNoonUTC = 720 + longitude * 4 - eqTime;
    const newt = _NOAACalculator.getJulianCenturiesFromJulianDay(_NOAACalculator.getJulianDayFromJulianCenturies(julianCenturies) - 0.5 + solNoonUTC / 1440);
    eqTime = _NOAACalculator.getEquationOfTime(newt);
    return 720 + longitude * 4 - eqTime;
  }
  /**
   * Return the <a href="http://en.wikipedia.org/wiki/Universal_Coordinated_Time">Universal Coordinated Time</a> (UTC)
   * of sunset for the given day at the given location on earth
   * @private
   * @param julianDay
   *            the Julian day
   * @param {number} latitude
   *            the latitude of observer in degrees
   * @param {number} longitude
   *            : longitude of observer in degrees
   * @param {number} zenith
   *            the zenith
   * @return the time in minutes from zero Universal Coordinated Time (UTC)
   */
  static getSunsetUTC(julianDay, latitude, longitude, zenith) {
    const julianCenturies = _NOAACalculator.getJulianCenturiesFromJulianDay(julianDay);
    const noonmin = _NOAACalculator.getSolarNoonUTC(julianCenturies, longitude);
    const tnoon = _NOAACalculator.getJulianCenturiesFromJulianDay(julianDay + noonmin / 1440);
    let eqTime = _NOAACalculator.getEquationOfTime(tnoon);
    let solarDec = _NOAACalculator.getSunDeclination(tnoon);
    let hourAngle = _NOAACalculator.getSunHourAngleAtSunset(latitude, solarDec, zenith);
    let delta = longitude - radiansToDegrees(hourAngle);
    let timeDiff = 4 * delta;
    let timeUTC = 720 + timeDiff - eqTime;
    const newt = _NOAACalculator.getJulianCenturiesFromJulianDay(_NOAACalculator.getJulianDayFromJulianCenturies(julianCenturies) + timeUTC / 1440);
    eqTime = _NOAACalculator.getEquationOfTime(newt);
    solarDec = _NOAACalculator.getSunDeclination(newt);
    hourAngle = _NOAACalculator.getSunHourAngleAtSunset(latitude, solarDec, zenith);
    delta = longitude - radiansToDegrees(hourAngle);
    timeDiff = 4 * delta;
    timeUTC = 720 + timeDiff - eqTime;
    return timeUTC;
  }
};

// node_modules/@hebcal/core/dist/esm/cities.json.js
var citiesJson = [
  "Ashdod|IL|31.79213|34.64966|Asia/Jerusalem|27",
  "Atlanta|US|33.749|-84.38798|America/New_York|336",
  "Austin|US|30.26715|-97.74306|America/Chicago|165",
  "Baghdad|IQ|33.34058|44.40088|Asia/Baghdad|41",
  "Beer Sheva|IL|31.25181|34.7913|Asia/Jerusalem|285",
  "Berlin|DE|52.52437|13.41053|Europe/Berlin|43",
  "Baltimore|US|39.29038|-76.61219|America/New_York|35",
  "Bogota|CO|4.60971|-74.08175|America/Bogota|2582",
  "Boston|US|42.35843|-71.05977|America/New_York|38",
  "Budapest|HU|47.49801|19.03991|Europe/Budapest|104",
  "Buenos Aires|AR|-34.61315|-58.37723|America/Argentina/Buenos_Aires|31",
  "Buffalo|US|42.88645|-78.87837|America/New_York|191",
  "Chicago|US|41.85003|-87.65005|America/Chicago|180",
  "Cincinnati|US|39.162|-84.45689|America/New_York|267",
  "Cleveland|US|41.4995|-81.69541|America/New_York|204",
  "Dallas|US|32.78306|-96.80667|America/Chicago|139",
  "Denver|US|39.73915|-104.9847|America/Denver|1636",
  "Detroit|US|42.33143|-83.04575|America/Detroit|192",
  "Eilat|IL|29.55805|34.94821|Asia/Jerusalem|63",
  "Gibraltar|GI|36.14474|-5.35257|Europe/Gibraltar|11",
  "Haifa|IL|32.81841|34.9885|Asia/Jerusalem|40",
  "Hawaii|US|21.30694|-157.85833|Pacific/Honolulu|18",
  "Helsinki|FI|60.16952|24.93545|Europe/Helsinki|26",
  "Houston|US|29.76328|-95.36327|America/Chicago|30",
  "Jerusalem|IL|31.76904|35.21633|Asia/Jerusalem|786",
  "Johannesburg|ZA|-26.20227|28.04363|Africa/Johannesburg|1767",
  "Kiev|UA|50.45466|30.5238|Europe/Kiev|187",
  "La Paz|BO|-16.5|-68.15|America/La_Paz|3782",
  "Livingston|US|40.79593|-74.31487|America/New_York|98",
  "Las Vegas|US|36.17497|-115.13722|America/Los_Angeles|613",
  "London|GB|51.50853|-0.12574|Europe/London|25",
  "Los Angeles|US|34.05223|-118.24368|America/Los_Angeles|96",
  "Marseilles|FR|43.29695|5.38107|Europe/Paris|28",
  "Miami|US|25.77427|-80.19366|America/New_York|25",
  "Minneapolis|US|44.97997|-93.26384|America/Chicago|262",
  "Melbourne|AU|-37.814|144.96332|Australia/Melbourne|25",
  "Mexico City|MX|19.42847|-99.12766|America/Mexico_City|2240",
  "Montreal|CA|45.50884|-73.58781|America/Toronto|216",
  "Moscow|RU|55.75222|37.61556|Europe/Moscow|144",
  "New York|US|40.71427|-74.00597|America/New_York|57",
  "Omaha|US|41.25861|-95.93779|America/Chicago|315",
  "Ottawa|CA|45.41117|-75.69812|America/Toronto|71",
  "Panama City|PA|8.9936|-79.51973|America/Panama|17",
  "Paris|FR|48.85341|2.3488|Europe/Paris|42",
  "Pawtucket|US|41.87871|-71.38256|America/New_York|0",
  "Petach Tikvah|IL|32.08707|34.88747|Asia/Jerusalem|54",
  "Philadelphia|US|39.95233|-75.16379|America/New_York|8",
  "Phoenix|US|33.44838|-112.07404|America/Phoenix|366",
  "Pittsburgh|US|40.44062|-79.99589|America/New_York|239",
  "Providence|US|41.82399|-71.41283|America/New_York|0",
  "Portland|US|45.52345|-122.67621|America/Los_Angeles|15",
  "Saint Louis|US|38.62727|-90.19789|America/Chicago|149",
  "Saint Petersburg|RU|59.93863|30.31413|Europe/Moscow|11",
  "San Diego|US|32.71533|-117.15726|America/Los_Angeles|20",
  "San Francisco|US|37.77493|-122.41942|America/Los_Angeles|28",
  "Sao Paulo|BR|-23.5475|-46.63611|America/Sao_Paulo|769",
  "Seattle|US|47.60621|-122.33207|America/Los_Angeles|56",
  "Sydney|AU|-33.86785|151.20732|Australia/Sydney|58",
  "Tel Aviv|IL|32.08088|34.78057|Asia/Jerusalem|15",
  "Tiberias|IL|32.79221|35.53124|Asia/Jerusalem|0",
  "Toronto|CA|43.70011|-79.4163|America/Toronto|175",
  "Vancouver|CA|49.24966|-123.11934|America/Vancouver|70",
  "White Plains|US|41.03399|-73.76291|America/New_York|82",
  "Washington DC|US|38.89511|-77.03637|America/New_York|6",
  "Worcester|US|42.26259|-71.80229|America/New_York|164"
];

// node_modules/quick-lru/index.js
var QuickLRU = class extends Map {
  #size = 0;
  #cache = /* @__PURE__ */ new Map();
  #oldCache = /* @__PURE__ */ new Map();
  #maxSize;
  #maxAge;
  #onEviction;
  constructor(options = {}) {
    super();
    if (!(options.maxSize && options.maxSize > 0)) {
      throw new TypeError("`maxSize` must be a number greater than 0");
    }
    if (typeof options.maxAge === "number" && options.maxAge === 0) {
      throw new TypeError("`maxAge` must be a number greater than 0");
    }
    this.#maxSize = options.maxSize;
    this.#maxAge = options.maxAge || Number.POSITIVE_INFINITY;
    this.#onEviction = options.onEviction;
  }
  // For tests.
  get __oldCache() {
    return this.#oldCache;
  }
  #emitEvictions(cache) {
    if (typeof this.#onEviction !== "function") {
      return;
    }
    for (const [key, item] of cache) {
      this.#onEviction(key, item.value);
    }
  }
  #deleteIfExpired(key, item) {
    if (typeof item.expiry === "number" && item.expiry <= Date.now()) {
      if (typeof this.#onEviction === "function") {
        this.#onEviction(key, item.value);
      }
      return this.delete(key);
    }
    return false;
  }
  #getOrDeleteIfExpired(key, item) {
    const deleted = this.#deleteIfExpired(key, item);
    if (deleted === false) {
      return item.value;
    }
  }
  #getItemValue(key, item) {
    return item.expiry ? this.#getOrDeleteIfExpired(key, item) : item.value;
  }
  #peek(key, cache) {
    const item = cache.get(key);
    return this.#getItemValue(key, item);
  }
  #set(key, value) {
    this.#cache.set(key, value);
    this.#size++;
    if (this.#size >= this.#maxSize) {
      this.#size = 0;
      this.#emitEvictions(this.#oldCache);
      this.#oldCache = this.#cache;
      this.#cache = /* @__PURE__ */ new Map();
    }
  }
  #moveToRecent(key, item) {
    this.#oldCache.delete(key);
    this.#set(key, item);
  }
  *#entriesAscending() {
    for (const item of this.#oldCache) {
      const [key, value] = item;
      if (!this.#cache.has(key)) {
        const deleted = this.#deleteIfExpired(key, value);
        if (deleted === false) {
          yield item;
        }
      }
    }
    for (const item of this.#cache) {
      const [key, value] = item;
      const deleted = this.#deleteIfExpired(key, value);
      if (deleted === false) {
        yield item;
      }
    }
  }
  get(key) {
    if (this.#cache.has(key)) {
      const item = this.#cache.get(key);
      return this.#getItemValue(key, item);
    }
    if (this.#oldCache.has(key)) {
      const item = this.#oldCache.get(key);
      if (this.#deleteIfExpired(key, item) === false) {
        this.#moveToRecent(key, item);
        return item.value;
      }
    }
  }
  set(key, value, { maxAge = this.#maxAge } = {}) {
    const expiry = typeof maxAge === "number" && maxAge !== Number.POSITIVE_INFINITY ? Date.now() + maxAge : void 0;
    if (this.#cache.has(key)) {
      this.#cache.set(key, {
        value,
        expiry
      });
    } else {
      this.#set(key, { value, expiry });
    }
    return this;
  }
  has(key) {
    if (this.#cache.has(key)) {
      return !this.#deleteIfExpired(key, this.#cache.get(key));
    }
    if (this.#oldCache.has(key)) {
      return !this.#deleteIfExpired(key, this.#oldCache.get(key));
    }
    return false;
  }
  peek(key) {
    if (this.#cache.has(key)) {
      return this.#peek(key, this.#cache);
    }
    if (this.#oldCache.has(key)) {
      return this.#peek(key, this.#oldCache);
    }
  }
  expiresIn(key) {
    const item = this.#cache.get(key) ?? this.#oldCache.get(key);
    if (item) {
      return item.expiry ? item.expiry - Date.now() : Number.POSITIVE_INFINITY;
    }
  }
  delete(key) {
    const deleted = this.#cache.delete(key);
    if (deleted) {
      this.#size--;
    }
    return this.#oldCache.delete(key) || deleted;
  }
  clear() {
    this.#cache.clear();
    this.#oldCache.clear();
    this.#size = 0;
  }
  resize(newSize) {
    if (!(newSize && newSize > 0)) {
      throw new TypeError("`maxSize` must be a number greater than 0");
    }
    const items = [...this.#entriesAscending()];
    const removeCount = items.length - newSize;
    if (removeCount < 0) {
      this.#cache = new Map(items);
      this.#oldCache = /* @__PURE__ */ new Map();
      this.#size = items.length;
    } else {
      if (removeCount > 0) {
        this.#emitEvictions(items.slice(0, removeCount));
      }
      this.#oldCache = new Map(items.slice(removeCount));
      this.#cache = /* @__PURE__ */ new Map();
      this.#size = 0;
    }
    this.#maxSize = newSize;
  }
  evict(count = 1) {
    const requested = Number(count);
    if (!requested || requested <= 0) {
      return;
    }
    const items = [...this.#entriesAscending()];
    const evictCount = Math.trunc(Math.min(requested, Math.max(items.length - 1, 0)));
    if (evictCount <= 0) {
      return;
    }
    this.#emitEvictions(items.slice(0, evictCount));
    this.#oldCache = new Map(items.slice(evictCount));
    this.#cache = /* @__PURE__ */ new Map();
    this.#size = 0;
  }
  *keys() {
    for (const [key] of this) {
      yield key;
    }
  }
  *values() {
    for (const [, value] of this) {
      yield value;
    }
  }
  *[Symbol.iterator]() {
    for (const item of this.#cache) {
      const [key, value] = item;
      const deleted = this.#deleteIfExpired(key, value);
      if (deleted === false) {
        yield [key, value.value];
      }
    }
    for (const item of this.#oldCache) {
      const [key, value] = item;
      if (!this.#cache.has(key)) {
        const deleted = this.#deleteIfExpired(key, value);
        if (deleted === false) {
          yield [key, value.value];
        }
      }
    }
  }
  *entriesDescending() {
    let items = [...this.#cache];
    for (let i = items.length - 1; i >= 0; --i) {
      const item = items[i];
      const [key, value] = item;
      const deleted = this.#deleteIfExpired(key, value);
      if (deleted === false) {
        yield [key, value.value];
      }
    }
    items = [...this.#oldCache];
    for (let i = items.length - 1; i >= 0; --i) {
      const item = items[i];
      const [key, value] = item;
      if (!this.#cache.has(key)) {
        const deleted = this.#deleteIfExpired(key, value);
        if (deleted === false) {
          yield [key, value.value];
        }
      }
    }
  }
  *entriesAscending() {
    for (const [key, value] of this.#entriesAscending()) {
      yield [key, value.value];
    }
  }
  get size() {
    if (!this.#size) {
      return this.#oldCache.size;
    }
    let oldCacheSize = 0;
    for (const key of this.#oldCache.keys()) {
      if (!this.#cache.has(key)) {
        oldCacheSize++;
      }
    }
    return Math.min(this.#size + oldCacheSize, this.#maxSize);
  }
  get maxSize() {
    return this.#maxSize;
  }
  get maxAge() {
    return this.#maxAge;
  }
  entries() {
    return this.entriesAscending();
  }
  forEach(callbackFunction, thisArgument = this) {
    for (const [key, value] of this.entriesAscending()) {
      callbackFunction.call(thisArgument, value, key, this);
    }
  }
  get [Symbol.toStringTag]() {
    return "QuickLRU";
  }
  toString() {
    return `QuickLRU(${this.size}/${this.maxSize})`;
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
};

// node_modules/@hebcal/core/dist/esm/location.js
var classicCities = /* @__PURE__ */ new Map();
var ZIPCODES_TZ_MAP = {
  "0": "UTC",
  "4": "America/Puerto_Rico",
  // Atlantic (GMT -04:00)
  "5": "America/New_York",
  //    Eastern  (GMT -05:00)
  "6": "America/Chicago",
  //     Central  (GMT -06:00)
  "7": "America/Denver",
  //      Mountain (GMT -07:00)
  "8": "America/Los_Angeles",
  // Pacific  (GMT -08:00)
  "9": "America/Anchorage",
  //   Alaska   (GMT -09:00)
  "10": "Pacific/Honolulu",
  //   Hawaii-Aleutian Islands (GMT -10:00)
  "11": "Pacific/Pago_Pago",
  //  American Samoa (GMT -11:00)
  "13": "Pacific/Funafuti",
  //   Marshall Islands (GMT +12:00)
  "14": "Pacific/Guam",
  //       Guam     (GMT +10:00)
  "15": "Pacific/Palau",
  //      Palau    (GMT +9:00)
  "16": "Pacific/Chuuk"
  //      Micronesia (GMT +11:00)
};
var timeFormatCache = new QuickLRU({
  maxSize: 120
});
function getFormatter2(tzid) {
  const fmt = timeFormatCache.get(tzid);
  if (fmt)
    return fmt;
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tzid,
    hour: "numeric",
    minute: "numeric",
    hour12: false
  });
  timeFormatCache.set(tzid, f);
  return f;
}
function initClassicCities() {
  for (const entry of citiesJson) {
    const [cityName, cc, lat, lng, tzid, elev] = entry.split("|");
    const location = new Location(+lat, +lng, cc === "IL", tzid, cityName, cc, void 0, +elev);
    Location.addLocation(cityName, location);
  }
}
var Location = class extends GeoLocation {
  il;
  cc;
  geoid;
  /**
   * First-level administrative division (e.g. a US state or a French
   * region) as an abbreviation, such as `"CA"`. Not set by this package;
   * populated by callers that hydrate a `Location` from a geo database.
   */
  admin1;
  /**
   * Full name of the first-level administrative division, such as
   * `"California"`. Not set by this package.
   */
  stateName;
  /**
   * Which kind of lookup produced this location: `'zip'` for a US Zip Code
   * or `'geoname'` for a GeoNames city. Not set by this package.
   */
  geo;
  /** US Zip Code, such as `"02912"`. Not set by this package. */
  zip;
  /** Approximate population of the city. Not set by this package. */
  population;
  /** City name in plain ASCII, for sorting or URL generation. Not set by this package. */
  asciiname;
  /**
   * Initialize a Location instance
   * @param latitude - Latitude as a decimal, valid range -90 thru +90 (e.g. 41.85003)
   * @param longitude - Longitude as a decimal, valid range -180 thru +180 (e.g. -87.65005)
   * @param il - in Israel (true) or Diaspora (false)
   * @param tzid - Olson timezone ID, e.g. "America/Chicago"
   * @param [cityName] - optional descriptive city name
   * @param [countryCode] - ISO 3166 alpha-2 country code (e.g. "FR")
   * @param [geoid] - optional string or numeric geographic ID
   * @param [elevation] - in meters (default `0`)
   */
  constructor(latitude, longitude, il, tzid, cityName, countryCode, geoid, elevation) {
    const lat = typeof latitude === "number" ? latitude : parseFloat(latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      throw new RangeError(`Latitude ${latitude} out of range [-90,90]`);
    }
    const long = typeof longitude === "number" ? longitude : parseFloat(longitude);
    if (Number.isNaN(long) || long < -180 || long > 180) {
      throw new RangeError(`Longitude ${longitude} out of range [-180,180]`);
    }
    if (!tzid) {
      throw new RangeError("Invalid timezone");
    }
    const elev = typeof elevation === "number" && elevation > 0 ? elevation : 0;
    if (cityName && typeof cityName !== "string") {
      cityName = String(cityName);
    }
    super(cityName || null, lat, long, elev, tzid);
    this.il = Boolean(il) || countryCode === "IL";
    this.cc = countryCode;
    this.geoid = geoid;
  }
  /**
   * Returns `true` if this location is in Israel (uses the Israeli holiday
   * and Torah-reading schedule), `false` for the Diaspora.
   */
  getIsrael() {
    return this.il;
  }
  /**
   * Returns the full descriptive location name passed to the constructor,
   * or `null` if no name was provided.
   *
   * Note that the built-in classic cities are named by city alone, so
   * `getName()` and {@link getShortName} return the same string for them.
   * @example
   * const loc = new Location(41.85003, -87.65005, false,
   *   'America/Chicago', 'Chicago, Illinois, USA', 'US');
   * loc.getName(); // 'Chicago, Illinois, USA'
   * Location.lookup('San Francisco')?.getName(); // 'San Francisco'
   */
  getName() {
    return this.getLocationName();
  }
  /**
   * Returns the location name truncated at the first comma. Useful for
   * compact display where only the city name is desired.
   *
   * Special-cased so that US locations of the form `"Washington, DC ..."` or
   * `"Washington, D.C., ..."` keep the `DC` / `D.C.` suffix attached.
   * @example
   * const chi = new Location(41.85003, -87.65005, false,
   *   'America/Chicago', 'Chicago, Illinois, USA', 'US');
   * chi.getShortName(); // 'Chicago'
   * const dc = new Location(38.89511, -77.03637, false,
   *   'America/New_York', 'Washington, D.C., USA', 'US');
   * dc.getShortName(); // 'Washington, D.C.'
   */
  getShortName() {
    const name = this.getLocationName();
    if (!name)
      return name;
    const comma = name.indexOf(", ");
    if (comma === -1)
      return name;
    if (this.cc === "US" && name[comma + 2] === "D") {
      if (name[comma + 3] === "C") {
        return name.substring(0, comma + 4);
      }
      if (name[comma + 3] === "." && name[comma + 4] === "C") {
        return name.substring(0, comma + 6);
      }
    }
    return name.substring(0, comma);
  }
  /**
   * Returns the ISO 3166 alpha-2 country code (e.g. `"US"`, `"IL"`, `"FR"`)
   * passed to the constructor, or `undefined` if none was provided.
   */
  getCountryCode() {
    return this.cc;
  }
  /**
   * Returns the Olson timezone identifier (e.g. `"America/Chicago"`).
   * Alias for `getTimeZone()` from the parent `GeoLocation` class.
   */
  getTzid() {
    return this.getTimeZone();
  }
  /**
   * Returns a cached 24-hour `Intl.DateTimeFormat` (e.g. `07:41` or `20:03`)
   * configured for this location's timezone. Formatters are memoized by
   * timezone so repeated calls do not allocate.
   * @example
   * const loc = Location.lookup('Tel Aviv')!;
   * const fmt = loc.getTimeFormatter();
   * fmt.format(new Date()); // e.g. '18:42'
   */
  getTimeFormatter() {
    return getFormatter2(this.getTimeZone());
  }
  /**
   * Returns the optional geographic identifier passed to the constructor
   * (typically a GeoNames numeric ID or a US Zip Code string), or
   * `undefined` if none was provided.
   */
  getGeoId() {
    return this.geoid;
  }
  /**
   * Creates a location object from one of 65 "classic" Hebcal city names.
   * The following city names are supported:
   * 'Ashdod', 'Atlanta', 'Austin', 'Baghdad', 'Beer Sheva',
   * 'Berlin', 'Baltimore', 'Bogota', 'Boston', 'Budapest',
   * 'Buenos Aires', 'Buffalo', 'Chicago', 'Cincinnati', 'Cleveland',
   * 'Dallas', 'Denver', 'Detroit', 'Eilat', 'Gibraltar', 'Haifa',
   * 'Hawaii', 'Helsinki', 'Houston', 'Jerusalem', 'Johannesburg',
   * 'Kiev', 'La Paz', 'Livingston', 'Las Vegas', 'London', 'Los Angeles',
   * 'Marseilles', 'Miami', 'Minneapolis', 'Melbourne', 'Mexico City',
   * 'Montreal', 'Moscow', 'New York', 'Omaha', 'Ottawa', 'Panama City',
   * 'Paris', 'Pawtucket', 'Petach Tikvah', 'Philadelphia', 'Phoenix',
   * 'Pittsburgh', 'Providence', 'Portland', 'Saint Louis', 'Saint Petersburg',
   * 'San Diego', 'San Francisco', 'Sao Paulo', 'Seattle', 'Sydney',
   * 'Tel Aviv', 'Tiberias', 'Toronto', 'Vancouver', 'White Plains',
   * 'Washington DC', 'Worcester'
   *
   * Lookups are case-insensitive. Returns `undefined` if the name is not
   * recognized. The list can be extended with {@link Location.addLocation}.
   * @example
   * const loc = Location.lookup('San Francisco');
   * console.log(loc?.getTzid()); // 'America/Los_Angeles'
   * @param name case-insensitive classic city name
   */
  static lookup(name) {
    if (classicCities.size === 0) {
      initClassicCities();
    }
    return classicCities.get(name.toLowerCase());
  }
  /**
   * Returns a JSON-serialized representation of this Location.
   * Useful for debugging and structured logging.
   */
  toString() {
    return JSON.stringify(this);
  }
  /**
   * Converts a legacy Hebcal-style timezone (a numeric GMT offset plus a
   * coarse DST region) to a standard IANA/Olson timezone ID.
   *
   * This exists to migrate data from older Hebcal versions that stored
   * timezones as GMT offset + DST scheme rather than as a full tzid.
   * @example
   * Location.legacyTzToTzid(2, 'israel'); // 'Asia/Jerusalem'
   * Location.legacyTzToTzid(0, 'eu');     // 'Europe/London'
   * Location.legacyTzToTzid(0, 'none');   // 'UTC'
   * Location.legacyTzToTzid(-5, 'none');  // 'Etc/GMT-5'
   * @param tz integer, GMT offset in hours
   * @param dst 'none', 'eu', 'usa', or 'israel'
   */
  static legacyTzToTzid(tz, dst) {
    tz = +tz;
    if (dst === "none") {
      if (tz === 0) {
        return "UTC";
      }
      const plus = tz > 0 ? "+" : "";
      return `Etc/GMT${plus}${tz}`;
    }
    if (tz === 2 && dst === "israel") {
      return "Asia/Jerusalem";
    }
    if (dst === "eu") {
      switch (tz) {
        case -2:
          return "Atlantic/Cape_Verde";
        case -1:
          return "Atlantic/Azores";
        case 0:
          return "Europe/London";
        case 1:
          return "Europe/Paris";
        case 2:
          return "Europe/Athens";
      }
    }
    if (dst === "usa") {
      return ZIPCODES_TZ_MAP[String(tz * -1)];
    }
    return void 0;
  }
  /**
   * Converts timezone info from Zip-Codes.com to a standard Olson tzid.
   * @example
   * Location.getUsaTzid('AZ', 7, 'Y') // 'America/Denver'
   * @param state two-letter all-caps US state abbreviation like 'CA'
   * @param tz positive number, 5=America/New_York, 8=America/Los_Angeles
   * @param dst single char 'Y' or 'N'
   */
  static getUsaTzid(state, tz, dst) {
    tz = +tz;
    if (tz === 10 && state === "AK") {
      return "America/Adak";
    }
    if (tz === 7 && state === "AZ") {
      return dst === "Y" ? "America/Denver" : "America/Phoenix";
    }
    return ZIPCODES_TZ_MAP[tz];
  }
  /**
   * Registers a new named location with the built-in `Location.lookup()`
   * registry. Names are stored case-insensitively. Returns `false` if a
   * location with the same (lower-cased) name is already registered, and
   * `true` if successfully added.
   *
   * Use this to extend the built-in set of 65 classic Hebcal cities with
   * your own custom locations.
   * @example
   * const tlv = new Location(32.0853, 34.7818, true,
   *   'Asia/Jerusalem', 'My Office, Tel Aviv', 'IL');
   * Location.addLocation('My Office', tlv);   // true
   * Location.lookup('my office')?.getTzid();  // 'Asia/Jerusalem'
   * @param cityName name to register the location under (case insensitive)
   * @param location the `Location` instance to register
   */
  static addLocation(cityName, location) {
    const name = cityName.toLowerCase();
    if (classicCities.has(name)) {
      return false;
    }
    classicCities.set(name, location);
    return true;
  }
};

// node_modules/@hebcal/core/dist/esm/reformatTimeStr.js
var hour12cc = /* @__PURE__ */ new Set([
  "US",
  "CA",
  "BR",
  "AU",
  "NZ",
  "DO",
  "PR",
  "GR",
  "IN",
  "KR",
  "NP",
  "ZA"
]);
function reformatTimeStr(timeStr, suffix, options) {
  if (typeof timeStr !== "string")
    throw new TypeError(`Bad timeStr: ${timeStr}`);
  const cc = options?.location?.getCountryCode() || (options?.il ? "IL" : "US");
  const hour12 = options?.hour12;
  if (hour12 !== void 0 && !hour12) {
    return timeStr;
  }
  if (!hour12 && !hour12cc.has(cc)) {
    return timeStr;
  }
  const hm = timeStr.split(":");
  let hour = parseInt(hm[0], 10);
  if (hour < 12 && suffix) {
    suffix = suffix.replace("p", "a").replace("P", "A");
    if (hour === 0) {
      hour = 12;
    }
  } else if (hour > 12) {
    hour = hour % 12;
  } else if (hour === 0) {
    hour = "00";
  }
  return `${hour}:${hm[1]}${suffix}`;
}

// node_modules/@hebcal/core/dist/esm/moladBase.js
var JEWISH_EPOCH = -1373429;
var CHALAKIM_PER_MINUTE = 18;
var CHALAKIM_PER_HOUR = 1080;
var CHALAKIM_PER_DAY = 25920;
var CHALAKIM_PER_MONTH = 765433;
var CHALAKIM_MOLAD_TOHU = 31524;
function getJewishMonthOfYear(year, month) {
  const leap = isLeapYear(year);
  return (month + (leap ? 6 : 5)) % (leap ? 13 : 12) + 1;
}
function getChalakimSinceMoladTohu(year, month) {
  const monthOfYear = getJewishMonthOfYear(year, month);
  const monthsElapsed = 235 * Math.trunc((year - 1) / 19) + // Months in complete 19-year lunar (Metonic) cycles so far
  12 * ((year - 1) % 19) + // Regular months in this cycle
  Math.trunc((7 * ((year - 1) % 19) + 1) / 19) + // Leap months this cycle
  (monthOfYear - 1);
  return CHALAKIM_MOLAD_TOHU + CHALAKIM_PER_MONTH * monthsElapsed;
}
function moladToAbsDate(chalakim) {
  return Math.trunc(chalakim / CHALAKIM_PER_DAY) + JEWISH_EPOCH;
}
function calculateMolad(year, month) {
  const chalakim = getChalakimSinceMoladTohu(year, month);
  const absDate = moladToAbsDate(chalakim);
  let hd = new HDate(absDate);
  const conjunctionDay = Math.trunc(chalakim / CHALAKIM_PER_DAY);
  const conjunctionParts = Math.trunc(chalakim - conjunctionDay * CHALAKIM_PER_DAY);
  let adjustedChalakim = conjunctionParts;
  let hour = Math.trunc(adjustedChalakim / CHALAKIM_PER_HOUR);
  adjustedChalakim = adjustedChalakim - hour * CHALAKIM_PER_HOUR;
  const minutes = Math.trunc(adjustedChalakim / CHALAKIM_PER_MINUTE);
  if (hour >= 6) {
    hd = hd.next();
  }
  hour = (hour + 18) % 24;
  return {
    hdate: hd,
    hour,
    minutes,
    chalakim: adjustedChalakim - minutes * CHALAKIM_PER_MINUTE
  };
}

// node_modules/@hebcal/core/dist/esm/moladDate.js
var DAY_MILLIS = 24 * 60 * 60 * 1e3;
var EPOCH_RD = 719163;
var JERUSALEM_LMT_OFFSET_MILLIS = Math.trunc(35.2354 * 4 * 60 * 1e3);
var moladDateCache = new QuickLRU({
  maxSize: 120
});
function getMoladAsDate(molad) {
  const moladSeconds = molad.chalakim * 10 / 3;
  const millis = Math.trunc(1e3 * (moladSeconds - Math.trunc(moladSeconds)));
  const localMillis = (molad.hdate.abs() - EPOCH_RD) * DAY_MILLIS + ((molad.hour * 60 + molad.minutes) * 60 + Math.trunc(moladSeconds)) * 1e3 + millis;
  const epochMillis = localMillis - JERUSALEM_LMT_OFFSET_MILLIS;
  let zdt = moladDateCache.get(epochMillis);
  if (!zdt) {
    zdt = Temporal.Instant.fromEpochMilliseconds(epochMillis).toZonedDateTimeISO("UTC");
    moladDateCache.set(epochMillis, zdt);
  }
  return zdt;
}

// node_modules/@hebcal/core/dist/esm/string.js
function smartApostrophe(str) {
  return str.replaceAll("'", "\u2019");
}
function urlFriendly(str) {
  return str.toLowerCase().replaceAll("'", "").replaceAll(" ", "-");
}

// node_modules/@hebcal/core/dist/esm/molad.js
var enDoW = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
var heDayNames = [
  "\u05E8\u05B4\u05D0\u05E9\u05C1\u05D5\u05B9\u05DF",
  "\u05E9\u05B5\u05C1\u05E0\u05B4\u05D9",
  "\u05E9\u05B0\u05C1\u05DC\u05B4\u05D9\u05E9\u05B4\u05C1\u05D9",
  "\u05E8\u05B0\u05D1\u05B4\u05D9\u05E2\u05B4\u05D9",
  "\u05D7\u05B2\u05DE\u05B4\u05D9\u05E9\u05B4\u05C1\u05D9",
  "\u05E9\u05B4\u05C1\u05D9\u05E9\u05B4\u05BC\u05C1\u05D9",
  "\u05E9\u05B7\u05C1\u05D1\u05B8\u05BC\u05EA"
];
var frDoW = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi"
];
var night = "\u05D1\u05B7\u05BC\u05DC\u05B7\u05BC\u05A5\u05D9\u05B0\u05DC\u05B8\u05D4";
function getDayNames(locale) {
  if (Locale.isHebrewLocale(locale)) {
    return heDayNames;
  }
  if (locale === "fr") {
    return frDoW;
  }
  return enDoW;
}
function getHebrewTimeOfDay(hour) {
  if (hour < 5)
    return night;
  if (hour < 12)
    return "\u05D1\u05B7\u05BC\u05D1\u05B9\u05BC\u05E7\u05B6\u05E8";
  if (hour < 17)
    return "\u05D1\u05B7\u05BC\u05E6\u05C7\u05BC\u05D4\u05B3\u05E8\u05B7\u05D9\u05B4\u05D9\u05DD";
  if (hour < 21)
    return "\u05D1\u05B8\u05BC\u05E2\u05B6\u05E8\u05B6\u05D1";
  return night;
}
var Molad = class {
  m;
  year;
  month;
  instant;
  /**
   * Calculates the molad for a given Hebrew year and month.
   * @param year Hebrew year
   * @param month 1=NISAN, 7=TISHREI (uses Nisan-based numbering)
   */
  constructor(year, month) {
    this.m = calculateMolad(year, month);
    this.year = year;
    this.month = month;
  }
  /**
   * The exact Hebrew date of the molad, which often falls on the
   * 28th or 30th of the preceeding month, occasionally on the first of the
   * month, and in extremely rare circumstances the 27th of the month.
   * - Molad Shevat 5541 occured on 27 Tevet / 1781-01-24T19:57:20.170Z
   * - Molad Shevat 5788 will occur on 27 Tevet / 2028-01-26T19:07:03.504Z
   * - Molad Nissan 5866 will occur on 27 Adar II / 2106-04-03T21:08:46.837Z
   */
  getMoladDate() {
    return this.m.hdate;
  }
  /**
   * The year of the molad (as constructed)
   */
  getYear() {
    return this.year;
  }
  /**
   * The month (1=NISSAN, 7=TISHREI) as constructed
   */
  getMonth() {
    return this.month;
  }
  /**
   * Returns a transliterated string name of the molad's Hebrew month,
   * for example 'Elul' or 'Cheshvan'.
   */
  getMonthName() {
    return HDate.getMonthName(this.month, this.year);
  }
  /**
   * @returns Day of Week (0=Sunday, 6=Saturday)
   */
  getDow() {
    return this.m.hdate.getDay();
  }
  /**
   * @returns hour of day (0-23)
   */
  getHour() {
    return this.m.hour;
  }
  /**
   * @returns minutes past hour (0-59)
   */
  getMinutes() {
    return this.m.minutes;
  }
  /**
   * @returns parts of a minute (0-17)
   */
  getChalakim() {
    return this.m.chalakim;
  }
  /**
   * Returns the moment of the molad as a `Temporal.ZonedDateTime` in the `UTC` zone.
   *
   * The molad is computed in Jerusalem *standard* time and then converted, so the
   * returned instant is correct year-round; only the zone of the returned object
   * is `UTC`. This method subtracts 20.94 minutes (20 minutes and 56.496 seconds)
   * from the computed time — Har Habayis, at longitude 35.2354°, is 5.2354° away
   * from the multiple-of-15 timezone longitude — to get to standard time. Daylight
   * savings time is intentionally not applied; adjust when formatting for display.
   *
   * The returned value is cached after the first call.
   * @example
   * import {Molad, months} from '@hebcal/core';
   * const m = new Molad(5784, months.NISAN);
   * const zdt = m.getInstant();
   * console.log(zdt.toString()); // '2024-04-08T20:36:26.837+00:00[UTC]'
   * @return the `Temporal.ZonedDateTime` representing the moment of the molad
   */
  getInstant() {
    this.instant ??= getMoladAsDate(this.m);
    return this.instant;
  }
  /**
   * Returns the earliest time of _Kiddush Levana_ calculated as 3 days after the molad. This method returns the time
   * even if it is during the day when _Kiddush Levana_ can't be said. Callers of this method should consider
   * displaying the next _tzais_ if the zman is between _alos_ and _tzais_.
   *
   * @return the Temporal.ZonedDateTime representing the moment 3 days after the molad.
   */
  getTchilasZmanKidushLevana3Days() {
    const zdt = this.getInstant();
    return zdt.add({ hours: 72 });
  }
  /**
   * Returns the earliest time of Kiddush Levana calculated as 7 days after the molad as mentioned by the
   * [Mechaber](https://en.wikipedia.org/wiki/Yosef_Karo). See the
   * [Bach's](https://en.wikipedia.org/wiki/Yoel_Sirkis) opinion on this time. This method returns the time
   * even if it is during the day when _Kiddush Levana_ can't be said. Callers of this method should consider
   * displaying the next _tzais_ if the zman is between _alos_ and _tzais_.
   *
   * @return the Temporal.ZonedDateTime representing the moment 7 days after the molad.
   */
  getTchilasZmanKidushLevana7Days() {
    const zdt = this.getInstant();
    return zdt.add({ hours: 168 });
  }
  /**
   * Returns the latest time of Kiddush Levana according to the
   * [Maharil's](https://en.wikipedia.org/wiki/Yaakov_ben_Moshe_Levi_Moelin) opinion that it is calculated as
   * halfway between molad and molad. This adds half the 29 days, 12 hours and 793 chalakim time between molad and
   * molad (14 days, 18 hours, 22 minutes and 666 milliseconds) to the month's molad. This method returns the time
   * even if it is during the day when _Kiddush Levana_ can't be said. Callers of this method should consider
   * displaying _alos_ before this time if the zman is between _alos_ and _tzais_.
   *
   * @return the Temporal.ZonedDateTime representing the moment halfway between molad and molad.
   */
  getSofZmanKidushLevanaBetweenMoldos() {
    const zdt = this.getInstant();
    return zdt.add({
      hours: 24 * 14 + 18,
      minutes: 22,
      seconds: 1,
      milliseconds: 666
    });
  }
  /**
   * Returns the latest time of Kiddush Levana calculated as 15 days after the molad. This is the opinion brought down
   * in the Shulchan Aruch (Orach Chaim 426). It should be noted that some opinions hold that the
   * [Rema](https://en.wikipedia.org/wiki/Moses_Isserles) who brings down the opinion of the
   * [Maharil's](https://en.wikipedia.org/wiki/Yaakov_ben_Moshe_Levi_Moelin) of calculating
   * {@link Molad.getSofZmanKidushLevanaBetweenMoldos | half way between molad and molad} is of the opinion that Mechaber
   * agrees to his opinion. Also see the Aruch Hashulchan. For additional details on the subject, See Rabbi Dovid
   * Heber's very detailed writeup in Siman Daled (chapter 4) of
   * [Shaarei Zmanim](https://www.worldcat.org/oclc/461326125). This method returns the time even if it is during
   * the day when _Kiddush Levana_ can't be said. Callers of this method should consider displaying _alos_
   * before this time if the zman is between _alos_ and _tzais_.
   *
   * @return the Temporal.ZonedDateTime representing the moment 15 days after the molad.
   */
  getSofZmanKidushLevana15Days() {
    const zdt = this.getInstant();
    return zdt.add({ hours: 24 * 15 });
  }
  /**
   * Returns a human-readable, localized string announcing the molad —
   * suitable for use on Shabbat Mevarchim. The format includes the Hebrew
   * month name, day of week, hour : minute, and chalakim if non-zero.
   *
   * Time format honors `options.hour12` and `options.location` (12-hour vs.
   * 24-hour); see {@link reformatTimeStr}.
   * @example
   * import {Molad, months} from '@hebcal/core';
   * const m = new Molad(5784, months.NISAN);
   * m.render('en', {hour12: true});
   * // => 'Molad Nisan: Monday, 10:57pm and 7 chalakim'
   * m.render('en', {hour12: false});
   * // => 'Molad Nisan: Monday, 22:57 and 7 chalakim'
   * m.render('he');
   * // => 'מוֹלָד הָלְּבָנָה נִיסָן יִהְיֶה בַּיּוֹם שֵׁנִי בשָׁבוּעַ, …'
   * @param [locale] Optional locale name (defaults to empty locale)
   * @param options used for time formatting (12-hour vs 24-hour)
   */
  render(locale, options) {
    const monthName = Locale.gettext(this.getMonthName(), locale);
    const dayNames = getDayNames(locale);
    const dow = dayNames[this.getDow()];
    const minutes = this.getMinutes();
    const hour = this.getHour();
    const chalakim = this.getChalakim();
    const moladStr = Locale.gettext("Molad", locale);
    const minutesStr = Locale.lookupTranslation("min", locale) ?? "minutes";
    const chalakimStr = Locale.gettext("chalakim", locale);
    const and = Locale.gettext("and", locale);
    if (Locale.isHebrewLocale(locale)) {
      const ampm = getHebrewTimeOfDay(hour);
      let result2 = `${moladStr} ${monthName} \u05D9\u05B4\u05D4\u05B0\u05D9\u05B6\u05D4 \u05D1\u05B7\u05BC\u05D9\u05BC\u05D5\u05B9\u05DD ${dow} \u05D1\u05E9\u05B8\u05C1\u05D1\u05D5\u05BC\u05E2\u05B7, \u05D1\u05B0\u05BC\u05E9\u05B8\u05C1\u05E2\u05B8\u05D4 ${hour} ${ampm}, \u05D5-${minutes} ${minutesStr}`;
      if (chalakim !== 0) {
        result2 += ` \u05D5-${chalakim} ${chalakimStr}`;
      }
      if (locale.toLocaleLowerCase() === "he-x-nonikud") {
        return Locale.hebrewStripNikkud(result2);
      }
      return result2;
    }
    const fmtTime = reformatTimeStr(`${hour}:${pad2(minutes)}`, "pm", options);
    const month = smartApostrophe(monthName);
    const result = `${moladStr} ${month}: ${dow}, ${fmtTime}`;
    if (chalakim === 0) {
      return result;
    }
    return `${result} ${and} ${chalakim} ${chalakimStr}`;
  }
};
var MoladEvent = class extends Event {
  molad;
  options;
  /**
   * @param date Hebrew date event occurs
   * @param hyear molad year
   * @param hmonth molad month
   * @param options
   */
  constructor(date, hyear, hmonth, options) {
    const m = new Molad(hyear, hmonth);
    const monthName = m.getMonthName();
    super(date, `Molad ${monthName} ${hyear}`, flags.MOLAD);
    this.molad = m;
    this.options = options;
  }
  /**
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  render(locale) {
    return this.molad.render(locale, this.options);
  }
};

// node_modules/@hebcal/core/dist/esm/zenith.js
var GEOMETRIC_ZENITH = 90;
var CIVIL_ZENITH = GEOMETRIC_ZENITH + 6;
var ZENITH_1_POINT_583 = GEOMETRIC_ZENITH + 1 + 35 / 60;
var DEG_6_POINT_45 = 6.45;
var DEG_7_POINT_083 = 7 + 5 / 60;
var DEG_8_POINT_5 = 8.5;
var DEG_16_POINT_1 = 16.1;

// node_modules/@hebcal/core/dist/esm/horizon.js
var SOLAR_SEMIDIAMETER = 16 / 60;
function horizonElevation(profile, azimuth) {
  if (typeof profile === "number") {
    if (!Number.isFinite(profile)) {
      throw new TypeError(`invalid horizon elevation: ${profile}`);
    }
    return profile;
  }
  if (typeof profile === "function") {
    return profile(azimuth);
  }
  const n = profile.length;
  if (n === 0) {
    throw new TypeError("horizon profile has no samples");
  }
  if (n === 1) {
    return profile[0].elevation;
  }
  const sorted = [...profile].sort((a, b) => a.azimuth - b.azimuth);
  let az = azimuth % 360;
  if (az < 0) {
    az += 360;
  }
  let loIdx = -1;
  for (let i = 0; i < n; i++) {
    if (sorted[i].azimuth <= az) {
      loIdx = i;
    } else {
      break;
    }
  }
  let lo;
  let hi;
  let loAz;
  let hiAz;
  if (loIdx === -1) {
    lo = sorted[n - 1];
    loAz = lo.azimuth - 360;
    hi = sorted[0];
    hiAz = hi.azimuth;
  } else if (loIdx === n - 1) {
    lo = sorted[n - 1];
    loAz = lo.azimuth;
    hi = sorted[0];
    hiAz = hi.azimuth + 360;
  } else {
    lo = sorted[loIdx];
    loAz = lo.azimuth;
    hi = sorted[loIdx + 1];
    hiAz = hi.azimuth;
  }
  const t = hiAz === loAz ? 0 : (az - loAz) / (hiAz - loAz);
  return lo.elevation + t * (hi.elevation - lo.elevation);
}
function refractionAtApparentAltitude(apparentAltitude) {
  const P = 1010;
  const T = 10;
  const a = apparentAltitude;
  if (a < 15) {
    return P / (T + 273) * (0.1594 + 0.0196 * a + 2e-5 * a * a) / (1 + 0.505 * a + 0.0845 * a * a);
  }
  return 1 / 60 * (P / 1010) * (283 / (273 + T)) / Math.tan((a + 7.31 / (a + 4.4)) * Math.PI / 180);
}
function upperLimbApparentAltitude(centerGeometricAltitude) {
  const base = centerGeometricAltitude + SOLAR_SEMIDIAMETER;
  let beta = base + refractionAtApparentAltitude(base);
  for (let i = 0; i < 4; i++) {
    beta = base + refractionAtApparentAltitude(beta);
  }
  return beta;
}

// node_modules/@hebcal/core/dist/esm/zmanim.js
function millisToDate(millis) {
  const res = new Date(millis);
  res.setUTCMilliseconds(0);
  return res;
}
function temporalHourMillis(startOfDay, endOfDay) {
  return Math.floor((endOfDay - startOfDay) / 12);
}
function addTemporalHours(startOfDay, temporalHour, hours) {
  return new Date(startOfDay.getTime() + Math.floor(hours * temporalHour));
}
var Zmanim = class _Zmanim {
  hdate;
  plainDate;
  gloc;
  noaa;
  useElevation;
  /**
   * Initialize a Zmanim instance.
   * @param gloc GeoLocation including latitude, longitude, and timezone
   * @param date Regular or Hebrew Date. If `date` is a regular `Date`,
   *    hours, minutes, seconds and milliseconds are ignored.
   * @param useElevation use elevation for calculations (default `false`).
   *    If `true`, use elevation to affect the calculation of all sunrise/sunset based
   *    zmanim. Note: there are some zmanim such as degree-based zmanim that are driven
   *    by the amount of light in the sky and are not impacted by elevation.
   *    These zmanim intentionally do not support elevation adjustment.
   */
  constructor(gloc, date, useElevation) {
    this.hdate = new HDate(date);
    const dt = isDate(date) ? date : this.hdate.greg();
    this.plainDate = new Temporal.PlainDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    this.gloc = gloc;
    this.noaa = new NOAACalculator(gloc, this.plainDate);
    this.useElevation = Boolean(useElevation);
  }
  /**
   * Returns `true` if this instance uses the location's elevation when
   * calculating sunrise/sunset-based zmanim.
   */
  getUseElevation() {
    return this.useElevation;
  }
  /**
   * Enables or disables elevation adjustment for sunrise/sunset-based zmanim.
   *
   * Degree-based zmanim (such as {@link alotHaShachar} or {@link tzeit})
   * estimate the amount of light in the sky and are never affected by this
   * setting.
   * @param useElevation `true` to include the location's elevation
   */
  setUseElevation(useElevation) {
    this.useElevation = useElevation;
  }
  /**
   * Convenience function to get the time when sun is above or below the horizon
   * for a certain angle (in degrees).
   * This function does not support elevation adjustment.
   * @param angle degrees of solar depression below the horizon; for example
   *  `8.5` means the center of the sun is 8.5° below the horizon
   * @param rising `true` for the morning (before sunrise), `false` for the
   *  evening (after sunset)
   */
  timeAtAngle(angle, rising) {
    const offsetZenith = GEOMETRIC_ZENITH + angle;
    return millisToDate(rising ? this.sunriseMillis(offsetZenith, true) : this.sunsetMillis(offsetZenith, true));
  }
  /**
   * Sunrise for a given zenith as epoch milliseconds, mirroring what
   * `NOAACalculator.getSunrise()` / `getSeaLevelSunrise()` /
   * `getSunriseOffsetByDegrees()` compute, minus the `ZonedDateTime`.
   *
   * Note that noaa's degree-based accessors pass `adjustForElevation = true`
   * as well; the adjustment is a no-op unless the zenith is exactly
   * {@link GEOMETRIC_ZENITH}, which is why degree-based zmanim are unaffected
   * by elevation.
   */
  sunriseMillis(zenith, useElevation) {
    const utc = useElevation ? this.noaa.getUTCSunrise0(zenith) : this.noaa.getUTCSeaLevelSunrise(zenith);
    return this.noaa.getEpochMillisFromTime(utc, true);
  }
  /**
   * Sunset counterpart of {@link sunriseMillis}.
   */
  sunsetMillis(zenith, useElevation) {
    const utc = useElevation ? this.noaa.getUTCSunset0(zenith) : this.noaa.getUTCSeaLevelSunset(zenith);
    return this.noaa.getEpochMillisFromTime(utc, false);
  }
  /**
   * Upper edge of the Sun appears over the eastern horizon in the morning (0.833° above horizon)
   * If elevation is enabled, this function will include elevation in the calculation.
   */
  sunrise() {
    return millisToDate(this.sunriseMillis(GEOMETRIC_ZENITH, this.useElevation));
  }
  /**
   * Upper edge of the Sun appears over the eastern horizon in the morning (0.833° above horizon).
   * This function does not support elevation adjustment.
   */
  seaLevelSunrise() {
    return millisToDate(this.sunriseMillis(GEOMETRIC_ZENITH, false));
  }
  /**
   * When the upper edge of the Sun disappears below the horizon (0.833° below horizon).
   * If elevation is enabled, this function will include elevation in the calculation.
   */
  sunset() {
    return millisToDate(this.sunsetMillis(GEOMETRIC_ZENITH, this.useElevation));
  }
  /**
   * When the upper edge of the Sun disappears below the horizon (0.833° below horizon).
   * This function does not support elevation adjustment.
   */
  seaLevelSunset() {
    return millisToDate(this.sunsetMillis(GEOMETRIC_ZENITH, false));
  }
  /**
   * Civil dawn; Sun is 6° below the horizon in the morning.
   * Because degree-based functions estimate the amount of light in the sky,
   * the result is not impacted by elevation.
   */
  dawn() {
    return millisToDate(this.sunriseMillis(CIVIL_ZENITH, true));
  }
  /**
   * Civil dusk; Sun is 6° below the horizon in the evening.
   * Because degree-based functions estimate the amount of light in the sky,
   * the result is not impacted by elevation.
   */
  dusk() {
    return millisToDate(this.sunsetMillis(CIVIL_ZENITH, true));
  }
  /**
   * Returns sunset for the previous day.
   * If elevation is enabled, this function will include elevation in the calculation.
   */
  gregEve() {
    const prev0 = this.plainDate.subtract({ days: 1 });
    const prev = new Date(prev0.year, prev0.month - 1, prev0.day);
    const zman = new _Zmanim(this.gloc, prev, this.useElevation);
    return zman.sunset();
  }
  /**
   * Length in milliseconds of one halachic hour of the night, calculated as
   * one twelfth of the time between the previous day's sunset and this
   * day's sunrise. Used internally by {@link chatzotNight}.
   */
  nightHour() {
    return (this.sunrise().getTime() - this.gregEve().getTime()) / 12;
  }
  /**
   * Midday – Chatzot; Sunrise plus 6 halachic hours.
   *
   * Unlike most sunrise/sunset-based zmanim, this is always computed from
   * sea-level sunrise and sunset, so it is not affected by the
   * `useElevation` setting.
   */
  chatzot() {
    return millisToDate(this.chatzotMillis());
  }
  /**
   * {@link chatzot} as epoch milliseconds, before the seconds are cut.
   */
  chatzotMillis() {
    const startOfDay = this.sunriseMillis(GEOMETRIC_ZENITH, false);
    const endOfDay = this.sunsetMillis(GEOMETRIC_ZENITH, false);
    return startOfDay + temporalHourMillis(startOfDay, endOfDay) * 6;
  }
  /**
   * Midnight – Chatzot; Sunset plus 6 halachic hours.
   * If elevation is enabled, this function will include elevation in the calculation.
   */
  chatzotNight() {
    return new Date(this.sunrise().getTime() - this.nightHour() * 6);
  }
  /**
   * Dawn – Alot haShachar; Sun is 16.1° below the horizon in the morning.
   * Because degree-based functions estimate the amount of light in the sky,
   * the result is not impacted by elevation.
   */
  alotHaShachar() {
    return this.timeAtAngle(DEG_16_POINT_1, true);
  }
  /**
   * Dawn – Alot haShachar; calculated as 72 minutes before sunrise or
   * sea level sunrise.
   */
  alotHaShachar72() {
    return this.sunriseOffset(-72, false, false);
  }
  /**
   * Same as {@link alotHaShachar72}, but returns a `Temporal.ZonedDateTime`
   * with seconds precision (instead of a `Date` rounded to the minute), or
   * `null` if sunrise cannot be calculated for this date and location.
   */
  alotHaShachar72zdt() {
    const zdt = this.useElevation ? this.noaa.getSunrise() : this.noaa.getSeaLevelSunrise();
    if (!zdt) {
      return null;
    }
    return zdt.subtract({ minutes: 72 });
  }
  /**
   * Earliest talis & tefillin – Misheyakir; Sun is 11.5° below the horizon in the morning.
   * Because degree-based functions estimate the amount of light in the sky,
   * the result is not impacted by elevation.
   */
  misheyakir() {
    return this.timeAtAngle(11.5, true);
  }
  /**
   * Earliest talis & tefillin – Misheyakir Machmir; Sun is 10.2° below the horizon in the morning.
   * Because degree-based functions estimate the amount of light in the sky,
   * the result is not impacted by elevation.
   */
  misheyakirMachmir() {
    return this.timeAtAngle(10.2, true);
  }
  getShaahZmanisBasedZmanMillis(startOfDay, endOfDay, hours) {
    const offset = Math.trunc(temporalHourMillis(startOfDay, endOfDay) * hours);
    return startOfDay + offset;
  }
  /**
   * Utility method for using elevation-aware sunrise/sunset
   * @param hours number of _shaos zmaniyos_ (solar hours) after sunrise
   */
  getShaahZmanisBasedZman(hours) {
    const startOfDay = this.sunriseMillis(GEOMETRIC_ZENITH, this.useElevation);
    const endOfDay = this.sunsetMillis(GEOMETRIC_ZENITH, this.useElevation);
    return millisToDate(this.getShaahZmanisBasedZmanMillis(startOfDay, endOfDay, hours));
  }
  /**
   * Latest Shema (Gra); Sunrise plus 3 halachic hours, according to the Gra.
   * If elevation is enabled, this function will include elevation in the calculation.
   */
  sofZmanShma() {
    return this.getShaahZmanisBasedZman(3);
  }
  /**
   * Latest Shacharit (Gra); Sunrise plus 4 halachic hours, according to the Gra.
   *
   * This method returns the latest *zman tfila* (time to recite the morning prayers)
   * that is 4 *shaos zmaniyos* (solar hours) after sunrise or sea level sunrise
   * (depending on the `useElevation` setting), according
   * to the [GRA](https://en.wikipedia.org/wiki/Vilna_Gaon).
   *
   * If elevation is enabled, this function will include elevation in the calculation.
   */
  sofZmanTfilla() {
    return this.getShaahZmanisBasedZman(4);
  }
  /**
   * This method returns the latest time for burning _chametz_ on _Erev Pesach_ according to the opinion
   * of the [GRA](https://en.wikipedia.org/wiki/Vilna_Gaon). This time is 5 halachic hours into the day, based on
   * the opinion of the GRA that the day is calculated from sunrise to sunset.
   *
   * If elevation is enabled, this function will include elevation in the calculation.
   * @return the `Date` of the latest time for burning _chametz_ on _Erev Pesach_. If the calculation can't be
   *         computed, such as in the Arctic Circle where there is at least one day a year where the sun does not
   *         rise and one where it does not set, an `Invalid Date` will be returned.
   */
  sofZmanBiurChametzGRA() {
    return this.getShaahZmanisBasedZman(5);
  }
  /**
   * Returns a 2-element array with alot (a `Date`, 72 minutes before sunrise)
   * and the length in milliseconds of one halachic hour of the resulting day.
   * Used internally by the Magen Avraham zmanim.
   * @param forceSeaLevel ignore the `useElevation` setting and use sea-level
   *  sunrise and sunset
   */
  getTemporalHour72(forceSeaLevel) {
    const alot72 = this.sunriseOffset(-72, false, forceSeaLevel);
    const tzeit72 = this.sunsetOffset(72, false, forceSeaLevel);
    const temporalHour = (tzeit72.getTime() - alot72.getTime()) / 12;
    return [alot72, temporalHour];
  }
  /**
   * Returns a 2-element array with alot (a `Date`, when the sun is `angle`
   * degrees below the horizon in the morning) and the length in milliseconds
   * of one halachic hour of the resulting day. Used internally by the
   * degree-based Magen Avraham zmanim.
   * @param angle degrees of solar depression below the horizon
   */
  getTemporalHourByDeg(angle) {
    const alot = this.timeAtAngle(angle, true);
    const tzeit = this.timeAtAngle(angle, false);
    const temporalHour = (tzeit.getTime() - alot.getTime()) / 12;
    return [alot, temporalHour];
  }
  /**
   * Latest Shema (MGA); Sunrise plus 3 halachic hours, according to Magen Avraham.
   * Based on the opinion of the MGA that the day is calculated from
   * dawn being fixed 72 minutes before sea-level sunrise, and nightfall is fixed
   * 72 minutes after sea-level sunset.
   */
  sofZmanShmaMGA() {
    const [alot72, temporalHour] = this.getTemporalHour72(true);
    return addTemporalHours(alot72, temporalHour, 3);
  }
  /**
   * Latest Shema (MGA); Sunrise plus 3 halachic hours, according to Magen Avraham.
   * Based on the opinion of the MGA that the day is calculated from
   * dawn to nightfall with both being 16.1° below the horizon.
   */
  sofZmanShmaMGA16Point1() {
    const [alot, temporalHour] = this.getTemporalHourByDeg(DEG_16_POINT_1);
    return addTemporalHours(alot, temporalHour, 3);
  }
  /**
   * Latest Shema (MGA); Sunrise plus 3 halachic hours, according to Magen Avraham.
   * Based on the opinion of the MGA that the day is calculated from
   * dawn to nightfall with both being 19.8° below the horizon.
   *
   * This calculation is based on the position of the sun 90 minutes after sunset in Jerusalem
   * around the equinox / equilux which calculates to 19.8° below geometric zenith.
   * https://kosherjava.com/2022/01/12/equinox-vs-equilux-zmanim-calculations/
   */
  sofZmanShmaMGA19Point8() {
    const [alot, temporalHour] = this.getTemporalHourByDeg(19.8);
    return addTemporalHours(alot, temporalHour, 3);
  }
  /**
   * Latest Shacharit (MGA); Sunrise plus 4 halachic hours, according to Magen Avraham
   */
  sofZmanTfillaMGA() {
    const [alot72, temporalHour] = this.getTemporalHour72(true);
    return addTemporalHours(alot72, temporalHour, 4);
  }
  /**
   * Latest Shacharit (MGA); Sunrise plus 4 halachic hours, according to Magen Avraham.
   * Based on the opinion of the MGA that the day is calculated from
   * dawn to nightfall with both being 16.1° below the horizon.
   */
  sofZmanTfillaMGA16Point1() {
    const [alot, temporalHour] = this.getTemporalHourByDeg(DEG_16_POINT_1);
    return addTemporalHours(alot, temporalHour, 4);
  }
  /**
   * Latest Shacharit (MGA); Sunrise plus 4 halachic hours, according to Magen Avraham.
   * Based on the opinion of the MGA that the day is calculated from
   * dawn to nightfall with both being 19.8° below the horizon.
   *
   * This calculation is based on the position of the sun 90 minutes after sunset in Jerusalem
   * around the equinox / equilux which calculates to 19.8° below geometric zenith.
   * https://kosherjava.com/2022/01/12/equinox-vs-equilux-zmanim-calculations/
   */
  sofZmanTfillaMGA19Point8() {
    const [alot, temporalHour] = this.getTemporalHourByDeg(19.8);
    return addTemporalHours(alot, temporalHour, 4);
  }
  /**
   * Earliest Mincha – Mincha Gedola (GRA); Sunrise plus 6.5 halachic hours.
   * If elevation is enabled, this function will include elevation in the calculation.
   *
   * This method returns *mincha gedola*, the earliest time one can pray mincha,
   * that is 6.5 shaos zmaniyos (solar hours) after sunrise or sea level sunrise
   * (depending on the `useElevation` setting), according
   * to the [GRA](https://en.wikipedia.org/wiki/Vilna_Gaon).
   *
   * The Ramba"m is of the opinion that it is better to delay *mincha* until
   * *mincha ketana* while the Ra"sh, Tur, GRA and others are of the
   * opinion that *mincha* can be prayed *lechatchila* starting at *mincha gedola*.
   */
  minchaGedola() {
    return this.getShaahZmanisBasedZman(6.5);
  }
  /**
   * Earliest Mincha – Mincha Gedola (MGA); Sunrise plus 6.5 halachic hours.
   * If elevation is enabled, this function will include elevation in the calculation.
   *
   * This method returns the time of *mincha gedola* according to the Magen Avraham
   * with the day starting 72 minutes before sunrise and ending 72 minutes after sunset.
   * This is the earliest time to pray *mincha*.
   */
  minchaGedolaMGA() {
    const [alot72, temporalHour] = this.getTemporalHour72(false);
    return addTemporalHours(alot72, temporalHour, 6.5);
  }
  /**
   * Preferable earliest time to recite Minchah – Mincha Ketana; Sunrise plus 9.5 halachic hours.
   * If elevation is enabled, this function will include elevation in the calculation.
   *
   * This method returns *mincha ketana*, the preferred earliest time to pray *mincha* in the
   * opinion of the [Rambam](https://en.wikipedia.org/wiki/Maimonides) and others,
   * that is 9.5 *shaos zmaniyos* (solar hours) after sunrise or sea level sunrise
   * (depending on the `useElevation` setting), according
   * to the [GRA](https://en.wikipedia.org/wiki/Vilna_Gaon).
   */
  minchaKetana() {
    return this.getShaahZmanisBasedZman(9.5);
  }
  /**
   * This method returns the time of *mincha ketana* according to the Magen Avraham
   * with the day starting 72 minutes before sunrise and ending 72 minutes after sunset.
   * This is the preferred earliest time to pray *mincha* according to the opinion of
   * the [Rambam](https://en.wikipedia.org/wiki/Maimonides) and others.
   *
   * If elevation is enabled, this function will include elevation in the calculation.
   */
  minchaKetanaMGA() {
    const [alot72, temporalHour] = this.getTemporalHour72(false);
    return addTemporalHours(alot72, temporalHour, 9.5);
  }
  /**
   * Plag haMincha; Sunrise plus 10.75 halachic hours.
   * If elevation is enabled, this function will include elevation in the calculation.
   */
  plagHaMincha() {
    return this.getShaahZmanisBasedZman(10.75);
  }
  /**
   * Nightfall – Tzeit HaKochavim; the sun is `angle` degrees below the
   * horizon in the evening.
   *
   * Because degree-based functions estimate the amount of light in the sky,
   * the result is not impacted by elevation.
   * @param [angle=8.5] optional time for solar depression.
   *   Default is 8.5 degrees for 3 small stars, use 7.083 degrees for 3 medium-sized stars.
   */
  tzeit(angle = DEG_8_POINT_5) {
    return this.timeAtAngle(angle, false);
  }
  /**
   * Nightfall – Tzeit HaKochavim; calculated as 72 minutes after sunset
   * (or sea-level sunset, depending on the `useElevation` setting).
   *
   * Returns a `Temporal.ZonedDateTime` with seconds precision, or `null` if
   * sunset cannot be calculated for this date and location.
   */
  tzeit72() {
    const zdt = this.useElevation ? this.noaa.getSunset() : this.noaa.getSeaLevelSunset();
    if (!zdt) {
      return null;
    }
    return zdt.add({ minutes: 72 });
  }
  /**
   * Alias for sunrise
   */
  neitzHaChama() {
    return this.sunrise();
  }
  /**
   * Alias for sunset
   */
  shkiah() {
    return this.sunset();
  }
  /**
   * Visible sunrise — _netz ha-nireh_ (הנץ הנראה): the moment the sun's upper
   * limb, bent up by atmospheric refraction, first clears the real terrain
   * skyline to the east, rather than the flat sea-level horizon {@link sunrise}
   * uses. In mountainous locations (most of Israel) this is noticeably later
   * than {@link sunrise}; many printed Israeli calendars list it alongside the
   * standard time.
   *
   * The caller supplies a {@link HorizonProfile} — the apparent altitude of the
   * skyline as a function of azimuth (a constant, a list of
   * azimuth/elevation samples, or a function). Building such a profile from
   * terrain / digital-elevation-model data is outside this library.
   *
   * The method follows Keller & Hall, _Computers & Geosciences_ 26 (2000), and
   * the Chai Tables (chaitables.com): refraction is Sinclair below 15° and
   * Bennett at or above 15° at standard atmosphere (1010 hPa, 10 °C), applied
   * to the sun's upper limb. No cushion or safety margin is added.
   *
   * The `useElevation` setting is intentionally ignored: the profile is
   * measured from the observer's own eye position (already accounting for the
   * observer's height, terrestrial refraction and Earth's curvature — a sea
   * horizon seen from a height is a negative angle), so applying the library's
   * sea-level-vs-elevation adjustment on top would double-count.
   * @example
   * import {GeoLocation, Zmanim} from '@hebcal/core';
   * const gloc = new GeoLocation('Jerusalem', 31.78, 35.22, 0, 'Asia/Jerusalem');
   * const zmanim = new Zmanim(gloc, new Date(2026, 9, 29), false);
   * const tzid = 'Asia/Jerusalem';
   * // A constant: the skyline is 3° above level in every direction
   * Zmanim.formatISOWithTimeZone(tzid, zmanim.visibleSunrise(3));
   * // '2026-10-29T06:09:07+02:00'
   * // Samples: a 5° ridge to the east (azimuth 90), flat elsewhere; values
   * // between samples are interpolated, and the list wraps around at 360°
   * const ridge = [
   *   {azimuth: 60, elevation: 0},
   *   {azimuth: 80, elevation: 5},
   *   {azimuth: 100, elevation: 5},
   *   {azimuth: 120, elevation: 0},
   * ];
   * Zmanim.formatISOWithTimeZone(tzid, zmanim.visibleSunrise(ridge));
   * // '2026-10-29T06:09:43+02:00'
   * // A function of azimuth (degrees clockwise from true north)
   * Zmanim.formatISOWithTimeZone(tzid, zmanim.visibleSunrise((az) => (az > 70 && az < 110 ? 5 : 0)));
   * // '2026-10-29T06:19:24+02:00'
   * // A flat profile of 0 reproduces sunrise() to within a second
   * Zmanim.formatISOWithTimeZone(tzid, zmanim.visibleSunrise(0));
   * // '2026-10-29T05:52:46+02:00'
   * Zmanim.formatISOWithTimeZone(tzid, zmanim.sunrise());
   * // '2026-10-29T05:52:46+02:00'
   * @param horizon the terrain horizon profile
   * @return the `Date` (to the second) when the sun first becomes visible, or
   *         an `Invalid Date` when there is no such crossing that day (polar
   *         night/day, or the sun never clears the profile).
   */
  visibleSunrise(horizon) {
    return this.visibleSunMillis(horizon, true);
  }
  /**
   * Visible sunset — _shkiah nireit_ (שקיעה נראית): the symmetric evening
   * counterpart of {@link visibleSunrise}, the last moment the sun's upper
   * limb is visible above the real terrain skyline to the west before it
   * disappears behind the ridge line.
   *
   * See {@link visibleSunrise} for the horizon-profile argument, the
   * refraction model, the upper-limb convention, that no cushion is added, and
   * why `useElevation` is ignored.
   * @example
   * import {GeoLocation, Zmanim} from '@hebcal/core';
   * // 300 m up on the Carmel: the sea horizon to the west sits about half a
   * // degree *below* level, so the visible sunset is later than sunset()
   * const tzid = 'Asia/Jerusalem';
   * const gloc = new GeoLocation('Haifa', 32.8, 34.98, 300, tzid);
   * const zmanim = new Zmanim(gloc, new Date(2026, 9, 29), false);
   * Zmanim.formatISOWithTimeZone(tzid, zmanim.sunset());
   * // '2026-10-29T16:52:01+02:00'
   * Zmanim.formatISOWithTimeZone(tzid, zmanim.visibleSunset((az) => (az > 240 && az < 300 ? -0.5 : 0)));
   * // '2026-10-29T16:55:07+02:00'
   * @param horizon the terrain horizon profile
   * @return the `Date` (to the second) when the sun was last visible, or an
   *         `Invalid Date` when there is no such crossing that day.
   */
  visibleSunset(horizon) {
    return this.visibleSunMillis(horizon, false);
  }
  /**
   * Alias for {@link visibleSunrise}
   * @param horizon the terrain horizon profile
   */
  neitzHaNireh(horizon) {
    return this.visibleSunrise(horizon);
  }
  /**
   * Alias for {@link visibleSunset}
   * @param horizon the terrain horizon profile
   */
  shkiahNireit(horizon) {
    return this.visibleSunset(horizon);
  }
  /**
   * Shared search driving {@link visibleSunrise} / {@link visibleSunset}.
   *
   * Scans the sun's geometric centre altitude `a` upward from −2.5° to +10° in
   * 0.05° steps. At each step it maps `a` to a time (via the sea-level
   * sunrise/sunset for the zenith `90 − a`) and that time to the sun's azimuth,
   * then compares the upper limb's apparent altitude against the horizon
   * profile at that azimuth. The sun is visible once that difference `g` is
   * `≥ 0`; the first upward crossing is bisected to 0.0005° and its time
   * returned. For sunrise this is the first moment seen; for sunset (same
   * upward scan, afternoon times) it is the last moment seen.
   * @param horizon the terrain horizon profile
   * @param rising `true` for the morning, `false` for the evening
   */
  visibleSunMillis(horizon, rising) {
    const lat = this.gloc.getLatitude();
    const lon = this.gloc.getLongitude();
    const timeAt = (a) => {
      let zenith = 90 - a;
      if (zenith === 90) {
        zenith = 90 + 1e-9;
      }
      const utc = rising ? this.noaa.getUTCSeaLevelSunrise(zenith) : this.noaa.getUTCSeaLevelSunset(zenith);
      return this.noaa.getEpochMillisFromTime(utc, rising);
    };
    const azimuthAt = (t) => {
      const zdt = Temporal.Instant.fromEpochMilliseconds(t).toZonedDateTimeISO("UTC");
      let az = NOAACalculator.getSolarAzimuth(zdt, lat, lon);
      az = (az % 180 + 180) % 180;
      if (!rising) {
        az += 180;
      }
      return az;
    };
    const g = (a) => upperLimbApparentAltitude(a) - horizonElevation(horizon, azimuthAt(timeAt(a)));
    const aLo = -2.5;
    const aHi = 10;
    const step = 0.05;
    const tol = 5e-4;
    const tLo = timeAt(aLo);
    if (Number.isNaN(tLo)) {
      return millisToDate(NaN);
    }
    if (g(aLo) >= 0) {
      return millisToDate(tLo);
    }
    let prevA = aLo;
    for (let a = aLo + step; a <= aHi + 1e-9; a += step) {
      if (Number.isNaN(timeAt(a))) {
        return millisToDate(NaN);
      }
      if (g(a) >= 0) {
        let lo = prevA;
        let hi = a;
        while (hi - lo > tol) {
          const mid = (lo + hi) / 2;
          if (g(mid) >= 0) {
            hi = mid;
          } else {
            lo = mid;
          }
        }
        return millisToDate(timeAt(hi));
      }
      prevA = a;
    }
    return millisToDate(NaN);
  }
  /**
   * Rabbeinu Tam holds that bein hashmashos is a specific time
   * between sunset and tzeis hakochavim.
   * One opinion on how to calculate this time is that
   * it is 13.5 minutes before tzies 7.083.
   * Because degree-based functions estimate the amount of light in the sky,
   * the result is not impacted by elevation.
   */
  beinHaShmashos() {
    const tzeit = this.tzeit(DEG_7_POINT_083);
    const millis = tzeit.getTime();
    if (Number.isNaN(millis)) {
      return tzeit;
    }
    return new Date(millis - 13.5 * 60 * 1e3);
  }
  /**
   * Used by Molad based _zmanim_ to determine if _zmanim_ occur during the current day.
   * @return previous midnight
   */
  getMidnightLastNight() {
    return this.plainDate.toZonedDateTime({
      timeZone: this.gloc.getTimeZone()
    });
  }
  /**
   * Used by Molad based _zmanim_ to determine if _zmanim_ occur during the current day.
   * @return following midnight
   */
  getMidnightTonight() {
    return this.plainDate.add({ days: 1 }).toZonedDateTime({
      timeZone: this.gloc.getTimeZone()
    });
  }
  /**
   * Returns the Date of the _molad_ based time if it occurs on the current date. Since _Kiddush Levana_
   * can only be said during the day, there are parameters to limit it to between _alos_ and _tzais_. If
   * the time occurs between _alos_ and _tzais_, _tzais_ will be returned.
   *
   * @param moladBasedTime
   *            the _molad_ based time such as _molad_, _tchilas_ and _sof zman Kiddush Levana_
   * @param alos
   *            optional start of day to limit _molad_ times to the end of the night before or beginning of the next night.
   *            Ignored if either _alos_ or _tzais_ are null.
   * @param tzais
   *            optional end of day to limit _molad_ times to the end of the night before or beginning of the next night.
   *            Ignored if either _tzais_ or _alos_ are null
   * @param techila
   *            is it the start of _Kiddush Levana_ time or the end? If it is start roll it to the next _tzais_,
   *            and if it is the end, return the end of the previous night (_alos_ passed in). Ignored if either
   *            _alos_ or _tzais_ are null.
   * @return the _molad_ based time. If the _zman_ does not occur during the current date, `null` will be
   *         returned.
   */
  getMoladBasedTime(moladBasedTime, alos, tzais, techila) {
    const lastMidnight = this.getMidnightLastNight();
    const midnightTonight = this.getMidnightTonight();
    if (Temporal.ZonedDateTime.compare(moladBasedTime, lastMidnight) < 0 || Temporal.ZonedDateTime.compare(moladBasedTime, midnightTonight) > 0) {
      return null;
    }
    if (alos === null || tzais === null) {
      return moladBasedTime.withTimeZone(this.gloc.getTimeZone());
    }
    if (Temporal.ZonedDateTime.compare(moladBasedTime, alos) > 0 && Temporal.ZonedDateTime.compare(moladBasedTime, tzais) < 0) {
      return techila ? tzais : alos;
    }
    return moladBasedTime.withTimeZone(this.gloc.getTimeZone());
  }
  /**
   * Returns the latest time of Kiddush Levana according to the
   * [Maharil's](https://en.wikipedia.org/wiki/Yaakov_ben_Moshe_Levi_Moelin) opinion that it is calculated as
   * halfway between _molad_ and _molad_. This adds half the 29 days, 12 hours and 793 chalakim time between
   * _molad_ and _molad_ (14 days, 18 hours, 22 minutes and 666 milliseconds) to the month's _molad_.
   *
   * The _sof zman Kiddush Levana_ will be returned even if it occurs during the day, unless both `alos` and
   * `tzais` are supplied.
   *
   * @param alos
   *            the beginning of the Jewish day. If _Kidush Levana_ occurs during the day (starting at _alos_ and
   *            ending at _tzais_), the time returned will be alos. If either the _alos_ or _tzais_ parameters
   *            are null, no daytime adjustment will be made.
   * @param tzais
   *            the end of the Jewish day. If Kidush Levana occurs during the day (starting at alos and ending at
   *            tzais), the time returned will be alos. If either the alos or tzais parameters are null, no daytime
   *            adjustment will be made.
   * @return the `Temporal.ZonedDateTime` representing the moment halfway between molad and molad. If the time
   *         occurs between _alos_ and _tzais_, _alos_ will be returned. If the _zman_ will not occur on this
   *         day, `null` will be returned.
   */
  getSofZmanKidushLevanaBetweenMoldos(alos = null, tzais = null) {
    const hd = this.hdate;
    if (hd.getDate() < 11 || hd.getDate() > 16) {
      return null;
    }
    const molad = new Molad(hd.getFullYear(), hd.getMonth());
    return this.getMoladBasedTime(molad.getSofZmanKidushLevanaBetweenMoldos(), alos, tzais, false);
  }
  /**
   * Returns the latest time of _Kiddush Levana_ calculated as 15 days after the molad. This is the opinion of
   * the Shulchan Aruch (Orach Chaim 426). It should be noted that some opinions hold that the
   * [Rema](https://en.wikipedia.org/wiki/Moses_Isserles), who brings down the opinion of the
   * [Maharil](https://en.wikipedia.org/wiki/Yaakov_ben_Moshe_Levi_Moelin) of calculating
   * {@link getSofZmanKidushLevanaBetweenMoldos half way between _molad_ and _molad_}, is of
   * the opinion that the Mechaber agrees to his opinion. Also see the Aruch Hashulchan. For additional details on
   * the subject, see Rabbi Dovid Heber's very detailed write-up in Siman Daled (chapter 4) of
   * [Shaarei Zmanim](https://hebrewbooks.org/53000).
   *
   * The _sof zman Kiddush Levana_ will be returned even if it occurs during the day, unless both `alos` and
   * `tzais` are supplied.
   *
   * @param alos
   *            the beginning of the Jewish day. If either the _alos_ or _tzais_ parameters are null, no daytime
   *            adjustment will be made.
   * @param tzais
   *            the end of the Jewish day. If either the _alos_ or _tzais_ parameters are null, no daytime
   *            adjustment will be made.
   * @return the `Temporal.ZonedDateTime` representing the moment 15 days after the _molad_. If the time occurs
   *         between _alos_ and _tzais_, _alos_ will be returned. If the _zman_ will not occur on this day,
   *         `null` will be returned.
   */
  getSofZmanKidushLevana15Days(alos = null, tzais = null) {
    const hd = this.hdate;
    if (hd.getDate() < 11 || hd.getDate() > 17) {
      return null;
    }
    const molad = new Molad(hd.getFullYear(), hd.getMonth());
    return this.getMoladBasedTime(molad.getSofZmanKidushLevana15Days(), alos, tzais, false);
  }
  /**
   * Returns the earliest time of _Kiddush Levana_ according to
   * [Rabbeinu Yonah](https://en.wikipedia.org/wiki/Yonah_Gerondi)'s opinion that it can be said 3 days after the _molad_.
   * If the time of _tchilas zman Kiddush Levana_ occurs during the day (between _alos_ and _tzais_ passed to
   * this method) it will return the following _tzais_. If null is passed for either _alos_ or _tzais_, the actual
   * _tchilas zman Kiddush Levana_ will be returned, regardless of if it is during the day or not.
   *
   * @param alos
   *            the beginning of the Jewish day. If Kidush Levana occurs during the day (starting at _alos_ and ending
   *            at _tzais_), the time returned will be _tzais_. If either the _alos_ or _tzais_ parameters
   *            are null, no daytime adjustment will be made.
   * @param tzais
   *            the end of the Jewish day. If _Kidush Levana_ occurs during the day (starting at _alos_ and ending at
   *            _tzais_), the time returned will be _tzais_. If either the _alos_ or _tzais_ parameters
   *            are null, no daytime adjustment will be made.
   *
   * @return the `Temporal.ZonedDateTime` representing the moment 3 days after the molad. If the time occurs
   *         between _alos_ and _tzais_, _tzais_ will be returned. If the _zman_ will not occur on this day,
   *         `null` will be returned.
   */
  getTchilasZmanKidushLevana3Days(alos = null, tzais = null) {
    const hd = this.hdate;
    if (hd.getDate() > 5 && hd.getDate() < 30) {
      return null;
    }
    const molad = new Molad(hd.getFullYear(), hd.getMonth());
    let zman = this.getMoladBasedTime(molad.getTchilasZmanKidushLevana3Days(), alos, tzais, true);
    if (zman === null && hd.getDate() === 30) {
      const hd2 = hd.add(1, "week");
      const molad2 = new Molad(hd2.getFullYear(), hd2.getMonth());
      zman = this.getMoladBasedTime(molad2.getTchilasZmanKidushLevana3Days(), null, null, true);
    }
    return zman;
  }
  /**
   * Returns the point in time of the _Molad_, if it occurs on this date. For the traditional day of week, hour,
   * minute and chalakim, see {@link Molad} and its {@link Molad.render} method.
   *
   * @return the `Temporal.ZonedDateTime` representing the moment of the molad. If the _molad_ does not occur on
   *         this day, `null` will be returned.
   */
  getZmanMolad() {
    const hd = this.hdate;
    if (hd.getDate() > 2 && hd.getDate() < 27) {
      return null;
    }
    const molad = new Molad(hd.getFullYear(), hd.getMonth());
    let zman = this.getMoladBasedTime(molad.getInstant(), null, null, true);
    if (zman === null && hd.getDate() > 26) {
      const hd2 = hd.add(1, "week");
      const molad2 = new Molad(hd2.getFullYear(), hd2.getMonth());
      zman = this.getMoladBasedTime(molad2.getInstant(), null, null, true);
    }
    return zman;
  }
  /**
   * Returns the earliest time of _Kiddush Levana_ according to the opinions that it should not be said until 7
   * days after the _molad_. The time will be returned even if it occurs during the day when _Kiddush Levana_
   * can't be recited, unless both `alos` and `tzais` are supplied.
   *
   * @param alos
   *            the beginning of the Jewish day. If _Kidush Levana_ occurs during the day (starting at _alos_ and
   *            ending at _tzais_), the time returned will be _tzais_. If either the _alos_ or _tzais_ parameters
   *            are null, no daytime adjustment will be made.
   * @param tzais
   *            the end of the Jewish day. If either the _alos_ or _tzais_ parameters are null, no daytime
   *            adjustment will be made.
   * @return the `Temporal.ZonedDateTime` representing the moment 7 days after the molad. If the _zman_
   *         will not occur on this day, `null` will be returned.
   */
  getTchilasZmanKidushLevana7Days(alos = null, tzais = null) {
    const hd = this.hdate;
    if (hd.getDate() < 4 || hd.getDate() > 9) {
      return null;
    }
    const molad = new Molad(hd.getFullYear(), hd.getMonth());
    return this.getMoladBasedTime(molad.getTchilasZmanKidushLevana7Days(), alos, tzais, true);
  }
  /**
   * A method that returns the [Baal Hatanya](https://en.wikipedia.org/wiki/Shneur_Zalman_of_Liadi)'s
   * _netz amiti_ (sunrise) without
   * elevation adjustment. This forms the base for the Baal Hatanya's dawn-based calculations that are
   * calculated as a dip below the horizon before sunrise.
   *
   * According to the Baal Hatanya, _netz amiti_, or true (halachic) sunrise, is when the top of the sun's
   * disk is visible at an elevation similar to the mountains of Eretz Yisrael. The time is calculated as the point at which
   * the center of the sun's disk is 1° 35' (1.58333°) below the horizon. This degree-based calculation can be found in Rabbi Shalom
   * DovBer Levine's commentary on
   * [The Baal Hatanya's Seder Hachnasas Shabbos](https://www.chabadlibrary.org/books/pdf/Seder-Hachnosas-Shabbos.pdf).
   * From an elevation of 546 meters, the top of [Har Hacarmel](https://en.wikipedia.org/wiki/Mount_Carmel),
   * the sun disappears when it is 1° 35' or 1.583° below the sea level horizon. This in turn is based on the Gemara
   * [Shabbos 35a](https://hebrewbooks.org/shas.aspx?mesechta=2&daf=35). There are other opinions brought down by
   * Rabbi Levine, including Rabbi Yosef Yitzchok Feigelstock who calculates it as the degrees below the horizon 4 minutes after
   * sunset in Yerushalayim (on the equinox). That is brought down as 1.583°. This is identical to the 1° 35' _zman_
   * and is probably a typo and should be 1.683°. These calculations are used by most
   * [Chabad](https://en.wikipedia.org/wiki/Chabad) calendars that use the Baal Hatanya's _zmanim_. See
   * [About Our Zmanim Calculations @ Chabad.org](https://www.chabad.org/library/article_cdo/aid/3209349/jewish/About-Our-Zmanim-Calculations.htm).
   *
   * Note: _netz amiti_ is used only for calculating certain _zmanim_, and is intentionally unpublished. For
   * practical purposes, daytime _mitzvos_ like _shofar_ and _lulav_ should not be done until after the
   * published time for _netz_ / sunrise.
   *
   * @return the exact sea level _netz amiti_ (sunrise) time. If the calculation can't be
   *         computed, such as in the Arctic Circle where there is at least one day a year where the sun does not rise, and one
   *         where it does not set, `null` will be returned.
   */
  getSunriseBaalHatanya() {
    return this.sunriseMillis(ZENITH_1_POINT_583, true);
  }
  /**
   * A method that returns the [Baal Hatanya](https://en.wikipedia.org/wiki/Shneur_Zalman_of_Liadi)'s
   * _shkiah amiti_ (sunset) without
   * elevation adjustment. This forms the base for the Baal Hatanya's dusk-based calculations that are calculated
   * as a dip below the horizon after sunset.
   *
   * According to the Baal Hatanya, _shkiah amiti_, true (_halachic_) sunset, is when the top of the
   * sun's disk disappears from view at an elevation similar to the mountains of _Eretz Yisrael_.
   * This time is calculated as the point at which the center of the sun's disk is 1° 35' below the horizon.
   *
   * Note: _shkiah amiti_ is used only for calculating certain _zmanim_, and is intentionally unpublished. For
   * practical purposes, all daytime mitzvos should be completed before the published time for _shkiah_ / sunset.
   *
   * For further explanation of the calculations used for the Baal Hatanya's _zmanim_ in this library, see
   * [About Our Zmanim Calculations @ Chabad.org](https://www.chabad.org/library/article_cdo/aid/3209349/jewish/About-Our-Zmanim-Calculations.htm).
   *
   * @return the exact sea level _shkiah amiti_ (sunset) time. If the calculation
   *         can't be computed, such as in the Arctic Circle where there is at least one day a year where the sun does not
   *         rise, and one where it does not set, `null` will be returned.
   */
  getSunsetBaalHatanya() {
    return this.sunsetMillis(ZENITH_1_POINT_583, true);
  }
  /**
   * Returns the [Baal Hatanya](https://en.wikipedia.org/wiki/Shneur_Zalman_of_Liadi)'s _alos_
   * (dawn) calculated as the time when the sun is 16.9° below the eastern geometric horizon
   * before {@link sunrise}.
   *
   * The zenith of 16.9° below is based on the calculation that the time between dawn
   * and _netz amiti_ (sunrise) is 72 minutes, the time that it takes to walk 4 mil at 18 minutes
   * a mil ([Rambam](https://en.wikipedia.org/wiki/Maimonides) and others). The sun's position at 72
   * minutes before _netz amiti_ (sunrise) in Jerusalem
   * [around the equinox / equilux](https://kosherjava.com/2022/01/12/equinox-vs-equilux-zmanim-calculations/)
   * is 16.9° below geometric zenith.
   *
   * @return the `Date` of dawn. If the calculation can't be computed, such as in northern and southern
   *         locations even south of the Arctic Circle and north of the Antarctic Circle where the sun may not reach
   *         low enough below the horizon for this calculation, an `Invalid Date` will be returned.
   */
  alosBaalHatanya() {
    return this.timeAtAngle(16.9, true);
  }
  getShaahZmanisBaalHatanya(hours) {
    return millisToDate(this.getShaahZmanisBasedZmanMillis(this.getSunriseBaalHatanya(), this.getSunsetBaalHatanya(), hours));
  }
  /**
   * This method returns the latest _zman krias shema_ (time to recite Shema in the morning). This time is 3
   * _shaos zmaniyos_ (solar hours) after _netz amiti_ (sunrise), based on the opinion of the Baal Hatanya
   * that the day is calculated from _netz amiti_ (sunrise) to _shkiah amiti_ (sunset).
   *
   * @return the `Date` of the latest _zman shema_ according to the Baal Hatanya. If the calculation
   *         can't be computed, such as in the Arctic Circle where there is at least one day a year where the sun does
   *         not rise and one where it does not set, an `Invalid Date` will be returned.
   */
  sofZmanShmaBaalHatanya() {
    return this.getShaahZmanisBaalHatanya(3);
  }
  /**
   * This method returns the latest _zman tfilah_ (time to recite the morning prayers). This time is 4
   * halachic hours into the day, based on the opinion of the Baal Hatanya that the day is
   * calculated from _netz amiti_ (sunrise) to _shkiah amiti_ (sunset).
   *
   * @return the `Date` of the latest _zman tfilah_. If the calculation can't be computed, such as in
   *         the Arctic Circle where there is at least one day a year where the sun does not rise and one where it does
   *         not set, an `Invalid Date` will be returned.
   */
  sofZmanTfilaBaalHatanya() {
    return this.getShaahZmanisBaalHatanya(4);
  }
  /**
   * This method returns the time of _mincha gedola_. _Mincha gedola_ is the earliest time one can pray
   * _mincha_. The [Rambam](https://en.wikipedia.org/wiki/Maimonides) is of the opinion that it is
   * better to delay _mincha_ until {@link minchaKetanaBaalHatanya | _mincha ketana_} while the
   * [Ra"sh](https://en.wikipedia.org/wiki/Asher_ben_Jehiel),
   * [Tur](https://en.wikipedia.org/wiki/Jacob_ben_Asher),
   * [GRA](https://en.wikipedia.org/wiki/Vilna_Gaon) and others are of the opinion that _mincha_ can be prayed
   * _lechatchila_ starting at _mincha gedola_. This is calculated as {@link chatzot} (the midpoint of
   * sea level sunrise and sunset) plus half a solar hour, based on the opinion of the Baal Hatanya that
   * the day is calculated from _netz amiti_ (sunrise) to _shkiah amiti_ (sunset). This is how Chabad.org
   * calculates it; 6.5 solar hours after _netz amiti_ differs by under a second, but that is enough to
   * change the printed minute on a few days a year.
   * @return the `Date` of the time of _mincha gedola_ according to the Baal Hatanya. If the calculation
   *         can't be computed, such as in the Arctic Circle where there is at least one day a year where the sun does not rise
   *         and one where it does not set, an `Invalid Date` will be returned.
   */
  minchaGedolaBaalHatanya() {
    const hour = temporalHourMillis(this.getSunriseBaalHatanya(), this.getSunsetBaalHatanya());
    return millisToDate(this.chatzotMillis() + hour / 2);
  }
  /**
   * This method returns the time of _mincha ketana_. This is the preferred earliest time to pray
   * _mincha_ in the opinion of the [Rambam](https://en.wikipedia.org/wiki/Maimonides) and others.
   * For more information on this see the documentation on {@link minchaGedolaBaalHatanya | _mincha gedola_}.
   * This is calculated as 9.5 sea level solar hours after _netz amiti_ (sunrise), based on the opinion of
   * the Baal Hatanya that the day is calculated from _netz amiti_ (sunrise) to _shkiah amiti_ (sunset).
   *
   * @return the `Date` of the time of _mincha ketana_. If the calculation can't be computed, such as
   *         in the Arctic Circle where there is at least one day a year where the sun does not rise and one where it
   *         does not set, an `Invalid Date` will be returned.
   */
  minchaKetanaBaalHatanya() {
    return this.getShaahZmanisBaalHatanya(9.5);
  }
  /**
   * This method returns the time of _plag hamincha_. This is calculated as 10.75 sea level solar hours
   * after _netz amiti_ (sunrise), based on the opinion of the Baal Hatanya that the day is calculated
   * from _netz amiti_ (sunrise) to _shkiah amiti_ (sunset).
   *
   * @return the `Date` of the time of _plag hamincha_ according to the Baal Hatanya. If the calculation
   *         can't be computed, such as in the Arctic Circle where there is at least one day a year where the sun does
   *         not rise and one where it does not set, an `Invalid Date` will be returned.
   */
  plagHaminchaBaalHatanya() {
    return this.getShaahZmanisBaalHatanya(10.75);
  }
  /**
   * A method that returns _tzais_ (nightfall) when the sun is 6° below the western geometric horizon
   * (90°) after {@link sunset}. This is the time the Baal Hatanya calls _shkiah amiti_ plus the
   * interval it takes the sun to descend a further 6°.
   *
   * @return the `Date` of nightfall. If the calculation can't be computed, such as in northern and southern
   *         locations — even south of the Arctic Circle and north of the Antarctic Circle — where the sun may not
   *         reach low enough below the horizon for this calculation, an `Invalid Date` will be returned.
   */
  tzaisBaalHatanya() {
    return this.timeAtAngle(6, false);
  }
  /**
   * Uses timeFormat to return a date like '20:34'.
   * Returns `XX:XX` if the date is invalid.
   * @param dt the time to format
   * @param timeFormat formatter to use, e.g. from
   *   {@link Location.getTimeFormatter}
   */
  static formatTime(dt, timeFormat) {
    if (Number.isNaN(dt.getTime())) {
      return "XX:XX";
    }
    const time = timeFormat.format(dt);
    if (time.charCodeAt(0) === 50 && // '2'
    time.charCodeAt(1) === 52 && // '4'
    time.charCodeAt(2) === 58) {
      return `00${time.substring(2)}`;
    }
    return time;
  }
  /**
   * Discards seconds, rounding to nearest minute.
   * @param dt
   */
  static roundTime(dt) {
    const millis = dt.getTime();
    if (Number.isNaN(millis)) {
      return dt;
    }
    const millisOnly = dt.getMilliseconds();
    const seconds = dt.getSeconds();
    if (seconds === 0 && millisOnly === 0) {
      return dt;
    }
    const secAndMillis = seconds * 1e3 + millisOnly;
    const delta = secAndMillis >= 3e4 ? 6e4 - secAndMillis : -1 * secAndMillis;
    return new Date(millis + delta);
  }
  /**
   * Get offset string (like "+05:00" or "-08:00") from tzid (like "Europe/Moscow")
   * @param tzid
   * @param date
   */
  static timeZoneOffset(tzid, date) {
    const offset = getTimezoneOffset(tzid, date);
    const offsetAbs = Math.abs(offset);
    const hours = Math.floor(offsetAbs / 60);
    const minutes = offsetAbs % 60;
    const sign = offset < 0 ? "+" : "-";
    return `${sign}${pad2(hours)}:${pad2(minutes)}`;
  }
  /**
   * Returns a string like "2022-04-01T13:06:00-11:00"
   * @param tzid
   * @param date
   */
  static formatISOWithTimeZone(tzid, date) {
    if (Number.isNaN(date.getTime())) {
      return "0000-00-00T00:00:00Z";
    }
    return getPseudoISO(tzid, date).substring(0, 19) + _Zmanim.timeZoneOffset(tzid, date);
  }
  /**
   * Returns sunrise + `offset` minutes (either positive or negative).
   * If elevation is enabled, this function will include elevation in the calculation
   *  unless `forceSeaLevel` is `true`.
   * @param offset minutes
   * @param roundMinute round time to nearest minute (default true)
   * @param forceSeaLevel use sea-level sunrise (default false)
   */
  sunriseOffset(offset, roundMinute = true, forceSeaLevel = false) {
    const sunrise = forceSeaLevel ? this.seaLevelSunrise() : this.sunrise();
    if (Number.isNaN(sunrise.getTime())) {
      return sunrise;
    }
    if (roundMinute) {
      if (offset > 0 && sunrise.getUTCSeconds() >= 30) {
        offset++;
      }
      sunrise.setUTCSeconds(0, 0);
    }
    return new Date(sunrise.getTime() + offset * 60 * 1e3);
  }
  /**
   * Returns sunset + `offset` minutes (either positive or negative).
   * If elevation is enabled, this function will include elevation in the calculation
   *  unless `forceSeaLevel` is `true`.
   * @param offset minutes
   * @param roundMinute round time to nearest minute (default true)
   * @param forceSeaLevel use sea-level sunset (default false)
   */
  sunsetOffset(offset, roundMinute = true, forceSeaLevel = false) {
    const sunset = forceSeaLevel ? this.seaLevelSunset() : this.sunset();
    if (Number.isNaN(sunset.getTime())) {
      return sunset;
    }
    if (roundMinute) {
      if (offset > 0 && sunset.getUTCSeconds() >= 30) {
        offset++;
      }
      sunset.setUTCSeconds(0, 0);
    }
    return new Date(sunset.getTime() + offset * 60 * 1e3);
  }
  /**
   * Returns the Hebrew date relative to the specified location and Gregorian date,
   * taking into consideration whether the time is before or after sunset.
   *
   * For example, if the given date and is `2024-09-22T10:35` (before sunset), and
   * sunset for the specified location is **19:04**, then this function would
   * return a Hebrew date of `19th of Elul, 5784`.
   * If the given date is the same Gregorian day after sunset
   * (for example `2024-09-22T20:07`), this function would return a
   * Hebrew date of `20th of Elul, 5784`.
   * @example
   * import {GeoLocation, Zmanim, HDate} from '@hebcal/core';
   * const latitude = 48.85341;
   * const longitude = 2.3488;
   * const timezone = 'Europe/Paris';
   * const gloc = new GeoLocation(null, latitude, longitude, 0, timezone);
   * const before = Zmanim.makeSunsetAwareHDate(gloc, new Date('2024-09-22T17:38:46.123Z'), false);
   * console.log(before.toString()); // '19 Elul 5784'
   * const after = Zmanim.makeSunsetAwareHDate(gloc, new Date('2024-09-22T23:45:18.345Z'), false);
   * console.log(after.toString()); // '20 Elul 5784'
   */
  static makeSunsetAwareHDate(gloc, date, useElevation) {
    const zmanim = new _Zmanim(gloc, date, useElevation);
    const sunset = zmanim.sunset();
    let hd = new HDate(date);
    const sunsetMillis = sunset.getTime();
    if (Number.isNaN(sunsetMillis)) {
      return hd;
    }
    if (date.getTime() >= sunsetMillis) {
      hd = hd.next();
    }
    return hd;
  }
};

// node_modules/@hebcal/core/dist/esm/staticHolidays.js
var { NISAN: NISAN3, IYYAR: IYYAR2, SIVAN: SIVAN2, AV: AV2, ELUL: ELUL2, TISHREI: TISHREI2, SHVAT: SHVAT3, ADAR_II: ADAR_II3 } = months;
var { CHAG, LIGHT_CANDLES, YOM_TOV_ENDS, CHUL_ONLY, IL_ONLY, LIGHT_CANDLES_TZEIS, MAJOR_FAST, MINOR_HOLIDAY, EREV, CHOL_HAMOED } = flags;
var holidayDesc = {
  /** Asara B'Tevet */
  ASARA_BTEVET: "Asara B'Tevet",
  /** Birkat Hachamah */
  BIRKAT_HACHAMAH: "Birkat Hachamah",
  /** Chag HaBanot */
  CHAG_HABANOT: "Chag HaBanot",
  /** Chanukah: 8th Day */
  CHANUKAH_8TH_DAY: "Chanukah: 8th Day",
  /** Erev Tish'a B'Av */
  EREV_TISHA_BAV: "Erev Tish'a B'Av",
  /** Leil Selichot */
  LEIL_SELICHOT: "Leil Selichot",
  /** Purim Katan */
  PURIM_KATAN: "Purim Katan",
  /** Purim Meshulash */
  PURIM_MESHULASH: "Purim Meshulash",
  /** Shabbat Chazon */
  SHABBAT_CHAZON: "Shabbat Chazon",
  /** Shabbat HaChodesh */
  SHABBAT_HACHODESH: "Shabbat HaChodesh",
  /** Shabbat HaGadol */
  SHABBAT_HAGADOL: "Shabbat HaGadol",
  /** Shabbat Nachamu */
  SHABBAT_NACHAMU: "Shabbat Nachamu",
  /** Shabbat Parah */
  SHABBAT_PARAH: "Shabbat Parah",
  /** Shabbat Shekalim */
  SHABBAT_SHEKALIM: "Shabbat Shekalim",
  /** Shabbat Shirah */
  SHABBAT_SHIRAH: "Shabbat Shirah",
  /** Shabbat Shuva */
  SHABBAT_SHUVA: "Shabbat Shuva",
  /** Shabbat Zachor */
  SHABBAT_ZACHOR: "Shabbat Zachor",
  /** Shushan Purim Katan */
  SHUSHAN_PURIM_KATAN: "Shushan Purim Katan",
  /** Ta'anit Bechorot */
  TAANIT_BECHOROT: "Ta'anit Bechorot",
  /** Ta'anit BeHaB */
  TAANIT_BEHAB: "Ta'anit BeHaB",
  /** Ta'anit Esther */
  TAANIT_ESTHER: "Ta'anit Esther",
  /** Tish'a B'Av */
  TISHA_BAV: "Tish'a B'Av",
  /** Tzom Gedaliah */
  TZOM_GEDALIAH: "Tzom Gedaliah",
  /** Tzom Tammuz */
  TZOM_TAMMUZ: "Tzom Tammuz",
  /** Yom HaAtzma'ut */
  YOM_HAATZMA_UT: "Yom HaAtzma'ut",
  /** Yom HaShoah */
  YOM_HASHOAH: "Yom HaShoah",
  /** Yom HaZikaron */
  YOM_HAZIKARON: "Yom HaZikaron",
  /** Ben-Gurion Day */
  BEN_GURION_DAY: "Ben-Gurion Day",
  /** Chanukah: 1 Candle */
  CHANUKAH_1_CANDLE: "Chanukah: 1 Candle",
  /** Erev Pesach */
  EREV_PESACH: "Erev Pesach",
  /** Erev Purim */
  EREV_PURIM: "Erev Purim",
  /** Erev Rosh Hashana */
  EREV_ROSH_HASHANA: "Erev Rosh Hashana",
  /** Erev Shavuot */
  EREV_SHAVUOT: "Erev Shavuot",
  /** Erev Sukkot */
  EREV_SUKKOT: "Erev Sukkot",
  /** Erev Yom Kippur */
  EREV_YOM_KIPPUR: "Erev Yom Kippur",
  /** Family Day */
  FAMILY_DAY: "Family Day",
  /** Hebrew Language Day */
  HEBREW_LANGUAGE_DAY: "Hebrew Language Day",
  /** Herzl Day */
  HERZL_DAY: "Herzl Day",
  /** Jabotinsky Day */
  JABOTINSKY_DAY: "Jabotinsky Day",
  /** Lag BaOmer */
  LAG_BAOMER: "Lag BaOmer",
  /** Pesach I */
  PESACH_I: "Pesach I",
  /** Pesach II */
  PESACH_II: "Pesach II",
  /** Pesach III (CH''M) */
  PESACH_III_CHM: "Pesach III (CH''M)",
  /** Pesach II (CH''M) */
  PESACH_II_CHM: "Pesach II (CH''M)",
  /** Pesach IV (CH''M) */
  PESACH_IV_CHM: "Pesach IV (CH''M)",
  /** Pesach Sheni */
  PESACH_SHENI: "Pesach Sheni",
  /** Pesach VII */
  PESACH_VII: "Pesach VII",
  /** Pesach VIII */
  PESACH_VIII: "Pesach VIII",
  /** Pesach VI (CH''M) */
  PESACH_VI_CHM: "Pesach VI (CH''M)",
  /** Pesach V (CH''M) */
  PESACH_V_CHM: "Pesach V (CH''M)",
  /** Purim */
  PURIM: "Purim",
  /** Rosh Hashana II */
  ROSH_HASHANA_II: "Rosh Hashana II",
  /** Rosh Hashana LaBehemot */
  ROSH_HASHANA_LABEHEMOT: "Rosh Hashana LaBehemot",
  /** Shavuot */
  SHAVUOT: "Shavuot",
  /** Shavuot I */
  SHAVUOT_I: "Shavuot I",
  /** Shavuot II */
  SHAVUOT_II: "Shavuot II",
  /** Shmini Atzeret */
  SHMINI_ATZERET: "Shmini Atzeret",
  /** Shushan Purim */
  SHUSHAN_PURIM: "Shushan Purim",
  /** Sigd */
  SIGD: "Sigd",
  /** Simchat Torah */
  SIMCHAT_TORAH: "Simchat Torah",
  /** Sukkot I */
  SUKKOT_I: "Sukkot I",
  /** Sukkot II */
  SUKKOT_II: "Sukkot II",
  /** Sukkot III (CH''M) */
  SUKKOT_III_CHM: "Sukkot III (CH''M)",
  /** Sukkot II (CH''M) */
  SUKKOT_II_CHM: "Sukkot II (CH''M)",
  /** Sukkot IV (CH''M) */
  SUKKOT_IV_CHM: "Sukkot IV (CH''M)",
  /** Sukkot VII (Hoshana Raba) */
  SUKKOT_VII_HOSHANA_RABA: "Sukkot VII (Hoshana Raba)",
  /** Sukkot VI (CH''M) */
  SUKKOT_VI_CHM: "Sukkot VI (CH''M)",
  /** Sukkot V (CH''M) */
  SUKKOT_V_CHM: "Sukkot V (CH''M)",
  /** Tu B'Av */
  TU_BAV: "Tu B'Av",
  /** Tu BiShvat */
  TU_BISHVAT: "Tu BiShvat",
  /** Yitzhak Rabin Memorial Day */
  YITZHAK_RABIN_MEMORIAL_DAY: "Yitzhak Rabin Memorial Day",
  /** Yom HaAliyah */
  YOM_HAALIYAH: "Yom HaAliyah",
  /** Yom HaAliyah School Observance */
  YOM_HAALIYAH_SCHOOL_OBSERVANCE: "Yom HaAliyah School Observance",
  /** Yom Kippur */
  YOM_KIPPUR: "Yom Kippur",
  /** Yom Yerushalayim */
  YOM_YERUSHALAYIM: "Yom Yerushalayim",
  /** Candle lighting */
  CANDLE_LIGHTING: "Candle lighting",
  /** Havdalah */
  HAVDALAH: "Havdalah",
  /** Fast begins */
  FAST_BEGINS: "Fast begins",
  /** Fast ends */
  FAST_ENDS: "Fast ends",
  /** Biur Chametz */
  BIUR_CHAMETZ: "Biur Chametz",
  /** Finish eating chametz */
  SOF_ZMAN_ACHILAT_CHAMETZ: "Finish eating chametz",
  /** Yizkor */
  YIZKOR: "Yizkor",
  /** Remembrance Day for the Fallen of the Swords of Iron War (October 7) */
  SWORDS_OF_IRON_WAR_MEMORIAL: "Swords of Iron War Memorial Day"
};
var d = holidayDesc;
var emojiRoshHashana = "\u{1F34F}\u{1F36F}";
var emojiSukkot = "\u{1F33F}\u{1F34B}";
var emojiPurim = "\u{1F3AD}\uFE0F\u{1F4DC}";
var emojiPesach = "\u{1FAD3}";
var emojiErevPesach = "\u{1FAD3}\u{1F377}";
var emojiShavuot = "\u26F0\uFE0F\u{1F338}";
function holiday(mm, dd, desc, holidayFlags, extras) {
  return { mm, dd, desc, flags: holidayFlags, ...extras };
}
var staticHolidays = [
  holiday(TISHREI2, 2, d.ROSH_HASHANA_II, CHAG | YOM_TOV_ENDS, {
    emoji: emojiRoshHashana
  }),
  holiday(TISHREI2, 9, d.EREV_YOM_KIPPUR, EREV | LIGHT_CANDLES),
  holiday(TISHREI2, 10, d.YOM_KIPPUR, CHAG | MAJOR_FAST | YOM_TOV_ENDS),
  // Sukkot chutz l'aretz
  holiday(TISHREI2, 14, d.EREV_SUKKOT, CHUL_ONLY | EREV | LIGHT_CANDLES, {
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 15, d.SUKKOT_I, CHUL_ONLY | CHAG | LIGHT_CANDLES_TZEIS, {
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 16, d.SUKKOT_II, CHUL_ONLY | CHAG | YOM_TOV_ENDS, {
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 17, d.SUKKOT_III_CHM, CHUL_ONLY | CHOL_HAMOED, {
    chmDay: 1,
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 18, d.SUKKOT_IV_CHM, CHUL_ONLY | CHOL_HAMOED, {
    chmDay: 2,
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 19, d.SUKKOT_V_CHM, CHUL_ONLY | CHOL_HAMOED, {
    chmDay: 3,
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 20, d.SUKKOT_VI_CHM, CHUL_ONLY | CHOL_HAMOED, {
    chmDay: 4,
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 22, d.SHMINI_ATZERET, CHUL_ONLY | CHAG | LIGHT_CANDLES_TZEIS),
  holiday(TISHREI2, 23, d.SIMCHAT_TORAH, CHUL_ONLY | CHAG | YOM_TOV_ENDS),
  // Sukkot Israel
  holiday(TISHREI2, 14, d.EREV_SUKKOT, IL_ONLY | EREV | LIGHT_CANDLES, {
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 15, d.SUKKOT_I, IL_ONLY | CHAG | YOM_TOV_ENDS, {
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 16, d.SUKKOT_II_CHM, IL_ONLY | CHOL_HAMOED, {
    chmDay: 1,
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 17, d.SUKKOT_III_CHM, IL_ONLY | CHOL_HAMOED, {
    chmDay: 2,
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 18, d.SUKKOT_IV_CHM, IL_ONLY | CHOL_HAMOED, {
    chmDay: 3,
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 19, d.SUKKOT_V_CHM, IL_ONLY | CHOL_HAMOED, {
    chmDay: 4,
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 20, d.SUKKOT_VI_CHM, IL_ONLY | CHOL_HAMOED, {
    chmDay: 5,
    emoji: emojiSukkot
  }),
  holiday(TISHREI2, 22, d.SHMINI_ATZERET, IL_ONLY | CHAG | YOM_TOV_ENDS),
  // Hoshana Raba (both Israel and Diaspora)
  holiday(TISHREI2, 21, d.SUKKOT_VII_HOSHANA_RABA, LIGHT_CANDLES | CHOL_HAMOED, {
    chmDay: -1,
    emoji: emojiSukkot
  }),
  holiday(SHVAT3, 15, d.TU_BISHVAT, MINOR_HOLIDAY, { emoji: "\u{1F333}" }),
  holiday(ADAR_II3, 13, d.EREV_PURIM, EREV | MINOR_HOLIDAY, {
    emoji: emojiPurim
  }),
  holiday(ADAR_II3, 14, d.PURIM, MINOR_HOLIDAY, { emoji: emojiPurim }),
  holiday(ADAR_II3, 15, d.SHUSHAN_PURIM, MINOR_HOLIDAY, { emoji: emojiPurim }),
  // Pesach Israel
  holiday(NISAN3, 14, d.EREV_PESACH, IL_ONLY | EREV | LIGHT_CANDLES, {
    emoji: emojiErevPesach
  }),
  holiday(NISAN3, 15, d.PESACH_I, IL_ONLY | CHAG | YOM_TOV_ENDS, {
    emoji: emojiPesach
  }),
  holiday(NISAN3, 16, d.PESACH_II_CHM, IL_ONLY | CHOL_HAMOED, {
    chmDay: 1,
    emoji: emojiPesach
  }),
  holiday(NISAN3, 17, d.PESACH_III_CHM, IL_ONLY | CHOL_HAMOED, {
    chmDay: 2,
    emoji: emojiPesach
  }),
  holiday(NISAN3, 18, d.PESACH_IV_CHM, IL_ONLY | CHOL_HAMOED, {
    chmDay: 3,
    emoji: emojiPesach
  }),
  holiday(NISAN3, 19, d.PESACH_V_CHM, IL_ONLY | CHOL_HAMOED, {
    chmDay: 4,
    emoji: emojiPesach
  }),
  holiday(NISAN3, 20, d.PESACH_VI_CHM, IL_ONLY | CHOL_HAMOED | LIGHT_CANDLES, {
    chmDay: 5,
    emoji: emojiPesach
  }),
  holiday(NISAN3, 21, d.PESACH_VII, IL_ONLY | CHAG | YOM_TOV_ENDS, {
    emoji: emojiPesach
  }),
  // Pesach chutz l'aretz
  holiday(NISAN3, 14, d.EREV_PESACH, CHUL_ONLY | EREV | LIGHT_CANDLES, {
    emoji: emojiErevPesach
  }),
  holiday(NISAN3, 15, d.PESACH_I, CHUL_ONLY | CHAG | LIGHT_CANDLES_TZEIS, {
    emoji: emojiErevPesach
  }),
  holiday(NISAN3, 16, d.PESACH_II, CHUL_ONLY | CHAG | YOM_TOV_ENDS, {
    emoji: emojiPesach
  }),
  holiday(NISAN3, 17, d.PESACH_III_CHM, CHUL_ONLY | CHOL_HAMOED, {
    chmDay: 1,
    emoji: emojiPesach
  }),
  holiday(NISAN3, 18, d.PESACH_IV_CHM, CHUL_ONLY | CHOL_HAMOED, {
    chmDay: 2,
    emoji: emojiPesach
  }),
  holiday(NISAN3, 19, d.PESACH_V_CHM, CHUL_ONLY | CHOL_HAMOED, {
    chmDay: 3,
    emoji: emojiPesach
  }),
  holiday(NISAN3, 20, d.PESACH_VI_CHM, CHUL_ONLY | CHOL_HAMOED | LIGHT_CANDLES, {
    chmDay: 4,
    emoji: emojiPesach
  }),
  holiday(NISAN3, 21, d.PESACH_VII, CHUL_ONLY | CHAG | LIGHT_CANDLES_TZEIS, {
    emoji: emojiPesach
  }),
  holiday(NISAN3, 22, d.PESACH_VIII, CHUL_ONLY | CHAG | YOM_TOV_ENDS, {
    emoji: emojiPesach
  }),
  holiday(IYYAR2, 14, d.PESACH_SHENI, MINOR_HOLIDAY),
  holiday(IYYAR2, 18, d.LAG_BAOMER, MINOR_HOLIDAY, { emoji: "\u{1F525}" }),
  holiday(SIVAN2, 5, d.EREV_SHAVUOT, EREV | LIGHT_CANDLES, {
    emoji: emojiShavuot
  }),
  holiday(SIVAN2, 6, d.SHAVUOT, IL_ONLY | CHAG | YOM_TOV_ENDS, {
    emoji: emojiShavuot
  }),
  holiday(SIVAN2, 6, d.SHAVUOT_I, CHUL_ONLY | CHAG | LIGHT_CANDLES_TZEIS, {
    emoji: emojiShavuot
  }),
  holiday(SIVAN2, 7, d.SHAVUOT_II, CHUL_ONLY | CHAG | YOM_TOV_ENDS, {
    emoji: emojiShavuot
  }),
  holiday(AV2, 15, d.TU_BAV, MINOR_HOLIDAY, { emoji: "\u2764\uFE0F" }),
  holiday(ELUL2, 1, d.ROSH_HASHANA_LABEHEMOT, MINOR_HOLIDAY, { emoji: "\u{1F411}" }),
  holiday(ELUL2, 29, d.EREV_ROSH_HASHANA, EREV | LIGHT_CANDLES, {
    emoji: emojiRoshHashana
  })
];

// node_modules/@hebcal/core/dist/esm/HolidayEvent.js
var HolidayEvent = class extends Event {
  /** During Sukkot or Pesach */
  cholHaMoedDay;
  /**
   * `true` if the fast day was postponed a day to avoid Shabbat.
   * - Tish'a B'Av postponed from the 9th to the 10th
   * - Tzom Tammuz postponed from the 17th to the 18th
   */
  observed;
  constructor(date, desc, mask = 0, attrs) {
    super(date, desc, mask, attrs);
    if (typeof attrs === "object" && attrs !== null) {
      Object.assign(this, attrs);
    }
  }
  /**
   * Returns a simplified (untranslated) name for this holiday, stripping
   * qualifiers so that related events group under one name.
   *
   * Strips trailing 4-digit years, `(CH''M)`, `(observed)`, `(Hoshana Raba)`,
   * Roman-numeral day numbers (` I`, ` II`, ...), Chanukah candle counts,
   * `: 8th Day`, and a leading `"Erev "`.
   * @example
   * // 'Erev Pesach'           => 'Pesach'
   * // 'Sukkot III (CH''M)'    => 'Sukkot'
   * // 'Chanukah: 5 Candles'   => 'Chanukah'
   * // 'Rosh Hashana 5784'     => 'Rosh Hashana'
   */
  basename() {
    return this.getDesc().replace(/ \d{4}$/, "").replace(/ \(CH''M\)$/, "").replace(/ \(observed\)$/, "").replace(/ \(Hoshana Raba\)$/, "").replace(/ [IV]+$/, "").replace(/: \d Candles?$/, "").replace(/: 8th Day$/, "").replace(/^Erev /, "");
  }
  /**
   * Returns a `https://www.hebcal.com/holidays/...` URL for more detail on
   * this holiday. Israel-only holidays get an `?i=on` query parameter.
   * Returns `undefined` for Gregorian years outside `[1752, 2499]` and for
   * Ta'anit BeHaB, which has no holiday page.
   */
  url() {
    if (this.hasFlag("BEHAB")) {
      return void 0;
    }
    const year = this.greg().getFullYear();
    if (year < 1752 || year > 2499) {
      return void 0;
    }
    const url = `https://www.hebcal.com/holidays/${urlFriendly(this.basename())}-${this.urlDateSuffix()}`;
    return this.hasFlag("IL_ONLY") ? `${url}?i=on` : url;
  }
  /**
   * The date portion of {@link url}. For most holidays this is just the
   * Gregorian year; subclasses override it when a year alone is ambiguous.
   */
  urlDateSuffix() {
    return String(this.greg().getFullYear());
  }
  getEmoji() {
    if (this.emoji) {
      return this.emoji;
    }
    if (this.hasFlag("SPECIAL_SHABBAT")) {
      return "\u{1F54D}";
    }
    return "\u2721\uFE0F";
  }
  getCategories() {
    if (this.cholHaMoedDay) {
      return ["holiday", "major", "cholhamoed"];
    }
    const cats = super.getCategories();
    if (cats[0] !== "unknown") {
      return cats;
    }
    const desc = this.getDesc();
    switch (desc) {
      case holidayDesc.LAG_BAOMER:
      case holidayDesc.LEIL_SELICHOT:
      case holidayDesc.PESACH_SHENI:
      case holidayDesc.EREV_PURIM:
      case holidayDesc.PURIM_KATAN:
      case holidayDesc.SHUSHAN_PURIM:
      case holidayDesc.TU_BAV:
      case holidayDesc.TU_BISHVAT:
      case holidayDesc.ROSH_HASHANA_LABEHEMOT:
        return ["holiday", "minor"];
    }
    return ["holiday", "major"];
  }
  /**
   * Returns (translated) description of this event
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  render(locale) {
    const str = super.render(locale);
    return smartApostrophe(str);
  }
  /**
   * Returns a brief (translated) description of this event.
   * For most events, this is the same as render(). For some events, it procudes
   * a shorter text (e.g. without a time or added description).
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  renderBrief(locale) {
    const str = super.renderBrief(locale);
    return smartApostrophe(str);
  }
};
var AsaraBTevetEvent = class extends HolidayEvent {
  /** Full `YYYYMMDD` date, since the Gregorian year alone is ambiguous here */
  urlDateSuffix() {
    const isoDate = isoDateString(this.greg());
    return isoDate.replaceAll("-", "");
  }
};
var chanukahEmoji = "\u{1F54E}";
var KEYCAP_DIGITS = [
  "0\uFE0F\u20E3",
  "1\uFE0F\u20E3",
  "2\uFE0F\u20E3",
  "3\uFE0F\u20E3",
  "4\uFE0F\u20E3",
  "5\uFE0F\u20E3",
  "6\uFE0F\u20E3",
  "7\uFE0F\u20E3",
  "8\uFE0F\u20E3",
  "9\uFE0F\u20E3"
];
var ChanukahEvent = class extends HolidayEvent {
  chanukahDay;
  /**
   * @param chanukahDay should be undefined for 1st night of Chanukah
   */
  constructor(date, desc, mask, chanukahDay) {
    super(date, desc, mask);
    this.chanukahDay = chanukahDay;
    this.emoji = chanukahEmoji;
    if (chanukahDay !== 8) {
      const candles = chanukahDay ? chanukahDay + 1 : 1;
      this.emoji += KEYCAP_DIGITS[candles];
    }
  }
  urlDateSuffix() {
    const dt = this.greg();
    let year = dt.getFullYear();
    if (dt.getMonth() === 0) {
      year--;
    }
    return String(year);
  }
};
var RoshHashanaEvent = class extends HolidayEvent {
  hyear;
  /**
   * Normally created by {@link calendar} rather than directly.
   * @param date Hebrew date event occurs
   * @param hyear Hebrew year
   * @param mask optional holiday flags
   */
  constructor(date, hyear, mask) {
    super(date, `Rosh Hashana ${hyear}`, mask);
    this.hyear = hyear;
  }
  /**
   * Returns (translated) description of this event
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  render(locale) {
    return `${Locale.gettext("Rosh Hashana", locale)} ${this.hyear}`;
  }
  getEmoji() {
    return "\u{1F34F}\u{1F36F}";
  }
};
var roshChodeshStr = "Rosh Chodesh";
var RoshChodeshEvent = class extends HolidayEvent {
  /**
   * Constructs Rosh Chodesh event
   * @param date Hebrew date event occurs
   * @param monthName Hebrew month name (not translated)
   */
  constructor(date, monthName) {
    super(date, `${roshChodeshStr} ${monthName}`, flags.ROSH_CHODESH);
  }
  /**
   * Returns (translated) description of this event
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  render(locale) {
    const monthName = this.getDesc().substring(roshChodeshStr.length + 1);
    const monthName0 = Locale.gettext(monthName, locale);
    const monthName1 = smartApostrophe(monthName0);
    return `${Locale.gettext(roshChodeshStr, locale)} ${monthName1}`;
  }
  basename() {
    return this.getDesc();
  }
  getEmoji() {
    return this.emoji || "\u{1F312}";
  }
};

// node_modules/@hebcal/core/dist/esm/modern.js
var Day;
(function(Day2) {
  Day2[Day2["SUN"] = 0] = "SUN";
  Day2[Day2["TUE"] = 2] = "TUE";
  Day2[Day2["THU"] = 4] = "THU";
  Day2[Day2["FRI"] = 5] = "FRI";
  Day2[Day2["SAT"] = 6] = "SAT";
})(Day || (Day = {}));
var { NISAN: NISAN4, IYYAR: IYYAR3, CHESHVAN: CHESHVAN3 } = months;
function dateYomHaShoah(year) {
  if (year < 5711) {
    return null;
  }
  let nisan27dt = new HDate(27, NISAN4, year);
  if (nisan27dt.getDay() === Day.FRI) {
    nisan27dt = new HDate(26, NISAN4, year);
  } else if (nisan27dt.getDay() === Day.SUN) {
    nisan27dt = new HDate(28, NISAN4, year);
  }
  return nisan27dt;
}
function dateYomHaZikaron(year) {
  if (year < 5708) {
    return null;
  }
  let day;
  const pesach = new HDate(15, NISAN4, year);
  const pdow = pesach.getDay();
  if (pdow === Day.SUN) {
    day = 2;
  } else if (pdow === Day.SAT) {
    day = 3;
  } else if (year < 5764) {
    day = 4;
  } else if (pdow === Day.TUE) {
    day = 5;
  } else {
    day = 4;
  }
  return new HDate(day, IYYAR3, year);
}
function postpone(hd, rule) {
  const dow = hd.getDay();
  switch (rule) {
    case "friSatToThu":
      return dow === Day.FRI || dow === Day.SAT ? hd.onOrBefore(Day.THU) : hd;
    case "friSatToSun":
      if (dow === Day.FRI)
        return hd.next().next();
      return dow === Day.SAT ? hd.next() : hd;
    case "satToSun":
      return dow === Day.SAT ? hd.next() : hd;
    case void 0:
      return hd;
    default:
      return rule;
  }
}
var staticModernHolidays = [
  {
    firstYear: 5727,
    mm: IYYAR3,
    dd: 28,
    desc: holidayDesc.YOM_YERUSHALAYIM,
    chul: true
  },
  {
    firstYear: 5737,
    mm: months.KISLEV,
    dd: 6,
    desc: holidayDesc.BEN_GURION_DAY,
    postpone: "friSatToSun"
  },
  { firstYear: 5750, mm: months.SHVAT, dd: 30, desc: holidayDesc.FAMILY_DAY },
  {
    firstYear: 5758,
    mm: CHESHVAN3,
    dd: 12,
    desc: holidayDesc.YITZHAK_RABIN_MEMORIAL_DAY,
    postpone: "friSatToThu"
  },
  {
    firstYear: 5764,
    mm: IYYAR3,
    dd: 10,
    desc: holidayDesc.HERZL_DAY,
    postpone: "satToSun"
  },
  {
    firstYear: 5765,
    mm: months.TAMUZ,
    dd: 29,
    desc: holidayDesc.JABOTINSKY_DAY,
    postpone: "satToSun"
  },
  {
    firstYear: 5769,
    mm: CHESHVAN3,
    dd: 29,
    desc: holidayDesc.SIGD,
    chul: true,
    suppressEmoji: true,
    postpone: "friSatToThu"
  },
  { firstYear: 5777, mm: NISAN4, dd: 10, desc: holidayDesc.YOM_HAALIYAH, chul: true },
  {
    firstYear: 5777,
    mm: CHESHVAN3,
    dd: 7,
    desc: holidayDesc.YOM_HAALIYAH_SCHOOL_OBSERVANCE
  },
  // https://www.gov.il/he/departments/policies/2012_des5234
  {
    firstYear: 5773,
    mm: months.TEVET,
    dd: 21,
    desc: holidayDesc.HEBREW_LANGUAGE_DAY,
    postpone: "friSatToThu"
  },
  /**
   * https://fs.knesset.gov.il/25/law/25_lsr_14184773.pdf
   * (Published in Sefer HaChukim No. 3567 on 8 Av 5786 / July 22, 2026)
   */
  {
    firstYear: 5786,
    mm: months.TISHREI,
    dd: 24,
    desc: holidayDesc.SWORDS_OF_IRON_WAR_MEMORIAL,
    chul: true,
    postpone: "satToSun"
  }
];
var { MODERN_HOLIDAY, IL_ONLY: IL_ONLY2 } = flags;
var ISRAEL_FLAG = "\u{1F1EE}\u{1F1F1}";
var emojiIsraelFlag = { emoji: ISRAEL_FLAG };
function modernHolidaysForYear(year) {
  const events = [];
  const nisan27dt = dateYomHaShoah(year);
  if (nisan27dt) {
    events.push(new HolidayEvent(nisan27dt, holidayDesc.YOM_HASHOAH, MODERN_HOLIDAY));
  }
  const yomHaZikaronDt = dateYomHaZikaron(year);
  if (yomHaZikaronDt) {
    events.push(new HolidayEvent(yomHaZikaronDt, holidayDesc.YOM_HAZIKARON, MODERN_HOLIDAY, emojiIsraelFlag), new HolidayEvent(yomHaZikaronDt.next(), holidayDesc.YOM_HAATZMA_UT, MODERN_HOLIDAY, emojiIsraelFlag));
  }
  for (const h of staticModernHolidays) {
    if (year >= h.firstYear) {
      const hd = postpone(new HDate(h.dd, h.mm, year), h.postpone);
      const mask = h.chul ? MODERN_HOLIDAY : MODERN_HOLIDAY | IL_ONLY2;
      const ev = new HolidayEvent(hd, h.desc, mask);
      if (!h.suppressEmoji) {
        ev.emoji = ISRAEL_FLAG;
      }
      events.push(ev);
    }
  }
  return events;
}

// node_modules/@hebcal/core/dist/esm/sedra.js
var INCOMPLETE = 0;
var REGULAR = 1;
var COMPLETE = 2;
function yearType(hyear) {
  const longC = HDate.longCheshvan(hyear);
  const shortK = HDate.shortKislev(hyear);
  if (longC && !shortK) {
    return COMPLETE;
  }
  if (!longC && shortK) {
    return INCOMPLETE;
  }
  return REGULAR;
}
var Sedra = class {
  year;
  il;
  rh;
  firstSaturday;
  theSedraArray;
  yearKey;
  /**
   * Calculates the Parashat HaShavua schedule for an entire Hebrew year.
   * @param hyear - Hebrew year (e.g. 5749)
   * @param il - Use Israel sedra schedule (false for Diaspora)
   */
  constructor(hyear, il) {
    hyear = +hyear;
    this.year = hyear;
    const rh0 = new HDate(1, months.TISHREI, hyear);
    const rh = this.rh = rh0.abs();
    const rhDay = rh0.getDay() + 1;
    this.firstSaturday = HDate.dayOnOrBefore(6, rh + 6);
    const leap = +HDate.isLeapYear(hyear);
    this.il = Boolean(il);
    const type = yearType(hyear);
    let key = `${leap}${rhDay}${type}`;
    if (types[key]) {
      this.theSedraArray = types[key];
      this.yearKey = key;
    } else {
      key = key + +this.il;
      this.theSedraArray = types[key];
      this.yearKey = key;
    }
    if (!this.theSedraArray) {
      throw new Error(`improper sedra year type ${key} calculated for ${hyear}`);
    }
  }
  /**
   * Returns the date a parsha is read this year, or `null` if it does not
   * occur in this year's schedule.
   *
   * A doubled parsha (e.g. `'Matot-Masei'`) will only return a date in years
   * where that pair is actually read together; in years where they are read
   * separately, this returns `null`. Use {@link findContaining} to find the
   * date a parsha is read regardless of whether it is doubled.
   *
   * Throws `RangeError` for an out-of-range numeric input or an invalid
   * doubled-parsha pair, and `TypeError` for a malformed array argument.
   * @example
   * import {Sedra} from '@hebcal/core';
   * const sedra = new Sedra(5784, false);
   * sedra.find('Noach')?.toString();        // '6 Cheshvan 5784'
   * sedra.find(1)?.toString();              // '6 Cheshvan 5784', by 0-based index
   * // Matot and Masei are doubled in 5784, so the pair has a date...
   * sedra.find('Matot-Masei')?.toString();  // '28 Tamuz 5784'
   * sedra.find(['Matot', 'Masei'])?.toString(); // '28 Tamuz 5784'
   * // ...but neither half is read on its own that year:
   * sedra.find('Matot');                    // null
   * @param parsha if a `string`, specified with Sephardic transliterations
   *  like `'Noach'` or `'Matot-Masei'`. If an array, must be a 1- or 2-element
   *  array such as `['Noach']` or `['Matot', 'Masei']`. If a `number`, should
   *  be a 0-based parsha index (`0` for Bereshit, `1` for Noach) or a negative
   *  number for a doubled parsha (e.g. `-21` for Vayakhel-Pekudei).
   *  Note that this index is 0-based, unlike {@link SedraResult.num} which
   *  is 1-based.
   */
  find(parsha) {
    if (typeof parsha === "number") {
      if (parsha >= parshiot.length || parsha < 0 && !isValidDouble(parsha)) {
        throw new RangeError(`Invalid parsha number: ${parsha}`);
      }
      return this.findInternal(parsha);
    }
    if (typeof parsha === "string") {
      const num = parsha2id.get(parsha);
      if (typeof num === "number") {
        return this.find(num);
      }
      if (parsha.includes("-")) {
        if (parsha === CHMPESACH || parsha === CHMSUKOT) {
          return this.findInternal(parsha);
        }
        return this.find(parsha.split("-"));
      }
      return this.findInternal(parsha);
    }
    if (Array.isArray(parsha)) {
      const plen = parsha.length;
      if (plen !== 1 && plen !== 2 || typeof parsha[0] !== "string") {
        throw new TypeError(`Invalid parsha argument: ${JSON.stringify(parsha)}`);
      }
      if (plen === 1) {
        return this.find(parsha[0]);
      }
      const p1 = parsha[0];
      const p2 = parsha[1];
      const num1 = parsha2id.get(p1);
      const num2 = parsha2id.get(p2);
      if (typeof num1 !== "number" || typeof num2 !== "number" || num2 !== num1 + 1 || !isValidDouble(-num1)) {
        throw new RangeError(`Unrecognized parsha name: ${p1}-${p2}`);
      }
      return this.find(-num1);
    }
    return null;
  }
  findInternal(parsha) {
    const idx = this.theSedraArray.indexOf(parsha);
    if (idx === -1) {
      return null;
    }
    return new HDate(this.firstSaturday + idx * 7);
  }
  /**
   * Returns the date a parsha is read this year, looking through both
   * single and doubled forms.
   *
   * For example, if `'Matot'` is read individually this year, this returns
   * its date; if it is read as part of `'Matot-Masei'` this year, this
   * returns the date of `'Matot-Masei'` (and similarly for `'Masei'`).
   * Conversely, asking for `'Matot-Masei'` in a year where they are split
   * will return the date of `'Matot'` alone.
   * @example
   * import {Sedra} from '@hebcal/core';
   * // Matot and Masei are doubled in 5784, so each half resolves to the
   * // date of the combined reading:
   * const sedra = new Sedra(5784, false);
   * sedra.findContaining('Matot')?.toString();        // '28 Tamuz 5784'
   * sedra.findContaining('Masei')?.toString();        // '28 Tamuz 5784'
   * @example
   * import {Sedra} from '@hebcal/core';
   * // They are read separately in 5795, so each half has its own date, and
   * // asking for the doubled name returns the date of the first half:
   * const sedra = new Sedra(5795, false);
   * sedra.findContaining('Matot')?.toString();        // '21 Tamuz 5795'
   * sedra.findContaining('Masei')?.toString();        // '28 Tamuz 5795'
   * sedra.findContaining('Matot-Masei')?.toString();  // '21 Tamuz 5795'
   */
  findContaining(parsha) {
    const hdate = this.find(parsha);
    if (hdate) {
      return hdate;
    }
    if (typeof parsha === "number") {
      const p1 = -parsha;
      if (isValidDouble(p1)) {
        return this.find(p1);
      } else {
        return this.find(p1 + 1);
      }
    } else {
      const num = parsha2id.get(parsha);
      if (num) {
        const p1 = -num;
        if (isValidDouble(p1)) {
          return this.find(p1);
        } else {
          return this.find(p1 + 1);
        }
      } else {
        const [p1] = parsha.split("-");
        return this.find(p1);
      }
    }
  }
  /**
   * Returns the underlying annual reading schedule as an array, where each
   * entry corresponds to one Saturday (starting from the first Shabbat on
   * or after Rosh Hashana). Entries are either:
   * - a non-negative `number`: a 0-based parsha index (e.g. `0` for
   *   *Bereshit*)
   * - a negative `number`: the negated first index of a doubled parsha
   *   (e.g. `-21` for *Vayakhel-Pekudei*)
   * - a `string`: a holiday name when a Yom Tov displaces the weekly reading
   *   (e.g. `'Pesach Shabbat Chol ha-Moed'`, `'Yom Kippur'`)
   *
   * Used by `@hebcal/triennial`.
   */
  getSedraArray() {
    return this.theSedraArray;
  }
  /**
   * Returns the R.D. (Rata Die / Fixed Date) absolute day number of the
   * first Saturday on or after Rosh Hashana of this year. This is the
   * anchor point for {@link getSedraArray} — index `0` of that array
   * corresponds to this date.
   */
  getFirstSaturday() {
    return this.firstSaturday;
  }
  /** Returns the Hebrew year this `Sedra` instance covers. */
  getYear() {
    return this.year;
  }
  /**
   * Returns details about the parsha read on the first Saturday on or after
   * `hd`. If `hd` is itself a Saturday, the reading for that date is
   * returned; otherwise the reading for the upcoming Saturday is returned.
   *
   * If the given date falls in the final days of the Hebrew year (after
   * the last reading of this year's schedule), this method transparently
   * delegates to the next year's `Sedra`.
   * @example
   * import {Sedra, HDate, months} from '@hebcal/core';
   * const sedra = new Sedra(5784, false);
   * // A Friday — returns the upcoming Shabbat's reading
   * const result = sedra.lookup(new HDate(12, months.CHESHVAN, 5784));
   * console.log(result.parsha); // ['Lech-Lecha']
   * console.log(result.chag);   // false
   * console.log(result.hdate.toString()); // '13 Cheshvan 5784' (Saturday)
   * @param hd Hebrew date or R.D. days
   */
  lookup(hd) {
    const abs = toAbsInYear(hd, this.rh, this.year);
    const saturday = HDate.dayOnOrBefore(6, abs + 6);
    const weekNum = (saturday - this.firstSaturday) / 7;
    const index = this.theSedraArray[weekNum];
    if (index === void 0) {
      const sedra = getSedra(this.year + 1, this.il);
      return sedra.lookup(saturday);
    }
    const hdate = new HDate(saturday);
    if (typeof index === "string") {
      return { parsha: [index], chag: true, hdate, il: this.il, num: 0 };
    }
    if (index >= 0) {
      return {
        parsha: [parshiot[index]],
        chag: false,
        num: index + 1,
        hdate,
        il: this.il
      };
    }
    const p1 = D(index);
    return {
      parsha: [parshiot[p1], parshiot[p1 + 1]],
      chag: false,
      num: [p1 + 1, p1 + 2],
      hdate,
      il: this.il
    };
  }
  /**
   * Returns details about the parsha read on Monday or Thursday for `hd`, or
   * `undefined` if `hd` is not a Monday or Thursday.
   *
   * Weekday Torah readings generally begin the upcoming Shabbat parsha. When
   * the upcoming Shabbat is a holiday, this method returns the next regular
   * parsha instead.
   *
   * For the Tishrei weekdays before Sukkot or Simchat Torah, the weekday
   * reading is *Vezot Haberakhah* even though it is not read on Shabbat.
   * @example
   * import {Sedra, HDate, months} from '@hebcal/core';
   * const sedra = new Sedra(5784, false);
   * // Monday 8 Cheshvan — begins the upcoming Shabbat's parsha
   * sedra.lookupWeekday(new HDate(8, months.CHESHVAN, 5784))?.parsha; // ['Lech-Lecha']
   * // Tuesday is neither Monday nor Thursday
   * sedra.lookupWeekday(new HDate(9, months.CHESHVAN, 5784)); // undefined
   * // Thursday 17 Nisan — the upcoming Shabbat is Chol ha-Moed Pesach,
   * // so the next regular parsha is returned instead
   * sedra.lookupWeekday(new HDate(17, months.NISAN, 5784))?.parsha; // ['Achrei Mot']
   * @param hd Hebrew date or R.D. days
   */
  lookupWeekday(hd) {
    const abs = toAbsInYear(hd, this.rh, this.year);
    const hdate = new HDate(abs);
    const day = hdate.getDay();
    if (day !== 1 && day !== 4) {
      return void 0;
    }
    const saturday = new HDate(HDate.dayOnOrBefore(6, abs + 6));
    const parsha = this.lookup(saturday);
    if (!parsha.chag) {
      return parsha;
    }
    return this.findWeekdayParsha(saturday);
  }
  findWeekdayParsha(saturday) {
    const hyear = saturday.getFullYear();
    const il = this.il;
    if (saturday.getMonth() === months.TISHREI) {
      const dd = saturday.getDate();
      const simchatTorah = il ? 22 : 23;
      if (dd > 2 && dd <= simchatTorah) {
        return {
          parsha: ["Vezot Haberakhah"],
          chag: false,
          num: 54,
          hdate: saturday,
          il
        };
      }
    }
    const sedra = hyear === this.year ? this : getSedra(hyear, il);
    const endOfYear = new HDate(1, months.TISHREI, hyear + 1).abs() - 1;
    const endAbs = endOfYear + 30;
    for (let sat2 = saturday.abs() + 7; sat2 <= endAbs; sat2 += 7) {
      const sedra2 = sat2 > endOfYear ? getSedra(hyear + 1, il) : sedra;
      const parsha2 = sedra2.lookup(sat2);
      if (!parsha2.chag) {
        return parsha2;
      }
    }
    throw new Error(`can't find weekday parsha for ${saturday}/${il}`);
  }
};
var parshiot = [
  "Bereshit",
  "Noach",
  "Lech-Lecha",
  "Vayera",
  "Chayei Sara",
  "Toldot",
  "Vayetzei",
  "Vayishlach",
  "Vayeshev",
  "Miketz",
  "Vayigash",
  "Vayechi",
  "Shemot",
  "Vaera",
  "Bo",
  "Beshalach",
  "Yitro",
  "Mishpatim",
  "Terumah",
  "Tetzaveh",
  "Ki Tisa",
  "Vayakhel",
  "Pekudei",
  "Vayikra",
  "Tzav",
  "Shmini",
  "Tazria",
  "Metzora",
  "Achrei Mot",
  "Kedoshim",
  "Emor",
  "Behar",
  "Bechukotai",
  "Bamidbar",
  "Nasso",
  "Beha'alotcha",
  "Sh'lach",
  "Korach",
  "Chukat",
  "Balak",
  "Pinchas",
  "Matot",
  "Masei",
  "Devarim",
  "Vaetchanan",
  "Eikev",
  "Re'eh",
  "Shoftim",
  "Ki Teitzei",
  "Ki Tavo",
  "Nitzavim",
  "Vayeilech",
  "Ha'azinu",
  "Vezot Haberakhah"
];
function toAbsInYear(hd, rh, year) {
  const abs = typeof hd === "number" ? hd : HDate.isHDate(hd) ? hd.abs() : NaN;
  if (Number.isNaN(abs)) {
    throw new TypeError(`Bad date argument: ${hd}`);
  }
  if (abs < rh) {
    throw new RangeError(`Date ${hd} before start of Hebrew year ${year}`);
  }
  return abs;
}
var parsha2id = new Map(parshiot.map((name, id) => [name, id]));
var doubles = /* @__PURE__ */ new Set([
  21,
  // Vayakhel-Pekudei
  26,
  // Tazria-Metzora
  28,
  // Achrei Mot-Kedoshim
  31,
  // Behar-Bechukotai
  38,
  // Chukat-Balak
  41,
  // Matot-Masei
  50
  // Nitzavim-Vayeilech
]);
function isValidDouble(id) {
  return doubles.has(-id);
}
function D(p) {
  return -p;
}
var RH = "Rosh Hashana";
var YK = "Yom Kippur";
var SUKKOT = "Sukkot";
var CHMSUKOT = "Sukkot Shabbat Chol ha-Moed";
var SHMINI = "Shmini Atzeret";
var PESACH = "Pesach";
var PESACH1 = "Pesach I";
var CHMPESACH = "Pesach Shabbat Chol ha-Moed";
var PESACH7 = "Pesach VII";
var PESACH8 = "Pesach VIII";
var SHAVUOT = "Shavuot";
function range(start, stop) {
  return Array.from({ length: stop - start + 1 }, (_, k) => k + start);
}
var yearStartVayeilech = [51, 52, CHMSUKOT];
var yearStartHaazinu = [52, YK, CHMSUKOT];
var yearStartRH = [RH, 52, SUKKOT, SHMINI];
var r020 = range(0, 20);
var r027 = range(0, 27);
var r3340 = range(33, 40);
var r4349 = range(43, 49);
var r4350 = range(43, 50);
var types = {
  /* Hebrew year that starts on Monday, is `incomplete' (Heshvan and
   * Kislev each have 29 days), and has Passover start on Tuesday. */
  // e.g. 5753
  "020": yearStartVayeilech.concat(r020, D(21), 23, 24, CHMPESACH, 25, D(26), D(28), 30, D(31), r3340, D(41), r4349, D(50)),
  /* Hebrew year that starts on Monday, is `complete' (Heshvan and
   * Kislev each have 30 days), and has Passover start on Thursday. */
  // e.g. 5756
  "0220": yearStartVayeilech.concat(r020, D(21), 23, 24, CHMPESACH, 25, D(26), D(28), 30, D(31), 33, SHAVUOT, range(34, 37), D(38), 40, D(41), r4349, D(50)),
  /* Hebrew year that starts on Thursday, is `regular' (Heshvan has 29
   * days and Kislev has 30 days), and has Passover start on Saturday. */
  // e.g. 5701
  "0510": yearStartHaazinu.concat(r020, D(21), 23, 24, PESACH1, PESACH8, 25, D(26), D(28), 30, D(31), r3340, D(41), r4350),
  /* Hebrew year that starts on Thursday, is `regular' (Heshvan has 29
   * days and Kislev has 30 days), and has Passover start on Saturday. */
  // e.g. 5745
  "0511": yearStartHaazinu.concat(r020, D(21), 23, 24, PESACH, 25, D(26), D(28), range(30, 40), D(41), r4350),
  /* Hebrew year that starts on Thursday, is `complete' (Heshvan and
   * Kislev each have 30 days), and has Passover start on Sunday. */
  // e.g. 5754
  "052": yearStartHaazinu.concat(range(0, 24), PESACH7, 25, D(26), D(28), 30, D(31), r3340, D(41), r4350),
  /* Hebrew year that starts on Saturday, is `incomplete' (Heshvan and Kislev
   * each have 29 days), and has Passover start on Sunday. */
  // e.g. 5761
  "070": yearStartRH.concat(r020, D(21), 23, 24, PESACH7, 25, D(26), D(28), 30, D(31), r3340, D(41), r4350),
  /* Hebrew year that starts on Saturday, is `complete' (Heshvan and
   * Kislev each have 30 days), and has Passover start on Tuesday. */
  // e.g. 5716
  "072": yearStartRH.concat(r020, D(21), 23, 24, CHMPESACH, 25, D(26), D(28), 30, D(31), r3340, D(41), r4349, D(50)),
  /* --  The leap year types (keviot) -- */
  /* Hebrew year that starts on Monday, is `incomplete' (Heshvan and
   * Kislev each have 29 days), and has Passover start on Thursday. */
  // e.g. 5746
  "1200": yearStartVayeilech.concat(r027, CHMPESACH, range(28, 33), SHAVUOT, range(34, 37), D(38), 40, D(41), r4349, D(50)),
  /* Hebrew year that starts on Monday, is `incomplete' (Heshvan and
   * Kislev each have 29 days), and has Passover start on Thursday. */
  // e.g. 5746
  "1201": yearStartVayeilech.concat(r027, CHMPESACH, range(28, 40), D(41), r4349, D(50)),
  /* Hebrew year that starts on Monday, is `complete' (Heshvan and
   * Kislev each have 30 days), and has Passover start on Saturday. */
  // e.g.5752
  "1220": yearStartVayeilech.concat(r027, PESACH1, PESACH8, range(28, 40), D(41), r4350),
  /* Hebrew year that starts on Monday, is `complete' (Heshvan and
   * Kislev each have 30 days), and has Passover start on Saturday. */
  // e.g.5752
  "1221": yearStartVayeilech.concat(r027, PESACH, range(28, 50)),
  /* Hebrew year that starts on Thursday, is `incomplete' (Heshvan and
   * Kislev both have 29 days), and has Passover start on Sunday. */
  // e.g. 5768
  "150": yearStartHaazinu.concat(range(0, 28), PESACH7, range(29, 50)),
  /* Hebrew year that starts on Thursday, is `complete' (Heshvan and
   * Kislev both have 30 days), and has Passover start on Tuesday. */
  // eg. 5771
  "152": yearStartHaazinu.concat(range(0, 28), CHMPESACH, range(29, 49), D(50)),
  /* Hebrew year that starts on Saturday, is `incomplete' (Heshvan and
   * Kislev each have 29 days), and has Passover start on Tuesday. */
  // e.g.5757
  "170": yearStartRH.concat(r027, CHMPESACH, range(28, 40), D(41), r4349, D(50)),
  /* Hebrew year that starts on Saturday, is `complete' (Heshvan and
   * Kislev each have 30 days), and has Passover start on Thursday. */
  "1720": yearStartRH.concat(r027, CHMPESACH, range(28, 33), SHAVUOT, range(34, 37), D(38), 40, D(41), r4349, D(50))
};
types["0221"] = types["020"];
types["0310"] = types["0220"];
types["0311"] = types["020"];
types["1310"] = types["1220"];
types["1311"] = types["1221"];
types["1721"] = types["170"];
var sedraCache = new QuickLRU({ maxSize: 120 });
function getSedra(hyear, il) {
  const cacheKey = `${hyear}-${il ? 1 : 0}`;
  let sedra = sedraCache.get(cacheKey);
  if (!sedra) {
    sedra = new Sedra(hyear, il);
    sedraCache.set(cacheKey, sedra);
  }
  return sedra;
}

// node_modules/@hebcal/core/dist/esm/TimedEvent.js
var { HAVDALAH, CANDLE_LIGHTING } = holidayDesc;
var TimedEvent = class extends Event {
  /** The exact moment of the event, rounded to the nearest minute */
  eventTime;
  /** Geographic location used to compute `eventTime` */
  location;
  /** 24-hour formatted time string in the location's timezone (e.g. `"19:42"`) */
  eventTimeStr;
  /** Locale-aware formatted time string (e.g. `"7:42pm"` in US locale) */
  fmtTime;
  /** Optional event this time is associated with (e.g. the Yom Tov being lit for) */
  linkedEvent;
  /**
   * Optional length of the event in minutes. Not computed or validated by
   * this class; it's a plain count of minutes for downstream renderers
   * (e.g. `@hebcal/icalendar`) to add to the event's start wall-clock time
   * when producing a non-zero-duration `DTEND`. Undefined means no
   * duration was specified.
   */
  duration;
  /**
   * Normally created by {@link calendar} rather than directly.
   * @param date Hebrew date the event occurs
   * @param desc Description (not translated)
   * @param mask optional holiday flags
   * @param eventTime the exact moment of the event
   * @param location geographic location used to format the time
   * @param linkedEvent optional event this time is associated with
   * @param options optional; `locale` and `hour12` affect {@link fmtTime}
   */
  constructor(date, desc, mask, eventTime, location, linkedEvent, options) {
    super(date, desc, mask);
    this.eventTime = Zmanim.roundTime(eventTime);
    this.location = location;
    const timeFormat = location.getTimeFormatter();
    this.eventTimeStr = Zmanim.formatTime(this.eventTime, timeFormat);
    const opts = { ...options, location };
    this.fmtTime = reformatTimeStr(this.eventTimeStr, "pm", opts);
    if (linkedEvent !== void 0) {
      this.linkedEvent = linkedEvent;
    }
  }
  /**
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  render(locale) {
    return `${Locale.gettext(this.getDesc(), locale)}: ${this.fmtTime}`;
  }
  /**
   * Returns translation of "Candle lighting" without the time.
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  renderBrief(locale) {
    return Locale.gettext(this.getDesc(), locale);
  }
  getCategories() {
    const desc = this.getDesc();
    switch (desc) {
      // LIGHT_CANDLES or LIGHT_CANDLES_TZEIS
      case CANDLE_LIGHTING:
        return ["candles"];
      // YOM_TOV_ENDS
      case HAVDALAH:
        return ["havdalah"];
      // flags.MINOR_FAST or flags.MAJOR_FAST
      case holidayDesc.FAST_BEGINS:
      case holidayDesc.FAST_ENDS:
        return ["zmanim", "fast"];
      case holidayDesc.SOF_ZMAN_ACHILAT_CHAMETZ:
        return ["zmanim", "achilasChametz"];
      case holidayDesc.BIUR_CHAMETZ:
        return ["zmanim", "biurChametz"];
    }
    return ["unknown"];
  }
};
var CandleLightingEvent = class extends TimedEvent {
  constructor(date, mask, eventTime, location, linkedEvent, options) {
    super(date, CANDLE_LIGHTING, mask, eventTime, location, linkedEvent, options);
  }
  getEmoji() {
    return "\u{1F56F}\uFE0F";
  }
};
var HavdalahEvent = class extends TimedEvent {
  havdalahMins;
  constructor(date, mask, eventTime, location, havdalahMins, linkedEvent, options) {
    super(date, HAVDALAH, mask, eventTime, location, linkedEvent, options);
    if (havdalahMins) {
      this.havdalahMins = havdalahMins;
    }
  }
  /**
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  render(locale) {
    return `${this.renderBrief(locale)}: ${this.fmtTime}`;
  }
  /**
   * Returns translation of "Havdalah" without the time.
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  renderBrief(locale) {
    let str = Locale.gettext(this.getDesc(), locale);
    if (this.havdalahMins) {
      const min = Locale.gettext("min", locale);
      str += ` (${this.havdalahMins} ${min})`;
    }
    return str;
  }
  getEmoji() {
    return "\u2728";
  }
};

// node_modules/@hebcal/core/dist/esm/YomKippurKatanEvent.js
var ykk = "Yom Kippur Katan";
var YomKippurKatanEvent = class extends HolidayEvent {
  nextMonthName;
  /**
   * Normally created by {@link calendar} (via
   * `options.yomKippurKatan`) rather than directly.
   * @param date Hebrew date event occurs
   * @param nextMonthName name of the upcoming month
   */
  constructor(date, nextMonthName) {
    super(date, `${ykk} ${nextMonthName}`, flags.MINOR_FAST | flags.YOM_KIPPUR_KATAN);
    this.nextMonthName = nextMonthName;
    this.memo = `Minor Day of Atonement on the day preceeding Rosh Chodesh ${nextMonthName}`;
  }
  basename() {
    return this.getDesc();
  }
  /**
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  render(locale) {
    const monthName0 = Locale.gettext(this.nextMonthName, locale);
    const monthName = smartApostrophe(monthName0);
    return `${Locale.gettext(ykk, locale)} ${monthName}`;
  }
  /**
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  renderBrief(locale) {
    return Locale.gettext(ykk, locale);
  }
  url() {
    return void 0;
  }
};

// node_modules/@hebcal/core/dist/esm/holidays.js
function getHolidaysOnDate(date, il) {
  const hd = HDate.isHDate(date) ? date : new HDate(date);
  const hdStr = hd.toString();
  const yearMap = getHolidaysForYear_(hd.getFullYear());
  const events = yearMap.get(hdStr);
  if (il === void 0 || events === void 0) {
    return events;
  }
  return events.filter((ev) => ev.observedIn(il));
}
var { CHAG: CHAG2, LIGHT_CANDLES_TZEIS: LIGHT_CANDLES_TZEIS2, CHANUKAH_CANDLES, BEHAB, MINOR_FAST, SPECIAL_SHABBAT, MAJOR_FAST: MAJOR_FAST2, MINOR_HOLIDAY: MINOR_HOLIDAY2, EREV: EREV2 } = flags;
var SUN = 0;
var TUE = 2;
var THU = 4;
var FRI = 5;
var SAT = 6;
var { NISAN: NISAN5, IYYAR: IYYAR4, TAMUZ: TAMUZ2, AV: AV3, TISHREI: TISHREI3, CHESHVAN: CHESHVAN4, KISLEV: KISLEV3, TEVET: TEVET3, ADAR_I: ADAR_I3, ADAR_II: ADAR_II4 } = months;
var yearCache = new QuickLRU({ maxSize: 120 });
function addToMap(map, ...events) {
  for (const ev of events) {
    const key = ev.date.toString();
    const arr = map.get(key);
    if (arr !== void 0) {
      arr.push(ev);
    } else {
      map.set(key, [ev]);
    }
  }
}
var TIME_OF_DAY_DAWN = 0;
var TIME_OF_DAY_MORNING = 1;
var TIME_OF_DAY_MEVARCHIM = 2;
var TIME_OF_DAY_DAY = 3;
var TIME_OF_DAY_MIDDAY = 4;
var TIME_OF_DAY_LEARNING = 5;
var TIME_OF_DAY_EVENING = 6;
var TIME_OF_DAY_NIGHT = 7;
function timeOfDay(ev) {
  if (ev instanceof TimedEvent) {
    return timedEventTimeOfDay(ev);
  }
  const desc = ev.getDesc();
  if (ev.hasAnyFlag("EREV", "CHANUKAH_CANDLES") || desc === holidayDesc.LEIL_SELICHOT) {
    return TIME_OF_DAY_EVENING;
  }
  if (ev.hasAnyFlag("PARSHA_HASHAVUA", "SPECIAL_SHABBAT", "MINOR_FAST") || desc === holidayDesc.BIRKAT_HACHAMAH) {
    return TIME_OF_DAY_MORNING;
  }
  if (ev.hasAnyFlag("SHABBAT_MEVARCHIM", "MOLAD")) {
    return TIME_OF_DAY_MEVARCHIM;
  }
  if (ev.hasAnyFlag("DAILY_LEARNING", "DAF_YOMI", "MISHNA_YOMI", "NACH_YOMI", "YERUSHALMI_YOMI")) {
    return TIME_OF_DAY_LEARNING;
  }
  return TIME_OF_DAY_DAY;
}
function timedEventTimeOfDay(ev) {
  const desc = ev.getDesc();
  if (desc === holidayDesc.SOF_ZMAN_ACHILAT_CHAMETZ || desc === holidayDesc.BIUR_CHAMETZ) {
    return TIME_OF_DAY_MIDDAY;
  }
  if (desc === holidayDesc.FAST_BEGINS || ev.hasFlag("KIDDUSH_LEVANA")) {
    const hour = Number.parseInt(ev.eventTimeStr, 10) % 24;
    return hour < 12 ? TIME_OF_DAY_DAWN : TIME_OF_DAY_NIGHT;
  }
  return TIME_OF_DAY_NIGHT;
}
function addStaticHolidays(map, year) {
  for (const h of staticHolidays) {
    const hd = new HDate(h.dd, h.mm, year);
    const attrs = {};
    if (h.emoji)
      attrs.emoji = h.emoji;
    if (h.chmDay)
      attrs.cholHaMoedDay = h.chmDay;
    addToMap(map, new HolidayEvent(hd, h.desc, h.flags, attrs));
  }
}
function addTishreiHolidays(map, year, RH2) {
  addToMap(map, new RoshHashanaEvent(RH2, year, CHAG2 | LIGHT_CANDLES_TZEIS2));
  const tzomGedaliahDay = RH2.getDay() === THU ? 4 : 3;
  addToMap(
    map,
    new HolidayEvent(new HDate(tzomGedaliahDay, TISHREI3, year), holidayDesc.TZOM_GEDALIAH, MINOR_FAST),
    // first SAT after RH
    new HolidayEvent(new HDate(HDate.dayOnOrBefore(SAT, 7 + RH2.abs())), holidayDesc.SHABBAT_SHUVA, SPECIAL_SHABBAT)
  );
}
function addChanukahAndTevet(map, year) {
  const rchTevet = HDate.shortKislev(year) ? new HDate(1, TEVET3, year) : new HDate(30, KISLEV3, year);
  addToMap(map, new HolidayEvent(rchTevet, holidayDesc.CHAG_HABANOT, MINOR_HOLIDAY2), new ChanukahEvent(new HDate(24, KISLEV3, year), holidayDesc.CHANUKAH_1_CANDLE, EREV2 | MINOR_HOLIDAY2 | CHANUKAH_CANDLES, void 0));
  for (let candles = 2; candles <= 8; candles++) {
    const hd = new HDate(23 + candles, KISLEV3, year);
    addToMap(map, new ChanukahEvent(hd, `Chanukah: ${candles} Candles`, MINOR_HOLIDAY2 | CHANUKAH_CANDLES, candles - 1));
  }
  addToMap(map, new ChanukahEvent(new HDate(32, KISLEV3, year), holidayDesc.CHANUKAH_8TH_DAY, MINOR_HOLIDAY2, 8), new AsaraBTevetEvent(new HDate(10, TEVET3, year), holidayDesc.ASARA_BTEVET, MINOR_FAST));
}
function addPesachSeasonHolidays(map, year, pesach) {
  const pesachAbs = pesach.abs();
  const haChodeshAbs = HDate.dayOnOrBefore(SAT, pesachAbs - 14);
  addToMap(map, new HolidayEvent(new HDate(HDate.dayOnOrBefore(SAT, pesachAbs - 43)), holidayDesc.SHABBAT_SHEKALIM, SPECIAL_SHABBAT), new HolidayEvent(new HDate(HDate.dayOnOrBefore(SAT, pesachAbs - 30)), holidayDesc.SHABBAT_ZACHOR, SPECIAL_SHABBAT), new HolidayEvent(new HDate(pesachAbs - (pesach.getDay() === TUE ? 33 : 31)), holidayDesc.TAANIT_ESTHER, MINOR_FAST), new HolidayEvent(new HDate(haChodeshAbs - 7), holidayDesc.SHABBAT_PARAH, SPECIAL_SHABBAT), new HolidayEvent(new HDate(haChodeshAbs), holidayDesc.SHABBAT_HACHODESH, SPECIAL_SHABBAT), new HolidayEvent(new HDate(HDate.dayOnOrBefore(SAT, pesachAbs - 1)), holidayDesc.SHABBAT_HAGADOL, SPECIAL_SHABBAT), new HolidayEvent(
    // if the fast falls on Shabbat, move to Thursday
    pesach.prev().getDay() === SAT ? pesach.onOrBefore(THU) : new HDate(14, NISAN5, year),
    holidayDesc.TAANIT_BECHOROT,
    MINOR_FAST
  ));
}
function addLeilSelichot(map, year) {
  addToMap(map, new HolidayEvent(new HDate(HDate.dayOnOrBefore(SAT, new HDate(1, TISHREI3, year + 1).abs() - 4)), holidayDesc.LEIL_SELICHOT, MINOR_HOLIDAY2, { emoji: "\u{1F54D}" }));
}
function addPurimVariants(map, year, pesach) {
  if (pesach.getDay() === SUN) {
    addToMap(map, new HolidayEvent(new HDate(16, ADAR_II4, year), holidayDesc.PURIM_MESHULASH, MINOR_HOLIDAY2));
  }
  if (HDate.isLeapYear(year)) {
    addToMap(map, new HolidayEvent(new HDate(14, ADAR_I3, year), holidayDesc.PURIM_KATAN, MINOR_HOLIDAY2, { emoji: "\u{1F3AD}\uFE0F" }), new HolidayEvent(new HDate(15, ADAR_I3, year), holidayDesc.SHUSHAN_PURIM_KATAN, MINOR_HOLIDAY2, { emoji: "\u{1F3AD}\uFE0F" }));
  }
}
function addSummerFasts(map, year) {
  let tamuz17 = new HDate(17, TAMUZ2, year);
  let tamuz17attrs;
  if (tamuz17.getDay() === SAT) {
    tamuz17 = new HDate(18, TAMUZ2, year);
    tamuz17attrs = { observed: true };
  }
  addToMap(map, new HolidayEvent(tamuz17, holidayDesc.TZOM_TAMMUZ, MINOR_FAST, tamuz17attrs));
  let av9dt = new HDate(9, AV3, year);
  let av9title = holidayDesc.TISHA_BAV;
  let av9attrs;
  if (av9dt.getDay() === SAT) {
    av9dt = av9dt.next();
    av9attrs = { observed: true };
    av9title += " (observed)";
  }
  const av9abs = av9dt.abs();
  addToMap(map, new HolidayEvent(new HDate(HDate.dayOnOrBefore(SAT, av9abs)), holidayDesc.SHABBAT_CHAZON, SPECIAL_SHABBAT), new HolidayEvent(av9dt.prev(), holidayDesc.EREV_TISHA_BAV, EREV2 | MAJOR_FAST2, av9attrs), new HolidayEvent(av9dt, av9title, MAJOR_FAST2, av9attrs), new HolidayEvent(new HDate(HDate.dayOnOrBefore(SAT, av9abs + 7)), holidayDesc.SHABBAT_NACHAMU, SPECIAL_SHABBAT));
}
function daysInPreviousMonth(month, year) {
  return month === NISAN5 ? HDate.daysInMonth(HDate.monthsInYear(year - 1), year - 1) : HDate.daysInMonth(month - 1, year);
}
function addRoshChodesh(map, year) {
  const monthsInYear2 = HDate.monthsInYear(year);
  for (let month = 1; month <= monthsInYear2; month++) {
    const monthName = HDate.getMonthName(month, year);
    if (daysInPreviousMonth(month, year) === 30) {
      addToMap(map, new RoshChodeshEvent(new HDate(1, month, year), monthName));
      addToMap(map, new RoshChodeshEvent(new HDate(30, month - 1, year), monthName));
    } else if (month !== TISHREI3) {
      addToMap(map, new RoshChodeshEvent(new HDate(1, month, year), monthName));
    }
  }
}
function addYomKippurKatan(map, year) {
  const monthsInYear2 = HDate.monthsInYear(year);
  for (let month = IYYAR4; month <= monthsInYear2; month++) {
    const nextMonth = month + 1;
    if (nextMonth === TISHREI3 || nextMonth === CHESHVAN4 || nextMonth === TEVET3) {
      continue;
    }
    let ykk2 = new HDate(29, month, year);
    const dow = ykk2.getDay();
    if (dow === FRI || dow === SAT) {
      ykk2 = ykk2.onOrBefore(THU);
    }
    const nextMonthName = HDate.getMonthName(nextMonth, year);
    addToMap(map, new YomKippurKatanEvent(ykk2, nextMonthName));
  }
}
function addBehab(map, year) {
  for (const month of [CHESHVAN4, IYYAR4]) {
    const roshChodesh = new HDate(1, month, year);
    let shabbos = new HDate(HDate.dayOnOrBefore(SAT, roshChodesh.abs() + 6));
    if (shabbos.abs() === roshChodesh.abs()) {
      shabbos = new HDate(shabbos.abs() + 7);
    }
    const fastDays = [2, 5, 9].map((offset) => new HDate(shabbos.abs() + offset));
    if (month === IYYAR4 && fastDays[2].getDate() === 14) {
      fastDays[2] = new HDate(17, IYYAR4, year);
    }
    for (const hd of fastDays) {
      addToMap(map, new HolidayEvent(hd, holidayDesc.TAANIT_BEHAB, MINOR_FAST | BEHAB));
    }
  }
}
function getHolidaysForYear_(year) {
  if (typeof year !== "number") {
    throw new TypeError(`bad Hebrew year: ${year}`);
  }
  if (year < 1 || year > 32658) {
    throw new RangeError(`Hebrew year ${year} out of range 1-32658`);
  }
  const cached = yearCache.get(year);
  if (cached) {
    return cached;
  }
  const RH2 = new HDate(1, TISHREI3, year);
  const pesach = new HDate(15, NISAN5, year);
  const map = /* @__PURE__ */ new Map();
  addStaticHolidays(map, year);
  addTishreiHolidays(map, year, RH2);
  addChanukahAndTevet(map, year);
  addPesachSeasonHolidays(map, year, pesach);
  addLeilSelichot(map, year);
  addPurimVariants(map, year, pesach);
  addToMap(map, ...modernHolidaysForYear(year));
  addSummerFasts(map, year);
  addRoshChodesh(map, year);
  addYomKippurKatan(map, year);
  addBehab(map, year);
  const sedra = getSedra(year, false);
  const beshalachHd = sedra.find(15);
  if (beshalachHd === null) {
    throw new Error(`Parashat Beshalach not found in year ${year}`);
  }
  addToMap(map, new HolidayEvent(beshalachHd, holidayDesc.SHABBAT_SHIRAH, SPECIAL_SHABBAT));
  const birkatHaChama = getBirkatHaChama(year);
  if (birkatHaChama !== void 0) {
    const hd = new HDate(birkatHaChama);
    addToMap(map, new HolidayEvent(hd, holidayDesc.BIRKAT_HACHAMAH, MINOR_HOLIDAY2, { emoji: "\u2600\uFE0F" }));
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => timeOfDay(a) - timeOfDay(b));
  }
  yearCache.set(year, map);
  return map;
}
var BIRKAT_HACHAMAH_CYCLE_DAYS = 10227;
var BIRKAT_HACHAMAH_EPOCH_OFFSET = 1373429;
var BIRKAT_HACHAMAH_REMAINDER = 172;
function getBirkatHaChama(year) {
  const leap = HDate.isLeapYear(year);
  const startMonth = leap ? ADAR_II4 : NISAN5;
  const startDay = leap ? 20 : 1;
  const baseRd = HDate.hebrew2abs(year, startMonth, startDay);
  for (let day = 0; day <= 40; day++) {
    const abs = baseRd + day;
    const elapsed = abs + BIRKAT_HACHAMAH_EPOCH_OFFSET;
    if (elapsed % BIRKAT_HACHAMAH_CYCLE_DAYS === BIRKAT_HACHAMAH_REMAINDER) {
      return abs;
    }
  }
  return void 0;
}
function getHolidaysForYearArray(year, il) {
  const yearMap = getHolidaysForYear_(year);
  const startAbs = HDate.hebrew2abs(year, TISHREI3, 1);
  const endAbs = HDate.hebrew2abs(year + 1, TISHREI3, 1) - 1;
  const events = [];
  for (let absDt = startAbs; absDt <= endAbs; absDt++) {
    const hd = new HDate(absDt);
    const holidays = yearMap.get(hd.toString());
    if (holidays) {
      events.push(...holidays.filter((ev) => ev.observedIn(il)));
    }
  }
  return events;
}

// node_modules/@hebcal/core/dist/esm/isAveilut.js
var { NISAN: NISAN6, SIVAN: SIVAN3, TAMUZ: TAMUZ3, AV: AV4 } = months;

// node_modules/@hebcal/core/dist/esm/candles.js
var { LIGHT_CANDLES: LIGHT_CANDLES2, LIGHT_CANDLES_TZEIS: LIGHT_CANDLES_TZEIS3 } = flags;
var { FAST_BEGINS, FAST_ENDS } = holidayDesc;
function makeCandleEvent(ev, hd, options, isFriday, isSaturday) {
  let havdalahTitle = false;
  let useHavdalahOffset = isSaturday;
  let mask = ev ? ev.mask : LIGHT_CANDLES2;
  if (ev !== void 0) {
    if (!isFriday) {
      if (ev.hasAnyFlag("LIGHT_CANDLES_TZEIS", "CHANUKAH_CANDLES")) {
        useHavdalahOffset = true;
      } else if (ev.hasFlag("YOM_TOV_ENDS")) {
        havdalahTitle = true;
        useHavdalahOffset = true;
      }
    }
  } else if (isSaturday) {
    havdalahTitle = true;
    mask = LIGHT_CANDLES_TZEIS3;
  }
  const offset = useHavdalahOffset ? Number(options.havdalahMins) : Number(options.candleLightingMins);
  const location = options.location;
  const useElevation = Boolean(options.useElevation);
  const zmanim = new Zmanim(location, hd, useElevation);
  const time = useHavdalahOffset && !offset ? zmanim.tzeit(options.havdalahDeg) : zmanim.sunsetOffset(offset, true);
  if (Number.isNaN(time.getTime())) {
    return void 0;
  }
  if (havdalahTitle) {
    return new HavdalahEvent(hd, mask, time, location, options.havdalahMins, ev, options);
  } else {
    mask |= LIGHT_CANDLES2;
    return new CandleLightingEvent(hd, mask, time, location, ev, options);
  }
}
var MINOR_FAST_END_MINUTES_IL = 15;
function nonzero(val) {
  return typeof val === "number" && isFinite(val) && val !== 0 ? val : void 0;
}
function makeFastStartTime(zmanim, options) {
  const fastStartMins = nonzero(options.fastStartMins);
  if (fastStartMins !== void 0) {
    return zmanim.sunriseOffset(-Math.abs(fastStartMins), true);
  }
  const fastStartDeg = nonzero(options.fastStartDeg);
  return zmanim.timeAtAngle(fastStartDeg === void 0 ? DEG_16_POINT_1 : Math.abs(fastStartDeg), true);
}
function makeFastEndTime(zmanim, isTishaBav, options) {
  if (isTishaBav) {
    const tishaBavEndMins = nonzero(options.tishaBavEndMins);
    if (tishaBavEndMins !== void 0) {
      return zmanim.sunsetOffset(Math.abs(tishaBavEndMins), true);
    }
    const tishaBavEndDeg = nonzero(options.tishaBavEndDeg);
    return zmanim.tzeit(tishaBavEndDeg === void 0 ? DEG_6_POINT_45 : Math.abs(tishaBavEndDeg));
  }
  const fastEndMins = options.fastEndMins;
  if (typeof fastEndMins === "number" && fastEndMins !== 0) {
    return zmanim.sunsetOffset(Math.abs(fastEndMins), true);
  }
  const fastEndDeg = options.fastEndDeg;
  if (typeof fastEndDeg === "number" && fastEndDeg !== 0) {
    return zmanim.tzeit(Math.abs(fastEndDeg));
  }
  if (options.il) {
    return zmanim.sunsetOffset(MINOR_FAST_END_MINUTES_IL, true);
  }
  return zmanim.tzeit(DEG_7_POINT_083);
}
var FastDayEvent = class extends HolidayEvent {
  /** original event */
  linkedEvent;
  /** this will be a "Fast begins" event */
  startEvent;
  /** this will be a "Fast ends" event */
  endEvent;
  constructor(linkedEvent, startEvent, endEvent) {
    super(linkedEvent.getDate(), linkedEvent.getDesc(), linkedEvent.mask);
    this.linkedEvent = linkedEvent;
    this.startEvent = startEvent;
    this.endEvent = endEvent;
  }
  render(locale) {
    return this.linkedEvent.render(locale);
  }
  renderBrief(locale) {
    return this.linkedEvent.renderBrief(locale);
  }
  urlDateSuffix() {
    return this.linkedEvent.urlDateSuffix();
  }
  url() {
    return this.linkedEvent.url();
  }
  getEmoji() {
    return this.linkedEvent.getEmoji();
  }
  getCategories() {
    return this.linkedEvent.getCategories();
  }
};
function makeFastStartEnd(ev, options) {
  const desc = ev.getDesc();
  if (desc === "Yom Kippur") {
    throw new RangeError("YK does not require this function");
  }
  const hd = ev.getDate();
  const dt = hd.greg();
  const location = options.location;
  const useElevation = Boolean(options.useElevation);
  const zmanim = new Zmanim(location, dt, useElevation);
  let startEvent;
  let endEvent;
  if (desc === "Erev Tish'a B'Av") {
    const sunset = zmanim.sunset();
    if (!Number.isNaN(sunset.getTime())) {
      startEvent = makeTimedEvent(ev, sunset, FAST_BEGINS, options);
    }
  } else if (desc.startsWith("Tish'a B'Av")) {
    const fastEnd = makeFastEndTime(zmanim, true, options);
    if (!Number.isNaN(fastEnd.getTime())) {
      endEvent = makeTimedEvent(ev, fastEnd, FAST_ENDS, options);
    }
  } else {
    const fastStart = makeFastStartTime(zmanim, options);
    if (!Number.isNaN(fastStart.getTime())) {
      startEvent = makeTimedEvent(ev, fastStart, FAST_BEGINS, options);
    }
    if (dt.getDay() !== 5 && !(hd.getDate() === 14 && hd.getMonth() === months.NISAN)) {
      const fastEnd = makeFastEndTime(zmanim, false, options);
      if (!Number.isNaN(fastEnd.getTime())) {
        endEvent = makeTimedEvent(ev, fastEnd, FAST_ENDS, options);
      }
    }
  }
  const ev2 = new FastDayEvent(ev, startEvent, endEvent);
  Object.assign(ev2, ev);
  return ev2;
}
function makeTimedEvent(ev, time, desc, options) {
  const location = options.location;
  const hd = ev.getDate();
  return new TimedEvent(hd, desc, ev.mask, time, location, ev, options);
}
var TimedChanukahEvent = class extends ChanukahEvent {
  /** Time at which candles are lit, rounded to the nearest minute */
  eventTime;
  /** {@link eventTime} formatted for the event's location, e.g. `'4:31pm'` */
  eventTimeStr;
  /** Location used to calculate {@link eventTime} */
  location;
  /**
   * Normally created by {@link calendar} rather than directly.
   * @param ev the untimed Chanukah event this is derived from
   * @param eventTime time at which candles are lit
   * @param location location used to format the time
   */
  constructor(ev, eventTime, location) {
    super(ev.getDate(), ev.getDesc(), ev.mask, ev.chanukahDay);
    this.eventTime = Zmanim.roundTime(eventTime);
    const timeFormat = location.getTimeFormatter();
    this.eventTimeStr = Zmanim.formatTime(this.eventTime, timeFormat);
    this.location = location;
    this.emoji = ev.emoji;
  }
};
function makeWeekdayChanukahCandleLighting(ev, options) {
  const hd = ev.getDate();
  const location = options.location;
  const useElevation = Boolean(options.useElevation);
  const zmanim = new Zmanim(location, hd.greg(), useElevation);
  const candleLightingTime = zmanim.beinHaShmashos();
  if (Number.isNaN(candleLightingTime.getTime())) {
    return null;
  }
  return new TimedChanukahEvent(ev, candleLightingTime, location);
}

// node_modules/@hebcal/core/dist/esm/KiddushLevanaEvent.js
var LATEST_KIDDUSH_LEVANA = "Latest Kiddush Levana";
var KiddushLevanaEvent = class extends TimedEvent {
  /** The molad of the month this event belongs to */
  molad;
  /**
   * Why the event time was moved earlier than the Maharil's time,
   * or `undefined` if it was not adjusted (apart from rounding down
   * to the minute).
   */
  adjustedTo;
  /**
   * Normally created by {@link calendar} rather than directly.
   * @param date Hebrew date the event occurs
   * @param eventTime latest time for Kiddush Levana, possibly adjusted
   * @param location geographic location used to format the time
   * @param molad the molad of the month
   * @param options optional; `locale` and `hour12` affect the formatted times
   * @param adjustedTo optional; why `eventTime` was moved earlier
   */
  constructor(date, eventTime, location, molad, options, adjustedTo) {
    super(date, LATEST_KIDDUSH_LEVANA, flags.KIDDUSH_LEVANA, eventTime, location, void 0, options);
    this.molad = molad;
    this.adjustedTo = adjustedTo;
  }
  getEmoji() {
    return "\u{1F314}";
  }
  getCategories() {
    return ["zmanim", "kiddushLevana"];
  }
};
function toDate(zdt) {
  return new Date(zdt.epochMilliseconds);
}
function toZdt(dt, tzid) {
  const millis = dt.getTime();
  if (Number.isNaN(millis)) {
    return null;
  }
  return Temporal.Instant.fromEpochMilliseconds(millis).toZonedDateTimeISO(tzid);
}
function floorMinute(zdt) {
  return zdt.round({ smallestUnit: "minute", roundingMode: "floor" });
}
function isShabbatOrChag(hd, il) {
  if (hd.getDay() === 6) {
    return true;
  }
  const events = getHolidaysOnDate(hd, il) ?? [];
  return events.some((ev) => ev.hasFlag("CHAG"));
}
function makeKiddushLevanaEvent(hyear, hmonth, options) {
  const location = options.location;
  const useElevation = Boolean(options.useElevation);
  const il = Boolean(options.il);
  const tzid = location.getTzid();
  for (let dd = 11; dd <= 16; dd++) {
    const hd = new HDate(dd, hmonth, hyear);
    const zmanim = new Zmanim(location, hd, useElevation);
    const unadjusted = zmanim.getSofZmanKidushLevanaBetweenMoldos();
    if (unadjusted === null) {
      continue;
    }
    const alos = toZdt(zmanim.alotHaShachar(), tzid);
    const tzeit = toZdt(zmanim.tzeit(), tzid);
    const zdt = zmanim.getSofZmanKidushLevanaBetweenMoldos(alos, tzeit);
    if (zdt === null) {
      return void 0;
    }
    const molad = new Molad(hyear, hmonth);
    const movedToAlot = zdt.epochMilliseconds !== unadjusted.epochMilliseconds;
    const nightOf = zdt.hour < 12 ? hd : hd.next();
    if (!isShabbatOrChag(nightOf, il)) {
      return new KiddushLevanaEvent(hd, toDate(floorMinute(zdt)), location, molad, options, movedToAlot ? "alot" : void 0);
    }
    let first = nightOf;
    while (isShabbatOrChag(first.prev(), il)) {
      first = first.prev();
    }
    const erev = first.prev();
    const erevZmanim = new Zmanim(location, erev, useElevation);
    const candleLighting = erevZmanim.sunsetOffset(Number(options.candleLightingMins), true);
    if (Number.isNaN(candleLighting.getTime())) {
      return void 0;
    }
    return new KiddushLevanaEvent(erev, candleLighting, location, molad, options, "candleLighting");
  }
  return void 0;
}

// node_modules/@hebcal/core/dist/esm/sefira.json.js
var sefira = {
  "ps67lines": [
    "\u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD \u05D9\u05B0\u05D7\u05B8\u05E0\u05B5\u05BC\u05E0\u05D5\u05BC \u05D5\u05B4\u05D9\u05D1\u05B8\u05E8\u05B0\u05DB\u05B5\u05E0\u05D5\u05BC \u05D9\u05B8\u05D0\u05B5\u05E8\u05BE\u05E4\u05B8\u05BC\u05E0\u05B8\u05D9\u05D5 \u05D0\u05B4\u05EA\u05B8\u05BC\u05E0\u05D5\u05BC \u05E1\u05B6\u05DC\u05B8\u05D4",
    "\u05DC\u05B8\u05D3\u05B7\u05E2\u05B7\u05EA \u05D1\u05B8\u05BC\u05D0\u05B8\u05E8\u05B6\u05E5 \u05D3\u05B7\u05BC\u05E8\u05B0\u05DB\u05B6\u05BC\u05DA\u05B8 \u05D1\u05B0\u05BC\u05DB\u05B8\u05DC\u05BE\u05D2\u05BC\u05D5\u05B9\u05D9\u05B4\u05DD \u05D9\u05B0\u05E9\u05C1\u05D5\u05BC\u05E2\u05B8\u05EA\u05B6\u05DA\u05B8",
    "\u05D9\u05D5\u05B9\u05D3\u05D5\u05BC\u05DA\u05B8 \u05E2\u05B7\u05DE\u05B4\u05BC\u05D9\u05DD \u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD \u05D9\u05D5\u05B9\u05D3\u05D5\u05BC\u05DA\u05B8 \u05E2\u05B7\u05DE\u05B4\u05BC\u05D9\u05DD \u05DB\u05BB\u05BC\u05DC\u05B8\u05BC\u05DD",
    "\u05D9\u05B4\u05E9\u05B0\u05C2\u05DE\u05B0\u05D7\u05D5\u05BC \u05D5\u05B4\u05D9\u05E8\u05B7\u05E0\u05B0\u05BC\u05E0\u05D5\u05BC \u05DC\u05B0\u05D0\u05BB\u05DE\u05B4\u05BC\u05D9\u05DD \u05DB\u05B4\u05BC\u05D9\u05BE\u05EA\u05B4\u05E9\u05B0\u05C1\u05E4\u05B9\u05BC\u05D8 \u05E2\u05B7\u05DE\u05B4\u05BC\u05D9\u05DD \u05DE\u05B4\u05D9\u05E9\u05C1\u05D5\u05B9\u05E8 \u05D5\u05BC\u05DC\u05B0\u05D0\u05BB\u05DE\u05B4\u05BC\u05D9\u05DD \u05D1\u05B8\u05BC\u05D0\u05B8\u05E8\u05B6\u05E5 \u05EA\u05B7\u05BC\u05E0\u05D7\u05B5\u05DD \u05E1\u05B6\u05DC\u05B8\u05D4",
    "\u05D9\u05D5\u05B9\u05D3\u05D5\u05BC\u05DA\u05B8 \u05E2\u05B7\u05DE\u05B4\u05BC\u05D9\u05DD \u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD \u05D9\u05D5\u05B9\u05D3\u05D5\u05BC\u05DA\u05B8 \u05E2\u05B7\u05DE\u05B4\u05BC\u05D9\u05DD \u05DB\u05BB\u05BC\u05DC\u05B8\u05BC\u05DD",
    "\u05D0\u05B6\u05E8\u05B6\u05E5 \u05E0\u05B8\u05EA\u05B0\u05E0\u05B8\u05D4 \u05D9\u05B0\u05D1\u05D5\u05BC\u05DC\u05B8\u05D4\u05BC \u05D9\u05B0\u05D1\u05B8\u05E8\u05B0\u05DB\u05B5\u05E0\u05D5\u05BC \u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD \u05D0\u05B1\u05DC\u05B9\u05D4\u05B5\u05D9\u05E0\u05D5\u05BC",
    "\u05D9\u05B0\u05D1\u05B8\u05E8\u05B0\u05DB\u05B5\u05E0\u05D5\u05BC \u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD \u05D5\u05B0\u05D9\u05B4\u05D9\u05E8\u05B0\u05D0\u05D5\u05BC \u05D0\u05D5\u05B9\u05EA\u05D5\u05B9 \u05DB\u05B8\u05BC\u05DC\u05BE\u05D0\u05B7\u05E4\u05B0\u05E1\u05B5\u05D9\u05BE\u05D0\u05B8\u05E8\u05B6\u05E5"
  ],
  "lamnatzeachLetters": "\u05D9\u05E9\u05DE\u05D7\u05D5\u05D5\u05D9\u05E8\u05E0\u05E0\u05D5\u05DC\u05D0\u05DE\u05D9\u05DD\u05DB\u05D9\u05EA\u05E9\u05E4\u05D5\u05D8\u05E2\u05DE\u05D9\u05DD\u05DE\u05D9\u05E9\u05D5\u05E8\u05D5\u05DC\u05D0\u05DE\u05D9\u05DD\u05D1\u05D0\u05E8\u05E5\u05EA\u05E0\u05D7\u05DD\u05E1\u05DC\u05D4",
  "anaBekoach": [
    "\u05D0\u05B8\u05E0\u05BC\u05B8\u05D0",
    "\u05D1\u05BC\u05B0\u05DB\u05B9\u05D7\u05B7",
    "\u05D2\u05BC\u05B0\u05D3\u05BB\u05DC\u05BC\u05B7\u05EA",
    "\u05D9\u05B0\u05DE\u05B4\u05D9\u05E0\u05B0\u05DA\u05B8",
    "\u05EA\u05BC\u05B7\u05EA\u05BC\u05B4\u05D9\u05E8",
    "\u05E6\u05B0\u05E8\u05D5\u05BC\u05E8\u05B8\u05D4",
    "\u05D0\u05D1\u05F4\u05D2 \u05D9\u05EA\u05F4\u05E5",
    "\u05E7\u05B7\u05D1\u05BC\u05B5\u05DC",
    "\u05E8\u05B4\u05E0\u05BC\u05B7\u05EA",
    "\u05E2\u05B7\u05DE\u05BC\u05B0\u05DA\u05B8",
    "\u05E9\u05C2\u05B7\u05D2\u05BC\u05B0\u05D1\u05B5\u05E0\u05D5\u05BC",
    "\u05D8\u05B7\u05D4\u05B2\u05E8\u05B5\u05E0\u05D5\u05BC",
    "\u05E0\u05D5\u05B9\u05E8\u05B8\u05D0",
    "\u05E7\u05E8\u05F4\u05E2 \u05E9\u05D8\u05F4\u05DF",
    "\u05E0\u05B8\u05D0",
    "\u05D2\u05B4\u05D1\u05BC\u05D5\u05B9\u05E8",
    "\u05D3\u05BC\u05D5\u05B9\u05E8\u05B0\u05E9\u05C1\u05B5\u05D9",
    "\u05D9\u05B4\u05D7\u05D5\u05BC\u05D3\u05B0\u05DA\u05B8",
    "\u05DB\u05BC\u05B0\u05D1\u05B8\u05D1\u05B7\u05EA",
    "\u05E9\u05C1\u05B8\u05DE\u05B0\u05E8\u05B5\u05DD",
    "\u05E0\u05D2\u05F4\u05D3 \u05D9\u05DB\u05F4\u05E9",
    "\u05D1\u05BC\u05B8\u05E8\u05B0\u05DB\u05B5\u05DD",
    "\u05D8\u05B7\u05D4\u05B2\u05E8\u05B5\u05DD",
    "\u05E8\u05B7\u05D7\u05B2\u05DE\u05B5\u05D9",
    "\u05E6\u05B4\u05D3\u05B0\u05E7\u05B8\u05EA\u05B0\u05DA\u05B8",
    "\u05EA\u05BC\u05B8\u05DE\u05B4\u05D9\u05D3",
    "\u05D2\u05BC\u05B8\u05DE\u05B0\u05DC\u05B5\u05DD",
    "\u05D1\u05D8\u05F4\u05E8 \u05E6\u05EA\u05F4\u05D2",
    "\u05D7\u05B2\u05E1\u05B4\u05D9\u05DF",
    "\u05E7\u05B8\u05D3\u05D5\u05B9\u05E9\u05C1",
    "\u05D1\u05BC\u05B0\u05E8\u05B9\u05D1",
    "\u05D8\u05D5\u05BC\u05D1\u05B0\u05DA\u05B8",
    "\u05E0\u05B7\u05D4\u05B5\u05DC",
    "\u05E2\u05B2\u05D3\u05B8\u05EA\u05B6\u05DA\u05B8",
    "\u05D7\u05E7\u05F4\u05D1 \u05EA\u05E0\u05F4\u05E2",
    "\u05D9\u05B8\u05D7\u05B4\u05D9\u05D3",
    "\u05D2\u05BC\u05B5\u05D0\u05B6\u05D4",
    "\u05DC\u05B0\u05E2\u05B7\u05DE\u05BC\u05B0\u05DA\u05B8",
    "\u05E4\u05BC\u05B0\u05E0\u05B5\u05D4",
    "\u05D6\u05D5\u05B9\u05DB\u05B0\u05E8\u05B5\u05D9",
    "\u05E7\u05B0\u05D3\u05BB\u05E9\u05C1\u05BC\u05B8\u05EA\u05B6\u05DA\u05B8",
    "\u05D9\u05D2\u05F4\u05DC \u05E4\u05D6\u05F4\u05E7",
    "\u05E9\u05C1\u05B7\u05D5\u05B0\u05E2\u05B8\u05EA\u05B5\u05E0\u05D5\u05BC",
    "\u05E7\u05B7\u05D1\u05BC\u05B5\u05DC",
    "\u05D5\u05BC\u05E9\u05C1\u05B0\u05DE\u05B7\u05E2",
    "\u05E6\u05B7\u05E2\u05B2\u05E7\u05B8\u05EA\u05B5\u05E0\u05D5\u05BC",
    "\u05D9\u05D5\u05B9\u05D3\u05B5\u05E2\u05B7",
    "\u05EA\u05BC\u05B7\u05E2\u05B2\u05DC\u05D5\u05BC\u05DE\u05D5\u05B9\u05EA",
    "\u05E9\u05E7\u05F4\u05D5 \u05E6\u05D9\u05F4\u05EA"
  ]
};

// node_modules/@hebcal/core/dist/esm/omer.js
var sefirot = {
  en: {
    infix: "within ",
    infix26: "within ",
    words: [
      "",
      "Lovingkindness",
      "Might",
      "Beauty",
      "Eternity",
      "Splendor",
      "Foundation",
      "Majesty"
    ],
    pfxWords: null
  },
  he: {
    infix: null,
    infix26: null,
    words: [
      "",
      "\u05D7\u05B6\u05BD\u05E1\u05B6\u05D3",
      "\u05D2\u05BC\u05B0\u05D1\u05D5\u05BC\u05E8\u05B8\u05D4",
      "\u05EA\u05B4\u05BC\u05E4\u05B0\u05D0\u05B6\u05BD\u05E8\u05B6\u05EA",
      "\u05E0\u05B6\u05BC\u05BD\u05E6\u05B7\u05D7",
      "\u05D4\u05D5\u05B9\u05D3",
      "\u05D9\u05B0\u05BC\u05E1\u05D5\u05B9\u05D3",
      "\u05DE\u05B7\u05DC\u05B0\u05DB\u05D5\u05BC\u05EA"
    ],
    pfxWords: [
      "",
      "\u05E9\u05B6\u05C1\u05D1\u05B0\u05BC\u05D7\u05B6\u05BD\u05E1\u05B6\u05D3",
      "\u05E9\u05B6\u05C1\u05D1\u05B4\u05BC\u05D2\u05B0\u05D1\u05D5\u05BC\u05E8\u05B8\u05D4",
      "\u05E9\u05B6\u05C1\u05D1\u05B0\u05BC\u05EA\u05B4\u05E4\u05B0\u05D0\u05B6\u05BD\u05E8\u05B6\u05EA",
      "\u05E9\u05B6\u05C1\u05D1\u05B0\u05BC\u05E0\u05B6\u05BD\u05E6\u05B7\u05D7",
      "\u05E9\u05B6\u05C1\u05D1\u05B0\u05BC\u05D4\u05D5\u05B9\u05D3",
      "\u05E9\u05B6\u05C1\u05D1\u05B4\u05BC\u05D9\u05B0\u05E1\u05D5\u05B9\u05D3",
      "\u05E9\u05B6\u05C1\u05D1\u05B0\u05BC\u05DE\u05B7\u05DC\u05B0\u05DB\u05D5\u05BC\u05EA"
    ]
  },
  translit: {
    infix: "sheb'",
    infix26: "shebi",
    words: [
      "",
      "Chesed",
      "Gevurah",
      "Tiferet",
      "Netzach",
      "Hod",
      "Yesod",
      "Malkhut"
    ],
    pfxWords: null
  }
};
function checkDay(omerDay) {
  if (omerDay < 1 || omerDay > 49) {
    throw new RangeError(`Invalid Omer day ${omerDay}`);
  }
}
function getWeeks(omerDay) {
  const weekNum = Math.floor((omerDay - 1) / 7) + 1;
  const daysWithinWeeks = omerDay % 7 || 7;
  return [weekNum, daysWithinWeeks];
}
function omerTodayIsEn(omerDay) {
  const [weekNumber, daysWithinWeeks] = getWeeks(omerDay);
  const totalDaysStr = omerDay === 1 ? "day" : "days";
  let str = `Today is ${omerDay} ${totalDaysStr}`;
  if (weekNumber > 1 || omerDay === 7) {
    const day7 = daysWithinWeeks === 7;
    const numWeeks = day7 ? weekNumber : weekNumber - 1;
    const weeksStr = numWeeks === 1 ? "week" : "weeks";
    str += `, which are ${numWeeks} ${weeksStr}`;
    if (!day7) {
      const daysStr = daysWithinWeeks === 1 ? "day" : "days";
      str += ` and ${daysWithinWeeks} ${daysStr}`;
    }
  }
  return `${str} of the Omer`;
}
var tens = ["", "\u05E2\u05B2\u05E9\u05B8\u05C2\u05E8\u05B8\u05D4", "\u05E2\u05B6\u05E9\u05B0\u05C2\u05E8\u05B4\u05D9\u05DD", "\u05E9\u05B0\u05C1\u05DC\u05D5\u05B9\u05E9\u05B4\u05C1\u05D9\u05DD", "\u05D0\u05B7\u05E8\u05B0\u05D1\u05B8\u05BC\u05E2\u05B4\u05D9\u05DD"];
var ones = [
  "",
  "\u05D0\u05B6\u05D7\u05B8\u05D3",
  "\u05E9\u05B0\u05C1\u05E0\u05B7\u05D9\u05B4\u05DD",
  "\u05E9\u05B0\u05C1\u05DC\u05D5\u05B9\u05E9\u05B8\u05C1\u05D4",
  "\u05D0\u05B7\u05E8\u05B0\u05D1\u05B8\u05BC\u05E2\u05B8\u05D4",
  "\u05D7\u05B2\u05DE\u05B4\u05E9\u05B8\u05BC\u05C1\u05D4",
  "\u05E9\u05B4\u05C1\u05E9\u05B8\u05BC\u05C1\u05D4",
  "\u05E9\u05B4\u05C1\u05D1\u05B0\u05E2\u05B8\u05D4",
  "\u05E9\u05B0\u05C1\u05DE\u05D5\u05B9\u05E0\u05B8\u05D4",
  "\u05EA\u05B4\u05BC\u05E9\u05B0\u05C1\u05E2\u05B8\u05D4"
];
var shnei = "\u05E9\u05B0\u05C1\u05E0\u05B5\u05D9";
var yamim = "\u05D9\u05B8\u05DE\u05B4\u05D9\u05DD";
var shneiYamim = `${shnei} ${yamim}`;
var shavuot = "\u05E9\u05B8\u05C1\u05D1\u05D5\u05BC\u05E2\u05D5\u05B9\u05EA";
var yom = "\u05D9\u05D5\u05B9\u05DD";
var yomEchad = `${yom} ${ones[1]}`;
var asar = "\u05E2\u05B8\u05E9\u05B8\u05C2\u05E8";
function omerTodayIsHe(omerDay) {
  const ten = Math.floor(omerDay / 10);
  const one = omerDay % 10;
  let str = "\u05D4\u05B7\u05D9\u05BC\u05D5\u05B9\u05DD ";
  if (omerDay === 11) {
    str += `\u05D0\u05B7\u05D7\u05B7\u05D3 ${asar}`;
  } else if (omerDay === 12) {
    str += `\u05E9\u05B0\u05C1\u05E0\u05B5\u05D9\u05DD ${asar}`;
  } else if (12 < omerDay && omerDay < 20) {
    str += `${ones[one]} ${asar}`;
  } else if (omerDay > 9) {
    str += ones[one];
    if (one) {
      str += " ";
      str += ten === 3 ? "\u05D5\u05BC" : "\u05D5\u05B0";
    }
  }
  if (omerDay > 2) {
    if (omerDay > 20 || omerDay === 10 || omerDay === 20) {
      str += tens[ten];
    }
    if (omerDay < 11) {
      str += `${ones[one]} ${yamim} `;
    } else {
      str += ` ${yom} `;
    }
  } else if (omerDay === 1) {
    str += `${yomEchad} `;
  } else {
    str += `${shneiYamim} `;
  }
  if (omerDay > 6) {
    str = str.trim();
    str += ", \u05E9\u05B6\u05C1\u05D4\u05B5\u05DD ";
    const weeks = Math.floor(omerDay / 7);
    const days = omerDay % 7;
    if (weeks > 2) {
      str += `${ones[weeks]} ${shavuot} `;
    } else if (weeks === 1) {
      str += `\u05E9\u05B8\u05C1\u05D1\u05BD\u05D5\u05BC\u05E2\u05B7 ${ones[1]} `;
    } else {
      str += `${shnei} ${shavuot} `;
    }
    if (days) {
      if (days === 2 || days === 3) {
        str += "\u05D5\u05BC";
      } else if (days === 5) {
        str += "\u05D5\u05B7";
      } else {
        str += "\u05D5\u05B0";
      }
      if (days > 2) {
        str += `${ones[days]} ${yamim} `;
      } else if (days === 1) {
        str += `${yomEchad} `;
      } else {
        str += `${shneiYamim} `;
      }
    }
  }
  str += "\u05DC\u05B8\u05E2\u05BD\u05D5\u05B9\u05DE\u05B6\u05E8";
  return str.normalize();
}
var anaBekoach = sefira.anaBekoach;
var ps67lines = sefira.ps67lines;
var lamnatzeach = ps67lines.flatMap((x) => x.split(/[ ־]/));
var lamnatzeachLetters = sefira.lamnatzeachLetters.split("");
var OmerEvent = class extends Event {
  weekNumber;
  daysWithinWeeks;
  omer;
  /**
   * Constructs an Omer event for a given day (1–49).
   *
   * Throws `RangeError` if `omerDay` is outside 1–49.
   * @param date Hebrew date this Omer day is counted on (the evening of)
   * @param omerDay day of the Omer, 1 through 49
   */
  constructor(date, omerDay) {
    super(date, `Omer ${omerDay}`, flags.OMER_COUNT);
    checkDay(omerDay);
    [this.weekNumber, this.daysWithinWeeks] = getWeeks(omerDay);
    this.omer = omerDay;
  }
  /**
   * Returns the Sefirah pairing associated with this Omer day —
   * one of the seven lower Sefirot within another, calculated as
   * `day-within-week` of `week-within-cycle`. For example, on day 8
   * (week 2, day 1):
   *  * חֶֽסֶד שֶׁבִּגְבוּרָה
   *  * Chesed shebiGevurah
   *  * Lovingkindness within Might
   * @example
   * import {OmerEvent, HDate, months} from '@hebcal/core';
   * const day8 = new OmerEvent(new HDate(23, months.NISAN, 5784), 8);
   * day8.sefira('en');        // 'Lovingkindness within Might'
   * day8.sefira('he');        // 'חֶֽסֶד שֶׁבִּגְבוּרָה'
   * day8.sefira('translit');  // 'Chesed shebiGevurah'
   * @param lang `en` (English), `he` (Hebrew with nikud), or `translit` (Hebrew in Sephardic transliteration)
   * @returns a string such as `Lovingkindness within Might` or `חֶֽסֶד שֶׁבִּגְבוּרָה`
   */
  sefira(lang = "en") {
    if (lang !== "he" && lang !== "translit") {
      lang = "en";
    }
    const [weekNum, daysWithinWeeks] = getWeeks(this.omer);
    const config = sefirot[lang];
    const { pfxWords, words } = config;
    const week = pfxWords ? pfxWords[weekNum] : words[weekNum];
    const dayWithinWeek = words[daysWithinWeeks];
    const infix = pfxWords ? "" : weekNum === 2 || weekNum === 6 ? config.infix26 : config.infix;
    return `${dayWithinWeek} ${infix}${week}`.normalize();
  }
  /**
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  render(locale) {
    const isHebrewLocale = Locale.isHebrewLocale(locale);
    const omer = this.omer;
    const nth = isHebrewLocale ? gematriya(omer) : Locale.ordinal(omer, locale);
    return `${nth} ${Locale.gettext("day of the Omer", locale)}`;
  }
  /**
   * Returns translation of "Omer day 22" without ordinal numbers.
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  renderBrief(locale) {
    return `${Locale.gettext("Omer", locale)} ${Locale.gettext("day", locale)} ${this.omer}`;
  }
  /**
   * Returns an emoji number symbol with a circle, for example `㊲`
   *  from the “Enclosed CJK Letters and Months” block of the Unicode standard
   * @returns a single Unicode character from `①` through `㊾`
   */
  getEmoji() {
    if (typeof this.emoji === "string")
      return this.emoji;
    let codePoint;
    const omerDay = this.omer;
    if (omerDay <= 20) {
      codePoint = 9312 + omerDay - 1;
    } else if (omerDay <= 35) {
      codePoint = 12881 + omerDay - 21;
    } else {
      codePoint = 12977 + omerDay - 36;
    }
    return String.fromCodePoint(codePoint);
  }
  /**
   * Number of *completed* weeks of the Omer. On day 7 this returns `1`; on
   * day 8 it also returns `1`, because the second week is still in progress.
   * Pair with {@link getDaysWithinWeeks} to render "N weeks and M days".
   */
  getWeeks() {
    const day7 = this.daysWithinWeeks === 7;
    return day7 ? this.weekNumber : this.weekNumber - 1;
  }
  /**
   * Day within the current week, from `1` through `7`.
   */
  getDaysWithinWeeks() {
    return this.daysWithinWeeks;
  }
  /**
   * Returns a sentence with that evening's omer count
   * @example
   * import {OmerEvent, HDate, months} from '@hebcal/core';
   * const ev = new OmerEvent(new HDate(25, months.NISAN, 5784), 10);
   * ev.getTodayIs('en');
   * // => 'Today is 10 days, which are 1 week and 3 days of the Omer'
   * ev.getTodayIs('he');
   * // => 'הַיּוֹם עֲשָׂרָה יָמִים, שֶׁהֵם שָׁבֽוּעַ אֶחָד וּשְׁלוֹשָׁה יָמִים לָעֽוֹמֶר'
   * @param locale locale name; Hebrew locales (`he`, `he-x-NoNikud`) produce
   *  the Hebrew formula, anything else produces English. Defaults to `en`
   *  when empty.
   */
  getTodayIs(locale) {
    locale = (locale || "en").toLowerCase();
    const isHebrew = Locale.isHebrewLocale(locale);
    const str = isHebrew ? omerTodayIsHe(this.omer) : omerTodayIsEn(this.omer);
    if (locale === "he-x-nonikud") {
      return Locale.hebrewStripNikkud(str);
    }
    return str;
  }
  /**
   * Returns a `https://www.hebcal.com/omer/...` URL, or `undefined` for Hebrew
   * years outside `[5513, 6260]` (roughly Gregorian 1752–2499).
   */
  url() {
    const year = this.getDate().getFullYear();
    if (year < 5513 || year > 6260) {
      return void 0;
    }
    return `https://www.hebcal.com/omer/${year}/${this.omer}`;
  }
  /**
   * Returns the word from Psalm 67 (לַמְנַצֵּחַ, "Lamnatzeach") corresponding
   * to this Omer day. Psalm 67 contains 49 words (excluding its opening verse),
   * one for each day of the Omer. The words are taken from verses 2–8, split on
   * spaces and maqef (־).
   * @returns a Hebrew word from Psalm 67
   * @example
   * const ev = new OmerEvent(new HDate(16, 'Nisan', 5785), 1);
   * ev.getLamnatzeachWord(); // 'אֱלֹהִים' (day 1, first word of verse 2)
   * @example
   * const ev = new OmerEvent(new HDate(3, 'Sivan', 5785), 49);
   * ev.getLamnatzeachWord(); // 'אָרֶץ' (day 49, last word of verse 8)
   */
  getLamnatzeachWord() {
    return lamnatzeach[this.omer - 1];
  }
  /**
   * Returns the letter from verse 5 of Psalm 67 corresponding to this Omer day.
   * Verse 5 (יִשְׂמְחוּ וִירַנְּנוּ לְאֻמִּים…) contains exactly 49 letters,
   * one for each day of the Omer, and is used as a Kabbalistic meditation during
   * the counting.
   * @returns a single Hebrew letter from verse 5 of Psalm 67
   * @example
   * const ev = new OmerEvent(new HDate(16, 'Nisan', 5785), 1);
   * ev.getLamnatzeachLetter(); // 'י' (day 1, first letter of verse 5)
   * @example
   * const ev = new OmerEvent(new HDate(3, 'Sivan', 5785), 49);
   * ev.getLamnatzeachLetter(); // 'ה' (day 49, last letter of verse 5)
   */
  getLamnatzeachLetter() {
    return lamnatzeachLetters[this.omer - 1];
  }
  /**
   * Returns the word from the Ana BeKoach prayer (אָנָּא בְּכֹחַ) corresponding
   * to this Omer day. Ana BeKoach is a 42-word Kabbalistic prayer whose initial
   * letters spell out the 42-letter name of God. The prayer has 7 verses of
   * 6 words each; the 7th entry of each group is the abbreviation of the acrostic
   * letters for that verse (e.g. `אב״ג ית״ץ` for verse 1). Together the 49
   * entries (7 verses × 7 entries) align with the 49 days of the Omer, connecting
   * each day to one of the lower seven Sefirot within a Sefirah.
   * @returns a Hebrew word or verse-abbreviation string from Ana BeKoach
   * @example
   * const ev = new OmerEvent(new HDate(16, 'Nisan', 5785), 1);
   * ev.getAnaBekoachWord(); // 'אָנָּא' (day 1, first word of verse 1)
   * @example
   * const ev = new OmerEvent(new HDate(22, 'Nisan', 5785), 7);
   * ev.getAnaBekoachWord(); // 'אב״ג ית״ץ' (day 7, acrostic abbreviation for verse 1)
   * @example
   * const ev = new OmerEvent(new HDate(3, 'Sivan', 5785), 49);
   * ev.getAnaBekoachWord(); // 'שק״ו צי״ת' (day 49, acrostic abbreviation for verse 7)
   */
  getAnaBekoachWord() {
    return anaBekoach[this.omer - 1].normalize();
  }
};

// node_modules/@hebcal/core/dist/esm/tachanun.js
function range2(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
var NONE = {
  shacharit: false,
  mincha: false,
  allCongs: false
};
function tachanun(hdate, il) {
  return tachanun0(hdate, il, true);
}
function tachanun0(hdate, il, checkNext) {
  const year = hdate.yy;
  const dates = tachanunYear(year, il);
  const abs = hdate.abs();
  if (dates.none.includes(abs)) {
    return NONE;
  }
  const dow = hdate.getDay();
  const ret = {
    shacharit: false,
    mincha: false,
    allCongs: false
  };
  if (!dates.some.includes(abs)) {
    ret.allCongs = true;
  }
  if (dow !== 6) {
    ret.shacharit = true;
  }
  const tomorrow = abs + 1;
  if (checkNext && !dates.yesPrev.includes(tomorrow)) {
    const tmp = tachanun0(new HDate(tomorrow), il, false);
    ret.mincha = tmp.shacharit;
  } else {
    ret.mincha = dow !== 5;
  }
  if (ret.allCongs && !ret.mincha && !ret.shacharit) {
    return NONE;
  }
  return ret;
}
function tachanunYear(year, il) {
  const leap = HDate.isLeapYear(year);
  const monthsInYear2 = HDate.monthsInYear(year);
  let av9dt = new HDate(9, months.AV, year);
  if (av9dt.getDay() === 6) {
    av9dt = av9dt.next();
  }
  let shushPurim = new HDate(15, months.ADAR_II, year);
  if (shushPurim.getDay() === 6) {
    shushPurim = shushPurim.next();
  }
  const none = [
    new HDate(2, months.TISHREI, year)
    // Rosh Hashana II
  ].concat(
    // Rosh Chodesh - 1st of every month. Also includes RH day 1 (1 Tishrei)
    range2(1, monthsInYear2).map((month) => new HDate(1, month, year)),
    // Rosh Chodesh - 30th of months that have one
    range2(1, monthsInYear2).filter((month) => HDate.daysInMonth(month, year) === 30).map((month) => new HDate(30, month, year)),
    // entire month of Nisan
    range2(1, HDate.daysInMonth(months.NISAN, year)).map((mday) => new HDate(mday, months.NISAN, year)),
    new HDate(18, months.IYYAR, year),
    // Lag BaOmer
    // Rosh Chodesh Sivan thru Isru Chag
    range2(1, 8 - (il ? 1 : 0)).map((mday) => new HDate(mday, months.SIVAN, year)),
    av9dt,
    // Tisha B'Av
    new HDate(15, months.AV, year),
    // Tu B'Av
    new HDate(29, months.ELUL, year),
    // Erev Rosh Hashanah
    // Erev Yom Kippur thru Isru Chag
    range2(9, 24 - (il ? 1 : 0)).map((mday) => new HDate(mday, months.TISHREI, year)),
    // Chanukah
    range2(25, 33).map((mday) => new HDate(mday, months.KISLEV, year)),
    new HDate(15, months.SHVAT, year),
    // Tu BiShvat
    new HDate(14, months.ADAR_II, year),
    // Purim
    shushPurim,
    leap ? new HDate(14, months.ADAR_I, year) : []
    // Purim Katan
  );
  const some = [
    new HDate(14, months.IYYAR, year)
    // Pesach Sheini
  ].concat(
    // Until 14 Sivan
    range2(1, 13).map((mday) => new HDate(mday, months.SIVAN, year)),
    // Until after Rosh Chodesh Cheshvan
    range2(20, 31).map((mday) => new HDate(mday, months.TISHREI, year)),
    // Yom HaAtzma'ut, which changes based on day of week
    year >= 5708 ? dateYomHaZikaron(year).next() : [],
    // Yom Yerushalayim
    year >= 5727 ? new HDate(28, months.IYYAR, year) : []
  );
  const yesPrev = [
    new HDate(29, months.ELUL, year - 1),
    // Erev Rosh Hashanah
    new HDate(9, months.TISHREI, year),
    // Erev Yom Kippur
    new HDate(14, months.IYYAR, year)
    // Pesach Sheini
  ];
  return {
    none: none.map((hd) => hd.abs()).sort((a, b) => a - b),
    some: some.map((hd) => hd.abs()).sort((a, b) => a - b),
    yesPrev: yesPrev.map((hd) => hd.abs()).sort((a, b) => a - b)
  };
}

// node_modules/@hebcal/core/dist/esm/hallel.js
var NONE2 = 0;
var HALF = 1;
var WHOLE = 2;
function hallel(hdate, il) {
  const mm = hdate.getMonth();
  const dd = hdate.getDate();
  switch (mm) {
    case months.TISHREI:
      if (dd >= 15 && dd <= (il ? 22 : 23)) {
        return WHOLE;
      }
      break;
    case months.KISLEV:
      if (dd >= 25) {
        return WHOLE;
      }
      break;
    case months.TEVET: {
      const lastDay = HDate.shortKislev(hdate.getFullYear()) ? 3 : 2;
      if (dd <= lastDay) {
        return WHOLE;
      }
      break;
    }
    case months.NISAN:
      if (dd === 15 || dd === 16 && !il) {
        return WHOLE;
      }
      if (dd >= 16 && dd <= (il ? 21 : 22)) {
        return HALF;
      }
      break;
    case months.IYYAR: {
      const year = hdate.getFullYear();
      if (dd === 28 && year >= 5727) {
        return WHOLE;
      }
      const yomHaZikaron = dateYomHaZikaron(year);
      if (yomHaZikaron !== null && dd === yomHaZikaron.getDate() + 1) {
        return WHOLE;
      }
      break;
    }
    case months.SIVAN:
      if (dd === 6 || dd === 7 && !il) {
        return WHOLE;
      }
      break;
  }
  if (dd === 30 || dd === 1 && mm !== months.TISHREI) {
    return HALF;
  }
  return NONE2;
}

// node_modules/@hebcal/core/dist/esm/parshaName.js
function renderParshaName(parsha, locale) {
  let name = Locale.gettext(parsha[0], locale);
  if (parsha.length === 2) {
    const hyphen = Locale.isHebrewLocale(locale) ? "\u05BE" : "-";
    name += hyphen + Locale.gettext(parsha[1], locale);
  }
  name = smartApostrophe(name);
  return `${Locale.gettext("Parashat", locale)} ${name}`.normalize();
}

// node_modules/@hebcal/core/dist/esm/ParshaEvent.js
var ParshaEvent = class extends Event {
  /** The parsha name(s) and date this event was constructed from */
  p;
  /**
   * Normally created by {@link calendar} (via `options.sedrot`)
   * rather than directly.
   * @param parsha result from {@link Sedra.lookup}
   * @throws {TypeError} if called with anything other than exactly one argument
   * @throws {TypeError} if `parsha` is not a valid {@link SedraResult} — it must
   *   have an `HDate` and one or two parsha names
   */
  constructor(parsha) {
    if (arguments.length !== 1) {
      throw new TypeError(`ParshaEvent constructor takes a single SedraResult argument; got ${arguments.length} arguments`);
    }
    if (typeof parsha !== "object" || parsha === null || !Array.isArray(parsha.parsha) || parsha.parsha.length === 0 || parsha.parsha.length > 2 || !HDate.isHDate(parsha.hdate)) {
      throw new TypeError(`Invalid SedraResult argument: ${JSON.stringify(parsha)}`);
    }
    const desc = `Parashat ${parsha.parsha.join("-")}`;
    super(parsha.hdate, desc, flags.PARSHA_HASHAVUA);
    this.p = parsha;
  }
  /**
   * @param [locale] Optional locale name (i.e: `'he'`, `'fr'`). Defaults to empty locale.
   */
  render(locale) {
    return renderParshaName(this.p.parsha, locale);
  }
  basename() {
    return this.p.parsha.join("-");
  }
  url() {
    const year = this.greg().getFullYear();
    if (year < 1752 || year > 2499) {
      return void 0;
    }
    const dt = this.urlDateSuffix();
    const url = `https://www.hebcal.com/sedrot/${urlFriendly(this.basename())}-${dt}`;
    return this.p.il ? `${url}?i=on` : url;
  }
  /**
   * The date portion of {@link url}, as `YYYYMMDD` — a parsha name recurs every
   * year, so the full date is needed to identify the reading.
   */
  urlDateSuffix() {
    const isoDate = isoDateString(this.greg());
    return isoDate.replaceAll("-", "");
  }
  /** convenience function for compatibility with previous implementation */
  get parsha() {
    return this.p.parsha;
  }
};

// node_modules/@hebcal/core/dist/esm/getStartAndEnd.js
var { TISHREI: TISHREI4 } = months;
function getAbs(d2) {
  if (typeof d2 === "number")
    return d2;
  if (isDate(d2))
    return greg2abs(d2);
  if (HDate.isHDate(d2))
    return d2.abs();
  throw new TypeError(`Invalid date type: ${d2}`);
}
function getYear(options) {
  if (options.year !== void 0) {
    return Number(options.year);
  }
  return options.isHebrewYear ? new HDate().getFullYear() : (/* @__PURE__ */ new Date()).getFullYear();
}
var MAX_NUM_YEARS = 2e3;
function getStartAndEnd(options) {
  const { start: start0, end: end0 } = options;
  if (start0 === void 0 !== (end0 === void 0)) {
    throw new TypeError("options.start requires options.end");
  }
  if (start0 !== void 0 && end0 !== void 0) {
    const start = getAbs(start0);
    const end = getAbs(end0);
    if (end - start > 365 * MAX_NUM_YEARS) {
      throw new RangeError(`Date range exceeds ${MAX_NUM_YEARS} years`);
    }
    return [start, end];
  }
  const isHebrewYear = Boolean(options.isHebrewYear);
  const theYear = getYear(options);
  if (Number.isNaN(theYear)) {
    throw new RangeError(`Invalid year ${options.year}`);
  }
  if (isHebrewYear && theYear < 1) {
    throw new RangeError(`Invalid Hebrew year ${theYear}`);
  }
  const theMonth = getMonth(options);
  const numYears = Number(options.numYears) || 1;
  if (numYears > MAX_NUM_YEARS) {
    throw new RangeError(`options.numYears exceeds ${MAX_NUM_YEARS}`);
  }
  if (isHebrewYear) {
    return startEndHebrew(theMonth, theYear, numYears);
  } else {
    return startEndGregorian(theMonth, theYear, numYears);
  }
}
function getMonth(options) {
  if (options.month) {
    if (options.isHebrewYear) {
      return HDate.monthNum(options.month);
    }
    if (typeof options.month === "number") {
      return options.month;
    }
  }
  return NaN;
}
function startEndGregorian(theMonth, theYear, numYears) {
  const gregMonth = theMonth ? theMonth - 1 : 0;
  const startGreg = new Date(theYear, gregMonth, 1);
  if (theYear < 100) {
    startGreg.setFullYear(theYear);
  }
  const startAbs = greg2abs(startGreg);
  let endAbs;
  if (theMonth) {
    endAbs = startAbs + daysInGregMonth(theMonth, theYear) - 1;
  } else {
    const endYear = theYear + numYears;
    const endGreg = new Date(endYear, 0, 1);
    if (endYear < 100) {
      endGreg.setFullYear(endYear);
    }
    endAbs = greg2abs(endGreg) - 1;
  }
  return [startAbs, endAbs];
}
function startEndHebrew(theMonth, theYear, numYears) {
  const startDate = new HDate(1, theMonth || TISHREI4, theYear);
  let startAbs = startDate.abs();
  const endAbs = theMonth ? startAbs + startDate.daysInMonth() : new HDate(1, TISHREI4, theYear + numYears).abs() - 1;
  if (!theMonth && theYear > 1) {
    startAbs--;
  }
  return [startAbs, endAbs];
}

// node_modules/@hebcal/core/dist/esm/DailyLearning.js
var cals = /* @__PURE__ */ new Map();
var DailyLearning = class {
  /**
   * Registers a new learning calendar.
   *
   * The provided function is called whenever a caller asks for an event
   * from this calendar; if no learning occurs that day (e.g. the date is
   * before the cycle's start) it should return `null`.
   * @example
   * DailyLearning.addCalendar(
   *   'myCalendar',
   *   (hd, il) => new Event(hd, 'Today\'s learning', 0),
   *   new HDate(1, 'Tishrei', 5780),
   * );
   * @param name case insensitive
   * @param calendar a function that returns an `Event` or `null`
   * @param startDate the first date for which this calendar is valid
   */
  static addCalendar(name, calendar2, startDate) {
    if (typeof calendar2 !== "function") {
      throw new TypeError(`Invalid calendar function: ${calendar2}`);
    }
    cals.set(name.toLowerCase(), { fn: calendar2, startDate });
  }
  /**
   * Returns the learning event for the given date from the named calendar,
   * or `null` if there is no learning that day (or the named calendar is
   * not registered).
   * @example
   * import '@hebcal/learning';
   * import {DailyLearning, HDate, months} from '@hebcal/core';
   * DailyLearning.lookup('dafYomi', new HDate(15, months.CHESHVAN, 5784), false);
   * @param name case insensitive
   * @param hd Hebrew Date
   * @param il true for Israel, false for Diaspora
   */
  static lookup(name, hd, il) {
    const cal = cals.get(name.toLowerCase());
    return cal ? cal.fn(hd, il) : null;
  }
  /**
   * Returns the first Hebrew date for which the named learning calendar
   * is valid (as registered by {@link addCalendar}), or `undefined` if the
   * calendar was not registered with a start date or is not registered at all.
   * @param name case insensitive
   */
  static getStartDate(name) {
    return cals.get(name.toLowerCase())?.startDate;
  }
  /**
   * Returns `true` if a learning calendar with the given name has been
   * registered via {@link addCalendar}.
   * @param name case insensitive
   */
  static has(name) {
    return cals.has(name.toLowerCase());
  }
  /**
   * Returns the (lower-cased) names of all currently-registered learning
   * calendars.
   */
  static getCalendars() {
    return [...cals.keys()];
  }
};

// node_modules/@hebcal/core/dist/esm/MevarchimChodeshEvent.js
var mevarchimChodeshStr = "Shabbat Mevarchim Chodesh";
var MevarchimChodeshEvent = class extends Event {
  monthName;
  /**
   * Constructs Mevarchim haChodesh event
   * @param date Hebrew date event occurs
   * @param monthName Hebrew month name (not translated)
   * @param memo text for the event memo. When falsy, a memo announcing the
   *   molad of the upcoming month is generated automatically
   * @param locale Optional locale name
   */
  constructor(date, monthName, memo, locale) {
    super(date, `${mevarchimChodeshStr} ${monthName}`, flags.SHABBAT_MEVARCHIM);
    this.monthName = Locale.gettext(monthName, locale);
    if (memo) {
      this.memo = memo;
    } else {
      const hyear = date.getFullYear();
      const hmonth = date.getMonth();
      const monNext = hmonth === HDate.monthsInYear(hyear) ? months.NISAN : hmonth + 1;
      const molad = new Molad(hyear, monNext);
      this.memo = molad.render("en", { hour12: false });
    }
  }
  basename() {
    return this.getDesc();
  }
  /**
   * Returns (translated) description of this event
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  render(locale) {
    const monthName0 = Locale.gettext(this.monthName, locale);
    const monthName = smartApostrophe(monthName0);
    return `${Locale.gettext(mevarchimChodeshStr, locale)} ${monthName}`;
  }
  /**
   * Returns (translated) description of this event
   * @param [locale] Optional locale name (defaults to empty locale)
   */
  renderBrief(locale) {
    const str = this.render(locale);
    const space = str.indexOf(" ");
    return str.substring(space + 1);
  }
};

// node_modules/@hebcal/core/dist/esm/calendar.js
function calendar(options = {}) {
  options = { ...options };
  const hasUserMask = typeof options.mask === "number";
  options.mask = getMaskFromOptions(options);
  checkCandleOptions(options);
  const location = options.location = options.location || defaultLocation;
  const il = options.il = options.il || location.getIsrael() || false;
  if (options.locale) {
    const locale = options.locale;
    if (locale && typeof locale !== "string") {
      throw new TypeError(`Invalid options.locale: ${locale}`);
    }
    if (!Locale.hasLocale(locale)) {
      throw new TypeError(`Locale '${locale}' not found; did you forget to import @hebcal/locales?`);
    }
  } else if (options.ashkenazi) {
    options.locale = "ashkenazi";
  } else {
    options.locale = "en";
  }
  const evts = [];
  let sedra;
  let holidaysYear;
  let beginOmer = -1;
  let endOmer = -1;
  let currentYear = -1;
  let kiddushLevanaMonth = -1;
  let kiddushLevanaEv;
  const startAndEnd = getStartAndEnd(options);
  warnUnrecognizedOptions(options);
  const startAbs = startAndEnd[0];
  const endAbs = startAndEnd[1];
  const startGreg = abs2greg(startAbs);
  const startGregYear = startGreg.getFullYear();
  if (startGregYear < 100 || startGregYear > 9999) {
    options.candlelighting = false;
    options.sedrot = false;
    options.dailyLearning = {};
  }
  for (let abs = startAbs; abs <= endAbs; abs++) {
    const hd = new HDate(abs);
    const hyear = hd.getFullYear();
    if (hyear !== currentYear) {
      currentYear = hyear;
      holidaysYear = getHolidaysForYear_(currentYear);
      if (options.sedrot) {
        sedra = getSedra(currentYear, il);
      }
      if (options.omer) {
        beginOmer = HDate.hebrew2abs(currentYear, NISAN7, 16);
        endOmer = HDate.hebrew2abs(currentYear, SIVAN4, 5);
      }
    }
    const prevEventsLength = evts.length;
    const dow = hd.getDay();
    const isFriday = dow === FRI2;
    const isSaturday = dow === SAT2;
    let candlesEv;
    const holidays0 = holidaysYear.get(hd.toString()) || [];
    const holidays = holidays0.filter((ev) => ev.observedIn(il));
    if (options.sedrot && isSaturday) {
      const parsha0 = sedra.lookup(abs);
      if (!parsha0.chag) {
        evts.push(new ParshaEvent(parsha0));
      }
    }
    if (isSaturday && (options.molad || options.shabbatMevarchim)) {
      evts.push(...makeMoladAndMevarchimChodesh(hd, options));
    }
    for (const ev of holidays) {
      candlesEv = appendHolidayAndRelated(candlesEv, evts, ev, options, isFriday, isSaturday, hasUserMask);
    }
    const mm = hd.getMonth();
    const dd = hd.getDate();
    if (isFriday && options.candlelighting && mm === months.NISAN && dd === 13) {
      const biurEv = makeBiurChametzEvent(hd, options);
      if (biurEv) {
        evts.push(biurEv);
      }
    }
    if (options.yizkor) {
      if (mm === months.TISHREI && (dd === 10 || dd === 22) || mm === NISAN7 && dd === (il ? 21 : 22) || mm === SIVAN4 && dd === (il ? 6 : 7)) {
        const linkedEvent = holidays[0];
        const ev = new Event(hd, holidayDesc.YIZKOR, flags.YIZKOR, {
          emoji: "\u{1F56F}\uFE0F",
          linkedEvent
        });
        evts.push(ev);
      }
    }
    const dailyLearning = options.dailyLearning;
    let numDailyLearning = 0;
    if (typeof dailyLearning === "object" && dailyLearning !== null) {
      const events = makeDailyLearning(hd, dailyLearning, il);
      numDailyLearning = events.length;
      if (numDailyLearning) {
        evts.push(...events);
      }
    }
    if (options.omer && abs >= beginOmer && abs <= endOmer) {
      const omer = abs - beginOmer + 1;
      const omerEv = makeOmerEvent(hd, omer, options);
      evts.push(omerEv);
    }
    if (!candlesEv && options.candlelighting && (isFriday || isSaturday)) {
      candlesEv = makeCandleEvent(void 0, hd, options, isFriday, isSaturday);
      if (isFriday && candlesEv && sedra) {
        const parsha = sedra.lookup(abs);
        if (!parsha.chag) {
          const pe = new ParshaEvent(parsha);
          candlesEv.memo = pe.render(options.locale);
        } else {
          candlesEv.memo = Locale.gettext(parsha.parsha[0], options.locale);
        }
      }
    }
    if (candlesEv instanceof HavdalahEvent && (options.havdalahMins === 0 || options.havdalahDeg === 0)) {
      candlesEv = void 0;
    }
    if (candlesEv) {
      evts.push(candlesEv);
    }
    if (options.kiddushLevanaMaharil && dd >= 9 && dd <= 17) {
      const monthKey = hyear * 100 + mm;
      if (monthKey !== kiddushLevanaMonth) {
        kiddushLevanaMonth = monthKey;
        kiddushLevanaEv = makeKiddushLevanaEvent(hyear, mm, options);
      }
      if (kiddushLevanaEv?.getDate().abs() === abs) {
        evts.push(kiddushLevanaEv);
      }
    }
    sortByTimeOfDay(evts, prevEventsLength);
    if (options.addHebrewDates || options.addHebrewDatesForEvents && prevEventsLength !== evts.length - numDailyLearning) {
      const e2 = new HebrewDateEvent(hd);
      if (prevEventsLength === evts.length) {
        evts.push(e2);
      } else {
        evts.splice(prevEventsLength, 0, e2);
      }
    }
  }
  return evts;
}
var FRI2 = 5;
var SAT2 = 6;
var { NISAN: NISAN7, SIVAN: SIVAN4, ELUL: ELUL3 } = months;
var { LIGHT_CANDLES: LIGHT_CANDLES3, YOM_TOV_ENDS: YOM_TOV_ENDS2, CHUL_ONLY: CHUL_ONLY2, IL_ONLY: IL_ONLY3, LIGHT_CANDLES_TZEIS: LIGHT_CANDLES_TZEIS4, CHANUKAH_CANDLES: CHANUKAH_CANDLES2, MINOR_FAST: MINOR_FAST2, SPECIAL_SHABBAT: SPECIAL_SHABBAT2, MODERN_HOLIDAY: MODERN_HOLIDAY2, MAJOR_FAST: MAJOR_FAST3, ROSH_CHODESH, PARSHA_HASHAVUA, DAF_YOMI, MISHNA_YOMI, NACH_YOMI, YERUSHALMI_YOMI, OMER_COUNT, SHABBAT_MEVARCHIM, MINOR_HOLIDAY: MINOR_HOLIDAY3, EREV: EREV3, CHOL_HAMOED: CHOL_HAMOED2, YOM_KIPPUR_KATAN, YIZKOR, BEHAB: BEHAB2, KIDDUSH_LEVANA } = flags;
var unrecognizedAlreadyWarned = /* @__PURE__ */ new Set();
var RECOGNIZED_OPTIONS = {
  location: 1,
  year: 1,
  isHebrewYear: 1,
  month: 1,
  numYears: 1,
  start: 1,
  end: 1,
  candlelighting: 1,
  candleLightingMins: 1,
  havdalahMins: 1,
  havdalahDeg: 1,
  fastEndDeg: 1,
  fastEndMins: 1,
  fastStartDeg: 1,
  fastStartMins: 1,
  tishaBavEndDeg: 1,
  tishaBavEndMins: 1,
  sedrot: 1,
  il: 1,
  noMinorFast: 1,
  noModern: 1,
  shabbatMevarchim: 1,
  noRoshChodesh: 1,
  noSpecialShabbat: 1,
  noHolidays: 1,
  omer: 1,
  molad: 1,
  ashkenazi: 1,
  locale: 1,
  addHebrewDates: 1,
  addHebrewDatesForEvents: 1,
  mask: 1,
  yomKippurKatan: 1,
  behab: 1,
  hour12: 1,
  dailyLearning: 1,
  useElevation: 1,
  yizkor: 1,
  kiddushLevanaMaharil: 1
};
var recognizedKeys = new Set(Object.keys(RECOGNIZED_OPTIONS));
function warnUnrecognizedOptions(options) {
  for (const k of Object.keys(options)) {
    if (!recognizedKeys.has(k) && !unrecognizedAlreadyWarned.has(k)) {
      console.warn(`Ignoring unrecognized HebrewCalendar option: ${k}`);
      unrecognizedAlreadyWarned.add(k);
    }
  }
  if (options.dailyLearning) {
    for (const [k, val] of Object.entries(options.dailyLearning)) {
      const name = dailyLearningName(k, val);
      if (!unrecognizedAlreadyWarned.has(k) && !DailyLearning.has(name)) {
        console.warn(`Ignoring unrecognized DailyLearning calendar: ${k}`);
        unrecognizedAlreadyWarned.add(k);
      }
    }
  }
}
var israelCityOffset = {
  Jerusalem: 40,
  Haifa: 30,
  "Zikhron Ya'aqov": 30,
  "Zikhron Ya'akov": 30,
  "Zikhron Yaakov": 30,
  "Zichron Ya'akov": 30,
  "Zichron Yaakov": 30
};
var geoIdCandleOffset = {
  "281184": 40,
  // Jerusalem
  "294801": 30,
  // Haifa
  "293067": 30
  // Zikhron Yaakov
};
function checkCandleOptions(options) {
  if (!options.candlelighting && !options.kiddushLevanaMaharil) {
    return;
  }
  const location = options.location;
  if (location === void 0 || !(location instanceof Location)) {
    const name = options.candlelighting ? "candlelighting" : "kiddushLevanaMaharil";
    throw new TypeError(`options.${name} requires valid options.location`);
  }
  const min0 = options.candleLightingMins;
  let min = typeof min0 === "number" && !Number.isNaN(min0) ? Math.trunc(min0) : 18;
  if (location.getIsrael() && Math.abs(min) === 18) {
    min = overrideIsraelCandleMins(location);
  }
  options.candleLightingMins = -1 * Math.abs(min);
  if (!options.candlelighting) {
    return;
  }
  assertMutuallyExclusive(options, "havdalahMins", "havdalahDeg");
  assertMutuallyExclusive(options, "fastEndDeg", "fastEndMins");
  assertMutuallyExclusive(options, "fastStartDeg", "fastStartMins");
  assertMutuallyExclusive(options, "tishaBavEndDeg", "tishaBavEndMins");
  if (typeof options.havdalahMins === "number") {
    options.havdalahMins = Math.trunc(Math.abs(options.havdalahMins));
  } else if (typeof options.havdalahDeg === "number") {
    options.havdalahDeg = Math.abs(options.havdalahDeg);
  } else {
    options.havdalahDeg = DEG_8_POINT_5;
  }
  if (typeof options.fastEndDeg === "number") {
    options.fastEndDeg = Math.abs(options.fastEndDeg);
  }
  if (typeof options.fastEndMins === "number") {
    options.fastEndMins = Math.trunc(Math.abs(options.fastEndMins));
  }
  if (typeof options.fastStartDeg === "number") {
    options.fastStartDeg = Math.abs(options.fastStartDeg);
  }
  if (typeof options.fastStartMins === "number") {
    options.fastStartMins = Math.trunc(Math.abs(options.fastStartMins));
  }
  if (typeof options.tishaBavEndDeg === "number") {
    options.tishaBavEndDeg = Math.abs(options.tishaBavEndDeg);
  }
  if (typeof options.tishaBavEndMins === "number") {
    options.tishaBavEndMins = Math.trunc(Math.abs(options.tishaBavEndMins));
  }
}
function assertMutuallyExclusive(options, a, b) {
  if (typeof options[a] === "number" && typeof options[b] === "number") {
    throw new TypeError(`options.${a} and options.${b} are mutually exclusive`);
  }
}
function overrideIsraelCandleMins(location) {
  const geoid = location.getGeoId();
  if (geoid) {
    const offset = geoIdCandleOffset[geoid];
    if (typeof offset === "number") {
      return offset;
    }
  }
  const shortName = location.getShortName();
  if (shortName) {
    const offset = israelCityOffset[shortName];
    if (typeof offset === "number") {
      return offset;
    }
  }
  return 20;
}
function getMaskFromOptions(options) {
  if (typeof options.mask === "number") {
    return setOptionsFromMask(options);
  }
  const il = options.il || options.location?.getIsrael() || false;
  let mask = 0;
  if (!options.noHolidays) {
    mask |= ROSH_CHODESH | YOM_TOV_ENDS2 | MINOR_FAST2 | SPECIAL_SHABBAT2 | MODERN_HOLIDAY2 | MAJOR_FAST3 | MINOR_HOLIDAY3 | EREV3 | CHOL_HAMOED2 | LIGHT_CANDLES3 | LIGHT_CANDLES_TZEIS4 | CHANUKAH_CANDLES2;
  }
  if (options.candlelighting) {
    mask |= LIGHT_CANDLES3 | LIGHT_CANDLES_TZEIS4 | YOM_TOV_ENDS2;
  }
  if (options.noRoshChodesh) {
    mask &= ~ROSH_CHODESH;
  }
  if (options.noModern) {
    mask &= ~MODERN_HOLIDAY2;
  }
  if (options.noMinorFast) {
    mask &= ~MINOR_FAST2;
  }
  if (options.noSpecialShabbat) {
    mask &= ~SPECIAL_SHABBAT2;
    mask &= ~SHABBAT_MEVARCHIM;
  }
  if (il) {
    mask |= IL_ONLY3;
  } else {
    mask |= CHUL_ONLY2;
  }
  if (options.sedrot) {
    mask |= PARSHA_HASHAVUA;
  }
  if (options.omer) {
    mask |= OMER_COUNT;
  }
  if (options.shabbatMevarchim) {
    mask |= SHABBAT_MEVARCHIM;
  }
  if (options.yomKippurKatan) {
    mask |= YOM_KIPPUR_KATAN;
  }
  if (options.behab) {
    mask |= BEHAB2;
  }
  if (options.yizkor) {
    mask |= YIZKOR;
  }
  if (options.kiddushLevanaMaharil) {
    mask |= KIDDUSH_LEVANA;
  }
  const dailyLearning = options.dailyLearning;
  if (typeof dailyLearning === "object" && dailyLearning !== null) {
    if (dailyLearning.dafYomi) {
      mask |= DAF_YOMI;
    }
    if (dailyLearning.mishnaYomi) {
      mask |= MISHNA_YOMI;
    }
    if (dailyLearning.nachYomi) {
      mask |= NACH_YOMI;
    }
    if (dailyLearning.yerushalmi) {
      mask |= YERUSHALMI_YOMI;
    }
  }
  return mask;
}
var defaultLocation = new Location(0, 0, false, "UTC");
function setOptionsFromMask(options) {
  const m = options.mask || 0;
  if (m & ROSH_CHODESH)
    delete options.noRoshChodesh;
  if (m & MODERN_HOLIDAY2)
    delete options.noModern;
  if (m & MINOR_FAST2)
    delete options.noMinorFast;
  if (m & SPECIAL_SHABBAT2)
    delete options.noSpecialShabbat;
  if (m & PARSHA_HASHAVUA)
    options.sedrot = true;
  if (m & (DAF_YOMI | MISHNA_YOMI | NACH_YOMI | YERUSHALMI_YOMI)) {
    options.dailyLearning = options.dailyLearning || {};
    if (m & DAF_YOMI) {
      options.dailyLearning.dafYomi = true;
    }
    if (m & MISHNA_YOMI) {
      options.dailyLearning.mishnaYomi = true;
    }
    if (m & NACH_YOMI) {
      options.dailyLearning.nachYomi = true;
    }
    if (m & YERUSHALMI_YOMI) {
      options.dailyLearning.yerushalmi = 1;
    }
  }
  if (m & OMER_COUNT)
    options.omer = true;
  if (m & SHABBAT_MEVARCHIM)
    options.shabbatMevarchim = true;
  if (m & YOM_KIPPUR_KATAN)
    options.yomKippurKatan = true;
  if (m & BEHAB2)
    options.behab = true;
  if (m & YIZKOR)
    options.yizkor = true;
  if (m & KIDDUSH_LEVANA)
    options.kiddushLevanaMaharil = true;
  return m;
}
function compareTimeOfDay(a, b) {
  const diff = timeOfDay(a) - timeOfDay(b);
  if (diff !== 0) {
    return diff;
  }
  if (a instanceof TimedEvent && b instanceof TimedEvent) {
    return a.eventTime.getTime() - b.eventTime.getTime();
  }
  return 0;
}
function sortByTimeOfDay(events, start) {
  if (events.length - start < 2) {
    return;
  }
  const today = events.splice(start);
  today.sort(compareTimeOfDay);
  events.push(...today);
}
function appendHolidayAndRelated(candlesEv, events, ev, options, isFriday, isSaturday, hasUserMask) {
  const il = options.il || false;
  if (!ev.observedIn(il)) {
    return candlesEv;
  }
  const eFlags = ev.mask;
  const isYomKippurKatan = ev.hasFlag("YOM_KIPPUR_KATAN");
  const isBehab = ev.hasFlag("BEHAB");
  if (!options.yomKippurKatan && isYomKippurKatan || !options.behab && isBehab || options.noModern && ev.hasFlag("MODERN_HOLIDAY")) {
    return candlesEv;
  }
  if (options.candlelighting && ev.getDesc() === holidayDesc.EREV_PESACH) {
    const evts = makeErevPesachChametzEvents(ev, options);
    if (evts.length) {
      events.push(...evts);
    }
  }
  const isMajorFast = ev.hasFlag("MAJOR_FAST");
  const isMinorFast = ev.hasFlag("MINOR_FAST");
  const isChanukah = ev.hasFlag("CHANUKAH_CANDLES");
  const hasCandles = ev.hasAnyFlag("LIGHT_CANDLES", "LIGHT_CANDLES_TZEIS", "CHANUKAH_CANDLES", "YOM_TOV_ENDS");
  let fastEv;
  if (options.candlelighting && (isMajorFast || isMinorFast) && ev.getDesc() !== holidayDesc.YOM_KIPPUR) {
    ev = fastEv = makeFastStartEnd(ev, options);
    if (fastEv.startEvent && (isMajorFast || isMinorFast && !options.noMinorFast)) {
      events.push(fastEv.startEvent);
    }
  }
  if (eFlags & Number(options.mask) || !eFlags && !hasUserMask) {
    if (options.candlelighting && hasCandles) {
      const hd = ev.getDate();
      candlesEv = makeCandleEvent(ev, hd, options, isFriday, isSaturday);
      if (isChanukah && candlesEv && !options.noHolidays) {
        const chanukahEv = makeWeekdayChanukahCandleLighting(ev, options);
        if (chanukahEv) {
          if (isFriday || isSaturday) {
            chanukahEv.eventTime = candlesEv.eventTime;
            chanukahEv.eventTimeStr = candlesEv.eventTimeStr;
          }
          ev = chanukahEv;
        }
        candlesEv = void 0;
      }
    }
    if (!options.noHolidays || options.yomKippurKatan && isYomKippurKatan || options.behab && isBehab) {
      events.push(ev);
    }
  }
  if ((isMajorFast || isMinorFast && !options.noMinorFast) && fastEv?.endEvent) {
    events.push(fastEv.endEvent);
  }
  return candlesEv;
}
function makeMoladAndMevarchimChodesh(hd, options) {
  const evts = [];
  const hmonth = hd.getMonth();
  const hdate = hd.getDate();
  if (hmonth !== ELUL3 && hdate >= 23 && hdate <= 29) {
    const hyear = hd.getFullYear();
    const monNext = hmonth === HDate.monthsInYear(hyear) ? NISAN7 : hmonth + 1;
    if (options.molad) {
      evts.push(new MoladEvent(hd, hyear, monNext, options));
    }
    if (options.shabbatMevarchim) {
      const nextMonthName = HDate.getMonthName(monNext, hyear);
      const molad = new Molad(hyear, monNext);
      const memo = molad.render(options.locale, options);
      evts.push(new MevarchimChodeshEvent(hd, nextMonthName, memo, options.locale));
    }
  }
  return evts;
}
function dailyLearningName(key, val) {
  if (key === "yerushalmi") {
    return val === 2 ? "yerushalmi-schottenstein" : "yerushalmi-vilna";
  }
  return key;
}
function makeDailyLearning(hd, dailyLearning, il) {
  const evts = [];
  for (const [key, val] of Object.entries(dailyLearning)) {
    if (val) {
      const name = dailyLearningName(key, val);
      const learningEv = DailyLearning.lookup(name, hd, il);
      if (learningEv) {
        evts.push(learningEv);
      }
    }
  }
  return evts;
}
function makeOmerEvent(hd, omerDay, options) {
  const omerEv = new OmerEvent(hd, omerDay);
  if (options.candlelighting) {
    const location = options.location;
    const zmanim = new Zmanim(location, hd.prev(), false);
    const tzeit = zmanim.tzeit(DEG_7_POINT_083);
    if (!Number.isNaN(tzeit.getTime())) {
      omerEv.alarm = tzeit;
    }
  }
  return omerEv;
}
function makeErevPesachChametzEvents(erevPesachEv, options) {
  const evts = [];
  const location = options.location;
  const useElevation = Boolean(options.useElevation);
  const hd = erevPesachEv.getDate();
  const zmanim = new Zmanim(location, hd, useElevation);
  const zmanAchilas = zmanim.sofZmanTfilla();
  if (Number.isNaN(zmanAchilas.getTime())) {
    return [];
  }
  const zmanAchilasEv = new TimedEvent(hd, holidayDesc.SOF_ZMAN_ACHILAT_CHAMETZ, 0, zmanAchilas, location, void 0, options);
  zmanAchilasEv.emoji = "\u{1F35E}";
  evts.push(zmanAchilasEv);
  if (hd.getDay() !== SAT2) {
    const biurEv = makeBiurChametzEvent(hd, options);
    if (biurEv) {
      evts.push(biurEv);
    }
  }
  return evts;
}
function makeBiurChametzEvent(hd, options) {
  const location = options.location;
  const useElevation = Boolean(options.useElevation);
  const zmanim = new Zmanim(location, hd, useElevation);
  const time = zmanim.sofZmanBiurChametzGRA();
  if (Number.isNaN(time.getTime())) {
    return void 0;
  }
  const biurChametzEv = new TimedEvent(hd, holidayDesc.BIUR_CHAMETZ, 0, time, location, void 0, options);
  biurChametzEv.emoji = "\u{1F525}";
  return biurChametzEv;
}

// node_modules/@hebcal/core/dist/esm/hebcal.js
var HebrewCalendar = class {
  constructor() {
  }
  /**
   * Calculates holidays and other Hebrew calendar events based on {@link CalOptions}.
   *
   * Each holiday is represented by an {@link Event} object which includes a date,
   * a description, flags and optional attributes.
   * If given no options, returns holidays for the Diaspora for the current Gregorian year.
   *
   * This is a convenience wrapper around the standalone {@link calendar} function.
   * See {@link calendar} for the complete list of supported options, the
   * candle-lighting and Havdalah defaults, and notes on locales.
   *
   * @example
   * import {HebrewCalendar, Location} from '@hebcal/core';
   * const options: CalOptions = {
   *   year: 1981,
   *   isHebrewYear: false,
   *   candlelighting: true,
   *   location: Location.lookup('San Francisco'),
   *   sedrot: true,
   *   omer: true,
   * };
   * const events = HebrewCalendar.calendar(options);
   * for (const ev of events) {
   *   const hd = ev.getDate();
   *   const date = hd.greg();
   *   console.log(date.toLocaleDateString(), ev.render('en'), hd.toString());
   * }
   */
  static calendar(options = {}) {
    return calendar(options);
  }
  /**
   * Calculates a birthday or anniversary (non-yahrzeit).
   * Returns `undefined` when `hyear` precedes the original year of `gdate`.
   *
   * When `hyear` is the original year, the original date is returned unchanged —
   * a "0th birthday" is a meaningful thing to ask for. This differs from
   * {@link getYahrzeit}, which returns `undefined` for the original year,
   * because a yahrzeit only has meaning from the first anniversary onward.
   *
   * Hebcal uses the algorithm defined in "Calendrical Calculations"
   * by Edward M. Reingold and Nachum Dershowitz.
   *
   * The birthday of someone born in Adar of an ordinary year or Adar II of
   * a leap year is also always in the last month of the year, be that Adar
   * or Adar II. The birthday in an ordinary year of someone born during the
   * first 29 days of Adar I in a leap year is on the corresponding day of Adar;
   * in a leap year, the birthday occurs in Adar I, as expected.
   *
   * Someone born on the thirtieth day of Marcheshvan, Kislev, or Adar I
   * has his birthday postponed until the first of the following month in
   * years where that day does not occur. [Calendrical Calculations p. 111]
   * @example
   * import {HebrewCalendar} from '@hebcal/core';
   * const dt = new Date(2014, 2, 2); // '2014-03-02' == '30 Adar I 5774'
   * const hd = HebrewCalendar.getBirthdayOrAnniversary(5780, dt); // '1 Nisan 5780'
   * console.log(hd.greg().toLocaleDateString('en-US')); // '3/26/2020'
   * @param hyear Hebrew year
   * @param gdate Gregorian or Hebrew date of event
   * @returns anniversary occurring in `hyear`
   */
  static getBirthdayOrAnniversary(hyear, gdate) {
    return birthdayOrAnniversary(hyear, gdate);
  }
  /**
   * Calculates yahrzeit.
   * `hyear` must be after original `gdate` of death.
   * Returns `undefined` when requested year preceeds or is same as original year.
   *
   * Hebcal uses the algorithm defined in "Calendrical Calculations"
   * by Edward M. Reingold and Nachum Dershowitz.
   *
   * The customary anniversary date of a death is more complicated and depends
   * also on the character of the year in which the first anniversary occurs.
   * There are several cases:
   *
   * * If the date of death is Marcheshvan 30, the anniversary in general depends
   *   on the first anniversary; if that first anniversary was not Marcheshvan 30,
   *   use the day before Kislev 1.
   * * If the date of death is Kislev 30, the anniversary in general again depends
   *   on the first anniversary — if that was not Kislev 30, use the day before
   *   Tevet 1.
   * * If the date of death is Adar II, the anniversary is the same day in the
   *   last month of the Hebrew year (Adar or Adar II).
   * * If the date of death is Adar I 30, the anniversary in a Hebrew year that
   *   is not a leap year (in which Adar only has 29 days) is the last day in
   *   Shevat.
   * * In all other cases, use the normal (that is, same month number) anniversary
   *   of the date of death. [Calendrical Calculations p. 113]
   * @example
   * import {HebrewCalendar} from '@hebcal/core';
   * const dt = new Date(2014, 2, 2); // '2014-03-02' == '30 Adar I 5774'
   * const hd = HebrewCalendar.getYahrzeit(5780, dt); // '30 Sh\'vat 5780'
   * console.log(hd.greg().toLocaleDateString('en-US')); // '2/25/2020'
   * @param hyear Hebrew year
   * @param gdate Gregorian or Hebrew date of death
   * @returns anniversary occurring in hyear
   */
  static getYahrzeit(hyear, gdate) {
    return yahrzeit(hyear, gdate);
  }
  /**
   * Lower-level holidays interface, which returns a `Map` of `Event`s indexed by
   * `HDate.toString()`. These events are not filtered by Israel vs. Diaspora
   * holiday scheme; use {@link Event.observedIn} to do that.
   *
   * Includes Rosh Chodesh, fasts, Yom Kippur Katan, Special Shabbatot, etc.,
   * but does not generate candle-lighting times, Torah readings, or Omer days.
   * The result is cached in an internal LRU.
   * @example
   * import {HebrewCalendar} from '@hebcal/core';
   * const map = HebrewCalendar.getHolidaysForYear(5784);
   * for (const [hdStr, events] of map.entries()) {
   *   for (const ev of events) {
   *     console.log(hdStr, ev.getDesc());
   *   }
   * }
   * @param year Hebrew year
   */
  static getHolidaysForYear(year) {
    return getHolidaysForYear_(year);
  }
  /**
   * Returns a sorted array of holidays observed during the given Hebrew year.
   *
   * Events are pre-filtered by Israel vs. Diaspora schedule, so callers do not
   * need to inspect `flags.IL_ONLY` / `flags.CHUL_ONLY` themselves.
   * Includes Rosh Chodesh, fasts, modern holidays, special Shabbatot, etc.,
   * but does not generate candle-lighting times, Torah readings, or Omer days.
   * @example
   * import {HebrewCalendar} from '@hebcal/core';
   * const events = HebrewCalendar.getHolidaysForYearArray(5784, false);
   * console.log(events[0].getDesc()); // 'Rosh Hashana 5784'
   * @param year Hebrew year
   * @param il use the Israeli schedule for holidays
   */
  static getHolidaysForYearArray(year, il) {
    return getHolidaysForYearArray(year, il);
  }
  /**
   * Returns an array of holiday Events that occur on the given date,
   * or `undefined` if no holidays occur that day.
   *
   * When `il` is omitted, both Diaspora-only and Israel-only events are
   * returned; pass `true` or `false` to filter to a single schedule.
   * @example
   * import {HebrewCalendar, HDate, months} from '@hebcal/core';
   * const hd = new HDate(15, months.NISAN, 5784);
   * const events = HebrewCalendar.getHolidaysOnDate(hd, false);
   * console.log(events?.map(ev => ev.getDesc())); // ['Pesach I']
   * @param date Hebrew Date, Gregorian date, or absolute R.D. day number
   * @param [il] use the Israeli schedule for holidays
   */
  static getHolidaysOnDate(date, il) {
    return getHolidaysOnDate(date, il);
  }
  /**
   * Returns `true` if Eruv Tavshilin should be prepared on the given date.
   *
   * Eruv Tavshilin is prepared when a Yom Tov falls on Friday (so cooking
   * for Shabbat that begins Friday night may continue from Yom Tov into
   * Shabbat). This requires the day before to be a weekday (Wednesday or
   * Thursday), the following Friday to be Yom Tov, and the day after Friday
   * (Shabbat) to also be a sacred day.
   * @example
   * import {HebrewCalendar} from '@hebcal/core';
   * // Wednesday October 16, 2024 is Erev Sukkot 5785. In the Diaspora,
   * // Sukkot I falls on Thursday and Sukkot II on Friday, so Eruv
   * // Tavshilin is prepared on Wednesday:
   * HebrewCalendar.eruvTavshilin(new Date(2024, 9, 16), false); // true
   * // In Israel there is only one day of Yom Tov, so Friday is a weekday:
   * HebrewCalendar.eruvTavshilin(new Date(2024, 9, 16), true); // false
   * @param date Gregorian or Hebrew date to test
   * @param il use the Israeli holiday schedule
   */
  static eruvTavshilin(date, il) {
    const dow = date.getDay();
    if (dow < 3 || dow > 4) {
      return false;
    }
    const today = new HDate(date);
    const friday = today.after(5);
    const tomorrow = today.next();
    return isChag(friday, il) && !isChag(today, il) && isChag(tomorrow, il);
  }
  /**
   * Helper function to format a 24-hour (00:00-23:59) time string in either
   * 12-hour US format (e.g. `"8:13pm"`) or keep it in 24-hour format (e.g.
   * `"20:13"`) for any other locale or country.
   *
   * The locale (and therefore default behavior) is derived from
   * `options.location` / `options.locale`. The `options.hour12` override
   * takes precedence: if `false`, locale is ignored and the result is always
   * 24-hour; if `true`, locale is ignored and the result is always 12-hour.
   * @example
   * import {HebrewCalendar, Location} from '@hebcal/core';
   * const opts = {location: Location.lookup('Chicago')};
   * HebrewCalendar.reformatTimeStr('20:30', 'pm', opts);          // '8:30pm'
   * HebrewCalendar.reformatTimeStr('20:30', 'pm', {hour12: false}); // '20:30'
   * @param timeStr - original time like "20:30"
   * @param suffix - "p" or "pm" or " P.M.". Add leading space if you want it
   * @param options optional; `location`, `locale` and `hour12` are consulted
   */
  static reformatTimeStr(timeStr, suffix, options) {
    return reformatTimeStr(timeStr, suffix, options);
  }
  /**
   * Returns the semantic version string of the `@hebcal/core` package
   * (e.g. `"6.8.2"`). Useful for logging or feature detection.
   */
  static version() {
    return version;
  }
  /**
   * Convenience function to create an instance of {@link Sedra} or reuse a
   * previously created and cached instance for the same year + schedule.
   *
   * Use this in preference to `new Sedra(...)` when calling repeatedly,
   * since an internal LRU cache (~120 entries) avoids recomputing the
   * keviyah-specific reading pattern.
   * @example
   * import {HebrewCalendar, HDate} from '@hebcal/core';
   * const sedra = HebrewCalendar.getSedra(5784, false);
   * const result = sedra.lookup(new HDate(15, 'Cheshvan', 5784));
   * console.log(result.parsha); // ['Vayera']
   * @param hyear Hebrew year
   * @param il Use Israel sedra schedule (`false` for Diaspora)
   */
  static getSedra(hyear, il) {
    return getSedra(hyear, il);
  }
  /**
   * Determines which form of Hallel (if any) is recited on a given Hebrew date:
   * 0 (none), 1 (half Hallel), or 2 (whole Hallel).
   * See {@link hallel} for details.
   * @example
   * import {HebrewCalendar, HDate, months} from '@hebcal/core';
   * HebrewCalendar.hallel(new HDate(25, months.KISLEV, 5784), false); // 2 (Chanukah)
   * HebrewCalendar.hallel(new HDate(1, months.SHVAT, 5784), false);   // 1 (Rosh Chodesh)
   * HebrewCalendar.hallel(new HDate(2, months.SHVAT, 5784), false);   // 0
   * @param hdate Hebrew date to test
   * @param il use the Israeli holiday schedule
   * @returns 0 for no Hallel, 1 for half Hallel, 2 for whole Hallel
   */
  static hallel(hdate, il) {
    return hallel(hdate, il);
  }
  /**
   * Return details on what Tachanun (or Tzidchatcha on Shabbat) is said on `hdate`.
   *
   * Tachanun is not said on Rosh Chodesh, the month of Nisan, Lag Baomer,
   * Rosh Chodesh Sivan until Isru Chag, Tisha B'av, 15 Av, Erev Rosh Hashanah,
   * Rosh Hashanah, Erev Yom Kippur until after Simchat Torah, Chanukah,
   * Tu B'shvat, Purim and Shushan Purim, and Purim and Shushan Purim Katan.
   *
   * In some congregations Tachanun is not said until from Rosh Chodesh Sivan
   * until 14th Sivan, Sukkot until after Rosh Chodesh Cheshvan, Pesach Sheini,
   * Yom Ha'atzmaut, and Yom Yerushalayim.
   *
   * Tachanun is not said at Mincha on days before it is not said at Shacharit.
   *
   * Tachanun is not said at Shacharit on Shabbat, but is at Mincha, usually.
   * @example
   * import {HebrewCalendar, HDate, months} from '@hebcal/core';
   * // Regular weekday — Tachanun is said at both services
   * HebrewCalendar.tachanun(new HDate(4, months.SHVAT, 5784), false);
   * // => { shacharit: true, mincha: true, allCongs: true }
   *
   * // Friday 2 Sh'vat — said at Shacharit, but not at Mincha (erev Shabbat)
   * HebrewCalendar.tachanun(new HDate(2, months.SHVAT, 5784), false);
   * // => { shacharit: true, mincha: false, allCongs: true }
   *
   * // Rosh Chodesh — no Tachanun
   * HebrewCalendar.tachanun(new HDate(1, months.SHVAT, 5784), false);
   * // => { shacharit: false, mincha: false, allCongs: false }
   * @param hdate Hebrew date to test
   * @param il use the Israeli holiday schedule
   */
  static tachanun(hdate, il) {
    return tachanun(hdate, il);
  }
};
function isChag(date, il) {
  const events = getHolidaysOnDate(date, il) ?? [];
  return events.some((ev) => ev.hasFlag("CHAG"));
}
export {
  HDate,
  HebrewCalendar,
  Location,
  OmerEvent,
  Sedra,
  Zmanim,
  flags,
  gematriya,
  months
};
/*! Bundled license information:

@hebcal/core/dist/esm/pkgVersion.js:
@hebcal/core/dist/esm/ashkenazi.po.js:
@hebcal/core/dist/esm/he.po.js:
@hebcal/core/dist/esm/he-x-NoNikud.po.js:
@hebcal/core/dist/esm/locale.js:
@hebcal/core/dist/esm/event.js:
@hebcal/core/dist/esm/HebrewDateEvent.js:
@hebcal/core/dist/esm/cities.json.js:
@hebcal/core/dist/esm/location.js:
@hebcal/core/dist/esm/reformatTimeStr.js:
@hebcal/core/dist/esm/moladBase.js:
@hebcal/core/dist/esm/moladDate.js:
@hebcal/core/dist/esm/string.js:
@hebcal/core/dist/esm/molad.js:
@hebcal/core/dist/esm/zenith.js:
@hebcal/core/dist/esm/horizon.js:
@hebcal/core/dist/esm/zmanim.js:
@hebcal/core/dist/esm/staticHolidays.js:
@hebcal/core/dist/esm/HolidayEvent.js:
@hebcal/core/dist/esm/modern.js:
@hebcal/core/dist/esm/sedra.js:
@hebcal/core/dist/esm/TimedEvent.js:
@hebcal/core/dist/esm/YomKippurKatanEvent.js:
@hebcal/core/dist/esm/holidays.js:
@hebcal/core/dist/esm/isAssurBemlacha.js:
@hebcal/core/dist/esm/isAveilut.js:
@hebcal/core/dist/esm/isFastDay.js:
@hebcal/core/dist/esm/candles.js:
@hebcal/core/dist/esm/KiddushLevanaEvent.js:
@hebcal/core/dist/esm/sefira.json.js:
@hebcal/core/dist/esm/omer.js:
@hebcal/core/dist/esm/tachanun.js:
@hebcal/core/dist/esm/hallel.js:
@hebcal/core/dist/esm/parshaName.js:
@hebcal/core/dist/esm/ParshaEvent.js:
@hebcal/core/dist/esm/parshaYear.js:
@hebcal/core/dist/esm/getStartAndEnd.js:
@hebcal/core/dist/esm/DailyLearning.js:
@hebcal/core/dist/esm/MevarchimChodeshEvent.js:
@hebcal/core/dist/esm/calendar.js:
@hebcal/core/dist/esm/hebcal.js:
@hebcal/core/dist/esm/index.js:
  (*! @hebcal/core v6.16.0, distributed under GPLv2 or later https://www.gnu.org/licenses/gpl-2.0.txt *)

@hebcal/hdate/dist/esm/greg.js:
@hebcal/hdate/dist/esm/gregNamespace.js:
@hebcal/hdate/dist/esm/hebrewStripNikkud.js:
@hebcal/hdate/dist/esm/hdateBase.js:
@hebcal/hdate/dist/esm/anniversary.js:
@hebcal/hdate/dist/esm/gematriya.js:
@hebcal/hdate/dist/esm/pad.js:
@hebcal/hdate/dist/esm/dateFormat.js:
@hebcal/hdate/dist/esm/ashkenazi.po.js:
@hebcal/hdate/dist/esm/he.po.js:
@hebcal/hdate/dist/esm/locale.js:
@hebcal/hdate/dist/esm/hdate.js:
@hebcal/hdate/dist/esm/anniversaryHDate.js:
@hebcal/hdate/dist/esm/index.js:
  (*! @hebcal/hdate v0.23.1, distributed under GPLv2 or later https://www.gnu.org/licenses/gpl-2.0.txt *)
*/
