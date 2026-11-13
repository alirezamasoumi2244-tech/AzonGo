#!/usr/bin/env python3
"""Builds the single-file browser version: web/AzanGo.html (UI from www/, browser bridge from web/native-web.js)."""
import os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
r = lambda p: open(os.path.join(R, p), encoding='utf-8').read()
app = r('www/js/app.js')

def rep(old, new, required=True):
    global app
    n = app.count(old)
    if required:
        assert n == 1, 'expected 1 occurrence of %r, found %d' % (old[:60], n)
    if n:
        app = app.replace(old, new)

# Web-only hint on home screen
rep("    tick();\n  }\n  function renderTimes",
    "    app.insertAdjacentHTML('beforeend', '<p class=\"hint\">توجه: این نسخه وب است: برای پخش خودکار اذان، این صفحه باید باز بماند و صفحه گوشی قفل نشود (در «اعلان‌ها» گزینه روشن ماندن صفحه را بزنید). اگر گوشی قفل شود یا مرورگر بسته شود، اذان پخش نمی‌شود.</p>');\n    tick();\n  }\n  function renderTimes")

# Notif page battery buttons → keep-awake toggle
rep('<button class="btn" id="nBat">خارج کردن از محدودیت باتری</button><button class="btn alt" id="nApp">تنظیمات برنامه در اندروید</button>',
    '<button class="btn" id="nBat">روشن نگه داشتن صفحه (فعال/غیرفعال)</button>')

# Setup page battery button
rep('<button class="btn alt" id="nBat">خارج کردن از محدودیت باتری</button>',
    '<button class="btn alt" id="nBat">روشن نگه داشتن صفحه (فعال/غیرفعال)</button>')

# Samsung autostart hint on notif page → web-friendly text
i = app.find("'<p class=\"hint\">در گوشی‌های سامسونگ")
if i >= 0:
    j = app.index("</p>';", i) + len("</p>';")
    app = app[:i] + "'<p class=\"hint\">اعلان مرورگر روی بعضی گوشی‌ها کار نمی‌کند؛ پخش صدا و صفحه اذان داخل همین صفحه همیشه کار می‌کند. روشن ماندن صفحه باعث می‌شود گوشی قفل نشود و مصرف باتری بیشتر شود؛ بهتر است گوشی به شارژر وصل باشد.</p>';" + app[j:]

# Status labels
rep("بدون محدودیت باتری: <b>", "صفحه روشن می‌ماند: <b>", required=False)

# nBat handler (may span multiple lines after our edits)
old_nbat = """    if (el.id === 'nBat') {
      Native.batterySettings();
      setTimeout(() => { if (page === 'setup') renderSetup(); else if (page === 'notif') renderNotif(); }, 1200);
    }"""
new_nbat = """    if (el.id === 'nBat') {
      await Native.batterySettings();
      if (page === 'setup') renderSetup(); else if (page === 'notif') renderNotif();
    }"""
if old_nbat in app:
    app = app.replace(old_nbat, new_nbat)
else:
    # fallback for older single-line form
    rep("if (el.id === 'nBat') Native.batterySettings();",
        "if (el.id === 'nBat') { await Native.batterySettings(); if (page === 'setup') renderSetup(); else if (page === 'notif') renderNotif(); }",
        required=False)

# Notifications: request on first user gesture (browser policy)
# (native askNotifications is already called from the setup / notif buttons)

scripts = [r('www/js/praytimes.js'), r('www/js/cities.js'), r('web/native-web.js'), app]
import base64
audio_path = os.path.join(R, 'web/azan_web.mp3')
if not os.path.isfile(audio_path):
    # fallback: no embedded audio if the mp3 is missing
    audio_script = "window.AZAN_DEFAULT = '';"
else:
    audio = base64.b64encode(open(audio_path, 'rb').read()).decode()
    audio_script = "window.AZAN_DEFAULT = 'data:audio/mpeg;base64," + audio + "';"
html = ('<!doctype html>\n<html lang="fa" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#05221a">\n'
        '<title>اذان‌گو</title>\n<style>\n' + r('www/css/style.css') + '\n</style>\n</head>\n<body>\n<main id="app" class="enter"></main>\n<nav id="nav"></nav>\n'
        + '<script>\n' + audio_script + '\n</script>\n' + ''.join('<script>\n' + s + '\n</script>\n' for s in scripts) + '</body>\n</html>\n')
open(os.path.join(R, 'web/AzanGo.html'), 'w', encoding='utf-8').write(html)
open(os.path.join(R, 'web/_check.js'), 'w', encoding='utf-8').write('\n'.join(scripts))
print('web/AzanGo.html', len(html), 'bytes')
