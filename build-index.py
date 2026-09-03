#!/usr/bin/env python3
"""Generate index.html from canvas.json.

The index is GENERATED, never hand-edited: an artboard added to the canvas cannot then be
missing from the front door, and the two cannot drift. Re-run after any canvas change.

    python3 build-index.py
"""
import io, json, os, html

HERE = os.path.dirname(os.path.abspath(__file__))

# One line per surface, saying what the page is for. Keyed by canvas page id.
BLURB = {
    "page-1": "The institution's own front door — the Office of the CEO, the distance search, "
              "and the way a shop opens.",
    "page-2": "What a customer sees. One shop's whole visit: menu, checkout three ways, the "
              "order placed, rewards — plus a vendor with no fixed address.",
    "page-3": "The back office, phone-first, because it is run from behind a counter. Staff see "
              "the queue; the owner sees everything.",
    "page-4": "A rider's two screens. Whose turn it is, never who is best.",
    "page-5": "The platform operator's surface — desktop width. Most of what matters here is "
              "what it refuses to contain.",
}


def main():
    canvas = json.load(io.open(os.path.join(HERE, "canvas.json"), encoding="utf-8"))
    boards = canvas["artboards"]
    by_page = {}
    for a in boards:
        by_page.setdefault(a.get("page", "page-1"), []).append(a)
    # Visual order — down the canvas, then across. Titles are only sometimes numbered.
    for v in by_page.values():
        v.sort(key=lambda a: (a["y"], a["x"]))

    sections = []
    for page in canvas["pages"]:
        pid, name = page["id"], page["name"]
        rows = "\n".join(
            '        <a class="board" href="./{f}">'
            '<span class="t">{t}</span>'
            '<span class="d mono">{w}×{h}</span></a>'.format(
                f=html.escape(a["file"]),
                t=html.escape(a.get("title", a["file"].replace(".dc.html", ""))),
                w=a["w"], h=a["h"])
            for a in by_page.get(pid, []))
        sections.append(
            '      <section class="surface">\n'
            '        <h2 class="mono">{n}</h2>\n'
            '        <p class="blurb">{b}</p>\n'
            '{r}\n'
            '      </section>'.format(n=html.escape(name),
                                      b=html.escape(BLURB.get(pid, "")), r=rows))

    out = TEMPLATE.replace("{{SECTIONS}}", "\n\n".join(sections)) \
                  .replace("{{COUNT}}", str(len(boards)))
    io.open(os.path.join(HERE, "index.html"), "w", encoding="utf-8").write(out)
    print("index.html written — %d artboards across %d surfaces"
          % (len(boards), len(canvas["pages"])))


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>HeartBank Shops — design</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  /* brand.333.eco v1.3.0 tokens, with the .ceo green pinned. Nothing invented here. */
  :root{
    --bg:#fcfbfe; --surface:#f4f1fb; --surface-2:#ebe7f5;
    --line:rgba(20,16,30,.12); --line-strong:rgba(20,16,30,.28);
    --ink:#16141c; --ink-dim:#5b5766; --ink-faint:#8b8796;
    --accent:#15803d; --accent-soft:#106430; --accent-ink:#ffffff;
    --accent-wash:rgba(16,100,48,.10); --accent-edge:rgba(16,100,48,.25);
    --font-display:"Newsreader",Georgia,serif;
    --font-text:"IBM Plex Sans",ui-sans-serif,system-ui,sans-serif;
    --font-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
    --r-card:1.25rem; --r-control:1rem; --r-pill:999px;
  }
  :root:not([data-theme="light"]){ @media (prefers-color-scheme:dark){
    --bg:#0a0a0f; --surface:#17171d; --surface-2:#1f1f27;
    --line:rgba(255,255,255,.08); --line-strong:rgba(255,255,255,.18);
    --ink:#f5f5f7; --ink-dim:#9b9ba5; --ink-faint:#6b6b76;
    --accent:#3fa564; --accent-soft:#96c6a8; --accent-ink:#08130c;
    --accent-wash:rgba(63,165,100,.14); --accent-edge:rgba(63,165,100,.32);
  }}
  :root[data-theme="dark"]{
    --bg:#0a0a0f; --surface:#17171d; --surface-2:#1f1f27;
    --line:rgba(255,255,255,.08); --line-strong:rgba(255,255,255,.18);
    --ink:#f5f5f7; --ink-dim:#9b9ba5; --ink-faint:#6b6b76;
    --accent:#3fa564; --accent-soft:#96c6a8; --accent-ink:#08130c;
    --accent-wash:rgba(63,165,100,.14); --accent-edge:rgba(63,165,100,.32);
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-text);
       font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
  .mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
  a{color:inherit}
  a:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:10px}

  .wrap{max-width:860px;margin:0 auto;padding:48px 22px 72px}
  header{margin-bottom:34px}
  h1{font-family:var(--font-display);font-size:clamp(2rem,6vw,2.9rem);font-weight:600;
     margin:0 0 10px;letter-spacing:-.022em;text-wrap:balance;line-height:1.1}
  /* The wordmark substitution: the B in *Bank* only, never the H in *Heart*.
     inline-block matters — transforms do not apply to non-replaced inline
     elements, and the class must sit on the <svg>, never on a wrapper.

     ⚠️ THE THREE NUMBERS ARE MEASURED, NOT CHOSEN. The path does not fill its
     own viewBox: getBBox() gives the drawn shape as 0.7535 of the box height,
     with 0.1533 of padding below it and 0.1534 to its left. Newsreader's cap
     height here is 0.6937em. So the box is 0.6937/0.7535 = .92em for the mark
     to stand exactly as tall as a capital; it drops .1533 × .92 = .141em for
     its foot to land on the baseline; and the side margins cancel the built-in
     padding so "Heart" and "ank" close up like letters instead of words.
     Re-measure if the path is ever redrawn — do not nudge these by eye. */
  .emblem{width:.92em;height:.92em;display:inline-block;vertical-align:-.141em;
          margin-left:-.09em;margin-right:-.04em;color:var(--accent)}
  /* brand.333.eco css/motion.css, copied exactly. Two UNEQUAL beats and then a
     long rest — systole, a weaker diastole, then 450ms of stillness in every
     1500ms cycle (~40 BPM). THE MORPHOLOGY is the signature, not the tempo:
     do not "correct" the stops, and do not move 70% without meaning to. */
  @keyframes heartbeat{
    0%,100%{transform:scale(1)}
    14%{transform:scale(1.3)}
    28%{transform:scale(1)}
    42%{transform:scale(1.3)}
    70%{transform:scale(1)}
  }
  .beating{animation:heartbeat 1.5s 0s infinite;transform-origin:center}
  @media (prefers-reduced-motion:reduce){.beating{animation:none}}
  .sub{margin:0;color:var(--ink-dim);font-size:1.02rem;max-width:56ch;line-height:1.6}

  .start{display:block;text-decoration:none;border:2px solid var(--accent);
         background:var(--accent-wash);border-radius:var(--r-card);padding:22px 24px;
         margin:30px 0 44px;transition:background .16s}
  .start:hover{background:var(--accent-edge)}
  .start .kicker{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.09em;
       text-transform:uppercase;color:var(--accent-soft);display:block;margin-bottom:7px}
  .start h2{font-family:var(--font-display);font-size:1.6rem;font-weight:600;margin:0 0 7px}
  .start p{margin:0;color:var(--ink-dim);font-size:.94rem;line-height:1.6;max-width:52ch}
  .start .go{display:inline-flex;align-items:center;gap:7px;margin-top:14px;
       color:var(--accent-soft);font-weight:500;font-size:.94rem}

  .surface{margin-bottom:38px}
  .surface h2{font-size:.82rem;font-weight:500;letter-spacing:.06em;margin:0 0 5px;
       color:var(--accent-soft)}
  .blurb{margin:0 0 15px;color:var(--ink-dim);font-size:.9rem;max-width:62ch;line-height:1.6}
  .board{display:flex;align-items:center;justify-content:space-between;gap:14px;
     text-decoration:none;padding:12px 16px;border:1px solid var(--line);
     border-radius:var(--r-control);margin-bottom:7px;transition:border-color .14s,background .14s}
  .board:hover{border-color:var(--accent);background:var(--surface)}
  .board .t{font-size:.96rem;font-weight:500}
  .board .d{font-size:.74rem;color:var(--ink-faint);flex:none}

  footer{margin-top:52px;padding-top:24px;border-top:1px solid var(--line);
     color:var(--ink-faint);font-size:.84rem;line-height:1.65}
  footer p{margin:0 0 9px;max-width:64ch}
  footer b{color:var(--ink-dim);font-weight:500}
  @media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <!-- B-Emblem™ standing in for the B of *Bank* — the heart rotated 45° into a
         bistable capital B, rotation baked into the path, never a transform attribute.
         It beats because a page header is CHROME; it would not beside a person's name. -->
    <h1>Heart<svg class="emblem beating" viewBox="0 0 24 24" role="img" aria-label="B"><path fill="currentColor" d="M3.9743 20.0257L3.8824 18.0670C3.5430 11.1232 3.3167 6.5411 5.9896 3.8683C8.1675 1.6904 11.5899 1.6904 13.7678 3.8683C14.9981 5.0986 15.6062 6.8523 15.4719 8.5281C17.1477 8.3938 18.9014 9.0019 20.1317 10.2322C22.3096 12.4101 22.3096 15.8325 20.1317 18.0104C17.4589 20.6833 12.8768 20.4570 5.9260 20.1247L3.9743 20.0257Z"/></svg>ank Shops</h1>
    <p class="sub">Design source for a storefront platform on <span class="mono">heartbank.ceo</span>
      — {{COUNT}} artboards across five surfaces, plus a walkthrough you can actually use.
      Home Coffee is the first shop.</p>
  </header>

  <a class="start" href="./home-coffee-walkthrough.html">
    <span class="kicker">Start here</span>
    <h2>The Home Coffee walkthrough</h2>
    <p>Order as a customer, then switch sides — run the shop, make it, hand it over, or ride it
      across town. Three roles, one order, three ways to pay. It works; nothing in it charges
      anyone.</p>
    <span class="go">Open the walkthrough &rarr;</span>
  </a>

{{SECTIONS}}

  <footer>
    <p><b>These are drawings, not the shop.</b> Nothing here takes an order, moves money, or
      charges anyone. Every price, name and order shown is for the design.</p>
    <p><b>The Khmer is unverified.</b> It was written to draw the screens and still wants a Khmer
      reader's eye before any of it is built.</p>
    <p>Tokens, type and the emblem come from <span class="mono">brand.333.eco</span> v1.3.0.
      Artboards open as ordinary pages — <span class="mono">.dc.html</span> is plain HTML.</p>
  </footer>
</div>
</body>
</html>
"""

if __name__ == "__main__":
    main()
