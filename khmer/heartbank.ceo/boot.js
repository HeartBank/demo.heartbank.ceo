// The Khmer review page, BEFORE the first paint (a plain script in <head>, so the page never shows the wrong language or the
// wrong light for a moment): the tool's language and the light/dark choice. sheet.js owns both after this and reads them here.
//   language: the stored choice → a phone set to Khmer → Cambodia's time zone (the last tiebreak) → English (/build Default 3)
//   light/dark: the stored choice (light | dark) → none = the same as this device (the page's CSS follows the system)
(() => {
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const d = document.documentElement;
  const scheme = get("khmer-review:scheme");
  if (scheme === "light" || scheme === "dark") d.dataset.scheme = scheme;
  let ui = get("khmer-review:ui");
  if (ui !== "km" && ui !== "en") {
    ui = (navigator.languages ?? [navigator.language]).some((l) => /^km\b/i.test(l ?? "")) ? "km" : "en";
    if (ui === "en") { try { if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Phnom_Penh") ui = "km"; } catch {} }
  }
  d.dataset.ui = ui;
  d.lang = ui;
})();
