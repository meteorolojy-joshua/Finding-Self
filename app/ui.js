/* ============================================================
   Generic renderer + research surfaces for the FS-AW prototype.
   Renders one node at a time from the structured package.
   Owns no routing truth — all navigation goes through ENGINE.
   ============================================================ */
'use strict';

const UI = (() => {
  const $view = () => document.getElementById('view');
  const $insp = () => document.getElementById('inspector');
  const $inspBody = () => document.getElementById('insp-body');

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  /* ---------- classification marker ---------- */
  function markrow(node) {
    const c = ENGINE.classify(node);
    const wc = c.world.color, wl = node.world_code + ' · ' + c.world.label;
    const fc = c.fn.color || '#59636E';
    return `<div class="markrow" role="note" aria-label="Classification">
      <span class="wmark" style="border-color:${wc}; color:${wc}">${esc(wl)}</span>
      <span class="fmark" style="border-color:${fc}; color:${fc}"><b aria-hidden="true">${esc(c.fn.symbol)}</b> ${esc(node.function_label || c.fn.label)}</span>
    </div>`;
  }

  /* display renames (package titles stay canonical) */
  const DISPLAY_NAMES = { 'Before I Enter a Persuasive Feed': 'Before I Enter Social Media', 'When I Cannot Tell What I Want': "When I Can't Tell What I Want" };
  function displayName(name) { return DISPLAY_NAMES[name] || name; }

  /* ---------- persistent controls (Back / Exit / etc.) ---------- */
  function controlRow(node) {
    const controls = (node.persistent_controls || '').split('|').map(s => s.trim()).filter(Boolean);
    const parts = [];
    if (controls.some(c => /back/i.test(c)))
      parts.push(`<button class="pctl" type="button" data-act="back">Back</button>`);
    parts.push(`<button class="pctl" type="button" data-act="exit">Exit</button>`);
    return `<div class="pcontrols" role="group" aria-label="Persistent controls">${parts.join('')}</div>`;
  }

  /* display wording for control options (package labels stay canonical) */
  const ICO_MORE = '<svg class="opt-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
  const ICO_WRITE = '<svg class="opt-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  const ICO_ARM = '<svg class="opt-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v8c0 3.3 2.7 6 6 6h4"/><circle cx="19" cy="17" r="2"/></svg>';
  const ICO_PLUS = '<svg class="opt-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const ICO_CAM = '<svg class="opt-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';

  /* ---------- Home "Longer Self-Explorations" ledge illustrations ----------
     Each object below is a self-contained SVG; its *size and position* is
     controlled entirely in styles.css (the landscape/ledge layout owns every
     layout knob). Keep geometry here and layout there — never split one
     object's sizing across both files. */
  /* Potted plant. The stem + leaves sit in a <g> that scales 1.5× *horizontally*
     about the stem (x=60), so the foliage is 1.5× wider while the stem and the
     pot below stay put. Stroke widths stay crisp thanks to
     vector-effect="non-scaling-stroke". To change the foliage spread, edit the
     scale in this transform — nothing else moves. */
  const PLANT_SVG = '<svg viewBox="0 14 120 138" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g transform="translate(60 0) scale(1.5 1) translate(-60 0)"><path class="plant-stem" vector-effect="non-scaling-stroke" d="M60 100 C 59 78, 61 58, 60 36"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 84 C 48 82, 38 74, 36 62 C 46 64, 56 72, 60 80 Z"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 70 C 72 68, 82 60, 84 48 C 74 50, 64 58, 60 66 Z"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 56 C 50 54, 42 47, 40 37 C 48 39, 56 46, 60 52 Z"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 42 C 69 40, 76 34, 78 25 C 70 27, 63 33, 60 38 Z"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 36 C 57 30, 57 23, 60 17 C 63 23, 63 30, 60 36 Z"/></g><path class="pot-body" vector-effect="non-scaling-stroke" d="M10 106 L110 106 L100 150 L20 150 Z"/><rect class="pot-rim" vector-effect="non-scaling-stroke" x="5" y="97" width="110" height="11" rx="2.5"/></svg>';
  /* Longer Self-Explorations plant: same foliage; the pot is 80% taller than
     the previous squashed pot and widened to a broad planter, so the object's
     label fits wholly inside the pot's filled body */
  const PLANT_SLIM_SVG = '<svg viewBox="0 14 120 161.44" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g transform="translate(60 0) scale(1.5 1) translate(-60 0)"><path class="plant-stem" vector-effect="non-scaling-stroke" d="M60 118.2 C 59 78, 61 58, 60 36"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 102 C 50 100, 43 93, 42 83 C 50 85, 57 92, 60 98 Z"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 90 C 71 88, 81 80, 82 69 C 73 71, 65 79, 60 86 Z"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 84 C 48 82, 38 74, 36 62 C 46 64, 56 72, 60 80 Z"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 70 C 72 68, 82 60, 84 48 C 74 50, 64 58, 60 66 Z"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 56 C 50 54, 42 47, 40 37 C 48 39, 56 46, 60 52 Z"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 42 C 69 40, 76 34, 78 25 C 70 27, 63 33, 60 38 Z"/><path class="plant-leaf" vector-effect="non-scaling-stroke" d="M60 36 C 57 30, 57 23, 60 17 C 63 23, 63 30, 60 36 Z"/></g><g transform="translate(0 175.44) scale(1 1.08) translate(0 -150)"><path class="pot-body" vector-effect="non-scaling-stroke" d="M6 106 L114 106 L104 150 L16 150 Z"/><rect class="pot-rim" vector-effect="non-scaling-stroke" x="2" y="97" width="116" height="11" rx="2.5"/></g></svg>';
  /* Flashlight: now vertical, standing on the shelf with its beam pointing up. */
  const TORCH_SVG = '<svg viewBox="0 0 48 140" aria-hidden="true" focusable="false"><path class="torch-beam" d="M14 24 L34 24 L38 2 L10 2 Z"/><rect class="torch-body" x="15" y="54" width="18" height="86" rx="8"/><path class="torch-grip" d="M15 70 H33 M15 84 H33 M15 98 H33"/><rect class="torch-btn" x="22" y="56" width="4" height="12" rx="2"/><rect class="torch-head" x="9" y="24" width="30" height="30" rx="5"/><rect class="torch-lens" x="16" y="14" width="16" height="11" rx="2"/></svg>';
  /* Gift box (present) — "Ways I Want to Contribute". A wide, low gift: the
     ribbon and bow sit on the lid only, so the box front is one clean filled
     surface, large enough to hold the object's whole label inside it. */
  const GIFT_SVG = '<svg viewBox="0 0 100 74" aria-hidden="true" focusable="false"><rect class="gift-box" x="8" y="27" width="84" height="43" rx="4"/><rect class="gift-lid" x="3" y="16" width="94" height="11" rx="3"/><rect class="gift-ribbon" x="47" y="16" width="6" height="11"/><ellipse class="gift-bow" cx="41" cy="11" rx="9" ry="6" transform="rotate(-24 41 11)"/><ellipse class="gift-bow" cx="59" cy="11" rx="9" ry="6" transform="rotate(24 59 11)"/><circle class="gift-knot" cx="50" cy="15" r="3.5"/></svg>';
  /* Standing book — a kept story: cover and page-block seen side-on, leaning
     slightly back, a ribbon over the top edge. */
  const BOOK_SVG = '<svg viewBox="0 0 60 80" aria-hidden="true" focusable="false"><g transform="rotate(-4 30 76)"><rect class="book-cover" x="8" y="6" width="44" height="70" rx="3"/><rect class="book-pages" x="46" y="9" width="6" height="64" rx="1"/><rect class="book-spine" x="8" y="6" width="8" height="70" rx="2"/><path class="book-mark" d="M24 5 V28"/></g></svg>';
  /* Longer Self-Explorations variant: the book lies flat on the shelf, seen
     from above — spine along the left, the open fore-edge on the right, and
     the page block stacked between the front and back covers */
  const BOOK_LY_SVG = '<svg viewBox="0 0 100 26" aria-hidden="true" focusable="false"><rect class="book-cover" x="4" y="17" width="90" height="7" rx="2"/><rect class="book-pages" x="12" y="6" width="76" height="13"/><path class="book-mark" d="M76 7 V18 M82 6.5 V19 M88 6 V20"/><rect class="book-cover" x="6" y="2" width="86" height="8" rx="2"/><rect class="book-spine" x="0" y="2" width="10" height="22" rx="1.5"/></svg>';
  /* Two interlocked loops — friendship-bracelet links: "Relationships". */
  const LOOPS_SVG = '<svg viewBox="0 4 120 72" aria-hidden="true" focusable="false"><path class="loop-a" d="M4 37 A30 20 0 0 1 64 37"/><path class="loop-b" d="M48 37 A30 20 0 0 1 108 37"/><path class="loop-b" d="M48 37 A30 20 0 0 0 108 37"/><path class="loop-a" d="M4 37 A30 20 0 0 0 64 37"/></svg>';
  /* A table with a few chairs gathered around it: "Communities I Belong In". */
  const TABLE_SVG = '<svg viewBox="0 0 140 106" aria-hidden="true" focusable="false"><rect class="tbl-top" x="28" y="42" width="84" height="10" rx="3"/><rect class="tbl-leg-back" x="46" y="52" width="6" height="34"/><rect class="tbl-leg-back" x="88" y="52" width="6" height="34"/><rect class="tbl-leg" x="38" y="52" width="7" height="42"/><rect class="tbl-leg" x="95" y="52" width="7" height="42"/><rect class="chair-leg-rear" x="6" y="32" width="4" height="58"/><rect class="chair-seat" x="4" y="56" width="17" height="5"/><rect class="chair-leg" x="16" y="61" width="4" height="29"/><rect class="chair-leg" x="8" y="78" width="10" height="3"/><rect class="chair-leg-rear" x="130" y="32" width="4" height="58"/><rect class="chair-seat" x="119" y="56" width="17" height="5"/><rect class="chair-leg" x="120" y="61" width="4" height="29"/><rect class="chair-leg" x="122" y="78" width="10" height="3"/></svg>';
  /* Longer Self-Explorations variant: a real coffee table between two chairs
     facing each other. True-to-life proportions: the table is low — its top
     sits just BELOW the chair seats (coffee-table height, not dining height),
     and each chair's back rises to about twice the table's height. The table
     is a solid plinth piece, long relative to its height (~2.6:1), and its
     base is wide enough to carry the object's label inside it. The viewBox is
     trimmed to the furniture (y 40..100) so no dead air inflates the box. */
  const COFFEE_TABLE_SVG = '<svg viewBox="0 40 170 60" aria-hidden="true" focusable="false"><rect class="chair-leg-rear" x="14" y="44" width="4" height="56"/><rect class="chair-leg-rear" x="14" y="56" width="12" height="3"/><rect class="chair-seat" x="14" y="70" width="24" height="4" rx="1"/><rect class="chair-leg" x="32" y="74" width="4" height="26"/><rect class="chair-leg-rear" x="152" y="44" width="4" height="56"/><rect class="chair-leg-rear" x="144" y="56" width="12" height="3"/><rect class="chair-seat" x="132" y="70" width="24" height="4" rx="1"/><rect class="chair-leg" x="134" y="74" width="4" height="26"/><rect class="tbl-top" x="48" y="72" width="74" height="4.5" rx="2"/><rect class="tbl-leg" x="56" y="76.5" width="58" height="23.5" rx="2"/></svg>';
  /* The flashlight laid on its side, head to the left, beam reaching left. */
  const TORCH_LY_SVG = '<svg viewBox="0 8 120 42" aria-hidden="true" focusable="false"><path class="torch-beam" d="M16 20 L16 30 L-40 42 L-40 10 Z"/><rect class="torch-head" x="22" y="10" width="30" height="30" rx="6"/><rect class="torch-lens" x="13" y="17" width="11" height="16" rx="3"/><rect class="torch-body" x="46" y="16" width="66" height="18" rx="7"/><path class="torch-grip" d="M48 23 H102 M52 28 H92"/><rect class="torch-btn" x="58" y="13" width="12" height="5" rx="2"/></svg>';
  /* mini, label-free versions of the objects for the home shelf preview */
  const PREVIEW_MAGNET_SVG = '<svg class="pv-magnet-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path class="magnet-body" d="M22 80 V46 C22 20 78 20 78 46 V80"/><rect class="magnet-north" x="13" y="78" width="18" height="12" rx="2"/><rect class="magnet-south" x="69" y="78" width="18" height="12" rx="2"/></svg>';

  function displayLabel(o) {
    if (o.semantic_tag === 'inventory') return ICO_MORE + 'More options';
    if (o.semantic_tag === 'custom') return ICO_WRITE + 'Write my own option';
    return esc(ENGINE.interpolate(o.label));
  }

  /* ---------- generic node renderer ---------- */
  /* display-layer text fixes for specific nodes (package copy stays canonical) */

  function renderNode(node) {
    const opts = ENGINE.screenOptions(node.id);
    const multi = /^Multi/i.test(node.selection_mode || '');
    const selected = ENGINE.Session.multiSelections[node.id] || [];

    const optButtons = (() => {
      const items = opts.map(o => {
        const cls = ['opt'];
        const isContinue = o.semantic_tag === 'continue' || /^continue$/i.test((o.label || '').trim());
        if (o.semantic_tag === 'inventory') cls.push('more');
        if (o.semantic_tag === 'custom') cls.push('custom');
        if (o._userAdded) cls.push('user-added');
        if (isContinue) cls.push('continue');
        else if (multi && o.semantic_tag !== 'inventory' && o.semantic_tag !== 'custom') cls.push('multi');
        const pressed = multi ? ` aria-pressed="${selected.includes(o.id)}"` : '';
        let cursorTip = '';
        if (multi && (cls.includes('multi') || cls.includes('continue'))) {
          cls.push('has-cursor-tip');
          cursorTip = ` data-tip="select all answers that apply, then press 'Continue'"`;
        }
        return { o, html: `<button class="${cls.join(' ')}" type="button" data-opt="${esc(o.id)}"${pressed}${cursorTip}>${displayLabel(o)}</button>` };
      });
      // "Write my own" sits directly below "+ More options"
      const customs = items.filter(it => it.o.semantic_tag === 'custom');
      const rest = items.filter(it => it.o.semantic_tag !== 'custom');
      const moreIdx = rest.findIndex(it => it.o.semantic_tag === 'inventory');
      rest.splice(moreIdx === -1 ? rest.length : moreIdx + 1, 0, ...customs);
      return rest.map(it => it.html).join('');
    })();

    const displayOnly = ENGINE.displayOnlyOptions(node.id);
    const displayOnlyMarkup = displayOnly.length
      ? `<div class="display-only" role="note">${displayOnly.map(o => `<div class="doline">${esc(ENGINE.interpolate(o.label))}</div>`).join('')}</div>`
      : '';

    const promptText = ENGINE.previewCopy(node, 'thread_display_template') || ENGINE.previewCopy(node, 'prompt');
    $view().innerHTML = `
      <div class="card quiet" data-od-id="node-${esc(node.id)}">
        ${controlRow(node)}
        ${node.content_area !== 'Now' && ENGINE.Session.transitionAck ? `<div class="note dash" role="note">${esc(ENGINE.Session.transitionAck)}</div>` : ''}
        <div class="node-title">${esc(node.id)} · ${esc(node.content_area)} · ${esc(node.variant)}</div>
        <h1 class="prompt">${esc(promptText)}</h1>
        <div class="metarow">
          ${node.support_copy ? `<p class="support">${esc(ENGINE.previewCopy(node, 'support_copy'))}</p>` : ''}
          ${markrow(node)}
        </div>
        ${displayOnlyMarkup}
        <div class="options" role="group" aria-label="Answer options">${optButtons}</div>
      </div>`;
    updateInspector();
    focusPrompt();
  }

  function focusPrompt() {
    const el = $view().querySelector('.prompt');
    if (el) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: false }); }
  }

  /* ---------- custom-input capture (v0.4) ---------- */
  function renderCustomInput() {
    const pc = ENGINE.Session.pendingCustom;
    const origin = ENGINE.PKG.nodeById[pc.originNodeId];
    $view().innerHTML = `
      <div class="card quiet" data-od-id="custom-input">
        <div class="node-title">Your words · optional</div>
        <h1 class="prompt">${esc(origin ? origin.prompt : 'Write it in your own words')}</h1>
        <p class="support">Use your words, or cancel. Nothing is saved beyond this run unless you separately choose to keep it.</p>
        <div class="field"><label for="custom-text">Your answer</label><input id="custom-text" type="text" data-custom-input /></div>
        <div class="btnrow">
          <button class="btn" type="button" data-act="custom-confirm">Use these words and continue</button>
          <button class="btn2" type="button" data-act="custom-cancel">Cancel</button>
        </div>
      </div>`;
    updateInspector();
    const el = document.getElementById('custom-text');
    if (el) el.focus();
  }

  /* ---------- home ---------- */
  /* first-visit clarity: a one-time banner + a plain-language map of the three
     kinds of thing on Home. The seen flag lives in localStorage; nothing else. */
  const SEEN_KEY = 'fsaw.seen.v1';
  function firstVisit() {
    try {
      if (localStorage.getItem(SEEN_KEY)) return false;
      localStorage.setItem(SEEN_KEY, '1');
      return true;
    } catch (err) { return false; }
  }
  function renderHome() {
    const bm = ENGINE.Session.pausedBookmark;
    $view().innerHTML = `
      <div class="card" data-od-id="home">
        <div class="pcontrols" aria-hidden="true"></div>
        <div class="home-sec home-hero">
          <div class="home-hero-text">
            <div class="node-title">Home</div>
            <h1 class="prompt">What would help you feel more grounded right now?</h1>
            <p class="support">Check-ins are short guided moments for right now · Practices rehearse something for later · Explorations are open rooms with no finish line.</p>
          </div>
        </div>
        ${firstVisit() ? '<div class="banner" role="status">Everything you write stays on this device.</div>' : ''}
        ${bm ? `<div class="banner">A paused run is kept at <code>${esc(bm.nodeId)}</code>. <button class="ghost" type="button" data-act="entry" data-entry="ENTRY.RESUME">Resume</button> <button class="ghost" type="button" data-act="discard-bookmark">Discard</button></div>` : ''}
        <div class="home-sec flows-sec" data-od-id="situational-checkins">
          <h2 class="h3">Situational Check-Ins</h2>
          <p class="support">For right now — pick the moment you are in.</p>
          <div class="options grid3">
            ${ENGINE.PKG.starters.map(s => `
              <div class="hang-wrap"><svg class="hang-string" viewBox="0 0 200 37" preserveAspectRatio="none" aria-hidden="true"><line class="hs" x1="0" y1="37" x2="100" y2="9" vector-effect="non-scaling-stroke"/><line class="hs" x1="200" y1="37" x2="100" y2="9" vector-effect="non-scaling-stroke"/></svg><span class="hang-peg" aria-hidden="true"></span><button class="opt hang has-cursor-tip" type="button" data-act="start-starter" data-starter="${esc(s.id)}" data-variant="Standard" data-tip="${esc(s.promise)}"><b>${esc(displayName(s.title))}</b></button></div>`).join('')}
            ${SCENARIO.listScenarios().filter(s => !s.scenario_id.startsWith('SCN.DEFAULT.')).map(s => `
              <div class="hang-wrap"><svg class="hang-string" viewBox="0 0 200 37" preserveAspectRatio="none" aria-hidden="true"><line class="hs" x1="0" y1="37" x2="100" y2="9" vector-effect="non-scaling-stroke"/><line class="hs" x1="200" y1="37" x2="100" y2="9" vector-effect="non-scaling-stroke"/></svg><span class="hang-peg" aria-hidden="true"></span><button class="opt hang has-cursor-tip" type="button" data-act="open-scenario" data-id="${esc(s.scenario_id)}" data-tip="Open in Scenario Setup"><b>${esc(displayName(s.name))}</b></button></div>`).join('')}
          </div>
        </div>
        <div class="home-sec home-sec-entries" data-od-id="other-checkin-options">
          <h2 class="h3">Other Check-In Options</h2>
          <p class="support">For when you have room — rehearse for later, or shape the check-ins themselves.</p>
          <div class="entry-shelf">
            <div class="options entry-list">
              <button class="opt entry-row ledge has-cursor-tip" type="button" data-act="entry" data-entry="ENTRY.PRACTICE" data-tip="Longer practice when you have room — bring a moment or start fresh"><span class="entry-ico" aria-hidden="true">${ICO_ARM}</span><b>Rehearse in my free time</b></button>
              <button class="opt entry-row ledge has-cursor-tip" type="button" data-act="entry" data-entry="ENTRY.TOOLKIT" data-tip="Add your own situational check-ins, or change the ones you have added — they appear in the Situational Check-Ins above"><span class="entry-ico" aria-hidden="true">${ICO_PLUS}</span><b>Change check-in scenarios</b></button>
            </div>
            <i class="entry-shelf-ledge" aria-hidden="true"></i>
          </div>
        </div>
        <div class="home-sec" data-od-id="home-making-room">
          <button class="explore-preview has-cursor-tip" type="button" data-act="longer-explorations" data-od-id="longer-explorations-preview" data-tip="Open the full shelves of longer self-explorations" aria-label="Longer Self-Explorations — view all">
            <span class="pv-title">Longer Self-Explorations</span>
            <span class="pv-cta">View all <span aria-hidden="true">→</span></span>
            <span class="pv-scene" aria-hidden="true">
              <span class="pv-row">
                <span class="pv-obj pv-plant">${PLANT_SVG}</span>
                <span class="pv-obj pv-torch">${TORCH_SVG}</span>
                <span class="pv-obj pv-magnet">${PREVIEW_MAGNET_SVG}</span>
                <span class="pv-obj pv-book">${BOOK_SVG}</span>
                <span class="pv-obj pv-pair">${LOOPS_SVG}</span>
                <span class="pv-obj pv-circle">${TABLE_SVG}</span>
                <span class="pv-obj pv-gift">${GIFT_SVG}</span>
              </span>
              <span class="pv-ledge"></span>
            </span>
          </button>
        </div>
      </div>`;
    updateInspector();
  }

  /* ---------- longer self-explorations (dedicated page) ----------
     A quiet room. No ceiling, no window, no side walls, no door — only a
      soft shading for wall and floor and the thin line where they meet, so
      the room is felt rather than seen. The room is tall, and the objects
      are staggered in depth: a wall shelf high on the left holds the book and
      the magnet; the plant stands mid-floor with the torch lying farther
      back; on the right a low coffee table sits between two facing chairs —
      its top below their seats, as a real coffee table's is — with the loops
      resting on it and the gift on the front floor. The plant's, table's, and
      gift's labels sit wholly inside a filled part of their object (pot,
      plinth base, box front). Each object is a real button; the lamp is gone,
      and only its words, "Room to Be Myself", remain on the front floor.
      Layout lives in styles.css. */
  function renderLongerExplorations() {
    const spot = (odId, ract, tip, aria, cls, symSvg, label) => `
        <button class="spot ${cls} has-cursor-tip" type="button" data-ract="${ract}" data-od-id="${odId}" data-tip="${tip}" aria-label="${aria}">
          <span class="spot-art" aria-hidden="true">${symSvg}</span>
          <span class="spot-label">${label}</span>
        </button>`;
    $view().innerHTML = `
      <div class="card explore-page" data-od-id="longer-explorations">
        <div class="pcontrols"><button class="pctl" type="button" data-act="home">Home</button></div>
        <nav class="explore-crumb" data-od-id="explore-breadcrumb" aria-label="Breadcrumb"><button class="crumb-link" type="button" data-act="home">Home</button><span class="crumb-sep" aria-hidden="true">·</span><span class="crumb-here">Self-Explorations</span></nav>
        <h1 class="prompt explore-title">Longer Self-Explorations</h1>
        <p class="support">Choose an area that feels worth understanding.</p>
        <div class="landscape" data-od-id="making-room-full">
          <div class="room-bg" aria-hidden="true">
            <div class="ls-sky"></div>
            <div class="ls-ground"></div>
          </div>
          <div class="wall-ledge" aria-hidden="true"></div>
          <span class="region-mark rm-1" data-od-id="region-own-self">I · Finding My Own Self</span>
          <span class="region-mark rm-2" data-od-id="region-shapes-me">II · What Shapes Me</span>
          <span class="region-mark rm-3" data-od-id="region-relationships">III · Relationships &amp; Community</span>
          ${spot('basket-plant', 'open-practice', 'A small, concrete arrangement for something you want more room for — companionship, a creative interest, time in nature; partial answers are fine', 'The Self I Want to Grow', 'o-plant', PLANT_SLIM_SVG, 'The Self I Want to Grow')}
          ${spot('obj-gift', 'open-contrib', 'Turn something you care about into participation sized to your actual energy', 'Ways I Want to Contribute', 'o-gift', GIFT_SVG, 'Ways I Want to Contribute')}
          ${spot('obj-circle', 'open-belonging', 'Look at the terms you belong on, and draft a shared arrangement if you want one', 'Communities I Belong In', 'o-circle', COFFEE_TABLE_SVG, 'Communities I Belong In')}
          ${spot('obj-pair', 'open-connection', 'What you might share, what you’d like to understand about someone, and what stays private', 'Relationships', 'o-pair spot-above', LOOPS_SVG, 'Relationships')}
          ${spot('basket-explore', 'open-explore', 'Keep an interest or a question open — drawing, a hometown, what friendship means — no problem needed', 'Aspects of My Self to Explore', 'o-torch', TORCH_LY_SVG, 'Aspects of My Self to Explore')}
          ${spot('basket-story', 'open-story', 'A story handed to you — by family, culture, a hometown — and what to keep, change, release, or leave undecided', 'Stories to Claim or Discard', 'o-book spot-above', BOOK_LY_SVG, 'Stories to Claim or Discard')}
          ${spot('basket-magnet', 'open-influence', 'A book, an artist, a place that’s shaping you — what it opens up, what it pressures, what place you want it to have', 'Influences I Like', 'o-magnet spot-above', PREVIEW_MAGNET_SVG, 'Influences I Like')}
          <button class="spot o-lamp has-cursor-tip" type="button" data-ract="open-lamp-room" data-od-id="basket-lamp" data-tip="Open a separate place to make room for something you want more of" aria-label="Room to Be Myself"><span class="spot-label">Room to Be Myself</span></button>
        </div>
        <div class="btnrow" style="margin-top:12px"><button class="btn2" type="button" data-new="collection">Things I’m keeping</button></div>
      </div>`;
    updateInspector();
  }

  /* ---------- starter detail ---------- */
  function renderStarterDetail(id) {
    const s = ENGINE.PKG.starterById[id];
    if (!s) return renderHome();
    $view().innerHTML = `
      <div class="card" data-od-id="starter-${esc(id)}">
        <div class="pcontrols"><button class="pctl" type="button" data-act="home">Back home</button></div>
        <div class="node-title">Starter system · ${esc(s.id)}</div>
        <h1 class="prompt">${esc(displayName(s.title))}</h1>
        <p class="support">${esc(s.promise)}</p>
        <dl class="kv">
          <dt>Primary moment</dt><dd>${esc(s.primary_moment)}</dd>
          <dt>Trigger posture</dt><dd>${esc(s.trigger_posture)}</dd>
          <dt>Standard route</dt><dd>${esc(s.standard_duration)} · begins <code>${esc(s.standard_entry_node)}</code></dd>
          <dt>Low-capacity route</dt><dd>${esc(s.low_duration)} · begins <code>${esc(s.low_entry_node)}</code></dd>
          <dt>Privacy default</dt><dd>${esc(s.privacy_default)}</dd>
        </dl>
        <div class="btnrow">
          <button class="btn" type="button" data-act="start-starter" data-starter="${esc(s.id)}" data-variant="Standard">Use the standard route</button>
          <button class="btn2" type="button" data-act="start-starter" data-starter="${esc(s.id)}" data-variant="Low">Use the shortest route</button>
        </div>
      </div>`;
    updateInspector();
  }

  function renderStarterList() {
    $view().innerHTML = `
      <div class="card" data-od-id="starter-list">
        <div class="pcontrols"><button class="pctl" type="button" data-act="home">Home</button></div>
        <div class="node-title">Starter systems</div>
        <h1 class="prompt">Three complete starting points</h1>
        <p class="support">Each works unchanged. Each can be revised later from inside a run.</p>
        <div class="options">
          ${ENGINE.PKG.starters.map(s => `<button class="opt" type="button" data-act="starter-detail" data-starter="${esc(s.id)}">${esc(displayName(s.title))}<br><span class="muted small">${esc(s.primary_moment)} · ${esc(s.standard_duration)}</span></button>`).join('')}
        </div>
        <div class="btnrow">
          <button class="btn2" type="button" data-act="onboarding">Answer six questions for a recommendation</button>
        </div>
      </div>`;
    updateInspector();
  }

  /* ---------- onboarding ---------- */
  function renderOnboarding() {
    const qs = {};
    ENGINE.PKG.onboarding.forEach(r => { (qs[r.question_id] = qs[r.question_id] || { q: r.question, answers: [] }).answers.push(r); });
    const ids = Object.keys(qs).sort();
    UI._ob = { ids, step: 0, answers: {} };
    renderOnboardingStep();
  }

  function renderOnboardingStep() {
    const { ids, step, answers } = UI._ob;
    const qid = ids[step];
    const qs = {};
    ENGINE.PKG.onboarding.forEach(r => { (qs[r.question_id] = qs[r.question_id] || { q: r.question, answers: [] }).answers.push(r); });
    const rec = qs[qid];
    rec.answers.sort((a, b) => a.order - b.order);
    $view().innerHTML = `
      <div class="card" data-od-id="onboarding-${esc(qid)}">
        <div class="pcontrols">
          ${step > 0 ? '<button class="pctl" type="button" data-act="ob-back">Back</button>' : ''}
          <button class="pctl" type="button" data-act="ob-skip">Skip onboarding</button>
        </div>
        <div class="node-title">Onboarding · ${step + 1} of ${ids.length} · used only for starter recommendation</div>
        <h1 class="prompt">${esc(rec.q)}</h1>
        <div class="options">
          ${rec.answers.map(a => `<button class="opt" type="button" data-ob-answer="${esc(a.answer)}" data-ob-q="${esc(qid)}">${esc(a.answer)}</button>`).join('')}
        </div>
      </div>`;
    updateInspector();
  }

  function renderOnboardingResult() {
    const recs = ENGINE.runOnboarding(UI._ob ? UI._ob.answers : {});
    $view().innerHTML = `
      <div class="card" data-od-id="onboarding-result">
        <div class="pcontrols"><button class="pctl" type="button" data-act="home">Choose none for now</button></div>
        <div class="node-title">Recommendations — from your answers, not a profile</div>
        <h1 class="prompt">These three fit what you described</h1>
        ${recs.length ? `<ul class="list">${recs.map(r => `
          <li><button class="ghost" type="button" data-act="starter-detail" data-starter="${esc(r.starter.id)}" style="border:0;font-size:15px;color:var(--surface);padding:6px 10px"><b>${esc(r.starter.title)}</b></button>
          <span class="sub">Because: ${esc([...new Set(r.reasons)].slice(0, 2).join(' · '))}</span></li>`).join('')}</ul>` : '<p class="muted">No strong match — browse all three instead.</p>'}
        <div class="btnrow">
          <button class="btn2" type="button" data-act="starters">Browse all starter systems</button>
        </div>
      </div>`;
    updateInspector();
  }

  /* ---------- terminals ---------- */
  function renderTerminal(dest) {
    const bodies = {
      'HOME': ['You are home.', 'Nothing was stored by leaving.'],
      'PRACTICE.LIBRARY': ['Practice library', 'Three practices are available.'],
      'PRACTICE.COMPLETE': ['Practice complete.', 'You chose the range, the forms, and the stopping point.'],
      'TRIGGER.SETTINGS': ['Invitation settings', 'This invitation is simulated.'],
      'TRIGGER.SNOOZE.DISMISS': ['Invitation stepped back.', 'The destination was always available.']
    };
    if (dest.id === 'TRIGGER.SETTINGS') return renderSettings();
    if (dest.id === 'PRACTICE.LIBRARY') return renderPracticeLibrary();
    if (dest.id === 'TRIGGER.SNOOZE.DISMISS') {
      const optId = ENGINE.Session.runAnswers[ENGINE.Session.currentNodeId];
      const opt = (ENGINE.PKG.optionsByNode[ENGINE.Session.currentNodeId] || []).find(o => o.id === optId);
      ENGINE.setTriggerConfig({ snooze: opt ? opt.label : 'snoozed', paused: /turn it back on/i.test(opt ? opt.label : '') });
    }
    const [title, sub] = bodies[dest.id] || [dest.id, dest.definition];
    $view().innerHTML = `
      <div class="card" data-od-id="terminal-${esc(dest.id)}">
        <div class="node-title">${esc(dest.id)} · terminal</div>
        <h1 class="prompt">${esc(title)}</h1>
        <p class="support">${esc(sub)}</p>
        <div class="btnrow">
          <button class="btn" type="button" data-act="home">Home</button>
          ${dest.id === 'PRACTICE.COMPLETE' ? samplerCompleteControl() : ''}
          ${dest.id === 'PRACTICE.COMPLETE' ? '<button class="btn2" type="button" data-act="entry" data-entry="ENTRY.TOOLKIT">Teach My Toolkit from this run</button>' : ''}
        </div>
      </div>`;
    if (dest.terminal) ENGINE.Session.history = [];
    updateInspector();
  }

  function renderExternalTerminal(dest) {
    $view().innerHTML = `
      <div class="card" data-od-id="terminal-exit">
        <div class="node-title">${esc(dest.id)} · terminal</div>
        <h1 class="prompt">${dest.id === 'EXIT:Destination' ? 'You are free to continue.' : 'You have left the flow.'}</h1>
        <p class="support">${esc(dest.definition)} The prototype does not open, block, or check any other app — whatever happens next is yours.</p>
        <div class="btnrow"><button class="btn" type="button" data-act="home">Back to the toolkit home</button></div>
      </div>`;
    ENGINE.Session.history = [];
    updateInspector();
  }

  function renderPrimitiveTerminal(dest) {
    $view().innerHTML = `
      <div class="card" data-od-id="terminal-primitive">
        <div class="node-title">${esc(dest.id)}</div>
        <h1 class="prompt">${esc(dest.definition)}</h1>
        <p class="support">This primitive is represented as a checkpoint in the prototype.</p>
        <div class="btnrow"><button class="btn" type="button" data-act="home">Home</button></div>
      </div>`;
    updateInspector();
  }

  /* ---------- settings / practice library ---------- */

  const SCHEME_KEY = 'fsaw.colorScheme.v1';
  const SCHEMES = ['default', 'pastel', 'dark'];
  let _prevViewHtml = null;
  function exitSettings() {
    if (_prevViewHtml != null) {
      const html = _prevViewHtml;
      _prevViewHtml = null;
      $view().innerHTML = html;
    } else {
      renderHome();
    }
  }
  function currentScheme() {
    try {
      let s = localStorage.getItem(SCHEME_KEY);
      if (s === 'mono') s = 'dark'; // legacy key from the previous third option
      return SCHEMES.includes(s) ? s : 'default';
    }
    catch (e) { return 'default'; }
  }
  function applyScheme(s) {
    const v = document.querySelector('.main .view');
    if (!v) return;
    if (s === 'default') v.removeAttribute('data-scheme');
    else v.setAttribute('data-scheme', s);
  }
  function setScheme(s) {
    if (!SCHEMES.includes(s)) return;
    try { localStorage.setItem(SCHEME_KEY, s); } catch (e) { /* storage unavailable */ }
    applyScheme(s);
    renderSettings();
  }
  function renderSettings() {
    // remember where the user came from so "Exit" can return there
    if (!$view().querySelector('[data-od-id="settings"]')) _prevViewHtml = $view().innerHTML;
    const scheme = currentScheme();
    $view().innerHTML = `
      <div class="card" data-od-id="settings">
        <div class="pcontrols"><button class="pctl" type="button" data-act="settings-exit">Exit</button></div>
        <div class="node-title">Settings · local only</div>
        <h1 class="prompt">Settings</h1>
        <h2 class="h3">Color scheme</h2>
        <div class="segrow" role="group" aria-label="Color scheme">
          <button class="seg" type="button" data-act="scheme-set" data-scheme="default" aria-pressed="${scheme === 'default'}">Woodland</button>
          <button class="seg" type="button" data-act="scheme-set" data-scheme="pastel" aria-pressed="${scheme === 'pastel'}">Warm pastel</button>
          <button class="seg" type="button" data-act="scheme-set" data-scheme="dark" aria-pressed="${scheme === 'dark'}">Soft dark</button>
        </div>
        <h2 class="h3">Data</h2>
        <p class="muted small">Save only when you choose. All saved data is stored only on your local device.</p>
        <div class="btnrow">
          <button class="btn2" type="button" data-act="export-data">Export everything (JSON)</button>
          <button class="btn2" type="button" data-act="delete-data">Delete everything</button>
        </div>
      </div>`;
    updateInspector();
  }

  /* ---------- help ---------- */
  function renderHelp() {
    $view().innerHTML = `
      <div class="card" data-od-id="help">
        <div class="pcontrols"><button class="pctl" type="button" data-act="home">Home</button></div>
        <div class="node-title">Help</div>
        <h1 class="prompt">Help</h1>
        <h2 class="h3">Start here</h2>
        <ol class="list">
          <li>Pick the moment you are in under <b>Situational Check-Ins</b>.</li>
          <li>Answer with a preset, or choose <b>write my own</b> and say it your way.</li>
          <li>Nothing is stored unless you choose to keep it — everything stays on this device.</li>
        </ol>
        <h2 class="h3">Check-ins — for right now</h2>
        <p class="support">Short guided moments for when you need steadying. Pick the situation that fits, answer a few questions, and take what helps.</p>
        <h2 class="h3">Practices — rehearse for later</h2>
        <p class="support">Longer exercises for when you have room. They rehearse something you want ready next time, rather than meeting a moment that is already here. Completing a practice lets you stitch it into your sampler — a cloth on the Practice library page that grows, season by season, into a record of your practice. Practice 3 — Small things is a lighter one: a day's micro-list you can leave open and fill as things happen, or key in all at once, in words or photos. Nothing is kept until you close the list.</p>
        <h2 class="h3">Explorations — open rooms, no finish line</h2>
        <p class="support">Quiet spaces to wander in — a plant to grow, gemstones, stories — with nothing to complete and no wrong way through.</p>
        <h2 class="h3">Your check-in scenarios</h2>
        <p class="support">“Change check-in scenarios” on the home page is where the Situational Check-Ins come from. Add your own scenarios, edit them, or delete them to change what is offered there. The three premade check-ins always stay as they are.</p>
        <h2 class="h3">Your data</h2>
        <p class="support">Everything you write stays on this device. Export or delete it any time under Settings &amp; data.</p>
      </div>`;
    updateInspector();
  }

  function renderPracticeLibrary() {
    UI._samplerSeason = null;
    const S = ENGINE.Sampler;
    const cur = S.currentSeason();
    const seasons = S.seasons();
    const curStitches = (seasons.find(x => x.key === cur.key) || { stitches: [] }).stitches;
    const past = seasons.filter(x => x.key !== cur.key);
    $view().innerHTML = `
      <div class="card" data-od-id="practice-library">
        <div class="pcontrols"><button class="pctl" type="button" data-act="home">Home</button></div>
        <div class="node-title">Practice · longer routes</div>
        <h1 class="prompt">Three practices are available</h1>
        <div class="home-sec" data-od-id="practice-sampler">
          <h2 class="h3">Your sampler</h2>
          <p class="support">${esc(cur.cloth)} — each completed practice can add one stitch. Tap a stitch to revisit it.</p>
          ${curStitches.length ? samplerClothHTML(curStitches) : `
            <div class="samp-cloth">${'<span class="samp-patch samp-empty" aria-hidden="true"></span>'.repeat(4)}</div>
            <p class="support">Your cloth is waiting for its first stitch. Complete a practice, then stitch it in.</p>`}
          ${past.length ? `
            <h3 class="samp-subhead">Finished cloths</h3>
            <div class="options">${past.map(p => `
              <button class="opt" type="button" data-act="sampler-season" data-season="${p.key}">
                <b>${esc(p.label)} sampler</b> <span class="sub">${p.stitches.length} stitch${p.stitches.length === 1 ? '' : 'es'}</span>
              </button>`).join('')}</div>` : ''}
        </div>
        <ul class="list">
          <li><b>Practice 1 — A signal worth keeping</b><span class="sub">Inner world first · 15–25 min · <code>S1.00</code></span>
            <div class="ghostrow"><button class="ghost" type="button" data-act="practice-start" data-practice="PRACTICE:S1">Begin</button></div></li>
          <li><b>Practice 2 — Carrying a signal across worlds</b><span class="sub">W1 → W2 → W3 → W4 · 20–30 min · <code>S2.00</code></span>
            <div class="ghostrow"><button class="ghost" type="button" data-act="practice-start" data-practice="PRACTICE:S2">Begin</button></div></li>
          <li><b>Practice 3 — Small things</b><span class="sub">A day in tiny pieces · a few minutes, or all day</span>
            <div class="ghostrow"><button class="ghost" type="button" data-act="smallthings-begin">Begin</button></div></li>
        </ul>
      </div>`;
    updateInspector();
  }

  /* ---------- small things: a day's micro-list ----------
     One open list at a time. Entries are stamped with the current minute as
     they are added (live mode); any time can be tapped and set by hand
     (batch/key-in mode). Entries hold text, a photo, or both. */
  let ST_composerPhoto = null; // data URL waiting in the composer, not yet an entry
  const ST_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function stHHMM(iso) {
    const d = new Date(iso);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function stDateLabel(iso) {
    const d = new Date(iso);
    return d.getDate() + ' ' + ST_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function stSorted(entries) {
    return [...entries].sort((a, b) => new Date(a.at) - new Date(b.at));
  }
  function stNotify(words) {
    let n = document.getElementById('app-notice');
    if (!n) { n = document.createElement('div'); n.id = 'app-notice'; n.setAttribute('role', 'status'); document.body.append(n); }
    n.textContent = words;
    clearTimeout(stNotify.timer);
    stNotify.timer = setTimeout(() => { n.textContent = ''; }, 4000);
  }
  /* Downscale a user photo so it fits comfortably in local storage. */
  function processImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || file.size > 25 * 1024 * 1024) { reject(new Error('too large')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const MAX = 900;
            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.width * scale));
            c.height = Math.max(1, Math.round(img.height * scale));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/jpeg', 0.72));
          } catch (err) { reject(err); }
        };
        img.onerror = () => reject(new Error('unreadable'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('unreadable'));
      reader.readAsDataURL(file);
    });
  }
  function stEntryHTML(e) {
    return `<li class="st-entry">
      <input class="st-time" type="time" value="${stHHMM(e.at)}" data-st-time data-id="${esc(e.id)}" aria-label="Time for this entry">
      <input class="st-text" type="text" value="${esc(e.text)}" data-st-text data-id="${esc(e.id)}" placeholder="Two to six words…" aria-label="What the day held" maxlength="140">
      ${e.image
        ? `<button class="st-thumbbtn" type="button" data-act="smallthings-zoom" data-id="${esc(e.id)}" aria-label="View this photo larger"><img class="st-thumb" src="${e.image}" alt="A photo from your small things list"></button>`
        : `<button class="st-iconbtn" type="button" data-act="smallthings-photo-entry" data-id="${esc(e.id)}" aria-label="Attach a photo to this entry">${ICO_CAM}</button>`}
      <button class="st-iconbtn st-remove" type="button" data-act="smallthings-remove" data-id="${esc(e.id)}" aria-label="Remove this entry">×</button>
    </li>`;
  }
  function stComposerHTML() {
    return `<form class="st-composer" id="st-composer-form" autocomplete="off">
      <input id="st-composer-text" type="text" placeholder="Add a small thing…" aria-label="Add a small thing" maxlength="140">
      ${ST_composerPhoto
        ? `<span class="st-pending"><img class="st-thumb" src="${ST_composerPhoto}" alt="Photo ready to attach"><button class="st-iconbtn st-remove" type="button" data-act="smallthings-photo-clear" aria-label="Remove this photo">×</button></span>`
        : `<button class="st-iconbtn" type="button" data-act="smallthings-photo-composer" aria-label="Attach a photo">${ICO_CAM}</button>`}
      <button class="btn" type="submit">Add</button>
    </form>
    <input type="file" id="st-file" accept="image/*" data-target="composer" hidden>`;
  }
  function renderSmallThings() {
    const ST = ENGINE.SmallThings;
    const list = ST.getOpen() || ST.startList();
    const entries = stSorted(list.entries);
    $view().innerHTML = `
      <div class="card" data-od-id="smallthings-list">
        <div class="pcontrols"><button class="pctl" type="button" data-act="practice-library">Practice library</button></div>
        <div class="node-title">Practice 3 · a few minutes, or all day</div>
        <h1 class="prompt">Small things</h1>
        <p class="st-started">Open since ${stHHMM(list.startedAt)} · ${stDateLabel(list.startedAt)}</p>
        ${entries.length
          ? `<p class="support">The time fills in by itself as you write — tap any time to set it for something earlier.</p>`
          : `<p class="support">What did today hold? Two to six words each. No sorting into good or bad — pills and ice cream sit side by side.</p>
             <p class="support">Leave this open and add things as they happen, or key in the whole day at once and set the times yourself. A photo can stand in for words, or go with them.</p>`}
        <ul class="st-list">${entries.map(stEntryHTML).join('')}</ul>
        ${stComposerHTML()}
        <div class="st-actions">
          <button class="btn" type="button" data-act="smallthings-close">${entries.length ? 'Close and keep this list' : 'Close this list'}</button>
        </div>
        <p class="support st-note">Nothing is kept until you close the list.</p>
        <div class="ghostrow"><button class="ghost" type="button" data-act="smallthings-past">Past lists</button></div>
      </div>`;
    updateInspector();
  }
  function stAdd() {
    const input = document.getElementById('st-composer-text');
    const text = input ? input.value.trim() : '';
    const photo = ST_composerPhoto;
    if (!text && !photo) { if (input) input.focus(); return; }
    const entry = ENGINE.SmallThings.addEntry({ text, image: photo });
    if (!entry) { stNotify('That could not be kept — this device may be out of space.'); return; }
    ST_composerPhoto = null;
    renderSmallThings();
    const again = document.getElementById('st-composer-text');
    if (again) again.focus();
  }
  function stPickPhoto(target) {
    const fi = document.getElementById('st-file');
    if (!fi) return;
    fi.dataset.target = target;
    fi.click();
  }
  function stHandlePhoto(file, target) {
    processImageFile(file).then(dataUrl => {
      if (target === 'composer') {
        ST_composerPhoto = dataUrl;
      } else {
        const ok = ENGINE.SmallThings.updateEntry(target, { image: dataUrl });
        if (!ok) stNotify('That photo is too large to keep on this device — your words were kept without it.');
      }
      renderSmallThings();
    }).catch(() => stNotify('That photo could not be read — try a JPEG or PNG.'));
  }
  function stZoom(id) {
    const ST = ENGINE.SmallThings;
    const open = ST.getOpen();
    let e = open && open.entries.find(x => x.id === id);
    if (!e) for (const r of ST.getKept()) { e = r.entries.find(x => x.id === id); if (e) break; }
    if (!e || !e.image) return;
    const ov = document.createElement('div');
    ov.className = 'samp-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Photo viewer');
    ov.innerHTML = `
      <div class="samp-dialog st-viewer">
        <img src="${e.image}" alt="A photo from your small things list">
        <div class="btnrow"><button class="ghost" type="button" data-act="smallthings-zoom-close">Close</button></div>
      </div>`;
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    $view().appendChild(ov);
  }
  function renderSmallThingsKept(res) {
    const n = res.list.entries.length;
    $view().innerHTML = `
      <div class="card" data-od-id="smallthings-kept">
        <div class="pcontrols"><button class="pctl" type="button" data-act="practice-library">Practice library</button></div>
        <div class="node-title">Practice 3 · Small things</div>
        <h1 class="prompt">${res.kept ? 'Kept.' : 'Closed.'}</h1>
        <p class="support">${res.kept
          ? `${n} small thing${n === 1 ? '' : 's'}, ${stDateLabel(res.list.startedAt)}, ${stHHMM(res.list.startedAt)} – ${stHHMM(res.list.closedAt)}, kept on this device.`
          : 'The list was empty, so nothing was kept.'}</p>
        <div class="st-actions">
          <button class="btn" type="button" data-act="smallthings-begin">Start a new list</button>
          ${res.kept ? `<button class="ghost" type="button" data-act="smallthings-past">Past lists</button>` : ''}
        </div>
      </div>`;
    updateInspector();
  }
  function renderSmallThingsPast() {
    const kept = ENGINE.SmallThings.getKept();
    $view().innerHTML = `
      <div class="card" data-od-id="smallthings-past">
        <div class="pcontrols"><button class="pctl" type="button" data-act="smallthings-list">Back to the open list</button></div>
        <div class="node-title">Practice 3 · Small things</div>
        <h1 class="prompt">Past lists</h1>
        ${kept.length ? `<div class="options">${kept.map(r => `
          <button class="opt" type="button" data-act="smallthings-view" data-id="${esc(r.id)}">
            <b>${esc(stDateLabel(r.startedAt))}</b>
            <span class="sub">${r.entries.length} ${r.entries.length === 1 ? 'entry' : 'entries'} · ${stHHMM(r.startedAt)} – ${stHHMM(r.closedAt)}</span>
          </button>`).join('')}</div>`
        : `<p class="support">No lists kept yet. Close a list and it will wait for you here.</p>`}
      </div>`;
    updateInspector();
  }
  function renderSmallThingsView(id) {
    const r = ENGINE.SmallThings.getKeptById(id);
    if (!r) { renderSmallThingsPast(); return; }
    const entries = stSorted(r.entries);
    $view().innerHTML = `
      <div class="card" data-od-id="smallthings-view">
        <div class="pcontrols"><button class="pctl" type="button" data-act="smallthings-past">Past lists</button></div>
        <div class="node-title">Practice 3 · Small things</div>
        <h1 class="prompt">${esc(stDateLabel(r.startedAt))}</h1>
        <p class="st-started">${r.entries.length} small thing${r.entries.length === 1 ? '' : 's'} · ${stHHMM(r.startedAt)} – ${stHHMM(r.closedAt)}</p>
        <ol class="st-day">${entries.map(e => `
          <li class="st-day-entry">
            <span class="st-day-time">${stHHMM(e.at)}</span>
            <span class="st-day-body">
              ${e.image ? `<button class="st-day-photobtn" type="button" data-act="smallthings-zoom" data-id="${esc(e.id)}" aria-label="View this photo larger"><img class="st-day-photo" src="${e.image}" alt="A photo from your small things list"></button>` : ''}
              ${e.text ? `<span class="st-day-words">${esc(e.text)}</span>` : ''}
            </span>
          </li>`).join('')}</ol>
      </div>`;
    updateInspector();
  }

  /* ---------- sampler cloth ---------- */
  function samplerClothHTML(stitches) {
    const S = ENGINE.Sampler;
    const patches = stitches.map(s => {
      const m = S.motifFor(s.practiceId);
      return `<button class="samp-patch" type="button" data-act="sampler-detail" data-id="${esc(s.id)}" style="--thread:${m.color}" aria-label="Stitch: ${esc(m.title)}, ${esc(S.formatDate(s.at))}"><span class="samp-motif">${m.svg}</span></button>`;
    }).join('');
    return `<div class="samp-cloth" role="list">${patches}${'<span class="samp-patch samp-empty" aria-hidden="true"></span>'.repeat(4)}</div>`;
  }

  function renderSamplerSeason(key) {
    const S = ENGINE.Sampler;
    const season = S.seasons().find(x => x.key === Number(key));
    UI._samplerSeason = Number(key);
    if (!season) { renderPracticeLibrary(); return; }
    $view().innerHTML = `
      <div class="card" data-od-id="sampler-season">
        <div class="pcontrols"><button class="pctl" type="button" data-act="sampler-library">Practice library</button></div>
        <div class="node-title">Practice · ${esc(season.label)}</div>
        <h1 class="prompt">${esc(season.label)} sampler</h1>
        <p class="support">${season.stitches.length} stitch${season.stitches.length === 1 ? '' : 'es'} kept · tap a stitch to revisit it.</p>
        ${samplerClothHTML(season.stitches)}
        <div class="ghostrow"><button class="ghost" type="button" data-act="sampler-library">← Back to the Practice library</button></div>
      </div>`;
    updateInspector();
  }

  function openStitchDetail(id) {
    const S = ENGINE.Sampler;
    const st = S.getStitches().find(s => s.id === id);
    if (!st) return;
    const m = S.motifFor(st.practiceId);
    closeStitchDetail();
    const ov = document.createElement('div');
    ov.className = 'samp-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Stitch detail');
    ov.innerHTML = `
      <div class="samp-dialog">
        <div class="samp-patch samp-patch-lg" style="--thread:${m.color}" aria-hidden="true"><span class="samp-motif">${m.svg}</span></div>
        <div class="samp-dialog-title">${esc(m.title)}</div>
        <p class="support">Stitched ${esc(S.formatDate(st.at))}</p>
        <div class="btnrow">
          <button class="btn" type="button" data-act="practice-start" data-practice="${esc(st.practiceId)}">Practice again</button>
          <button class="btn2" type="button" data-act="sampler-remove" data-id="${esc(st.id)}">Remove this stitch</button>
          <button class="ghost" type="button" data-act="sampler-close">Close</button>
        </div>
      </div>`;
    ov.addEventListener('click', e => { if (e.target === ov) closeStitchDetail(); });
    $view().appendChild(ov);
  }

  function closeStitchDetail() {
    const ov = $view().querySelector('.samp-overlay');
    if (ov) ov.remove();
  }

  /* Stitch control for the practice completion screen. The stitch is offered,
     never automatic: nothing is stored unless the user chooses to keep it. */
  function samplerCompleteControl() {
    const S = ENGINE.Sampler;
    const pid = ENGINE.Session.practiceId;
    if (!pid || !S.isKnownPractice(pid)) return '';
    if (S.hasRunStitch(ENGINE.Session.runId)) {
      return '<span class="muted small">Stitched into your sampler.</span>';
    }
    return '<button class="btn2" type="button" data-act="sampler-stitch">Stitch it into your sampler</button>';
  }

  /* ------- zero-result state: clear message + reset route ------- */
  function emptyInventoryState(q) {
    if (q) {
      return `<div class="note dash">No matching options for “${esc(q)}”. <button class="ghost" type="button" data-act="inv-clear">Search all possible answers</button></div>`;
    }
    return '<div class="note dash">No possible answers are available for this question right now.</div>';
  }

  /* ---------- inventory ---------- */
  function useInventoryOnce(optionId) {
    const origin = ENGINE.Session.returnPointer;
    const a = (ENGINE.PKG.optionsByNode[origin] || []).find(x => x.id === optionId)
      || ENGINE.PKG.inventoryAnswers.find(x => x.id === optionId);
    const S = ENGINE.Session, rp = S.returnPointer; S.returnPointer = null;
    if (!a) { ENGINE.gotoNode(rp); return; }
    // use the selected option's route for this run only (no persistence)
    S.currentNodeId = rp;
    ENGINE.selectOption(a.id);
  }
  function renderInventory() {
    const origin = ENGINE.Session.returnPointer;
    if (UI._invOrigin !== origin) { UI._invOrigin = origin; UI._invQuery = ''; }
    const originNode = ENGINE.PKG.nodeById[origin];
    const promptText = originNode ? (ENGINE.previewCopy(originNode, 'thread_display_template') || ENGINE.previewCopy(originNode, 'prompt')) : 'this question';
    const q = UI._invQuery || '';
    const results = ENGINE.searchInventory(origin, q);
    const total = ENGINE.nodeInventoryOptions(origin).length;
    $view().innerHTML = `
      <div class="card" data-od-id="inventory">
        <div class="pcontrols">
          <button class="pctl" type="button" data-act="inv-back">Back to the question</button>
          <button class="pctl" type="button" data-act="exit">Leave</button>
        </div>
        <div class="node-title">More options · ${esc(origin || '')}</div>
        <h1 class="prompt">More options</h1>
        <p class="support">Finding another answer for “${esc(promptText)}”. Choosing one uses it this time only — nothing is saved.</p>
        <div class="field"><label for="inv-q">Search possible answers</label><input id="inv-q" type="search" value="${esc(q)}" data-inv-search /></div>
        <p class="muted small">${results.length} of ${total} possible answers${q ? ' matching “' + esc(q) + '”' : ''}</p>
        ${results.length ? results.map(a => `
          <div class="resultrow"><span>${esc(a.label)}</span>
          <button class="ghost" type="button" data-inv-pick="${esc(a.id)}">Use</button></div>`).join('')
        : emptyInventoryState(q)}
      </div>`;
    updateInspector();
  }

  /* ---------- trigger simulator surface ---------- */
  function renderTriggerSim() {
    $view().innerHTML = `
      <div class="card" data-od-id="trigger-sim">
        <div class="pcontrols"><button class="pctl" type="button" data-act="home">Home</button></div>
        <div class="node-title">Trigger simulator · research control</div>
        <h1 class="prompt">Simulate an invitation moment</h1>
        <p class="support">This only shows the configured invitation inside the prototype. It never intercepts or touches another app.</p>
        <div class="simrow">
          <button class="btn2" type="button" data-act="sim-fire" data-label="About to open social media">About to open social media</button>
          <button class="btn2" type="button" data-act="sim-fire" data-label="Midday">Midday</button>
          <button class="btn2" type="button" data-act="sim-fire" data-label="After a difficult interaction">After a difficult interaction</button>
          <button class="btn2" type="button" data-act="sim-fire" data-label="Opened manually">Opened manually</button>
        </div>
      </div>`;
    updateInspector();
  }

  /* ---------- inspector ---------- */
  function updateInspector() {
    if (!ENGINE.Session.inspectorVisible) { $insp().hidden = true; return; }
    $insp().hidden = false;
    const S = ENGINE.Session;
    const node = ENGINE.PKG.nodeById[S.currentNodeId];
    const c = node ? ENGINE.classify(node) : null;
    const lastOpt = node ? (S.runAnswers[node.id] || '—') : '—';
    const rows = [
      ['node', S.currentNodeId || '—'],
      ['node type', node ? node.node_type : '—'],
      ['world', c ? node.world_code + ' · ' + c.world.label : '—'],
      ['function', c ? node.function_code + ' ' + c.fn.symbol + ' ' + (node.function_label || '') : '—'],
      ['variant', S.routeVariant],
      ['starter', S.activeStarter || '—'],
      ['practice', S.practiceId || '—'],
      ['selected', lastOpt],
      ['return pointer', S.returnPointer || '—'],
      ['volatile answers', Object.keys(S.runAnswers).length + ' node(s)'],
      ['custom text held', Object.keys(S.customText).length ? 'yes (volatile)' : 'no'],
      ['paused bookmark', S.pausedBookmark ? S.pausedBookmark.nodeId : '—'],
      ['patches (persisted)', ENGINE.lsGet(ENGINE.LS.patch, []).length],
      ['fallback hit', S.currentNodeId === 'ROUTE.INVALID' ? 'ROUTE.INVALID' : 'none']
    ];
    $inspBody().innerHTML = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('') +
      `<dt>route history</dt><dd><div class="hist">${S.history.concat([S.currentNodeId]).filter(Boolean).map(esc).join('<br>') || '—'}</div></dd>`;
  }

  /* ---------- dispatch ---------- */
  function render() {
    if (ENGINE.Session.pendingCustom) return renderCustomInput();
    const id = ENGINE.Session.currentNodeId;
    if (id === 'ONBOARDING') return renderOnboarding();
    if (id === 'INV.SEARCH') return renderInventory();
    const node = ENGINE.PKG.nodeById[id];
    if (!node) return renderHome();
    return renderNode(node);
  }

  /* ---------- events ---------- */
  function init() {
    document.querySelectorAll('[data-ui]').forEach(b => b.addEventListener('click', () => {
      const k = b.getAttribute('data-ui');
      if (k === 'home') renderHome();
      if (k === 'starters') renderStarterList();
      if (k === 'trigger') renderTriggerSim();
      if (k === 'settings') {
        // the corner gear acts as a toggle: on the settings page it goes back
        if (b.id === 'app-settings' && $view().querySelector('[data-od-id="settings"]')) exitSettings();
        else renderSettings();
      }
      if (k === 'inspector') {
        ENGINE.Session.inspectorVisible = !ENGINE.Session.inspectorVisible;
        document.querySelectorAll('[data-ui="inspector"]').forEach(x => x.setAttribute('aria-pressed', String(ENGINE.Session.inspectorVisible)));
        updateInspector();
      }
    }));

    $view().addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      const optId = btn.getAttribute('data-opt');
      const obA = btn.getAttribute('data-ob-answer');
      const invPick = btn.getAttribute('data-inv-pick');

      if (optId) {
        const node = ENGINE.PKG.nodeById[ENGINE.Session.currentNodeId];
        if (node && /^Multi/i.test(node.selection_mode || '') && btn.classList.contains('multi')) {
          const on = ENGINE.toggleSelection(optId);
          btn.setAttribute('aria-pressed', String(!!on));
          return;
        }
        ENGINE.selectOption(optId);
        return;
      }
      if (obA) {
        const q = btn.getAttribute('data-ob-q');
        UI._ob.answers[q] = obA;
        if (UI._ob.step < UI._ob.ids.length - 1) { UI._ob.step++; renderOnboardingStep(); }
        else renderOnboardingResult();
        return;
      }
      if (invPick) return useInventoryOnce(invPick);
      if (!act) return;
      const S = ENGINE.Session;
      const acts = {
        'home': () => renderHome(),
        'longer-explorations': () => renderLongerExplorations(),
        'starters': () => renderStarterList(),
        'starter-detail': () => renderStarterDetail(btn.getAttribute('data-starter')),
        'start-starter': () => {
          const s = ENGINE.PKG.starterById[btn.getAttribute('data-starter')];
          ENGINE.newRun();
          S.activeStarter = s.id;
          S.routeVariant = btn.getAttribute('data-variant') || 'Standard';
          ENGINE.gotoNode(S.routeVariant === 'Low' ? s.low_entry_node : s.standard_entry_node);
        },
        'entry': () => {
          const entryId = btn.getAttribute('data-entry');
          if (entryId === 'ENTRY.TOOLKIT') { SCENARIO_UI.openList(); return; }
          const ep = ENGINE.PKG.entryPoints.find(x => x.id === entryId);
          if (ep) { if (!S.currentNodeId) ENGINE.newRun(); ENGINE.gotoNode(ep.node_id); }
        },
        'onboarding': () => { ENGINE.newRun(); S.currentNodeId = 'ONBOARDING'; renderOnboarding(); },
        'ob-back': () => { UI._ob.step--; renderOnboardingStep(); },
        'ob-skip': () => renderStarterList(),
        'back': () => ENGINE.goBack(),
        'exit': () => ENGINE.exitFlow(),
        'discard-bookmark': () => { S.pausedBookmark = null; renderHome(); },
        'practice-start': () => {
          ENGINE.newRun(); S.practiceId = btn.getAttribute('data-practice');
          ENGINE.gotoNode('PM.00');
        },
        'sampler-stitch': () => {
          ENGINE.Sampler.addStitch(ENGINE.Session.practiceId, ENGINE.Session.runId);
          renderTerminal({ id: 'PRACTICE.COMPLETE' });
        },
        'sampler-detail': () => openStitchDetail(btn.getAttribute('data-id')),
        'sampler-close': () => closeStitchDetail(),
        'sampler-remove': () => {
          ENGINE.Sampler.removeStitch(btn.getAttribute('data-id'));
          closeStitchDetail();
          if (UI._samplerSeason) renderSamplerSeason(UI._samplerSeason);
          else renderPracticeLibrary();
        },
        'sampler-season': () => renderSamplerSeason(btn.getAttribute('data-season')),
        'sampler-library': () => renderPracticeLibrary(),
        'practice-library': () => renderPracticeLibrary(),
        'smallthings-begin': () => { ST_composerPhoto = null; renderSmallThings(); },
        'smallthings-list': () => { ST_composerPhoto = null; renderSmallThings(); },
        'smallthings-add': () => stAdd(),
        'smallthings-remove': () => { ENGINE.SmallThings.removeEntry(btn.getAttribute('data-id')); renderSmallThings(); },
        'smallthings-photo-entry': () => stPickPhoto(btn.getAttribute('data-id')),
        'smallthings-photo-composer': () => stPickPhoto('composer'),
        'smallthings-photo-clear': () => { ST_composerPhoto = null; renderSmallThings(); },
        'smallthings-close': () => {
          const res = ENGINE.SmallThings.closeList();
          ST_composerPhoto = null;
          if (!res) { renderPracticeLibrary(); return; }
          renderSmallThingsKept(res);
        },
        'smallthings-past': () => renderSmallThingsPast(),
        'smallthings-view': () => renderSmallThingsView(btn.getAttribute('data-id')),
        'smallthings-zoom': () => stZoom(btn.getAttribute('data-id')),
        'smallthings-zoom-close': () => { const ov = $view().querySelector('.samp-overlay'); if (ov) ov.remove(); },
        'sim-fire': () => { ENGINE.newRun(); ENGINE.simulateTrigger(btn.getAttribute('data-label')); },
        'inv-back': () => { const rp = S.returnPointer; S.returnPointer = null; ENGINE.gotoNode(rp); },
        'inv-clear': () => { UI._invQuery = ''; renderInventory(); },
        'custom-confirm': () => { const el = document.getElementById('custom-text'); ENGINE.confirmCustomInput(el ? el.value : ''); },
        'custom-cancel': () => ENGINE.cancelCustomInput(),
        'scheme-set': () => setScheme(btn.getAttribute('data-scheme')),
        'settings-exit': () => exitSettings(),
        'open-scenario': () => SCENARIO_UI.openEditor(btn.getAttribute('data-id')),
      };
      if (acts[act]) acts[act]();
    });

    $view().addEventListener('input', (e) => {
      if (e.target.hasAttribute('data-inv-search')) {
        UI._invQuery = e.target.value;
        renderInventory();
        const el = document.querySelector('[data-inv-search]');
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }
      /* small things: entry text saves as you type, without re-rendering */
      if (e.target.hasAttribute('data-st-text')) {
        ENGINE.SmallThings.updateEntry(e.target.getAttribute('data-id'), { text: e.target.value });
      }
    });

    $view().addEventListener('change', (e) => {
      /* small things: tapping a time sets it by hand (batch/key-in mode) */
      if (e.target.hasAttribute('data-st-time')) {
        ENGINE.SmallThings.setEntryTime(e.target.getAttribute('data-id'), e.target.value);
        return;
      }
      if (e.target.id === 'st-file' && e.target.files && e.target.files[0]) {
        stHandlePhoto(e.target.files[0], e.target.dataset.target || 'composer');
        e.target.value = '';
      }
    });

    $view().addEventListener('submit', (e) => {
      /* small things: Enter in the composer adds the entry */
      if (e.target.id === 'st-composer-form') { e.preventDefault(); stAdd(); }
    });


    /* Escape exits any run from anywhere — the prototype's emergency brake */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !window.NAV && ENGINE.Session.currentNodeId) ENGINE.exitFlow();
    });

    // cursor tooltip for home starter buttons — same look/mechanism as the
    // scenario editor's "drag and drop" tip (fixed box following the cursor)
    const tip = document.createElement('div');
    tip.className = 'scn-tip';
    document.body.appendChild(tip);
    $view().addEventListener('mousemove', (e) => {
      const el = e.target.closest && e.target.closest('.has-cursor-tip');
      if (el && el.getAttribute('data-tip')) {
        tip.textContent = el.getAttribute('data-tip');
        tip.classList.add('on');
        const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
        tip.style.left = Math.max(8, x) + 'px';
        tip.style.top = (e.clientY + 16) + 'px';
      } else {
        tip.classList.remove('on');
      }
    });
    $view().addEventListener('mouseleave', () => tip.classList.remove('on'));

    // app logo — prepended to the top banner (.pcontrols) of every screen,
    // including ones rendered by other modules
    const LOGO = '<button class="scn-logo-btn" type="button" data-act="home" aria-label="Finding Self, Author of Worlds — go to home page"><span class="scn-logo" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.4" r="2.2"/><path d="M9.3 7.4 C9.3 7.1 9.55 6.9 9.9 6.9 H14.1 C14.45 6.9 14.7 7.1 14.7 7.4 L14 14.9 C14 15.35 13.7 15.65 13.3 15.65 H10.7 C10.3 15.65 10 15.35 10 14.9 Z"/><path d="M9.4 8.5 C8.5 9.5 8.4 11.2 10.3 11.5"/><path d="M14.6 8.3 C15.9 8.6 17.4 8 18.3 7.1"/><path d="M18.3 7.1 L19.8 6.4 M18.3 7.1 L19.7 7.7"/></g><path d="M12 12.5 C11.6 12.1 10 11.5 10 10.5 C10 9.8 10.5 9.4 11 9.4 C11.5 9.4 11.9 9.8 12 10.3 C12.1 9.8 12.5 9.4 13 9.4 C13.5 9.4 14 9.8 14 10.5 C14 11.5 12.4 12.1 12 12.5 Z" fill="var(--cg-coral)"/></svg></span><span class="scn-logo-text" aria-hidden="true">Finding Self,<br>Author of Worlds</span></button>';
    const addLogo = () => {
      document.querySelectorAll('#view .pcontrols:not(.has-logo)').forEach(p => {
        p.classList.add('has-logo');
        p.insertAdjacentHTML('afterbegin', LOGO);
      });
    };

    // Identity is now a non-navigating shared application bar.

    applyScheme(currentScheme());
    renderHome();
  }

  return {
    init, render, renderHome, renderLongerExplorations, renderTerminal, renderExternalTerminal,
    renderPrimitiveTerminal, renderOnboardingResult, renderNode, renderHelp,
    renderSettings, updateInspector, _ob: null, _invQuery: '', _invOrigin: null
  };
})();

/* scenario-ui.js reaches the renderer through window.UI — a top-level `const`
   is script-scoped and would otherwise never appear there. */
window.UI = UI;
