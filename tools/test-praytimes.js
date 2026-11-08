// Sanity tests for the prayer-time engine: ordering, day-to-day change, season trend, Tehran ranges.
const PT = require('../www/js/praytimes.js');
const assert = require('assert');
const tehran = (y, m, d) => PT.compute(y, m, d, 35.6892, 51.3890, 3.5);
const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
for (const [y, m, d] of [[2026, 1, 15], [2026, 3, 21], [2026, 6, 21], [2026, 9, 23], [2026, 11, 8], [2026, 12, 21]]) {
  const t = tehran(y, m, d);
  for (let i = 1; i < order.length; i++) assert(t[order[i]].min > t[order[i - 1]].min, `order broken on ${y}-${m}-${d}`);
}
assert(tehran(2026, 6, 21).fajr.min < tehran(2026, 12, 21).fajr.min, 'summer Fajr should be earlier than winter');
assert(tehran(2026, 11, 9).dhuhr.min !== tehran(2026, 11, 8).dhuhr.min || tehran(2026, 11, 9).fajr.min !== tehran(2026, 11, 8).fajr.min, 'times must change by date');
const noon = tehran(2026, 6, 21).dhuhr.min; assert(noon > 11 * 60 + 50 && noon < 12 * 60 + 15, 'Tehran noon out of range');
const t = tehran(2026, 11, 8); assert(t.fajr.ms < t.sunrise.ms && t.maghrib.ms < t.isha.ms);
console.log('praytimes: all checks passed');
