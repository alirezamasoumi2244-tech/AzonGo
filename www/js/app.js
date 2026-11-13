(function () {
  'use strict';
  const PRAYERS = [['fajr', 'اذان صبح'], ['sunrise', 'طلوع آفتاب'], ['dhuhr', 'اذان ظهر'], ['asr', 'اذان عصر'], ['maghrib', 'اذان مغرب'], ['isha', 'اذان عشا']];
  const AZAN = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const NAME = Object.fromEntries(PRAYERS);
  /* inline line-icons (no emoji) */
  const PATHS = {
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5v-5h4v5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    soff: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chev: '<path d="M14.5 6 8.5 12l6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    fajr: '<path d="M18.5 14.5A7.5 7.5 0 0 1 9.5 5.5a7.5 7.5 0 1 0 9 9z"/><path d="M17 4v3M15.5 5.5h3"/>',
    sunrise: '<path d="M3.5 18h17M7 18a5 5 0 0 1 10 0M12 6v3M5.5 10.5l1.8 1.8M18.5 10.5l-1.8 1.8"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    asr: '<path d="M7 18h10a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 8 10a4 4 0 0 0-1 8z"/><path d="M16.5 4.5l.8 1.4M20.2 8.2l-1.4.8M12.5 4.8l-.3 1.5"/>',
    sunset: '<path d="M3.5 19h17M7 19a5 5 0 0 1 10 0M12 4v5M9.5 6.8 12 9.3l2.5-2.5"/>',
    moon: '<path d="M19 14.5A8 8 0 0 1 9.5 5a8 8 0 1 0 9.5 9.5z"/>'
  };
  const ic = n => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + PATHS[n] + '</svg>';
  const ICON = { fajr: ic('fajr'), sunrise: ic('sunrise'), dhuhr: ic('sun'), asr: ic('asr'), maghrib: ic('sunset'), isha: ic('moon') };
  const SHORT = { fajr: 'صبح', sunrise: 'طلوع آفتاب', dhuhr: 'ظهر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشا' };
  const DEF = {
    cityId: 'tehran', custom: null,
    enabled: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    volume: 0.8, pre: 15, offsets: {}, muezzinId: 'afasy', hijriOffset: 0,
    muezzins: [{ id: 'afasy', name: 'اذان پیش‌فرض', path: '', file: '' }]
  };
  const fa = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const p2 = n => String(n).padStart(2, '0');
  const hm = min => fa(p2(Math.floor(min / 60) % 24) + ':' + p2(min % 60));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let S = load();
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem('azango') || '{}');
      const m = Object.assign({}, DEF, o, { enabled: Object.assign({}, DEF.enabled, o.enabled || {}), offsets: Object.assign({}, o.offsets || {}) });
      m.muezzins = (m.muezzins || DEF.muezzins).map(x => (x.id === 'afasy' && !x.path) ? Object.assign({}, x, { name: 'اذان پیش‌فرض' }) : x);
      return m;
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
    const t = PT.compute(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), p.lat, p.lng, p.tz);
    for (const k in t) { const o = (S.offsets && S.offsets[k]) || 0; if (o) { t[k].min += o; t[k].ms += o * 60000; } } // manual minute correction
    return t;
  }
  const dayStart = (p, offset) => { const c = cityNow(p.tz); return Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()) + (offset || 0) * 86400000; };

  function nextPrayer(p) {
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
      const t = timesFor(dayStart(p, i), p);
      for (const k of AZAN) if (t[k].ms > now) return { key: k, ms: t[k].ms, min: t[k].min };
    }
    return null;
  }

  function prevMs(p) {
    const now = Date.now();
    let best = 0;
    for (let i = -1; i <= 0; i++) { const t = timesFor(dayStart(p, i), p); for (const k of AZAN) if (t[k].ms <= now && t[k].ms > best) best = t[k].ms; }
    return best;
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
  const NAV = [['home', ic('home'), 'خانه'], ['times', ic('clock'), 'اوقات'], ['settings', ic('gear'), 'تنظیمات']];
  const SUB = { city: 'انتخاب شهر', azan: 'تنظیمات اذان', muezzin: 'مؤذن و فایل صوتی', notif: 'اعلان‌ها', about: 'درباره برنامه' };

  function go(pg) { page = pg; render(); window.scrollTo(0, 0); if (app.classList) { app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter'); } }
  window.go = go;

  function header(title, back) {
    return '<header class="top">' + (back ? '<button class="back" onclick="go(\'' + back + '\')">' + ic('back') + ' بازگشت</button>' : '') + '<h1>' + title + '</h1></header>';
  }
  function toggle(id, on) {
    return '<button class="sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-sw="' + id + '"><span></span></button>';
  }

  /* ---------- pages ---------- */
  function renderHome() {
    const p = place(), d = dates(p), t = timesFor(dayStart(p, 0), p), nx = nextPrayer(p);
    app.innerHTML =
      '<section class="hero"><div class="pill">' + ic('pin') + ' ' + esc(p.name) + '</div>' +
      '<div id="clock" class="clock">--:--:--</div>' +
      '<div class="date">' + d.shamsi + '</div><div class="date sub">' + d.qamari + ' قمری</div></section>' +
      '<section class="next"><div class="ringbox"><svg class="ring" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#46e3ae"/><stop offset="1" stop-color="#f3d27a"/></linearGradient></defs>' +
      '<circle class="rt" cx="60" cy="60" r="54"/><circle class="rp" id="rp" cx="60" cy="60" r="54"/></svg>' +
      '<div class="ringin"><div class="lbl">نماز بعدی</div><div class="nm" id="nxName">' + (nx ? SHORT[nx.key] : '') + '</div>' +
      '<div class="at" id="nxAt">' + (nx ? 'ساعت ' + hm(nx.min) : '') + '</div><div class="cd" id="cd">--:--:--</div></div></div>' +
      '<div class="lbl small">زمان باقی‌مانده تا اذان</div></section>' +
      '<section class="list">' + PRAYERS.map(([k, n]) =>
        '<div class="row' + (nx && nx.key === k ? ' hl' : '') + '"><span><i>' + ICON[k] + '</i>' + n + '</span><b>' + hm(t[k].min) + '</b></div>').join('') + '</section>';
    tick();
  }
  function renderTimes() {
    const p = place(), t = timesFor(dayStart(p, 0), p), t2 = timesFor(dayStart(p, 1), p);
    app.innerHTML = header('اوقات شرعی امروز') +
      '<p class="hint">شهر: ' + esc(p.name) + ' · روش: مؤسسه ژئوفیزیک دانشگاه تهران</p><section class="list big">' +
      PRAYERS.map(([k, n]) => '<div class="row"><span><i>' + ICON[k] + '</i>' + n + '</span><b>' + hm(t[k].min) + '</b></div>').join('') + '</section>' +
      '<h2>فردا</h2><section class="list">' +
      PRAYERS.map(([k, n]) => '<div class="row dim"><span><i>' + ICON[k] + '</i>' + n + '</span><b>' + hm(t2[k].min) + '</b></div>').join('') + '</section>';
  }
  function renderSettings() {
    app.innerHTML = header('تنظیمات') + '<section class="menu">' +
      [['city', ic('pin'), 'انتخاب شهر', place().name], ['azan', ic('sound'), 'تنظیمات اذان', 'روشن/خاموش، صدا، آزمایش'], ['muezzin', ic('mic'), 'مؤذن و فایل صوتی', muezzin().name],
       ['notif', ic('bell'), 'اعلان‌ها', 'قبل از اذان، باتری'], ['about', ic('info'), 'درباره برنامه', '']]
        .map(([id, icn, t, s]) => '<button class="mi" onclick="go(\'' + id + '\')"><i>' + icn + '</i><span><b>' + t + '</b><small>' + esc(s) + '</small></span><em>' + ic('chev') + '</em></button>').join('') + '</section>';
  }
  function renderCity() {
    const c = S.custom;
    app.innerHTML = header('انتخاب شهر', 'settings') + '<input id="cSearch" type="search" placeholder="جستجوی شهر یا استان" autocomplete="off"><section class="menu" id="cList">' +
      CITIES.slice().sort((p, q) => p.name.localeCompare(q.name, 'fa')).map(x => '<button class="mi city' + (!S.custom && S.cityId === x.id ? ' sel' : '') + '" data-city="' + x.id + '" data-search="' + x.name + ' ' + x.prov + '"><span><b>' + x.name + '</b><small>استان ' + x.prov + '</small></span><em>' + (!S.custom && S.cityId === x.id ? ic('check') : '') + '</em></button>').join('') + '</section>' +
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
      '<button class="btn" id="tPlay">' + ic('play') + ' آزمایش صدای اذان</button><button class="btn alt" id="tStop">' + ic('stop') + ' توقف صدا</button><div id="aMsg" class="hint"></div></section>' +
      '<h2>اصلاح دقیقه اوقات</h2><p class="hint">اگر اوقات شهر شما با تقویم رسمی چند دقیقه فرق داشت، همین‌جا هر وقت را کم یا زیاد کنید. اذان و شمارش معکوس هم با همین اصلاح انجام می‌شود.</p><section class="list">' +
      PRAYERS.map(([k, n]) => { const o = S.offsets[k] || 0; return '<div class="row"><span>' + n + '</span><span class="stp"><button class="stb" data-off="' + k + ':-1" aria-label="کم کردن">' + ic('minus') + '</button><b>' + (o > 0 ? '+' : '') + fa(o) + '</b><button class="stb" data-off="' + k + ':1" aria-label="زیاد کردن">' + ic('plus') + '</button></span></div>'; }).join('') + '</section>';
  }
  function renderMuezzin() {
    app.innerHTML = header('مؤذن و فایل صوتی', 'settings') +
      '<p class="hint">اذان پیش‌فرض داخل برنامه است و بدون اینترنت پخش می‌شود. اگر مؤذن دیگری می‌خواهید، فایل صوتی آن را با دکمه «انتخاب فایل» وارد کنید.</p>' +
      S.muezzins.map(m => '<section class="card' + (m.id === S.muezzinId ? ' sel' : '') + '"><h3>' + esc(m.name) + (m.id === S.muezzinId ? ' <small class="badge">انتخاب‌شده</small>' : '') + '</h3><div class="hint">' + (m.path ? 'فایل: ' + esc(m.file || 'انتخاب شده') : 'اذان پیش‌فرض داخل برنامه') + '</div>' +
        '<div class="btns"><button class="btn" data-use="' + m.id + '">استفاده</button><button class="btn alt" data-pick="' + m.id + '">انتخاب فایل</button><button class="btn alt" data-try="' + m.id + '">آزمایش</button>' + (m.path ? '<button class="btn alt" data-clear="' + m.id + '">حذف فایل</button>' : '') +
        (m.id !== 'afasy' ? '<button class="btn danger" data-del="' + m.id + '">حذف</button>' : '') + '</div></section>').join('') +
      '<button class="btn wide" id="mAdd">' + ic('plus') + ' افزودن مؤذن دلخواه</button><button class="btn alt wide" id="mStop">' + ic('stop') + ' توقف صدا</button><div id="mMsg" class="hint"></div>';
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
      el.innerHTML = 'اعلان: <b>' + (s.notifications ? 'فعال' : 'غیرفعال') + '</b><br>بدون محدودیت باتری: <b>' + (s.ignoringBattery ? 'بله' : 'خیر') + '</b>' +
        (s.fullScreen === undefined ? '' : '<br>نمایش اذان روی صفحه قفل: <b>' + (s.fullScreen ? 'مجاز' : 'غیرمجاز') + '</b>' + (s.fullScreen ? '' : '<br><button class="btn" id="nFs" style="margin-top:8px">اجازه نمایش روی صفحه قفل</button>'));
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
    nav.innerHTML = NAV.map(([id, icn, t]) => '<button class="' + (id === top ? 'on' : '') + '" onclick="go(\'' + id + '\')"><i>' + icn + '</i>' + t + '</button>').join('');
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
        const rp = document.getElementById('rp'), pv = prevMs(p);
        if (rp && rp.style) { const fr = pv ? Math.min(1, Math.max(0, (Date.now() - pv) / (nx.ms - pv))) : 0; rp.style.strokeDashoffset = String(339.3 * (1 - fr)); }
        const n = document.getElementById('nxName'), a = document.getElementById('nxAt');
        if (n && n.textContent !== SHORT[nx.key]) renderHome();
        else if (a) a.textContent = 'ساعت ' + hm(nx.min);
      }
    }
  }

  /* ---------- azan screen (shown while the azan is playing) ---------- */
  const ov = document.createElement('div');
  ov.id = 'azanScreen'; ov.hidden = true;
  document.body.appendChild(ov);
  let ovKey = null, ovClosed = null, ovMuted = false, ovBusy = false, ovShown = false, ovDone = false, ovHist = false, ovAwake = false;
  function awake(on) { if (ovAwake !== on) { ovAwake = on; Native.keepAwake(on); } }
  /* Closing = stop the azan, hide the screen. Triggered by the Close button or the phone's Back button. */
  function closeAzan(stopAudio) {
    ovClosed = ovKey; ovKey = null; ovDone = false; ov.hidden = true; ov.className = '';
    awake(false); if (stopAudio !== false) Native.stop();
    if (ovHist) { ovHist = false; try { history.back(); } catch (e) {} }
  }
  window.addEventListener('popstate', () => { ovHist = false; if (!ov.hidden) closeAzan(); });
  async function pollAzan() {
    if (document.hidden || ovBusy) return;
    ovBusy = true;
    try {
      const s = await Native.state();
      if (!s) return;
      const live = s.playing && s.startedAt !== ovClosed;
      if (!live && (ov.hidden || ovKey === null)) return;       // nothing to show
      const p = place(), g = id => document.getElementById(id);
      if (live && ovKey !== s.startedAt) {                      // a new azan started: build the screen
        ovKey = s.startedAt; ovShown = false; ovDone = false; ov.className = '';
        ov.innerHTML = '<div class="ov-wave"></div><div class="ov-wave w2"></div><div class="ov-in"><div class="pill">' + ic('pin') + ' ' + esc(p.name) + '</div><div class="ov-icon">' + ic('moon') + '</div>' +
          '<div class="ov-title">' + (s.name ? 'وقت اذان ' + esc(s.name) : 'آزمایش صدای اذان') + '</div><div id="ovClock" class="ov-clock"></div>' +
          '<div id="ovDate" class="ov-date"></div><div id="ovMsg" class="ov-msg"></div>' +
          '<div class="ov-btns"><button id="ovMute" class="ov-btn">' + ic('soff') + ' قطع صدا</button><button id="ovClose" class="ov-btn alt">' + ic('close') + ' بستن</button></div>' +
          '<div class="ov-hint">با پایان اذان این صفحه خودکار بسته می‌شود. برای بستن زودتر، دکمه بازگشت گوشی یا «بستن» را بزنید.</div></div>';
        ov.hidden = false;
        if (!ovHist) { try { history.pushState({ azan: 1 }, ''); ovHist = true; } catch (e) {} }
      }
      const c = cityNow(p.tz);
      g('ovClock').textContent = fa(p2(c.getUTCHours()) + ':' + p2(c.getUTCMinutes()) + ':' + p2(c.getUTCSeconds()));
      g('ovDate').textContent = dates(p).shamsi;
      if (live) {
        awake(true); ovDone = false; ov.className = ''; ovMuted = !!s.muted;
        g('ovMsg').textContent = ovMuted ? 'صدا قطع شد' : '';
        if (ovShown !== ovMuted) { g('ovMute').innerHTML = ovMuted ? ic('sound') + ' پخش صدا' : ic('soff') + ' قطع صدا'; ovShown = ovMuted; }
      } else {                                                  // azan finished by itself: close the screen automatically
        closeAzan(false);
      }
    } finally { ovBusy = false; }
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
      S.custom = { id: 'custom', name, lat, lng, tz }; save(); msg('cMsg').textContent = 'ذخیره شد';
    }
    if (el.id === 'tPlay') { const r = await Native.play(muezzin().path, S.volume); msg('aMsg').textContent = Native.available() ? (r && r.error ? 'خطا: ' + r.error : (muezzin().path ? 'در حال پخش…' : 'اذان پیش‌فرض برنامه پخش می‌شود.')) : 'پخش صدا فقط روی گوشی ممکن است.'; }
    if (el.id === 'tStop' || el.id === 'mStop') Native.stop();
    if (el.dataset.clear) { const m = S.muezzins.find(x => x.id === el.dataset.clear); if (m) { m.path = ''; m.file = ''; save(); renderMuezzin(); } }
    if (el.dataset.off) { const [k, dd] = el.dataset.off.split(':'); S.offsets[k] = Math.max(-15, Math.min(15, (S.offsets[k] || 0) + Number(dd))); save(); renderAzan(); }
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
    if (el.id === 'ovMute') { await Native.mute(!ovMuted); setTimeout(pollAzan, 300); }
    if (el.id === 'ovClose') closeAzan();
    if (el.id === 'nFs') Native.fullScreenSettings();
    if (el.id === 'nAsk') { await Native.askNotifications(); setTimeout(renderNotif, 800); }
    if (el.id === 'nBat') Native.batterySettings();
    if (el.id === 'nApp') Native.appSettings();
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'cSearch') { const q = e.target.value.trim(); document.querySelectorAll('#cList .mi').forEach(b => { b.style.display = (!q || b.dataset.search.indexOf(q) >= 0) ? '' : 'none'; }); }
    if (e.target.id === 'vol') { S.volume = e.target.value / 100; document.getElementById('volV').textContent = fa(e.target.value) + '٪'; }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'vol') save();
    if (e.target.id === 'pre') { S.pre = parseInt(e.target.value, 10); save(); }
    if (e.target.id === 'hj') { S.hijriOffset = parseInt(e.target.value, 10); save(false); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { schedule(); pollAzan(); if (page === 'home') renderHome(); } });

  render(); schedule();
  setInterval(tick, 1000);
  setInterval(pollAzan, 1000);
  if (Native.available()) Native.askNotifications();
})();
