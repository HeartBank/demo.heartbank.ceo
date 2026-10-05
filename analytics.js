// demo.heartbank.ceo — Cloudflare Web Analytics + HeartBank /api/track beacon.
// No-ops on local hosts so development doesn't emit CORS/network errors.
//
// Based on the estate's STATIC-site copy (brand.333.eco/site/public/analytics.js),
// not the Lit/Vite one: this site has no client router, so the SPA route-change
// page_view block those copies carry would never fire here.
//
// ⛔⛔ THIS COPY DELIBERATELY DIVERGES FROM THE ESTATE'S OTHERS, AND THE DIVERGENCE
// MUST NOT BE "FIXED" BACK OR COPIED OUT. It tracks EVERY click, not just links
// (founder, 2026-09-09) — appropriate for a DESIGN-REVIEW site whose whole purpose
// is learning which screens and controls a real person actually touches.
// ⛔⛔ NEVER copy this variant onto a PRODUCT surface, and the reason got STRONGER on
// 2026-09-09 when clicks went to one-push-each (BATCHED again 2026-10-04, below): on thank.heartbank.org it would mean
// recording a real family's every tap inside a gratitude app AND pushing a
// notification for each one. A different act entirely, and never asked for.
(function () {
    var h = location.hostname;
    if (
        h === "localhost" ||
        h === "127.0.0.1" ||
        h === "::1" ||
        h === "[::1]" ||
        h === "" ||
        h.endsWith(".local") ||
        location.protocol === "file:"
    ) {
        return;
    }

    // Cloudflare Web Analytics. This is heartbank.ceo's token, shared with the
    // subdomain rather than registered as a second site — the beacon reports the
    // hostname it ran on, so demo traffic stays separable inside it. Same reason
    // brand.333.eco shares 333.eco's token.
    var cf = document.createElement("script");
    cf.defer = true;
    cf.src = "https://static.cloudflareinsights.com/beacon.min.js";
    cf.setAttribute(
        "data-cf-beacon",
        '{"token": "381f8618448643a48984e7cab753f38e"}'
    );
    document.head.appendChild(cf);

    // HeartBank analytics → thonly.org/api/track
    // demo.heartbank.ceo already matches that endpoint's first-party CORS
    // allowlist via ([a-z0-9-]+\.)*heartbank\.ceo — no server change was needed.
    var ENDPOINT = "https://thonly.org/api/track";
    var deviceId;
    try {
        deviceId = localStorage.getItem("ma-device");
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem("ma-device", deviceId);
        }
    } catch (e) {
        deviceId = "anon";
    }
    function post(event, data) {
        try {
            fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event: event,
                    data: data,
                    deviceId: deviceId,
                    location: Intl.DateTimeFormat().resolvedOptions().timeZone
                }),
                keepalive: true
            }).catch(function () {});
        } catch (e) {}
    }

    post("page_view", { path: location.pathname, ref: document.referrer });

    // ---- every click, BATCHED into one event per visit ----
    //
    // ⭐⭐ FOUNDER-RULED 2026-10-04: *"turn on batch push notification for
    // demo.heartbank.ceo"* — the condition the 2026-09-09 per-click ruling rested on
    // (a small, known audience; *"mostly kanghna and maybe a few family members"*)
    // was the one its own comment said changes silently, so this is the revert it
    // named: BATCHING, from git history (efb29fa), with the per-click version's
    // screen context kept inside each entry.
    //
    // ⚠️⚠️ WHY BATCHED, and do not "simplify" this back into a post() per click
    // without a ruling: every write to `events` fires onEventCreated (thonly.org
    // functions/src/track.ts) → an FCM PUSH TO THE ADMIN'S PHONE. Only song_play and
    // corpus_* are exempt, and their comments say why: "a push per event would make
    // this channel unreadable inside a day". A 30-screen walkthrough would ring 30+
    // times. ONE EVENT PER VISIT keeps every click AND rings once — when the visitor
    // leaves the page (pagehide / hidden), with the whole sequence in the body.
    var clicks = [];
    var t0 = Date.now();

    function label(el) {
        // Cheapest stable identifier, in order of usefulness for a design review.
        if (el.id) return "#" + el.id;
        var t = (el.getAttribute("aria-label") || el.textContent || "").trim();
        t = t.replace(/\s+/g, " ").slice(0, 40);
        var tag = el.tagName.toLowerCase();
        return t ? tag + ":" + t : tag + (el.className ? "." + String(el.className).split(" ")[0] : "");
    }

    document.addEventListener(
        "click",
        function (e) {
            // composedPath() crosses shadow boundaries; closest() is the
            // pre-shadow-DOM fallback. Same reason as the estate's other copies.
            var path = (e.composedPath && e.composedPath()) || [];
            var el = null;
            for (var i = 0; i < path.length; i++) {
                if (path[i].nodeType === 1) {
                    var n = path[i];
                    if (n.matches("a[href],button,[onclick],[role='button'],input,select,label")) {
                        el = n;
                        break;
                    }
                }
            }
            var secs = Math.round((Date.now() - t0) / 1000) + "s ";
            // Background clicks still count — "all clicks" means all — but they get
            // a TAG-ONLY label: document.body.click() otherwise captured 40
            // characters of page copy, noise that eats the payload budget.
            var interactive = !!el;
            if (!el) el = e.target.nodeType === 1 ? e.target : null;
            if (!el) return;
            if (!interactive) {
                clicks.push(secs + "·" + el.tagName.toLowerCase());
                return;
            }
            var a = el.closest && el.closest("a[href]");
            // The walkthrough routes internally, so the visible screen is the
            // context no navigation records (kept from the per-click version).
            var screen = document.querySelector(".screen.on");
            clicks.push(
                secs + label(el) +
                    (screen && screen.id ? " @" + screen.id : "") +
                    (a ? " →" + a.getAttribute("href") : "")
            );
        },
        true // capture: a handler that stops propagation must not hide the click
    );

    // ⭐ Sends what is pending and starts over, so a visitor who switches away and
    // comes back has the later clicks sent on the next leave too (the 9/09 batch
    // sent once per page load and dropped them). pagehide and visibilitychange both
    // fire on leaving; the second finds nothing pending and sends nothing.
    function flush() {
        if (!clicks.length) return;
        // The endpoint coerces data into at most 20 keys × 300 chars, so pack the
        // sequence into numbered chunks rather than one oversized field. ⭐ The
        // page and the count lead: the push body is Object.values(data).join(", ").
        var data = {
            page: location.pathname.split("/").pop() || "index",
            n: String(clicks.length),
            secs: String(Math.round((Date.now() - t0) / 1000))
        };
        var seq = clicks.join(" | ");
        clicks = [];
        for (var i = 0; i < 16 && seq.length; i++) {
            data["c" + i] = seq.slice(0, 300);
            seq = seq.slice(300);
        }
        post("demo_clicks", data);
    }

    // pagehide is the reliable one on iOS Safari, where unload never fires.
    addEventListener("pagehide", flush);
    addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") flush();
    });
})();
