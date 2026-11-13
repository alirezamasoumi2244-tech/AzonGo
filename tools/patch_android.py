#!/usr/bin/env python3
"""Overlays AzanGo's Kotlin sources onto the Capacitor-generated android/ project. Safe to run repeatedly."""
import json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "android")
if not os.path.isdir(A):
    sys.exit("android/ not found. Run: npx cap add android")

app_id = json.load(open(os.path.join(ROOT, "capacitor.config.json")))["appId"]
pkg_dir = os.path.join(A, "app/src/main/java", *app_id.split("."))
os.makedirs(pkg_dir, exist_ok=True)

# 1) Kotlin sources (replace Java MainActivity)
for f in os.listdir(os.path.join(ROOT, "native/kotlin")):
    if f.endswith(".kt"):
        txt = open(os.path.join(ROOT, "native/kotlin", f), encoding="utf-8").read()
        txt = txt.replace("package ir.azango.app", "package " + app_id).replace("ir.azango.app.", app_id + ".")
        open(os.path.join(pkg_dir, f), "w", encoding="utf-8").write(txt)
# built-in azan audio -> res/raw
raw_src = os.path.join(ROOT, "native/res/raw")
if os.path.isdir(raw_src):
    raw_dst = os.path.join(A, "app/src/main/res/raw")
    os.makedirs(raw_dst, exist_ok=True)
    for f in os.listdir(raw_src):
        shutil.copy2(os.path.join(raw_src, f), os.path.join(raw_dst, f))

java_main = os.path.join(pkg_dir, "MainActivity.java")
if os.path.exists(java_main):
    os.remove(java_main)

# 2) AndroidManifest.xml
mp = os.path.join(A, "app/src/main/AndroidManifest.xml")
m = open(mp, encoding="utf-8").read()
if "AzanReceiver" not in m:
    perms = open(os.path.join(ROOT, "native/manifest_permissions.xml"), encoding="utf-8").read()
    comps = open(os.path.join(ROOT, "native/manifest_components.xml"), encoding="utf-8").read().replace("ir.azango.app.", app_id + ".")
    m = m.replace("</application>", comps + "    </application>", 1)
    m = m.replace("</manifest>", perms + "</manifest>", 1)
    m = m.replace("<application", '<application android:supportsRtl="true"', 1) if "supportsRtl" not in m else m
    open(mp, "w", encoding="utf-8").write(m)

# 3) Gradle: enable Kotlin
rg = os.path.join(A, "build.gradle")
g = open(rg, encoding="utf-8").read()
if "kotlin-gradle-plugin" not in g:
    g, n = re.subn(r"(\n\s*classpath\s+['\"]com\.android\.tools\.build:gradle:[^'\"]+['\"])",
                   r"\1\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22'", g, count=1)
    if n == 0:
        sys.exit("Could not patch android/build.gradle - add the Kotlin classpath manually (see README).")
    open(rg, "w", encoding="utf-8").write(g)

ag = os.path.join(A, "app/build.gradle")
b = open(ag, encoding="utf-8").read()
if "kotlin-android" not in b:
    b = re.sub(r"(apply plugin:\s*['\"]com\.android\.application['\"])", r"\1\napply plugin: 'kotlin-android'", b, count=1)
    b += "\nandroid {\n    kotlinOptions { jvmTarget = '17' }\n}\n"
    open(ag, "w", encoding="utf-8").write(b)

# 4) App name
sp = os.path.join(A, "app/src/main/res/values/strings.xml")
if os.path.exists(sp):
    s = open(sp, encoding="utf-8").read()
    s = re.sub(r'(<string name="app_name">)[^<]*(</string>)', r"\1اذان‌گو\2", s)
    s = re.sub(r'(<string name="title_activity_main">)[^<]*(</string>)', r"\1اذان‌گو\2", s)
    open(sp, "w", encoding="utf-8").write(s)

# 5) App icon from native/res/icon.png → all mipmap densities + adaptive icon
icon_src = os.path.join(ROOT, "native/res/icon.png")
if os.path.isfile(icon_src):
    try:
        from PIL import Image
        # Capacitor/Android launcher sizes (px)
        sizes = {
            "mipmap-mdpi": 48,
            "mipmap-hdpi": 72,
            "mipmap-xhdpi": 96,
            "mipmap-xxhdpi": 144,
            "mipmap-xxxhdpi": 192,
        }
        # Adaptive foreground is 108dp; safe zone is center 72dp. Use full art scaled.
        adaptive_sizes = {
            "mipmap-mdpi": 108,
            "mipmap-hdpi": 162,
            "mipmap-xhdpi": 216,
            "mipmap-xxhdpi": 324,
            "mipmap-xxxhdpi": 432,
        }
        img = Image.open(icon_src).convert("RGBA")
        res_root = os.path.join(A, "app/src/main/res")
        for folder, sz in sizes.items():
            d = os.path.join(res_root, folder)
            os.makedirs(d, exist_ok=True)
            scaled = img.resize((sz, sz), Image.Resampling.LANCZOS)
            scaled.save(os.path.join(d, "ic_launcher.png"), "PNG")
            scaled.save(os.path.join(d, "ic_launcher_round.png"), "PNG")
            scaled.save(os.path.join(d, "ic_launcher_foreground.png"), "PNG")
        for folder, sz in adaptive_sizes.items():
            d = os.path.join(res_root, folder)
            os.makedirs(d, exist_ok=True)
            # Slightly larger foreground so the mosque fills the adaptive safe zone
            fg = img.resize((sz, sz), Image.Resampling.LANCZOS)
            fg.save(os.path.join(d, "ic_launcher_foreground.png"), "PNG")
        # Adaptive icon XML (Android 8+)
        anydpi = os.path.join(res_root, "mipmap-anydpi-v26")
        os.makedirs(anydpi, exist_ok=True)
        # Background color matching the icon (deep green)
        values = os.path.join(res_root, "values")
        os.makedirs(values, exist_ok=True)
        colors_path = os.path.join(values, "ic_launcher_background.xml")
        if not os.path.isfile(os.path.join(values, "colors.xml")):
            open(os.path.join(values, "colors.xml"), "w", encoding="utf-8").write(
                '<?xml version="1.0" encoding="utf-8"?>\n'
                '<resources>\n'
                '    <color name="ic_launcher_background">#05221a</color>\n'
                '</resources>\n'
            )
        else:
            c = open(os.path.join(values, "colors.xml"), encoding="utf-8").read()
            if "ic_launcher_background" not in c:
                c = c.replace("</resources>", '    <color name="ic_launcher_background">#05221a</color>\n</resources>')
                open(os.path.join(values, "colors.xml"), "w", encoding="utf-8").write(c)
        adaptive_xml = (
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@color/ic_launcher_background"/>\n'
            '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
            '</adaptive-icon>\n'
        )
        open(os.path.join(anydpi, "ic_launcher.xml"), "w", encoding="utf-8").write(adaptive_xml)
        open(os.path.join(anydpi, "ic_launcher_round.xml"), "w", encoding="utf-8").write(adaptive_xml)
        print("App icon applied from native/res/icon.png")
    except Exception as e:
        print("Warning: could not generate icons:", e)
else:
    print("No native/res/icon.png — keeping Capacitor default icon")

print("AzanGo native overlay applied for", app_id)
