/* ============================================================
   Making room — arrangements, helpful conditions, belonging,
   and contribution for the FS-AW prototype.
   Additive module: its own stores (fsaw.arrangements.v1,
   fsaw.conditions.v1), its own screens,
   no changes to routing or to the canonical package.

   Inspiration, translated plainly:
   - Roy: attention to particular lives and the material
     conditions that make them possible; hospitality built
     inside unequal circumstances, not outside them.
   - Yuknavitch: experience may stay unfinished, contradictory,
     embodied — notes can sit side by side without resolving.
   - Tolokonnikova: contribution sized to actual energy, skills,
     resources, and preferred visibility; public action is one
     option, never the goal.

   Principles encoded here:
   - Partial is complete: every step can be skipped; stopping
     early still saves something real.
   - Proposals are proposals: an arrangement becomes an
     agreement only when the user records that others agreed.
   - No pressure mechanics: no streaks, scores, or due dates.
     Pause, archive, and "it didn't fit" are ordinary outcomes.
   - The source stays intact: practices can start from a note
     without altering or summarizing it.
   ============================================================ */
'use strict';

const ROOM = (() => {
  const $view = () => document.getElementById('view');
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const uid = (p) => p + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  const today = () => new Date().toISOString();
  const day = (iso) => String(iso || '').slice(0, 10);

  /* ---------- stores ---------- */
  const AKEY = () => ENGINE.LS.arrangement;
  const CKEY = () => ENGINE.LS.condition;
  const arrangements = () => ENGINE.lsGet(AKEY(), []);
  const conditions = () => ENGINE.lsGet(CKEY(), []);
  const saveArrangements = (l) => ENGINE.lsSet(AKEY(), l);
  const saveConditions = (l) => ENGINE.lsSet(CKEY(), l);
  const getArrangement = (id) => arrangements().find(a => a.id === id) || null;
  function putArrangement(a) {
    a.updatedAt = today();
    const l = arrangements();
    const i = l.findIndex(x => x.id === a.id);
    if (i >= 0) l[i] = a; else l.push(a);
    saveArrangements(l);
  }

  /* ---------- shared chrome ---------- */
  function head(title, kicker, support, hero, back) {
    const h1 = `<h1 class="prompt" tabindex="-1">${esc(title)}</h1>`;
    return `<div class="pcontrols">${back ? '<button class="pctl" type="button" data-ract="back">Back</button>' : ''}<button class="pctl" type="button" data-ract="home">Home</button></div>
      ${kicker ? `<div class="node-title">${esc(kicker)}</div>` : ''}
      ${hero ? `<div class="room-hero">${h1}</div>` : h1}
      ${support ? `<p class="support">${esc(support)}</p>` : ''}`;
  }
  function settle() {
    if (window.UI && UI.updateInspector) UI.updateInspector();
    const p = $view().querySelector('.prompt');
    if (p) p.focus({ preventScroll: false });
  }
  const goHome = () => { closeShare(); closeLang(); closeLeafPopup(); if (window.UI && UI.renderHome) UI.renderHome(); };
  /* Back on a room page returns to the page it was opened from */
  let roomBackFn = null;
  const roomBackGo = () => { const f = roomBackFn; roomBackFn = null; if (typeof f === 'function') { try { f(); } catch (err) { goHome(); } } else goHome(); };
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const fieldVal = (name) => { const el = $view().querySelector(`[data-rfield="${name}"]`); return el ? el.value.trim() : ''; };

  /* material chips: attachable without summarizing */
  function materialLabel(m) {
    if (m.type === 'note') return 'a note (since removed)';
    if (m.type === 'condition') { const c = conditions().find(x => x.id === m.id); return c ? 'something that helped: “' + c.text + '”' : 'a condition (since removed)'; }
    return 'material';
  }
  function materialLine(material) {
    if (!material || !material.length) return '';
    return `<p class="note-hint">Starting from: ${material.map(materialLabel).map(esc).join(' · ')}. The original stays as it is.</p>`;
  }

  /* ============================================================
     1 · Make room for this — a small, concrete arrangement
     ============================================================ */
  let pDraft = null;
  const LANG_GROUPS = {
    'places and environments': ['My relationship with my hometown', 'Time in nature', 'A need I have', 'Something I can’t name yet'],
    'things to do': ['Drawing', 'A creative interest', 'A need I have', 'Something I can’t name yet'],
    'other people, relationships, community': ['Quiet companionship', 'A friendship', 'What friendship means to me', 'A need I have', 'Something I can’t name yet']
  };
  const HELP_KINDS = ['a person', 'a place', 'a time', 'a resource', 'a changed expectation', 'a shared agreement'];

  function openPractice(pre) {
    pDraft = Object.assign({ material: [], whatMatters: '', difficult: '', help: '', experiment: '', sticky: [] }, pre || {});
    resetGarden();
    renderPractice(1);
  }

  /* ---------- the scene: a table to sit at, a place around it,
     someone on the way with a chair — plus draggable sticky notes ---------- */
  let rsEditId = null;
  let rsDrag = null;
  /* the scene (shared by the practice and the lamp room) re-renders the active
     page after a sticky-note edit/drop — this points at whichever page is up */
  let rsOnRender = () => renderPractice(1);
  const sceneStickies = () => pDraft.sticky || (pDraft.sticky = []);
  function rsNoteHtml(n) {
    const z = n.z ? `z-index:${n.z};` : '';
    if (rsEditId === n.id) {
      return `<div class="rs-note editing" data-rs-id="${esc(n.id)}" style="left:${n.x}%;top:${n.y}%;${z}--rot:0deg"><textarea data-rs-text aria-label="Write on the sticky note" placeholder="Write here…">${esc(n.text)}</textarea></div>`;
    }
    return `<div class="rs-note" data-rs-id="${esc(n.id)}" data-rs-grab="note" role="button" tabindex="0" aria-label="Sticky note${n.text ? ': ' + n.text : ''}. Activate to write on it." style="left:${n.x}%;top:${n.y}%;${z}--rot:${esc(n.rot || 0)}deg">${n.text ? `<span class="rs-note-text">${esc(n.text)}</span>` : '<span class="rs-note-empty">…</span>'}</div>`;
  }
  /* shared scenery — used by the scene and by the leaf-picker cards */
  const RS_HOUSE = `<polygon points="30,198 82,150 134,198" class="rs-roof"/><rect x="38" y="198" width="88" height="74" class="rs-house"/><rect x="62" y="234" width="24" height="38" class="rs-door"/><circle cx="106" cy="220" r="9" class="rs-window"/><rect x="146" y="232" width="10" height="46" class="rs-trunk"/><ellipse cx="151" cy="206" rx="27" ry="30" class="rs-canopy"/>`;
  const RS_TABLEPERSON = `<rect x="206" y="214" width="9" height="60" class="rs-wood"/><rect x="206" y="266" width="42" height="9" class="rs-wood"/><rect x="239" y="252" width="9" height="24" class="rs-wood"/><circle cx="247" cy="196" r="14" class="rs-ink"/><path d="M240 208 Q237 236 243 262 L263 262 Q265 232 257 208 Z" class="rs-ink"/><path d="M246 262 L284 262" class="rs-limb"/><path d="M284 262 L286 296" class="rs-limb"/><path d="M256 218 Q278 226 294 231" class="rs-limb"/>`;
  const RS_TABLE = `<rect x="290" y="232" width="150" height="11" rx="3" class="rs-wood"/><rect x="300" y="243" width="9" height="57" class="rs-wood"/><rect x="420" y="243" width="9" height="57" class="rs-wood"/><rect x="306" y="214" width="15" height="18" class="rs-cup"/><path d="M321 218 q9 3 0 10" class="rs-cupline"/><rect x="338" y="224" width="34" height="8" rx="2" class="rs-book" transform="rotate(-3 355 228)"/><path d="M394 232 l4 -15 h16 l4 15 z" class="rs-pot"/><path d="M406 216 q-12 -12 -2 -22 M406 216 q12 -10 4 -22" class="rs-sprig"/>`;
  const RS_WALKER = `<circle cx="566" cy="172" r="14" class="rs-ink"/><path d="M557 186 q-5 27 0 52 l22 0 q5 -25 0 -52 z" class="rs-ink"/><path d="M560 238 L550 296" class="rs-limb"/><path d="M574 238 L586 294" class="rs-limb"/><path d="M552 200 L520 188" class="rs-limb"/><path d="M568 206 L530 234" class="rs-limb"/><g transform="rotate(-14 522 218)"><rect x="512" y="172" width="9" height="52" class="rs-wood"/><rect x="512" y="220" width="50" height="9" rx="2" class="rs-wood"/><rect x="517" y="229" width="8" height="36" class="rs-wood"/><rect x="550" y="229" width="8" height="36" class="rs-wood"/></g>`;
  function sceneHtml(withPiles) {
    const notes = sceneStickies().map(rsNoteHtml).join('');
    const piles = withPiles ? leafPilesHtml() : '';
    const langs = withPiles ? leafLangHtml() : '';
    const hint = withPiles
      ? 'Drag a leaf from a pile onto a dotted leaf of the plant.'
      : 'Drag a note from the pile anywhere on the scene, then tap it to write.';
    return `<div class="room-scene" data-od-id="room-scene">
      <div class="room-scene-stage">
        <svg class="rs-svg" viewBox="0 0 660 344" role="img" aria-label="A person sits at a table with a few things on it. To the left are a house and a tree. To the right, another person walks over carrying a chair.">
          <line x1="16" y1="300" x2="644" y2="300" class="rs-ground"/>
          <g>${RS_HOUSE}</g>
          <g>${RS_TABLEPERSON}</g>
          <g>${RS_TABLE}</g>
          <g>${RS_WALKER}</g>
          <text x="106" y="330" class="rs-label" text-anchor="middle">places and environments</text>
          <text x="365" y="330" class="rs-label" text-anchor="middle">things to do</text>
          <text x="560" y="320" class="rs-label" text-anchor="middle">other people,</text>
          <text x="560" y="337" class="rs-label" text-anchor="middle">relationships, community</text>
        </svg>
        ${notes}
        ${piles}
        ${langs}
        ${withPiles ? '' : '<button class="rs-lang has-cursor-tip" type="button" data-ract="lang-open" data-tip="click for pre-made options" aria-label="help me find language — click for pre-made options">help me find language</button>'}
        ${withPiles ? '' : '<div class="rs-pile has-cursor-tip" data-rs-grab="pile" role="button" tabindex="0" data-tip="drag and drop sticky note, then write on it" aria-label="Sticky notes — drag one onto the scene, then tap it to write"><span class="rs-p3"></span><span class="rs-p2"></span><span class="rs-p1"></span></div>'}
      </div>
      <p class="note-hint rs-hint">${hint}</p>
    </div>`;
  }

  /* ---------- piles of leaves under the scene's objects (practice only) ----------
     Three small piles sit on the floor beneath the house/tree, the table, and
     the person with the chair — each a slightly different green. Individual
     leaves are dragged, one at a time, up onto the plant's potential leaves. */
  const PILE_LEAF_SVG = '<svg viewBox="0 0 22 26" aria-hidden="true" focusable="false"><path d="M11 1 C 18 6, 19 18, 11 25 C 3 18, 4 6, 11 1 Z"/></svg>';
  /* the three piles rest on the floor line (svg ground at y=300 of a
     344-tall viewBox → bottom ≈ 12.8%) directly beneath their object:
     the house and tree, the table (and the person at it), and the person
     walking over carrying a chair */
  const PILE_SPOTS = {
    a: { left: 23, bottom: 12.8 },
    b: { left: 54.5, bottom: 12.8 },
    c: { left: 84.8, bottom: 12.8 }
  };
  function leafPilesHtml() {
    let out = '<div class="leaf-piles" data-od-id="leaf-piles" aria-label="Piles of leaves — drag one onto a dotted leaf on the plant">';
    ['a', 'b', 'c'].forEach(id => {
      const n = leafPiles[id] || 0;
      if (n <= 0) return;
      const s = PILE_SPOTS[id];
      const leaves = [];
      for (let i = 0; i < n; i++) {
        leaves.push(`<span class="pile-leaf" data-pile="${id}" style="--i:${i - (n - 1) / 2}">${PILE_LEAF_SVG}</span>`);
      }
      out += `<span class="leaf-pile lp-${id}" data-pile="${id}" style="left:${s.left}%;bottom:${s.bottom}%;">${leaves.join('')}</span>`;
    });
    return out + '</div>';
  }
  /* "help me find language" becomes a leaf like the piles' — three copies,
     one beside each pile, sharing that pile's shape and tint */
  const LANG_LEAF_SPOTS = {
    a: { left: 28.5 },
    b: { left: 60 },
    c: { left: 90.5 }
  };
  function leafLangHtml() {
    let out = '<div class="leaf-langs" data-od-id="leaf-langs" aria-label="help me find language">';
    ['a', 'b', 'c'].forEach(id => {
      const s = LANG_LEAF_SPOTS[id];
      out += `<button class="leaf-lang lp-${id} has-cursor-tip" type="button" data-ract="lang-open" data-tip="click for pre-made options" aria-label="help me find language — click for pre-made options" style="left:${s.left}%;bottom:12.8%;">${PILE_LEAF_SVG}</button>`;
    });
    return out + '</div>';
  }

  /* ---------- the plant: leaves open the leaf picker popup ---------- */
  const LEAF_CATS = [
    { key: 'house', label: 'Places and environments', cls: 'xl-1', example: '[E.g. a quiet corner of the library]' },
    { key: 'table', label: 'Things to do', cls: 'xl-2', example: '[E.g. drawing with no one watching]' },
    { key: 'walk', label: 'Other people, relationships, and community', cls: 'xl-3', example: '[E.g. company without keeping a conversation going]' },
    { key: 'none', label: 'Others', cls: 'xl-4', example: '[E.g. something I can’t name yet]' }
  ];
  const leafTexts = { house: '', table: '', walk: '', none: '', window: '' };
  let leafCat = 'house';
  let extraLeaves = 0; /* leaves added via the dotted add-leaf */
  /* leaf-gathering state (practice step 1 only): the three piles of leaves
     under the scene's objects, and which of the plant's potential leaves
     have been filled by a dragged leaf (they then count as existing leaves) */
  const leafPiles = { a: 3, b: 3, c: 3 };
  const gardenFilled = {};
  function resetGarden() {
    leafPiles.a = 3; leafPiles.b = 3; leafPiles.c = 3;
    Object.keys(gardenFilled).forEach(k => delete gardenFilled[k]);
  }
  const leafCatOf = (key) => LEAF_CATS.find(c => c.key === key) || LEAF_CATS[0];
  function leafLabelCls(key) {
    if (key === 'window') return 'xw-1';
    const c = LEAF_CATS.find(x => x.key === key);
    return c ? c.cls : key;
  }
  function leafDisplayText(key) {
    const t = String(leafTexts[key] || '').trim();
    if (t) return t;
    if (key === 'window') return '[E.g. a room with morning light]';
    if (key.indexOf('leaf-x') === 0) return '[E.g. something of my own]';
    return leafCatOf(key).example;
  }
  function syncLeafLabel(key) {
    const cls = leafLabelCls(key);
    const el = $view().querySelector('.x-leaf-label.' + cls);
    if (!el) return;
    const isExample = !String(leafTexts[key] || '').trim();
    el.textContent = leafDisplayText(key);
    el.classList.toggle('is-example', isExample);
  }
  function leafIllSvg(key) {
    const vb = key === 'house' ? '24 144 134 132' : key === 'table' ? '198 186 250 116' : key === 'walk' ? '500 148 110 156' : '';
    if (!vb) return '';
    const body = key === 'house' ? RS_HOUSE : key === 'table' ? RS_TABLEPERSON + RS_TABLE : RS_WALKER;
    return `<svg viewBox="${vb}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
  }
  /* leaf templates: left-pointing (tip 208,92) and right-pointing (tip 306,-2) */
  const LEAF_LEFT_T = 'M261 130 C 234 128, 212 112, 208 92 C 230 94, 252 110, 261 126 Z';
  const LEAF_RIGHT_T = 'M260 34 C 284 32, 302 18, 306 -2 C 286 0, 268 14, 260 30 Z';
  /* plant + lamp scene, shared by the practice (variant 'practice': leaf click
     targets) and the lamp room (variant 'lamp': lamp click target). One shared
     state (leafTexts / extraLeaves / leafCat) drives both, so leaf text/count
     edits on the practice appear on the lamp room, and lamp text edits on the
     lamp room appear on the practice. */
  function plantHtml(variant) {
    const MAX_LEAVES = 8;
    const canAdd = 4 + extraLeaves < MAX_LEAVES;
    const S = canAdd ? 4 + extraLeaves : 3 + extraLeaves; /* top slot: the dotted add-leaf, or the last normal leaf when the plant is full */
    const tipY = (i) => i <= 3 ? 134 - 32 * i : 38 - 48 * (i - 3);
    const isPractice = variant === 'practice';
    const isLamp = variant === 'lamp';
    const topSlot = isPractice ? 3 + extraLeaves : S; /* practice has no '+' add-leaf */
    /* practice: the plant stands alone and centered, so its frame hugs the
       plant — a small headroom above the top leaf and below the stem. The
       lamp room keeps the taller frame the lamp scene needs. */
    const T = isPractice ? tipY(topSlot) - 20 : Math.min(-180, tipY(topSlot) - 24); /* top of the viewBox */
    const H = isPractice ? 200 - T : 300 - T;
    const pctY = (y) => +(((y - T) / H) * 100).toFixed(2);
    /* --- floor lamp + plant placement (SVG units, viewBox 0 T 520 H) ------
       The lamp is scaled LAMP_SCALE× about its base and moved so its pole sits
       at LAMP_CX (1/3 of the 520-wide scene); the plant is shifted right by
       PLANT_DX so its stem sits at 2/3 of the scene. */
    const LAMP_SCALE = 1.1;
    const LAMP_CX = 173.3;
    const LAMP = { left: 151.3, right: 195.3, top: 20, bottom: 176 }; /* scaled+moved lamp bounds */
    const LAMP_H_PCT = +(((LAMP.bottom - LAMP.top) / H) * 100).toFixed(2); /* lamp height % */
    const base = [
      { key: 'house', cls: 'xl-1', top: 130.4, left: true, potential: true, px: 234, py: 110,
        d: 'M261 130 C 234 128, 212 112, 208 92 C 230 94, 252 110, 261 126 Z', dy: 42 },
      { key: 'table', cls: 'xl-2', top: 111.2, left: false, potential: true, px: 289, py: 79,
        d: 'M261 98 C 288 96, 310 80, 314 60 C 292 62, 270 78, 261 94 Z', dy: 42 },
      { key: 'walk', cls: 'xl-3', top: 51.2, left: true, potential: true, px: 235, py: 47,
        d: 'M261 66 C 236 64, 214 48, 210 28 C 232 30, 252 46, 261 62 Z', dy: 42 },
      { key: 'none', cls: 'xl-4', top: 36.8, left: false, potential: true, px: 283, py: 16,
        d: 'M260 34 C 284 32, 302 18, 306 -2 C 286 0, 268 14, 260 30 Z', dy: 40 }
    ];
    /* right-column label stack: table, none, then every added leaf */
    const stack = {};
    if (extraLeaves > 0) {
      const lastCustom = canAdd ? S - 1 : S;
      const entries = [{ key: 'table', c: tipY(1) + 19 }, { key: 'none', c: tipY(3) + 19 }];
      for (let i = 4; i <= lastCustom; i++) entries.push({ key: 'leaf-x' + (i - 3), c: tipY(i) + 19 });
      entries.sort((a, b) => a.c - b.c);
      let prevB = T + 6;
      entries.forEach(en => {
        const top = Math.max(en.c - 25, prevB + 8, T + 6);
        stack[en.key] = top;
        prevB = top + 50;
      });
    }
    const slots = [];
    for (let i = 0; i <= S; i++) {
      const ty = tipY(i);
      if (i < 4) {
        const b = Object.assign({}, base[i], { ty, add: false });
        b.potential = !gardenFilled[b.key] && !!b.potential; /* filled leaves become existing */
        slots.push(b);
      } else if (isPractice && i > 3 + extraLeaves) {
        continue; /* the practice plant has no '+' add-leaf — leaves arrive by dragging */
      } else {
        slots.push({
          key: 'leaf-x' + (i - 3), custom: true, add: canAdd && i === S, ty,
          left: i % 2 === 0,
          d: i % 2 === 0 ? LEAF_LEFT_T : LEAF_RIGHT_T,
          dy: i % 2 === 0 ? ty - 92 : ty + 2
        });
      }
    }
    const stemTop = tipY(topSlot) + 38;
    const leafSvg = (l) => {
      const paths = l.potential
        ? `<path d="${l.d}" class="rs-leaf rs-leaf-add"/><g class="rs-plus"><path d="M${l.px - 5} ${l.py} H${l.px + 5}"/><path d="M${l.px} ${l.py - 5} V${l.py + 5}"/></g>`
        : l.add
          ? `<path d="${l.d}" class="rs-leaf rs-leaf-add"/><g class="rs-plus"><path d="M${l.left ? 227 : 276} ${l.left ? 111 : 16} H${l.left ? 241 : 290}"/><path d="M${l.left ? 234 : 283} ${l.left ? 104 : 9} V${l.left ? 118 : 23}"/></g>`
          : `<path d="${l.d}" class="rs-leaf"/>`;
      return `<g transform="translate(0 ${l.dy})">${paths}</g>`;
    };
    const labelHtml = (l) => {
      const isExample = !String(leafTexts[l.key] || '').trim();
      let style = '';
      if (l.custom) style = `left:${75.3 - H_OFF}%;max-width:19.5%;top:${pctY(stack[l.key])}%;`;
      else {
        const y = (extraLeaves > 0 && (l.cls === 'xl-2' || l.cls === 'xl-4')) ? stack[l.key] : l.top;
        style = `top:${pctY(y)}%;`;
      }
      return `<span class="x-leaf-label ${l.cls || l.key}${isExample ? ' is-example' : ''}"${style ? ` style="${style}"` : ''}>${esc(leafDisplayText(l.key))}</span>`;
    };
    const dropHtml = (l) => {
      const geo = `left:${(l.left ? 50.3 : 61.3) - H_OFF}%;width:17%;top:${pctY(l.ty - 4)}%;height:${+(52 / H * 100).toFixed(2)}%;`;
      return `<span class="leaf-drop has-cursor-tip" data-leaf="${esc(l.key)}" data-tip="Drag a leaf here from below" aria-hidden="true" style="${geo}"></span>`;
    };
    /* the practice page's plant stands alone (no lamp), so it sits centered;
       the lamp room keeps the lamp-left / plant-right composition. All the
       overlay labels and hit buttons shift with the plant by the same amount. */
    const H_OFF = isLamp ? 0 : (84.7 / 520) * 100;
    const PLANT_DX = isLamp ? 84.7 : 0;
    return `<div class="x-plant${isPractice ? ' x-plant-ctr' : ''}" data-od-id="room-plant">
      <svg class="plant-svg" viewBox="0 ${T} 520 ${H}" aria-hidden="true" focusable="false">
        <path d="M14 176 C 120 170, 250 180, 380 174 C 440 171, 490 176, 508 174" fill="none" class="rs-ground" stroke-width="1.4"/>
        ${isLamp ? `<g transform="translate(${LAMP_CX - 58} 0) translate(58 176) scale(${LAMP_SCALE}) translate(-58 -176)">
          <ellipse cx="58" cy="172" rx="34" ry="5" class="rs-light"/>
          <path d="M58 90 V164" class="rs-stem"/>
          <path d="M44 176 L72 176 L67 163 L49 163 Z" class="pot-body"/>
          <circle cx="58" cy="86" r="9" class="rs-light"/>
          <circle cx="58" cy="86" r="4.5" class="torch-lens"/>
          <path d="M46 34 L70 34 L78 80 L38 80 Z" class="rs-sun"/>
        </g>` : ''}
        <g transform="translate(${PLANT_DX} 0)">
          <path d="M262 176 C 258 146, 264 ${(176 + stemTop) / 2}, 260 ${stemTop}" fill="none" class="rs-stem"/>
          ${slots.map(leafSvg).join('')}
        </g>
      </svg>
      ${slots.filter(l => !l.add).map(labelHtml).join('')}
      <span class="x-leaf-label xw-1${!String(leafTexts.window || '').trim() ? ' is-example' : ''}" style="left:${39 - H_OFF}%;top:${pctY(60)}%;">${esc(leafDisplayText('window'))}</span>
      ${isLamp ? `<span class="lamp-note-h" data-od-id="lamp-note" style="left:2%;width:38%;top:${pctY(-30)}%;">Notice what makes room for your life/makes your life more possible</span>
      <span class="lamp-note-ex" data-od-id="lamp-note-long" style="left:2%;width:42%;top:${pctY(-150)}%;">Connect selected moments into a simple map or collection of helpful conditions — identify the relationships, spaces, settings, activities, expectations, and other arrangements that make a helpful difference, perhaps such as those where you get to feel like your standpoint has practical consequence.</span>` : ''}
      ${isPractice ? slots.filter(l => l.potential && !l.add && !l.custom).map(dropHtml).join('') : ''}
      ${isLamp ? `<button class="x-leafhit-btn has-cursor-tip" type="button" data-ract="leaf-open" data-leaf="window" data-tip="Add something that you noticed helped here/made space for you" aria-label="the lamp — open" style="left:28%;width:11%;top:${pctY(LAMP.top)}%;height:${LAMP_H_PCT}%;"></button>` : ''}
    </div>`;
  }
  function openLeafPopup(key) {
    leafCat = key;
    renderLeafPopup();
  }
  function closeLeafPopup() {
    const bd = document.getElementById('room-leaf-backdrop');
    if (bd) bd.remove();
  }
  /* leaf-shaped popup backdrop: an ovate leaf held near-vertical —
     acuminate tip at the bottom, tapered base with petiole at the top,
     continuously curved margins (widest just below the middle); the
     content sits in the belly, leaving the taper zones empty */
  const LEAF_SHAPE_BG = `<svg class="leaf-shape-bg" viewBox="0 0 70 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="leaf-blade-grad" x1="0" y1="1" x2="1" y2="0">
            <stop class="leaf-tint leaf-tint-deep" offset="0"/>
            <stop class="leaf-tint leaf-tint-mid" offset="0.45"/>
            <stop class="leaf-tint leaf-tint-pale" offset="1"/>
          </linearGradient>
        </defs>
        <path class="leaf-blade" vector-effect="non-scaling-stroke" fill="url(#leaf-blade-grad)" d="M35 101 C 26 100, 17 97, 10.5 91.5 C 6.5 85, 4.6 76, 4.4 70 C 4.4 58, 4.9 40, 6.1 26 C 7.4 14.5, 9 7.8, 15 6 C 21 3.4, 29 2.2, 36.5 1.9 C 44 2.1, 50.5 3.5, 56.5 6.4 C 61.5 9.8, 64.8 17, 65.6 27 C 66.2 40, 65.4 60, 63.8 72 C 63 84, 58.5 91.5, 47.5 96.8 C 43.5 98.7, 39.5 100.3, 35 101 Z"/>
        <path class="leaf-petiole" vector-effect="non-scaling-stroke" d="M36.5 1.8 C 39 0.7, 42 -0.1, 45 -0.8"/>
        <path class="leaf-midrib" vector-effect="non-scaling-stroke" d="M34 96 C 35 72, 36.5 42, 38 6"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M34.2 88.5 C 28.5 91, 23 93, 18.5 94.6"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M34.2 88.5 C 41 91, 45.5 92.8, 49 94.4"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M34.6 80.9 C 27 84, 19 86.5, 13.5 88.5"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M34.6 80.9 C 43 84.5, 50 87, 55 89.8"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M35.5 64.3 C 27 67, 17.5 70, 9.5 72.5"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M35.5 64.3 C 45 67.5, 53.5 71, 61 74.5"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M36.7 46.5 C 28 49, 18 51.5, 8.5 54"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M36.7 46.5 C 46 49.5, 55 52.5, 62.5 55.5"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M38 27.4 C 29 30, 19.5 32, 10.5 34"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M38 27.4 C 47 30, 55.5 32.5, 62.5 35"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M39.3 14.5 C 32 16.5, 24 18.5, 17 20.5"/>
        <path class="leaf-vein" vector-effect="non-scaling-stroke" d="M39.3 14.5 C 47.5 16.5, 54.5 18.5, 60 20.5"/>
      </svg>`;
  /* sun-shaped popup backdrop: a warm disc with twelve radiating rays;
     the disc hugs the content so its curved edge stays visible */
  const SUN_SHAPE_BG = `<svg class="sun-shape-bg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r="50" class="sun-disc" vector-effect="non-scaling-stroke"/>
        <path class="sun-rays" vector-effect="non-scaling-stroke" d="M102 50 L108 50 M95 76 L100.2 79 M76 95 L79 100.2 M50 102 L50 108 M5 76 L-0.2 79 M-2 50 L-8 50 M5 24 L-0.2 21 M24 5 L21 -0.2 M50 -2 L50 -8 M76 5 L79 -0.2 M95 24 L100.2 21"/>
      </svg>`;
  function renderLeafPopup() {
    let bd = document.getElementById('room-leaf-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'room-leaf-backdrop';
      bd.className = 'scn-modal-backdrop';
      /* append inside #view so the active scheme's tokens and the
         scheme-scoped scenery colors cascade into the popup */
      const host = document.getElementById('view') || document.body;
      host.appendChild(bd);
      bd.addEventListener('click', (e) => { if (e.target === bd) closeLeafPopup(); });
    }
    const isSun = leafCat === 'window';
    const isCustom = /^leaf-x/.test(leafCat);
    const cat = (isSun || isCustom) ? null : leafCatOf(leafCat);
    const ill = (isSun || isCustom) ? '' : leafIllSvg(cat.key);
    const heading = isSun ? 'Notice what helped in this situation/place/setting' : 'What would you like to make room for?';
    bd.innerHTML = `<div class="scn-modal leaf-modal${isSun ? ' sun-shape' : isCustom ? '' : ' leaf-shape'}" role="dialog" aria-modal="true" aria-labelledby="leaf-h" data-od-id="room-leaf-sheet">
      ${isSun ? SUN_SHAPE_BG : isCustom ? '' : LEAF_SHAPE_BG}
      <h1 class="prompt" id="leaf-h">${heading}</h1>
      <div class="leaf-paper${ill ? ' has-ill' : ''}">
        ${ill ? `<div class="leaf-ill" aria-hidden="true">${ill}</div>` : ''}
        <textarea id="leaf-text" rows="5" placeholder="A few words are enough.">${esc(leafTexts[leafCat] || '')}</textarea>
      </div>
      ${isSun || isCustom ? '' : `<div class="leaf-cards" role="group" aria-label="Choose the backdrop">
        ${LEAF_CATS.map(c => {
          const cardIll = leafIllSvg(c.key);
          return `<button class="leaf-card${c.key === leafCat ? ' sel' : ''}${cardIll ? '' : ' noill'}" type="button" data-ract="leaf-cat" data-leaf="${c.key}" aria-pressed="${c.key === leafCat}">
            ${cardIll ? `<span class="leaf-card-ill" aria-hidden="true">${cardIll}</span>` : ''}
            <span class="leaf-card-label">${esc(c.label)}</span></button>`;
        }).join('')}
      </div>`}
      <div class="btnrow">
        <button class="btn" type="button" data-ract="leaf-keep">Keep these words</button>
        <button class="note-act" type="button" data-ract="leaf-close">Not now</button>
      </div>
    </div>`;
    const t = bd.querySelector('#leaf-text');
    if (t) { t.focus(); try { t.setSelectionRange(t.value.length, t.value.length); } catch (e2) {} }
  }
  /* ---------- lamp room: the homepage lamp opens the SAME plant+lamp scene
     (plantHtml above) as a separate page, sharing the leaf/lamp state so the
     two pages mirror each other ---------- */
  function openLampRoom() {
    pDraft = Object.assign({ material: [], whatMatters: '', difficult: '', help: '', experiment: '', sticky: [] });
    renderLampRoom();
  }
  function renderLampRoom() {
    rsOnRender = () => renderLampRoom();
    $view().innerHTML = `<div class="card quiet" data-od-id="room-lamp-room">
      ${head('What would you like to have room for?', 'Making room — a separate place to begin', null)}
      ${plantHtml('lamp')}
      ${sceneHtml()}
    </div>`;
    wireScene();
    settle();
  }
  function practiceStepInner(step) {
    const d = pDraft;
    if (step === 1) return '';
    if (step === 2) return `
      <p class="support">Only if you want to say. Circumstances count — time, money, energy, other people’s expectations.</p>
      <textarea id="room-q2" rows="3" placeholder="What gets in the way here.">${esc(d.difficult)}</textarea>`;
    if (step === 3) return `
      <p class="support">What might help — one is enough:</p>
      <div class="room-chips">${HELP_KINDS.map(x => `<button class="fpill" type="button" data-ract="p-chip" data-v="${esc(x)}: ">${esc(x)}</button>`).join('')}</div>
      <textarea id="room-q3" rows="3" placeholder="A person, place, time, resource, changed expectation, or shared agreement.">${esc(d.help)}</textarea>`;
    return `
      <p class="support">Something small enough to actually happen. Nothing is also a complete answer.</p>
      <textarea id="room-q4" rows="3" placeholder="For example: invite a friend to draw together, with no expectation to talk.">${esc(d.experiment)}</textarea>`;
  }
  function practiceQuestion(step) {
    return ['', 'What would you like to have room for?', 'What makes that difficult here?', 'What might help?', 'What could you try, if anything?'][step];
  }
  function collectPractice(step) {
    if (step === 1) return; // step one's words come from "help me find language" or stay empty
    const map = { 2: 'difficult', 3: 'help', 4: 'experiment' };
    pDraft[map[step]] = val('room-q' + step);
  }
  function renderPractice(step) {
    pDraft.step = step;
    const stepTitle = step === 1 ? 'What is the Self that You Want to Grow?' : 'Make room for this';
    const growSubtext = 'Begin with the things you want more room for. Examples: Your creative interests, your friendships, your needs, your modes of self-expression, or something you cannot name yet.';
    $view().innerHTML = `<div class="card quiet" data-od-id="room-practice">
      ${step === 1 ? head(stepTitle, null, growSubtext, true, true) : head(stepTitle, 'A practice · step ' + step + ' of 4 — every part is optional', null, false, true)}
      ${materialLine(pDraft.material)}
      ${step > 1 ? `<h2 class="h2">${esc(practiceQuestion(step))}</h2>` : ''}
      ${practiceStepInner(step)}
      ${step === 1 ? plantHtml('practice') + sceneHtml(true) : ''}
      <div class="btnrow">
        <button class="btn" type="button" data-ract="p-next">${step < 4 ? 'Continue' : 'Look it over'}</button>
        <button class="note-act" type="button" data-ract="p-skip">Skip this</button>
        <button class="note-act" type="button" data-ract="p-stop">Stop and keep what I have</button>
      </div>
    </div>`;
    if (step === 1) { rsOnRender = () => renderPractice(1); wireScene(); wireGarden(); }
    settle();
  }
  function commitStickyEdit() {
    if (!rsEditId) return;
    const t = $view().querySelector('[data-rs-text]');
    const n = sceneStickies().find(s => s.id === rsEditId);
    if (n && t) n.text = t.value;
    rsEditId = null;
  }
  function rsClamp(note, stage) {
    const r = stage.getBoundingClientRect();
    const nEl = stage.querySelector(`.rs-note[data-rs-id="${note.id}"]`);
    const wPct = nEl ? (nEl.offsetWidth / r.width) * 100 : 16;
    const hPct = nEl ? (nEl.offsetHeight / r.height) * 100 : 30;
    note.x = Math.min(Math.max(note.x, 0), 100 - wPct);
    note.y = Math.min(Math.max(note.y, 0), 100 - hPct);
  }
  let rsWinWired = false;
  function wireScene() {
    const stage = $view().querySelector('.room-scene-stage');
    if (!stage) return;
    if (!rsWinWired) {
      rsWinWired = true;
      window.addEventListener('pointermove', (e) => {
        if (!rsDrag) return;
        const r = rsDrag.stage.getBoundingClientRect();
        if (!rsDrag.moved && Math.hypot(e.clientX - rsDrag.sx, e.clientY - rsDrag.sy) < 5) return;
        rsDrag.moved = true;
        rsDrag.note.x = ((e.clientX - rsDrag.ox - r.left) / r.width) * 100;
        rsDrag.note.y = ((e.clientY - rsDrag.oy - r.top) / r.height) * 100;
        rsClamp(rsDrag.note, rsDrag.stage);
        rsDrag.el.style.left = rsDrag.note.x + '%';
        rsDrag.el.style.top = rsDrag.note.y + '%';
      });
      window.addEventListener('pointerup', () => {
        if (!rsDrag) return;
        const d = rsDrag; rsDrag = null;
        d.el.classList.remove('dragging');
        if (!d.moved) {
          rsEditId = d.note.id;
          rsOnRender();
          const t = $view().querySelector('[data-rs-text]');
          if (t) t.focus();
        } else {
          rsOnRender();
        }
      });
    }
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-rs-text]')) return;
      if (rsEditId) { commitStickyEdit(); rsOnRender(); return; }
      const grab = e.target.closest('[data-rs-grab]');
      if (!grab) return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      let note, el;
      if (grab.getAttribute('data-rs-grab') === 'pile') {
        /* the new note spawns under the cursor, not at the pile */
        note = { id: uid('sticky'), x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, text: '', rot: Math.round(Math.random() * 8 - 4) };
        sceneStickies().push(note);
        const tmp = document.createElement('div');
        tmp.innerHTML = rsNoteHtml(note);
        el = tmp.firstChild;
        el.classList.add('dragging');
        stage.appendChild(el);
        rsClamp(note, stage);
        el.style.left = note.x + '%';
        el.style.top = note.y + '%';
      } else {
        note = sceneStickies().find(s => s.id === grab.getAttribute('data-rs-id'));
        if (!note) return;
        el = grab;
        el.classList.add('dragging');
      }
      rsDrag = {
        note, stage, el, moved: false,
        sx: e.clientX, sy: e.clientY,
        ox: e.clientX - r.left - (note.x / 100) * r.width,
        oy: e.clientY - r.top - (note.y / 100) * r.height
      };
    });
    stage.addEventListener('input', (e) => {
      const t = e.target.closest('[data-rs-text]');
      if (!t) return;
      const n = sceneStickies().find(s => s.id === t.closest('.rs-note').getAttribute('data-rs-id'));
      if (n) n.text = t.value;
    });
    stage.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t.matches && t.matches('[data-rs-text]')) {
        if (e.key === 'Escape') { commitStickyEdit(); rsOnRender(); }
        return;
      }
      const note = t.closest && t.closest('.rs-note[data-rs-grab]');
      if (!note || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      rsEditId = note.getAttribute('data-rs-id');
      rsOnRender();
      const ta = $view().querySelector('[data-rs-text]');
      if (ta) ta.focus();
    });
    stage.addEventListener('focusout', (e) => {
      if (!e.target.matches || !e.target.matches('[data-rs-text]')) return;
      setTimeout(() => {
        if (rsEditId && !$view().querySelector('[data-rs-text]')) { rsEditId = null; return; }
        if (rsEditId) { commitStickyEdit(); rsOnRender(); }
      }, 140);
    });
  }
  /* ---------- drag a leaf from a pile onto a potential leaf on the plant ----------
     One leaf at a time: pointer grabs a single pile leaf; while dragging a small
     ghost follows the cursor and the drop-zone under it lights up. Releasing over
     a potential leaf attaches it — that potential leaf disappears from the plant
     and the dragged leaf becomes an existing one. Releasing anywhere else simply
     returns the leaf to its pile. */
  let leafDrag = null;
  let gardenWired = false;
  function wireGarden() {
    if (gardenWired) return;
    gardenWired = true;
    const view = $view();
    const tip = document.createElement('div');
    tip.className = 'scn-tip gp-tip';
    document.body.appendChild(tip);
    const clearOver = () => { document.querySelectorAll('.leaf-drop.over').forEach(z => z.classList.remove('over')); };
    const clearDragging = () => { document.querySelectorAll('.pile-leaf.dragging').forEach(z => z.classList.remove('dragging')); };
    view.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') {
        const zone = e.target.closest && e.target.closest('.leaf-drop');
        if (zone) {
          tip.textContent = zone.getAttribute('data-tip') || '';
          tip.classList.add('on');
          const r = zone.getBoundingClientRect();
          tip.style.left = Math.min(r.left, window.innerWidth - tip.offsetWidth - 8) + 'px';
          tip.style.top = Math.min(r.bottom + 6, window.innerHeight - tip.offsetHeight - 6) + 'px';
          return;
        }
      }
      const pileLeaf = e.target.closest && e.target.closest('.pile-leaf');
      if (!pileLeaf) return;
      e.preventDefault();
      const pileEl = pileLeaf.closest('.leaf-pile');
      const pileId = pileEl && pileEl.getAttribute('data-pile');
      if (!pileId || (leafPiles[pileId] || 0) <= 0) return;
      pileLeaf.classList.add('dragging');
      const r = pileLeaf.getBoundingClientRect();
      const ghost = document.createElement('span');
      ghost.className = 'leaf-drag-ghost';
      ghost.innerHTML = PILE_LEAF_SVG;
      document.body.appendChild(ghost);
      leafDrag = {
        pileId, ghost,
        dx: e.clientX - (r.left + r.width / 2),
        dy: e.clientY - (r.top + r.height / 2),
        overKey: null
      };
      moveLeafGhost(e.clientX, e.clientY);
    });
    window.addEventListener('pointermove', (e) => moveLeafGhost(e.clientX, e.clientY));
    function moveLeafGhost(x, y) {
      if (!leafDrag) return;
      leafDrag.ghost.style.left = (x - leafDrag.dx) + 'px';
      leafDrag.ghost.style.top = (y - leafDrag.dy) + 'px';
      const el = document.elementFromPoint(x, y);
      const zone = el && el.closest ? el.closest('.leaf-drop') : null;
      const key = zone ? zone.getAttribute('data-leaf') : null;
      if (key !== leafDrag.overKey) {
        if (leafDrag.overKey) document.querySelectorAll('.leaf-drop[data-leaf="' + leafDrag.overKey + '"]').forEach(z => z.classList.remove('over'));
        leafDrag.overKey = key;
        if (key) document.querySelectorAll('.leaf-drop[data-leaf="' + key + '"]').forEach(z => z.classList.add('over'));
      }
    }
    window.addEventListener('pointerup', (e) => {
      tip.classList.remove('on');
      if (!leafDrag) return;
      const d = leafDrag; leafDrag = null;
      d.ghost.remove();
      clearOver(); clearDragging();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const zone = el && el.closest ? el.closest('.leaf-drop') : null;
      const key = zone && zone.getAttribute('data-leaf');
      if (key && !gardenFilled[key]) {
        gardenFilled[key] = true;
        if (leafPiles[d.pileId] > 0) leafPiles[d.pileId]--;
        renderPractice(1);
      }
    });
    window.addEventListener('pointercancel', () => {
      if (!leafDrag) return;
      leafDrag.ghost.remove();
      leafDrag = null;
      clearOver(); clearDragging(); tip.classList.remove('on');
    });
  }
  /* ---------- "help me find language": a pre-made options popup ---------- */
  let langCat = '';
  function openLang() { langCat = ''; renderLang(); }
  function closeLang() {
    langCat = '';
    const bd = document.getElementById('room-lang-backdrop');
    if (bd) bd.remove();
  }
  function renderLang() {
    let bd = document.getElementById('room-lang-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'room-lang-backdrop';
      bd.className = 'scn-modal-backdrop';
      document.body.appendChild(bd);
      bd.addEventListener('click', (e) => { if (e.target === bd) closeLang(); });
    }
    const cats = Object.keys(LANG_GROUPS);
    const items = langCat ? LANG_GROUPS[langCat] : [];
    bd.innerHTML = `<div class="scn-modal" role="dialog" aria-modal="true" aria-labelledby="room-lang-h" data-od-id="room-lang-sheet">
      <div class="node-title">help me find language</div>
      <h1 class="prompt" id="room-lang-h">Pick pre-made options</h1>
      <p class="support">Borrow a few words if they fit — picking one places them on a sticky note in the scene, to use like any other.</p>
      <label class="room-label" for="lang-cat">pick a category</label>
      <select id="lang-cat" data-lact="cat">
        <option value="">— choose —</option>
        ${cats.map(c => `<option value="${esc(c)}"${langCat === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}
      </select>
      <label class="room-label" for="lang-item">pick an item</label>
      <select id="lang-item" data-lact="item" ${langCat ? '' : 'disabled'}>
        <option value="">${langCat ? '— choose —' : 'pick a category first'}</option>
        ${items.map(i => `<option value="${esc(i)}"${pDraft && pDraft.whatMatters === i ? ' selected' : ''}>${esc(i)}</option>`).join('')}
      </select>
      <div class="btnrow"><button class="note-act" type="button" data-ract="lang-close">Not now</button></div>
    </div>`;
    const f = bd.querySelector('select[data-lact="cat"]');
    if (f) f.focus();
  }

  function savePracticeAsArrangement() {
    const d = pDraft;
    const a = {
      id: uid('arr'), kind: 'room', openEnded: !!d.openEnded,
      whatMatters: d.whatMatters, draws: d.draws || '', difficult: d.difficult, help: d.help, experiment: d.experiment,
      sticky: (d.sticky || []).filter(s => String(s.text || '').trim()).map(s => ({ x: s.x, y: s.y, text: s.text, rot: s.rot || 0 })),
      material: d.material, attachedNotes: [], reviews: [], versions: [],
      status: 'active', agreement: null, createdAt: today(), updatedAt: today()
    };
    putArrangement(a);
    pDraft = null;
    renderArrangement(a.id, { justSaved: true });
  }

  /* an open exploration — no difficulty named, no experiment, no outcome owed.
     The page is a field notebook opening onto a lightly sketched, unfinished
     landscape; the artwork is decorative SVG only (no image generation). */
  function openExplore() {
    pDraft = { material: [], whatMatters: '', draws: '', difficult: '', help: '', experiment: '', openEnded: true, exploreOnly: true };
    renderExplore();
  }
  const X_CLIP_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 7.5 V16 a4 4 0 0 0 8 0 V6.5 a2.8 2.8 0 0 0 -5.6 0 V15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const X_DECOR = `
    <svg class="x-decor x-horizon" viewBox="0 0 760 46" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 28 C 60 18, 130 36, 205 27 M228 29 C 300 20, 372 38, 448 28 M472 26 C 545 18, 620 34, 700 26 M718 27 C 736 24, 750 27, 760 25" fill="none" stroke="var(--x-sketch)" stroke-width="1.5" stroke-linecap="round" opacity="0.8" vector-effect="non-scaling-stroke"/>
      <path d="M40 38 C 120 32, 210 42, 300 36 M540 38 C 620 33, 690 40, 756 35" fill="none" stroke="var(--x-sketch)" stroke-width="1.3" stroke-linecap="round" opacity="0.6" vector-effect="non-scaling-stroke"/>
    </svg>
    <svg class="x-decor x-contours-l" viewBox="0 0 90 120" aria-hidden="true" focusable="false">
      <path d="M6 12 C 30 16, 52 10, 78 15 M2 34 C 28 40, 56 32, 84 37 M10 58 C 34 62, 58 56, 82 60 M20 82 C 40 86, 62 80, 80 84" fill="none" stroke="var(--x-sketch)" stroke-width="1.3" stroke-linecap="round" opacity="0.65"/>
    </svg>
    <svg class="x-decor x-contours-r" viewBox="0 0 90 120" aria-hidden="true" focusable="false">
      <path d="M8 16 C 34 10, 60 20, 86 13 M4 42 C 30 36, 58 46, 88 39 M14 70 C 38 64, 62 74, 84 67 M26 98 C 44 93, 64 101, 82 96" fill="none" stroke="var(--x-sketch)" stroke-width="1.3" stroke-linecap="round" opacity="0.65"/>
    </svg>
    <svg class="x-decor x-strokes" viewBox="0 0 220 110" aria-hidden="true" focusable="false">
      <path d="M18 18 l26 -4 M34 92 l20 6 M168 26 l22 8 M152 102 l18 -5" fill="none" stroke="var(--x-sketch)" stroke-width="1.4" stroke-linecap="round" opacity="0.65"/>
    </svg>
    <svg class="x-decor x-botanical" viewBox="0 0 120 150" aria-hidden="true" focusable="false">
      <path d="M60 146 C 58 112, 62 84, 58 52" fill="none" stroke="var(--x-sketch)" stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>
      <path d="M59 108 C 44 102, 36 90, 38 78 C 50 82, 58 94, 59 104 Z M59 88 C 72 82, 80 70, 79 58 C 67 62, 60 74, 59 84 Z M58 66 C 48 60, 42 50, 44 40 C 54 44, 59 54, 58 62 Z" fill="none" stroke="var(--x-sketch)" stroke-width="1.3" stroke-linejoin="round" opacity="0.7"/>
      <path d="M60 40 C 59 30, 61 22, 60 12" fill="none" stroke="var(--x-sketch)" stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>
    </svg>`;
  function xMaterialClip(material) {
    const rows = material.map(m => {
      const label = materialLabel(m);
      return `<li class="x-clip-item"><span class="x-clip-title">${esc(label)}</span></li>`;
    }).join('');
    return `<div class="x-clip">${X_CLIP_ICON}<ul class="x-clip-list">${rows}</ul></div>`;
  }
  function xKeptHtml(a) {
    const title = String(a.whatMatters || '').trim() || 'Your exploration';
    return `<div class="x-kept" role="status">
      <svg class="x-kept-art" viewBox="0 0 120 44" aria-hidden="true" focusable="false">
        <path d="M4 30 C 30 22, 52 34, 74 28 M86 28 C 96 25, 106 30, 116 27" fill="none" stroke="var(--x-sketch)" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
        <circle cx="86" cy="17" r="5.5" fill="none" stroke="var(--x-sketch)" stroke-width="1.3" opacity="0.8"/>
        <path d="M93 16 l14 -1" fill="none" stroke="var(--x-sketch)" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      </svg>
      <div><p class="x-kept-line">Kept. You can return whenever you like.</p>
      <p class="x-kept-title">${esc(title)}</p></div>
    </div>`;
  }
  function renderExplore() {
    const clip = pDraft.material && pDraft.material.length ? xMaterialClip(pDraft.material) : '';
    $view().innerHTML = `<div class="xpage" data-od-id="room-explore">
      ${X_DECOR}
      <div class="xpage-head"><div class="pcontrols"><button class="pctl" type="button" data-ract="home">Home</button></div></div>
      <div class="xpage-col">
        <header class="x-intro">
          <div class="x-eyebrow">An open exploration — nothing to solve, nothing to finish</div>
          <h1 class="prompt x-title" tabindex="-1">Keep <span class="x-underline">exploring<svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M2 6 C 22 3.5, 48 7.5, 70 5 C 88 3.2, 104 6.5, 118 4.5" fill="none" stroke="var(--x-sketch)" stroke-width="2" stroke-linecap="round" opacity="0.75" vector-effect="non-scaling-stroke"/></svg></span> something</h1>
          <p class="x-lede">Interests and questions count as much as needs: drawing, a hometown, what friendship means, a kind of beauty, feeling part of where you come from. It can stay open as long as you like.</p>
        </header>
        <section class="xnote xnote-main">
          <svg class="x-marker" viewBox="0 0 44 18" aria-hidden="true" focusable="false">
            <circle cx="10" cy="9" r="6" fill="none" stroke="var(--x-sketch)" stroke-width="1.3" opacity="0.8"/>
            <path d="M17 8 C 24 6.5, 32 9.5, 41 7.5" fill="none" stroke="var(--x-sketch)" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
          </svg>
          <label class="x-note-label" for="room-x1">What would you like to keep exploring?</label>
          <textarea id="room-x1" rows="5">${esc(pDraft.whatMatters)}</textarea>
        </section>
        <section class="xnote xnote-support">
          <svg class="x-link" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M34 2 C 12 8, 6 22, 10 38" fill="none" stroke="var(--x-sketch)" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/></svg>
          <label class="x-note-label" for="room-x2">What draws you to it? (optional)</label>
          <textarea id="room-x2" rows="3">${esc(pDraft.draws)}</textarea>
        </section>
        ${clip}
        <div class="x-actions">
          <button class="btn" type="button" data-ract="x-save">Keep this exploration</button>
          <button class="note-act" type="button" data-ract="home">Not now</button>
        </div>
      </div>
    </div>`;
    settle();
  }

  /* ============================================================
     2 · Terms of belonging + the proposal editor
     ============================================================ */
  let bDraft = null;
  const BELONG_WHERE = ['family', 'a friendship', 'a workplace', 'a group', 'somewhere else'];
  const STANCES = ['I stand behind this', 'This asks me to hide, defer, or erase something', 'Not sure'];

  function openBelonging() {
    bDraft = { where: '', terms: [], ifChanged: '', whoCarries: '', supportNeeded: '',
      proposal: { need: '', expressed: '', assuming: '', arrangement: '', work: '', revisit: '' } };
    renderBelonging(1);
  }
  function renderBelonging(step) {
    bDraft.step = step;
    let inner = '';
    if (step === 1) inner = `
      <h2 class="h2">Where is this about?</h2>
      <div class="room-chips">${BELONG_WHERE.map(x => `<button class="fpill" type="button" data-ract="b-where" data-v="${esc(x)}" aria-pressed="${bDraft.where === x}">${esc(x)}</button>`).join('')}</div>
      <textarea id="room-b1" rows="2" placeholder="In your own words, if you like.">${esc(bDraft.whereText || '')}</textarea>`;
    else if (step === 2) inner = `
      <h2 class="h2">What is expected of you there?</h2>
      <p class="support">Name one expectation at a time, and how it sits with you. Some expectations are fine — shared responsibilities you endorse belong here too.</p>
      <textarea id="room-b2" rows="2" placeholder="An expectation, plainly."></textarea>
      <div class="room-chips">${STANCES.map(s => `<button class="fpill" type="button" data-ract="b-stance" data-v="${esc(s)}" aria-pressed="${bDraft.stance === s}">${esc(s)}</button>`).join('')}</div>
      <div class="btnrow"><button class="btn2" type="button" data-ract="b-add-term">Add this expectation</button></div>
      ${bDraft.terms.length ? `<ul class="list">${bDraft.terms.map((t, i) => `<li><b>${esc(t.text)}</b><span class="sub">${esc(t.stance || 'unmarked')}</span>
        <div class="ghostrow"><button class="ghost" type="button" data-ract="b-del-term" data-id="${i}">Remove</button></div></li>`).join('')}</ul>` : ''}`;
    else if (step === 3) inner = `
      <h2 class="h2">What would changing an expectation involve?</h2>
      <p class="support">Privacy, delay, accommodation, departure, and doing nothing are all ordinary choices. This page only makes consequences visible.</p>
      <label class="room-label" for="room-b3a">If an expectation changed, what could happen?</label>
      <textarea id="room-b3a" rows="2">${esc(bDraft.ifChanged)}</textarea>
      <label class="room-label" for="room-b3b">Who would carry the cost?</label>
      <textarea id="room-b3b" rows="2">${esc(bDraft.whoCarries)}</textarea>
      <label class="room-label" for="room-b3c">What support might be needed?</label>
      <textarea id="room-b3c" rows="2">${esc(bDraft.supportNeeded)}</textarea>`;
    else inner = `
      <h2 class="h2">Would you like to draft a possible arrangement?</h2>
      <p class="support">A draft is private, and it is a proposal — it becomes an agreement only if others actually agree, and you record that.</p>
      <div class="btnrow">
        <button class="btn" type="button" data-ract="b-to-proposal">Draft a proposal</button>
        <button class="note-act" type="button" data-ract="b-save-plain">Stop here — keep what I have</button>
      </div>`;
    const steps = { 1: 'step 1 of 4', 2: 'step 2 of 4', 3: 'step 3 of 4', 4: 'step 4 of 4' };
    $view().innerHTML = `<div class="card quiet" data-od-id="room-belonging">
      ${head('Terms of belonging', 'A practice · ' + steps[step] + ' — every part is optional', null)}
      ${inner}
      ${step < 4 ? `<div class="btnrow">
        <button class="btn" type="button" data-ract="b-next">Continue</button>
        <button class="note-act" type="button" data-ract="b-skip">Skip this</button>
        <button class="note-act" type="button" data-ract="b-save-plain">Stop and keep what I have</button>
      </div>` : ''}
    </div>`;
    settle();
  }
  const PROPOSAL_FIELDS = [
    ['need', 'What I need or hope for'],
    ['expressed', 'What others have actually expressed'],
    ['assuming', 'What I am assuming or still need to ask'],
    ['arrangement', 'A possible arrangement'],
    ['work', 'Who would do the work'],
    ['revisit', 'How the arrangement could be revisited']
  ];
  function proposalFieldsHtml(p) {
    return PROPOSAL_FIELDS.map(([k, label]) => `
      <label class="room-label" for="room-pf-${k}">${esc(label)}</label>
      <textarea id="room-pf-${k}" data-rfield="${k}" rows="2">${esc(p[k] || '')}</textarea>`).join('');
  }
  function renderProposal(existing) {
    const p = existing ? (existing.proposal || {}) : bDraft.proposal;
    $view().innerHTML = `<div class="card quiet" data-od-id="room-proposal">
      ${head('A possible arrangement', existing ? 'Editing a kept proposal' : 'A private draft — a proposal, not yet an agreement',
        'Only “What others have actually expressed” is what they have said. Everything else is yours, and can be wrong — that is what the asking is for.')}
      ${proposalFieldsHtml(p)}
      <div class="btnrow">
        <button class="btn" type="button" data-ract="prop-save" ${existing ? `data-id="${esc(existing.id)}"` : ''}>${existing ? 'Save changes' : 'Keep this proposal'}</button>
        <button class="note-act" type="button" data-ract="${existing ? 'open-arrangement' : 'b-back'}" ${existing ? `data-id="${esc(existing.id)}"` : ''}>${existing ? 'Back without changes' : 'Back'}</button>
      </div>
    </div>`;
    settle();
  }
  function collectProposal(target) {
    PROPOSAL_FIELDS.forEach(([k]) => { target[k] = fieldVal(k); });
  }

  /* ============================================================
     6 · A way to contribute
     ============================================================ */
  let cDraft = null;
  const VISIBILITY = ['just me', 'one or two people', 'a small group', 'wider'];
  const FORMS = ['make something', 'research or gather', 'support one person', 'practical work', 'express dissent', 'something else'];

  function openContrib() {
    cDraft = { care: '', offer: '', visibility: '', forms: [], experiment: '' };
    renderContrib(1);
  }
  function renderContrib(step) {
    cDraft.step = step;
    let inner = '';
    if (step === 1) inner = `
      <h2 class="h2">What do you care about?</h2>
      <p class="support">A thing, a person, a place, an injustice, a joy — anything with weight for you.</p>
      <textarea id="room-c1" rows="3">${esc(cDraft.care)}</textarea>`;
    else if (step === 2) inner = `
      <h2 class="h2">What can you actually offer?</h2>
      <p class="support">Energy, skills, time, resources — as they are, not as they should be.</p>
      <textarea id="room-c2" rows="3">${esc(cDraft.offer)}</textarea>
      <p class="support">How visible would you want to be? Wider is not better; the right size is the one you can sustain.</p>
      <div class="room-chips">${VISIBILITY.map(v => `<button class="fpill" type="button" data-ract="c-vis" data-v="${esc(v)}" aria-pressed="${cDraft.visibility === v}">${esc(v)}</button>`).join('')}</div>`;
    else if (step === 3) inner = `
      <h2 class="h2">Forms it could take</h2>
      <p class="support">Choose any that fit. None of these is worth more than another.</p>
      <div class="room-chips">${FORMS.map(f => `<button class="fpill" type="button" data-ract="c-form" data-v="${esc(f)}" aria-pressed="${cDraft.forms.includes(f)}">${esc(f)}</button>`).join('')}</div>`;
    else inner = `
      <h2 class="h2">A private draft, or a small collective experiment?</h2>
      <p class="support">A draft stays here. A small experiment involves one or two people you trust. Public action is one possibility — never the requirement.</p>
      <textarea id="room-c4" rows="3" placeholder="What it could look like, at the size you chose.">${esc(cDraft.experiment)}</textarea>`;
    $view().innerHTML = `<div class="card quiet" data-od-id="room-contrib">
      ${head('A way to contribute', 'A practice · step ' + step + ' of 4 — every part is optional', null)}
      ${sDraft.key === 'connection' && sDraft.step === 1 ? '<div class="relationship-art">' + ['keep','gain','develop','repair'].map(k => '<figure><img src="assets/relationships-'+k+'.svg" alt=""><figcaption>'+k[0].toUpperCase()+k.slice(1)+'</figcaption></figure>').join('') + '</div>' : ''}${inner}
      <div class="btnrow">
        <button class="btn" type="button" data-ract="c-next">${step < 4 ? 'Continue' : 'Look it over'}</button>
        <button class="note-act" type="button" data-ract="c-skip">Skip this</button>
        <button class="note-act" type="button" data-ract="c-stop">Stop and keep what I have</button>
      </div>
    </div>`;
    settle();
  }

  /* ============================================================
     4 · Arrangements I'm keeping — home, detail, review, cue
     ============================================================ */
  let confirmRemoveArr = null;
  const KIND_LABEL = { room: 'making room', belonging: 'belonging', contribution: 'contribution',
    story: 'an inherited story', influence: 'an influence', connection: 'a connection', repair: 'repair' };
  const STATUS_LABEL = { active: 'Active', paused: 'Paused', archived: 'Archived' };

  function arrTitle(a) {
    const src = a.title || a.whatMatters || (a.proposal && (a.proposal.arrangement || a.proposal.need)) || a.care || a.where || '';
    const t = src.trim();
    return t ? (t.length > 48 ? t.slice(0, 48) + '…' : t) : (a.openEnded ? 'An open exploration' : 'Untitled arrangement');
  }
  function kindLabelOf(a) { return a.openEnded ? 'exploring' : (KIND_LABEL[a.kind] || 'arrangement'); }
  /* the Things I'm keeping list page is retired: kept things are reached
     from the flows that create them, and the homepage card is gone */

  function snapshotFields(a) {
    return { title: a.title, whatMatters: a.whatMatters, draws: a.draws, difficult: a.difficult, help: a.help, experiment: a.experiment,
      where: a.where, terms: a.terms, ifChanged: a.ifChanged, whoCarries: a.whoCarries, supportNeeded: a.supportNeeded,
      proposal: a.proposal, care: a.care, offer: a.offer, visibility: a.visibility, forms: a.forms,
      sections: a.sections };
  }
  /* earlier wording is shown before any restore is offered */
  function versionSummary(f) {
    const lines = [];
    const push = (label, v) => { if (v && String(v).trim()) lines.push(label + ': ' + String(v).trim()); };
    push('What matters', f.whatMatters); push('Experiment', f.experiment);
    push('What you care about', f.care); push('Where', f.where);
    if (f.proposal) push('Proposal', f.proposal.arrangement || f.proposal.need);
    (f.sections || []).forEach(s => push(s.label, s.value));
    return lines.slice(0, 4).map(l => `<div class="sub">${esc(l.length > 90 ? l.slice(0, 90) + '…' : l)}</div>`).join('');
  }

  /* gathered associations: conditions, practices, outside resources */
  function gatheredHtml(a) {
    const conds = (a.conditionIds || []).map(cid => conditions().find(c => c.id === cid)).filter(Boolean);
    const pracs = a.practiceRefs || [];
    const res = a.resources || [];
    if (!conds.length && !pracs.length && !res.length) return '';
    return `<div class="room-viewfield" data-od-id="arr-gathered"><span class="room-label">Gathered around this</span><ul class="list">
      ${conds.map(c => `<li><b>${esc(c.text)}</b><span class="sub">from What helps</span>
        <div class="ghostrow"><button class="ghost" type="button" data-ract="g-del" data-id="${esc(a.id)}" data-v="condition:${esc(c.id)}">Remove</button></div></li>`).join('')}
      ${pracs.map((p, i) => `<li><b>${esc(p.label)}</b><span class="sub">a practice</span>
        <div class="ghostrow"><button class="ghost" type="button" data-ract="g-open-practice" data-v="${esc(p.ract)}">Open</button><button class="ghost" type="button" data-ract="g-del" data-id="${esc(a.id)}" data-v="practice:${i}">Remove</button></div></li>`).join('')}
      ${res.map(r => `<li><b>${esc(r.label)}</b><span class="sub">${r.url ? esc(r.url) : 'a title'}</span>
        <div class="ghostrow">${r.url ? `<button class="ghost" type="button" data-ract="g-open-url" data-v="${esc(r.url)}">Open link</button>` : ''}<button class="ghost" type="button" data-ract="g-del" data-id="${esc(a.id)}" data-v="resource:${esc(r.id)}">Remove</button></div></li>`).join('')}
    </ul></div>`;
  }
  /* pieces of practices kept with this arrangement */
  function piecesHtml(a) {
    if (!(a.pieces || []).length) return '';
    return `<div class="room-viewfield"><span class="room-label">Kept with this</span><ul class="list">${a.pieces.map((p, i) => `<li><b>${esc(p.practiceTitle)}</b><span class="sub">${esc(day(p.at))}</span>
      ${(p.sections || []).filter(s => s.value && s.value.trim()).map(s => `<div class="sub">${esc(s.label)}: ${esc(s.value)}</div>`).join('')}
      <div class="ghostrow"><button class="ghost" type="button" data-ract="piece-del" data-id="${esc(a.id)}" data-v="${i}">Remove</button></div></li>`).join('')}</ul></div>`;
  }
  function renderArrangement(id, opts) {
    const a = getArrangement(id);
    if (!a) return goHome();
    opts = opts || {};
    const editing = !!opts.editing;
    const legacyNoteCount = (a.attachedNotes || []).length;
    const ro = (v) => v && String(v).trim() ? esc(v) : '<span class="muted">—</span>';
    const viewField = (label, v) => `<div class="room-viewfield"><span class="room-label">${esc(label)}</span><p>${ro(v)}</p></div>`;
    let body = '';
    if (editing) {
      body = `
        ${a.kind === 'room' ? `
        <label class="room-label" for="room-e1">${a.openEnded ? 'What you’re keeping open' : 'What matters'}</label><textarea id="room-e1" data-rfield="whatMatters" rows="2">${esc(a.whatMatters)}</textarea>
        ${a.openEnded ? `<label class="room-label" for="room-e0">What draws you to it</label><textarea id="room-e0" data-rfield="draws" rows="2">${esc(a.draws || '')}</textarea>` : `
        <label class="room-label" for="room-e2">What makes it difficult</label><textarea id="room-e2" data-rfield="difficult" rows="2">${esc(a.difficult)}</textarea>
        <label class="room-label" for="room-e3">What might support it</label><textarea id="room-e3" data-rfield="help" rows="2">${esc(a.help)}</textarea>
        <label class="room-label" for="room-e4">An experiment, if any</label><textarea id="room-e4" data-rfield="experiment" rows="2">${esc(a.experiment)}</textarea>`}` : ''}
        ${(a.sections || []).length ? (a.sections || []).map((s, i) => `<label class="room-label" for="room-es-${i}">${esc(s.label)}</label><textarea id="room-es-${i}" data-rfield="section:${i}" rows="2">${esc(s.value)}</textarea>`).join('') : ''}
        ${a.kind === 'belonging' ? proposalFieldsHtml(a.proposal || {}) : ''}
        ${a.kind === 'contribution' ? `
        <label class="room-label" for="room-e5">What you care about</label><textarea id="room-e5" data-rfield="care" rows="2">${esc(a.care)}</textarea>
        <label class="room-label" for="room-e6">What you can offer</label><textarea id="room-e6" data-rfield="offer" rows="2">${esc(a.offer)}</textarea>
        <label class="room-label" for="room-e7">A draft or small experiment</label><textarea id="room-e7" data-rfield="experiment" rows="2">${esc(a.experiment)}</textarea>` : ''}
        <div class="btnrow">
          <button class="btn" type="button" data-ract="a-save-edit" data-id="${esc(a.id)}">Save changes</button>
          <button class="note-act" type="button" data-ract="open-arrangement" data-id="${esc(a.id)}">Back without changes</button>
        </div>`;
    } else {
      body = `
        ${opts.justSaved ? (a.openEnded ? xKeptHtml(a) : '<p class="note-hint">Kept. Nothing is expected of it — it can stay exactly like this.</p>') : ''}
        <p class="note-hint"><span class="room-status room-status-${esc(a.status)}">${esc(STATUS_LABEL[a.status])}</span>
        ${a.agreement === 'proposal' ? ' · <b>Proposal — not yet an agreement.</b> It becomes one only if you record that others agreed.'
        : a.agreement === 'agreement' ? ' · <b>Recorded as agreed</b> ' + esc(day(a.agreedAt)) + ' — this label is yours to change.' : ''}</p>
        ${materialLine(a.material)}
        ${a.kind === 'room' ? viewField(a.openEnded ? 'What you’re keeping open' : 'What matters', a.whatMatters) + (a.draws ? viewField('What draws you to it', a.draws) : '') + (a.openEnded ? '' : viewField('What makes it difficult', a.difficult) + viewField('What might support it', a.help) + viewField('An experiment', a.experiment)) : ''}
        ${(a.sticky || []).length ? `<div class="room-viewfield"><span class="room-label">Sticky notes from the scene</span><div class="rs-saved">${a.sticky.map(s => `<span class="rs-mini" style="--rot:${esc(s.rot || 0)}deg">${esc(s.text)}</span>`).join('')}</div></div>` : ''}
        ${(a.sections || []).length ? (a.sections || []).map(s => viewField(s.label, s.value)).join('') : ''}
        ${a.kind === 'belonging' ? (a.terms && a.terms.length ? `<div class="room-viewfield"><span class="room-label">Expectations named</span><ul class="list">${a.terms.map(t => `<li><b>${esc(t.text)}</b><span class="sub">${esc(t.stance || 'unmarked')}</span></li>`).join('')}</ul></div>` : '')
          + viewField('If an expectation changed', a.ifChanged) + viewField('Who would carry the cost', a.whoCarries) + viewField('Support that might be needed', a.supportNeeded)
          + (a.proposal ? PROPOSAL_FIELDS.map(([k, l]) => viewField(l, a.proposal[k])).join('') : '') : ''}
        ${a.kind === 'contribution' ? viewField('What you care about', a.care) + viewField('What you can offer', a.offer) + viewField('Preferred visibility', a.visibility) + viewField('Forms', (a.forms || []).join(', ')) + viewField('A draft or small experiment', a.experiment) : ''}
        ${legacyNoteCount ? `<div class="room-viewfield"><span class="room-label">Notes kept with this</span><p class="muted">${legacyNoteCount} note${legacyNoteCount > 1 ? 's were' : ' was'} kept with this arrangement before the notebook was removed.</p></div>` : ''}
        ${gatheredHtml(a)}
        ${piecesHtml(a)}
        ${(a.returns || []).length ? `<div class="room-viewfield"><span class="room-label">Times you’ve returned</span><ul class="list">${a.returns.map(r => `<li><b>${esc(r.marker || 'A return')}</b><span class="sub">${esc(day(r.at))}${r.stillMatters ? ' · still matters: ' + esc(r.stillMatters) : ''}${r.feelsDifferent ? ' · different: ' + esc(r.feelsDifferent) : ''}${r.add ? ' · added: ' + esc(r.add) : ''}</span></li>`).join('')}</ul></div>` : ''}
        ${(a.reviews || []).length ? `<div class="room-viewfield"><span class="room-label">How it went</span><ul class="list">${a.reviews.map(r => `<li><b>${esc(REVIEW_LABEL[r.madeRoom] || r.madeRoom)}</b><span class="sub">${esc(day(r.at))}${r.helped ? ' · helped: ' + esc(r.helped) : ''}${r.costly ? ' · costly: ' + esc(r.costly) : ''}${r.change ? ' · might change: ' + esc(r.change) : ''}</span></li>`).join('')}</ul></div>` : ''}
        ${(a.versions || []).length ? `<div class="room-viewfield"><span class="room-label">Earlier wording</span><ul class="list">${a.versions.map((v, i) => `<li><span class="sub">Version from ${esc(day(v.at))}</span>
          ${versionSummary(v.fields)}
          <div class="ghostrow"><button class="ghost" type="button" data-ract="a-restore" data-id="${esc(a.id)}" data-v="${i}">Bring this version back</button></div></li>`).join('')}</ul></div>` : ''}
        <div class="btnrow">
          <button class="btn" type="button" data-ract="a-edit" data-id="${esc(a.id)}">Change something</button>
          <button class="note-sharebtn" type="button" data-ract="a-share" data-id="${esc(a.id)}">Share…</button>
          <button class="note-act" type="button" data-ract="a-review" data-id="${esc(a.id)}">How did it go?</button>
          <button class="note-act" type="button" data-ract="a-return" data-id="${esc(a.id)}">Return to this</button>
        </div>
        <div class="btnrow">
          <button class="note-act" type="button" data-ract="a-gather" data-id="${esc(a.id)}">Add to this</button>
          ${a.agreement === 'proposal' ? `<button class="note-act" type="button" data-ract="a-agreed" data-id="${esc(a.id)}">Record that others agreed</button>` : ''}
          ${a.agreement === 'agreement' ? `<button class="note-act" type="button" data-ract="a-unagree" data-id="${esc(a.id)}">Take back the “agreed” label</button>` : ''}
        </div>
        <div class="btnrow">
          ${a.status !== 'paused' ? `<button class="note-act" type="button" data-ract="a-pause" data-id="${esc(a.id)}">Pause</button>` : `<button class="note-act" type="button" data-ract="a-resume" data-id="${esc(a.id)}">Resume</button>`}
          ${a.status !== 'archived' ? `<button class="note-act" type="button" data-ract="a-archive" data-id="${esc(a.id)}">Archive</button>` : ''}
          <button class="note-act" type="button" data-ract="a-remove" data-id="${esc(a.id)}">Remove</button>
        </div>
        ${confirmRemoveArr === a.id ? `<div class="note-confirm" role="alert">
          <span>Remove this arrangement? Its earlier versions and reviews go with it. This can't be undone.</span>
          <button class="note-act" type="button" data-ract="a-remove-yes" data-id="${esc(a.id)}"><b>Yes, remove</b></button>
          <button class="note-act" type="button" data-ract="a-remove-no" data-id="${esc(a.id)}">Keep it</button>
        </div>` : ''}`;
    }
    $view().innerHTML = `<div class="card quiet" data-od-id="room-arrangement">
      <div class="pcontrols"><button class="pctl" type="button" data-ract="home">Home</button></div>
      <div class="node-title">${esc(KIND_LABEL[a.kind] || 'Arrangement')} · stored on this device</div>
      <h1 class="prompt" tabindex="-1">${esc(arrTitle(a))}</h1>
      ${body}
    </div>`;
    settle();
  }

  /* review: after trying something */
  const REVIEW_LABEL = { yes: 'It made room', somewhat: 'Somewhat', 'not-really': 'Not really', 'did-not-fit': 'It didn’t fit' };
  let rDraft = null;
  function renderReview(id) {
    const a = getArrangement(id);
    if (!a) return goHome();
    rDraft = { id, madeRoom: '', helped: '', costly: '', change: '' };
    $view().innerHTML = `<div class="card quiet" data-od-id="room-review">
      ${head('How did it go?', 'About: ' + arrTitle(a), 'Brief is fine. Optional is fine. There is no streak to protect.')}
      <p class="support">Did this make room for what mattered?</p>
      <div class="room-chips">${Object.keys(REVIEW_LABEL).map(k => `<button class="fpill" type="button" data-ract="r-outcome" data-v="${k}">${esc(REVIEW_LABEL[k])}</button>`).join('')}</div>
      <label class="room-label" for="room-r1">What helped?</label><textarea id="room-r1" rows="2"></textarea>
      <label class="room-label" for="room-r2">What was costly or unavailable?</label><textarea id="room-r2" rows="2"></textarea>
      <label class="room-label" for="room-r3">What might change?</label><textarea id="room-r3" rows="2"></textarea>
      <div class="btnrow">
        <button class="btn" type="button" data-ract="r-save" data-id="${esc(id)}">Keep this</button>
        <button class="note-act" type="button" data-ract="open-arrangement" data-id="${esc(id)}">Not now</button>
      </div>
    </div>`;
    settle();
  }
  function renderReviewAfter(id, outcome) {
    const a = getArrangement(id);
    if (!a) return goHome();
    const notFit = outcome === 'did-not-fit';
    $view().innerHTML = `<div class="card quiet" data-od-id="room-review-after">
      ${head(notFit ? 'Kept. It didn’t fit — that’s a finding.' : 'Kept.', null,
        notFit ? 'An experiment that doesn’t fit is information, not failure. You can pause it, archive it, change it, or leave it exactly as it is.'
               : 'Noted with the arrangement. Nothing else is expected.')}
      <div class="btnrow">
        ${notFit ? `<button class="btn2" type="button" data-ract="a-pause" data-id="${esc(id)}">Pause it</button>
        <button class="btn2" type="button" data-ract="a-archive" data-id="${esc(id)}">Archive it</button>
        <button class="btn2" type="button" data-ract="a-edit" data-id="${esc(id)}">Change something</button>` : ''}
        <button class="note-act" type="button" data-ract="open-arrangement" data-id="${esc(id)}">Back to the arrangement</button>
      </div>
    </div>`;
    settle();
  }

  /* return to this — no experiment assumed */
  let retDraft = null;
  function renderReturn(id) {
    const a = getArrangement(id);
    if (!a) return goHome();
    retDraft = { id, marker: '' };
    const mats = [];
    if (a.whatMatters) mats.push(a.whatMatters);
    if (a.draws) mats.push(a.draws);
    (a.sections || []).forEach(s => { if (s.value && s.value.trim()) mats.push(s.label + ': ' + s.value); });
    const noteCount = (a.attachedNotes || []).length;
    $view().innerHTML = `<div class="card quiet" data-od-id="room-return">
      ${head('Return to this', arrTitle(a), 'No experiment is assumed. You can simply be back here, with what you kept.')}
      <div class="room-viewfield"><span class="room-label">What you kept</span>
        ${mats.length ? mats.map(m => `<p>${esc(m)}</p>`).join('') : '<p class="muted">Just the intention to keep this.</p>'}
        ${noteCount ? `<p class="sub">${noteCount} note${noteCount > 1 ? 's' : ''} kept with this</p>` : ''}
      </div>
      <p class="support">If you like, in a word or two — or none:</p>
      <div class="room-chips">${['I haven’t tried anything', 'I’m not sure', 'Still matters'].map(k => `<button class="fpill" type="button" data-ract="ret-chip" data-v="${esc(k)}" aria-pressed="false">${esc(k)}</button>`).join('')}</div>
      <label class="room-label" for="room-ret1">What still matters?</label><textarea id="room-ret1" rows="2"></textarea>
      <label class="room-label" for="room-ret2">What feels different?</label><textarea id="room-ret2" rows="2"></textarea>
      <label class="room-label" for="room-ret3">Anything you want to add?</label><textarea id="room-ret3" rows="2"></textarea>
      <div class="btnrow">
        <button class="btn" type="button" data-ract="ret-save" data-id="${esc(id)}">Keep this return</button>
        <button class="note-act" type="button" data-ract="open-arrangement" data-id="${esc(id)}">Leave it alone for now</button>
      </div>
    </div>`;
    settle();
  }

  /* gather: add conditions, practices, or outside resources to an arrangement */
  const GATHER_PRACTICES = [
    ['open-practice', 'Make room for this'], ['open-explore', 'Keep exploring something'],
    ['open-belonging', 'Terms of belonging'], ['open-contrib', 'A way to contribute'],
    ['open-story', 'An inherited story'], ['open-influence', 'An influence'],
    ['open-connection', 'Reciprocal connection'], ['open-repair', 'Relational repair']
  ];
  function openPracticeByRact(ract) {
    const openers = {
      'open-practice': () => openPractice(), 'open-explore': () => openExplore(),
      'open-belonging': () => openBelonging(), 'open-contrib': () => openContrib(),
      'open-story': () => openSmall('story'), 'open-influence': () => openSmall('influence'),
      'open-connection': () => openSmall('connection'), 'open-repair': () => openSmall('repair')
    };
    if (openers[ract]) openers[ract]();
  }
  function renderGather(id) {
    const a = getArrangement(id);
    if (!a) return goHome();
    $view().innerHTML = `<div class="card quiet" data-od-id="room-gather">
      ${head('Add to this', arrTitle(a), 'One thing is enough — an exploration stays useful with a single item. Nothing is required.')}
      <div class="options">
        <button class="opt" type="button" data-ract="g-condition" data-id="${esc(id)}"><b>Something from What helps</b></button>
        <button class="opt" type="button" data-ract="g-practice" data-id="${esc(id)}"><b>A practice</b></button>
        <button class="opt" type="button" data-ract="g-resource" data-id="${esc(id)}"><b>A link or a title</b><br><span class="muted small">a book, an essay, a song, a place</span></button>
      </div>
      <div class="btnrow"><button class="note-act" type="button" data-ract="open-arrangement" data-id="${esc(id)}">Back</button></div>
    </div>`;
    settle();
  }
  function renderGatherConditions(id) {
    const a = getArrangement(id);
    if (!a) return goHome();
    const list = conditions();
    $view().innerHTML = `<div class="card quiet" data-od-id="room-gather-c">
      ${head('Something from What helps', null, list.length ? 'Choose one to keep with “' + arrTitle(a) + '”. The original stays in What helps too.' : '')}
      ${list.length ? `<ul class="list">${list.map(c => `<li><button class="note-open" type="button" data-ract="g-add-condition" data-id="${esc(c.id)}" data-v="${esc(id)}"><b>${esc(c.text)}</b><span class="sub">${esc(c.kind || 'something')}</span></button></li>`).join('')}</ul>`
        : '<p class="muted">Nothing in What helps yet.</p>'}
      <div class="btnrow"><button class="note-act" type="button" data-ract="a-gather" data-id="${esc(id)}">Back</button></div>
    </div>`;
    settle();
  }
  function renderGatherPractices(id) {
    $view().innerHTML = `<div class="card quiet" data-od-id="room-gather-p">
      ${head('A practice', null, 'Keep a pointer to a practice alongside this. Opening it later starts fresh — nothing runs on its own.')}
      <div class="options">${GATHER_PRACTICES.map(([ract, label]) => `<button class="opt" type="button" data-ract="g-add-practice" data-v="${esc(ract)}" data-id="${esc(id)}"><b>${esc(label)}</b></button>`).join('')}</div>
      <div class="btnrow"><button class="note-act" type="button" data-ract="a-gather" data-id="${esc(id)}">Back</button></div>
    </div>`;
    settle();
  }
  function renderGatherResource(id) {
    $view().innerHTML = `<div class="card quiet" data-od-id="room-gather-r">
      ${head('A link or a title', null, 'A book, an essay, a song, a place — kept as a pointer, nothing more.')}
      <label class="room-label" for="room-res1">What is it?</label>
      <textarea id="room-res1" rows="2" placeholder="For example: The God of Small Things — the pickle chapter"></textarea>
      <label class="room-label" for="room-res2">A link, if there is one (optional)</label>
      <textarea id="room-res2" rows="1" placeholder="https://…"></textarea>
      <div class="btnrow">
        <button class="btn" type="button" data-ract="g-save-resource" data-id="${esc(id)}">Keep it with this</button>
        <button class="note-act" type="button" data-ract="a-gather" data-id="${esc(id)}">Back</button>
      </div>
    </div>`;
    settle();
  }

  /* ---------- four small practices (keep / change / release / undecided grammar) ---------- */
  const SMALL_PRACTICES = {
    story: { title: 'An inherited story', kicker: 'A practice · keep, change, release, or leave undecided',
      q1: 'What is the story?', help1: 'Something handed to you — by family, culture, a hometown, a time. It might be about success, feelings, money, duty, or who you were told you are.',
      ex1: ['A family saying', 'What success was supposed to look like', 'How feelings were handled', 'Who I was told I am'],
      fields: [['keep', 'What I want to keep from it'], ['change', 'What I want to change'], ['release', 'What I want to release'], ['undecided', 'What I’m leaving undecided — that’s allowed']] },
    influence: { title: 'An influence', kicker: 'A practice · what it opens, what it pressures, what place it gets',
      q1: 'What or who is influencing you?', help1: 'A book, a writer, a musician, a place, someone you watch from afar.',
      ex1: ['A book or writer', 'A musician', 'A place', 'Someone I watch from afar'],
      fields: [['opens', 'What it opens up for me'], ['pressures', 'What pressures it introduces'], ['place', 'What place I want it to have']] },
    connection: { title: 'Relationships My Self Wants to Keep, Gain, Develop, or Repair', kicker: 'A practice · sharing, understanding, privacy',
      q1: 'Who is this about?', help1: 'A name, an initial, a role — or no one named at all.',
      ex1: [],
      fields: [['share', 'What I might share'], ['understand', 'What I want to understand about them'], ['private', 'What I want to keep private — and that’s fine']],
      extra: { title: 'Relational Repair', q1: 'What sits between you?', help1: 'As much or as little as you like. Both people’s needs belong in view, including yours.',
        fields: [['acknowledge', 'What I want to acknowledge — the impact, plainly'], ['clarify', 'What I want to clarify — a misunderstanding'], ['propose', 'A change I could propose'], ['both', 'What each of us needs, as far as I can tell']] } },
    repair: { title: 'Relational repair', kicker: 'A practice · impact, misunderstanding, change',
      q1: 'What sits between you?', help1: 'As much or as little as you like. Both people’s needs belong in view, including yours.',
      ex1: [],
      fields: [['acknowledge', 'What I want to acknowledge — the impact, plainly'], ['clarify', 'What I want to clarify — a misunderstanding'], ['propose', 'A change I could propose'], ['both', 'What each of us needs, as far as I can tell']] }
  };
  let sDraft = null;
  function openSmall(key) {
    sDraft = { key, q1: '', extraQ1: '', fields: {}, step: 1 };
    renderSmall();
  }
  function collectSmall() {
    if (sDraft.step === 1) { sDraft.q1 = val('room-s1'); return; }
    const cfg = SMALL_PRACTICES[sDraft.key];
    cfg.fields.forEach(([k]) => { sDraft.fields[k] = fieldVal(k); });
    if (cfg.extra) {
      sDraft.extraQ1 = val('room-s-extra-q1');
      cfg.extra.fields.forEach(([k]) => { sDraft.fields[k] = fieldVal(k); });
    }
  }
  function smallSections() {
    const cfg = SMALL_PRACTICES[sDraft.key];
    const secs = [];
    if (sDraft.q1) secs.push({ label: cfg.q1, value: sDraft.q1 });
    cfg.fields.forEach(([k, label]) => { if ((sDraft.fields[k] || '').trim()) secs.push({ label, value: sDraft.fields[k].trim() }); });
    if (cfg.extra) {
      if (sDraft.extraQ1) secs.push({ label: cfg.extra.title + ' · ' + cfg.extra.q1, value: sDraft.extraQ1 });
      cfg.extra.fields.forEach(([k, label]) => { if ((sDraft.fields[k] || '').trim()) secs.push({ label: cfg.extra.title + ' · ' + label, value: sDraft.fields[k].trim() }); });
    }
    return secs;
  }
  function renderSmall() {
    const cfg = SMALL_PRACTICES[sDraft.key];
    const inner = sDraft.step === 1 ? `
      <h2 class="h2">${esc(cfg.q1)}</h2>
      <p class="support">${esc(cfg.help1)}</p>
      ${cfg.ex1.length ? `<div class="room-chips">${cfg.ex1.map(x => `<button class="fpill" type="button" data-ract="s-chip" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
      <textarea id="room-s1" rows="3">${esc(sDraft.q1)}</textarea>`
    : `
      <h2 class="h2">Only what you want to say</h2>
      <p class="support">Every field is optional. Undecided is a legitimate place to leave something.</p>
      ${cfg.fields.map(([k, label]) => `<label class="room-label" for="room-sf-${k}">${esc(label)}</label><textarea id="room-sf-${k}" data-rfield="${k}" rows="2">${esc(sDraft.fields[k] || '')}</textarea>`).join('')}
      ${cfg.extra ? `<h2 class="h2 room-section-h">${esc(cfg.extra.title)}</h2>
      <label class="room-label" for="room-s-extra-q1">${esc(cfg.extra.q1)}</label>
      <textarea id="room-s-extra-q1" rows="2">${esc(sDraft.extraQ1 || '')}</textarea>
      <p class="support">${esc(cfg.extra.help1)}</p>
      ${cfg.extra.fields.map(([k, label]) => `<label class="room-label" for="room-sf-${k}">${esc(label)}</label><textarea id="room-sf-${k}" data-rfield="${k}" rows="2">${esc(sDraft.fields[k] || '')}</textarea>`).join('')}` : ''}`;
    $view().innerHTML = `<div class="card quiet" data-od-id="room-small">
      ${head(cfg.title, cfg.kicker + ' — step ' + sDraft.step + ' of 2', null)}
      ${sDraft.key === 'connection' && sDraft.step === 1 ? '<div class="relationship-art">' + ['keep','gain','develop','repair'].map(k => '<figure><img src="assets/relationships-'+k+'.svg" alt=""><figcaption>'+k[0].toUpperCase()+k.slice(1)+'</figcaption></figure>').join('') + '</div>' : ''}${inner}
      <div class="btnrow">
        <button class="btn" type="button" data-ract="s-next">${sDraft.step === 1 ? 'Continue' : 'Look it over'}</button>
        ${sDraft.step === 1 ? '<button class="note-act" type="button" data-ract="s-next">Skip to the sorting</button>' : ''}
        <button class="note-act" type="button" data-ract="s-stop">Stop and keep what I have</button>
      </div>
    </div>`;
    settle();
  }
  function renderSmallKeep() {
    const others = arrangements().filter(a => a.status !== 'archived');
    $view().innerHTML = `<div class="card quiet" data-od-id="room-small-keep">
      ${head('Where should this live?', null, 'On its own, or with something you’re already keeping. Either is fine — it can be moved apart later by keeping a new version.')}
      <div class="btnrow"><button class="btn" type="button" data-ract="s-keep-own">Keep it on its own</button></div>
      ${others.length ? `<h2 class="h3">Or keep it with…</h2><ul class="list">${others.map(a => `<li><button class="note-open" type="button" data-ract="s-keep-with" data-id="${esc(a.id)}"><b>${esc(arrTitle(a))}</b><span class="sub">${esc(kindLabelOf(a))}</span></button></li>`).join('')}</ul>` : ''}
      <div class="btnrow"><button class="note-act" type="button" data-ract="s-back">Back</button></div>
    </div>`;
    settle();
  }
  function saveSmallOwn() {
    const cfg = SMALL_PRACTICES[sDraft.key];
    const secs = smallSections();
    const a = {
      id: uid('arr'), kind: sDraft.key,
      title: secs.length ? secs[0].value : '',
      sections: secs,
      material: [], attachedNotes: [], reviews: [], versions: [],
      status: 'active', agreement: null, createdAt: today(), updatedAt: today()
    };
    putArrangement(a);
    sDraft = null;
    renderArrangement(a.id, { justSaved: true });
  }

  /* ---------- quiet share for an arrangement (text only) ---------- */
  let shareArr = null, sharePhase = null;
  function arrangementText(a) {
    const lines = [];
    if (a.agreement === 'proposal') lines.push('A proposal — not yet an agreement.');
    if (a.whatMatters) lines.push('What matters: ' + a.whatMatters);
    if (a.help) lines.push('What might support it: ' + a.help);
    if (a.experiment) lines.push('Something to try: ' + a.experiment);
    if (a.proposal) PROPOSAL_FIELDS.forEach(([k, l]) => { if (a.proposal[k]) lines.push(l + ': ' + a.proposal[k]); });
    if (a.care) lines.push('What I care about: ' + a.care);
    return lines.join('\n');
  }
  function openArrShare(id) {
    shareArr = getArrangement(id);
    if (!shareArr) return;
    sharePhase = 'ready';
    renderArrShare();
  }
  function closeShare() {
    shareArr = null; sharePhase = null;
    const bd = document.getElementById('room-share-backdrop');
    if (bd) bd.remove();
  }
  function renderArrShare() {
    let bd = document.getElementById('room-share-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'room-share-backdrop';
      bd.className = 'scn-modal-backdrop';
      document.body.appendChild(bd);
      bd.addEventListener('click', (e) => { if (e.target === bd) closeShare(); });
    }
    const text = arrangementText(shareArr);
    let body = '';
    if (sharePhase === 'sent') body = `<p class="support">Sent as a copy. What’s kept here is unchanged.</p>
      <div class="btnrow"><button class="btn2" type="button" data-ract="share-close">Close</button></div>`;
    else if (sharePhase === 'copied') body = `<p class="support">Copied — you can paste it anywhere, in your own way.</p>
      <div class="btnrow"><button class="btn2" type="button" data-ract="share-close">Close</button></div>`;
    else body = `<div class="note-share-summary" role="note">
        <div class="note-kind" style="margin-bottom:4px">Exactly what will be sent</div>
        ${arrangementText(shareArr).split('\n').map(l => `<div class="sline">${esc(l)}</div>`).join('')}
      </div>
      <p class="support">Plain words, as they are — no framing needed. Nothing is posted anywhere; one person receives it.</p>
      <div class="btnrow">
        <button class="btn" type="button" data-ract="share-send">Choose how to send it</button>
        <button class="note-act" type="button" data-ract="share-copy">Copy instead</button>
        <button class="note-act" type="button" data-ract="share-close">Not now</button>
      </div>`;
    bd.innerHTML = `<div class="scn-modal note-share-sheet" role="dialog" aria-modal="true" aria-labelledby="room-share-h" data-od-id="room-share-sheet">
      <div class="node-title">Share · a copy leaves the app</div>
      <h1 class="prompt" id="room-share-h">Pass this to someone</h1>
      ${body}
    </div>`;
    const f = bd.querySelector('[data-ract="share-send"]') || bd.querySelector('[data-ract="share-close"]');
    if (f && sharePhase === 'ready') f.focus();
  }
  async function sendArrShare() {
    const text = arrangementText(shareArr);
    if (navigator.share) {
      try { await navigator.share({ title: 'A note from me', text }); sharePhase = 'sent'; }
      catch (e) { if (e && e.name === 'AbortError') { closeShare(); return; } sharePhase = 'ready'; }
    } else {
      try { await navigator.clipboard.writeText(text); sharePhase = 'copied'; }
      catch (e) { sharePhase = 'ready'; }
    }
    if (shareArr) renderArrShare();
  }

  /* ============================================================
     events
     ============================================================ */
  function saveBelonging(withProposal) {
    const d = bDraft;
    const a = {
      id: uid('arr'), kind: 'belonging',
      where: d.whereText || d.where, terms: d.terms, ifChanged: d.ifChanged, whoCarries: d.whoCarries, supportNeeded: d.supportNeeded,
      proposal: withProposal ? d.proposal : null,
      material: [], attachedNotes: [], reviews: [], versions: [],
      status: 'active', agreement: withProposal ? 'proposal' : null, createdAt: today(), updatedAt: today()
    };
    putArrangement(a);
    bDraft = null;
    renderArrangement(a.id, { justSaved: true });
  }
  function collectBelonging(step) {
    if (step === 1) bDraft.whereText = val('room-b1');
    if (step === 3) { bDraft.ifChanged = val('room-b3a'); bDraft.whoCarries = val('room-b3b'); bDraft.supportNeeded = val('room-b3c'); }
  }
  function saveContrib() {
    const d = cDraft;
    const a = {
      id: uid('arr'), kind: 'contribution',
      care: d.care, offer: d.offer, visibility: d.visibility, forms: d.forms, experiment: d.experiment,
      material: [], attachedNotes: [], reviews: [], versions: [],
      status: 'active', agreement: null, createdAt: today(), updatedAt: today()
    };
    putArrangement(a);
    cDraft = null;
    renderArrangement(a.id, { justSaved: true });
  }

  function init() {
    $view().addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('[data-ract]');
      if (!btn || btn.disabled) return;
      const act = btn.getAttribute('data-ract');
      const id = btn.getAttribute('data-id');
      const v = btn.getAttribute('data-v');
      const acts = {
        'home': goHome,
        'back': () => roomBackGo(),
        /* practice: make room for this */
        'open-practice': () => { roomBackFn = () => (window.UI && UI.renderLongerExplorations) ? UI.renderLongerExplorations() : goHome(); openPractice(); },
        'open-lamp-room': () => openLampRoom(),
        'p-chip': () => { const t = document.getElementById('room-q' + pDraft.step); if (t) { t.value = (t.value ? t.value + ' ' : '') + v; t.focus(); } },
        'p-next': () => { collectPractice(pDraft.step); if (pDraft.step < 4) renderPractice(pDraft.step + 1); else savePracticeAsArrangement(); },
        'p-skip': () => { if (pDraft.step < 4) renderPractice(pDraft.step + 1); else savePracticeAsArrangement(); },
        'p-stop': () => savePracticeAsArrangement(),
        'lang-open': () => openLang(),
        'leaf-open': (btn) => openLeafPopup(btn.getAttribute('data-leaf')),
        'leaf-add': () => {
          if (4 + extraLeaves >= 8) return;
          extraLeaves++;
          const key = 'leaf-x' + extraLeaves;
          if (!(key in leafTexts)) leafTexts[key] = '';
          renderPractice(1);
        },
        /* belonging */
        'open-belonging': () => openBelonging(),
        'b-where': () => { bDraft.whereText = val('room-b1'); bDraft.where = bDraft.where === v ? '' : v; renderBelonging(1); },
        'b-stance': () => { bDraft.stance = bDraft.stance === v ? '' : v; renderBelonging(2); const t = document.getElementById('room-b2'); if (t) t.focus(); },
        'b-add-term': () => {
          const text = val('room-b2');
          if (!text) return;
          bDraft.terms.push({ text, stance: bDraft.stance || '' });
          bDraft.stance = '';
          renderBelonging(2);
        },
        'b-del-term': () => { bDraft.terms.splice(Number(id), 1); renderBelonging(2); },
        'b-next': () => { collectBelonging(bDraft.step); renderBelonging(bDraft.step + 1); },
        'b-skip': () => { collectBelonging(bDraft.step); renderBelonging(bDraft.step + 1); },
        'b-save-plain': () => { if (bDraft.step) collectBelonging(bDraft.step); saveBelonging(false); },
        'b-to-proposal': () => renderProposal(null),
        'b-back': () => renderBelonging(4),
        'prop-save': () => {
          if (id) {
            const a = getArrangement(id);
            if (!a) return;
            a.versions = (a.versions || []); a.versions.push({ at: today(), fields: snapshotFields(a) });
            collectProposal(a.proposal = a.proposal || {});
            putArrangement(a); renderArrangement(id);
          } else { collectProposal(bDraft.proposal); saveBelonging(true); }
        },
        /* contribution */
        'open-contrib': () => openContrib(),
        'c-vis': () => { cDraft.offer = val('room-c2'); cDraft.visibility = cDraft.visibility === v ? '' : v; renderContrib(2); },
        'c-form': () => { const i = cDraft.forms.indexOf(v); if (i >= 0) cDraft.forms.splice(i, 1); else cDraft.forms.push(v); renderContrib(3); },
        'c-next': () => {
          if (cDraft.step === 1) cDraft.care = val('room-c1');
          if (cDraft.step === 2) cDraft.offer = val('room-c2');
          if (cDraft.step === 4) cDraft.experiment = val('room-c4');
          if (cDraft.step < 4) renderContrib(cDraft.step + 1); else saveContrib();
        },
        'c-skip': () => { if (cDraft.step < 4) renderContrib(cDraft.step + 1); else saveContrib(); },
        'c-stop': () => saveContrib(),
        /* arrangement detail */
        'open-arrangement': () => { confirmRemoveArr = null; renderArrangement(id); },
        'a-edit': () => renderArrangement(id, { editing: true }),
        'a-save-edit': () => {
          const a = getArrangement(id);
          if (!a) return;
          a.versions = a.versions || []; a.versions.push({ at: today(), fields: snapshotFields(a) });
          if (a.kind === 'belonging') collectProposal(a.proposal = a.proposal || {});
          else if (a.kind === 'contribution') { a.care = fieldVal('care'); a.offer = fieldVal('offer'); a.experiment = fieldVal('experiment'); }
          else {
            if (a.kind === 'room') {
              a.whatMatters = fieldVal('whatMatters');
              if (a.openEnded) a.draws = fieldVal('draws');
              else { a.difficult = fieldVal('difficult'); a.help = fieldVal('help'); a.experiment = fieldVal('experiment'); }
            }
            (a.sections || []).forEach((s, i) => { s.value = fieldVal('section:' + i); });
          }
          putArrangement(a); renderArrangement(id);
        },
        'a-restore': () => {
          const a = getArrangement(id);
          const ver = a && a.versions && a.versions[Number(v)];
          if (!ver) return;
          a.versions.push({ at: today(), fields: snapshotFields(a) });
          Object.assign(a, ver.fields);
          a.versions.splice(Number(v), 1);
          putArrangement(a); renderArrangement(id);
        },
        'a-pause': () => { const a = getArrangement(id); if (a) { a.status = 'paused'; putArrangement(a); renderArrangement(id); } },
        'a-resume': () => { const a = getArrangement(id); if (a) { a.status = 'active'; putArrangement(a); renderArrangement(id); } },
        'a-archive': () => { const a = getArrangement(id); if (a) { a.status = 'archived'; putArrangement(a); renderArrangement(id); } },
        'a-remove': () => { confirmRemoveArr = id; renderArrangement(id); },
        'a-remove-yes': () => { saveArrangements(arrangements().filter(x => x.id !== id)); confirmRemoveArr = null; goHome(); },
        'a-remove-no': () => { confirmRemoveArr = null; renderArrangement(id); },
        'a-agreed': () => { const a = getArrangement(id); if (a) { a.agreement = 'agreement'; a.agreedAt = today(); putArrangement(a); renderArrangement(id); } },
        'a-unagree': () => { const a = getArrangement(id); if (a) { a.agreement = 'proposal'; a.agreedAt = null; putArrangement(a); renderArrangement(id); } },
        'a-share': () => openArrShare(id),
        'a-review': () => renderReview(id),
        'r-outcome': (el) => {
          rDraft.madeRoom = v;
          $view().querySelectorAll('[data-ract="r-outcome"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
        },
        'r-save': () => {
          const a = getArrangement(id);
          if (!a) return;
          const r = { at: today(), madeRoom: (rDraft && rDraft.madeRoom) || 'not-really', helped: val('room-r1'), costly: val('room-r2'), change: val('room-r3') };
          a.reviews = a.reviews || []; a.reviews.push(r); putArrangement(a);
          renderReviewAfter(id, r.madeRoom);
        },
        /* open explorations */
        'open-explore': () => openExplore(),
        'x-save': () => { pDraft.whatMatters = val('room-x1'); pDraft.draws = val('room-x2'); savePracticeAsArrangement(); },
        /* returning without an experiment */
        'a-return': () => renderReturn(id),
        'ret-chip': (el) => {
          retDraft.marker = retDraft.marker === v ? '' : v;
          $view().querySelectorAll('[data-ract="ret-chip"]').forEach(b => b.setAttribute('aria-pressed', String(b === el && retDraft.marker === v)));
        },
        'ret-save': () => {
          const a = getArrangement(id);
          if (!a) return;
          a.returns = a.returns || [];
          a.returns.push({ at: today(), marker: (retDraft && retDraft.marker) || '', stillMatters: val('room-ret1'), feelsDifferent: val('room-ret2'), add: val('room-ret3') });
          putArrangement(a); renderArrangement(id);
        },
        /* gathering around an arrangement */
        'a-gather': () => renderGather(id),
        'g-condition': () => renderGatherConditions(id),
        'g-practice': () => renderGatherPractices(id),
        'g-resource': () => renderGatherResource(id),
        'g-add-condition': () => {
          const a = getArrangement(v);
          if (a) { a.conditionIds = a.conditionIds || []; if (!a.conditionIds.includes(id)) a.conditionIds.push(id); putArrangement(a); }
          renderArrangement(v);
        },
        'g-add-practice': () => {
          const a = getArrangement(id);
          const p = GATHER_PRACTICES.find(x => x[0] === v);
          if (a && p) { a.practiceRefs = a.practiceRefs || []; a.practiceRefs.push({ ract: p[0], label: p[1] }); putArrangement(a); }
          renderArrangement(id);
        },
        'g-open-practice': () => { roomBackFn = () => renderGatherPractices(id); openPracticeByRact(v); },
        'g-open-url': () => { if (/^https?:\/\//i.test(v || '')) window.open(v, '_blank', 'noopener'); },
        'g-save-resource': () => {
          const a = getArrangement(id);
          const label = val('room-res1');
          if (!a || !label) return;
          a.resources = a.resources || [];
          a.resources.push({ id: uid('res'), label, url: val('room-res2') });
          putArrangement(a); renderArrangement(id);
        },
        'g-del': () => {
          const a = getArrangement(id);
          if (!a) return;
          const ci = v.indexOf(':');
          const type = v.slice(0, ci), key = v.slice(ci + 1);
          if (type === 'condition') a.conditionIds = (a.conditionIds || []).filter(x => x !== key);
          if (type === 'practice') (a.practiceRefs || []).splice(Number(key), 1);
          if (type === 'resource') a.resources = (a.resources || []).filter(x => x.id !== key);
          putArrangement(a); renderArrangement(id);
        },
        'piece-del': () => {
          const a = getArrangement(id);
          if (a && a.pieces) { a.pieces.splice(Number(v), 1); putArrangement(a); }
          renderArrangement(id);
        },
        /* the four small practices */
        'open-story': () => openSmall('story'),
        'open-influence': () => openSmall('influence'),
        'open-connection': () => openSmall('connection'),
        'open-repair': () => openSmall('repair'),
        's-chip': () => { const t = document.getElementById('room-s1'); if (t) { t.value = (t.value ? t.value + ' ' : '') + v; t.focus(); } },
        's-next': () => { collectSmall(); if (sDraft.step === 1) { sDraft.step = 2; renderSmall(); } else renderSmallKeep(); },
        's-stop': () => { collectSmall(); renderSmallKeep(); },
        's-back': () => { sDraft.step = 2; renderSmall(); },
        's-keep-own': () => saveSmallOwn(),
        's-keep-with': () => {
          const a = getArrangement(id);
          if (!a) return;
          a.pieces = a.pieces || [];
          a.pieces.push({ at: today(), practice: sDraft.key, practiceTitle: SMALL_PRACTICES[sDraft.key].title, sections: smallSections() });
          putArrangement(a); sDraft = null; renderArrangement(id, { justSaved: true });
        },
        /* share sheet (inside #view only for pickers; sheet buttons handled below) */
        'share-close': () => closeShare(),
        'share-copy': async () => {
          try { await navigator.clipboard.writeText(arrangementText(shareArr)); sharePhase = 'copied'; } catch (e2) { sharePhase = 'ready'; }
          renderArrShare();
        }
      };
      if (acts[act]) acts[act](btn);
    });

    /* the leaf popup lives outside #view too */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('#room-leaf-backdrop button[data-ract]');
      if (!btn) return;
      const act = btn.getAttribute('data-ract');
      if (act === 'leaf-close') closeLeafPopup();
      if (act === 'leaf-cat') { leafCat = btn.getAttribute('data-leaf'); renderLeafPopup(); }
      if (act === 'leaf-keep') {
        /* the written words stay as this leaf's hovering text — no sticky note */
        syncLeafLabel(leafCat);
        closeLeafPopup();
        rsOnRender();
      }
    });
    document.addEventListener('input', (e) => {
      const t = e.target.closest && e.target.closest('#room-leaf-backdrop textarea');
      if (!t) return;
      leafTexts[leafCat] = t.value;
      syncLeafLabel(leafCat);
    });

    /* share-sheet buttons live outside #view */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('#room-share-backdrop button[data-ract]');
      if (!btn) return;
      const act = btn.getAttribute('data-ract');
      if (act === 'share-send') sendArrShare();
      if (act === 'share-close') closeShare();
      if (act === 'share-copy') {
        navigator.clipboard.writeText(arrangementText(shareArr))
          .then(() => { sharePhase = 'copied'; renderArrShare(); })
          .catch(() => { sharePhase = 'ready'; renderArrShare(); });
      }
    });

    /* the "help me find language" popup lives outside #view too */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('#room-lang-backdrop button[data-ract]');
      if (!btn) return;
      if (btn.getAttribute('data-ract') === 'lang-close') closeLang();
    });
    document.addEventListener('change', (e) => {
      const el = e.target.closest && e.target.closest('#room-lang-backdrop select[data-lact]');
      if (!el) return;
      if (el.getAttribute('data-lact') === 'cat') { langCat = el.value; renderLang(); }
      else if (el.value) {
        /* the picked words become a normal sticky note, dropped on top of
           the "help me find language" note — usable like any other */
        const note = { id: uid('sticky'), text: el.value, rot: 3, z: 7 };
        const stage = $view().querySelector('.room-scene-stage');
        const lang = stage && (stage.querySelector('.rs-lang') || stage.querySelector('.leaf-lang'));
        if (stage && lang) {
          const r = stage.getBoundingClientRect();
          const l = lang.getBoundingClientRect();
          note.x = Math.max(0, ((l.right - r.left) / r.width) * 100 - 16);
          note.y = Math.min(80, ((l.top - r.top) / r.height) * 100 + 2);
        } else { note.x = 62; note.y = 4; }
        sceneStickies().push(note);
        closeLang();
        rsOnRender();
      }
    });
  }

  function navSnapshot() { const saved = structuredClone({pDraft,bDraft,cDraft,rDraft,retDraft,sDraft,leafCat,extraLeaves,langCat,rsEditId}); return () => { ({pDraft,bDraft,cDraft,rDraft,retDraft,sDraft,leafCat,extraLeaves,langCat,rsEditId} = structuredClone(saved)); }; }
  return { navSnapshot, init, openPractice, openLampRoom,
    continueGrowth(words) { pDraft = {material:[],whatMatters:words,difficult:'',help:'',experiment:'',sticky:[]}; renderPractice(2); },
    continueCommunity(contract) { bDraft={where:contract.fields.Name||'',whereText:contract.fields.Name||'',terms:[],ifChanged:'',whoCarries:'',supportNeeded:'',proposal:{need:'',expressed:contract.fields['Terms I Agree With']||'',assuming:'',arrangement:contract.fields['Current Arrangement']||'',work:contract.fields['Obligation level']||'',revisit:contract.fields['Terms to Reconsider']||''}}; renderBelonging(2); },
    continueInfluence(words) { sDraft={key:'influence',q1:words,extraQ1:'',fields:{},step:2}; renderSmall(); },
    openArrangement: renderArrangement,
    reviewStories(stories) { const filled=stories.filter(s=>s.words.trim()||s.source.trim()); const fields={}; ['keep','change','release','undecided'].forEach(k=>fields[k]=filled.filter(s=>(s.bookmark||'Undecided').toLowerCase()===k).map(s=>(s.source?s.source+': ':'')+s.words).join('\n\n')); sDraft={key:'story',q1:filled.map(s=>(s.source?s.source+': ':'')+s.words).join('\n\n'),extraQ1:'',fields,step:2}; renderSmallKeep(); },
    keepExploration(title, sections, kind='story', material=[]) { const a={id:uid('arr'),kind,title,sections,material,attachedNotes:[],reviews:[],versions:[],status:'active',createdAt:today(),updatedAt:today()}; putArrangement(a); renderArrangement(a.id); return a.id; }
  };
})();

window.ROOM = ROOM;
