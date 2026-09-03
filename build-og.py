#!/usr/bin/env python3
"""Render the Open Graph link-preview cards to PNG.

    python3 build-og.py     ->  og.png  and  og-walkthrough.png

Both are 1200x630, the size every platform crops from. They are rendered by
headless Chrome from the same tokens, fonts and emblem path the site uses, so a
preview card cannot drift from the pages it advertises — the alternative is a
hand-made image that silently goes stale.

Chrome needs the network on the first run (Google Fonts). If it is offline the
cards still render, in the fallback stack, and look wrong: check before shipping.
"""
import io, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

EMBLEM = ("M3.9743 20.0257L3.8824 18.0670C3.5430 11.1232 3.3167 6.5411 5.9896 3.8683C8.1675 "
          "1.6904 11.5899 1.6904 13.7678 3.8683C14.9981 5.0986 15.6062 6.8523 15.4719 8.5281C17.1477 "
          "8.3938 18.9014 9.0019 20.1317 10.2322C22.3096 12.4101 22.3096 15.8325 20.1317 18.0104C17.4589 "
          "20.6833 12.8768 20.4570 5.9260 20.1247L3.9743 20.0257Z")

SHELL = """<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+Khmer:wght@400;600&display=swap">
<style>
  *{box-sizing:border-box;margin:0}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{background:#0a0a0f;color:#f5f5f7;
       font-family:"IBM Plex Sans",system-ui,sans-serif;
       display:flex;flex-direction:column;justify-content:center;
       padding:0 92px;position:relative;-webkit-font-smoothing:antialiased}
  /* one soft accent bloom, bottom-left, so the card is not a flat rectangle */
  body::before{content:"";position:absolute;left:-160px;bottom:-260px;width:760px;height:760px;
       border-radius:50%;background:radial-gradient(circle,rgba(63,165,100,.20),transparent 62%)}
  .inner{position:relative}
  h1{font-family:"Newsreader",Georgia,serif;font-weight:600;letter-spacing:-.022em;
     line-height:1.03;margin-bottom:26px}
  .em{display:inline-block;vertical-align:-.141em;color:#3fa564;
      margin-left:-.09em;margin-right:-.04em}
  .reg{font-size:.34em;vertical-align:1.3em;font-weight:500;margin-left:.06em}
  p{font-size:30px;line-height:1.5;color:#9b9ba5;max-width:23ch}
  .km{font-family:"Noto Sans Khmer","IBM Plex Sans",sans-serif}
  .foot{position:absolute;left:92px;bottom:56px;display:flex;align-items:center;gap:14px;
        font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:22px;color:#3fa564}
  .rule{width:52px;height:2px;background:#3fa564;opacity:.5}
</style></head><body>{BODY}
<div class="foot"><span class="rule"></span>demo.heartbank.ceo</div>
</body></html>"""


def emblem(size_em=".92em"):
    return ('<svg class="em" viewBox="0 0 24 24" style="width:%s;height:%s">'
            '<path fill="currentColor" d="%s"/></svg>' % (size_em, size_em, EMBLEM))


CARDS = {
    "og.png": '<div class="inner">'
              '<h1 style="font-size:96px">Heart' + emblem() + 'ank'
              '<span class="reg">&#174;</span> Shops</h1>'
              '<p>A storefront platform, drawn screen by screen. '
              'Home Coffee is the first shop.</p></div>',

    "og-walkthrough.png": '<div class="inner">'
              '<p class="km" style="font-size:34px;color:#3fa564;margin-bottom:12px">កាហ្វេផ្ទះ</p>'
              '<h1 style="font-size:104px">Home Coffee</h1>'
              '<p>Order it, make it, ride it across town — three roles, one order. '
              'Nothing here charges anyone.</p></div>',
}


def main():
    if not os.path.exists(CHROME):
        sys.exit("Chrome not found at %s — render the cards elsewhere." % CHROME)
    for name, body in CARDS.items():
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "card.html")
            io.open(src, "w", encoding="utf-8").write(SHELL.replace("{BODY}", body))
            out = os.path.join(HERE, name)
            subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                            "--force-device-scale-factor=1", "--window-size=1200,630",
                            "--virtual-time-budget=4000",
                            "--screenshot=" + out, "file://" + src],
                           check=True, capture_output=True)
            print("%-22s %6d bytes" % (name, os.path.getsize(out)))


if __name__ == "__main__":
    main()
