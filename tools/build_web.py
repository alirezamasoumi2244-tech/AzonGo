#!/usr/bin/env python3
"""Builds the single-file browser version: web/AzanGo.html (UI from www/, browser bridge from web/native-web.js)."""
import os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
r = lambda p: open(os.path.join(R, p), encoding='utf-8').read()
app = r('www/js/app.js')
def rep(old, new):
    global app
    assert app.count(old) == 1, old[:50]
    app = app.replace(old, new)
rep("    tick();\n  }\n  function renderTimes",
    "    app.insertAdjacentHTML('beforeend', '<p class=\"hint\">توجه: این نسخه وب است: برای پخش خودکار اذان، این صفحه باید باز بماند و صفحه گوشی قفل نشود (در «اعلان‌ها» گزینه روشن ماندن صفحه را بزنید). اگر گوشی قفل شود یا مرورگر بسته شود، اذان پخش نمی‌شود.</p>');\n    tick();\n  }\n  function renderTimes")
rep('<button class="btn" id="nBat">خارج کردن از محدودیت باتری</button><button class="btn alt" id="nApp">تنظیمات برنامه در اندروید</button>',
    '<button class="btn" id="nBat">روشن نگه داشتن صفحه (فعال/غیرفعال)</button>')
i = app.index("'<p class=\"hint\">در گوشی‌های سامسونگ"); j = app.index("</p>';", i) + len("</p>';")
app = app[:i] + "'<p class=\"hint\">اعلان مرورگر روی بعضی گوشی‌ها کار نمی‌کند؛ پخش صدا و صفحه اذان داخل همین صفحه همیشه کار می‌کند. روشن ماندن صفحه باعث می‌شود گوشی قفل نشود و مصرف باتری بیشتر شود؛ بهتر است گوشی به شارژر وصل باشد.</p>';" + app[j:]
rep("بدون محدودیت باتری: <b>", "صفحه روشن می‌ماند: <b>")
rep("if (el.id === 'nBat') Native.batterySettings();", "if (el.id === 'nBat') { await Native.batterySettings(); renderNotif(); }")
rep("  if (Native.available()) Native.askNotifications();\n", "  document.addEventListener('click', () => Native.askNotifications(), { once: true });\n")
scripts = [r('www/js/praytimes.js'), r('www/js/cities.js'), r('web/native-web.js'), app]
import base64
audio = base64.b64encode(open(os.path.join(R, 'web/azan_web.mp3'), 'rb').read()).decode()
audio_script = "window.AZAN_DEFAULT = 'data:audio/mpeg;base64," + audio + "';"
html = ('<!doctype html>\n<html lang="fa" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#05221a">\n'
        '<title>اذان‌گو</title>\n<style>\n' + r('www/css/style.css') + '\n</style>\n</head>\n<body>\n<main id="app" class="enter"></main>\n<nav id="nav"></nav>\n'
        + '<script>\n' + audio_script + '\n</script>\n' + ''.join('<script>\n' + s + '\n</script>\n' for s in scripts) + '</body>\n</html>\n')
open(os.path.join(R, 'web/AzanGo.html'), 'w', encoding='utf-8').write(html)
open(os.path.join(R, 'web/_check.js'), 'w', encoding='utf-8').write('\n'.join(scripts))
print('web/AzanGo.html', len(html), 'bytes')
