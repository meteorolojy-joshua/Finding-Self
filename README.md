# Finding Self, Author of Worlds — working prototype

Updated September 23, 2026 from the current Figma and recorded runtime requirements.

Open **Start Finding Self.cmd**. It starts the app and opens your browser at http://127.0.0.1:4173/app/index.html. Keep the server window open while using it. Node.js is required; it is already installed on the computer on which this was built. No package installation or account is needed. On other operating systems, run `node server.js` in this folder and open the same address.

Use the same browser and address to return to saved work. Notes, scenarios and explicitly kept explorations are stored locally in that browser. Unkept drafts survive navigation within the open app, but are not promised across a reload. Settings provides a JSON export of all the app's stored data. This is a local prototype, without account sync or a hosted backend.

## What is implemented

- The current Figma's paper, palette, typography, illustrated objects and page layouts. The updated illustrations use direct vector exports and native proportions to address the distorted reference images.
- Separate Back history and hierarchical Exit, including nested tools. Settings returns to the exact caller and preserves drafts.
- Eight growth categories: drag leaves to the plant, write and keep their words, ask for language, and continue into the original growth reflection.
- Six independent houses with separate place names and writing, explicit confirmation, and ten persistent appearance choices including No figure.
- Thirteen illustrated contribution entries, each independently editable and saved.
- Rearrange the room with mouse, long-press touch or keyboard. Supporting objects carry their contents; unsupported drops settle onto suitable surfaces or the floor. Undo and layout reset preserve writing.
- Archive by dragging an exploration over the cupboard or using its chooser. Archived explorations retain their original tools and entries.
- The store has six clearly marked concepts. Drag items into or out of the basket, check out, and unpack them individually back in the room. Packed ownership and tentative choices persist separately.
- Invite one of three helper placeholders from Settings. Follow prompts, delayed arrival, passports, selected-material review, editable working pieces and explicitly saved additions are implemented. A complete model passport and request adapter are required for live generation; no provider is configured in this build.
- A freely movable torch with actual beam/target intersection. Only illuminated gemstones open; six independent entries can be revisited. Notes and markers can be attached.
- An unlimited story collection with stable IDs, writing, page turns, a bookshelf, and actual bookmark dragging. Keep, Change, Release and Undecided are independent per story. Release never deletes a story. Saving is explicit.
- Writing on the influence objects, with the original sorting and reflection stages connected afterward.
- Nine independent community contracts, each with five optional continuous feeling sliders. Faces blend between five expressions as you drag. Keeping commits changes; exiting the dialog discards them.
- The previous check-in content/routing, relationships and arrangement flows, notebook words/photos/audio/collage and sharing fallback, answer inventory, and scenario editing mechanisms remain connected.
- Pointer and keyboard alternatives for the new interactions, and responsive layouts.

## Sources and precedence

The current Figma file is https://www.figma.com/design/TU6GLKPWvHCXFJVd1I7cuo. It and the project's recorded decisions and fuller runtime intent govern this build. The previous working prototype supplies mechanisms that remain relevant. No superseded original ZIP was used as an alternative current app.

The project’s `design-reference` folder contains the project navigation, coverage, visual and interaction records used for implementation. `app/design-data.js` retains interaction configuration; current room geometry is in `app/room-layout.js`. The superseded extracted original and temporary build files were removed after dependency and regression checks. See `PROJECT_STATE.md` for the next iteration’s source precedence.

## Validation and limits

The engine suite passes 117 checks; the scenario suite passes 67. The September 23 browser suites add 105 passing checks for writing, cancellation, failed saves, migration-compatible persistence, labels, mobile layout, room stacks, archiving, reversible shopping, packed reloads, actual mouse/touch dragging, keyboard movement, helper follow decisions, scoped requests, and cancellation of an unresponsive adapter. Test entries and the model adapter are synthetic and exist only in disposable browser contexts. Earlier regression scripts remain available for the preserved mechanisms.

The six store concepts do not yet have authored explorations, and the three helper models do not yet have configured providers. These are shown honestly as placeholders. The prototype operates locally and does not include account sync or a hosted backend.

The underlying recording and share implementations are preserved. Physical microphone recording and the operating system's native share targets have not been verified on this machine. Browser permissions and support apply. This is a working prototype for review, not a production release.

The ZIP contains the runnable app and its dependencies. Development scripts, synthetic test media, unused illustrations and content-review records are retained in the project workspace rather than shipped. In that workspace, run core checks with `npm test`; browser checks in `validation` use the build machine's bundled Playwright path. The ZIP's `npm start` command starts the app without installing packages.
