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
// 2026-09-09 when clicks went to one-push-each: on thank.heartbank.org it would mean
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

    // ---- every click, ONE EVENT EACH ----
    //
    // ⭐ FOUNDER-RULED 2026-09-09, overriding the substrate's batching: *"it'll be
    // mostly kanghna and maybe a few family members, so send me a push for every
    // click."* Each click is its own `events` write, so each fires onEventCreated
    // (thonly.org functions/src/track.ts) → an FCM push. That is the intent: on a
    // link handed to about three people, a ping per click is a live feed of the
    // review, not noise.
    //
    // ⛔⛔ THE CONDITION THIS RESTS ON, AND IT IS THE ONE THAT CHANGES SILENTLY:
    // A SMALL, KNOWN AUDIENCE. If this link is ever shared more widely — posted,
    // forwarded past the pilot family, or handed to a second shop — REVERT TO
    // BATCHING (git history has it) or exempt the event server-side the way
    // song_play and corpus_* are. Their comments state the failure mode exactly:
    // "a push per event would make this channel unreadable inside a day."
    var t0 = Date.now();

    function page() {
        // All pages sit at the root here, so the basename identifies the page and
        // keeps the notification short.
        return location.pathname.split("/").pop() || "index";
    }

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
            var interactive = !!el;
            if (!el) el = e.target.nodeType === 1 ? e.target : null;
            if (!el) return;

            var secs = String(Math.round((Date.now() - t0) / 1000));

            // Background clicks still count — "all clicks" means all — but they get
            // a TAG-ONLY label. Found by running it: document.body.click() otherwise
            // captured 40 characters of page copy as its label, which is noise.
            if (!interactive) {
                post("demo_click", {
                    on: "·" + el.tagName.toLowerCase(),
                    page: page(),
                    at: secs
                });
                return;
            }

            var a = el.closest && el.closest("a[href]");
            // ⭐ KEY ORDER IS THE NOTIFICATION'S READING ORDER, not a style choice:
            // the push body is `Object.values(data).join(", ")` (track.ts), so
            // whatever is inserted first is what shows on a phone's lock screen.
            // The thing CLICKED leads; the page identifier trails.
            var d = { on: label(el) };
            // The walkthrough routes internally, so the visible screen is the most
            // useful context there and no navigation records it.
            var screen = document.querySelector(".screen.on");
            if (screen && screen.id) d.screen = screen.id;
            d.page = page();
            d.at = secs;
            if (a) d.href = a.getAttribute("href");
            post("demo_click", d);
        },
        true // capture: a handler that stops propagation must not hide the click
    );

})();
