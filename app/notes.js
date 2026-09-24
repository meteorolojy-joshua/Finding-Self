/* ============================================================
   Multimodal notes + quiet sharing for the FS-AW prototype.
   Additive module: its own store (fsaw.notes.v1), its own screens,
   no changes to routing or to the canonical package.

   The note is a space, not a media picker: words are always
   available, a photo or a recording joins when invited, and words
   can also sit on the photograph itself, placed anywhere by hand.

   Principles encoded here:
   - Expression before explanation: a photo or a sound alone is a
     complete note; interpretation is never requested.
   - Nothing is stored unless chosen: the draft is volatile until
     "Keep this note" is pressed; storage state is always visible.
   - Witnessing without performance: sharing hands a copy of the
     note to one person through the device's normal share sheet.
     No captions demanded, no audience, no metrics.
   ============================================================ */
'use strict';

const NOTES = (() => {
  const $view = () => document.getElementById('view');
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---------- icons (feather-style, subdued) ---------- */
  const ICO_PEN = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  const ICO_PHOTO = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
  const ICO_MIC = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>';
  const ICO_PLAY = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>';
  const ICO_PAUSE = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>';
  const ICO_ZTOP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 8-5-5-5 5"/><path d="m17 15-5-5-5 5"/></svg>';
  const ICO_ZUP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 14-5-5-5 5"/></svg>';
  const ICO_ZDOWN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
  const ICO_ZBOTTOM = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 9 5 5 5-5"/><path d="m7 16 5 5 5-5"/></svg>';
  const ICO_TRASH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

  /* words on a photo — subdued palette, legible on anything */
  const CAP_COLORS = [
    { name: 'cream', value: '#faf7f2' },
    { name: 'ink', value: '#191919' },
    { name: 'forest', value: '#58705A' },
    { name: 'clay', value: '#5A463A' }
  ];
  /* the color wheel needs a plain #rrggbb value; anything else falls back to ink */
  function asHex(c) { return /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : CAP_COLORS[1].value; }

  /* ---------- store ---------- */
  const KEY = () => ENGINE.LS.note; // 'fsaw.notes.v1'
  function all() { return ENGINE.lsGet(KEY(), []); }
  function persist(notes) {
    // engine lsSet swallows errors; notes carry media, so surface quota failures honestly
    try { localStorage.setItem(KEY(), JSON.stringify(notes)); return true; }
    catch (e) { return false; }
  }
  function removeNote(id) { persist(all().filter(n => n.id !== id)); }

  /* ---------- the note is a board of items ----------
     Each item: { exid, kind:'text'|'photo'|'audio', x, y, z,
                  color (text), dataUrl/w/h (photo), dataUrl/mime/durationSec (audio) }
     x/y are percent of the board; z is stacking order (touched = front).
     Legacy shaped notes normalize into items on first read. */
  let seq = 0;
  function exid() { return 'ex' + (++seq); }
  function boardItems(note) {
    let items = Array.isArray(note.items) && note.items.length
      ? note.items
      : normalizeLegacy(note);
    return items.slice().sort((a, b) => a.z - b.z);
  }
  function normalizeLegacy(note) {
    const items = [];
    /* older shapes stored y as percent of the old 340px frame — convert to px */
    const px = (pct) => Math.round((pct || 0) / 100 * 340);
    if (note.photo) {
      const photo = { exid: exid(), kind: 'photo', x: 50, y: px(46), z: 0, dataUrl: note.photo.dataUrl, w: note.photo.w, h: note.photo.h };
      items.push(photo);
      (note.photo.captions || []).forEach(c => items.push({ exid: exid(), kind: 'text', x: c.x, y: px(c.y), z: 1, color: c.color, text: c.text }));
    }
    if (note.text) items.push({ exid: exid(), kind: 'text', x: 50, y: px(20), z: 2, color: '#191919', text: note.text });
    if (note.audio) items.push({ exid: exid(), kind: 'audio', x: 50, y: px(78), z: 3, dataUrl: note.audio.dataUrl, mime: note.audio.mime, durationSec: note.audio.durationSec });
    return items;
  }

  /* ---------- volatile draft + ui state ---------- */
  let draft = null;          // { items:[...] }
  let recordOpen = false;    // recording controls invited into the tool row
  let selId = null;          // selected item exid (color / remove / re-record)
  let saveError = false;
  let confirmDiscard = false;
  let confirmRemoveId = null; // two-step removal in the notes list
  let shareTarget = null;     // { type:'draft' } | { type:'saved', id }
  let shareState = null;      // null | 'ready' | 'sending' | 'sent' | 'unsupported'

  function newDraft() {
    draft = { items: [] };
    recordOpen = false;
    selId = null;
    saveError = false;
    confirmDiscard = false;
  }
  function hasContent() {
    return !!(draft && boardItems(draft).some(it => it.kind !== 'text' || (it.text || '').trim()));
  }
  function busy() { return rec.state === 'recording' || rec.state === 'asking'; }
  function selectedItem() {
    if (!selId || !draft) return null;
    return draft.items.find(it => it.exid === selId) || null;
  }
  function addItem(it) {
    it.z = Math.max(0, ...draft.items.map(i => i.z)) + 1;
    draft.items.push(it);
    return it;
  }

  /* ---------- recording ---------- */
  const REC_MAX_SEC = 300; // soft cap: five minutes, then it stops gently
  let rec = { state: 'idle', mr: null, stream: null, chunks: [], startedAt: 0, timer: null, cancelled: false, notice: '' };

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function recElapsed() { return rec.startedAt ? (Date.now() - rec.startedAt) / 1000 : 0; }

  async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      rec.state = 'unsupported'; renderComposer(); return;
    }
    rec.state = 'asking'; rec.notice = ''; renderComposer();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      rec.mr = mr; rec.stream = stream; rec.chunks = []; rec.cancelled = false;
      mr.ondataavailable = (e) => { if (e.data && e.data.size) rec.chunks.push(e.data); };
      mr.onstop = finishRecording;
      mr.start();
      rec.startedAt = Date.now();
      rec.state = 'recording';
      rec.timer = setInterval(() => {
        const t = document.getElementById('note-rec-time');
        if (t) t.textContent = fmtTime(recElapsed());
        if (recElapsed() >= REC_MAX_SEC) { rec.notice = 'The recording stopped by itself at five minutes.'; stopRecording(); }
      }, 250);
      renderComposer();
    } catch (err) {
      cleanupRec();
      rec.state = 'denied';
      renderComposer();
    }
  }
  function stopRecording() {
    if (rec.mr && rec.mr.state !== 'inactive') rec.mr.stop();
    clearInterval(rec.timer); rec.timer = null;
  }
  function cancelRecording() {
    rec.cancelled = true;
    stopRecording();
    cleanupRec();
    rec.state = 'idle';
    renderComposer();
  }
  function cleanupRec() {
    if (rec.stream) { rec.stream.getTracks().forEach(t => t.stop()); }
    rec.stream = null; rec.mr = null; rec.startedAt = 0;
  }
  function finishRecording() {
    clearInterval(rec.timer); rec.timer = null;
    const elapsed = recElapsed();
    const cancelled = rec.cancelled;
    const chunks = rec.chunks;
    const mime = rec.mr ? (rec.mr.mimeType || 'audio/webm') : 'audio/webm';
    cleanupRec();
    if (cancelled || !chunks.length) { rec.state = 'idle'; renderComposer(); return; }
    const blob = new Blob(chunks, { type: mime });
    const reader = new FileReader();
    reader.onload = () => {
      stopPlayer();
      // replace the selected audio bar (re-record) or place a new one
      const sel = selectedItem();
      if (sel && sel.kind === 'audio') { sel.dataUrl = reader.result; sel.mime = mime; sel.durationSec = Math.max(1, Math.round(elapsed)); }
      else addItem({ exid: exid(), kind: 'audio', x: 50, y: 250, dataUrl: reader.result, mime, durationSec: Math.max(1, Math.round(elapsed)) });
      recordOpen = false;
      rec.state = 'idle';
      renderComposer();
    };
    reader.readAsDataURL(blob);
  }

  /* ---------- playback (one shared element — only one sound at a time) ---------- */
  const player = { el: null, id: null };
  function stopPlayer() {
    if (player.el) { player.el.pause(); player.el = null; player.id = null; }
  }
  function togglePlay(id, dataUrl) {
    if (player.id === id && player.el) { stopPlayer(); refreshPlayers(); return; }
    stopPlayer();
    const a = new Audio(dataUrl);
    player.el = a; player.id = id;
    a.addEventListener('timeupdate', () => updatePlayerUi(id));
    a.addEventListener('ended', () => { stopPlayer(); refreshPlayers(); });
    a.play().catch(() => { stopPlayer(); refreshPlayers(); });
    refreshPlayers();
  }
  function playerRow(id, durationSec, opts) {
    // audio item needs: the bare bar (play + time); list/detail rows keep the track
    if (opts && opts.item) {
      return `<span class="note-barplay" role="button" tabindex="0" data-nact="play" data-id="${esc(id)}" aria-label="Play this recording">${ICO_PLAY}
        <span class="note-bartime" data-time-for="${esc(id)}">0:00 / ${esc(fmtTime(durationSec))}</span>
        <span class="note-barfill" data-fill-for="${esc(id)}" aria-hidden="true"></span>
      </span>`;
    }
    return `<div class="note-audio" data-player-for="${esc(id)}">
      <button class="note-play" type="button" data-nact="play" data-id="${esc(id)}" aria-label="Play this recording">${ICO_PLAY}</button>
      <div class="note-track" aria-hidden="true"><div class="note-fill" data-fill-for="${esc(id)}"></div></div>
      <span class="note-time" data-time-for="${esc(id)}">0:00 / ${esc(fmtTime(durationSec))}</span>
    </div>`;
  }
  function refreshPlayers() {
    document.querySelectorAll('[data-nact="play"]').forEach(btn => {
      const id = btn.getAttribute('data-id');
      const active = player.id === id && player.el;
      const icon = btn.classList.contains('note-barplay') ? btn.querySelector('svg') : btn;
      if (btn.classList.contains('note-barplay')) {
        // bar: swap only the icon span's first child (svg) — simpler: re-tag aria
        btn.setAttribute('aria-label', active ? 'Pause this recording' : 'Play this recording');
        btn.classList.toggle('playing', !!active);
      } else {
        btn.innerHTML = active ? ICO_PAUSE : ICO_PLAY;
        btn.setAttribute('aria-label', active ? 'Pause this recording' : 'Play this recording');
      }
    });
  }
  function updatePlayerUi(id) {
    if (!player.el) return;
    const a = player.el;
    const dur = a.duration && isFinite(a.duration) ? a.duration : 0;
    document.querySelectorAll(`[data-fill-for="${id}"]`).forEach(fill => {
      if (dur) fill.style.width = Math.min(100, (a.currentTime / dur) * 100) + '%';
    });
    document.querySelectorAll(`[data-time-for="${id}"]`).forEach(time => {
      time.textContent = fmtTime(a.currentTime) + (dur ? ' / ' + fmtTime(dur) : '');
    });
  }

  /* ---------- the board: items at free positions, z-ordered ----------
     x is % of board width (clamped to the sides); y is px from the top —
     never clamped, because the board's own height extends to meet the
     lowest placed item. */

  function renderBoard(items, opts) {
    opts = opts || {};
    const interactive = !!opts.interactive;
    const listed = !!opts.listed; // compact rendering inside the Moments list
    const sorted = items.slice().sort((a, b) => a.z - b.z);
    /* the board grows to meet the lowest placed item — x is % of width,
       y is px from the top, so nothing is ever locked inside a fixed frame */
    const bh = Math.max(340, ...sorted.map(it => (it.y || 0) + 90));
    const inner = sorted.map(it => {
      const selCls = interactive && selId === it.exid ? ' sel' : '';
      if (it.kind === 'photo') {
        // the width lives on the item box itself (a % of the note space), so the
        // selection outline, drag hit-area and resize grip all hug the photograph
        return `<div class="note-item note-item-photo${selCls}${interactive ? '' : ' frozen'}" data-exid="${esc(it.exid)}" style="left:${it.x}%;top:${it.y}px;z-index:${it.z + 1};${it.wpct ? `width:${it.wpct}%` : ''}">
          <img src="${it.dataUrl}" ${it.w ? `width="${it.w}" height="${it.h}"` : ''} ${it.wpct ? 'style="width:100%;height:auto;max-width:none;max-height:none;"' : ''} alt="A photograph in this note" draggable="false">
        </div>`;
      }
      if (it.kind === 'audio') {
        return `<div class="note-item note-item-audio${selCls}${interactive ? '' : ' frozen'}" data-exid="${esc(it.exid)}" style="left:${it.x}%;top:${it.y}px;z-index:${it.z + 1}">
          ${playerRow(it.exid, it.durationSec, { item: true })}
        </div>`;
      }
      return `<div class="note-item note-item-text${selCls}${interactive ? '' : ' frozen'}" data-exid="${esc(it.exid)}" style="left:${it.x}%;top:${it.y}px;z-index:${it.z + 1};color:${it.color || CAP_COLORS[1].value};--s:${it.s || 1}"
        ${interactive ? 'contenteditable="false"' : ''} data-phtext="Write as little or as much as you want">${esc(it.text || '')}</div>`;
    }).join('');
    return `<div class="note-board${interactive ? '' : ' frozen-board'}${listed ? ' note-board-listed' : ''}" style="height:${bh}px" data-od-id="${interactive ? 'note-board' : 'note-board-view'}" role="${interactive ? 'application' : 'img'}" aria-label="${interactive ? 'The note — drag items anywhere; tap words to write, tap a recording to play' : 'The arrangement of this note'}">${inner}</div>`;
  }

  /* the board's height always settles to meet the lowest item — growing when
     something is dragged down, returning to its normal size when everything
     is back inside it */
  function settleBoardHeight(board) {
    if (!board) return;
    let need = 340;
    board.querySelectorAll('.note-item').forEach(el => {
      need = Math.max(need, el.offsetTop + el.offsetHeight + 18);
    });
    board.style.height = need + 'px';
  }
  function settleRenderedBoards(root) {
    (root || document).querySelectorAll('.note-board').forEach(board => {
      settleBoardHeight(board);
      board.querySelectorAll('img').forEach(img => {
        if (img.dataset.settleBound) return;
        img.dataset.settleBound = '1';
        img.addEventListener('load', () => settleBoardHeight(board));
      });
    });
  }

  /* layering: every item in the draft sits somewhere in the z order; these
     four moves work the same for words, photographs and recordings alike */
  function moveSelectedZ(dir) {
    const it = selectedItem();
    if (!it || draft.items.length < 2) return;
    const sorted = draft.items.slice().sort((a, b) => a.z - b.z);
    const from = sorted.indexOf(it);
    let to = from;
    if (dir === 'front') to = sorted.length - 1;
    else if (dir === 'back') to = 0;
    else if (dir === 1) to = Math.min(sorted.length - 1, from + 1);
    else if (dir === -1) to = Math.max(0, from - 1);
    if (to === from) return;
    sorted.splice(from, 1);
    sorted.splice(to, 0, it);
    sorted.forEach((x, i) => { x.z = i; });
    renderComposer();
  }
  function zTools(it) {
    const zs = draft.items.map(i => i.z);
    const multi = draft.items.length > 1;
    const atFront = !multi || it.z >= Math.max(...zs);
    const atBack = !multi || it.z <= Math.min(...zs);
    const zbtn = (act, label, icon, dis) =>
      `<button class="note-zbtn" type="button" data-nact="${act}" aria-label="${label}" title="${label}"${dis ? ' disabled aria-disabled="true"' : ''}>${icon}</button>`;
    return `<span class="note-zgroup" role="group" aria-label="Where this sits among the other things in the note">
      ${zbtn('z-front', 'Move to the front', ICO_ZTOP, atFront)}
      ${zbtn('z-fwd', 'Move forward', ICO_ZUP, atFront)}
      ${zbtn('z-back', 'Move backward', ICO_ZDOWN, atBack)}
      ${zbtn('z-bottom', 'Move to the back', ICO_ZBOTTOM, atBack)}
    </span>`;
  }
  function selectedToolbar() {
    const it = selectedItem();
    if (!it) {
      return `<p class="note-hint-inline note-toolbar-hint">Drag to arrange · tap words to write · drag a corner to resize · tap a bar to play its sound</p>`;
    }
    const kindLabel = it.kind === 'text' ? 'words' : it.kind === 'audio' ? 'recording' : 'photograph';
    const kindTools = it.kind === 'text'
      ? `<input type="color" class="note-colorwheel" value="${esc(asHex(it.color))}" aria-label="Choose the color of these words" title="Words color">`
      : it.kind === 'audio'
      ? `<button class="note-act" type="button" data-nact="sc-re">Re-record</button>`
      : '';
    return `<div class="note-captools" role="group" aria-label="The chosen ${kindLabel} — ${it.kind === 'text' ? 'color and layering' : 'layering'}">
      ${kindTools}
      ${zTools(it)}
    </div>`;
  }

  /* ---------- rendering: composer ---------- */
  function renderComposer(focusSel) {
    if (!draft) newDraft();
    const empty = !hasContent();
    const items = boardItems(draft);
    $view().innerHTML = `
      <div class="card quiet" data-od-id="note-composer">
        <div class="pcontrols"><button class="pctl" type="button" data-nact="back-home">Home</button></div>
        <div class="node-title">A note · not stored</div>
        <h1 class="prompt ink-underline" tabindex="-1">Keep something from this moment</h1>
        <p class="support">Words, photographs, sounds — place them anywhere in the space, on top of each other or apart. One of them alone is a complete note. You don't have to explain it. Nothing is stored unless you choose to keep it.</p>
        ${renderBoard(items, { interactive: true })}
        <div class="note-toolrow" data-od-id="note-toolrow">
          <button class="note-add" type="button" data-nact="sc-text" data-od-id="note-add-text">${ICO_PEN} Words</button>
          <button class="note-add" type="button" data-nact="photo-pick" data-od-id="note-add-photo">${ICO_PHOTO} A photo</button>
          <button class="note-add" type="button" data-nact="rec-open" data-od-id="note-invite-record">${ICO_MIC} A recording</button>
          <span class="note-trash has-cursor-tip" data-od-id="note-trash" data-tip="drag item here to delete" aria-hidden="true">${ICO_TRASH}</span>
        </div>
        ${recStrip()}
        <div class="note-toolbar" data-od-id="note-toolbar">${selectedToolbar()}</div>
        <input type="file" id="note-photo-input" class="sr-only" accept="image/*" tabindex="-1" aria-hidden="true">
        <div class="note-foot" data-od-id="note-foot">
          <button class="btn" type="button" data-nact="keep" data-od-id="note-keep" ${empty || busy() ? 'disabled aria-disabled="true"' : ''}>Keep this note</button>
          <button class="note-sharebtn" type="button" data-nact="share" data-od-id="note-share" ${empty || busy() ? 'disabled aria-disabled="true"' : ''}>Share…</button>
          <button class="note-act" type="button" data-nact="discard">Discard</button>
        </div>
        ${empty ? '<p class="note-hint">Words, a photo, or a recording are each enough on their own. Add any of them below, then place it where it belongs.</p>' : ''}
        ${busy() ? '<p class="note-hint">Stop the recording first.</p>' : ''}
        ${saveError ? '<div class="note dash" role="alert">Couldn’t keep this — the device’s local storage is full. Sharing or downloading a copy still works.</div>' : ''}
        ${confirmDiscard ? `<div class="note-confirm" role="alert">
          <span>Discard this note? It isn't stored anywhere.</span>
          <button class="note-act" type="button" data-nact="discard-yes"><b>Yes, discard</b></button>
          <button class="note-act" type="button" data-nact="discard-no">Keep working on it</button>
        </div>` : ''}
      </div>`;
    settleRenderedBoards($view());
    if (window.UI && UI.updateInspector) UI.updateInspector();
    const t = focusSel ? $view().querySelector(focusSel) : $view().querySelector('.prompt');
    if (t) t.focus({ preventScroll: false });
  }

  /* recording controls in a quiet strip under the tool row */
  function recStrip() {
    if (!recordOpen) return '';
    let inner = '';
    if (rec.state === 'denied') {
      inner = `<p class="note-hint" style="margin:0">The microphone stayed off — nothing was captured. Recording needs permission, which can be allowed in the browser's settings.</p>
        <div class="note-acts"><button class="note-act" type="button" data-nact="rec-dismiss">Back</button></div>`;
    } else if (rec.state === 'unsupported') {
      inner = `<p class="note-hint" style="margin:0">Recording isn't available in this browser. Words and photographs still work here.</p>
        <div class="note-acts"><button class="note-act" type="button" data-nact="rec-dismiss">Back</button></div>`;
    } else if (rec.state === 'asking') {
      inner = `<p class="note-hint" style="margin:0">Waiting for microphone permission… nothing is being captured yet.</p>`;
    } else if (rec.state === 'recording') {
      inner = `<div class="note-rec" data-od-id="note-recording">
          <span class="note-rec-dot" aria-hidden="true"></span>
          <span class="note-rec-time" id="note-rec-time" role="timer">0:00</span>
          <button class="note-act" type="button" data-nact="rec-stop"><b>Stop</b></button>
          <button class="note-act" type="button" data-nact="rec-cancel">Cancel — keep nothing</button>
        </div>`;
    } else {
      inner = `<button class="note-add" type="button" data-nact="rec-start" data-od-id="note-start-recording">${ICO_MIC} Start recording</button>
        <p class="note-hint" style="margin:0">The microphone is on only while you record. Stopping places a small bar on the board — still unsaved, like everything else here.</p>`;
    }
    return `<div class="note-recstrip" data-od-id="note-recstrip">${inner}</div>`;
  }

  /* ---------- keep (the only persistence point) ---------- */
  function keepNote() {
    if (!hasContent() || busy()) return;
    flushEdits();
    const notes = all();
    const note = {
      id: 'note-' + Date.now(),
      items: boardItems(draft).map(it => Object.assign({}, it)),
      savedAt: new Date().toISOString()
    };
    if (draft.versionOf) note.versionOf = draft.versionOf;
    notes.push(note);
    if (!persist(notes)) { saveError = true; renderComposer(); return; }
    renderSaved(note);
  }

  /* ---------- rendering: saved note ---------- */
  function renderSaved(note) {
    stopPlayer();
    $view().innerHTML = `
      <div class="card quiet" data-od-id="note-saved">
        <div class="pcontrols"><button class="pctl" type="button" data-nact="back-home">Home</button></div>
        <div class="node-title">Kept · stored on this device</div>
        <h1 class="prompt" tabindex="-1">Kept.</h1>
        <div class="note-status"><span class="note-dot stored" aria-hidden="true"></span>Saved on this device — only here, unless you share a copy or remove it</div>
        ${renderBoard(boardItems(note))}
        ${window.ROOM ? ROOM.relatedHtml(note) : ''}
        <div class="note-foot" data-od-id="note-foot">
          <button class="btn" type="button" data-nact="to-moments">Look at my notes</button>
          <button class="note-sharebtn" type="button" data-nact="share-saved" data-id="${esc(note.id)}">Share…</button>
          <button class="note-act" type="button" data-nact="remove-saved" data-id="${esc(note.id)}">Remove this note</button>
        </div>
        ${window.ROOM ? `<div class="ghostrow" data-od-id="note-room-acts">
          <button class="ghost" type="button" data-ract="notice-note" data-id="${esc(note.id)}">Notice what helped here</button>
          <button class="ghost" type="button" data-ract="room-from-note" data-id="${esc(note.id)}">Make room for this</button>
          <button class="ghost" type="button" data-ract="connect-note" data-id="${esc(note.id)}">Connect to another note</button>
          <button class="ghost" type="button" data-ract="version-note" data-id="${esc(note.id)}">Make another version</button>
        </div>` : ''}
        ${confirmRemoveId === note.id ? `<div class="note-confirm" role="alert">
          <span>Remove this note? This can't be undone.</span>
          <button class="note-act" type="button" data-nact="remove-saved-yes" data-id="${esc(note.id)}"><b>Yes, remove</b></button>
          <button class="note-act" type="button" data-nact="remove-saved-no">Keep it</button>
        </div>` : ''}
      </div>`;
    settleRenderedBoards($view());
    if (window.UI && UI.updateInspector) UI.updateInspector();
    const p = $view().querySelector('.prompt');
    if (p) p.focus({ preventScroll: false });
  }

  /* ---------- rendering: notes list section (inside Moments) ---------- */
  function kindLabel(note) {
    const items = boardItems(note);
    const parts = [];
    const photos = items.filter(i => i.kind === 'photo').length;
    const texts = items.filter(i => i.kind === 'text' && (i.text || '').trim()).length;
    const auds = items.filter(i => i.kind === 'audio').length;
    if (texts) parts.push(texts === 1 ? 'words' : texts + ' sets of words');
    if (photos) parts.push(photos === 1 ? 'a photograph' : photos + ' photographs');
    if (auds) parts.push(auds === 1 ? 'a recording (' + fmtTime(items.find(i => i.kind === 'audio').durationSec) + ')' : auds + ' recordings');
    return parts.join(' · ') || 'note';
  }
  function sectionHtml() {
    const notes = all().slice().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
    if (!notes.length) return '';
    return `<hr class="divider">
      <h2 class="h3 ink-underline">Kept notes</h2>
      <ul class="list">${notes.map(n => `
        <li data-od-id="kept-${esc(n.id)}">
          <div class="note-open" role="button" tabindex="0" data-nact="open-saved" data-id="${esc(n.id)}" aria-label="Open this note — ${esc(kindLabel(n))}">
            <b>${esc(kindLabel(n))}</b>
            <span class="sub">kept ${esc(String(n.savedAt || '').slice(0, 10))} · stored on this device</span>
            ${renderBoard(boardItems(n), { listed: true })}
          </div>
          ${confirmRemoveId === n.id
            ? `<div class="note-confirm" role="alert"><span>Remove this note? This can't be undone.</span>
               <button class="note-act" type="button" data-nact="remove-saved-yes" data-id="${esc(n.id)}"><b>Yes, remove</b></button>
               <button class="note-act" type="button" data-nact="remove-saved-no">Keep it</button></div>`
            : `<div class="note-acts">
                <button class="note-act" type="button" data-nact="share-saved" data-id="${esc(n.id)}">Share…</button>
                ${window.ROOM ? `<button class="note-act" type="button" data-ract="notice-note" data-id="${esc(n.id)}">Notice what helped</button>` : ''}
                <button class="note-act" type="button" data-nact="remove-saved" data-id="${esc(n.id)}">Remove</button></div>`}
        </li>`).join('')}</ul>`;
  }
  function refreshSection() {
    stopPlayer();
    const host = document.getElementById('notes-kept');
    if (host) { host.innerHTML = sectionHtml(); settleRenderedBoards(host); }
  }

  function pickPhoto() {
    const input = document.getElementById('note-photo-input');
    if (input) input.click();
  }
  function onPhotoChosen(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return; // picker cancelled — the note is unchanged
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // a new photo arrives sized against the draggable area itself: about
        // 70% of whichever note-space dimension is larger, keeping its shape
        const n = draft.items.filter(i => i.kind === 'photo').length;
        const board = $view().querySelector('.note-board');
        const br = board ? board.getBoundingClientRect() : null;
        const bw = br && br.width ? br.width : 600;
        const bh = br && br.height ? br.height : 340;
        const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
        const wpct = bw >= bh ? 70 : Math.min(170, (0.7 * bh * aspect) / bw * 100);
        const photoH = (wpct / 100) * bw / aspect;
        const y = Math.max(60, Math.round(photoH / 2 + 30)) + (n % 3) * 24;
        const it = addItem({ exid: exid(), kind: 'photo', x: 50, y, wpct: Math.round(wpct * 10) / 10, dataUrl: reader.result, w: img.naturalWidth, h: img.naturalHeight });
        selId = it.exid;
        renderComposer();
      };
      img.onerror = () => {
        const n = draft.items.filter(i => i.kind === 'photo').length;
        const it = addItem({ exid: exid(), kind: 'photo', x: 50, y: 200 + (n % 3) * 24, wpct: 70, dataUrl: reader.result, w: 0, h: 0 });
        selId = it.exid;
        renderComposer();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* words handled directly on the board — begin/edit/commit in place */
  function addText() {
    const it = addItem({ exid: exid(), kind: 'text', x: 50, y: 70, color: CAP_COLORS[1].value, text: '' });
    selId = it.exid;
    renderComposer();
    const el = $view().querySelector(`[data-exid="${it.exid}"]`);
    beginEdit(el);
  }
  function beginEdit(el) {
    if (!el) return;
    el.contentEditable = 'true';
    el.classList.add('editing');
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);
  }
  function endEdit(el) {
    if (!el || !draft) return;
    const it = draft.items.find(i => i.exid === el.getAttribute('data-exid'));
    el.contentEditable = 'false';
    el.classList.remove('editing');
    const text = (el.textContent || '').trim().replace(/\n{2,}/g, '\n');
    if (it) {
      if (!text) { draft.items = draft.items.filter(i => i.exid !== it.exid); if (selId === it.exid) selId = null; }
      else it.text = text;
    }
  }
  function flushEdits() {
    // commit any in-flight words before saving/sharing
    document.querySelectorAll('.note-item-text[contenteditable="true"]').forEach(endEdit);
  }

  /* drag + resize handling: pointer-based; threshold distinguishes arrange-drag from tap */
  let dragItem = null; // { el, startX, startY, moved }
  let resizeItem = null; // { el, it, cx, cy, d0, wpct0, s0, pid }
  function onItemDown(e) {
    const el = e.target.closest && e.target.closest('.note-item[data-exid]');
    if (!el || !draft) return;
    if (el.classList.contains('frozen')) return;
    if (el.getAttribute('contenteditable') === 'true' && el.classList.contains('editing')) return; // editing takes the pointer
    // dragging starts anywhere on the item except the play control of an audio bar
    if (e.target.closest && e.target.closest('.note-barplay')) return;
    const it = draft.items.find(i => i.exid === el.getAttribute('data-exid'));
    if (!it) return;
    // the corner grip of a selected photograph or set of words resizes it
    if (el.classList.contains('sel') && (it.kind === 'photo' || it.kind === 'text')) {
      const r = el.getBoundingClientRect();
      const nearCorner = e.clientX >= r.right - 14 && e.clientX <= r.right + 12 &&
                         e.clientY >= r.bottom - 14 && e.clientY <= r.bottom + 12;
      if (nearCorner) {
        const board = el.closest('.note-board');
        const br = board.getBoundingClientRect();
        resizeItem = {
          el, it,
          cx: r.left + r.width / 2, cy: r.top + r.height / 2,
          d0: Math.max(6, Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2))),
          wpct0: it.wpct || (r.width / br.width) * 100,
          s0: it.s || 1
        };
        el.setPointerCapture && el.setPointerCapture(e.pointerId);
        return;
      }
    }
    dragItem = { el, startX: e.clientX, startY: e.clientY, moved: false };
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
  }
  function onItemMove(e) {
    if (resizeItem) {
      const { el, it, cx, cy, d0, wpct0, s0 } = resizeItem;
      const f = Math.max(6, Math.hypot(e.clientX - cx, e.clientY - cy)) / d0;
      const board = el.closest('.note-board');
      if (it.kind === 'photo') {
        // width as % of the note space, on the item box itself; the photo keeps
        // its own shape and can grow to the full draggable area (height-dominant
        // cases exceed 100)
        it.wpct = Math.round(Math.min(170, Math.max(8, wpct0 * f)) * 10) / 10;
        el.style.width = it.wpct + '%';
      } else {
        // words grow as a whole — type and box together
        it.s = Math.round(Math.min(4, Math.max(0.4, s0 * f)) * 100) / 100;
        el.style.setProperty('--s', it.s);
      }
      settleBoardHeight(board);
      return;
    }
    if (!dragItem) return;
    const { el, startX, startY } = dragItem;
    if (!dragItem.moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
    dragItem.moved = true;
    const board = el.closest('.note-board');
    const rect = board.getBoundingClientRect();
    // anywhere on the note space: x clamps to the sides; y is free — the board
    // extends downward to meet wherever the item is placed
    const x = Math.min(98, Math.max(2, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, e.clientY - rect.top);
    el.style.left = x + '%';
    el.style.top = y + 'px';
    // hovering the trash with a dragged item telegraphs the drop
    const trash = document.querySelector('.note-toolrow .note-trash');
    let overTrash = false;
    if (trash) {
      const tr = trash.getBoundingClientRect();
      overTrash = e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom;
      trash.classList.toggle('over', overTrash);
      el.style.opacity = overTrash ? '0.35' : '';
    }
    dragItem.overTrash = overTrash;
    // live in both directions: the space grows to meet a downward drag and
    // returns to its normal size as items come back inside it
    settleBoardHeight(board);
    // touching an item brings it to the front
    const it = draft.items.find(i => i.exid === el.getAttribute('data-exid'));
    if (it) {
      it.x = Math.round(x * 10) / 10;
      it.y = Math.round(y);
      const top = Math.max(0, ...draft.items.map(i => i.z)) + 1;
      if (it.z < top - 1) { it.z = top; el.style.zIndex = String(it.z + 1); }
    }
  }
  function onItemUp(e) {
    if (resizeItem) {
      const b = resizeItem.el.closest('.note-board');
      resizeItem = null;
      settleBoardHeight(b);
      return;
    }
    if (!dragItem) return;
    const { el, moved, overTrash } = dragItem;
    dragItem = null;
    const trash = document.querySelector('.note-toolrow .note-trash');
    if (trash) trash.classList.remove('over');
    el.style.opacity = '';
    if (moved) {
      // dropping on the trash removes the item — words, photo or recording alike
      if (overTrash) {
        const ex = el.getAttribute('data-exid');
        stopPlayer();
        draft.items = draft.items.filter(i => i.exid !== ex);
        if (selId === ex) selId = null;
        renderComposer();
        return;
      }
      settleBoardHeight(el.closest('.note-board'));
      return;
    }
    {
      const ex = el.getAttribute('data-exid');
      const it = draft.items.find(i => i.exid === ex);
      selId = ex;
      renderComposer();
      if (it && it.kind === 'text') {
        const again = $view().querySelector(`[data-exid="${ex}"]`);
        beginEdit(again);
      }
    }
  }

  /* ---------- quiet sharing ---------- */
  function targetNote() {
    if (!shareTarget) return null;
    if (shareTarget.type === 'draft') {
      return { id: 'draft', items: boardItems(draft), unsaved: true };
    }
    const n = all().find(x => x.id === shareTarget.id);
    return n ? Object.assign({ unsaved: false, items: boardItems(n) }, n) : null;
  }
  function dataUrlToFile(dataUrl, fallbackName, type) {
    const comma = dataUrl.indexOf(',');
    const b64 = dataUrl.slice(comma + 1);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], fallbackName, { type: type || 'application/octet-stream' });
  }
  function audioExt(mime) {
    if (/mp4|m4a/i.test(mime)) return 'm4a';
    if (/ogg/i.test(mime)) return 'ogg';
    if (/mpeg|mp3/i.test(mime)) return 'mp3';
    if (/wav/i.test(mime)) return 'wav';
    return 'webm';
  }

  /* bake the whole board into one image so the recipient sees exactly what
     the user arranged — photos and words drawn in z-order at their placed
     positions; audio stays as separate files. Falls back to nothing visual. */
  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  async function compositeBoard(items) {
    const visuals = items.filter(it => it.kind === 'photo' || (it.kind === 'text' && (it.text || '').trim()));
    if (!visuals.length) return null;
    const imgs = {};
    await Promise.all(visuals.filter(it => it.kind === 'photo').map(async it => { imgs[it.exid] = await loadImage(it.dataUrl); }));
    // a square fallback surface — matches CSS board shape
    const SIZE = 1080;
    const cv = document.createElement('canvas');
    cv.width = SIZE; cv.height = SIZE;
    const cx = cv.getContext('2d');
    const metaBoard = document.querySelector('.note-board');
    let bw = SIZE, bh = SIZE;
    if (metaBoard) { const r = metaBoard.getBoundingClientRect(); if (r.width && r.height) { bw = r.width; bh = r.height; } }
    // words draw in the chosen Note-book Font so the shared image matches the page
    let noteFont = '';
    try {
      const v = document.querySelector('.main .view');
      if (v) noteFont = (getComputedStyle(v).getPropertyValue('--note-font') || '').trim();
    } catch (e) { /* fall back below */ }
    const wordFont = noteFont ? noteFont : '"Open Sans", sans-serif';
    visuals.forEach(it => {
      // x is % of width; y is px from the top — both mirror the live board
      const px = bw * it.x / 100, py = it.y;
      if (it.kind === 'photo') {
        const img = imgs[it.exid];
        if (!img || !img.naturalWidth) return;
        // resized photos travel at their placed width (% of the board);
        // older notes keep the intrinsic-clamped fallback
        const wpx = it.wpct
          ? bw * it.wpct / 100
          : img.naturalWidth * Math.min(1, (bw * 0.55) / img.naturalWidth);
        const hpx = wpx * img.naturalHeight / img.naturalWidth;
        cx.drawImage(img, px - wpx / 2, py - hpx / 2, wpx, hpx);
      } else {
        const fontPx = Math.max(13, Math.round(bw * 0.045)) * (it.s || 1);
        cx.font = '600 ' + fontPx + 'px ' + wordFont;
        cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.shadowColor = 'rgba(0,0,0,0.35)'; cx.shadowBlur = fontPx * 0.1;
        cx.fillStyle = it.color || CAP_COLORS[1].value;
        cx.fillText(it.text, px, py);
        cx.shadowBlur = 0;
      }
    });
    try { return cv.toDataURL('image/jpeg', 0.92); } catch (e) { return null; }
  }
  async function shareFiles(note) {
    const files = [];
    const items = note.items || [];
    const url = await compositeBoard(items);
    if (url) files.push(dataUrlToFile(url, 'the-arrangement.jpg', 'image/jpeg'));
    items.filter(it => it.kind === 'audio').forEach((it, i) => {
      files.push(dataUrlToFile(it.dataUrl, 'a-recording' + (i ? '-' + (i + 1) : '') + '.' + audioExt(it.mime), it.mime));
    });
    return files;
  }
  async function sendShare() {
    const note = targetNote();
    if (!note) { closeShare(); return; }
    shareState = 'sending'; renderShareSheet();
    const files = await shareFiles(note);
    try {
      if (files.length && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files });
        shareState = 'sent';
      } else if (!files.length && navigator.share) {
        await navigator.share({ text: noteTextOf(note) });
        shareState = 'sent';
      } else {
        shareState = 'unsupported';
      }
    } catch (err) {
      // cancelled at the system sheet — close quietly, nothing to report
      closeShare(); return;
    }
    renderShareSheet();
  }
  function noteTextOf(note) {
    return (note.items || []).filter(it => it.kind === 'text').map(it => it.text || '').filter(Boolean).join('\n\n');
  }
  function downloadPiece(which) {
    const note = targetNote();
    if (!note) return;
    if (which === 'photo') {
      compositeBoard(note.items || []).then(url => {
        if (!url) return;
        const a = document.createElement('a');
        a.href = url; a.download = 'the-arrangement.jpg'; a.click();
      });
      return;
    }
    const auds = (note.items || []).filter(it => it.kind === 'audio');
    if (which === 'audio' && auds.length) {
      auds.forEach((it, i) => {
        const a = document.createElement('a');
        a.href = it.dataUrl; a.download = 'a-recording' + (i ? '-' + (i + 1) : '') + '.' + audioExt(it.mime); a.click();
      });
      return;
    }
    const text = noteTextOf(note);
    if (which === 'text' && text) {
      const a = document.createElement('a');
      a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
      a.download = 'the-words.txt';
      a.click();
    }
  }
  function copyText() {
    const note = targetNote();
    const text = note ? noteTextOf(note) : '';
    if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  }
  function openShare(target) {
    shareTarget = target;
    shareState = 'ready';
    renderShareSheet();
  }
  function closeShare() {
    shareTarget = null; shareState = null;
    const bd = document.getElementById('note-share-backdrop');
    if (bd) bd.remove();
  }
  function renderShareSheet() {
    const note = targetNote();
    if (!note) return closeShare();
    flushEdits();
    let bd = document.getElementById('note-share-backdrop');
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'note-share-backdrop';
      bd.className = 'scn-modal-backdrop';
      document.body.appendChild(bd);
      bd.addEventListener('click', (e) => { if (e.target === bd) closeShare(); });
    }
    const items = note.items || [];
    const hasVisual = items.some(it => it.kind === 'photo' || (it.kind === 'text' && (it.text || '').trim()));
    const auds = items.filter(it => it.kind === 'audio');
    const texts = noteTextOf(note);
    const lines = [];
    if (hasVisual) lines.push('The arrangement, as one image, exactly as you placed it');
    auds.forEach(a => lines.push('A recording (' + fmtTime(a.durationSec) + ')'));
    if (texts && !hasVisual) lines.push('These words: “' + (texts.length > 80 ? texts.slice(0, 80) + '…' : texts) + '”');
    let body = '';
    if (shareState === 'sent') {
      body = `<p class="support">Sent as a copy. The note here is unchanged.</p>
        <div class="btnrow"><button class="btn2" type="button" data-nact="share-close">Close</button></div>`;
    } else if (shareState === 'unsupported') {
      const hasVisual2 = hasVisual;
      body = `<p class="support">This browser can't pass media to another app directly. You can download a copy and send it yourself, in your own way.</p>
        <div class="btnrow">
          ${hasVisual2 ? '<button class="btn2" type="button" data-nact="share-download-photo">Download the arrangement</button>' : ''}
          ${auds.length ? '<button class="btn2" type="button" data-nact="share-download-audio">Download the recording' + (auds.length > 1 ? 's' : '') + '</button>' : ''}
          ${texts ? '<button class="btn2" type="button" data-nact="share-copy-text">Copy the words</button>' : ''}
          <button class="note-act" type="button" data-nact="share-close">Not now</button>
        </div>`;
    } else {
      body = `<div class="note-share-summary" role="note">
          <div class="note-kind" style="margin-bottom:4px">Exactly what will be sent</div>
          ${lines.map(l => `<div class="sline">${esc(l)}</div>`).join('')}
        </div>
        <p class="support">It goes as it is — no caption, no explanation needed. Nothing is posted anywhere; one person receives it, the way you'd hand them a page.</p>
        ${note.unsaved ? '<p class="note-hint">This note isn’t kept here — sending passes on a copy; the note itself stays only on this screen.</p>' : ''}
        <div class="btnrow">
          <button class="btn" type="button" data-nact="share-send" data-od-id="note-share-send" ${shareState === 'sending' ? 'disabled' : ''}>${shareState === 'sending' ? 'Preparing…' : 'Choose how to send it'}</button>
          <button class="note-act" type="button" data-nact="share-close">Not now</button>
        </div>`;
    }
    bd.innerHTML = `<div class="scn-modal note-share-sheet" role="dialog" aria-modal="true" aria-labelledby="note-share-h" data-od-id="note-share-sheet">
      <div class="node-title">Share · a copy leaves the app</div>
      <h1 class="prompt" id="note-share-h">Pass this note to someone</h1>
      ${body}
    </div>`;
    const focusEl = bd.querySelector('[data-nact="share-send"]') || bd.querySelector('[data-nact="share-close"]');
    if (focusEl && shareState === 'ready') focusEl.focus();
  }

  /* ---------- navigation ---------- */
  function isOpen() { return !!$view().querySelector('[data-od-id="note-composer"], [data-od-id="note-saved"]'); }
  function goHome() {
    stopPlayer();
    if (rec.state === 'recording' || rec.state === 'asking') { rec.cancelled = true; stopRecording(); cleanupRec(); rec.state = 'idle'; }
    draft = null; confirmRemoveId = null;
    closeShare();
    if (window.UI && UI.renderHome) UI.renderHome();
  }

  /* ---------- events ---------- */
  function init() {
    $view().addEventListener('click', (e) => {
      // [data-nact], not button[data-nact]: the play control inside a board is a
      // role="button" span, and it must win over the kept-note card it sits in
      const btn = e.target.closest && e.target.closest('[data-nact]');
      if (!btn) return;
      const act = btn.getAttribute('data-nact');
      const id = btn.getAttribute('data-id');
      const acts = {
        'open-composer': () => { newDraft(); rec.notice = ''; renderComposer(); },
        'photo-pick': () => pickPhoto(),
        'sc-text': () => addText(),
        'z-front': () => moveSelectedZ('front'),
        'z-fwd': () => moveSelectedZ(1),
        'z-back': () => moveSelectedZ(-1),
        'z-bottom': () => moveSelectedZ('back'),
        'sc-re': () => startRecording(),
        'rec-open': () => { recordOpen = true; renderComposer('[data-od-id="note-start-recording"]'); },
        'rec-start': () => startRecording(),
        'rec-stop': () => stopRecording(),
        'rec-cancel': () => cancelRecording(),
        'rec-dismiss': () => { rec.state = 'idle'; recordOpen = false; renderComposer(); },
        'keep': () => keepNote(),
        'discard': () => {
          if (!hasContent()) return goHome();
          confirmDiscard = true; renderComposer();
        },
        'discard-yes': () => goHome(),
        'discard-no': () => { confirmDiscard = false; renderComposer(); },
        'back-home': () => goHome(),
        'to-moments': () => { stopPlayer(); closeShare(); confirmRemoveId = null; if (window.UI && UI.renderMoments) UI.renderMoments(); },
        'open-saved': () => {
          stopPlayer(); closeShare(); confirmRemoveId = null;
          const n = all().find(x => x.id === id);
          if (n) renderSaved(n);
        },
        'share': () => openShare({ type: 'draft' }),
        'share-saved': () => openShare({ type: 'saved', id }),
        'remove-saved': () => {
          confirmRemoveId = id;
          const saved = $view().querySelector('[data-od-id="note-saved"]');
          if (saved) { const n = all().find(x => x.id === id); if (n) renderSaved(n); }
          else refreshSection();
        },
        'remove-saved-yes': () => {
          stopPlayer(); removeNote(id); confirmRemoveId = null;
          const saved = $view().querySelector('[data-od-id="note-saved"]');
          if (saved) goHome(); else refreshSection();
        },
        'remove-saved-no': () => {
          confirmRemoveId = null;
          const saved = $view().querySelector('[data-od-id="note-saved"]');
          if (saved) { const n = all().find(x => x.id === id); if (n) renderSaved(n); }
          else refreshSection();
        },
        'play': () => {
          let dataUrl = null;
          const draftItem = draft && draft.items.find(i => i.exid === id);
          if (draftItem && draftItem.kind === 'audio') dataUrl = draftItem.dataUrl;
          else {
            const n = all().find(x => x.id === id || boardItems(x).some(i => i.exid === id));
            if (n) { const it = boardItems(n).find(i => i.exid === id || i.kind === 'audio'); if (it && it.kind === 'audio') dataUrl = it.dataUrl; }
          }
          if (dataUrl) togglePlay(id, dataUrl);
        }
      };
      if (acts[act]) acts[act]();
    });

    /* share-sheet buttons live outside #view (the sheet is appended to body) */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('#note-share-backdrop button[data-nact]');
      if (!btn) return;
      const act = btn.getAttribute('data-nact');
      if (act === 'share-send') sendShare();
      if (act === 'share-close') closeShare();
      if (act === 'share-download-photo') downloadPiece('photo');
      if (act === 'share-download-audio') downloadPiece('audio');
      if (act === 'share-copy-text') copyText();
    });

    $view().addEventListener('change', (e) => {
      if (e.target && e.target.id === 'note-photo-input') onPhotoChosen(e.target);
    });

    /* the color wheel: live-updates the chosen words while the picker is open,
       then settles the toolbar once it closes */
    $view().addEventListener('input', (e) => {
      if (!e.target || !e.target.classList || !e.target.classList.contains('note-colorwheel')) return;
      const it = selectedItem();
      if (!it || it.kind !== 'text') return;
      it.color = e.target.value;
      const el = $view().querySelector(`[data-exid="${it.exid}"]`);
      if (el) el.style.color = it.color;
    });
    $view().addEventListener('change', (e) => {
      if (!e.target || !e.target.classList || !e.target.classList.contains('note-colorwheel')) return;
      const it = selectedItem();
      if (it && it.kind === 'text') { it.color = asHex(e.target.value); renderComposer(); }
    });

    $view().addEventListener('focusout', (e) => {
      const el = e.target.closest && e.target.closest('.note-item-text.editing');
      if (el) { endEdit(el); renderComposer(); }
    }, true);
    $view().addEventListener('pointerdown', onItemDown);
    $view().addEventListener('pointermove', onItemMove);
    $view().addEventListener('pointerup', onItemUp);

    /* Enter / Space activates non-button controls that carry data-nact
       (the kept-note card opener; same grammar as the Scenario boxes) */
    $view().addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest && e.target.closest('[data-nact][role="button"]');
      if (!el || el.tagName === 'BUTTON') return;
      e.preventDefault();
      el.click();
    });

    /* Escape: close the share sheet first; otherwise leave the note quietly.
       Capture phase so the app's global flow-exit handler never sees it here.
       Do not exit while text is being edited. */
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const editing = e.target.closest && e.target.closest('.note-item-text.editing, textarea, input');
      if (editing) return;
      if (document.getElementById('note-share-backdrop')) { e.stopPropagation(); closeShare(); return; }
      if (isOpen()) { e.stopPropagation(); goHome(); }
    }, true);

    /* If the user navigates away by any other route (topnav, logo, Home),
       the microphone must not stay on and playback must stop. */
    new MutationObserver(() => {
      if (isOpen()) return;
      if (rec.state === 'recording' || rec.state === 'asking') { rec.cancelled = true; stopRecording(); cleanupRec(); rec.state = 'idle'; }
      if (player.el && !document.querySelector('[data-player-for]')) stopPlayer();
      if (document.getElementById('note-share-backdrop') && !$view().querySelector('[data-od-id="note-composer"], [data-od-id="note-saved"], #notes-kept')) closeShare();
    }).observe($view(), { childList: true });
  }

  function openComposer(seedItems, meta) {
    newDraft();
    if (seedItems && seedItems.length) {
      draft.items = seedItems.map(it => Object.assign({}, it, { exid: exid() }));
      draft.items.forEach((it, i) => { it.z = i + 1; });
    }
    if (meta && meta.versionOf) draft.versionOf = meta.versionOf;
    renderComposer();
  }

  /* small public surface for the making-room module (room.js) */
  const get = (id) => all().find(n => n.id === id) || null;
  function openSaved(id) {
    const n = get(id);
    if (n) { stopPlayer(); closeShare(); confirmRemoveId = null; renderSaved(n); }
  }

  function navSnapshot() { const saved = structuredClone({draft,selId,recordOpen,saveError,confirmDiscard,confirmRemoveId,shareTarget,shareState}); return () => { ({draft,selId,recordOpen,saveError,confirmDiscard,confirmRemoveId,shareTarget,shareState} = structuredClone(saved)); }; }
  return { navSnapshot, navigationBusy: busy,
    init, sectionHtml, openComposer, openSaved,
    get, all, itemsOf: boardItems,
    boardHtml: (note) => renderBoard(boardItems(note), { listed: true }),
    settleBoards: settleRenderedBoards
  };
})();

window.NOTES = NOTES;
