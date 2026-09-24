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
