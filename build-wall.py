#!/usr/bin/env python3
"""Generate wall.html from canvas.json — every artboard on one pan/zoom surface.

The wall is what the published canvas artifact used to be FOR: seeing all of it at once.
It is generated, never hand-edited, so an artboard added to canvas.json cannot be missing
from it — the same property the front door has. Unlike the canvas it is READ-ONLY, which is
the point: a second editable copy of these files is what drifts.

    python3 build-wall.py
"""
import io, json, os, html

HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(io.open(os.path.join(HERE, "canvas.json"), encoding="utf-8"))
pages = d.get("pages") or [{"id": "page-1", "name": "Canvas"}]
boards, notes = d["artboards"], d.get("annotations", [])
first = pages[0]["id"]

def page_of(o): return o.get("page", first)

frames, tabs = [], []
for p in pages:
    pid = p["id"]
    mine = [b for b in boards if page_of(b) == pid]
    tabs.append('<button class="tab" data-page="%s">%s <span class="n">%d</span></button>'
                % (html.escape(pid), html.escape(p["name"]), len(mine)))
    items = []
    for b in sorted(mine, key=lambda b: (b["y"], b["x"])):
        items.append(
            '<a class="frame" href="{f}" target="_blank" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px">'
            '<span class="cap">{t}</span>'
            '<iframe data-src="{f}" width="{w}" height="{h}" loading="lazy" title="{t}" scrolling="no"></iframe>'
            '</a>'.format(f=html.escape(b["file"]), x=b["x"], y=b["y"], w=b["w"], h=b["h"],
                          t=html.escape(b.get("title", b["file"]))))
    for n in [n for n in notes if page_of(n) == pid]:
        items.append('<div class="note" style="left:{x}px;top:{y}px;width:{w}px">{t}</div>'.format(
            x=n["x"], y=n["y"], w=n.get("w", 240),
            t=html.escape(n.get("text", "")).replace("\n", "<br>")))
    frames.append('<div class="page" data-page="%s" hidden>%s</div>' % (html.escape(pid), "".join(items)))

out = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="googlebot" content="noindex,nofollow">
<meta name="bingbot" content="noindex,nofollow">
<meta name="slurp" content="noindex,nofollow">
<meta name="yandex" content="noindex,nofollow">
<title>HeartBank Shops — the wall</title>
<meta name="theme-color" content="#15803d">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root{
    --bg:#fcfbfe; --surface:#f4f1fb; --surface-2:#ebe7f5;
    --line:rgba(20,16,30,.12); --line-strong:rgba(20,16,30,.28);
    --ink:#16141c; --ink-dim:#5b5766; --ink-faint:#8b8796;
    --accent:#15803d; --accent-soft:#106430; --accent-ink:#fff;
    --accent-wash:rgba(16,100,48,.10); --accent-edge:rgba(16,100,48,.25);
    --font-display:"Newsreader",Georgia,serif;
    --font-text:"IBM Plex Sans",ui-sans-serif,system-ui,sans-serif;
    --font-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
  }
  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
    --bg:#0a0a0f; --surface:#17171d; --surface-2:#1f1f27;
    --line:rgba(255,255,255,.08); --line-strong:rgba(255,255,255,.18);
    --ink:#f5f5f7; --ink-dim:#9b9ba5; --ink-faint:#6b6b76;
    --accent:#3fa564; --accent-soft:#96c6a8; --accent-ink:#08130c;
    --accent-wash:rgba(63,165,100,.14); --accent-edge:rgba(63,165,100,.32);
  }}
  *{box-sizing:border-box}
  [hidden]{display:none!important}
  html,body{margin:0;height:100%;overflow:hidden;background:var(--surface-2);
       color:var(--ink);font-family:var(--font-text)}
  header{position:fixed;inset:0 0 auto 0;z-index:5;display:flex;align-items:center;gap:14px;
       flex-wrap:wrap;padding:10px 14px;background:var(--bg);border-bottom:1px solid var(--line)}
  .home{font-family:var(--font-display);font-size:1.05rem;font-weight:600;color:inherit;text-decoration:none}
  .tabs{display:flex;gap:6px;flex-wrap:wrap}
  .tab{font-family:var(--font-mono);font-size:.7rem;letter-spacing:.04em;text-transform:uppercase;
       border:1px solid var(--line-strong);background:transparent;color:var(--ink-dim);
       border-radius:999px;padding:6px 12px;cursor:pointer;min-height:32px}
  .tab[aria-pressed="true"]{background:var(--accent-wash);border-color:var(--accent-edge);color:var(--accent-soft)}
  .tab .n{opacity:.55;margin-left:3px}
  .zoom{margin-left:auto;display:flex;gap:6px;align-items:center}
  .zoom button{width:36px;height:36px;border-radius:10px;border:1px solid var(--line-strong);
       background:transparent;color:var(--ink);font-size:1rem;cursor:pointer}
  .zoom .fit{width:auto;padding:0 13px;font-family:var(--font-mono);font-size:.72rem}
  #stage{position:fixed;inset:0;top:0;overflow:hidden;cursor:grab;touch-action:none}
  #stage.drag{cursor:grabbing}
  #world{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
  /* NO overflow:hidden here — it clips the caption, which sits above the frame.
     The iframe does its own corner clipping instead. */
  .frame{position:absolute;display:block;text-decoration:none;color:inherit;
       background:var(--bg);border:1px solid var(--line);border-radius:10px;
       box-shadow:0 8px 28px rgba(20,16,30,.10)}
  .frame .cap{position:absolute;left:0;top:-26px;font-family:var(--font-mono);font-size:12px;
       letter-spacing:.03em;color:var(--ink-dim);white-space:nowrap}
  .frame iframe{border:0;display:block;pointer-events:none;background:var(--bg);border-radius:9px}
  .note{position:absolute;background:#fdf3c7;color:#3b3320;border-radius:8px;padding:12px 14px;
       font-size:13px;line-height:1.5;box-shadow:0 6px 18px rgba(20,16,30,.14);white-space:pre-wrap}
  .hint{position:fixed;left:14px;bottom:12px;z-index:5;font-family:var(--font-mono);font-size:.66rem;
       letter-spacing:.04em;text-transform:uppercase;color:var(--ink-faint);
       background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:6px 12px}
</style>
<script src="./analytics.js"></script>
</head>
<body>
<header>
  <a class="home" href="./">&#8592; HeartBank Shops</a>
  <div class="tabs">__TABS__</div>
  <div class="zoom">
    <button class="fit" id="fit">Fit</button>
    <button id="out" aria-label="Zoom out">&#8722;</button>
    <button id="in" aria-label="Zoom in">+</button>
  </div>
</header>
<div id="stage"><div id="world">__PAGES__</div></div>
<p class="hint">Drag to pan &#183; scroll or pinch to zoom &#183; tap a screen to open it</p>
<script>
(function(){
  var stage=document.getElementById('stage'), world=document.getElementById('world');
  var tabs=[].slice.call(document.querySelectorAll('.tab'));
  var s=1, tx=0, ty=0, active=null;
  function apply(){ world.style.transform='translate('+tx+'px,'+ty+'px) scale('+s+')'; }
  function head(){ return document.querySelector('header').offsetHeight; }
  function boxOf(page){
    var els=[].slice.call(page.children), b={x1:1e9,y1:1e9,x2:-1e9,y2:-1e9};
    els.forEach(function(el){
      var x=parseFloat(el.style.left)||0, y=parseFloat(el.style.top)||0;
      var w=parseFloat(el.style.width)||240, h=parseFloat(el.style.height)||el.offsetHeight||120;
      b.x1=Math.min(b.x1,x); b.y1=Math.min(b.y1,y-30); b.x2=Math.max(b.x2,x+w); b.y2=Math.max(b.y2,y+h);
    });
    return b;
  }
  function fit(){
    if(!active) return;
    var b=boxOf(active), pad=48, top=head();
    var vw=window.innerWidth-pad*2, vh=window.innerHeight-top-pad*2;
    s=Math.min(vw/Math.max(1,b.x2-b.x1), vh/Math.max(1,b.y2-b.y1), 1);
    tx=pad-b.x1*s + Math.max(0,(vw-(b.x2-b.x1)*s))/2;
    ty=top+pad-b.y1*s;
    apply();
  }
  function show(id){
    [].slice.call(document.querySelectorAll('.page')).forEach(function(p){
      var on=p.getAttribute('data-page')===id; p.hidden=!on; if(on) active=p;
    });
    tabs.forEach(function(t){ t.setAttribute('aria-pressed', String(t.getAttribute('data-page')===id)); });
    // load this page's frames once it is shown
    [].slice.call(active.querySelectorAll('iframe[data-src]')).forEach(function(f){
      f.src=f.getAttribute('data-src'); f.removeAttribute('data-src');
    });
    fit();
  }
  tabs.forEach(function(t){ t.addEventListener('click', function(){ show(t.getAttribute('data-page')); }); });
  document.getElementById('fit').addEventListener('click', fit);
  function zoomAt(f, cx, cy){
    var ns=Math.min(3, Math.max(0.06, s*f));
    tx=cx-(cx-tx)*(ns/s); ty=cy-(cy-ty)*(ns/s); s=ns; apply();
  }
  document.getElementById('in').addEventListener('click', function(){ zoomAt(1.25, innerWidth/2, innerHeight/2); });
  document.getElementById('out').addEventListener('click', function(){ zoomAt(0.8, innerWidth/2, innerHeight/2); });
  stage.addEventListener('wheel', function(e){
    e.preventDefault();
    if(e.ctrlKey||e.metaKey) zoomAt(Math.pow(0.995,e.deltaY), e.clientX, e.clientY);
    else { tx-=e.deltaX; ty-=e.deltaY; apply(); }
  }, {passive:false});
  var pts={}, last=null, moved=false;
  stage.addEventListener('pointerdown', function(e){
    pts[e.pointerId]={x:e.clientX,y:e.clientY}; moved=false;
    stage.setPointerCapture(e.pointerId); stage.classList.add('drag');
  });
  stage.addEventListener('pointermove', function(e){
    if(!pts[e.pointerId]) return;
    var ids=Object.keys(pts);
    var prev=pts[e.pointerId]; pts[e.pointerId]={x:e.clientX,y:e.clientY};
    if(ids.length===1){
      tx+=e.clientX-prev.x; ty+=e.clientY-prev.y;
      if(Math.abs(e.clientX-prev.x)+Math.abs(e.clientY-prev.y)>2) moved=true;
      apply();
    } else if(ids.length===2){
      var a=pts[ids[0]], b=pts[ids[1]];
      var dist=Math.hypot(a.x-b.x,a.y-b.y);
      if(last) zoomAt(dist/last, (a.x+b.x)/2, (a.y+b.y)/2);
      last=dist; moved=true;
    }
  });
  function up(e){ delete pts[e.pointerId]; if(!Object.keys(pts).length){ last=null; stage.classList.remove('drag'); } }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  // a pan must not count as a tap on a frame
  stage.addEventListener('click', function(e){ if(moved){ e.preventDefault(); e.stopPropagation(); } }, true);
  window.addEventListener('resize', fit);
  show(tabs[0].getAttribute('data-page'));
})();
</script>
</body>
</html>
"""
out = out.replace("__TABS__", "".join(tabs)).replace("__PAGES__", "".join(frames))
io.open(os.path.join(HERE, "wall.html"), "w", encoding="utf-8").write(out)
print("wall.html written — %d artboards, %d notes, %d pages" % (len(boards), len(notes), len(pages)))

# Re-stamp the analytics reference from the file's own hash, so a tracker
# change can never be served stale to a browser that cached the old copy.
import subprocess as _sp
_sp.run(["python3", os.path.join(HERE, "stamp-analytics.py")], check=True)
