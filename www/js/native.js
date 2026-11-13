/* Thin wrapper around the Kotlin plugin "AzanPlugin". Works as a no-op in a normal browser. */
(function () {
  const P = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AzanPlugin) || null;
  const call = async (name, args) => {
    const p = P();
    if (!p || !p[name]) return null;
    try { return await p[name](args || {}); } catch (e) { console.warn('AzanPlugin.' + name, e); return { error: String(e && e.message || e) }; }
  };
  window.Native = {
    available: () => !!P(),
    schedule: (events, config) => call('schedule', { events: JSON.stringify(events), config: JSON.stringify(config) }),
    importAudio: id => call('importAudio', { id }),
    play: (path, volume) => call('play', { path: path || '', volume }),
    stop: () => call('stop'),
    status: () => call('status'),
    askNotifications: () => call('askNotifications'),
    batterySettings: () => call('batterySettings'),
    appSettings: () => call('appSettings'),
    state: () => call('state'),
    mute: on => call('mute', { on: !!on }),
    fullScreenSettings: () => call('fullScreenSettings'),
    keepAwake: on => call('keepAwake', { on: !!on })
  };
})();
