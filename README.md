# demo.heartbank.ceo

Design source for **HeartBank Shops** — a storefront platform on `heartbank.ceo`, drawn
2026-08-31 → 09-03. **30 artboards across five surfaces**, plus a clickable walkthrough.

**Live:** <https://demo.heartbank.ceo> · **GitHub Pages**, `main` branch root (the
`brand.333.eco` pattern, not Firebase).

**The editable canvas** — all 30 artboards on one pan/zoom surface, five pages:
<https://claude.ai/code/artifact/56af2e2b-c4fc-4f52-a859-61c19da27fe8>
⚠️ **It is a SEPARATE copy, and editing an artboard here does not update it.** Re-seed and
republish to that URL after any artboard change (see *Rebuilding the canvas* below), or the canvas
quietly serves the older screens. ⭐ **Extract it first and diff against these files** — 30
identical and 1 differing is what a clean re-seed looks like; anything else means someone saved in
the GUI and you are about to discard their work.

⚠️ **`robots.txt` disallows everything and `index.html` carries `noindex`.** This is reachable by
link and deliberately not searchable — it names real people, and it is a demo handed to someone
directly, not a published page.

⛔ **Nothing here is the shop.** No order is taken, no money moves, nobody is charged. Every price,
name and order on these screens exists to draw the design.

## What is in here

| | |
|---|---|
| `index.html` | the front door — **generated**, see below |
| `home-coffee-walkthrough.html` | the clickable walkthrough |
| `*.dc.html` | one artboard each — a self-contained page with inline styles |
| `canvas.json` | layout: positions, the five pages, the sticky notes |
| `build-index.py` | regenerates `index.html` from `canvas.json` |
| `support.js` | a no-op; the canvas editor injects the real one at render time |

⛔ **Do not hand-edit `index.html`.** It is generated from `canvas.json`, so an artboard added to
the canvas cannot end up missing from the front door and the two cannot drift. Change the canvas,
then `python3 build-index.py`.

## The walkthrough

`home-coffee-walkthrough.html` — built for Kanghna, who runs Home Coffee.

⭐ **Unlike the artboards, this one just works.** Open it — no build step, no placeholder script.
**Three roles share one order**: an order placed as **អតិថិជន** appears in the **អ្នក** queue, and a
delivery then appears to **អ្នកដឹក**. The choice of *pickup · delivery · gift code* changes what
checkout asks for, when payment happens, what the counter's button says, and whether a rider is
involved at all.

| Path | Pay | Counter | Ends |
|---|---|---|---|
| **Pickup** | after, at the counter | *Start making it* → *Handed over — settle up* | *"The coffee was theirs before the money was yours."* |
| **Delivery** | before anyone rides out | *Start making it* → *Hand it to a rider* | rider enters the door code — *"You carried coffee, not money."* |
| **Gift code** | up front | *Release the code* | a code for **a coffee, not an amount** |

The owner also **runs the shop**: an owner-only tab bar opens *Shop* (price, prep minutes, sold-out
toggle, add an item) and *People* (staff, approving riders). Mark the pizza sold out and it says so
on the customer's menu; change the minutes and the customer's wait estimate moves.

## Reading the artboards

Open any `.dc.html` in a browser — each is a complete page.

⚠️ **`<x-dc>` is not a real element.** It wraps the body for the canvas runtime; a browser ignores
it and renders the contents. Strip it and the `<helmet>` wrapper to lift a screen into real code —
the styles inside `<helmet><style>` are ordinary CSS.

## What the screens are arguing

Design decisions here are load-bearing, not decorative:

- **Goods first, payment after** — the Cambodian order. Gift codes are the paid-up-front exception,
  because there is nobody standing there to hand it to.
- **Checking in is how you take your place in the line** — two queues, arrival order.
- **Guest checkout is the compliance architecture**, not a convenience. The customers are students.
- **The pickup label is public; the delivery code is secret.** Conflating them breaks the proof.
- **Sales and thanks are two figures, never one.**
- **The platform records; people settle.** No custody, no payroll, no cut of anything.
- **No reviews, no ratings, no scores** — on shops, on riders, on anyone. A rider queue offers
  *whose turn it is*, never *who is best*, and nothing compares a shop's wait estimate to what
  really happened.
- **Every refusal is printed on the surface where it would be violated** — see `Admin*.dc.html`,
  where most of the argument is about what the screen must never contain.

## Design system

`brand.333.eco` v1.3.0 governs: the role tokens, the type scale, `IBM Plex` and `Noto Sans Khmer`,
and the **B-Emblem™** — a heart rotated 45° into a bistable capital B, inline SVG with
`fill="currentColor"`, rotation baked into the path. The `.ceo` accent is a pinned green.

## Rebuilding the canvas

The artboards seed into a copy of the Claude Design payload and publish as an Artifact:

```
node <skill>/seed-canvas.mjs --template <skill>/payload.template.html \
  --out heartbank-shops.html --title "HeartBank Shops" \
  --artboard Main.dc.html --artboard Find.dc.html ... \
  --canvas canvas.json
```

⚠️ **Verify div balance and attribute integrity across every artboard as part of any rebuild** — a
patch script that dies between building its replacement and writing it leaves a half-applied edit,
and div balance alone will not catch a splice that lands inside an attribute.

⚠️ **For any file with a `<script>`, also `node --check` the extracted script and then run it.**
Structural checks cannot see a syntax error; that shipped here once, and the page rendered perfectly
while doing nothing at all.
