#!/usr/bin/env python3
"""Stamp every analytics.js reference with a hash of the file's own contents.

⛔ WHY THIS EXISTS: GitHub Pages serves analytics.js with caching, so a browser
that has loaded the site once keeps the OLD copy indefinitely. A change to the
tracker then silently fails to reach the very people the demo was handed to —
found 2026-09-09 when a live click sent nothing because the browser was still
running the previous build, minutes after the new one was verified live by curl.

⭐ The query string is derived from the file, so changing analytics.js changes
every reference automatically. Nobody has to remember to bump a version — which
is the point: a rule needs someone to apply it at the moment it is tested.

Called at the end of build-index.py and build-wall.py, and safe to run alone.
"""
import glob, hashlib, io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(HERE, "analytics.js")
h = hashlib.sha256(io.open(src, "rb").read()).hexdigest()[:8]

pat = re.compile(r'(["\'])\./analytics\.js(?:\?v=[0-9a-f]+)?\1')
changed = []
for f in sorted(glob.glob(os.path.join(HERE, "*.html"))):
    s = io.open(f, encoding="utf-8").read()
    new = pat.sub(lambda m: '%s./analytics.js?v=%s%s' % (m.group(1), h, m.group(1)), s)
    if new != s:
        io.open(f, "w", encoding="utf-8").write(new)
        changed.append(os.path.basename(f))
print("analytics.js → v=%s · stamped %d file(s)" % (h, len(changed)))
