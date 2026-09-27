# Finding Self — Updated Working Prototype 12 (2026-09-26)

## What changed since Prototype 11

**Draw your own sampler stitch.** Tapping "Stitch it into your sampler" on the "Practice complete." screen no longer stamps a fixed motif — it opens a drawing pad where you draw the stitch yourself, with your finger or cursor, in one of four thread colours (sage, terracotta, indigo, charcoal). The running-stitch line goes straight onto the sampler cloth with nothing around it — no patch box, no border — just your thread on the weave. "Stitch it in" is disabled until you have drawn something; "Clear" wipes the pad, "Not now" backs out without storing anything, and "Or add a simple mark instead" keeps a low-pressure fallback. Old stitches from earlier builds still show on the cloth, boxless, exactly as stored. The Help page's Practices section describes the drawing.

**Scissors for photos in Small things.** Wherever a photo can be attached — the composer and any entry with a photo — there is now a little scissors button. Tapping it opens a cutting board with the photo; a small scissors icon follows your finger or cursor as you drag it around the part you want, leaving a dashed cut line. You can lift and carry on; the cut finishes by itself once your line closes into a loop, and the chosen shape is cut out with transparency around it, like a piece snipped from a magazine for a zine or collage. "Start over" clears the line, and "Keep the whole photo" (or closing the board) leaves the original exactly as it was — cutting is always optional. Kept lists stay read-only: their photos can be viewed larger but not cut. The Help page's Practices section describes the scissors.

## Verification

- Automated suite: 138/138 passing (134 existing + 4 new sampler-pattern checks), zero page errors.
- Scenario runner: 64/67 (same 3 pre-existing failures as the last build).
- Content graph: all destinations resolve (content package untouched).
- Walked through in a browser: genuine practice completion → drawing pad (draw with mouse, thread colour change, save disabled until drawn, Clear, Not now, simple-mark fallback); drawn stitch stored with its pattern and persisted across reload; stitch on the cloth with no box or border; old motif stitches still render boxless; stitch detail overlay and removal; seasonal cloths; scissors board opens from composer and from the photo viewer; scissors icon follows the pointer; closed loop auto-finishes the cut and stores a transparent PNG cut-out; Keep-the-whole-photo leaves the JPEG untouched; kept-list viewer offers no cut-out; 390px phone layout clean for both new tools; elemental rooms and Small things walkthroughs still green.

---

# Finding Self — Updated Working Prototype 11 (2026-09-26)

## What changed since Prototype 10

**Two elemental rooms — for fury and grief.** Longer Self-Explorations has two new rooms for harder feelings, sitting in the explorations room as a small flame and a basin of water:

- **Somewhere to put the fury** — a low ember field for anger, with no requirement to calm down, reframe it, or find the lesson. Slow sparks rise; nothing here asks anything of you.
- **In memory** — deep water for grief: for a person, a hard year, or a version of you that is gone. Slow light shafts and drifting motes; nothing here needs to be positive.

Inside each room, the visual arrangement is the main activity, not a form to fill in. A tray of small objects (an ember bowl, a charred branch, red thread, a stone, a small frame — or a candle, a flower, a shell) can be tapped into place, dragged around, nudged with the keyboard, and removed — set up like an altar for grief or a memorial for fury, zine-style. Words are secondary and optional: a prompt with a "Another question" cycler and a free writing area, each on its own small backing rather than one big card, so the elemental background stays visible. Nothing is kept unless you tap "Keep this" — an altar with no words can be kept; an empty room keeps nothing. Leaving with unkept work asks first. Kept rooms live in Things I'm keeping, where they can be reopened exactly as arranged or removed. The Help page's Explorations section describes both rooms.

**Practices, straight from Home.** The home entry "Rehearse in my free time" is now **Practices**, and it opens the Practice library directly — the confusing old path (home → rehearse → "Leave this practice" → library) is gone. The library stays the hub: leaving a practice with Exit returns to the library, and the "Practice complete." screen now leads back to the library too. The Help page's Practices section describes the whole area — the sampler, the rehearsals, and Small things.

## Verification

- Automated suite: 134/134 passing (127 existing + 6 new elemental-storage checks + 1 new practice-exit check), zero page errors.
- Scenario runner: 64/67 (same 3 pre-existing failures as the last build).
- Content graph: all destinations resolve (content package untouched).
- Walked through in a browser: both rooms open from the explorations room; flame and basin sit without overlapping anything; ember field and deep water animate; tray → tap-to-place → drag-to-rearrange; prompt cycling; keep with words + arrangement (positions persist); kept confirmation → Things I'm keeping tile → reopened exactly as arranged → remove; grief kept as altar-only with no words; empty keep blocked; 390px phone layout with no horizontal overflow; two-step leave; Home → Practices → library directly; Practice 1 begins; Exit mid-practice returns to the library; non-practice Exit still goes home; "Practice complete." leads to the library; sampler and Small things walkthroughs still green.

---

# Finding Self — Updated Working Prototype 10 (2026-09-26)

## What changed since Prototype 9

**Practice 3 — Small things.** The Practice library now lists a third practice: a day's micro-list. "What did today hold? Two to six words each. No sorting into good or bad." It works two ways, on one screen:

- **Leave it open:** begin the list in the morning (or whenever) and add things as they happen. Each entry is stamped with the current minute automatically — you only write the words, the way a photo carries its own timestamp. Close the list at night (or whenever) and everything accumulated is kept.
- **Key it in at once:** sit down for a few minutes and enter the whole day. Every entry's time can be tapped and set by hand, so morning pills logged at night still read as morning.

Entries can be words, a photo, or both — a photo can stand in for words or go with them. Photos are shrunk on the device before being kept, so they fit in the app's storage. Tapping a photo shows it larger.

The app's keep-rule holds throughout: the list lives only as an open draft until you tap "Close and keep this list" — nothing is kept before that. Closing an empty list keeps nothing. A kept list opens as a day's collection: entries as small objects in a two-column field — photo entries and word-slips side by side, each with a tiny time-caption — rather than a ledger of lines. The whole day stays visible together: neither the Instagram-post pressure for each entry to be substantive nor the Instagram-story vanishing. Past lists are reachable from the practice screen any time. Settings' export and delete-everything cover the new lists automatically, and the Help page's Practices section describes the practice.

One deliberate non-choice: closing a list does not offer a sampler stitch. Daily micro-lists would flood the seasonal cloth and change what the sampler means; that stays yours to decide.

## Verification

- Automated suite: 127/127 passing (112 existing + 15 new small-things checks), zero page errors.
- Scenario runner: 64/67 (same 3 pre-existing failures as the last build).
- Content graph: all destinations resolve (content package untouched).
- Walked through in a browser: library → Begin → empty guidance, live entry with automatic minute stamp, hand-setting a time for an earlier entry, photo via the composer, photo on an existing entry, tap-to-enlarge viewer, entry removal, reload mid-day resuming the open list, close-and-keep → "Kept." → Past lists → read-only view, starting a fresh list afterwards, and the layout at phone width (390px).

---

# Finding Self — Updated Working Prototype 9 (2026-09-26)

## What changed since Prototype 8

**Your sampler.** The Practice library page now opens with a sampler cloth: each completed practice can add one stitch to it. Practice 1 stitches a sage-green bloom, Practice 2 a terracotta crossing — the same practice always makes the same motif, so repetition accumulates visibly instead of feeling redundant. Tapping a stitch shows when it was stitched, with buttons to practice again or remove it. Cloths are seasonal (this one is the Autumn sampler); finished seasons are kept as "Finished cloths" you can revisit.

One deliberate choice: the stitch is never automatic. When a practice ends, the "Practice complete." screen offers "Stitch it into your sampler" — one tap adds it, keeping the app's rule that nothing is stored unless you choose to keep it. The Help page's Practices section mentions the sampler.

**Packaging fix included.** Prototype 8's zip accidentally omitted the `.nojekyll` file GitHub Pages needs; it is restored in this archive. Prototype 8 was never uploaded, so this build supersedes it — there is no separate Prototype 8 correction.

## Verification

- Automated suite: 112/112 passing (101 existing + 11 new sampler checks), zero page errors.
- Scenario runner: 64/67 (same 3 pre-existing failures as the last build).
- Content graph: all destinations resolve.
- Walked through in a browser: genuine practice-completion path (S1 closing question → "Practice complete." → stitch button → confirmation), stitch stored and shown on the library cloth, stitch detail overlay, stitch removal, a finished season's cloth and back navigation, the empty-cloth state, and the completion screen with no practice context (no stitch button, no error).

---

# Finding Self — Updated Working Prototype 8 (2026-09-26)

## What changed since Prototype 7

**Practice loop fixed.** In "Rehearse in my free time," choosing any answer on the "How do you want to treat it for now?" step — including "Hear it" — used to silently restart the practice from the beginning. Now every choice moves forward to the closing question ("Who decides what happens next?") and then to "Practice complete."

**Notebook removed.** The Notebook section is gone from the home page, along with all note-taking: no more "Make a note," saved-notes list, note font setting, or attaching notes to explorations and arrangements. All Longer Self-Explorations and their content are untouched. A new "Things I'm keeping" button at the bottom of the Longer Self-Explorations page opens your kept explorations and arrangements. If you had notes attached to an arrangement before, the arrangement now quietly notes how many were attached; the old notes themselves are never shown or deleted.

## Verification

- Automated suite: 101/101 passing, zero page errors.
- Scenario runner: 64/67 (same 3 pre-existing failures as the last build).
- Content graph: all destinations resolve.
- Walked through in a browser: home, all eight exploration entry points, "Things I'm keeping," a legacy arrangement, Settings, Help, the practice fix, and a check-in flow.

---

# September 23 running prototype

The current implementation is `../updated-prototype/`; the workspace-root ZIP is its distributable. This build is ready for user review, not yet an accepted replacement design baseline.

## Source precedence

Used current Figma `TU6GLKPWvHCXFJVd1I7cuo`, current node context and screenshots, supplied SVGs, and the project records referenced in PROJECT_STATE.md. Used the preceding implementation for the existing engine, notes, scenarios, reflection, arrangements and navigation. Did not recover the superseded original ZIP. Did not inspect, clear, export or overwrite personal browser data.

## Implemented fuller intent

- Room: logical coordinates, artwork/contact/support bounds, supported stacks, downward settling, floor depth, surface capacity/overhang restrictions, cancellation, undo/reset, local persistence, mouse/keyboard/touch input, landing preview and reduced-motion handling. Archive overlap samples solid artwork, excludes captions, and archives only the grabbed exploration; unsupported children settle separately.
- Store/archive: stable IDs and catalogue slots, reversible real drags, tentative selections, atomic checkout after the helper-follow decision, basket return to its home, packed ownership across reload, individual unpacking, no resale of owned/archived objects, and original archived exploration routes. Store concepts remain labelled as concepts.
- Writing: thirteen contribution objects; six independent space names and writings; original-person default and all ten appearance choices; eight leaf category colors and same-slot nested language help; saved-category reopening; first/returning growth behavior; stable story/bookmark identity; continuous optional contract ratings; complete scroll with reachable footer. Explicit saves retain drafts on storage failure.
- Current artwork: supplied SVG replacements for the plant, leaves, buildings, person, notebook, room objects, relationships, influences, storybooks/bookmarks, gemstones, scrolls and slider faces. Six facet-preserving gemstone-popup palettes. Full original introductory explanations remain behind About controls.
- Helper: off at fresh session start, Settings invitation, three independent placeholder passports, per-navigation Yes/No/Stay, cancellable three-second arrival, viewport docking, selected-material and operation review, per-request permission, abort/timeout handling, editable/reorderable/groupable pieces and provenance-preserving kept additions alongside original writing. Live adapters require complete passport fields. There is no default model endpoint, credential, or canned-output substitute.

## Validation

All browser work used new isolated Playwright contexts and synthetic data, with no personal browser profile access.

| Check | Result |
|---|---|
| Existing engine | 117/117 |
| Existing scenarios | 67/67 |
| New interaction acceptance suite | 67 checks |
| Actual gesture and mobile suite | 23 checks |
| Checkout, cancellation, repair and caption edge cases | 15 checks |
| Desktop page/asset smoke pass | No page or asset errors |

Visual inspection covered Home, room, plant, map, contributions, influences, stories, communities, phone-sized pages and the scroll footer. Corrected the two issues the user identified during review: room captions overlapping their objects, and the photograph prompt cut off on An influence. Also corrected other narrow-screen influence prompts, replaced the old notebook overlays, and verified the complete bottom scroll roll.

Tests are retained in the project at `updated-prototype/validation/iteration-{acceptance,gestures,edge-cases,smoke}.cjs`, outside the cleaned runtime ZIP. They use the build machine's bundled Playwright path. Current screenshots are in `updated-prototype/validation/current-screens/`. The model test adapter is installed only inside the test browser and does not ship as a configured helper.

## Remaining intentional boundaries

The six new store concepts have no defined exploration content. The three helper models still need real providers/passport details before generation is usable. Physical microphone recording and native OS share targets are preserved but have not been manually verified. This is a local review prototype; there is no account synchronization or public deployment.
