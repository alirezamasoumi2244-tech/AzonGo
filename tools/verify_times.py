#!/usr/bin/env python3
"""Cross-checks www/js/praytimes.js against an independent NOAA-style solar algorithm for all cities and several dates."""
import json, math, subprocess, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dates = [(2026,1,10),(2026,3,21),(2026,5,5),(2026,6,21),(2026,8,15),(2026,9,23),(2026,11,13),(2026,12,21)]
js = r'''
global.window = global; require('./www/js/cities.js'); const PT = require('./www/js/praytimes.js');
const out = []; const dates = %s;
for (const c of CITIES) for (const [y,m,d] of dates) { const t = PT.compute(y,m,d,c.lat,c.lng,c.tz);
  out.push({city:c.name,lat:c.lat,lng:c.lng,tz:c.tz,date:[y,m,d],t:Object.fromEntries(Object.entries(t).map(([k,v])=>[k,v.min]))}); }
console.log(JSON.stringify(out));''' % json.dumps(dates)
rows = json.loads(subprocess.check_output(['node', '-e', js], cwd=R))
rad, deg = math.radians, math.degrees
def jd0(y, m, d):
    if m <= 2: y -= 1; m += 12
    A = y // 100; B = 2 - A + A // 4
    return int(365.25*(y+4716)) + int(30.6001*(m+1)) + d + B - 1524.5
def sun(jd):
    T = (jd-2451545)/36525
    L0 = (280.46646 + T*(36000.76983 + 0.0003032*T)) % 360
    M = 357.52911 + T*(35999.05029 - 0.0001537*T)
    e = 0.016708634 - T*(0.000042037 + 0.0000001267*T)
    C = math.sin(rad(M))*(1.914602 - T*(0.004817+0.000014*T)) + math.sin(rad(2*M))*(0.019993-0.000101*T) + math.sin(rad(3*M))*0.000289
    om = 125.04 - 1934.136*T
    lam = L0 + C - 0.00569 - 0.00478*math.sin(rad(om))
    eps = 23 + (26 + (21.448 - T*(46.815 + T*(0.00059 - T*0.001813)))/60)/60 + 0.00256*math.cos(rad(om))
    decl = deg(math.asin(math.sin(rad(eps))*math.sin(rad(lam))))
    y = math.tan(rad(eps/2))**2
    eq = 4*deg(y*math.sin(2*rad(L0)) - 2*e*math.sin(rad(M)) + 4*e*y*math.sin(rad(M))*math.cos(2*rad(L0)) - 0.5*y*y*math.sin(4*rad(L0)) - 1.25*e*e*math.sin(2*rad(M)))
    return decl, eq
def ref(y, m, d, lat, lng, tz):
    j = jd0(y, m, d)
    def at(alt_fn, sign, guess):
        t = guess
        for _ in range(4):
            decl, eq = sun(j + t/1440)
            a = alt_fn(decl)
            c = (math.sin(rad(a)) - math.sin(rad(lat))*math.sin(rad(decl))) / (math.cos(rad(lat))*math.cos(rad(decl)))
            H = deg(math.acos(c))
            noon = 720 - 4*lng - eq
            t = noon + sign*4*H
        return t + tz*60
    decl, eq = sun(j + (720-4*lng)/1440)
    noon = 720 - 4*lng - eq
    out = {
      'fajr': at(lambda dc: -17.7, -1, 300), 'sunrise': at(lambda dc: -0.833, -1, 360),
      'dhuhr': noon + tz*60,
      'asr': at(lambda dc: deg(math.atan(1/(1+math.tan(rad(abs(lat-dc)))))), +1, 900),
      'maghrib': at(lambda dc: -4.5, +1, 1100), 'isha': at(lambda dc: -14, +1, 1200)}
    return out
worst = 0; bad = []
for r in rows:
    y, m, d = r['date']; ex = ref(y, m, d, r['lat'], r['lng'], r['tz'])
    for k, v in r['t'].items():
        diff = abs(v - ex[k]); worst = max(worst, diff)
        if diff > 1.6: bad.append((r['city'], r['date'], k, v, round(ex[k], 1)))
print(f"cities={len(set(r['city'] for r in rows))} dates={len(dates)} comparisons={len(rows)*6}")
print(f"max difference vs independent algorithm: {worst:.2f} minutes")
print("outliers > 1.6 min:", bad[:12] if bad else "none")
sys.exit(1 if bad else 0)
