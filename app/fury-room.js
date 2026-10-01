/* Furnace of Rage — redesigned room.
   A fireplace with a wood stack below. Drag wood into the fireplace, name
   what you're angry about, and each piece gets a dial (pissed → screaming
   fury and rage) that grows the wood and its flame. Drag a piece to the bin
   to forget it, or to the wall to keep it as a tiny reminder. */
'use strict';
window.FURY_ROOM = (() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // A piece's label: its typed words, or the photo of its handwritten words,
  // which stands in for the name wherever the name would appear.
  function pieceCaption(p) {
    if ((p.title || '').trim()) return esc(p.title);
    if (p.titlePhoto) return `<img class="fury-label-photo" src="${p.titlePhoto}" alt="Your handwritten words">`;
    return 'Unnamed piece';
  }
  function pieceSpoken(p) { return (p.title || '').trim() || 'your handwritten words'; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const LS_KEY = 'fsaw.fury.v1';
  const MAX_BURNING = 5;
  const LEVELS = ['pissed', '', 'angry', '', 'screaming fury and rage'];

  const view = () => $('#view');

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY));
      if (s && Array.isArray(s.pieces)) return s;
    } catch (e) { /* ignore */ }
    return { pieces: [] };
  }
  function saveState(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }

  // J's own artwork for the furnace: the fireplace, a plain piece of wood,
  // and a piece of wood on fire. Used in place of the earlier drawn versions.
  const WOOD_IMG = '<img class="fury-art" src="assets/current/fury-wood.svg" alt="" draggable="false">';
  const CHIP_IMG = '<img class="fury-art fury-chip-art" src="assets/current/fury-chip.svg" alt="" draggable="false">';
  const BURNING_IMG = '<img class="fury-art" src="assets/current/fury-wood-burning.svg" alt="" draggable="false">';
  const FIREPLACE_IMG = '<img class="fury-fireplace-art" src="assets/current/fury-fireplace.svg" alt="A fireplace" draggable="false">';

  const BIN_SVG = `<svg viewBox="0 0 80 90" aria-hidden="true" focusable="false">
    <path d="M14 26h52l-6 56a6 6 0 0 1-6 5H26a6 6 0 0 1-6-5z" fill="#5a5348"/>
    <path d="M14 26h52l-6 56a6 6 0 0 1-6 5H26a6 6 0 0 1-6-5z" fill="none" stroke="#3e3931" stroke-width="2"/>
    <rect x="8" y="18" width="64" height="10" rx="3" fill="#6e675c"/>
    <rect x="32" y="8" width="16" height="12" rx="3" fill="#6e675c"/>
    <path d="M28 30l4 50M40 30v52M52 30l-4 50" stroke="#3e3931" stroke-width="2" opacity=".5"/>
  </svg>`;

  let state = null;

  function burningPieces() { return state.pieces.filter(p => p.place === 'fire'); }
  function wallPieces() { return state.pieces.filter(p => p.place === 'wall'); }

  function open() {
    state = loadState();
    render();
    /* enhance() runs on the next microtask via MutationObserver and clears
       the About text, so set ours on a macrotask after it. */
    setTimeout(() => {
      if (window.ITERATION && typeof window.ITERATION.setPageAbout === 'function') {
        window.ITERATION.setPageAbout(
          'The furnace holds what you are angry about, without any requirement to calm down, reframe it, or find the lesson. Drag a piece of wood from the stack into the fireplace and name what fuels it. Each burning piece gets a dial — turn it from "pissed" up to "screaming fury and rage" and watch its flame grow. When you are no longer angry about something, drag its piece to the bin to forget it, or hang it on the wall as a small reminder of what once burned.',
          'About this exploration'
        );
      }
    }, 0);
  }

  function render() {
    view().innerHTML = `
    <div class="card fury-room" data-page="fury-room" data-od-id="fury-room">
      <div class="pcontrols"><button class="pctl" type="button" data-fury="back">Self-Explorations</button></div>
      <h1 class="prompt" tabindex="-1">Furnace of rage</h1>
      <p class="support">Anger, without the requirement to calm down, reframe it, or find the lesson.</p>
      <div class="fury-grid">
        <section class="fury-wall" id="fury-wall" aria-label="Wall of past anger">
          <h2 class="h3">Wall</h2>
          <p class="fury-wall-hint">Drag a piece here to keep it as a small reminder.</p>
          <div class="fury-wall-pieces" id="fury-wall-pieces"></div>
        </section>
        <section class="fury-hearth" aria-label="Fireplace">
          <div class="fury-hearth-row">
            <div class="fury-fireplace" id="fury-fireplace">
              ${FIREPLACE_IMG}
              <div class="fury-firebox" id="fury-firebox" aria-label="Fireplace — drag wood here"></div>
            </div>
            <div class="fury-bin" id="fury-bin" aria-label="Bin — drag a piece here to forget it">
              ${BIN_SVG}
            </div>
          </div>
        </section>
        <section class="fury-stack" id="fury-stack" aria-label="Wood pile — drag a piece to the fireplace">
          <h2 class="h3">Wood pile</h2>
          <div class="fury-stack-pieces"></div>
        </section>
        <section class="fury-dials" id="fury-dials" aria-label="Anger dials"></section>
      </div>
      <div class="fury-foot">
        <button class="btn2" type="button" data-fury="leave">Done for now</button>
      </div>
      <p class="fury-status" id="fury-status" role="status"></p>
    </div>`;
    view().querySelector('h1')?.focus({ preventScroll: true });
    renderAll();
    wireStatic();
  }

  function renderAll() {
    renderFirebox();
    renderDials();
    renderStack();
    renderWall();
  }

  /* ---------- fireplace + burning pieces ---------- */
  function scaleFor(level) { return 0.55 + (level / 4) * 0.95; } // 0.55 → 1.5

  function renderFirebox() {
    const box = $('#fury-firebox');
    if (!box) return;
    const pieces = burningPieces();
    const n = pieces.length;
    box.innerHTML = pieces.map((p, i) => {
      const s = scaleFor(p.level);
      // Pieces rest on the floor of the fireplace, spread across its width.
      // Sizes stay proportional to the fireplace so nothing can spill past it.
      const left = n > 1 ? 20 + (i / (n - 1)) * 60 : 50;
      return `<div class="fury-piece" data-id="${esc(p.id)}" style="left:${left.toFixed(1)}%;touch-action:none" role="button" tabindex="0" aria-label="${esc(pieceSpoken(p))} — drag to the bin to forget it, or to the wall to keep it as a reminder">
        <div class="fury-piece-scale" style="transform:scale(${s.toFixed(2)})">
          <img class="fury-art fury-piece-art" src="assets/current/fury-wood-burning.svg" alt="" draggable="false">
        </div>
      </div>`;
    }).join('');
    box.querySelectorAll('.fury-piece').forEach(attachPieceDrag);
  }

  /* ---------- dials ---------- */
  function renderDials() {
    const wrap = $('#fury-dials');
    if (!wrap) return;
    const pieces = burningPieces();
    wrap.innerHTML = pieces.length ? pieces.map(p => `
      <div class="fury-dial" data-id="${esc(p.id)}">
        <div class="fury-dial-title">${pieceCaption(p)}</div>
        <div class="fury-dial-body">
          <div class="fury-knob" role="slider" tabindex="0" aria-label="How angry: ${esc(pieceSpoken(p))}"
               aria-valuemin="0" aria-valuemax="4" aria-valuenow="${p.level}" aria-valuetext="${esc(levelLabel(p.level))}"
               data-level="${p.level}" style="touch-action:none">
            <span class="fury-knob-pointer"></span>
          </div>
          <div class="fury-settings" aria-hidden="true">
            ${[4, 3, 2, 1, 0].map(l => `
              <button type="button" tabindex="-1" class="fury-setting${l === p.level ? ' on' : ''}" data-set="${l}">
                <span class="fury-setting-line"></span><span class="fury-setting-label">${esc(LEVELS[l])}</span>
              </button>`).join('')}
          </div>
        </div>
      </div>`).join('')
      : `<p class="fury-dials-empty">Dials for your burning pieces will appear here.</p>`;
    wrap.querySelectorAll('.fury-dial').forEach(attachDial);
    aimDialPointers();
  }

  /* The knob's pointer aims at the line-marker of the level that is actually
     set, measured from the real layout so it stays true at any size. */
  function aimDialPointers() {
    $$('.fury-dial').forEach(dialEl => {
      const knob = dialEl.querySelector('.fury-knob');
      const pointer = dialEl.querySelector('.fury-knob-pointer');
      const marker = dialEl.querySelector('.fury-setting.on .fury-setting-line');
      if (!knob || !pointer || !marker) return;
      const k = knob.getBoundingClientRect();
      const m = marker.getBoundingClientRect();
      const deg = Math.atan2(
        (m.top + m.height / 2) - (k.top + k.height / 2),
        (m.left + m.width / 2) - (k.left + k.width / 2)
      ) * 180 / Math.PI;
      pointer.style.transform = `rotate(${deg.toFixed(1)}deg)`;
    });
  }

  function levelLabel(l) {
    return LEVELS[l] || ('level ' + (l + 1) + ' of 5');
  }

  function setLevel(id, level) {
    const p = state.pieces.find(x => x.id === id);
    if (!p || p.place !== 'fire') return;
    p.level = clamp(Math.round(level), 0, 4);
    saveState(state);
    renderFirebox();
    // Update the dial in place (no re-render — the user may be mid-drag or focused).
    const dialEl = document.querySelector(`.fury-dial[data-id="${CSS.escape(id)}"]`);
    if (dialEl) {
      const knob = dialEl.querySelector('.fury-knob');
      knob.dataset.level = p.level;
      knob.setAttribute('aria-valuenow', p.level);
      knob.setAttribute('aria-valuetext', levelLabel(p.level));
      dialEl.querySelectorAll('.fury-setting').forEach(b =>
        b.classList.toggle('on', Number(b.dataset.set) === p.level));
      aimDialPointers();
    }
  }

  function attachDial(dialEl) {
    const id = dialEl.dataset.id;
    const knob = dialEl.querySelector('.fury-knob');
    let dragging = false, startY = 0, startLevel = 0;
    const pxPerLevel = 40;

    knob.addEventListener('pointerdown', e => {
      dragging = true; startY = e.clientY;
      startLevel = Number(knob.dataset.level) || 0;
      knob.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    knob.addEventListener('pointermove', e => {
      if (!dragging) return;
      const d = Math.round((startY - e.clientY) / pxPerLevel);
      setLevel(id, startLevel + d);
      startY = e.clientY; startLevel = clamp(startLevel + d, 0, 4);
    });
    const stop = () => { dragging = false; };
    knob.addEventListener('pointerup', stop);
    knob.addEventListener('pointercancel', stop);
    knob.addEventListener('keydown', e => {
      const cur = Number(knob.dataset.level) || 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); setLevel(id, cur + 1); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); setLevel(id, cur - 1); }
    });
    dialEl.querySelectorAll('.fury-setting').forEach(btn => {
      btn.addEventListener('click', () => setLevel(id, Number(btn.dataset.set)));
    });
  }

  /* ---------- wood stack ---------- */
  function renderStack() {
    const stack = document.querySelector('#fury-stack .fury-stack-pieces');
    if (!stack) return;
    // The stack is an endless supply; show three pieces to grab.
    stack.innerHTML = [0, 1, 2].map(i =>
      `<button type="button" class="fury-stack-piece" aria-label="A piece of wood — drag it into the fireplace" style="touch-action:none">${WOOD_IMG}</button>`
    ).join('');
    stack.querySelectorAll('.fury-stack-piece').forEach(el => {
      el.addEventListener('pointerdown', e => startStackDrag(e, el));
    });
  }

  /* ---------- wall ---------- */
  function renderWall() {
    const wall = $('#fury-wall-pieces');
    if (!wall) return;
    const pieces = wallPieces();
    wall.innerHTML = pieces.length ? pieces.map(p => `
      <div class="fury-hung" data-id="${esc(p.id)}" style="touch-action:none" role="button" tabindex="0"
           aria-label="${esc(pieceSpoken(p))} — once burned here. Drag to the bin to forget it entirely." title="${esc(pieceSpoken(p))}">
        <span class="fury-string" aria-hidden="true"></span>
        <span class="fury-hung-log" aria-hidden="true">${CHIP_IMG}</span>
        <span class="fury-hung-title">${pieceCaption(p)}</span>
      </div>`).join('')
      : `<p class="fury-wall-empty">Nothing hung yet.</p>`;
    wall.querySelectorAll('.fury-hung').forEach(el => {
      el.addEventListener('pointerdown', e => startPieceDrag(e, el, el.dataset.id, 'wall'));
    });
  }

  /* ---------- drag & drop ---------- */
  function ghostFor(html) {
    const g = document.createElement('div');
    g.className = 'fury-drag-ghost';
    g.innerHTML = html;
    document.body.append(g);
    return g;
  }

  function startStackDrag(e, srcEl) {
    e.preventDefault();
    const ghost = ghostFor(WOOD_IMG);
    const move = ev => {
      ghost.style.left = (ev.clientX - 40) + 'px';
      ghost.style.top = (ev.clientY - 18) + 'px';
      const box = $('#fury-firebox');
      box?.classList.toggle('fury-drop-hint', !!document.elementFromPoint(ev.clientX, ev.clientY)?.closest('#fury-firebox'));
    };
    const up = ev => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      ghost.remove();
      $('#fury-firebox')?.classList.remove('fury-drop-hint');
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('#fury-firebox');
      if (target) {
        if (burningPieces().length >= MAX_BURNING) {
          status('The fireplace holds five pieces already — let one go before adding another.');
          return;
        }
        openWoodDialog();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    move(e);
  }

  function attachPieceDrag(el) {
    el.addEventListener('pointerdown', e => startPieceDrag(e, el, el.dataset.id, 'fire'));
  }

  function startPieceDrag(e, srcEl, id, from) {
    // Don't start a drag from keyboard focus or tiny jitter; require movement.
    const sx = e.clientX, sy = e.clientY;
    let dragging = false, ghost = null;
    e.preventDefault();
    const move = ev => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
      if (!dragging) {
        dragging = true;
        ghost = ghostFor(from === 'fire' ? BURNING_IMG : WOOD_IMG);
        srcEl.classList.add('fury-drag-src');
      }
      ghost.style.left = (ev.clientX - 40) + 'px';
      ghost.style.top = (ev.clientY - 18) + 'px';
      const pt = document.elementFromPoint(ev.clientX, ev.clientY);
      $('#fury-bin')?.classList.toggle('fury-drop-hint', !!pt?.closest('#fury-bin'));
      $('#fury-wall')?.classList.toggle('fury-drop-hint', !!pt?.closest('#fury-wall'));
    };
    const up = ev => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      srcEl.classList.remove('fury-drag-src');
      if (ghost) ghost.remove();
      $('#fury-bin')?.classList.remove('fury-drop-hint');
      $('#fury-wall')?.classList.remove('fury-drop-hint');
      if (!dragging) { showPieceTitle(id); return; } // it was a tap
      const pt = document.elementFromPoint(ev.clientX, ev.clientY);
      if (pt?.closest('#fury-bin')) {
        removePiece(id, 'forgotten');
      } else if (pt?.closest('#fury-wall') && from === 'fire') {
        movePiece(id, 'wall');
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function showPieceTitle(id) {
    const p = state.pieces.find(x => x.id === id);
    if (p) status(p.place === 'fire' ? `"${pieceSpoken(p)}" — burning at "${LEVELS[p.level]}". Drag it to the bin to forget it, or to the wall to keep it as a reminder.` : `"${pieceSpoken(p)}" — once burned here.`);
  }

  function removePiece(id, how) {
    state.pieces = state.pieces.filter(x => x.id !== id);
    saveState(state);
    renderAll();
    status(how === 'forgotten' ? 'Let go — the piece is gone.' : 'Piece removed.');
  }

  function movePiece(id, place) {
    const p = state.pieces.find(x => x.id === id);
    if (!p) return;
    p.place = place;
    saveState(state);
    renderAll();
    status(place === 'wall' ? `"${pieceSpoken(p)}" now hangs on the wall — a small reminder of what once burned.` : 'Moved.');
  }

  function status(msg) {
    const el = $('#fury-status');
    if (el) el.textContent = msg;
  }

  /* ---------- wood dialog ---------- */
  function openWoodDialog() {
    const ov = document.createElement('div');
    ov.className = 'fury-dialog-ov';
    ov.innerHTML = `
      <div class="fury-dialog" role="dialog" aria-modal="true" aria-labelledby="fury-dialog-title">
        <div class="fury-dialog-log">${WOOD_IMG}</div>
        <h2 id="fury-dialog-title">A piece of wood</h2>
        ${PhotoBody.field('title','What are you angry about?','',null,{placeholder:'Name it in your own words…',required:true,maxlength:60})}
        <p class="dialog-error" role="alert"></p>
        <div class="btnrow">
          <button class="btn" type="button" data-fd="confirm">Confirm</button>
          <button class="note-act" type="button" data-fd="cancel">Cancel</button>
        </div>
      </div>`;
    document.body.append(ov);
    PhotoBody.reset(ov);
    PhotoBody.bind(ov);
    const close = () => ov.remove();
    const ta = ov.querySelector('textarea');
    ta.focus();
    ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
    ov.addEventListener('click', e => {
      const b = e.target.closest('[data-fd]');
      if (!b) return;
      if (b.dataset.fd === 'cancel') { close(); return; }
      const title = ta.value.trim();
      const titlePhoto = PhotoBody.get(ov, 'title') || null;
      if (!title && !titlePhoto) {
        ov.querySelector('.dialog-error').textContent = 'Give the piece a name — a few words, or a photo of your handwriting.';
        ta.focus();
        return;
      }
      state.pieces.push({ id: 'w' + Math.random().toString(36).slice(2), title, titlePhoto, level: 0, place: 'fire' });
      saveState(state);
      close();
      renderAll();
      status(title ? `"${title}" is in the fire. Turn its dial to say how hot it burns.` : 'Your piece is in the fire. Turn its dial to say how hot it burns.');
    });
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  /* ---------- static wiring ---------- */
  function wireStatic() {
    // Keep the dial pointers aimed at their level's line-marker on resize.
    window.removeEventListener('resize', aimDialPointers);
    window.addEventListener('resize', aimDialPointers);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => aimDialPointers()).catch(() => {});
    }    view().querySelector('[data-fury="back"]')?.addEventListener('click', () => {
      if (window.UI && typeof window.UI.renderLongerExplorations === 'function') window.UI.renderLongerExplorations();
      else if (window.EXPLORATIONS?.routes) window.history.back();
    });
    view().querySelector('[data-fury="leave"]')?.addEventListener('click', () => {
      if (window.UI && typeof window.UI.renderLongerExplorations === 'function') window.UI.renderLongerExplorations();
    });
    // Keyboard: pieces are focusable; Enter shows info, Delete removes.
    view().addEventListener('keydown', e => {
      const piece = e.target.closest?.('.fury-piece, .fury-hung');
      if (!piece) return;
      const id = piece.dataset.id;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPieceTitle(id); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removePiece(id, 'forgotten'); }
    });
  }

  return { open };
})();
