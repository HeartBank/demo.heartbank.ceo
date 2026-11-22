// The Khmer review page (/khmer-review). Reads this site's words (sheet.json), the tool's own words (words.json) and what the
// native readers have entered (translate.333.eco); with a reviewer's private link (#k=…) a press is saved as a new row.
// ⛔ Every stored text is rendered as TEXT (textContent), never HTML. ⛔ The link's token stays in the fragment and in memory.
// ⭐ Unsent text (a correction or a question typed but not saved) is kept in this device's localStorage until it is saved or
//   canceled, so a dropped page loses nothing; it never holds the token.
import { flatten, matches, placeholderGap, stateOf, wordTable } from "./logic.js";

const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.content ?? "";
const API = meta("translate-api").replace(/\/$/, "");
const SITE = meta("translate-site");
const TOKEN = (location.hash.match(/[#&]k=([A-Za-z0-9_-]{20,200})/) ?? [])[1] ?? null;
const DRAFT_KEY = (key, kind) => `khmer-review:${SITE}:${key}:${kind}`;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

// ⭐ THE UI LANGUAGE (founder 2026-11-22: "Add English/khmer language toggle"): the tool's OWN words show in one language;
//   the entries under review always show both. boot.js read it before the first paint (stored → a Khmer phone → Cambodia's time
//   zone → English); kept on this device only.
const UI_KEY = "khmer-review:ui";
let ui = document.documentElement.dataset.ui === "km" ? "km" : "en";
const applyUi = () => { document.documentElement.dataset.ui = ui; document.documentElement.lang = ui; };
applyUi();
// ⭐ LIGHT OR DARK (founder 2026-11-22: "add dark mode toggle to the header (language toggle on left, dark mode toggle on right
//   side, space between)" — his call over /build Default 6's footer, for these pages): the same as this device (the default; the
//   CSS follows the system) · light · dark. boot.js applied a stored choice before the first paint; kept on this device only.
const SCHEME_KEY = "khmer-review:scheme";
let scheme = ["light", "dark"].includes(document.documentElement.dataset.scheme) ? document.documentElement.dataset.scheme : "auto";
const applyScheme = () => { if (scheme === "auto") delete document.documentElement.dataset.scheme; else document.documentElement.dataset.scheme = scheme; };

let T = {};
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k);
  return e;
};
/** a label in both languages: Khmer first (the reviewers'), English beneath */
const bi = (key, vars = {}) => {
  const [km, en] = Array.isArray(key) ? key : (T[key] ?? [key, key]);
  const fill = (s) => s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  return el("span", { class: "bi" }, el("span", { lang: "km", class: "ui-km", text: fill(km) }), el("span", { class: "en ui-en", lang: "en", text: fill(en) }));
};
/** a text with its {placeholders} marked, as text nodes only */
const marked = (s, lang) => {
  const span = el("span", { lang });
  for (const part of String(s).split(/(\{\w+\})/)) span.append(/^\{\w+\}$/.test(part) ? el("span", { class: "ph", text: part }) : document.createTextNode(part));
  return span;
};
const day = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

let shots = null, sheet, entries, rows = [], byKey = new Map(), role = null, myName = null, online = true, filter = "all", query = "", open = null, lastLoad = 0;

async function loadRows() {
  // the admin's link reads the export, which names each reviewer; everyone else reads the public rows, which name no one
  const path = role === "admin" ? "export" : "entries";
  const r = await fetch(`${API}/v1/surfaces/${encodeURIComponent(SITE)}/${path}`, { cache: "no-store", headers: role === "admin" ? { authorization: "Bearer " + TOKEN } : {} });
  if (!r.ok) throw new Error(String(r.status));
  lastLoad = Date.now();
  return (await r.json()).entries;
}

// the store's rows by key, rebuilt whenever rows change: every entry's state then reads only its own rows
function reindex() { byKey = new Map(); for (const r of rows) { const a = byKey.get(r.key); if (a) a.push(r); else byKey.set(r.key, [r]); } }
const st = (e) => stateOf(e, byKey.get(e.key) ?? []);

// the three light/dark pictures, drawn as SVG nodes (no markup string; the page's CSP allows no inline style or script)
function schemeIcon(kind) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "aria-hidden": "true" })) svg.setAttribute(k, v);
  const add = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); svg.append(n); };
  if (kind === "light") { add("circle", { cx: "12", cy: "12", r: "4" }); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; add("line", { x1: String(12 + 7 * Math.cos(a)), y1: String(12 + 7 * Math.sin(a)), x2: String(12 + 9.5 * Math.cos(a)), y2: String(12 + 9.5 * Math.sin(a)) }); } }
  else if (kind === "dark") add("path", { d: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" });
  else { add("circle", { cx: "12", cy: "12", r: "8" }); add("path", { d: "M12 4a8 8 0 0 1 0 16z", fill: "currentColor", stroke: "none" }); }
  return svg;
}

// the header's row: the language on the left, light/dark on the right
function langs() {
  const box = document.getElementById("langs");
  if (!box) return;
  const word = (k) => (ui === "km" ? T[k][0] : T[k][1]);
  const pick = (l) => { ui = l; store.set(UI_KEY, l); applyUi(); render(); };
  const pickScheme = (k) => { scheme = k; if (k === "auto") store.del(SCHEME_KEY); else store.set(SCHEME_KEY, k); applyScheme(); langs(); };
  box.replaceChildren(
    el("div", { class: "langs", role: "group", "aria-label": word("language") },
      el("button", { type: "button", lang: "km", "aria-pressed": String(ui === "km"), onclick: () => pick("km") }, "ខ្មែរ"),
      el("button", { type: "button", lang: "en", "aria-pressed": String(ui === "en"), onclick: () => pick("en") }, "English")),
    el("div", { class: "langs scheme", role: "group", "aria-label": word("scheme") },
      ...[["auto", "schemeAuto"], ["light", "schemeLight"], ["dark", "schemeDark"]].map(([k, w]) =>
        el("button", { type: "button", "data-scheme": k, "aria-pressed": String(scheme === k), "aria-label": word(w), title: word(w), onclick: () => pickScheme(k) }, schemeIcon(k)))));
  // the link holder's OWN name at the left (founder 2026-11-22: "show the current reviewer's name in the header on the left
  //   side"); /v1/me gives it to that link alone. No link, or a canceled one: nothing.
  const me = document.getElementById("me");
  if (me) me.textContent = myName ? (ui === "km" ? myName.km : myName.en) : "";
}

function header() {
  langs();
  const bar = document.getElementById("status");
  bar.replaceChildren();
  const msg = !online ? "offline" : role ? "writer" : TOKEN ? "badLink" : "viewOnly";
  bar.append(el("p", { class: `banner ${!online || (TOKEN && !role) ? "warn" : role ? "ok" : ""}` }, bi(msg)));
  const done = entries.filter((e) => st(e).status !== "todo").length;
  const all = entries.length, todo = all - done;
  const find = el("input", { type: "search", id: "find", placeholder: ui === "km" ? T.findHint[0] : T.findHint[1], lang: ui, autocomplete: "off" });
  find.value = query;
  let timer;
  find.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { query = find.value; renderList(); }, 150); });
  bar.append(el("div", { class: "tools" },
    el("p", { class: "progress" }, bi("progress", { a: String(done), b: String(all) })),
    el("div", { class: "filter", role: "group", "aria-label": T.show[1] },
      el("button", { type: "button", "aria-pressed": String(filter === "all"), onclick: () => { filter = "all"; render(); } }, bi([`${T.all[0]} (${all})`, `${T.all[1]} (${all})`])),
      el("button", { type: "button", "aria-pressed": String(filter === "todo"), onclick: () => { filter = "todo"; render(); } }, bi([`${T.todo[0]} (${todo})`, `${T.todo[1]} (${todo})`]))),
    el("label", { class: "find", for: "find" }, bi("find"), find)));
}

function history(s) {
  if (!s.earlier.length) return null;
  return el("details", { class: "history" },
    el("summary", {}, bi([`${T.earlier[0]} (${s.earlier.length})`, `${T.earlier[1]} (${s.earlier.length})`])),
    el("ol", {}, s.earlier.map((r) => el("li", {},
      el("span", { class: "when" }, `${day(r.at)} · `, bi(r.kind === "approve" ? "approved" : "corrected"), r.reviewer ? bi("by", { who: r.reviewer }) : null),
      el("div", {}, marked(r.km, "km"))))));
}

// ⭐ The picture (founder 2026-11-21: "no drawings, just screenshots: one screenshot per item … a prominent arrow pointing at the text
//   in question"): a window of the phone screenshot the entry was found on (shots/shots.json, /khmer-review capture), with a red
//   outline around its words and a thick arrow at them, drawn in the screenshot's own coordinates. One picture serves every entry on
//   that screen; the window and the arrow are each entry's own.
const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs) => { const x = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) x.setAttribute(k, String(v)); return x; };
function picture(e) {
  const p = shots?.entries?.[e.key];
  if (!p) return null;
  const VW = shots.viewport.width, VH = shots.viewport.height, WIN = Math.min(320, VH);
  const top = Math.max(0, Math.min(VH - WIN, p.y + p.h / 2 - WIN / 2));
  const frame = el("div", { class: "frame" });
  frame.style.aspectRatio = `${VW} / ${WIN}`;
  const img = el("img", { src: "shots/" + p.img, alt: "", loading: "lazy", decoding: "async" });
  img.style.transform = `translateY(-${(top / VH) * 100}%)`;
  const svg = svgEl("svg", { class: "mark", viewBox: `0 ${top} ${VW} ${WIN}`, preserveAspectRatio: "none", "aria-hidden": "true" });
  const pad = 4, bx = p.x - pad, by = p.y - pad, bw = p.w + 2 * pad, bh = p.h + 2 * pad;
  svg.append(svgEl("rect", { class: "box", x: bx, y: by, width: bw, height: bh, rx: 8 }));
  // the arrow: from the side with room, at the words' middle; a box as wide as the screen gets it from below (or above)
  const cy = p.y + p.h / 2, roomL = bx, roomR = VW - (bx + bw);
  let tail, tip;
  if (Math.max(roomL, roomR) >= 48) {
    const fromRight = roomR >= roomL;
    tip = [fromRight ? bx + bw + 3 : bx - 3, cy];
    const len = Math.min(96, Math.max(roomL, roomR) - 8);
    tail = [fromRight ? tip[0] + len : tip[0] - len, cy - len * 0.45];
  } else {
    const below = by + bh + 80 <= top + WIN;
    tip = [Math.min(VW - 20, Math.max(20, p.x + Math.min(p.w, 120) / 2)), below ? by + bh + 3 : by - 3];
    tail = [tip[0] + 40, below ? tip[1] + 70 : tip[1] - 70];
  }
  const ang = Math.atan2(tip[1] - tail[1], tip[0] - tail[0]);
  const base = [tip[0] - 15 * Math.cos(ang), tip[1] - 15 * Math.sin(ang)];
  const side = (s1) => [base[0] + s1 * 9 * Math.sin(ang), base[1] - s1 * 9 * Math.cos(ang)];
  const shaft = `M${tail[0]},${tail[1]} L${base[0]},${base[1]}`;
  svg.append(svgEl("path", { class: "halo", d: shaft }), svgEl("path", { class: "arrow", d: shaft }),
    svgEl("polygon", { class: "head", points: [tip, side(1), side(-1)].map((q) => q.join(",")).join(" ") }));
  frame.append(img, svg);
  return el("figure", { class: "shot" }, el("p", { class: "label" }, bi("picture")), frame,
    el("figcaption", {}, el("a", { href: "shots/" + p.img, target: "_blank", rel: "noopener noreferrer" }, bi("wholeScreen"))));
}

function card(e) {
  const s = st(e);
  const unsent = ["text", "note"].filter((k) => store.get(DRAFT_KEY(e.key, k)));
  const art = el("article", { class: `card ${s.status}${e.waiting ? " long" : ""}`, id: "e-" + e.key, "data-key": e.key });
  art.append(el("div", { class: "head" },
    el("span", { class: "n", text: String(e.n) }),
    el("span", { class: "badge" }, bi(s.status)),
    s.latest ? el("span", { class: "when", text: day(s.latest.at) }) : null,
    s.latest?.reviewer ? el("span", { class: "who" }, bi("by", { who: s.latest.reviewer })) : null,
    unsent.length ? el("span", { class: "unsent" }, bi("unsent")) : null,
    el("code", { class: "key", text: e.key })));
  art.append(el("div", { class: "en" }, e.en ? marked(e.en, "en") : bi("khmerOnly")));
  if (e.note) art.append(el("p", { class: "appears" }, el("span", { class: "lbl" }, bi("appears")),
    e.note_km ? [el("span", { lang: "km", class: "ui-km", text: e.note_km }), el("span", { lang: "en", class: "ui-en", text: e.note })] : el("span", { lang: "en", text: e.note })));
  const fig = picture(e);
  if (fig) art.append(fig);
  // ⭐ the sub-card (founder 2026-11-22: "make the Khmer string and the buttons stand out … a sub-card with a different background")
  const box = el("div", { class: "review" });
  art.append(box);
  box.append(el("div", { class: "km" }, s.khmer ? marked(s.khmer, "km") : el("span", { class: "none" }, bi("noKhmer"))));
  if (s.latest && e.km && s.khmer !== e.km) box.append(el("details", { class: "draft" }, el("summary", {}, bi("draft")), el("div", {}, marked(e.km, "km"))));
  box.append(history(s) ?? "");
  if (s.englishChanged) box.append(el("p", { class: "flag" }, bi("englishChanged")));
  if (s.draftChanged) box.append(el("p", { class: "flag" }, bi("draftChanged")));
  if (s.notes.length) {
    box.append(el("div", { class: "notes" }, el("p", { class: "label" }, bi("questions")),
      el("ul", {}, s.notes.map((nt) => el("li", {}, el("span", { class: "when", text: day(nt.at) + (nt.reviewer ? ` · ${nt.reviewer}` : "") + " " }), el("span", { text: nt.note }))))));
  }
  if (role && online) {
    if (open?.key === e.key) box.append(editor(e, s));
    else {
      const acts = el("div", { class: "acts" });
      const current = s.status === "approved" && !s.draftChanged && !s.englishChanged;
      if (e.km && !current) acts.append(el("button", { type: "button", class: "primary", onclick: (ev) => save(e, { kind: "approve", km: e.km }, ev.currentTarget) }, bi("approve")));
      acts.append(el("button", { type: "button", onclick: () => { open = { key: e.key, kind: "text" }; redraw(e.key); } }, bi("correct")));
      acts.append(el("button", { type: "button", onclick: () => { open = { key: e.key, kind: "note" }; redraw(e.key); } }, bi("ask")));
      box.append(acts);
    }
  }
  if (!s.latest) art.append(el("div", { class: "paper", "aria-hidden": "true" }));   // print only: room for a handwritten correction
  return art;
}

function editor(e, s) {
  const isNote = open.kind === "note";
  const id = "ed-" + e.key;
  const dk = DRAFT_KEY(e.key, open.kind);
  const box = el("textarea", { id, lang: isNote ? null : "km", rows: e.waiting ? "8" : "3", class: isNote ? "" : "kmbox" });
  box.value = store.get(dk) ?? (isNote ? "" : (s.khmer ?? ""));
  let keep;
  box.addEventListener("input", () => { clearTimeout(keep); keep = setTimeout(() => (box.value.trim() ? store.set(dk, box.value) : store.del(dk)), 300); });
  const msg = el("p", { class: "msg", role: "status" });
  let warned = null;
  const saveBtn = el("button", { type: "submit", class: "primary" }, bi("save"));
  const form = el("form", { class: "editor", onsubmit: (ev) => {
    ev.preventDefault();
    const v = box.value;
    if (!v.trim()) { box.focus(); return; }
    if (!isNote) {
      const gap = placeholderGap(e, v);
      const key = gap.missing.concat(gap.extra).join(" ");
      if (key && warned !== key) {
        warned = key;
        msg.replaceChildren(bi("keep", { x: key }), el("br"), bi("again"));
        return;
      }
    }
    clearTimeout(keep);
    store.set(dk, v);   // kept until the store answers: a failed save loses nothing
    save(e, isNote ? { kind: "note", note: v } : { kind: "text", km: v }, saveBtn, msg, dk);
  } },
  el("label", { for: id }, bi(isNote ? "yourQuestion" : "yourKhmer")), box, msg,
  el("div", { class: "acts" }, saveBtn, el("button", { type: "button", onclick: () => { clearTimeout(keep); store.del(dk); open = null; redraw(e.key); } }, bi("cancel"))));
  queueMicrotask(() => box.focus());
  return form;
}

async function save(e, row, btn, msg, dk) {
  if (btn.disabled) return;
  btn.style.minWidth = btn.offsetWidth + "px";
  btn.disabled = true; btn.setAttribute("aria-busy", "true");
  const label = [...btn.childNodes];
  btn.replaceChildren(el("span", { class: "dots", "aria-hidden": "true" }, el("i"), el("i"), el("i")), el("span", { class: "sr" }, bi("working")));
  const restore = () => { btn.replaceChildren(...label); btn.disabled = false; btn.removeAttribute("aria-busy"); };
  const tell = (k) => { const m = msg ?? btn.closest("article")?.querySelector(".msg") ?? btn.closest("article")?.appendChild(el("p", { class: "msg", role: "status" })); m?.replaceChildren(bi(k)); };
  try {
    const r = await fetch(`${API}/v1/surfaces/${encodeURIComponent(SITE)}/entries`, {
      method: "POST", headers: { authorization: "Bearer " + TOKEN, "content-type": "application/json" },
      body: JSON.stringify({ entries: [{ key: e.key, base_en: e.en, base_km: e.km ?? null, ...row }] }),
    });
    if (r.status === 201) {
      const { saved } = await r.json();
      if (dk) store.del(dk);
      rows.push({ id: saved[0].id, at: saved[0].at, key: e.key, base_en: e.en, base_km: e.km ?? null, km: null, note: null, ...row, ...(role === "admin" ? { reviewer: "admin" } : {}) });
      reindex();
      open = null;
      redraw(e.key, "saved");
      return;
    }
    restore();
    tell(r.status === 401 ? "linkGone" : r.status === 429 ? "tooMany" : "notSaved");
  } catch {
    restore();
    tell("notSaved");
  }
}

function renderList(focusKey, note) {
  const list = document.getElementById("list");
  const keepY = focusKey ? document.getElementById("e-" + focusKey)?.getBoundingClientRect().top : null;
  list.replaceChildren();
  let group = null, section = null, shown = 0;
  for (const e of entries) {
    const s = st(e);
    if (filter === "todo" && s.status !== "todo" && e.key !== focusKey) continue;
    if (!matches(e, s, query) && e.key !== focusKey) continue;
    if (e.group !== group) {
      group = e.group;
      section = el("section", {}, el("h2", {}, e.groupKm ? [el("span", { lang: "km", class: "ui-km", text: e.groupKm }), el("span", { lang: "en", class: "ui-en", text: group })] : group));
      list.append(section);
    }
    section.append(card(e));
    shown++;
  }
  if (!shown) list.append(el("p", { class: "none" }, bi("nothing")));
  if (focusKey) {
    const c = document.getElementById("e-" + focusKey);
    if (c && keepY !== null && keepY !== undefined) window.scrollBy(0, c.getBoundingClientRect().top - keepY);
    if (c && note) c.append(el("p", { class: "msg done", role: "status" }, bi(note)));
  }
}

function render(focusKey, note) {
  header();
  renderList(focusKey, note);
}

/** one entry changed: replace its card (and the header's count) in place — a sheet can hold thousands of entries */
function redraw(key, note) {
  const old = document.getElementById("e-" + key);
  const e = entries.find((x) => x.key === key);
  if (!old || !e) { render(key, note); return; }
  const fresh = card(e);
  old.replaceWith(fresh);
  if (note) fresh.append(el("p", { class: "msg done", role: "status" }, bi(note)));
  header();
}

// reopened (a tab come back to, a phone unlocked): read the store again, so each reviewer sees the other's latest entry
async function refresh() {
  if (!online || open || Date.now() - lastLoad < 20_000) return;
  try {
    const fresh = await loadRows();
    const sig = (rs) => rs.length + ":" + (rs.at(-1)?.id ?? 0);
    if (sig(fresh) !== sig(rows)) { rows = fresh; reindex(); render(); }
  } catch {}
}

async function main() {
  let words;
  try {
    [sheet, words] = await Promise.all(["sheet.json", "words.json"].map((f) => fetch(f, { cache: "no-cache" }).then((r) => r.json())));
    shots = await fetch("shots/shots.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  } catch {
    document.getElementById("list").textContent = "sheet.json could not be read.";
    return;
  }
  T = wordTable(words);
  if (/^#[0-9a-f]{6}$/i.test(sheet.accent ?? "")) document.documentElement.style.setProperty("--accent", sheet.accent);
  entries = flatten(sheet);
  if (TOKEN) {
    const me = await fetch(`${API}/v1/me`, { headers: { authorization: "Bearer " + TOKEN }, cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    role = me?.role ?? null;
    myName = me?.name ?? null;
  }
  try { rows = await loadRows(); } catch { online = false; }
  reindex();
  render();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
  window.addEventListener("focus", refresh);
}
main();
