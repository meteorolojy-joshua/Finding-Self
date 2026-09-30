/* ============================================================
   Scenario Setup UI — list + local graph editor.
   Plain styling, consistent with the existing prototype.
   ============================================================ */
'use strict';

window.SCENARIO_UI = (() => {
  const $view = () => document.getElementById('view');
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SCN = () => window.SCENARIO;
  const PENCIL_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
  const DUSTBIN_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
  const CLOCK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

  /* home page holds at most SCN().MAX_HOME_CHECKINS check-ins */
  function atHomeCap() { return SCN().homeCheckinCount() >= SCN().MAX_HOME_CHECKINS; }
  function capMsg() { return `Your home page already holds ${SCN().MAX_HOME_CHECKINS} check-ins — remove one to add another.`; }
  function notice(words) {
    let n = document.getElementById('app-notice');
    if (!n) { n = document.createElement('div'); n.id = 'app-notice'; n.setAttribute('role', 'status'); document.body.append(n); }
    n.textContent = words; clearTimeout(notice.timer); notice.timer = setTimeout(() => { n.textContent = ''; }, 3500);
  }

  let _mode = 'list';
  let _scenarioId = null;
  let _editingRef = null;
  let _editField = 'text';
  let _editWidth = null;
  let _switchTo = null;
  let _modal = null;
  let _pendingReplaceRef = null;
  let _editingTitle = false;
  let _schedDraft = null;
  let _schedNote = '';

  /* "Write my own" custom-input answers stay in runtime routing but are
     not part of the Scenario Setup editing view (or its timeline) */
  const isCustomInputAnswerRef = (ref) => {
    if (typeof ref !== 'string' || ref.indexOf('base:answer:') !== 0) return false;
    const o = (window.ENGINE.PKG.options || []).find(x => x.id === ref.slice('base:answer:'.length));
    return !!(o && o.control_intent === 'CUSTOM_INPUT');
  };

  /* All question/answer steps of a check-in, in run-encounter order:
     depth-first from each entry root (question, then its answers in order,
     then the question each answer routes to). Only steps reachable in the
     check-in's flow are included; shared base content not used by this
     check-in is left out. */
  function timelineItems(scenarioId) {
    const s = SCN().getScenario(scenarioId);
    if (!s) return [];
    const g = SCN().composeGraph(s);
    const items = [];
    const seen = new Set();
    const pushEl = (ref) => {
      const el = g.elements.get(ref);
      if (!el || seen.has(ref)) return false;
      if (el.kind !== 'QUESTION' && el.kind !== 'ANSWER') return false;
      if (isCustomInputAnswerRef(ref)) return false;
      seen.add(ref);
      items.push({ ref, kind: el.kind, text: el.text || '' });
      return true;
    };
    const answersOf = (qref) => [...g.edges.values()]
      .filter(e => e.from_ref === qref && e.relation === 'QUESTION_HAS_ANSWER')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    function visitQuestion(qref) {
      if (!pushEl(qref)) return;
      answersOf(qref).forEach(e => {
        if (!pushEl(e.to_ref)) return;
        [...g.edges.values()]
          .filter(r => r.from_ref === e.to_ref && r.relation === 'ANSWER_ROUTES_TO')
          .forEach(r => visitQuestion(r.to_ref));
      });
      [...g.edges.values()]
        .filter(e => e.from_ref === qref && e.relation === 'QUESTION_CONTINUES_TO')
        .forEach(e => visitQuestion(e.to_ref));
    }
    if (g.roots.standard) visitQuestion(g.roots.standard);
    if (g.roots.low && g.roots.low !== g.roots.standard) visitQuestion(g.roots.low);
    return items;
  }

  /* The first answer of an answer's sibling set (answers of its owner question, in order) */
  function firstAnswerOfSet(scenarioId, answerRef) {
    const s = SCN().getScenario(scenarioId);
    if (!s) return answerRef;
    const g = SCN().composeGraph(s);
    const owner = [...g.edges.values()].find(e => e.relation === 'QUESTION_HAS_ANSWER' && e.to_ref === answerRef);
    if (!owner) return answerRef;
    const sibs = [...g.edges.values()]
      .filter(e => e.from_ref === owner.from_ref && e.relation === 'QUESTION_HAS_ANSWER' && !isCustomInputAnswerRef(e.to_ref))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return sibs.length ? sibs[0].to_ref : answerRef;
  }

  /* Builds the timeline rail: vertical line anchored at the upper edge of the
     first visible question/answer box. One button per question round (Q1, Q2…
     on the left) and one button per answer set (A1, A2… on the right) — all
     the answers belonging to one question share a single button. Tapping a
     button jumps that step into the editor; the button for the item currently
     being edited is enlarged. */
  function buildTimeline() {
    const card = document.querySelector('.scn-editor-card[data-od-id="scenario-editor"]');
    if (!card) return;
    const items = timelineItems(_scenarioId);
    const prev = card.querySelector('.scn-timeline');
    if (prev) prev.remove();
    if (!items.length) return;
    const s = SCN().getScenario(_scenarioId);
    if (!s) return;
    const g = SCN().composeGraph(s);
    // group the flat run-order list: each question keeps its own button;
    // all answers of one question share a single button placed where the
    // set's first answer appears
    const ownerOf = (answerRef) => {
      const e = [...g.edges.values()].find(e => e.relation === 'QUESTION_HAS_ANSWER' && e.to_ref === answerRef);
      return e ? e.from_ref : answerRef;
    };
    const seenSets = new Set();
    const groups = [];
    items.forEach(it => {
      if (it.kind !== 'ANSWER') { groups.push({ kind: 'Q', ref: it.ref, text: it.text }); return; }
      const owner = ownerOf(it.ref);
      if (seenSets.has(owner)) return;
      seenSets.add(owner);
      const members = items.filter(x => x.kind === 'ANSWER' && ownerOf(x.ref) === owner);
      groups.push({ kind: 'A', owner, refs: members.map(m => m.ref), texts: members.map(m => m.text) });
    });
    const focusRef = s.editor_view_state.focus_ref || s.roots.standard;
    const n = groups.length;
    const margin = 24;
    const spacing = n > 1 ? Math.max(28, Math.min(46, 520 / (n - 1))) : 0;
    const tl = document.createElement('div');
    tl.className = 'scn-timeline';
    tl.setAttribute('role', 'group');
    tl.setAttribute('aria-label', 'Timeline of check-in steps');
    tl.style.height = ((n - 1) * spacing + margin * 2) + 'px';
    const line = document.createElement('div');
    line.className = 'tl-line';
    line.setAttribute('aria-hidden', 'true');
    line.style.height = ((n - 1) * spacing + margin * 2) + 'px'; // full content height: an abs-pos line sized by bottom:0 would only span the rail's visible box
    tl.appendChild(line);
    let qRound = 0, aRound = 0;
    groups.forEach((gr, i) => {
      const isQ = gr.kind === 'Q';
      const num = isQ ? 'Q' + (++qRound) : 'A' + (++aRound);
      const b = document.createElement('button');
      b.type = 'button';
      const current = isQ ? gr.ref === focusRef : gr.refs.includes(focusRef);
      b.className = 'tl-tick ' + (isQ ? 'tl-q' : 'tl-a') + (current ? ' tl-current' : '');
      b.style.top = (margin + i * spacing - 10) + 'px';
      b.textContent = num;
      const label = isQ
        ? 'Question ' + num + ': ' + (gr.text || '(empty)')
        : 'Answers ' + num + ' (' + gr.refs.length + '): ' + gr.texts.map(t => t || '(empty)').join('; ');
      b.title = label;
      b.setAttribute('aria-label', label + ' — jump to this step');
      b.addEventListener('click', () => {
        const target = isQ ? gr.ref : firstAnswerOfSet(_scenarioId, gr.refs[0]);
        _editingRef = null; _editWidth = null; _editField = 'text'; _switchTo = null;
        SCN().setFocus(_scenarioId, target);
        renderEditor();
        const fb = document.querySelector('.scn-editor-card .scn-focus');
        if (fb) fb.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      tl.appendChild(b);
    });
    card.appendChild(tl);
    // keep the current step's tick in view inside the rail
    const cur = tl.querySelector('.tl-current');
    if (cur && tl.scrollHeight > tl.clientHeight) {
      tl.scrollTop = Math.max(0, parseFloat(cur.style.top) + 12 - tl.clientHeight / 2);
    }
    const firstBox = card.querySelector('.scn-canvas .scn-box[data-kind="QUESTION"], .scn-canvas .scn-box[data-kind="ANSWER"]');
    if (firstBox) {
      const cardRect = card.getBoundingClientRect();
      const boxRect = firstBox.getBoundingClientRect();
      tl.style.top = Math.max(0, boxRect.top - cardRect.top) + 'px';
    }
  }

  /* display renames (stored scenario names stay canonical) */
  const DISPLAY_NAMES = { 'Before I Enter a Persuasive Feed': 'Before I Enter Social Media', 'When I Cannot Tell What I Want': "When I Can't Tell What I Want" };
  function displayName(name) { return DISPLAY_NAMES[name] || name; }
  function stateLabel(s) {
    if (s.lifecycle_state === 'DELETED') return 'Deleted';
    if (s.lifecycle_state === 'EMPTY_DRAFT') return 'Empty draft';
    if (s.lifecycle_state === 'NEEDS_ATTENTION') return 'Needs attention';
    return 'Active';
  }

  /* ---------- editor ---------- */
  function openEditor(id) {
    _mode = 'editor'; _scenarioId = id; _editingRef = null; _modal = null; _editingTitle = false;
    renderEditor();
  }

  /* create a blank check-in (one empty question, three empty answers) and open its editor */
  function newBlankCheckin() {
    if (atHomeCap()) { notice(capMsg()); return; }
    SCN().purgePristineUntitled();
    const s = SCN().createScenario('Untitled check-in', 'BLANK');
    openEditor(s.scenario_id);
  }

  function commitTitleName(value) {
    const name = String(value == null ? '' : value).trim();
    _editingTitle = false;
    if (name) SCN().renameScenario(_scenarioId, name);
    renderEditor();
  }

  function renderEditor() {
    const s = SCN().getScenario(_scenarioId);
    if (!s) { window.UI.renderHome(); return; }
    const focusRef = s.editor_view_state.focus_ref || s.roots.standard;
    const proj = SCN().projection(s, focusRef);

    const box = (ref, text, kind, opts, isFocus) => {
      const editable = kind === 'QUESTION' || kind === 'ANSWER';
      const label = kind === 'QUESTION' ? 'Question' : (kind === 'ANSWER' ? 'Answer' : kind);
      let sub = '';
      if (kind === 'QUESTION') {
        const s = SCN().getScenario(_scenarioId);
        const el = s && SCN().composeGraph(s).elements.get(ref);
        if (el && typeof el.support === 'string') sub = el.support;
        else if (ref.indexOf('base:question:') === 0) {
          const n = window.ENGINE && window.ENGINE.PKG && window.ENGINE.PKG.nodeById[ref.slice('base:question:'.length)];
          if (n && n.support_copy) sub = window.ENGINE.previewCopy(n, 'support_copy');
        }
      }
      const editStyle = (_editingRef === ref && _editWidth) ? ` style="width:${_editWidth}px"` : '';
      const editing = _editingRef === ref;
      const qtext = kind === 'QUESTION' ? ' scn-qtext' : '';
      const emptyHint = kind === 'QUESTION' ? 'write question text here' : (kind === 'ANSWER' ? 'write answer text here' : '(empty)');
      const emptyHtml = `<em class="muted">${emptyHint}</em>`;
      const mainField = editing
        ? (_editField === 'sub'
          ? `<div class="scn-text${qtext} scn-field" data-scact="begin-edit-text" data-ref="${esc(ref)}" title="Click to edit the main text">${esc(text) || emptyHtml}</div>`
          : `<textarea class="scn-edit" data-scact="edit-input" data-field="text" data-ref="${esc(ref)}" rows="2">${esc(text)}</textarea>`)
        : (isFocus
          ? `<div class="scn-text${qtext} scn-clickedit" data-scact="begin-edit" data-ref="${esc(ref)}" title="Click to edit the text">${esc(text) || emptyHtml}</div>`
          : `<div class="scn-text${qtext}">${esc(text) || emptyHtml}</div>`);
      const subField = sub ? (editing
        ? (_editField === 'sub'
          ? `<textarea class="scn-edit scn-subfield" data-scact="edit-input" data-field="sub" data-ref="${esc(ref)}" rows="2">${esc(sub)}</textarea>`
          : `<div class="scn-sub scn-field" data-scact="begin-edit-sub" data-ref="${esc(ref)}" title="Click to edit the subtext">${esc(sub)}</div>`)
        : `<div class="scn-sub">${esc(sub)}</div>`) : '';
      return `<div class="scn-box scn-${kind.toLowerCase()}"${editStyle} draggable="${editable}" data-scact="box" data-ref="${esc(ref)}" data-kind="${esc(kind)}" aria-label="${esc(label)}: ${esc(text || '(empty)')}">
        <div class="scn-box-head">
          <span class="muted small">${esc(label)}</span>
          <button class="scn-box-x" type="button" data-scact="ask-delete-item" data-ref="${esc(ref)}" data-kind="${esc(kind)}" aria-label="Delete this ${kind === 'QUESTION' ? 'question' : 'answer'}" title="Delete">×</button>
        </div>
        ${mainField}
        ${subField}
        ${opts || ''}
      </div>`;
    };

    // (isCustomInputAnswerRef is defined at module scope)

    const parents = proj.parents.filter(p => !isCustomInputAnswerRef(p.ref)).map(p => box(p.ref, p.text, p.kind, '')).join('');
    const siblings = proj.siblings.filter(sb => !isCustomInputAnswerRef(sb.ref)).map(sb => box(sb.ref, sb.text, sb.kind, '')).join('');
    const children = proj.children.filter(c => !isCustomInputAnswerRef(c.ref)).map(c => {
      if (c.kind === 'CONTINUE') {
        // show the destination question's real text, not the raw ref
        const s2 = SCN().getScenario(_scenarioId);
        const destEl = s2 && SCN().composeGraph(s2).elements.get(c.destination_ref);
        const destText = destEl ? destEl.text : c.destination_ref;
        return `<div class="scn-box scn-continue" data-od-id="continue"><div class="scn-box-head"><span class="muted small">Continue connector</span></div><div class="scn-text muted">After Continue → ${esc(destText)}</div></div>`;
      }
      if (c.kind === 'SYSTEM') return `<div class="scn-box scn-system"><div class="scn-box-head"><span class="muted small">System transition</span></div><div class="scn-text muted">${esc(c.ref)}</div></div>`;
      return box(c.ref, c.text, c.kind, '');
    }).join('');

    const focusBox = proj.focus ? box(proj.focus_ref, proj.focus.text, proj.focus.kind, `
      <div class="scn-box-actions">
        ${(proj.focus.kind === 'QUESTION' || proj.focus.kind === 'ANSWER') ? `<button class="scn-mini" type="button" data-scact="replace" data-ref="${esc(proj.focus_ref)}">Browse Alternatives</button>` : ''}
      </div>`, true) : '';

    // add child / sibling availability — questions never get a sibling "+":
    // siblings of a question are reached by adding/routing answers
    const canAddChild = proj.focus && (proj.focus.kind === 'QUESTION' || (proj.focus.kind === 'ANSWER' && !hasDest(proj.focus_ref) && !isToggle(proj.focus)));
    const canAddSibling = proj.focus && proj.focus.kind === 'ANSWER';

    $view().innerHTML = `
      <div class="card scn-editor-card" data-od-id="scenario-editor">
        <div class="scn-title-block">
          ${_editingTitle
            ? `<input class="scn-title-input" type="text" value="${esc(s.name)}" aria-label="Check-in name" />`
            : `<h2 class="scn-title"><span class="scn-title-text">${esc(displayName(SCN().checkinLabel(s)))}</span><button class="scn-title-edit" type="button" data-scact="edit-title" aria-label="Edit check-in name" title="Edit check-in name">${PENCIL_SVG}</button><button class="scn-title-schedule" type="button" data-scact="open-schedule" aria-label="Set when this check-in activates" title="Set when this check-in activates">${CLOCK_SVG}</button><button class="scn-title-delete" type="button" data-scact="delete-scenario" data-id="${esc(s.scenario_id)}" aria-label="Delete check-in ${esc(displayName(s.name))}" title="Delete check-in">${DUSTBIN_SVG}</button></h2>`}
          <div class="scn-title-state">${esc(stateLabel(s))}</div>
        </div>
        <div class="pcontrols scn-undoredo">
          <button class="pctl" type="button" data-scact="undo" ${(s.history && s.history.length) ? '' : 'disabled'} aria-label="Undo" title="Undo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
          <button class="pctl" type="button" data-scact="redo" aria-label="Redo" title="Redo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
        </div>
        <div class="scn-canvas">
          ${parents ? `<div class="scn-group"><div class="scn-level">${parents}</div></div>` : ''}
          ${parents ? '<div class="scn-arrow" aria-hidden="true"></div>' : ''}
          <div class="scn-focus" data-scact="drop-zone" data-ref="${esc(proj.focus_ref)}"><div class="scn-level">${focusBox}</div></div>
          ${(siblings || canAddSibling) ? `<div class="scn-group"><div class="scn-level">${siblings}${canAddSibling ? `<button class="scn-add has-cursor-tip" type="button" data-scact="add-sibling" data-ref="${esc(proj.focus_ref)}" data-tip="add another answer" aria-label="Add sibling">+</button>` : ''}</div></div>` : ''}
          ${(children || canAddChild) ? '<div class="scn-arrow" aria-hidden="true"></div>' : ''}
          ${(children || canAddChild) ? `<div class="scn-group"><div class="scn-level">${children}${canAddChild ? (proj.focus.kind === 'QUESTION'
            ? `<button class="scn-add has-cursor-tip" type="button" data-scact="add-child" data-ref="${esc(proj.focus_ref)}" data-tip="add another answer" aria-label="Add child">+</button>`
            : `<button class="scn-add scn-add-wide" type="button" data-scact="choose-child-question" data-ref="${esc(proj.focus_ref)}" aria-label="Choose another question">Choose another question</button>`) : ''}</div></div>` : ''}
        </div>
      </div>`;
    if (_modal) renderModal();
    buildTimeline();
  }

  function hasDest(ref) { const s = SCN().getScenario(_scenarioId); const g = SCN().composeGraph(s); return [...g.edges.values()].some(e => e.relation === 'ANSWER_ROUTES_TO' && e.from_ref === ref); }
  function isToggle(el) { return el && el.runtime_contract && el.runtime_contract.interaction === 'MULTI_TOGGLE'; }

  /* ---------- modal ---------- */
  function renderModal() {
    const m = document.createElement('div');
    m.className = 'scn-modal-backdrop';
    m.innerHTML = `<div class="scn-modal" role="dialog" aria-modal="true">${_modal.html}</div>`;
    $view().appendChild(m);
  }

  function confirmDeleteScenario(id) {
    const s = SCN().getScenario(id); if (!s) return;
    _modal = { html: `
      <h2 class="prompt">Delete “${esc(displayName(s.name))}”?</h2>
      <p class="support">This removes this scenario and its local changes. It will not delete premade questions, answers, or other scenarios.</p>
      <div class="btnrow"><button class="btn" type="button" data-scact="confirm-delete" data-id="${esc(id)}">Delete Scenario Setup</button><button class="btn2" type="button" data-scact="close-modal">Cancel</button></div>` };
    renderEditor();
  }

  /* ---------- activation schedule ---------- */
  const SCHED_ACTIONS = [
    ['before-social', 'Before opening social media'],
    ['after-hour', 'After being on the phone for one hour'],
    ['first-pickup', 'When I first pick up my phone'],
    ['before-bed', 'Before bed'],
    ['after-call', 'After a phone call'],
  ];
  const SCHED_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function draftFromSchedule(sched) {
    const d = { times: false, type: 'daily', time: '08:00', weekday: 1, days: [], actions: false, action: '' };
    if (sched) {
      if (sched.times) {
        d.times = true; d.type = sched.times.type || 'daily'; d.time = sched.times.time || '08:00';
        d.weekday = sched.times.weekday != null ? sched.times.weekday : 1;
        d.days = Array.isArray(sched.times.days) ? sched.times.days.slice() : [];
      }
      if (sched.action) { d.actions = true; d.action = sched.action; }
    }
    return d;
  }

  function openSchedule() {
    const s = SCN().getScenario(_scenarioId); if (!s) return;
    _schedDraft = draftFromSchedule(s.schedule);
    _schedNote = '';
    _modal = { html: schedHtml() };
    renderEditor();
  }

  function schedHtml() {
    const d = _schedDraft;
    const typeBtn = (val, label) => `<button class="sched-type${d.type === val ? ' on' : ''}" type="button" data-scact="sched-type" data-type="${val}" aria-pressed="${d.type === val}">${label}</button>`;
    const dayBoxes = SCHED_DAYS.map((n, i) => `<label class="sched-day"><input type="checkbox" data-sched-day="${i}"${d.days.includes(i) ? ' checked' : ''} />${esc(n.slice(0, 3))}</label>`).join('');
    const weekOpts = SCHED_DAYS.map((n, i) => `<option value="${i}"${+d.weekday === i ? ' selected' : ''}>${esc(n)}</option>`).join('');
    const actOpts = `<option value="">Choose one…</option>` + SCHED_ACTIONS.map(([v, l]) => `<option value="${v}"${d.action === v ? ' selected' : ''}>${esc(l)}</option>`).join('');
    return `
      <h2 class="prompt">When do you want this scenario to activate?</h2>
      <label class="sched-check"><input type="checkbox" data-sched-check="times"${d.times ? ' checked' : ''} /><span>at certain times</span></label>
      ${d.times ? `<div class="sched-section">
        <div class="sched-types" role="group" aria-label="How often">${typeBtn('daily', 'Daily')}${typeBtn('weekly', 'Weekly')}${typeBtn('days', 'Particular days')}</div>
        <div class="sched-row">
          <label class="sched-field"><span>Time</span><input type="time" data-sched-field="time" value="${esc(d.time)}" /></label>
          ${d.type === 'weekly' ? `<label class="sched-field"><span>Day</span><select data-sched-field="weekday">${weekOpts}</select></label>` : ''}
        </div>
        ${d.type === 'days' ? `<div class="sched-days" role="group" aria-label="Days of the week">${dayBoxes}</div><p class="sched-hint">Repeats every week on the ticked days.</p>` : ''}
      </div>` : ''}
      <label class="sched-check"><input type="checkbox" data-sched-check="actions"${d.actions ? ' checked' : ''} /><span>upon certain user actions</span></label>
      ${d.actions ? `<div class="sched-section"><label class="sched-field"><span>When this happens</span><select data-sched-field="action">${actOpts}</select></label></div>` : ''}
      ${_schedNote ? `<p class="sched-note" role="alert">${esc(_schedNote)}</p>` : ''}
      <div class="btnrow"><button class="btn" type="button" data-scact="sched-save">Save</button><button class="btn2" type="button" data-scact="close-modal">Cancel</button></div>`;
  }

  function refreshSchedModal(focusSel) {
    _modal.html = schedHtml();
    const m = document.querySelector('.scn-modal-backdrop .scn-modal');
    if (m) m.innerHTML = _modal.html;
    if (focusSel) { const t = document.querySelector('.scn-modal-backdrop ' + focusSel); if (t) t.focus({ preventScroll: true }); }
  }

  function saveSchedule() {
    const d = _schedDraft; if (!d) return;
    if (d.times && d.type === 'days' && !d.days.length) { _schedNote = 'Tick at least one day of the week.'; refreshSchedModal(); return; }
    if (d.actions && !d.action) { _schedNote = 'Choose an action from the list.'; refreshSchedModal(); return; }
    const s = SCN().getScenario(_scenarioId); if (!s) return;
    const times = d.times ? { type: d.type, time: d.time || '08:00', weekday: +d.weekday || 0, days: d.days.slice().sort((a, b) => a - b) } : null;
    const sched = (times || d.actions) ? { times, action: d.actions ? d.action : null } : null;
    s.schedule = sched;
    SCN().saveScenario(s);
    _schedDraft = null; _schedNote = ''; _modal = null;
    renderEditor();
    notice(sched ? 'Activation schedule saved.' : 'Activation schedule cleared.');
  }

  /* one-line summary for home cards, e.g. "Daily · 8:00 AM" */
  function schedTimeLabel(hhmm) {
    const parts = String(hhmm || '08:00').split(':');
    let h = Math.max(0, Math.min(23, +parts[0] || 0)); const m = String(parts[1] || '00').padStart(2, '0').slice(0, 2);
    const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  }
  function schedLine(sched) {
    if (!sched) return '';
    const parts = [];
    if (sched.times) {
      const t = sched.times, when = schedTimeLabel(t.time);
      if (t.type === 'daily') parts.push(`Daily · ${when}`);
      else if (t.type === 'weekly') parts.push(`${SCHED_DAYS[t.weekday] || 'Monday'}s · ${when}`);
      else if (t.days && t.days.length) parts.push(`${t.days.map(i => (SCHED_DAYS[i] || '').slice(0, 3)).join(' · ')} · ${when}`);
    }
    if (sched.action) { const a = SCHED_ACTIONS.find(x => x[0] === sched.action); if (a) parts.push(a[1]); }
    return parts.join(' — ');
  }
  /* true when a timed schedule falls within the past hour (checked on home render) */
  function schedDueNow(sched, now) {
    if (!sched || !sched.times) return false;
    now = now || new Date();
    const t = sched.times, day = now.getDay();
    const okDay = t.type === 'daily' ? true : t.type === 'weekly' ? day === (+t.weekday || 0) : (t.days || []).includes(day);
    if (!okDay) return false;
    const tp = String(t.time || '08:00').split(':');
    const at = new Date(now); at.setHours(+tp[0] || 0, +tp[1] || 0, 0, 0);
    const diff = now - at;
    return diff >= 0 && diff < 3600000;
  }

  /* ---------- delete a question / answer via its × button ---------- */
  function askDeleteItem(ref, kind) {
    const s = SCN().getScenario(_scenarioId); if (!s) return;
    const g = SCN().composeGraph(s);
    const el = g.elements.get(ref);
    const isQ = kind === 'QUESTION';
    const edges = [...g.edges.values()];
    const childRefs = (r) => edges.filter(e => e.from_ref === r).map(e => e.to_ref);
    const isAnswerRef = (r) => { const n = g.elements.get(r); return n && n.kind === 'ANSWER'; };
    if (isQ) {
      if (s.roots.standard === ref || s.roots.low === ref) {
        _modal = { html: `
          <h2 class="prompt">The first question of a check-in cannot be deleted.</h2>
          <div class="btnrow"><button class="btn" type="button" data-scact="close-modal">OK</button></div>` };
        renderEditor();
        return;
      }
      if (childRefs(ref).some(isAnswerRef)) {
        _modal = { html: `
          <h2 class="prompt">You must delete all subsequent answers before you can delete this question.</h2>
          <div class="btnrow"><button class="btn" type="button" data-scact="close-modal">OK</button></div>` };
        renderEditor();
        return;
      }
    } else {
      const parentRef = edges.filter(e => e.to_ref === ref).map(e => e.from_ref)
        .find(r => { const n = g.elements.get(r); return n && n.kind === 'QUESTION'; });
      const siblingAnswers = parentRef ? childRefs(parentRef).filter(isAnswerRef) : [];
      if (parentRef && siblingAnswers.length === 1) {
        const seen = new Set([ref]); const queue = [ref]; let hasSubQ = false;
        while (queue.length && !hasSubQ) {
          const cur = queue.shift();
          for (const e of edges) {
            if (e.from_ref !== cur || seen.has(e.to_ref)) continue;
            seen.add(e.to_ref); queue.push(e.to_ref);
            const n = g.elements.get(e.to_ref);
            if (n && n.kind === 'QUESTION') { hasSubQ = true; break; }
          }
        }
        if (hasSubQ) {
          _modal = { html: `
            <h2 class="prompt">You must delete all subsequent questions, or add another answer option instead, before you can delete this answer option.</h2>
            <div class="btnrow"><button class="btn" type="button" data-scact="close-modal">OK</button></div>` };
          renderEditor();
          return;
        }
      }
    }
    const preview = el && el.text ? String(el.text).trim() : '';
    _modal = { html: `
      <h2 class="prompt">Are you sure you want to delete this ${isQ ? 'question' : 'answer option'}?</h2>
      ${preview ? `<p class="support">“${esc(preview)}”</p>` : ''}
      <div class="btnrow"><button class="btn" type="button" data-scact="confirm-delete-item" data-ref="${esc(ref)}">Confirm delete</button><button class="btn2" type="button" data-scact="close-modal">Cancel</button></div>` };
    renderEditor();
  }

  /* ---------- replacement search ---------- */
  function openReplace(ref) {
    _pendingReplaceRef = ref;
    const s = SCN().getScenario(_scenarioId);
    const g = SCN().composeGraph(s);
    const el = g.elements.get(ref);
    const isQ = el && el.kind === 'QUESTION';
    const Pk = window.ENGINE.PKG;
    const items = isQ ? Pk.nodes : (Pk.searchableAnswers || Pk.inventoryAnswers || []);
    const list = items.slice(0, 200).map(it => {
      const text = it.prompt || it.label || it.text || '';
      const id = it.id;
      return `<div class="resultrow"><span>${esc(text)}</span><button class="ghost" type="button" data-scact="preview-replace" data-id="${esc(id)}" data-text="${esc(text)}">Preview replace</button></div>`;
    }).join('');
    _modal = { html: `
      <h2 class="prompt">Replace content</h2>
      <p class="support">Choose a ${isQ ? 'question' : 'answer'} to replace the box text. Connections and behavior are preserved.</p>
      <div class="scn-search">${list || '<p class="muted">No items.</p>'}</div>
      <div class="btnrow"><button class="btn2" type="button" data-scact="close-modal">Cancel</button></div>` };
    renderEditor();
  }

  function previewReplace(id, text) {
    _modal = { html: `
      <h2 class="prompt">Replace with “${esc(text)}”?</h2>
      <p class="support">Before: “${esc(effectiveText(_pendingReplaceRef))}”</p>
      <p class="support">After: “${esc(text)}”</p>
      <div class="btnrow">
        <button class="btn" type="button" data-scact="confirm-replace" data-id="${esc(id)}" data-text="${esc(text)}">Confirm replacement</button>
        <button class="btn2" type="button" data-scact="close-modal">Cancel</button>
      </div>` };
    renderEditor();
  }
  function effectiveText(ref) { const s = SCN().getScenario(_scenarioId); const g = SCN().composeGraph(s); const el = g.elements.get(ref); return el ? el.text : ''; }

  /* ---------- choose another question (child of an answer) ---------- */
  function openChooseChildQuestion(ref) {
    const Pk = window.ENGINE.PKG;
    const list = Pk.nodes.slice(0, 200).map(it =>
      `<div class="resultrow"><span>${esc(it.prompt)}</span><button class="ghost" type="button" data-scact="pick-child-question" data-id="${esc(it.id)}" data-ref="${esc(ref)}">Add as next question</button></div>`).join('');
    _modal = { html: `
      <h2 class="prompt">Choose another question</h2>
      <p class="support">The selected question becomes this answer's next step. Connections remain editable afterwards.</p>
      <div class="scn-search">${list || '<p class="muted">No questions.</p>'}</div>
      <div class="btnrow"><button class="btn2" type="button" data-scact="close-modal">Cancel</button></div>` };
    renderEditor();
  }

  /* ---------- events ---------- */
  function bind() {
    // schedule popup controls: checkboxes/selects/time update the draft live
    $view().addEventListener('change', (e) => {
      if (!_schedDraft) return;
      const t = e.target;
      if (t.matches('[data-sched-check]')) {
        const k = t.getAttribute('data-sched-check');
        _schedDraft[k] = t.checked;
        refreshSchedModal('[data-sched-check="' + k + '"]');
      } else if (t.matches('[data-sched-field]')) {
        const f = t.getAttribute('data-sched-field');
        _schedDraft[f] = f === 'weekday' ? +t.value : t.value;
      } else if (t.matches('[data-sched-day]')) {
        const i = +t.getAttribute('data-sched-day'), days = _schedDraft.days, at = days.indexOf(i);
        if (t.checked && at < 0) days.push(i); else if (!t.checked && at >= 0) days.splice(at, 1);
      }
    });
    $view().addEventListener('click', (e) => {
      const btn = e.target.closest('[data-scact]');
      if (!btn) return;
      const act = btn.getAttribute('data-scact');
      const id = btn.getAttribute('data-id');
      const ref = btn.getAttribute('data-ref');

      if (act === 'back-home') { window.UI.renderHome(); return; }
      if (act === 'delete-scenario') { confirmDeleteScenario(id); return; }
      if (act === 'open-schedule') { openSchedule(); return; }
      if (act === 'sched-type') { if (_schedDraft) { _schedDraft.type = btn.getAttribute('data-type'); refreshSchedModal('[data-scact="sched-type"][data-type="' + _schedDraft.type + '"]'); } return; }
      if (act === 'sched-save') { saveSchedule(); return; }
      if (act === 'ask-delete-item') { askDeleteItem(ref, btn.getAttribute('data-kind')); return; }
      if (act === 'confirm-delete-item') { SCN().deleteElementPlacement(_scenarioId, ref); _modal = null; renderEditor(); return; }
      if (act === 'confirm-delete') { SCN().deleteScenario(id); _modal = null; window.UI.renderHome(); return; }
      if (act === 'edit-title') { _editingTitle = true; renderEditor(); const t = document.querySelector('.scn-title-input'); if (t) { t.focus(); t.select(); } return; }
      if (act === 'close-modal') { _modal = null; _pendingReplaceRef = null; _schedDraft = null; _schedNote = ''; renderEditor(); return; }
      if (act === 'begin-edit') { const b = document.querySelector('.scn-box[data-ref="' + ref + '"]'); _editWidth = b ? b.offsetWidth : null; _editingRef = ref; _editField = 'text'; renderEditor(); const t = document.querySelector('[data-ref="' + ref + '"].scn-edit'); if (t) t.focus(); return; }
      if (act === 'begin-edit-text' && _editingRef === ref) { _switchTo = null; _editField = 'text'; renderEditor(); const t = document.querySelector('.scn-box[data-ref="' + ref + '"] textarea.scn-edit[data-field="text"]'); if (t) t.focus(); return; }
      if (act === 'begin-edit-sub' && _editingRef === ref) { _switchTo = null; _editField = 'sub'; renderEditor(); const t = document.querySelector('.scn-box[data-ref="' + ref + '"] textarea.scn-subfield'); if (t) t.focus(); return; }
      if (act === 'undo') { SCN().undo(_scenarioId); _editingRef = null; _editWidth = null; _editField = 'text'; renderEditor(); return; }
      if (act === 'redo') { SCN().redo(_scenarioId); renderEditor(); return; }
      if (act === 'add-child') { _editWidth = null; _editField = 'text'; const newRef = SCN().addChild(_scenarioId, ref); _editingRef = newRef; renderEditor(); if (newRef) { const t = document.querySelector('.scn-edit[data-ref="' + newRef + '"]'); if (t) t.focus(); } return; }
      if (act === 'add-sibling') { _editWidth = null; _editField = 'text'; const newRef = SCN().addSibling(_scenarioId, ref); _editingRef = newRef; renderEditor(); if (newRef) { const t = document.querySelector('.scn-edit[data-ref="' + newRef + '"]'); if (t) t.focus(); } return; }
      if (act === 'confirm-delete-placement') { SCN().deleteElementPlacement(_scenarioId, ref); _modal = null; renderEditor(); return; }
      if (act === 'confirm-delete-everywhere') { SCN().deleteElementEverywhere(_scenarioId, ref); _modal = null; renderEditor(); return; }
      if (act === 'replace') { openReplace(ref); return; }
      if (act === 'choose-child-question') { openChooseChildQuestion(ref); return; }
      if (act === 'pick-child-question') {
        const prevFocus = SCN().getScenario(_scenarioId).editor_view_state.focus_ref;
        SCN().addExistingChild(_scenarioId, ref, 'base:question:' + id);
        // the previously focused item stays focused
        SCN().setFocus(_scenarioId, prevFocus);
        _modal = null; renderEditor(); return;
      }
      if (act === 'preview-replace') { previewReplace(btn.getAttribute('data-id'), btn.getAttribute('data-text')); return; }
      if (act === 'confirm-replace') { SCN().replaceContentReference(_scenarioId, _pendingReplaceRef, btn.getAttribute('data-id'), btn.getAttribute('data-text')); _modal = null; _pendingReplaceRef = null; renderEditor(); return; }
      /* clicking a box does nothing — focus changes only by dragging into the lavender box */
    });

    // inline edit commit on Enter / cancel on Escape / blur; data-field picks main text vs subtext
    $view().addEventListener('mousedown', (e) => {
      const f = e.target.closest && e.target.closest('[data-scact="begin-edit-text"],[data-scact="begin-edit-sub"]');
      if (f && _editingRef === f.getAttribute('data-ref')) {
        _switchTo = { ref: f.getAttribute('data-ref'), field: f.getAttribute('data-scact') === 'begin-edit-sub' ? 'sub' : 'text' };
      }
    }, true);
    $view().addEventListener('keydown', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('scn-title-input')) {
        if (e.key === 'Enter') { e.preventDefault(); commitTitleName(e.target.value); }
        else if (e.key === 'Escape') { _editingTitle = false; renderEditor(); }
        return;
      }
      if (e.target && e.target.classList && e.target.classList.contains('scn-edit')) {
        const ref = e.target.getAttribute('data-ref');
        const isSub = e.target.getAttribute('data-field') === 'sub';
        const commitFn = isSub ? SCN().commitSubTextEdit : SCN().commitTextEdit;
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitFn(_scenarioId, ref, e.target.value); _editingRef = null; _editWidth = null; _editField = 'text'; renderEditor(); }
        else if (e.key === 'Escape') { _editingRef = null; _editWidth = null; _editField = 'text'; renderEditor(); }
      }
    });
    $view().addEventListener('blur', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('scn-title-input')) {
        if (_editingTitle) commitTitleName(e.target.value);
        return;
      }
      if (e.target && e.target.classList && e.target.classList.contains('scn-edit')) {
        const ref = e.target.getAttribute('data-ref');
        const isSub = e.target.getAttribute('data-field') === 'sub';
        const val = e.target.value.trim();
        if (isSub) SCN().commitSubTextEdit(_scenarioId, ref, val);
        else if (val) SCN().commitTextEdit(_scenarioId, ref, val);
        if (_switchTo && _switchTo.ref === ref) {
          // switching fields inside the same box: keep edit mode and the pinned width
          _editingRef = ref; _editField = _switchTo.field; _switchTo = null;
        } else {
          _editingRef = null; _editWidth = null; _editField = 'text'; _switchTo = null;
        }
        renderEditor();
        if (_editingRef) {
          // keep the active textarea focused so any click elsewhere blurs and exits
          const sel = _editField === 'sub'
            ? '.scn-box[data-ref="' + _editingRef + '"] textarea.scn-subfield'
            : '.scn-box[data-ref="' + _editingRef + '"] textarea.scn-edit[data-field="text"]';
          const t = document.querySelector(sel);
          if (t) t.focus();
        }
      }
    }, true);

    // drag-to-focus — dropping onto the full-colour item being edited is the
    // way to change focus by dragging (8px threshold, view-state only)
    let dragEl = null;
    // hover hint: since clicking a parent/sibling/child does nothing, a small
    // tooltip follows the cursor over draggable boxes saying "drag and drop"
    const tip = document.createElement('div');
    tip.className = 'scn-tip';
    tip.textContent = 'Drag onto the item being edited';
    document.body.appendChild(tip);
    function currentFocusRef() {
      const s = SCN().getScenario(_scenarioId);
      return s ? (s.editor_view_state.focus_ref || (s.roots && s.roots.standard)) : null;
    }
    $view().addEventListener('mousemove', (e) => {
      if (_mode !== 'editor') { tip.classList.remove('on'); return; }
      const box = e.target.closest && e.target.closest('.scn-box[data-scact="box"]');
      if (box && box.getAttribute('draggable') === 'true' && box.getAttribute('data-ref') !== currentFocusRef()) {
        tip.classList.add('on');
        const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
        tip.style.left = Math.max(8, x) + 'px';
        tip.style.top = (e.clientY + 16) + 'px';
      } else {
        tip.classList.remove('on');
      }
    });
    $view().addEventListener('mouseleave', () => tip.classList.remove('on'));
    $view().addEventListener('dragstart', (e) => {
      const box = e.target.closest('.scn-box[data-scact="box"]');
      if (!box) return;
      tip.classList.remove('on');
      dragEl = box;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', box.getAttribute('data-ref'));
    });
    $view().addEventListener('dragover', (e) => {
      const dz = e.target.closest('.scn-focus');
      if (!dz) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!dz.classList.contains('scn-drop-hover')) dz.classList.add('scn-drop-hover');
    });
    $view().addEventListener('dragleave', (e) => {
      const dz = e.target.closest('.scn-focus');
      if (dz) dz.classList.remove('scn-drop-hover');
    });
    $view().addEventListener('drop', (e) => {
      document.querySelectorAll('.scn-focus').forEach(el => el.classList.remove('scn-drop-hover'));
      tip.classList.remove('on');
      const ref = e.dataTransfer.getData('text/plain');
      dragEl = null;
      const dz = e.target.closest('.scn-focus');
      if (!dz) return;
      e.preventDefault();
      if (ref) {
        _editingRef = null; _editWidth = null; _editField = 'text'; _switchTo = null;
        SCN().setFocus(_scenarioId, ref); renderEditor();
      }
    });
  }

  function navSnapshot() { const saved = structuredClone({_mode,_scenarioId,_editingRef,_editField,_editWidth,_switchTo,_modal,_pendingReplaceRef,_schedDraft,_schedNote}); return () => { ({_mode,_scenarioId,_editingRef,_editField,_editWidth,_switchTo,_modal,_pendingReplaceRef,_schedDraft,_schedNote} = structuredClone(saved)); }; }
  return { navSnapshot, openEditor, newBlankCheckin, notice, bind, schedLine, schedDueNow };
})();
