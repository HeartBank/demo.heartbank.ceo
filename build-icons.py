#!/usr/bin/env python3
"""The front door's favicon set and web app manifest (/build Default 7), drawn from the brand layer's emblem — never a
hand-made heart.

    python3 build-icons.py

Writes favicon.svg · favicon-96x96.png · apple-touch-icon.png (180) · icon-192.png · icon-512.png · site.webmanifest, and
STAMPS every PNG (register M-0026; /media), so a rebuilt icon is never an undeclared file. Adapted 2026-11-26 from
demo.333.eco's build-icons.py for roadmap A477. The mark is drawn by its own box (brand.json mark.geometry: viewBox
3.6824 2.2349 18.0828 18.0851, the 45-degree turn already in the path), never by a transform. The PNGs are screenshots of
one HTML tile in headless Chrome, so they cannot drift from the SVG.
"""
import io, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
MA = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
STAMP = os.path.join(MA, ".claude", "skills", "media", "scripts", "stamp.py")
# the emblem: this repo's vendored brand layer where it has one, else the canonical copy in brand.333.eco
_VENDORED = os.path.join(HERE, "brand", "emblem.path.txt")
_CANON = os.path.join(MA, "333", "333.eco", "brand.333.eco", "emblem", "emblem.path.txt")
EMBLEM = io.open(_VENDORED if os.path.exists(_VENDORED) else _CANON, encoding="utf-8").read().strip()
BOX = "3.6824 2.2349 18.0828 18.0851"

SITE = {
 "accent": "#15803d",
 "bg": "#fcfbfe",
 "url": "https://demo.heartbank.ceo/",
 "name": "HeartBank® Shops: design",
 "short": "demo.heartbank.ceo",
 "desc": "A storefront platform, drawn screen by screen. Nothing in it charges anyone."
}

BG = SITE["bg"]
ACCENT = SITE["accent"]
# the mark centered in a 24-unit tile at 0.82 of its box (the size demo.333.eco's icons draw it)
GLYPH = ('<svg x="4.6" y="4.6" width="14.8" height="14.8" viewBox="%s"><path d="%s" fill="%s"/></svg>' % (BOX, EMBLEM, ACCENT))

svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="%s"/>%s</svg>'
       % (BG, GLYPH))
io.open(os.path.join(HERE, "favicon.svg"), "w", encoding="utf-8").write(svg + "\n")

if not os.path.exists(CHROME):
    sys.exit("Chrome not found at %s" % CHROME)
for name, px, pad in (("favicon-96x96.png", 96, 0), ("apple-touch-icon.png", 180, .12), ("icon-192.png", 192, .12),
                      ("icon-512.png", 512, .12)):
    tile = ('<!doctype html><html><body style="margin:0;background:%s">'
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" width="%d" height="%d">%s</svg></body></html>'
            % (BG, -24 * pad, -24 * pad, 24 * (1 + 2 * pad), 24 * (1 + 2 * pad), px, px, GLYPH))
    out = os.path.join(HERE, name)
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "t.html")
        io.open(src, "w", encoding="utf-8").write(tile)
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                        "--window-size=%d,%d" % (px, px), "--screenshot=" + out, "file://" + src],
                       check=True, capture_output=True)
    subprocess.run(["python3", STAMP, out, "--source", "drawn", "--rights", "reserved", "--register", "M-0026",
                    "--disclosure", SITE["url"], "--note", "the demo site's icon: the B-Emblem in its accent, drawn by code"],
                   check=True, capture_output=True)
    print("%-22s %6d bytes, stamped M-0026" % (name, os.path.getsize(out)))

manifest = {
    "name": SITE["name"], "short_name": SITE["short"], "description": SITE["desc"],
    "start_url": "./", "scope": "./", "display": "standalone",
    "background_color": BG, "theme_color": ACCENT,
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
              {"src": "favicon.svg", "sizes": "any", "type": "image/svg+xml"}],
}
io.open(os.path.join(HERE, "site.webmanifest"), "w", encoding="utf-8").write(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print("site.webmanifest written")
