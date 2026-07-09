import {
  isDefined, 
} from './is/isDefined';
import {
  templateProvider, 
} from './templateProvider';
import {
  padStart, 
} from './padStart';

const REGEXP_TEMPLATE = /\{((?:(?:"[^"]*")|(?:'[^']*')|(?:`[^`]*`)|(?:\{.*?\})|(?:[^}]*?))*?)\}/g; // eslint-disable-line
const DEFAULT_MASK = '{yyyy}-{mm}-{dd} {HH}:{MM}:{ss}';
const I18N = {
  days: [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],
  months: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

interface IFormatTime {
  (date?: number | string | Date, mask?: string, utc?: boolean, i18n?: Record<string, string[]>): string;
  normalizeDate: (date: number | string | Date) => Date | null;
  getData: (date: number | string | Date, utc?: boolean, i18n?: Record<string, string[]>) => Record<string, string>;
  getRFC3339: (time: string | number | Date, utc?: boolean) => string;
}


/**
 * Templates the RFC3339 format.
 * 
 * @returns The template function.
 */
const templateRFC3339 = templateProvider(
  '{yyyy}-{mm}-{dd}T{HH}:{MM}:{ss}.{L}{o}', null, REGEXP_TEMPLATE,
);

function pad(v: number, len?: number) {
  return padStart(
    '' + v, len || 2, '0',
  );
}

/**
 * Formats a date to a string.
 * 
 * @param date - The date to format.
 * @param mask - The mask to use.
 * @param utc - Whether to use UTC time.
 * @param i18n - The i18n object to use.
 * @returns The formatted string.
 * @example
 * formatTime(new Date('2024-06-15T08:05:03'), '{yyyy}-{mm}-{dd}'); // => '2024-06-15'
 * formatTime(new Date('2024-06-15T08:05:03'), '{HH}:{MM}:{ss}');   // => '08:05:03'
 */
export const formatTime: IFormatTime = (
  date?: number | string | Date, mask?: string, utc?: boolean, i18n?: Record<string, string[]>,
) => {
  const ctx = getData(
    date, utc, i18n,
  );
  return ctx
    ? templateProvider(
      mask || DEFAULT_MASK, null, REGEXP_TEMPLATE,
    )(ctx)
    : '';
};

/**
 * Normalizes a date.
 * 
 * @param date - The date to normalize.
 * @returns The normalized date.
 */
export const normalizeDate = formatTime.normalizeDate = (date: number | string | Date): Date | null => {
  if (!isDefined(date)) {
    return new Date();
  }

  if (date instanceof Date) {
    return date;
  }

  try {
    const targetDate = new Date(date);
    return isNaN(targetDate.getTime()) ? null : targetDate;
  } catch (ex) {
    console.error(ex);
  }
  return null;
};

/**
 * Gets the data for a date.
 * 
 * @param date - The date to get the data for.
 * @param utc - Whether to use UTC time.
 * @param i18n - The i18n object to use.
 * @returns The data.
 */
export const getData = formatTime.getData = (
  date: number | string | Date,
  utc?: boolean,
  i18n?: Record<string, string[]>,
): Record<string, string> | null => {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) {
    return null;
  }
  i18n = i18n || I18N;

  function get(key: string): number {
    return normalizedDate[prefix + key]();
  }

  const prefix = utc ? 'getUTC' : 'get';
  const d = get('Date');
  const D = get('Day');
  const m = get('Month');
  const y = get('FullYear');
  const H = get('Hours');
  const M = get('Minutes');
  const s = get('Seconds');
  const L = get('Milliseconds');
  const o = utc ? 0 : normalizedDate.getTimezoneOffset();
  const oA = Math.abs(o);
  const oM = oA % 60;
  const oH = (oA - oM) / 60;
  const {
    days,
    months,
  } = i18n;
  return {
    d: `${d}`,
    dd: pad(d),
    ddd: days[D],
    dddd: days[D + 7],
    m: `${m + 1}`,
    mm: pad(m + 1),
    mmm: months[m],
    mmmm: months[m + 12],
    yy: ('' + y).slice(2),
    yyyy: `${y}`,
    h: `${H % 12 || 12}`,
    hh: pad(H % 12 || 12),
    H: `${H}`,
    HH: pad(H),
    M: `${M}`,
    MM: pad(M),
    s: `${s}`,
    ss: pad(s),
    l: pad(L, 3),
    L: pad(Math.round(L / 10)),
    t: H < 12 ? 'a' : 'p',
    tt: H < 12 ? 'am' : 'pm',
    T: H < 12 ? 'A' : 'P',
    TT: H < 12 ? 'AM' : 'PM',
    o: utc ? 'Z' : (o > 0 ? '-' : '+') + pad(oH, 2) + ':' + pad(oM, 2),
  };
};

/**
 * Gets the RFC3339 format for a date.
 * 
 * @param time - The date to get the RFC3339 format for.
 * @param utc - Whether to use UTC time.
 * @returns The RFC3339 format.
 */
export const getRFC3339 = formatTime.getRFC3339 = (time: string | number | Date,
  utc?: boolean): string => templateRFC3339(getData(time, utc));
