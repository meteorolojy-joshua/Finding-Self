# My Presence — Updated Working Prototype 28 (2026-10-06)

## What changed since Prototype 27

**Your hand-drawn dotted frame on “+ add a check-in.”** The homepage add box now uses your cropped 785×536 hand-drawn frame as one whole background image, so the dots keep their round, even proportions. The dark scheme uses the white-dot variant; hover lift, press depth, and the click-to-add flow are unchanged.

**Lighter paper and top bar.** The default paper texture is lightened 30% toward white, and the top-bar wood is lightened 25% toward white.

**Garden leaves stay attached.** The garden’s attached leaves keep their 1.3× size, with each leaf’s base pinned to the stem so the larger leaves no longer drift past it. The leaf-pile “real heap” restyle remains unapproved and unverified.

**Cleaner check-in wording.** Previous-answer lead-ins such as “Your purpose: …” are removed from question text across the templates. SS01, SS02, and SS06 use your revised wording. SS06 now starts at “What can you notice as a simple fact…?”, with new branches for scattered attention and returning thoughts; the “Ask for information” and “Is this enough for now?” steps are gone. In the template picker, templates already on your home page now show a small “already in use” sticker instead of extra text.

**A train line on every check-in.** Every check-in question page after the first now shows a train line of the questions and answers already covered in the current run. Template questions use short labels; questions you create use their first six words. After the last question, a completed train-line summary page appears, with Done to leave the check-in.

**Editor review marker.** Every check-in editing page now ends its Q/A timeline rail with a dark diamond marked “Review,” showing where the final summary page sits in the flow.

**Settings buttons no longer flash paper.** The settings buttons keep their fabric-patch look, but the sizing fix is now applied before the first paint, so they should no longer flash notebook paper on load.

## Verification

- Syntax checks passed for the edited JavaScript and CSS files.
- The scenario runner remains at its known 64/67 baseline; the only failures are the pre-existing LIST-02, CURATE-09, and CURATE-10 cases. That baseline does not verify the new train line, summary page, sticker, Review diamond, or flicker fix.
- The new flows have not yet been end-to-end browser-tested across pre-made, modified-template, from-scratch, multi-select, custom-text, inventory/More-options, back-navigation, and repeated-question routes.

**Known open items.** The SS02 and SS06 custom-text/inventory routes still need a flow audit; the final summary page currently includes the heading “Here's what you covered” plus Done rather than only the train line; the Review diamond’s vertical centering needs a visual re-measure; the settings-button flicker fix has not been visually confirmed; the leaf-pile restyle is unverified; and no upload confirmation for Prototype-27 was received.

---

# My Presence — Updated Working Prototype 24 (2026-10-01)

## What changed since Prototype 23

**Torn paper edges.** Everything with your notebook-paper background — the About popups, delete confirmations, the schedule popup, tutorial boxes, the fury name-it popup, the leaf dialog, and the larger light buttons — now has the shape of a scrap of paper torn out of somewhere, with uneven jagged edges. Each piece tears a little differently so they don't look stamped out. Keyboard focus and the selected-choice ring still show, drawn just inside the torn edge.

**No more borders on the small wood buttons.** The small wood-textured buttons (the × buttons, the pencil/clock/dustbin by the check-in title, undo/redo, the Q/A timeline pills, the schedule day pills) no longer show any coloured border.

**Your fabric on the larger boxes and buttons.** Your fabric texture is now the background of the larger boxes and buttons that still had flat fills — the green action buttons, the editor's answer boxes and add buttons, the schedule sections, text fields, note cards, banners, the dark-green popup buttons, and more. Each one keeps its own colour: a dark-green button shows the fabric in dark green, a cream box in cream. Things that already had a texture (the torn notebook paper, the wood, the page background), illustrated objects and scenes, the small buttons, and the Soft dark scheme's dark fills all behave as before; the book pages kept their ruled lines and the note board kept its dots.

## Verification

- Automated suite: 143/143 passing, zero page errors.
- Walked through in a browser: torn edges on popups and larger buttons (including keyboard focus on a torn button), borderless wood buttons in the editor, and the fabric tinted to each element's own fill across the Woodland, Warm pastel, and Soft dark schemes. Desktop and 390px phone layouts checked, zero horizontal overflow.

**Known open items (unchanged).** Photo options on the community rock/present writing areas, typed-only gemstone "What draws me to it", lamp-room leaf photo persistence, real photo-picker testing for the Furnace wood, specialized-cursor behavior against the app-wide hand rules, and the mobile Self-Records ledge choice (awaiting your pick).

---

# My Presence — Updated Working Prototype 23 (2026-10-01)

## What changed since Prototype 22

**Your notebook paper on popups, your wood on small buttons.** Your lined notebook paper is now the background of popup pages — About this page, delete confirmations, the check-in schedule popup, the tutorial boxes, the fury name-it popup, and the leaf dialog — cut to the shape of each popup rather than stretched, with the red margin line trimmed away. Your light wood texture is on the small flat buttons: the × buttons, the pencil/clock/dustbin by the check-in title, undo/redo, the Q/A timeline pills, and the schedule day pills — each cut to the button's own shape. The illustrated popups (room, gemstone, contract scroll) keep their own artwork, and the Soft dark scheme is unchanged.

**Template copies keep the exact template name.** Both ways of making your own version of a template — "modify it myself" and the pencil on a pre-made home card — now name the new check-in exactly after the template. The "— my version" suffix is gone.

**Living-room floor, cut shorter, with your textures.** The Self-Explorations living room now ends shortly below the "pick more self-explorations" basket instead of stretching so far down. Your white plaster texture is tiled across the wall and your light wood photo is fitted as one continuous floor; everything in the room stays where it was.

**Timeline rail stays inside the editor.** The check-in editor's vertical timeline (the line with the Q/A pills) no longer runs past the bottom of the editor card on short screens — its visible area ends comfortably above the card's bottom edge and scrolls internally, still jumping to any step you tap.

**Purple focus box removed.** The lavender box that still appeared behind the selected question or answer in the check-in editor is gone. The item you're editing still shows in full colour while the others fade back.

**Steady homepage description.** The Self-Explorations description on the homepage no longer lifts on hover; "View all →" and the ledge objects still do.

## Verification

- Automated suite: 143/143 passing, zero page errors.
- Walked through in a browser: the notebook and wood textures on popups and small buttons (including the dark "on" states and the Soft dark scheme, which are untouched), template naming on both paths, the shorter living room with the new textures at desktop and 390px, the timeline rail at short screen heights, and the editor with no purple box. Desktop and 390px phone layouts checked, zero horizontal overflow.

**Known open items (unchanged).** Photo options on the community rock/present writing areas, typed-only gemstone "What draws me to it", lamp-room leaf photo persistence, real photo-picker testing for the Furnace wood, specialized-cursor behavior against the app-wide hand rules, and the mobile Self-Records ledge choice (awaiting your pick).

---

# My Presence — Updated Working Prototype 22 (2026-09-30)

## What changed since Prototype 21

**Delete any question or answer with its own × button.** The dustbin at the bottom-right of the check-in editor is gone. Every question and answer now carries a small × at its top-right corner. Tapping it asks "Are you sure you want to delete this question?" or "Are you sure you want to delete this answer option?", with Confirm delete and Cancel. A question that still has answers can't be removed yet — the popup explains "You must delete all subsequent answers before you can delete this question." The last answer left at its level can't go while questions follow it — "You must delete all subsequent questions, or add another answer option instead, before you can delete this answer option." The first question of a check-in can't be deleted at all ("The first question of a check-in cannot be deleted."). The small dustbin beside the title still deletes the whole check-in, as before. Deletions work with undo/redo and survive reloads.

**Check-in editor, rebuilt.** The large Rename and Delete Check-In buttons are gone — a small dustbin beside the title pencil deletes the whole check-in (same confirmation as before), and the pencil renames inline. The "Drag item here to edit" box is gone: the item you're editing shows in full colour while the others fade back, and the hint reads "Drag onto the item being edited." The timeline now shows one numbered pill per question round (Q1, Q2…) on the left and one per answer set (A1, A2…) on the right instead of a tick per item; it no longer scrolls sideways and its vertical line runs the full height of the list.

**Interactive first-run tutorial.** The tutorial is now a guided 6-step tour: 1 Add a Check-In → 2 Use A Template or Create From Scratch → 3 Choose a Template (Before I Enter Social Media) → 4 Use Template As It Is or Modify It Yourself First → 5 Self-Explorations → 6 Self-Records. Each setup step highlights where to tap, with Back and Exit throughout; modifying the template keeps your "— my version" copy as a home card and continues the tour.

**When should this check-in activate?** A small clock button between the title pencil and dustbin opens "When do you want this scenario to activate?" — tick "at certain times" (Daily, Weekly, or Particular days, each with a time) and/or "upon certain user actions" (Before opening social media, After being on the phone for one hour, When I first pick up my phone, Before bed, After a phone call). The choice is saved per check-in and shown as a small line under its home-page card; a check-in whose time falls within the past hour is marked "due now" when the app opens. Note: as a static prototype the app records the intention — it cannot detect phone activity or fire real alarms.

**Your paper texture.** Your repeating paper texture is now the default page background, tinted per colour scheme (Woodland, Warm pastel, Soft dark).

**Undo/redo placement.** The editor's old Exit button is removed entirely; undo and redo are now two small round buttons sitting below the title header and above the editing area (undo fades when there is nothing to undo).

## Verification

- Automated suite: 143/143 passing, zero page errors.
- Walked through in a browser: per-item × deletion (confirm/cancel wording and button order, both guard popups, first-question message, undo/redo, persistence after reload), the full tutorial tour including the modify-template path, the schedule popup (save, validation, summary lines, due-now marking), the rebuilt editor and timeline rail, and the paper texture in all three colour schemes. Desktop and 390px phone layouts checked, zero horizontal overflow.

**Known open items (unchanged).** Photo options on the community rock/present writing areas, typed-only gemstone "What draws me to it", lamp-room leaf photo persistence, real photo-picker testing for the Furnace wood, specialized-cursor behavior against the app-wide hand rules, and the mobile Self-Records ledge choice (awaiting your pick).

---

# My Presence — Updated Working Prototype 21 (2026-09-30)

## What changed since Prototype 20

**Your bookshelf, trolley, and trash can.** The Inherited Stories page now uses your own bookshelf, library trolley, and flip-top trash can illustrations exactly as drawn. "My bookshelf" sits above the shelf; its boards are labelled KEEP, UNDECIDED, and CHANGE. The dotted add-story book rides on the trolley and makes a new Undecided story. The trash-can lid swings open when you drag it upward, or tap it to open/close (keyboard: Enter/Space), so you can see the discarded books; "discarded stories" is captioned beneath the can. Shelf books are wider and read cleanly ("No bookmark yet" no longer clips), and empty shelf levels now accept dropped books. The bookshelf keeps its size advantage over the trolley and bin at every screen width.

**Your door-hanger check-in cards.** Each homepage check-in card is now your door-hanger sign — the check-in's name sits on the board, the slight tilt is kept, the card lifts on hover and press, and the pencil button sits at the board's top-right corner and rides the lift. Its hover tip is simply "edit".

**Your long ledge.** Your long horizontal ledge now holds the Self-Explorations preview, the desktop Self-Records buttons, and the objects on the interactive Self-Explorations room shelf. On phones, each Self-Records button keeps its own small ledge so everything stays readable.

**Homepage words.** New descriptions under the section headings — Check-Ins: "Ground yourself with a series of questions and answer options, or prepare them in advance for yourself"; Self-Explorations: "Build a sense of your own presence, and let your feelings, preferences, intentions, and plans take up (virtual) space - or come and revisit them"; Self-Records: "Keep, gather, or revisit records of the small things in your days". The Self-Explorations preview now reads title → description → View all → ledge.

**Check-in editor.** The check-in's title now shows at the top with a small pencil for inline editing (Enter or click-away saves, Escape cancels). The "Draft changes not active" notice is gone. A timeline runs down the left of the page — ticks jut left for each question step and right for each answer step in run order; tapping a tick puts that item into the editor, and the current item's tick is emphasized.

**Community scroll.** Removed the leftover "The arrangements I choose, question, or leave undecided." line; the popup fits its parchment on desktop and phone.

**One torch beam.** On "Aspects of My Self to Explore", the torch no longer shows two overlapping rays — the extra ray baked into the torch drawing is gone, so the single beam begins exactly at the torch mouth and gemstones light up where you see the light. Note: the small torch resting on the Self-Explorations room shelf now sits without a beam too, since they shared the drawing — it looked clean when checked; say the word if you want a beam there.

## Verification

- Automated suite: 143/143 passing, zero page errors.
- Walked through in a browser: bookshelf art (books drag between Keep/Undecided/Change and the bin, lid drag/tap open, discarded books visible, empty shelves accept drops), door-hanger cards (tilt, lift, pencil ride, "edit" tip), ledge art on all three shelves, homepage wording and preview order, check-in editor (inline title rename, timeline tap-to-jump on blank and full templates), community scroll popup fit and planting scene at 390px, single torch beam with mouth-aligned ray and gemstone illumination. Desktop and 390px phone layouts checked, zero horizontal overflow.

**Known open items (unchanged).** Photo options on the community rock/present writing areas, typed-only gemstone "What draws me to it", lamp-room leaf photo persistence, real photo-picker testing for the Furnace wood, specialized-cursor behavior against the app-wide hand rules, and the mobile Self-Records ledge choice (awaiting your pick).

---

# My Presence — Updated Working Prototype 20 (2026-09-29)

## What changed since Prototype 19

**The cursor now grabs.** Holding the mouse button down turns the open grabby hand into a closed fist — the hand visibly grabs — and it opens back up when you let go. Text fields still show the I-beam.

**Your cupboard and basket.** The Self-Explorations room now uses your cupboard and shopping basket illustrations in place of the previous drawings.

**Your Furnace dial base.** The fire-intensity dials now sit on your clean dial illustration, so no incomplete grey patch shows behind the rotating pointer.

**Inherited stories page.** The page header is now "What narratives have you inherited? Which ones do you want to discard, keep, change, or remain undecided about?" The old "Collect inherited stories. Decide what you want to keep." line is gone.

**Community scroll, continued.** Your rock and present illustrations now hold the writing areas (the present's old white box is gone — it sits directly on the cream scroll). "What I appreciate getting in or from this Community:" is now "What I can count on this community for:". The "Current arrangement:", "Terms I agree with:", and "Terms to reconsider:" lines and the bottom slider hint are removed. New investment question: "Imagine you have a choice (maybe you already do). How invested or distanced do I want to be in/from this community?" — five pots, the leftmost nearest; drag the figure to a pot and she plants the community there and walks back; pots also work from the keyboard; the choice is kept with the contract.

**Your home altar.** "In memory" on the Self-Explorations page now uses your small home altar illustration.

**Room welcome text.** The Self-Explorations page now opens with: "Click on the household objects, and use them to build a sense of your own presence, as well as your feelings, preferences, and intentions for action regarding the various people and situations around you in your life."

## Verification

- Automated suite: 143/143 passing, zero page errors.
- Walked through in a browser: cursor open-hand → closed-fist on press → open-hand on release; cupboard and basket rendering in the room and the store; dial face complete at all five anger settings with the pointer aiming at the set level; story-shelf page showing the new title with no leftover support text; community scroll (rock/present artwork, investment drag to a pot and keyboard choice, persistence after save/reopen); the new altar opening the grief room; the new room welcome text. Desktop and 390px phone layouts checked, zero horizontal overflow.

**Known open items (unchanged).** Photo options on the community rock/present writing areas, typed-only gemstone "What draws me to it", lamp-room leaf photo persistence, real photo-picker testing for the Furnace wood, specialized-cursor behavior against the app-wide hand rules, and the bookshelf/trash-can/trolley illustrations (supplied artwork, not yet integrated).

---

# My Presence — Updated Working Prototype 19 (2026-09-29)

## What changed since Prototype 18

**Titles on self-exploration objects.** Garden leaves, gemstones, and lamp-room leaves now have a Title field (60 characters) in their popups; saved titles appear beside their objects outside the popup. The wood dialog in the Furnace needs no title — "What are you angry about?" already identifies the piece.

**Photos instead of typed words.** Anywhere in Self-Explorations where you could type body text, you can now take a photo or choose one from your camera roll instead — a photograph of handwriting can replace the typed words. Titles stay typed (and may stay blank). Reopening an entry shows its saved photograph where the typed words would have been. Covers garden leaves, gemstones, spaces, community contracts, stories, contributions, lamp-room leaves, grief-room words, influences, and the Furnace wood response.

**Your Furnace dial and chip artwork.** The fire-intensity dials now use your dial illustration (face and pointer), with the pointer aiming at the level that is actually set across all five anger settings. Post-fire pieces hung on the wall now use your residual wood chip illustration, each tilted at a slight angle.

**Community scroll redesign.** The popup is now titled "My Assessment of This Community." "Name:" is now "The Name I Use for This Community:". "Obligation Level:" is now "Obligations This Community Wants From Me:" — with a rock holding the writing space and a horizontal slider to its right ("How heavy the obligations are"): drag left to shrink the rock, right to grow it; the rock never gets too small to write in. New section after that: "What I appreciate getting in or from this Community:" with a gift box and slider ("How much I experience myself receiving that I actually want"), working the same way.

**Cursor.** Your cursor is now a grabby hand everywhere in the app (slightly larger than usual). Text fields keep the normal I-beam text cursor so precise clicking stays easy.

## Verification

- Automated suite: 143/143 passing, zero page errors.
- Walked through in a browser: title/photo flows across all exploration dialogs (typed/photo switching, replace/remove, blank titles, 60-char limits, reopen/reload, legacy entries); Furnace dial drag/keys at all five levels, chip hanging tilted on the wall; contract rock/gift-box sliders resizing with text and positions persisting; cursor styles on body, buttons, and text inputs. Desktop and 390px phone layouts checked, zero horizontal overflow.

**Corrections (2026-09-29, post-P19 review).** Two notes above overstated what was actually verified:

- *Photos instead of typed words.* Coverage was not as complete as written: the community contract's rock and present writing areas do not yet offer photo options; the gemstone "What draws me to it" field is typed-only; lamp-room leaf photo persistence across reopen/reload was not re-verified; and the Furnace wood photo flow was exercised with synthetic file input, not a real photo picker. These are still open.
- *Cursor.* The specialized-cursor check was not done: drag grips, the Furnace/grief dial vertical-resize, the community horizontal sliders, and disabled controls were not individually rechecked against the app-wide hand rules, which may still override them. That check is still open.

# My Presence — Updated Working Prototype 18 (2026-09-28)

## What changed since Prototype 17

**Your own Furnace artwork.** The Furnace of rage now uses your illustrations throughout: your fireplace, your piece of wood, and your burning piece of wood — replacing the assistant-made drawings. Your fireplace-with-wood-and-fire is also the fireplace shown in the room on the Self-Explorations page.

**Furnace layout.** The wall for hanging things now sits above the furnace, full-width. Below the furnace, the unused wood pile sits at the bottom left and the anger dials at the bottom right (they stack vertically on narrow screens). The fireplace itself is substantially smaller than before.

**Furnace polish.** Wood added to the fire now rests on the ground at the bottom of the fireplace. Each dial's pointer aims at the marker for the anger level that is actually the case, and burning pieces grow with the anger setting without ever spilling past the right side of the page.

## Verification

- Automated suite: 143/143 passing, zero page errors.
- Walked through in a browser: drag wood into the fire, name it, Confirm; burning piece with its own dial; dial drag and arrow keys re-aim the pointer and resize the piece; five-piece cap with notice; fire-to-wall hangs a tiny plain-wood reminder and removes its dial; wall-to-bin forgets it; persistence across reload; leaving with Done/Back. Desktop and 390px phone layouts checked, zero horizontal overflow.

---

# My Presence — Updated Working Prototype 17 (2026-09-28)

## What changed since Prototype 16

**Furnace of rage rebuilt.** The room is now a fireplace with a wood pile below it. Drag a piece of wood into the fire and a wood-piece popup asks what you are angry about — Confirm and it burns small in the fireplace with its own flame and a dial beside it (your words above the dial). Five settings from "pissed" through "angry" to "screaming fury and rage"; higher settings grow the piece and its flame. Up to five burning pieces at once. Drag a burning piece to the bin to throw it away and forget it, or to the wall where it hangs tiny by a string as a reminder of what once burned. The old glowing ember background is gone — the page uses the normal background.

**In Memory rebuilt.** The watery full-page background is replaced with the normal background and a framed window sized to hold the altar. Rain falls outside the window; a dial beside it runs from "a little glum" to "weeping an ocean of grief" — the higher it is turned, the heavier the rain falls. The altar, the tray of small objects (including your photo), the questions, and the words all work as before.

**Shovel wall on "Ways I Want to Contribute".** Four shovels hang on brackets on a wooden plank at the top of the page. Drag one shovel at a time onto anything you would like to contribute to — it stays leaning on that item as your marker. Drag it back to a bracket, or tap it, to take it down; dropping it on an item that already has one sends the other back to the wall. Opening an item still lets you write about what you would bring, and the dialog now has "Lean a shovel here" / "Take the shovel down" buttons as well.

**Help page.** The first section under Help now explains how to learn any page: open the page, click "About This Page" in the top-right corner, then "View tutorial for this page".

**Garden tutorial.** "What is the Self that You Want to Grow?" now has its own interactive tutorial: drag a leaf to a dotted plant slot, write in the text box, optionally use "Help me find language", then Confirm — ending by pointing out the placed leaf and its words.

## Verification

- Automated suite: 143/143 passing, zero page errors.
- Walked through in a browser: fury room (add wood, dial keyboard + drag, wall/bin drops, 5-piece cap, persistence), grief room (dial changes rain, persistence), shovel wall (drag, move, displace, take down, dialog buttons, reload persistence), About popups on the rebuilt rooms.
- Desktop and 390px phone layouts checked.

---

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
