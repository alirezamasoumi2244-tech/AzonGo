/* Browser replacement for the Android plugin: same API as native.js, but everything runs inside the page. */
(function () {
  const LAST = 'azango.last', WL = 'azango.wl';
  let events = [], cfg = {}, audio = null, objUrl = null, wake = null, chimeCtx = null;
  let curName = '', startedAt = 0, muted = false, chimeUntil = 0;
  let last = +(localStorage.getItem(LAST) || 0);

  /* ---- audio files stored in IndexedDB (survive closing the browser) ---- */
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('azango-audio', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const idbGet = async k => { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction('f').objectStore('f').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
  const idbPut = async (k, v) => { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction('f', 'readwrite').objectStore('f').put(v, k); q.onsuccess = () => res(); q.onerror = () => rej(q.error); }); };


  function chime(vol) {            // simple fallback tone when no audio file was chosen
    chimeUntil = Date.now() + 3200;
    try {
      chimeCtx = chimeCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = chimeCtx.currentTime;
      [523.25, 659.25, 783.99, 659.25, 523.25].forEach((f, i) => {
        const o = chimeCtx.createOscillator(), g = chimeCtx.createGain();
        o.frequency.value = f; o.connect(g); g.connect(chimeCtx.destination);
        g.gain.setValueAtTime(0.0001, t0 + i * 0.6); g.gain.exponentialRampToValueAtTime(vol * 0.6, t0 + i * 0.6 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.6 + 0.55);
        o.start(t0 + i * 0.6); o.stop(t0 + i * 0.6 + 0.6);
      });
    } catch (e) { /* ignore */ }
  }

  async function play(path, volume, name) {
    stop();
    const vol = Math.min(1, Math.max(0.05, volume || 0.8));
    curName = name || ''; startedAt = Date.now(); muted = false;
    if (path && path.indexOf('idb:') === 0) {
      try {
        const blob = await idbGet(path.slice(4));
        if (blob) {
          objUrl = URL.createObjectURL(blob);
          audio = new Audio(objUrl); audio.volume = vol;
          audio.onended = stop; audio.onerror = () => { stop(); chime(vol); };
          await audio.play();
          return {};
        }
      } catch (e) {
        stop(); chime(vol);
        return { error: 'پخش فایل ممکن نشد؛ یک بار صفحه را لمس کنید و دوباره امتحان کنید.' };
      }
    }
    if (window.AZAN_DEFAULT) {                    // built-in azan (embedded in this file)
      try {
        audio = new Audio(window.AZAN_DEFAULT); audio.volume = vol;
        audio.onended = stop; audio.onerror = () => { stop(); chime(vol); };
        await audio.play();
        return {};
      } catch (e) { stop(); chime(vol); return { error: 'پخش اذان ممکن نشد؛ یک بار صفحه را لمس کنید و دوباره امتحان کنید.' }; }
    }
    chime(vol);
    return {};
  }
  function stop() {
    if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
    if (objUrl) { URL.revokeObjectURL(objUrl); objUrl = null; }
    chimeUntil = 0; muted = false;
    if (chimeCtx) { try { chimeCtx.close(); } catch (e) {} chimeCtx = null; }
    return {};
  }

  function notify(title, body) {
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, lang: 'fa', dir: 'rtl' }); } catch (e) { /* Android Chrome blocks this form */ }
    try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) {}
  }

  /* ---- scheduler: checked every second while the page is alive ---- */
  setInterval(() => {
    const now = Date.now();
    let due = null;
    for (const ev of events) if (ev.t > last && ev.t <= now && now - ev.t < 120000) { if (!due || ev.t > due.t) due = ev; }
    if (!due) return;
    last = due.t; localStorage.setItem(LAST, String(last));
    if (due.type === 'pre') notify('اذان ' + due.name + ' نزدیک است', due.min + ' دقیقه تا اذان ' + due.name);
    else { notify('وقت اذان ' + due.name, 'اذان‌گو'); play(cfg.path, cfg.volume, due.name); }
  }, 1000);

  async function wakeOn() {
    try { if ('wakeLock' in navigator) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); localStorage.setItem(WL, '1'); } } catch (e) { wake = null; }
  }
  function wakeOff() { try { if (wake) wake.release(); } catch (e) {} wake = null; localStorage.removeItem(WL); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && localStorage.getItem(WL) && !wake) wakeOn(); });
  if (localStorage.getItem(WL)) document.addEventListener('click', () => { if (!wake) wakeOn(); }, { once: true });

  window.Native = {
    available: () => true,
    schedule: async (ev, c) => { events = ev || []; cfg = c || {}; return { count: events.length }; },
    importAudio: id => new Promise(resolve => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'audio/*,.mp3,.m4a,.ogg,.wav,.aac';
      inp.onchange = async () => {
        const f = inp.files && inp.files[0];
        if (!f) return resolve({ error: 'انتخاب لغو شد' });
        try { await idbPut(id, f); resolve({ path: 'idb:' + id, name: f.name }); }
        catch (e) { resolve({ error: 'ذخیره فایل ممکن نشد (حافظه مرورگر)' }); }
      };
      inp.addEventListener('cancel', () => resolve({ error: 'انتخاب لغو شد' }));
      inp.click();
    }),
    play: (path, volume) => play(path, volume, ''),
    stop: async () => stop(),
    status: async () => ({ notifications: 'Notification' in window && Notification.permission === 'granted', ignoringBattery: !!wake }),
    askNotifications: async () => { try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch (e) {} return {}; },
    batterySettings: async () => { if (wake) wakeOff(); else await wakeOn(); return {}; },
    appSettings: async () => ({}),
    fullScreenSettings: async () => ({}),
    keepAwake: async () => ({}),
    state: async () => ({ playing: !!audio || Date.now() < chimeUntil, muted, name: curName, startedAt }),
    mute: async on => {
      muted = !!on;
      if (audio) audio.muted = muted;
      if (chimeCtx) { try { muted ? chimeCtx.suspend() : chimeCtx.resume(); } catch (e) {} }
      return {};
    }
  };
})();
