(function () {
  'use strict';
  const PRAYERS = [['fajr', 'اذان صبح'], ['sunrise', 'طلوع آفتاب'], ['dhuhr', 'اذان ظهر'], ['asr', 'اذان عصر'], ['maghrib', 'اذان مغرب'], ['isha', 'اذان عشا']];
  const AZAN = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const NAME = Object.fromEntries(PRAYERS);
  const SHORT = { fajr: 'صبح', sunrise: 'طلوع آفتاب', dhuhr: 'ظهر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشا' };
  const DEF = {
    cityId: 'tehran', custom: null,
    enabled: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    volume: 0.8, pre: 15, muezzinId: 'afasy', hijriOffset: 0,
    muezzins: [{ id: 'afasy', name: 'مشاری العفاسی', path: '', file: '' }]
  };
  const fa = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const p2 = n => String(n).padStart(2, '0');
  const hm = min => fa(p2(Math.floor(min / 60) % 24) + ':' + p2(min % 60));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let S = load();
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem('azango') || '{}');
      return Object.assign({}, DEF, o, { enabled: Object.assign({}, DEF.enabled, o.enabled || {}) });
    } catch (e) { return JSON.parse(JSON.stringify(DEF)); }
  }
  function save(resched) { localStorage.setItem('azango', JSON.stringify(S)); if (resched !== false) schedule(); }

  /* ---------- location & times ---------- */
  function place() {
    if (S.custom) return S.custom;
    return CITIES.find(c => c.id === S.cityId) || CITIES[0];
  }
  const cityNow = tz => new Date(Date.now() + tz * 3600000); // read with getUTC*
  function timesFor(dayMs, p) {
    const d = new Date(dayMs);
    return PT.compute(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), p.lat, p.lng, p.tz);
  }
  const dayStart = (p, offset) => { const c = cityNow(p.tz); return Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()) + (offset || 0) * 86400000; };

  function nextPrayer(p) {
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
      const t = timesFor(dayStart(p, i), p);
      for (const [k] of PRAYERS) if (t[k].ms > now) return { key: k, ms: t[k].ms, min: t[k].min };
    }
    return null;
  }

  /* ---------- calendars (Intl, no network) ---------- */
  function dates(p) {
    const c = cityNow(p.tz);
    const fmt = (loc, o, d) => new Intl.DateTimeFormat(loc, Object.assign({ timeZone: 'UTC' }, o)).format(d);
    const shamsi = fmt('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, c);
    const h = new Date(c.getTime() + (S.hijriOffset || 0) * 86400000);
    const qamari = fmt('fa-IR-u-ca-islamic-civil', { day: 'numeric', month: 'long', year: 'numeric' }, h);
    return { shamsi, qamari };
  }

  /* ---------- scheduling (hands a 45-day event list to Kotlin) ---------- */
  function buildEvents() {
    const p = place(), out = [], now = Date.now();
    for (let i = 0; i < 45; i++) {
      const t = timesFor(dayStart(p, i), p);
      for (const k of AZAN) {
        if (!S.enabled[k]) continue;
        const ms = t[k].ms;
        if (ms < now - 120000) continue;
        if (S.pre > 0 && ms - S.pre * 60000 > now) out.push({ t: ms - S.pre * 60000, type: 'pre', key: k, name: SHORT[k], min: S.pre });
        out.push({ t: ms, type: 'azan', key: k, name: SHORT[k] });
      }
    }
    return out;
  }
  function muezzin() { return S.muezzins.find(m => m.id === S.muezzinId) || S.muezzins[0]; }
  function schedule() {
    if (!Native.available()) return;
    Native.schedule(buildEvents(), { path: muezzin().path || '', volume: S.volume, city: place().name });
  }

  /* ---------- UI helpers ---------- */
  const app = document.getElementById('app');
  const nav = document.getElementById('nav');
  let page = 'home', lastDay = '';
  const NAV = [['home', '🏠', 'خانه'], ['times', '🕌', 'اوقات'], ['settings', '⚙️', 'تنظیمات']];
  const SUB = { city: 'انتخاب شهر', azan: 'تنظیمات اذان', muezzin: 'مؤذن و فایل صوتی', notif: 'اعلان‌ها', about: 'درباره برنامه' };

  function go(pg) { page = pg; render(); window.scrollTo(0, 0); }
  window.go = go;

  function header(title, back) {
    return '<header class="top">' + (back ? '<button class="back" onclick="go(\'' + back + '\')">→ بازگشت</button>' : '') + '<h1>' + title + '</h1></header>';
  }
  function toggle(id, on) {
    return '<button class="sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-sw="' + id + '"><span></span></button>';
  }

  /* ---------- pages ---------- */
  function renderHome() {
    const p = place(), d = dates(p), t = timesFor(dayStart(p, 0), p), nx = nextPrayer(p);
    app.innerHTML =
      '<section class="hero"><div class="city">📍 ' + esc(p.name) + '</div>' +
      '<div id="clock" class="clock">--:--:--</div>' +
      '<div class="date">' + d.shamsi + '</div><div class="date sub">' + d.qamari + ' قمری</div></section>' +
      '<section class="next"><div class="lbl">نماز بعدی</div><div class="nm" id="nxName">' + (nx ? SHORT[nx.key] : '') + '</div>' +
      '<div class="at" id="nxAt">' + (nx ? 'ساعت ' + hm(nx.min) : '') + '</div>' +
      '<div class="cd" id="cd">--:--:--</div><div class="lbl small">زمان باقی‌مانده</div></section>' +
      '<section class="list">' + PRAYERS.map(([k, n]) =>
        '<div class="row' + (nx && nx.key === k ? ' hl' : '') + '"><span>' + n + '</span><b>' + hm(t[k].min) + '</b></div>').join('') + '</section>';
    tick();
  }
  function renderTimes() {
    const p = place(), t = timesFor(dayStart(p, 0), p), t2 = timesFor(dayStart(p, 1), p);
    app.innerHTML = header('اوقات شرعی امروز') +
      '<p class="hint">شهر: ' + esc(p.name) + ' · روش: مؤسسه ژئوفیزیک دانشگاه تهران</p><section class="list big">' +
      PRAYERS.map(([k, n]) => '<div class="row"><span>' + n + '</span><b>' + hm(t[k].min) + '</b></div>').join('') + '</section>' +
      '<h2>فردا</h2><section class="list">' +
      PRAYERS.map(([k, n]) => '<div class="row dim"><span>' + n + '</span><b>' + hm(t2[k].min) + '</b></div>').join('') + '</section>';
  }
  function renderSettings() {
    app.innerHTML = header('تنظیمات') + '<section class="menu">' +
      [['city', '📍', 'انتخاب شهر', place().name], ['azan', '🔔', 'تنظیمات اذان', 'روشن/خاموش، صدا، آزمایش'], ['muezzin', '🎙️', 'مؤذن و فایل صوتی', muezzin().name],
       ['notif', '📣', 'اعلان‌ها', 'قبل از اذان، باتری'], ['about', 'ℹ️', 'درباره برنامه', '']]
        .map(([id, ic, t, s]) => '<button class="mi" onclick="go(\'' + id + '\')"><i>' + ic + '</i><span><b>' + t + '</b><small>' + esc(s) + '</small></span><em>‹</em></button>').join('') + '</section>';
  }
  function renderCity() {
    const c = S.custom;
    app.innerHTML = header('انتخاب شهر', 'settings') + '<section class="menu">' +
      CITIES.map(x => '<button class="mi city' + (!S.custom && S.cityId === x.id ? ' sel' : '') + '" data-city="' + x.id + '"><span><b>' + x.name + '</b></span><em>' + (!S.custom && S.cityId === x.id ? '✓' : '') + '</em></button>').join('') + '</section>' +
      '<h2>موقعیت دستی</h2><section class="form"><label>نام<input id="cName" value="' + esc(c ? c.name : '') + '" placeholder="مثلاً روستای من"></label>' +
      '<label>عرض جغرافیایی<input id="cLat" inputmode="decimal" dir="ltr" value="' + (c ? c.lat : '') + '" placeholder="35.6892"></label>' +
      '<label>طول جغرافیایی<input id="cLng" inputmode="decimal" dir="ltr" value="' + (c ? c.lng : '') + '" placeholder="51.3890"></label>' +
      '<label>اختلاف ساعت با UTC<input id="cTz" inputmode="decimal" dir="ltr" value="' + (c ? c.tz : '3.5') + '"></label>' +
      '<button class="btn" id="cSave">ذخیره موقعیت دستی</button><div id="cMsg" class="hint"></div></section>';
  }
  function renderAzan() {
    app.innerHTML = header('تنظیمات اذان', 'settings') +
      '<section class="menu">' + AZAN.map(k => '<div class="mi"><span><b>' + NAME[k] + '</b><small>پخش خودکار</small></span>' + toggle(k, S.enabled[k]) + '</div>').join('') + '</section>' +
      '<section class="form"><label>میزان صدا: <b id="volV">' + fa(Math.round(S.volume * 100)) + '٪</b><input id="vol" type="range" min="10" max="100" value="' + Math.round(S.volume * 100) + '"></label>' +
      '<button class="btn" id="tPlay">▶ آزمایش صدای اذان</button><button class="btn alt" id="tStop">■ توقف صدا</button><div id="aMsg" class="hint"></div></section>';
  }
  function renderMuezzin() {
    app.innerHTML = header('مؤذن و فایل صوتی', 'settings') +
      '<p class="hint">به دلیل حقوق مالکیت، فایل صوتی داخل برنامه نیست. فایل اذان مجاز را روی گوشی بریزید و با دکمه «انتخاب فایل» وارد کنید. اگر فایلی انتخاب نشود، صدای زنگ پیش‌فرض گوشی پخش می‌شود.</p>' +
      S.muezzins.map(m => '<section class="card' + (m.id === S.muezzinId ? ' sel' : '') + '"><h3>' + esc(m.name) + (m.id === S.muezzinId ? ' ✓' : '') + '</h3><div class="hint">' + (m.path ? 'فایل: ' + esc(m.file || 'انتخاب شده') : 'فایلی انتخاب نشده') + '</div>' +
        '<div class="btns"><button class="btn" data-use="' + m.id + '">استفاده</button><button class="btn alt" data-pick="' + m.id + '">انتخاب فایل</button><button class="btn alt" data-try="' + m.id + '">آزمایش</button>' +
        (m.id !== 'afasy' ? '<button class="btn danger" data-del="' + m.id + '">حذف</button>' : '') + '</div></section>').join('') +
      '<button class="btn wide" id="mAdd">＋ افزودن مؤذن دلخواه</button><button class="btn alt wide" id="mStop">■ توقف صدا</button><div id="mMsg" class="hint"></div>';
  }
  function renderNotif() {
    app.innerHTML = header('اعلان‌ها', 'settings') +
      '<section class="form"><label>یادآوری قبل از اذان<select id="pre">' +
      [0, 5, 10, 15, 20, 30].map(v => '<option value="' + v + '"' + (S.pre === v ? ' selected' : '') + '>' + (v ? fa(v) + ' دقیقه قبل' : 'خاموش') + '</option>').join('') + '</select></label>' +
      '<div id="st" class="hint">در حال بررسی وضعیت…</div>' +
      '<button class="btn" id="nAsk">اجازه نمایش اعلان</button><button class="btn" id="nBat">خارج کردن از محدودیت باتری</button><button class="btn alt" id="nApp">تنظیمات برنامه در اندروید</button></section>' +
      '<p class="hint">در گوشی‌های سامسونگ، شیائومی، هواوی، اوپو و … علاوه بر این، گزینه‌های «شروع خودکار / Autostart» و «بدون محدودیت باتری» را برای اذان‌گو فعال کنید. اگر برنامه را از «توقف اجباری (Force Stop)» ببندید، اندروید تا باز شدن دوباره برنامه اجازه اجرای هیچ زمان‌بندی را نمی‌دهد.</p>';
    Native.status().then(s => {
      const el = document.getElementById('st'); if (!el) return;
      if (!s) { el.textContent = 'این صفحه فقط روی گوشی وضعیت را نشان می‌دهد.'; return; }
      el.innerHTML = 'اعلان: <b>' + (s.notifications ? 'فعال ✓' : 'غیرفعال ✗') + '</b><br>بدون محدودیت باتری: <b>' + (s.ignoringBattery ? 'بله ✓' : 'خیر ✗') + '</b>';
    });
  }
  function renderAbout() {
    app.innerHTML = header('درباره برنامه', 'settings') +
      '<section class="card"><h3>اذان‌گو (AzanGo)</h3><p>نسخه ۱.۰ — اوقات شرعی بر اساس مختصات شهر و روش مؤسسه ژئوفیزیک دانشگاه تهران (صبح ۱۷٫۷°، مغرب ۴٫۵°، عشا ۱۴°).</p>' +
      '<p>اوقات را با تقویم رسمی شهر خود مقایسه کنید؛ ممکن است تا چند دقیقه اختلاف دیده شود. در صورت نیاز، موقعیت دستی را تنظیم کنید.</p>' +
      '<div class="form"><label>اصلاح تاریخ قمری<select id="hj">' + [-2, -1, 0, 1, 2].map(v => '<option value="' + v + '"' + (S.hijriOffset === v ? ' selected' : '') + '>' + (v > 0 ? '+' : '') + fa(v) + ' روز</option>').join('') + '</select></label></div></section>';
  }
  const R = { home: renderHome, times: renderTimes, settings: renderSettings, city: renderCity, azan: renderAzan, muezzin: renderMuezzin, notif: renderNotif, about: renderAbout };
  function render() {
    (R[page] || renderHome)();
    const top = ['home', 'times', 'settings'].includes(page) ? page : 'settings';
    nav.innerHTML = NAV.map(([id, ic, t]) => '<button class="' + (id === top ? 'on' : '') + '" onclick="go(\'' + id + '\')"><i>' + ic + '</i>' + t + '</button>').join('');
  }

  /* ---------- live tick ---------- */
  function tick() {
    const p = place(), c = cityNow(p.tz);
    const key = c.getUTCFullYear() + '-' + c.getUTCMonth() + '-' + c.getUTCDate();
    if (page === 'home') {
      if (lastDay && key !== lastDay) { lastDay = key; renderHome(); schedule(); return; }
      lastDay = key;
      const ck = document.getElementById('clock');
      if (ck) ck.textContent = fa(p2(c.getUTCHours()) + ':' + p2(c.getUTCMinutes()) + ':' + p2(c.getUTCSeconds()));
      const nx = nextPrayer(p), cd = document.getElementById('cd');
      if (nx && cd) {
        let s = Math.max(0, Math.floor((nx.ms - Date.now()) / 1000));
        cd.textContent = fa(p2(Math.floor(s / 3600)) + ':' + p2(Math.floor(s % 3600 / 60)) + ':' + p2(s % 60));
        const n = document.getElementById('nxName'), a = document.getElementById('nxAt');
        if (n && n.textContent !== SHORT[nx.key]) renderHome();
        else if (a) a.textContent = 'ساعت ' + hm(nx.min);
      }
    }
  }

  /* ---------- events ---------- */
  document.addEventListener('click', async e => {
    const el = e.target.closest('button'); if (!el) return;
    const msg = id => document.getElementById(id);
    if (el.dataset.sw) { S.enabled[el.dataset.sw] = !S.enabled[el.dataset.sw]; save(); return renderAzan(); }
    if (el.dataset.city) { S.cityId = el.dataset.city; S.custom = null; save(); return renderCity(); }
    if (el.id === 'cSave') {
      const lat = parseFloat(msg('cLat').value), lng = parseFloat(msg('cLng').value), tz = parseFloat(msg('cTz').value), name = msg('cName').value.trim() || 'موقعیت من';
      if (!(lat >= -66 && lat <= 66) || !(lng >= -180 && lng <= 180) || !(tz >= -12 && tz <= 14)) { msg('cMsg').textContent = 'مقادیر واردشده معتبر نیست.'; return; }
      S.custom = { id: 'custom', name, lat, lng, tz }; save(); msg('cMsg').textContent = 'ذخیره شد ✓';
    }
    if (el.id === 'tPlay') { const r = await Native.play(muezzin().path, S.volume); msg('aMsg').textContent = Native.available() ? (r && r.error ? 'خطا: ' + r.error : (muezzin().path ? 'در حال پخش…' : 'فایل مؤذن انتخاب نشده؛ صدای پیش‌فرض پخش می‌شود.')) : 'پخش صدا فقط روی گوشی ممکن است.'; }
    if (el.id === 'tStop' || el.id === 'mStop') Native.stop();
    if (el.dataset.use) { S.muezzinId = el.dataset.use; save(); renderMuezzin(); }
    if (el.dataset.try) { const m = S.muezzins.find(x => x.id === el.dataset.try); Native.play(m.path, S.volume); }
    if (el.dataset.pick) {
      const m = S.muezzins.find(x => x.id === el.dataset.pick), r = await Native.importAudio(m.id);
      if (r && r.path) { m.path = r.path; m.file = r.name || ''; save(); renderMuezzin(); }
      else if (r && r.error) msg('mMsg').textContent = 'فایل وارد نشد: ' + r.error;
      else if (!r) msg('mMsg').textContent = 'انتخاب فایل فقط روی گوشی ممکن است.';
    }
    if (el.dataset.del) { S.muezzins = S.muezzins.filter(x => x.id !== el.dataset.del); if (S.muezzinId === el.dataset.del) S.muezzinId = 'afasy'; save(); renderMuezzin(); }
    if (el.id === 'mAdd') { const n = (window.prompt('نام مؤذن:') || '').trim(); if (n) { S.muezzins.push({ id: 'm' + Date.now(), name: n, path: '', file: '' }); save(false); renderMuezzin(); } }
    if (el.id === 'nAsk') { await Native.askNotifications(); setTimeout(renderNotif, 800); }
    if (el.id === 'nBat') Native.batterySettings();
    if (el.id === 'nApp') Native.appSettings();
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'vol') { S.volume = e.target.value / 100; document.getElementById('volV').textContent = fa(e.target.value) + '٪'; }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'vol') save();
    if (e.target.id === 'pre') { S.pre = parseInt(e.target.value, 10); save(); }
    if (e.target.id === 'hj') { S.hijriOffset = parseInt(e.target.value, 10); save(false); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { schedule(); if (page === 'home') renderHome(); } });

  render(); schedule();
  setInterval(tick, 1000);
  if (Native.available()) Native.askNotifications();
})();
