// The Khmer review's one piece of logic, shared by the page (sheet.js) and the import (review.mjs pull), so both read
// "latest entry wins" (founder 2026-11-21) the same way. Plain ES module: no DOM, no Node.

/** The words a page fills in, such as {n} or {head}. */
export const placeholders = (s) => [...new Set(String(s ?? "").match(/\{\w+\}/g) ?? [])].sort();

/** Does the Khmer keep the same {placeholders} as the English (or, where the English is empty, as our draft)? → missing, extra */
export function placeholderGap(entry, km) {
  const want = placeholders(entry.en || entry.km || "");
  const got = placeholders(km);
  return { missing: want.filter((p) => !got.includes(p)), extra: got.filter((p) => !want.includes(p)) };
}

/**
 * One entry's state, from the store's rows (oldest first).
 * → { latest, earlier, notes, status, khmer, englishChanged, draftChanged }   (earlier: the reviews before the latest, newest first)
 *   status: "todo" (no review) · "approved" (right as drafted) · "corrected" (a reviewer's text)
 *   khmer: what the site should show now (the latest review, else our draft, else null)
 *   englishChanged: the English is not what the latest reviewer saw · draftChanged: an approval of a draft we have since changed
 */
export function stateOf(entry, rows) {
  const mine = rows.filter((r) => r.key === entry.key);
  const reviews = mine.filter((r) => r.kind === "approve" || r.kind === "text");
  const latest = reviews.length ? reviews.reduce((a, b) => (b.id > a.id ? b : a)) : null;
  const notes = mine.filter((r) => r.kind === "note").sort((a, b) => a.id - b.id);
  const earlier = reviews.filter((r) => r !== latest).sort((a, b) => b.id - a.id);   // newest first
  if (!latest) return { latest: null, earlier, notes, status: "todo", khmer: entry.km ?? null, englishChanged: false, draftChanged: false };
  return {
    latest, earlier, notes,
    status: latest.kind === "approve" ? "approved" : "corrected",
    khmer: latest.km,
    englishChanged: (latest.base_en ?? "") !== (entry.en ?? ""),
    draftChanged: latest.kind === "approve" && latest.km !== entry.km,
  };
}

/** Every entry of a sheet, numbered in order, with its group. */
export function flatten(sheet) {
  const out = [];
  for (const g of sheet.groups) for (const e of g.entries) out.push({ ...e, group: g.name, waiting: !!g.waiting, n: out.length + 1 });
  return out;
}

/** A sheet's JSON, checked: → list of problems (empty = fine). The one contract every site's adapter writes. */
export function checkSheet(s) {
  const p = [];
  if (!s || typeof s !== "object") return ["not an object"];
  if (s.version !== 1) p.push("version must be 1");
  if (typeof s.surface !== "string" || !/^[a-z0-9][a-z0-9.-]{0,99}$/.test(s.surface)) p.push("surface: the site's host, lowercase");
  if (typeof s.title !== "string" || !s.title) p.push("title: required");
  if (!Array.isArray(s.groups) || !s.groups.length) p.push("groups: at least one");
  const seen = new Set();
  for (const [gi, g] of (s.groups ?? []).entries()) {
    if (typeof g.name !== "string" || !g.name) p.push(`group ${gi + 1}: name required`);
    for (const c of g.context ?? []) {
      // a drawing of where the words appear: a path on the page's own (demo) site, or an https address
      if (typeof c?.url !== "string" || !/^(\/[^\s"<>]*|https:\/\/[^\s"<>]+)$/.test(c.url) || !["km", "en"].includes(c.lang) || ![undefined, "drawing", "page"].includes(c.kind)) p.push(`group ${gi + 1}: context needs { url: "/S1.html" or https://…, lang: "km" | "en", kind?: "drawing" | "page" }`);
    }
    if (!Array.isArray(g.entries) || !g.entries.length) { p.push(`group ${gi + 1}: entries required`); continue; }
    for (const e of g.entries) {
      if (typeof e.key !== "string" || !/^[A-Za-z0-9_.:-]{1,120}$/.test(e.key)) p.push(`bad key: ${JSON.stringify(e.key)}`);
      else if (seen.has(e.key)) p.push(`duplicate key: ${e.key}`);
      seen.add(e.key);
      if (typeof e.en !== "string") p.push(`${e.key}: en must be a string ("" when shown in Khmer only)`);
      if (e.km !== null && typeof e.km !== "string") p.push(`${e.key}: km must be a string or null`);
      if (!e.en && !e.km) p.push(`${e.key}: neither English nor Khmer`);
      if ((e.en?.length ?? 0) > 8000 || (e.km?.length ?? 0) > 8000) p.push(`${e.key}: longer than 8000 characters (the store's cap)`);
      if (e.note !== undefined && (typeof e.note !== "string" || e.note.length > 300)) p.push(`${e.key}: note must be a short string (where it appears, ≤300)`);
    }
  }
  return p;
}

/** Does an entry match a find box? By its number, its key, its English or any Khmer it has had (the draft, the reviews). */
export function matches(entry, state, q) {
  q = String(q ?? "").trim().toLowerCase();
  if (!q) return true;
  if (/^#?\d+$/.test(q)) return String(entry.n) === q.replace("#", "");
  const hay = [entry.key, entry.en, entry.km, entry.note, state?.khmer, ...(state?.earlier ?? []).map((r) => r.km), ...(state?.notes ?? []).map((r) => r.note)];
  return hay.some((h) => typeof h === "string" && h.toLowerCase().includes(q));
}

/** The tool's own words (words.json) as { key: [km, en] }. */
export function wordTable(words) {
  const t = {};
  for (const g of words.groups) for (const [k, v] of Object.entries(g.entries)) t[k] = [v.km, v.en];
  return t;
}
