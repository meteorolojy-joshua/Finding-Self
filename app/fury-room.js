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

  // A log, drawn as SVG. Scales with the anger level.
  const LOG_SVG = `<svg viewBox="0 0 120 44" aria-hidden="true" focusable="false">
    <ellipse cx="60" cy="22" rx="52" ry="16" fill="#6b4226"/>
    <ellipse cx="60" cy="19" rx="52" ry="14" fill="#7d502e"/>
    <path d="M12 18c14-6 30-8 48-8s34 2 48 8" stroke="#8f6238" stroke-width="2.5" fill="none" opacity=".7"/>
    <path d="M14 26c16 5 32 7 46 7s30-2 46-7" stroke="#5a3a20" stroke-width="2" fill="none" opacity=".6"/>
    <ellipse cx="10" cy="22" rx="9" ry="15" fill="#a07a4a"/>
    <ellipse cx="10" cy="22" rx="5.5" ry="10" fill="#c49a63"/>
    <ellipse cx="10" cy="22" rx="2.6" ry="5" fill="#8a6238"/>
  </svg>`;

  // A flame, drawn as SVG. Flickers via CSS.
  const FLAME_SVG = `<svg viewBox="0 0 60 90" aria-hidden="true" focusable="false" class="fury-flame-art">
    <path class="flame-outer" d="M30 4c8 14 20 24 20 44a20 22 0 0 1-40 0c0-12 6-18 10-26 2 6 5 9 8 11 0-10 0-19 2-29z" fill="#ff7a2e"/>
    <path class="flame-mid" d="M30 22c5 9 12 15 12 28a12 14 0 0 1-24 0c0-8 4-12 6-17 1.4 4 3.4 6 5 7.4 0-6.4-.4-12 1-18.4z" fill="#ffb13c"/>
    <path class="flame-inner" d="M30 38c3 5 7 8 7 15a7 8 0 0 1-14 0c0-4.6 2.2-7 3.6-10 .8 2.4 2 3.6 3 4.4 0-3.2-.2-6.2.4-9.4z" fill="#ffe08a"/>
  </svg>`;

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
        <section class="fury-wall" aria-label="Wall of past anger">
          <h2 class="h3">Wall</h2>
          <p class="fury-wall-hint">Drag a piece here to keep it as a small reminder.</p>
          <div class="fury-wall-pieces" id="fury-wall-pieces"></div>
        </section>
        <section class="fury-hearth" aria-label="Fireplace">
          <div class="fury-fireplace" id="fury-fireplace">
            <div class="fury-mantel"></div>
            <div class="fury-firebox" id="fury-firebox" aria-label="Fireplace — drag wood here"></div>
            <div class="fury-hearth-base"></div>
          </div>
          <div class="fury-stack" id="fury-stack" aria-label="Wood pile — drag a piece to the fireplace">
            <h2 class="h3">Wood pile</h2>
            <div class="fury-stack-pieces"></div>
          </div>
        </section>
        <section class="fury-dials" id="fury-dials" aria-label="Anger dials"></section>
      </div>
      <div class="fury-foot">
        <div class="fury-bin" id="fury-bin" aria-label="Disposal bin — drag a piece here to forget it">
          ${BIN_SVG}<span>Forget it</span>
        </div>
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
    box.innerHTML = pieces.map((p, i) => {
      const s = scaleFor(p.level);
      // Arrange pieces in a loose pile: spread horizontally, slight vertical offsets.
      const left = 12 + (i * (76 / Math.max(1, pieces.length - 1 || 1))) * 0 + (pieces.length > 1 ? (i / (pieces.length - 1)) * 68 : 34);
      const top = 52 + ((i % 2) * 14) - (p.level * 2);
      return `<div class="fury-piece" data-id="${esc(p.id)}" style="left:${clamp(left, 6, 80)}%;top:${clamp(top, 30, 70)}%;touch-action:none" role="button" tabindex="0" aria-label="${esc(p.title)} — drag to the bin to forget it, or to the wall to keep it as a reminder">
        <div class="fury-flames" style="transform:scale(${s.toFixed(2)})">${FLAME_SVG}</div>
        <div class="fury-log" style="transform:scale(${(s * 0.9).toFixed(2)})">${LOG_SVG}</div>
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
        <div class="fury-dial-title">${esc(p.title)}</div>
        <div class="fury-dial-body">
          <div class="fury-knob" role="slider" tabindex="0" aria-label="How angry: ${esc(p.title)}"
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
      `<button type="button" class="fury-stack-piece" aria-label="A piece of wood — drag it into the fireplace" style="touch-action:none">${LOG_SVG}</button>`
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
           aria-label="${esc(p.title)} — once burned here. Drag to the bin to forget it entirely." title="${esc(p.title)}">
        <span class="fury-string" aria-hidden="true"></span>
        <span class="fury-hung-log" aria-hidden="true">${LOG_SVG}</span>
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
    const ghost = ghostFor(LOG_SVG);
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
        ghost = ghostFor(LOG_SVG);
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
    if (p) status(p.place === 'fire' ? `"${p.title}" — burning at "${LEVELS[p.level]}". Drag it to the bin to forget it, or to the wall to keep it as a reminder.` : `"${p.title}" — once burned here.`);
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
    status(place === 'wall' ? `"${p.title}" now hangs on the wall — a small reminder of what once burned.` : 'Moved.');
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
        <div class="fury-dialog-log">${LOG_SVG}</div>
        <h2 id="fury-dialog-title">A piece of wood</h2>
        <label class="fury-field"><span>What are you angry about?</span>
          <textarea name="title" rows="3" placeholder="Name it in your own words…"></textarea>
        </label>
        <p class="dialog-error" role="alert"></p>
        <div class="btnrow">
          <button class="btn" type="button" data-fd="confirm">Confirm</button>
          <button class="note-act" type="button" data-fd="cancel">Cancel</button>
        </div>
      </div>`;
    document.body.append(ov);
    const close = () => ov.remove();
    const ta = ov.querySelector('textarea');
    ta.focus();
    ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
    ov.addEventListener('click', e => {
      const b = e.target.closest('[data-fd]');
      if (!b) return;
      if (b.dataset.fd === 'cancel') { close(); return; }
      const title = ta.value.trim();
      if (!title) {
        ov.querySelector('.dialog-error').textContent = 'Give the piece a name — even a few words will do.';
        ta.focus();
        return;
      }
      state.pieces.push({ id: 'w' + Math.random().toString(36).slice(2), title, level: 0, place: 'fire' });
      saveState(state);
      close();
      renderAll();
      status(`"${title}" is in the fire. Turn its dial to say how hot it burns.`);
    });
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  /* ---------- static wiring ---------- */
  function wireStatic() {
    view().querySelector('[data-fury="back"]')?.addEventListener('click', () => {
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
