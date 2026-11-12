"""Android APK of Робогочи: the portrait WebView shell in android/ + dist/robogochie.html packed into assets/www.

Adapted from LE FINAL BOSS tools/build_android.py. No Gradle, no network:
aapt2 -> javac -> d8 -> zipalign -> apksigner. Android tools choke on Cyrillic paths, so everything runs in
an ASCII stage folder Playground/_rg_android/<version>/.

    node build.mjs && python tools/build_android.py 0.1.0

Output: builds/robogochi-<version>.apk (install: adb install -r ...).
The release keystore is android/keystore/ (keep a backup if this ever goes to Google Play).
"""
import glob
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import zipfile

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYGROUND = os.path.abspath(os.path.join(ROOT, "..", "..", "..", ".."))
ANDROID = os.path.join(ROOT, "android")
KEYDIR = os.path.join(ANDROID, "keystore")
OUT = os.path.join(ROOT, "builds")
SDK = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Android", "Sdk")
MIN_SDK, TARGET_SDK = 24, 36
SECRETS = []
ICON_BG = (158, 136, 232, 255)  # = ic_bg in android/res/values/strings.xml


def run(cmd, cwd=None, env=None):
    shown = " ".join(os.path.basename(c) if i == 0 else c for i, c in enumerate(cmd))
    for sec in SECRETS:
        shown = shown.replace(sec, "***")
    print("  $", shown[:200])
    r = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print(r.stdout[-3000:])
        print(r.stderr[-3000:])
        sys.exit(f"failed: {cmd[0]}")
    return r.stdout


def build_tools():
    best = None
    key = lambda p: [int(x) if x.isdigit() else 0 for x in re.split(r"[.\-]", os.path.basename(p))]
    for d in sorted(glob.glob(os.path.join(SDK, "build-tools", "*")), key=key):
        if all(os.path.exists(os.path.join(d, f)) for f in ("aapt2.exe", "d8.bat", "zipalign.exe", "apksigner.bat")):
            best = d
    if not best:
        sys.exit("Android build-tools not found in " + SDK)
    return best


def android_jar():
    for api in (TARGET_SDK, 35):
        p = os.path.join(SDK, "platforms", f"android-{api}", "android.jar")
        if os.path.exists(p):
            return p
    sys.exit("android.jar not found")


def keystore():
    os.makedirs(KEYDIR, exist_ok=True)
    jks = os.path.join(KEYDIR, "robogochi-release.jks")
    props = os.path.join(KEYDIR, "keystore.json")
    if not os.path.exists(jks):
        pw = secrets.token_urlsafe(18)
        SECRETS.append(pw)
        info = {"store": "robogochi-release.jks", "alias": "robogochi", "password": pw,
                "note": "Release key of Робогочи. Keep a backup: Google Play updates need this exact key."}
        tmp = os.path.join(PLAYGROUND, "_rg_android", "new.jks")
        os.makedirs(os.path.dirname(tmp), exist_ok=True)
        if os.path.exists(tmp):
            os.remove(tmp)
        run(["keytool", "-genkeypair", "-keystore", tmp, "-alias", info["alias"], "-keyalg", "RSA", "-keysize", "2048",
             "-validity", "10000", "-storepass", pw, "-keypass", pw,
             "-dname", "CN=Toysberry Game Studio, O=Toysberry, C=RU"])
        shutil.move(tmp, jks)
        json.dump(info, open(props, "w", encoding="utf-8"), indent=1)
        print("  new release keystore:", jks)
    info = json.load(open(props, encoding="utf-8"))
    SECRETS.append(info["password"])
    return jks, info


def icons(res_dir):
    art = Image.open(os.path.join(ROOT, "assets", "icon_art.png")).convert("RGBA")
    for name, size in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
        d = os.path.join(res_dir, "mipmap-" + name)
        os.makedirs(d, exist_ok=True)
        icon = Image.new("RGBA", (size, size), ICON_BG)
        icon.alpha_composite(art.resize((size, size), Image.LANCZOS))
        icon.save(os.path.join(d, "ic_launcher.png"))
        fg_size = int(size * 108 / 48)  # adaptive icon: the mask shows the middle 72 of 108 dp
        inner = round(fg_size * 72 / 108)
        fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        fg.alpha_composite(art.resize((inner, inner), Image.LANCZOS), ((fg_size - inner) // 2, (fg_size - inner) // 2))
        fg.save(os.path.join(d, "ic_launcher_fg.png"))


def main():
    ver = sys.argv[1] if len(sys.argv) > 1 else "0.1.0"
    major, minor, patch = (int(x) for x in ver.split("."))
    code = major * 10000 + minor * 100 + patch
    bt, jar = build_tools(), android_jar()
    print(f"Робогочи {ver} (versionCode {code}); build-tools {os.path.basename(bt)}")
    html = os.path.join(ROOT, "dist", "robogochie.html")
    if not os.path.exists(html):
        sys.exit("run `node build.mjs` first")
    stage = os.path.join(PLAYGROUND, "_rg_android", ver)
    if os.path.isdir(stage):
        shutil.rmtree(stage)
    os.makedirs(os.path.join(stage, "assets", "www"))
    shutil.copyfile(os.path.join(ANDROID, "AndroidManifest.xml"), os.path.join(stage, "AndroidManifest.xml"))
    shutil.copytree(os.path.join(ANDROID, "res"), os.path.join(stage, "res"))
    shutil.copytree(os.path.join(ANDROID, "src"), os.path.join(stage, "src"))
    icons(os.path.join(stage, "res"))
    shutil.copyfile(html, os.path.join(stage, "assets", "www", "index.html"))
    jks, ks = keystore()
    shutil.copyfile(jks, os.path.join(stage, "release.jks"))
    aapt2 = os.path.join(bt, "aapt2.exe")
    run([aapt2, "compile", "--dir", "res", "-o", "res.zip"], cwd=stage)
    run([aapt2, "link", "-I", jar, "--manifest", "AndroidManifest.xml", "-A", "assets",
         "--min-sdk-version", str(MIN_SDK), "--target-sdk-version", str(TARGET_SDK),
         "--version-code", str(code), "--version-name", ver, "res.zip", "-o", "linked.apk"], cwd=stage)
    srcs = glob.glob(os.path.join(stage, "src", "**", "*.java"), recursive=True)
    run(["javac", "-source", "8", "-target", "8", "-bootclasspath", jar, "-encoding", "UTF-8", "-nowarn",
         "-Xlint:-options", "-d", "classes"] + srcs, cwd=stage)
    classes = glob.glob(os.path.join(stage, "classes", "**", "*.class"), recursive=True)
    os.makedirs(os.path.join(stage, "dex"))
    run([os.path.join(bt, "d8.bat"), "--release", "--lib", jar, "--min-api", str(MIN_SDK), "--output", "dex"] + classes, cwd=stage)
    shutil.copyfile(os.path.join(stage, "linked.apk"), os.path.join(stage, "unaligned.apk"))
    with zipfile.ZipFile(os.path.join(stage, "unaligned.apk"), "a", zipfile.ZIP_DEFLATED) as z:
        z.write(os.path.join(stage, "dex", "classes.dex"), "classes.dex")
    run([os.path.join(bt, "zipalign.exe"), "-p", "-f", "4", "unaligned.apk", "aligned.apk"], cwd=stage)
    env = dict(os.environ, RG_KS_PASS=ks["password"])
    run([os.path.join(bt, "apksigner.bat"), "sign", "--ks", "release.jks", "--ks-key-alias", ks["alias"],
         "--ks-pass", "env:RG_KS_PASS", "--key-pass", "env:RG_KS_PASS", "--out", "signed.apk", "aligned.apk"], cwd=stage, env=env)
    run([os.path.join(bt, "apksigner.bat"), "verify", "signed.apk"], cwd=stage)
    os.makedirs(OUT, exist_ok=True)
    apk = os.path.join(OUT, f"robogochi-{ver}.apk")
    shutil.copyfile(os.path.join(stage, "signed.apk"), apk)
    print(f"APK {apk} {os.path.getsize(apk) / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
