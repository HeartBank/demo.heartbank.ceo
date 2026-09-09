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
// ⛔ NEVER copy this variant onto a PRODUCT surface. On thank.heartbank.org it would
// mean recording a real family's every tap inside a gratitude app, which is a
// different act entirely and was never asked for.
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
    // ⚠️⚠️ WHY BATCHED, and do not "simplify" this into a post() per click:
    // every write to `events` fires onEventCreated (thonly.org functions/src/track.ts)
    // → an FCM PUSH TO THE ADMIN'S PHONE. Only song_play and corpus_* are exempt,
    // and their comments say exactly why: "a push per event would make this channel
    // unreadable inside a day". A 30-screen walkthrough would ring 30+ times.
    // One event per visit keeps every click AND keeps the channel readable.
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
            // Background clicks still count — "all clicks" means all — but they get
            // a TAG-ONLY label. Found by running it: document.body.click() otherwise
            // captured 40 characters of page copy as its label, which is noise that
            // eats the 300-char payload budget and tells you nothing.
            var interactive = !!el;
            if (!el) el = e.target.nodeType === 1 ? e.target : null;
            if (!el) return;
            if (!interactive) {
                clicks.push(
                    Math.round((Date.now() - t0) / 1000) +
                        "s ·" +
                        el.tagName.toLowerCase()
                );
                return;
            }
            var a = el.closest && el.closest("a[href]");
            clicks.push(
                (Math.round((Date.now() - t0) / 1000) + "s ") +
                    label(el) +
                    (a ? " →" + a.getAttribute("href") : "")
            );
        },
        true // capture: a handler that stops propagation must not hide the click
    );

    var flushed = false;
    function flush() {
        if (flushed || !clicks.length) return;
        flushed = true;
        // The endpoint coerces data into at most 20 keys × 300 chars, so pack the
        // sequence into numbered chunks rather than one oversized field.
        var data = {
            path: location.pathname,
            n: String(clicks.length),
            secs: String(Math.round((Date.now() - t0) / 1000))
        };
        var seq = clicks.join(" | ");
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
