/* Elemental rooms — two Self-Explorations with animated elemental
   fields. "Furnace of rage" is a low ember field; "In memory" is
   deep water. Each room gives space for visual expression first: a tray of
   small objects to arrange freely, plus a few words if wanted. Keeping is
   explicit — nothing is stored unless "Keep this" is chosen. */
'use strict';
window.ELEMENTAL = (() => {
  const svg = inner => `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${inner}</svg>`;
  const ROOMS = {
    fury: {
      title: 'Furnace of rage',
      intro: 'Anger, without the requirement to calm down, reframe it, or find the lesson.',
      hint: 'A tray of small objects waits below — set them wherever the fury sits.',
      prompts: [
        'What happened, in your own words.',
        'Where does it sit in your body right now?',
        'If it could speak without consequences, what would it say?',
        'Anything else it needs said?',
      ],
      objects: [
        { key: 'ember-bowl', label: 'A bowl of embers', svg: svg('<circle cx="24" cy="22" r="11" fill="#ff9a3c" opacity=".22"/><path d="M10 28a14 12 0 0 0 28 0z" fill="#5a2c16"/><circle cx="19" cy="22" r="3" fill="#ff9a3c"/><circle cx="25" cy="19" r="2.4" fill="#ffc46b"/><circle cx="30" cy="23" r="2" fill="#ff7a2e"/>') },
        { key: 'charred-branch', label: 'A charred branch', svg: svg('<path d="M14 42 L28 16 M28 16 L38 8 M28 16 L37 22 M21 30 L13 26" stroke="#3a2418" stroke-width="3.5" stroke-linecap="round" fill="none"/><circle cx="38" cy="8" r="2.6" fill="#ff8a3c"/>') },
        { key: 'red-thread', label: 'A red thread', svg: svg('<path d="M8 32c6-8 10 4 16-2s8-8 14-2" stroke="#c0392b" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="8" cy="32" r="2.6" fill="#c0392b"/>') },
        { key: 'stone', label: 'A stone', svg: svg('<path d="M10 33c2-11 13-17 22-13 7 3 9 11 3 16-7 6-21 5-25-3z" fill="#8a5a3c"/><path d="M16 28c3-5 9-8 14-7" stroke="#c08a5e" stroke-width="2" fill="none" stroke-linecap="round"/>') },
        { key: 'frame', label: 'A small frame', svg: svg('<rect x="12" y="10" width="24" height="20" rx="1.5" fill="#8a6f4d"/><rect x="16" y="14" width="16" height="12" fill="#2a1408"/><path d="M16 22l6-4 4 5 6-6" stroke="#e08a3c" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M18 30l4 8M30 30l-4 8" stroke="#8a6f4d" stroke-width="2" stroke-linecap="round"/>') },
      ],
    },
    grief: {
      title: 'In memory',
      intro: 'For a person, a hard year, or a version of you that is gone. Nothing here needs to be positive.',
      hint: 'A tray of small objects waits below — arrange them however feels right.',
      prompts: [
        'Who or what is this for?',
        'What do you want kept about them?',
        'What do you miss most plainly?',
        'Anything else that wants saying?',
      ],
      objects: [
        { key: 'candle', label: 'A candle', svg: svg('<circle cx="24" cy="12" r="9" fill="#e8b64c" opacity=".25"/><rect x="20" y="20" width="8" height="20" rx="2" fill="#e9e2d2"/><rect x="23" y="14" width="2" height="7" fill="#8a7a5a"/><path d="M24 3c3 4 3 7 0 10-3-3-3-6 0-10z" fill="#f2b134"/>') },
        { key: 'stone', label: 'A stone', svg: svg('<path d="M10 33c2-11 13-17 22-13 7 3 9 11 3 16-7 6-21 5-25-3z" fill="#7d94a6"/><path d="M16 28c3-5 9-8 14-7" stroke="#b9cede" stroke-width="2" fill="none" stroke-linecap="round"/>') },
        { key: 'flower', label: 'A flower', svg: svg('<path d="M24 44V26" stroke="#6f8f6a" stroke-width="2.5" stroke-linecap="round"/><g fill="#c9d8e2"><ellipse cx="24" cy="11" rx="4.5" ry="7"/><ellipse cx="24" cy="11" rx="4.5" ry="7" transform="rotate(72 24 18)"/><ellipse cx="24" cy="11" rx="4.5" ry="7" transform="rotate(144 24 18)"/><ellipse cx="24" cy="11" rx="4.5" ry="7" transform="rotate(216 24 18)"/><ellipse cx="24" cy="11" rx="4.5" ry="7" transform="rotate(288 24 18)"/></g><circle cx="24" cy="18" r="4" fill="#e8c86a"/>') },
        { key: 'photo', label: 'A photo of your own', photo: true, svg: svg('<rect x="9" y="13" width="30" height="22" rx="2.5" fill="#22384c"/><circle cx="18" cy="21" r="4" fill="#e8c86a"/><path d="M9 31l9-7 6 5 5-4 9 6v4H9z" fill="#6f8f6a"/><rect x="9" y="13" width="30" height="22" rx="2.5" fill="none" stroke="#8a6f4d" stroke-width="2.5"/>') },
      ],
    },
  };

  const $ = s => document.querySelector(s);
  const view = () => $('#view');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let stopScene = null;

  /* ---------- animated elemental fields ---------- */
  function startScene(canvas, element) {
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0, stopped = false, t = Math.random() * 10;
    const parts = [];
    function size() {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function newPart(anyY) {
      if (element === 'fury') return { x: Math.random() * w, y: anyY ? Math.random() * h : h + 10, s: 1 + Math.random() * 2.6, vy: .25 + Math.random() * .7, vx: (Math.random() - .5) * .3, life: Math.random() * 6.28 };
      return { x: Math.random() * w, y: anyY ? Math.random() * h : -10, s: .8 + Math.random() * 2.2, vy: .12 + Math.random() * .3, vx: (Math.random() - .5) * .25, life: Math.random() * 6.28 };
    }
    function paint() {
      t += .016;
      let g;
      if (element === 'fury') {
        g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#160a08'); g.addColorStop(.55, '#2a100a'); g.addColorStop(1, '#471a0c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        const breathe = .5 + .5 * Math.sin(t * .7);
        const rg = ctx.createRadialGradient(w / 2, h * 1.02, 10, w / 2, h * 1.02, w * .75);
        rg.addColorStop(0, `rgba(255,${120 + Math.round(40 * breathe)},40,${(.28 + .12 * breathe).toFixed(2)})`);
        rg.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      } else {
        g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#0a2033'); g.addColorStop(.5, '#0d2a40'); g.addColorStop(1, '#081726');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const sx = w * (.2 + .3 * i) + Math.sin(t * .12 + i * 2) * 20;
          const lg = ctx.createLinearGradient(sx, 0, sx + 60, h);
          lg.addColorStop(0, 'rgba(150,200,230,.10)'); lg.addColorStop(1, 'rgba(150,200,230,0)');
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(sx, 0); ctx.lineTo(sx + 44, 0); ctx.lineTo(sx + 110, h); ctx.lineTo(sx + 66, h);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      for (const p of parts) {
        p.life += .03;
        if (element === 'fury') {
          p.y -= p.vy; p.x += p.vx + Math.sin(p.life) * .3;
          if (p.y < -12) Object.assign(p, newPart(false));
          const a = .35 + .35 * Math.abs(Math.sin(p.life * 2));
          ctx.fillStyle = `rgba(255,${140 + Math.round(60 * Math.random())},60,${a.toFixed(2)})`;
        } else {
          p.y += p.vy; p.x += p.vx + Math.sin(p.life) * .25;
          if (p.y > h + 12) Object.assign(p, newPart(false));
          const a = .12 + .14 * Math.abs(Math.sin(p.life));
          ctx.fillStyle = `rgba(180,215,235,${a.toFixed(2)})`;
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill();
      }
    }
    function frame() { if (stopped) return; paint(); raf = requestAnimationFrame(frame); }
    size();
    for (let i = 0; i < (element === 'fury' ? 70 : 60); i++) parts.push(newPart(true));
    paint();
    if (!reduced) raf = requestAnimationFrame(frame);
    const onVis = () => {
      if (stopped) return;
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!reduced && !raf) raf = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', size);
    return function stop() {
      stopped = true; cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', size);
    };
  }
  function stop() { if (stopScene) { stopScene(); stopScene = null; } }
  window.addEventListener('pagehide', stop);

  /* ---------- the room ---------- */
  const FREE_SLOTS = [[30, 32], [66, 28], [46, 55], [24, 66], [70, 62], [50, 38]];
  function roomHTML(element) {
    const R = ROOMS[element];
    if (element === 'grief') return griefRoomHTML(R);
    return `
    <div class="card el-room" data-od-id="elemental-room-${element}" data-page="elemental-room">
      <div class="pcontrols"><button class="pctl" type="button" data-el="back">Self-Explorations</button></div>
      <div class="el-pad">
        <div class="el-field el-${element}" id="el-field">
          <canvas class="el-canvas" aria-hidden="true"></canvas>
          <div class="el-title"><b>${esc(R.title)}</b><span>${esc(R.intro)}</span></div>
          <div class="el-stage" id="el-stage"><p class="el-hint" id="el-hint">${esc(R.hint)}</p></div>
          <div class="el-dock">
            <div class="el-chip el-q"><p id="el-qtext"></p><button type="button" class="el-link" data-el="another">Another question</button></div>
            <div class="el-chip el-w"><label class="sr-only" for="el-text">Your words</label><textarea id="el-text" rows="2" placeholder="Write as little or as much as you like…"></textarea></div>
            <div class="el-chip el-tray" id="el-tray" role="group" aria-label="Small objects to place in the room"></div>
            <div class="el-actions">
              <button type="button" class="el-keep" data-el="keep">Keep this</button>
              <button type="button" class="el-ghost" data-el="leave">Leave</button>
            </div>
            <p class="el-note" id="el-note" role="status"></p>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* In Memory — normal background, a rainy window holding the altar,
     and a dial beside it for how heavy the grief (and rain) feels. */
  const GRIEF_LEVELS = ['a little glum', '', '', '', 'weeping an ocean of grief'];
  function griefRoomHTML(R) {
    const level = griefRainLevel();
    return `
    <div class="card el-room" data-od-id="elemental-room-grief" data-page="elemental-room">
      <div class="pcontrols"><button class="pctl" type="button" data-el="back">Self-Explorations</button></div>
      <div class="el-pad">
        <div class="el-field el-grief el-grief-new" id="el-field">
          <div class="el-title"><b>${esc(R.title)}</b><span>${esc(R.intro)}</span></div>
          <div class="grief-window-row">
            <div class="grief-window" id="grief-window">
              <canvas class="grief-rain-canvas" id="grief-rain" aria-hidden="true"></canvas>
              <div class="el-stage" id="el-stage"><p class="el-hint" id="el-hint">${esc(R.hint)}</p></div>
              <div class="grief-window-frame" aria-hidden="true"></div>
              <div class="grief-window-sill" aria-hidden="true"></div>
            </div>
            <div class="grief-dial-col">
              <div class="grief-dial" id="grief-dial">
                <p class="grief-dial-caption">How heavy does the grief feel right now?</p>
                <div class="grief-dial-body">
                  <div class="grief-knob" role="slider" tabindex="0" aria-label="How heavy the grief feels"
                       aria-valuemin="0" aria-valuemax="4" aria-valuenow="${level}" aria-valuetext="${esc(griefLevelLabel(level))}"
                       data-level="${level}" style="touch-action:none">
                    <span class="grief-knob-pointer"></span>
                  </div>
                  <div class="grief-settings" aria-hidden="true">
                    ${[4, 3, 2, 1, 0].map(l => `
                      <button type="button" tabindex="-1" class="grief-setting${l === level ? ' on' : ''}" data-set="${l}">
                        <span class="grief-setting-line"></span><span class="grief-setting-label">${esc(GRIEF_LEVELS[l])}</span>
                      </button>`).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="el-dock">
            <div class="el-chip el-q"><p id="el-qtext"></p><button type="button" class="el-link" data-el="another">Another question</button></div>
            <div class="el-chip el-w"><label class="sr-only" for="el-text">Your words</label><textarea id="el-text" rows="2" placeholder="Write as little or as much as you like…"></textarea></div>
            <div class="el-chip el-tray" id="el-tray" role="group" aria-label="Small objects to place in the room"></div>
            <div class="el-actions">
              <button type="button" class="el-keep" data-el="keep">Keep this</button>
              <button type="button" class="el-ghost" data-el="leave">Leave</button>
            </div>
            <p class="el-note" id="el-note" role="status"></p>
          </div>
        </div>
      </div>
    </div>`;
  }
  function griefLevelLabel(l) { return GRIEF_LEVELS[l] || ('level ' + (l + 1) + ' of 5'); }
  function griefRainLevel() {
    try { const v = JSON.parse(localStorage.getItem('fsaw.grief.v1') || '{}').rain; return Number.isInteger(v) ? clamp(v, 0, 4) : 1; }
    catch (e) { return 1; }
  }
  function setGriefRainLevel(l) {
    l = clamp(Math.round(l), 0, 4);
    try { localStorage.setItem('fsaw.grief.v1', JSON.stringify({ rain: l })); } catch (e) { /* ignore */ }
    const dial = $('#grief-dial');
    if (dial) {
      const knob = dial.querySelector('.grief-knob');
      knob.dataset.level = l;
      knob.setAttribute('aria-valuenow', l);
      knob.setAttribute('aria-valuetext', griefLevelLabel(l));
      dial.querySelectorAll('.grief-setting').forEach(b => b.classList.toggle('on', Number(b.dataset.set) === l));
    }
    if (typeof griefRainSet === 'function') griefRainSet(l);
  }
  let griefRainSet = null;

  /* Rain falling outside the window. Heavier with the dial level. */
  function startRain(canvas) {
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0, stopped = false;
    let level = griefRainLevel();
    griefRainSet = l => { level = l; seed(); };
    let drops = [];
    function size() {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    function seed() {
      // More drops, faster and longer as the level rises.
      const n = [36, 70, 120, 180, 260][level];
      drops = Array.from({ length: n }, () => ({
        x: Math.random() * (w + 40) - 20,
        y: Math.random() * h,
        len: 9 + Math.random() * 8 + level * 4,
        spd: 3.2 + Math.random() * 2.4 + level * 1.9,
        op: .28 + Math.random() * .22 + level * .06,
      }));
    }
    function paint() {
      // Dusky sky outside.
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#3a4656'); g.addColorStop(.6, '#2c3644'); g.addColorStop(1, '#232b36');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // Faint distant hills.
      ctx.fillStyle = 'rgba(18,24,32,.55)';
      ctx.beginPath(); ctx.moveTo(0, h);
      ctx.quadraticCurveTo(w * .25, h * .62, w * .5, h * .78);
      ctx.quadraticCurveTo(w * .75, h * .92, w, h * .7);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#aebfd0'; ctx.lineCap = 'round';
      for (const d of drops) {
        d.y += d.spd; d.x -= d.spd * .18;
        if (d.y > h + 20) { d.y = -20; d.x = Math.random() * (w + 40) - 20; }
        ctx.globalAlpha = Math.min(.9, d.op);
        ctx.lineWidth = 1 + level * .28;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.len * .18, d.y + d.len); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    function frame() { if (stopped) return; paint(); raf = requestAnimationFrame(frame); }
    size();
    paint();
    if (!reduced) raf = requestAnimationFrame(frame);
    const onVis = () => {
      if (stopped) return;
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!reduced && !raf) raf = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', size);
    const stop = function () {
      stopped = true; cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', size);
      if (griefRainSet) griefRainSet = null;
    };
    return stop;
  }

  function wireGriefDial() {
    const dial = $('#grief-dial');
    if (!dial) return;
    const knob = dial.querySelector('.grief-knob');
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
      setGriefRainLevel(startLevel + d);
      startY = e.clientY; startLevel = clamp(startLevel + d, 0, 4);
    });
    const stop = () => { dragging = false; };
    knob.addEventListener('pointerup', stop);
    knob.addEventListener('pointercancel', stop);
    knob.addEventListener('keydown', e => {
      const cur = Number(knob.dataset.level) || 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); setGriefRainLevel(cur + 1); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); setGriefRainLevel(cur - 1); }
    });
    dial.querySelectorAll('.grief-setting').forEach(btn => {
      btn.addEventListener('click', () => setGriefRainLevel(Number(btn.dataset.set)));
    });
  }

  function openRoom(element) {
    if (!ROOMS[element]) element = 'fury';
    if (element === 'fury' && window.FURY_ROOM) { stop(); window.FURY_ROOM.open(); return; }
    stop();
    view().innerHTML = roomHTML(element);
    const R = ROOMS[element];
    const stage = $('#el-stage'), tray = $('#el-tray'), note = $('#el-note'),
      text = $('#el-text'), qtext = $('#el-qtext');
    let qi = 0;
    qtext.textContent = R.prompts[0];
    if (element === 'grief') {
      stopScene = startRain(view().querySelector('#grief-rain'));
      wireGriefDial();
      /* enhance() runs on the next microtask via MutationObserver and clears
         the About text, so set ours on a macrotask after it. */
      setTimeout(() => {
        if (window.ITERATION && typeof window.ITERATION.setPageAbout === 'function') {
          window.ITERATION.setPageAbout(
            'A quiet room for grief — for a person, a hard year, or a version of you that is gone. Nothing here needs to be positive. Outside the window the rain falls; turn the dial beside it from "a little glum" to "weeping an ocean of grief" and the rain falls heavier with how heavy it feels. Arrange the small objects on the altar below however feels right, and write as little or as much as you like.',
            'About this exploration'
          );
        }
      }, 0);
    } else {
      stopScene = startScene(view().querySelector('.el-canvas'), element);
    }

    const placed = []; // {uid,key,x,y,el,label}
    const trayKeys = R.objects.map(o => o.key);
    const objByKey = k => R.objects.find(o => o.key === k);

    function renderTray() {
      tray.innerHTML = R.objects.filter(o => trayKeys.includes(o.key)).map(o =>
        `<button type="button" class="el-tray-obj" data-obj="${esc(o.key)}" title="${esc(o.label)}" aria-label="${o.photo ? 'Add ' : 'Place '}${esc(o.label)}" style="touch-action:none">${o.svg}</button>`).join('');
      tray.querySelectorAll('.el-tray-obj').forEach(attachTray);
    }
    function freeSlot() {
      for (const [x, y] of FREE_SLOTS) {
        if (!placed.some(p => Math.hypot(p.x - x, p.y - y) < 16)) return { x, y };
      }
      return { x: 20 + Math.random() * 60, y: 25 + Math.random() * 45 };
    }
    function addPlaced(key, x, y, extra) {
      const o = objByKey(key); if (!o) return null;
      const uid = 'p' + Math.random().toString(36).slice(2);
      const d = document.createElement('div');
      d.className = 'el-placed' + (o.photo ? ' el-photo' : ''); d.dataset.uid = uid;
      d.style.left = x + '%'; d.style.top = y + '%';
      d.style.touchAction = 'none';
      d.tabIndex = 0; d.setAttribute('role', 'button');
      const rec = { uid, key, x, y, el: d, label: o.label, img: null, frame: 'none' };
      if (o.photo && extra && typeof extra.img === 'string' && extra.img.indexOf('data:image/') === 0) {
        rec.img = extra.img;
        rec.frame = FRAMES.some(f => f.key === extra.frame) ? extra.frame : 'none';
        d.setAttribute('aria-label', `${o.label} — drag to move, tap for frame options`);
        d.innerHTML = `<div class="photo-frame photo-frame-${rec.frame}"><img src="${rec.img}" alt="${esc(o.label)}"></div><button type="button" class="el-rm" tabindex="-1" aria-label="Remove ${esc(o.label)}">×</button>`;
      } else {
        d.setAttribute('aria-label', `${o.label} — drag to move, Enter for options`);
        d.innerHTML = `${o.svg}<button type="button" class="el-rm" tabindex="-1" aria-label="Remove ${esc(o.label)}">×</button>`;
      }
      stage.append(d);
      placed.push(rec);
      $('#el-hint')?.remove();
      attachPlaced(rec);
      return rec;
    }
    function removePlaced(rec) {
      const i = placed.indexOf(rec);
      if (i >= 0) placed.splice(i, 1);
      rec.el.remove();
      if (!trayKeys.includes(rec.key)) { trayKeys.push(rec.key); renderTray(); }
    }

    /* ---------- your own photo: source, file, frame ---------- */
    const FRAMES = [
      { key: 'none', label: 'No frame' },
      { key: 'wood', label: 'Wooden' },
      { key: 'dark', label: 'Dark' },
      { key: 'white', label: 'White' },
    ];
    function elModal(html) {
      const close = () => ov.remove();
      const ov = document.createElement('div');
      ov.className = 'el-modal-ov';
      ov.innerHTML = `<div class="el-modal" role="dialog" aria-modal="true">${html}</div>`;
      view().querySelector('.el-room').append(ov);
      ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
      return { ov, close };
    }
    function choosePhotoSource() {
      return new Promise(resolve => {
        const { ov, close } = elModal(`
          <b>Add your own photo</b>
          <p>Take a new picture, or choose one from your camera roll.</p>
          <div class="el-modal-btns">
            <button type="button" data-src="camera">Take a photo</button>
            <button type="button" data-src="roll">Camera roll</button>
          </div>
          <button type="button" class="el-ghostbtn" data-src="">Cancel</button>`);
        ov.querySelectorAll('[data-src]').forEach(b => b.addEventListener('click', () => {
          const v = b.dataset.src; close(); resolve(v || null);
        }));
      });
    }
    function pickPhotoFile(source) {
      return new Promise(resolve => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        if (source === 'camera') inp.setAttribute('capture', 'environment');
        inp.onchange = () => resolve(inp.files && inp.files[0] ? inp.files[0] : null);
        inp.click();
      });
    }
    function downscaleImage(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          try {
            const max = 640, sc = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.width * sc));
            c.height = Math.max(1, Math.round(img.height * sc));
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL('image/jpeg', 0.82));
          } catch (err) { URL.revokeObjectURL(url); reject(err); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
        img.src = url;
      });
    }
    function chooseFrame(dataURL, current, allowRemove) {
      return new Promise(resolve => {
        const opts = FRAMES.map(f => `
          <button type="button" class="el-frame-opt${f.key === current ? ' sel' : ''}" data-frame="${f.key}" aria-pressed="${f.key === current}" aria-label="${f.label} frame">
            <span class="photo-frame photo-frame-${f.key}"><img src="${dataURL}" alt=""></span>
            <small>${f.label}</small>
          </button>`).join('');
        const { ov, close } = elModal(`
          <b>${allowRemove ? 'Photo frame' : 'Frame this photo'}</b>
          <div class="el-frame-opts">${opts}</div>
          <div class="el-modal-btns">
            ${allowRemove ? '<button type="button" class="el-ghostbtn danger" data-remove>Remove photo</button>' : ''}
            <button type="button" class="el-ghostbtn" data-cancel>Cancel</button>
          </div>`);
        ov.querySelectorAll('.el-frame-opt').forEach(b => b.addEventListener('click', () => {
          const f = b.dataset.frame; close(); resolve({ frame: f });
        }));
        const rm = ov.querySelector('[data-remove]');
        if (rm) rm.addEventListener('click', () => { close(); resolve({ remove: true }); });
        ov.querySelector('[data-cancel]').addEventListener('click', () => { close(); resolve(null); });
      });
    }
    async function addPhotoFlow() {
      const src = await choosePhotoSource();
      if (!src) return;
      const file = await pickPhotoFile(src);
      if (!file) return;
      let dataURL;
      try { dataURL = await downscaleImage(file); }
      catch { note.textContent = 'That image could not be read. Try another.'; return; }
      const picked = await chooseFrame(dataURL, 'none', false);
      if (!picked) return;
      const s = freeSlot();
      addPlaced('photo', s.x, s.y, { img: dataURL, frame: picked.frame });
    }
    async function editPhotoFrame(rec) {
      const picked = await chooseFrame(rec.img, rec.frame, true);
      if (!picked) return;
      if (picked.remove) { removePlaced(rec); return; }
      if (picked.frame && picked.frame !== rec.frame) {
        rec.frame = picked.frame;
        const fw = rec.el.querySelector('.photo-frame');
        if (fw) fw.className = 'photo-frame photo-frame-' + picked.frame;
      }
    }

    /* tray: drag an object out, or tap to place it at a free spot.
       The photo button opens the camera/roll picker instead. */
    function attachTray(btn) {
      const key = btn.dataset.obj, o = objByKey(key);
      if (o.photo) { btn.addEventListener('click', () => addPhotoFlow()); return; }
      let pid = null, sx = 0, sy = 0, dragging = false, ghost = null;
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        sx = e.clientX; sy = e.clientY; pid = e.pointerId; dragging = false;
        try { btn.setPointerCapture(pid); } catch { /* noop */ }
      });
      btn.addEventListener('pointermove', e => {
        if (e.pointerId !== pid) return;
        if (!dragging && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) {
          dragging = true;
          ghost = document.createElement('div');
          ghost.className = 'el-ghost-obj'; ghost.innerHTML = o.svg;
          document.body.append(ghost);
        }
        if (dragging && ghost) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }
      });
      const done = e => {
        if (e.pointerId !== pid) return;
        pid = null;
        ghost?.remove(); ghost = null;
        const ti = trayKeys.indexOf(key);
        if (dragging) {
          const r = stage.getBoundingClientRect();
          if (ti >= 0 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
            trayKeys.splice(ti, 1);
            addPlaced(key, clamp((e.clientX - r.left) / r.width * 100, 4, 96), clamp((e.clientY - r.top) / r.height * 100, 6, 94));
            renderTray();
          }
        } else if (ti >= 0) {
          trayKeys.splice(ti, 1);
          const s = freeSlot();
          addPlaced(key, s.x, s.y);
          renderTray();
        }
        dragging = false;
      };
      btn.addEventListener('pointerup', done);
      btn.addEventListener('pointercancel', () => { pid = null; ghost?.remove(); ghost = null; dragging = false; });
    }

    /* placed objects: drag to move, tap/Enter toggles a remove button, arrows nudge */
    function attachPlaced(rec) {
      const d = rec.el;
      let pid = null, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
      d.addEventListener('pointerdown', e => {
        if (e.target.closest('.el-rm')) return;
        e.preventDefault();
        sx = e.clientX; sy = e.clientY; ox = rec.x; oy = rec.y;
        pid = e.pointerId; moved = false;
        try { d.setPointerCapture(pid); } catch { /* noop */ }
      });
      d.addEventListener('pointermove', e => {
        if (e.pointerId !== pid) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.hypot(dx, dy) > 6) { moved = true; d.classList.add('dragging'); }
        if (moved) {
          const r = stage.getBoundingClientRect();
          rec.x = clamp(ox + dx / r.width * 100, 4, 96);
          rec.y = clamp(oy + dy / r.height * 100, 6, 94);
          d.style.left = rec.x + '%'; d.style.top = rec.y + '%';
        }
      });
      const up = e => {
        if (e.pointerId !== pid) return;
        pid = null; d.classList.remove('dragging');
        if (!moved) {
          if (rec.img) editPhotoFrame(rec);
          else d.classList.toggle('show-rm');
        }
        moved = false;
      };
      d.addEventListener('pointerup', up);
      d.addEventListener('pointercancel', () => { pid = null; d.classList.remove('dragging'); moved = false; });
      d.addEventListener('keydown', e => {
        const step = e.shiftKey ? 8 : 2;
        let handled = true;
        if (e.key === 'ArrowLeft') rec.x = clamp(rec.x - step, 4, 96);
        else if (e.key === 'ArrowRight') rec.x = clamp(rec.x + step, 4, 96);
        else if (e.key === 'ArrowUp') rec.y = clamp(rec.y - step, 6, 94);
        else if (e.key === 'ArrowDown') rec.y = clamp(rec.y + step, 6, 94);
        else if (e.key === 'Enter' || e.key === ' ') { if (rec.img) editPhotoFrame(rec); else d.classList.toggle('show-rm'); }
        else handled = false;
        if (handled) {
          e.preventDefault();
          d.style.left = rec.x + '%'; d.style.top = rec.y + '%';
        }
      });
      d.querySelector('.el-rm').addEventListener('click', e => { e.stopPropagation(); removePlaced(rec); });
    }

    renderTray();

    const goBack = () => { stop(); UI.renderLongerExplorations(); };
    view().querySelector('[data-el="back"]').addEventListener('click', goBack);
    view().querySelector('[data-el="another"]').addEventListener('click', () => {
      qi = (qi + 1) % R.prompts.length;
      qtext.textContent = R.prompts[qi];
    });
    const leaveBtn = view().querySelector('[data-el="leave"]');
    let leaveArmed = false;
    const disarm = () => { leaveArmed = false; leaveBtn.textContent = 'Leave'; leaveBtn.classList.remove('armed'); };
    leaveBtn.addEventListener('click', () => {
      if ((text.value.trim() || placed.length) && !leaveArmed) {
        leaveArmed = true;
        leaveBtn.textContent = 'Leave without keeping?';
        leaveBtn.classList.add('armed');
        return;
      }
      goBack();
    });
    text.addEventListener('input', disarm);
    view().querySelector('[data-el="keep"]').addEventListener('click', () => {
      const entry = ENGINE.Elemental.keep({
        element, prompt: R.prompts[qi], text: text.value,
        altar: placed.map(p => {
          const a = { obj: p.key, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
          if (p.img) { a.img = p.img; a.frame = p.frame; }
          return a;
        }),
      });
      if (!entry) { note.textContent = 'Add a few words or place an object first — or leave it unkept.'; return; }
      keptConfirm(element, entry.id);
    });
    document.addEventListener('keydown', function esc2(e) {
      if (e.key === 'Escape' && !view().querySelector('[data-od-id="elemental-room-' + element + '"]')) document.removeEventListener('keydown', esc2);
    });
  }

  /* ---------- after keeping ---------- */
  function keptConfirm(element, id) {
    stop();
    const R = ROOMS[element];
    view().innerHTML = `
    <div class="card el-room" data-od-id="elemental-kept-confirm">
      <div class="pcontrols"><button class="pctl" type="button" data-el="back">Self-Explorations</button></div>
      <div class="el-pad"><div class="el-field el-${element} el-short" id="el-field">
        <canvas class="el-canvas" aria-hidden="true"></canvas>
        <div class="el-center-chip">
          <b>Kept.</b>
          <span>It will be here, in this ${element === 'fury' ? 'ember field' : 'deep water'}, whenever you want to revisit it.</span>
          <div class="el-actions">
            <button type="button" class="el-keep" data-el="again">Return to the room</button>
            <button type="button" class="el-ghost" data-el="keeping">See what I’m keeping</button>
          </div>
        </div>
      </div></div>
    </div>`;
    stopScene = startScene(view().querySelector('.el-canvas'), element);
    view().querySelector('[data-el="back"]').addEventListener('click', () => { stop(); UI.renderLongerExplorations(); });
    view().querySelector('[data-el="again"]').addEventListener('click', () => openRoom(element));
    view().querySelector('[data-el="keeping"]').addEventListener('click', () => { stop(); EXPLORATIONS.routes.collection(); });
  }

  /* ---------- revisiting a kept room ---------- */
  function openKept(id) {
    const e = ENGINE.Elemental.getEntry(id);
    if (!e) { UI.renderLongerExplorations(); return; }
    stop();
    const R = ROOMS[e.element];
    const date = new Date(e.keptAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    view().innerHTML = `
    <div class="card el-room" data-od-id="elemental-kept">
      <div class="pcontrols"><button class="pctl" type="button" data-el="back">Things I’m keeping</button></div>
      <div class="el-pad"><div class="el-field el-${e.element}" id="el-field">
        <canvas class="el-canvas" aria-hidden="true"></canvas>
        ${e.altar.map(a => {
          if (a.obj === 'photo' && typeof a.img === 'string' && a.img.indexOf('data:image/') === 0) {
            const fr = /^(none|wood|dark|white)$/.test(a.frame) ? a.frame : 'none';
            return `<div class="el-placed static el-photo" style="left:${a.x}%;top:${a.y}%" aria-hidden="true"><div class="photo-frame photo-frame-${fr}"><img src="${a.img}" alt="A kept photo"></div></div>`;
          }
          const o = R.objects.find(o => o.key === a.obj);
          return o ? `<div class="el-placed static" style="left:${a.x}%;top:${a.y}%" aria-hidden="true">${o.svg}</div>` : '';
        }).join('')}
        <div class="el-kept-words">
          <b>${esc(R.title)}</b>
          <span class="el-kept-date">${esc(date)}</span>
          ${e.prompt ? `<span class="el-kept-prompt">${esc(e.prompt)}</span>` : ''}
          ${e.text.trim() ? `<p>${esc(e.text.trim()).replace(/\n/g, '<br>')}</p>` : '<p class="el-muted">An arrangement of objects, no words.</p>'}
          <div class="el-actions"><button type="button" class="el-ghost" data-el="remove">Remove</button></div>
        </div>
      </div></div>
    </div>`;
    stopScene = startScene(view().querySelector('.el-canvas'), e.element);
    view().querySelector('[data-el="back"]').addEventListener('click', () => { stop(); EXPLORATIONS.routes.collection(); });
    const rm = view().querySelector('[data-el="remove"]');
    let armed = false;
    rm.addEventListener('click', () => {
      if (!armed) { armed = true; rm.textContent = 'Remove this kept room?'; rm.classList.add('armed'); return; }
      ENGINE.Elemental.remove(id);
      stop(); EXPLORATIONS.routes.collection();
    });
  }

  /* ---------- tiles for Things I’m keeping ---------- */
  function keptTiles() {
    const all = ENGINE.Elemental.getEntries();
    if (!all.length) return '<p class="muted">No elemental rooms kept yet.</p>';
    return '<div class="el-tiles">' + all.map(e => {
      const R = ROOMS[e.element];
      const date = new Date(e.keptAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const preview = e.text.trim()
        ? e.text.trim().slice(0, 70) + (e.text.trim().length > 70 ? '…' : '')
        : (e.altar.length ? `An arrangement of ${e.altar.length} object${e.altar.length > 1 ? 's' : ''}` : 'Kept');
      return `<button type="button" class="el-tile el-tile-${e.element}" data-new="elemental-view" data-id="${esc(e.id)}">
        <span class="el-tile-art" aria-hidden="true"></span>
        <span class="el-tile-tx"><b>${esc(R.title)}</b><small>${esc(date)} · ${esc(preview)}</small></span>
      </button>`;
    }).join('') + '</div>';
  }

  return { openRoom, openKept, keptTiles, ROOMS };
})();
