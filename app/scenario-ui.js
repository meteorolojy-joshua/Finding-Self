/* ============================================================
   Scenario Setup UI — list + local graph editor.
   Plain styling, consistent with the existing prototype.
   ============================================================ */
'use strict';

window.SCENARIO_UI = (() => {
  const $view = () => document.getElementById('view');
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SCN = () => window.SCENARIO;

  let _mode = 'list';
  let _scenarioId = null;
  let _editingRef = null;
  let _editField = 'text';
  let _editWidth = null;
  let _switchTo = null;
  let _modal = null;
  let _pendingReplaceRef = null;

  function originLabel(o) {
    if (!o) return 'From scratch';
    if (o.type === 'TEMPLATE') return 'From template';
    if (o.type === 'COPY') return 'Copy';
    return 'From scratch';
  }
  /* display renames (stored scenario names stay canonical) */
  const DISPLAY_NAMES = { 'Before I Enter a Persuasive Feed': 'Before I Enter Social Media', 'When I Cannot Tell What I Want': "When I Can't Tell What I Want" };
  function displayName(name) { return DISPLAY_NAMES[name] || name; }
  function stateLabel(s) {
    if (s.lifecycle_state === 'DELETED') return 'Deleted';
    if (s.lifecycle_state === 'EMPTY_DRAFT') return 'Empty draft';
    if (s.lifecycle_state === 'DRAFT_CHANGES_NOT_ACTIVE') return 'Draft changes not active';
    if (s.lifecycle_state === 'NEEDS_ATTENTION') return 'Needs attention';
    return 'Active';
  }

  /* ---------- list ---------- */
  function openList() {
    _mode = 'list'; _scenarioId = null; _editingRef = null; _modal = null;
    renderList();
  }

  function renderList() {
    const scenarios = SCN().listScenarios();
    const cards = scenarios.map(s => `
      <div class="scn-card" data-od-id="scenario-${esc(s.scenario_id)}">
        <div class="scn-head">
          <div class="scn-title">${esc(displayName(s.name))}</div>
          <button class="pctl" type="button" data-scact="delete-scenario" data-id="${esc(s.scenario_id)}" aria-label="Delete scenario ${esc(s.name)}">Delete</button>
        </div>
        <div class="scn-meta">
          <span class="muted small">${esc(originLabel(s.origin))}</span>
          <span class="muted small">·</span>
          <span class="muted small">${esc(stateLabel(s))}</span>
          <span class="muted small">·</span>
          <span class="muted small">edited ${esc((s.updated_at || '').slice(0, 10))}</span>
        </div>
        <div class="scn-actions">
          <button class="opt" type="button" data-scact="open-editor" data-id="${esc(s.scenario_id)}" aria-label="Open scenario ${esc(s.name)}">Open / edit</button>
        </div>
      </div>`).join('');

    $view().innerHTML = `
      <div class="card" data-od-id="scenario-list">
        <div class="pcontrols"><button class="pctl" type="button" data-scact="back-home">Exit</button></div>
        <div class="node-title">Check-in scenarios</div>
        <h1 class="prompt">Check-in scenarios</h1>
        <p class="support">Scenarios you add here appear under Situational Check-Ins on the home page. Add your own, edit them, or delete them to change what is offered there. The three premade check-ins always stay as they are.</p>
        <div class="btnrow" style="margin-bottom:18px"><button class="btn" type="button" data-scact="new-scenario"><b>+ New scenario</b></button></div>
        ${cards || '<p class="muted">No scenarios yet.</p>'}
      </div>`;
    if (_modal) renderModal();
  }

  /* ---------- new scenario ---------- */
  function renderNewScenario() {
    _mode = 'new';
    const prev = document.getElementById('scn-name');
    const nameVal = prev ? esc(prev.value) : '';
    $view().innerHTML = `
      <div class="card" data-od-id="scenario-new">
        <div class="pcontrols"><button class="pctl" type="button" data-scact="back-list">Back</button></div>
        <div class="node-title">New check-in scenario</div>
        <h1 class="prompt">Name your scenario</h1>
        <div class="field"><label for="scn-name">Name</label><input id="scn-name" type="text" data-scn-name value="${nameVal}" /></div>
        <div class="options">
          <button class="opt" type="button" data-scact="open-template-picker">Start with a Template</button>
          <button class="opt" type="button" data-scact="create-copy">Start with an Existing Scenario</button>
          <button class="opt" type="button" data-scact="create-blank">Start from scratch</button>
        </div>
        <div id="copy-choices" hidden></div>
      </div>`;
    if (_modal) renderModal();
  }

  function nameInput() { const el = document.getElementById('scn-name'); return el ? el.value.trim() : ''; }
  function requireName() {
    if (!nameInput()) { alert('Please enter a name first.'); return false; }
    return true;
  }

  /* ---------- template picker modal ---------- */
  function openTemplatePicker() {
    const starters = (window.ENGINE && window.ENGINE.PKG && window.ENGINE.PKG.starters) || [];
    const rows = starters.map(s => `
      <div class="resultrow"><span>${esc(displayName(s.title))}</span>
      <span><button class="ghost" type="button" data-scact="template-use" data-starter="${esc(s.id)}">Use</button>
      <button class="ghost" type="button" data-scact="template-preview" data-starter="${esc(s.id)}">Preview</button></span></div>`).join('');
    _modal = { html: `
      <h2 class="prompt">Select/Preview Starting Template</h2>
      <div class="scn-search">${rows || '<p class="muted">No templates available.</p>'}</div>
      <div class="btnrow"><button class="btn2" type="button" data-scact="close-modal">Cancel</button></div>` };
    renderNewScenario();
  }

  function templatePreview(id) {
    const s = window.ENGINE && window.ENGINE.PKG && window.ENGINE.PKG.starterById && window.ENGINE.PKG.starterById[id];
    if (!s) { openTemplatePicker(); return; }
    _modal = { html: `
      <h2 class="prompt">${esc(displayName(s.title))}</h2>
      <p class="support">${esc(s.promise)}</p>
      <dl class="kv">
        <dt>Primary moment</dt><dd>${esc(s.primary_moment)}</dd>
        <dt>Standard route</dt><dd>${esc(s.standard_duration)} · begins <code>${esc(s.standard_entry_node)}</code></dd>
        <dt>Low-capacity route</dt><dd>${esc(s.low_duration)} · begins <code>${esc(s.low_entry_node)}</code></dd>
        <dt>Privacy default</dt><dd>${esc(s.privacy_default)}</dd>
      </dl>
      <div class="btnrow">
        <button class="btn" type="button" data-scact="template-use" data-starter="${esc(id)}">Use</button>
        <button class="btn2" type="button" data-scact="back-template-picker">Back</button>
      </div>` };
    renderNewScenario();
  }

  /* ---------- editor ---------- */
  function openEditor(id) {
    _mode = 'editor'; _scenarioId = id; _editingRef = null; _modal = null;
    renderEditor();
  }

  function renderEditor() {
    const s = SCN().getScenario(_scenarioId);
    if (!s) { openList(); return; }
    const focusRef = s.editor_view_state.focus_ref || s.roots.standard;
    const proj = SCN().projection(s, focusRef);
    const draftActive = s.lifecycle_state === 'DRAFT_CHANGES_NOT_ACTIVE';

    const box = (ref, text, kind, opts) => {
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
      const mainField = editing
        ? (_editField === 'sub'
          ? `<div class="scn-text${qtext} scn-field" data-scact="begin-edit-text" data-ref="${esc(ref)}" title="Click to edit the main text">${esc(text) || '<em class="muted">(empty)</em>'}</div>`
          : `<textarea class="scn-edit" data-scact="edit-input" data-field="text" data-ref="${esc(ref)}" rows="2">${esc(text)}</textarea>`)
        : `<div class="scn-text${qtext}">${esc(text) || '<em class="muted">(empty)</em>'}</div>`;
      const subField = sub ? (editing
        ? (_editField === 'sub'
          ? `<textarea class="scn-edit scn-subfield" data-scact="edit-input" data-field="sub" data-ref="${esc(ref)}" rows="2">${esc(sub)}</textarea>`
          : `<div class="scn-sub scn-field" data-scact="begin-edit-sub" data-ref="${esc(ref)}" title="Click to edit the subtext">${esc(sub)}</div>`)
        : `<div class="scn-sub">${esc(sub)}</div>`) : '';
      return `<div class="scn-box scn-${kind.toLowerCase()}"${editStyle} draggable="${editable}" data-scact="box" data-ref="${esc(ref)}" data-kind="${esc(kind)}" aria-label="${esc(label)}: ${esc(text || '(empty)')}">
        <div class="scn-box-head">
          <span class="muted small">${esc(label)}</span>
        </div>
        ${mainField}
        ${subField}
        ${opts || ''}
      </div>`;
    };

    // "Write my own" custom-input answers stay in runtime routing but are
    // not part of the Scenario Setup editing view
    const isCustomInputAnswerRef = (ref) => {
      if (typeof ref !== 'string' || ref.indexOf('base:answer:') !== 0) return false;
      const o = (window.ENGINE.PKG.options || []).find(x => x.id === ref.slice('base:answer:'.length));
      return !!(o && o.control_intent === 'CUSTOM_INPUT');
    };

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
        ${(proj.focus.kind === 'QUESTION' || proj.focus.kind === 'ANSWER') ? `<button class="scn-mini" type="button" data-scact="replace" data-ref="${esc(proj.focus_ref)}">Browse Alternatives</button><button class="scn-mini" type="button" data-scact="begin-edit" data-ref="${esc(proj.focus_ref)}">Manual Edit</button>` : ''}
      </div>`) : '';

    // add child / sibling availability — questions never get a sibling "+":
    // siblings of a question are reached by adding/routing answers
    const canAddChild = proj.focus && (proj.focus.kind === 'QUESTION' || (proj.focus.kind === 'ANSWER' && !hasDest(proj.focus_ref) && !isToggle(proj.focus)));
    const canAddSibling = proj.focus && proj.focus.kind === 'ANSWER';

    $view().innerHTML = `
      <div class="card scn-editor-card" data-od-id="scenario-editor">
        <div class="pcontrols">
          <button class="pctl" type="button" data-scact="back-list">Exit</button>
          <button class="pctl" type="button" data-scact="undo" ${(s.history && s.history.length) ? '' : 'disabled'} aria-label="Undo" title="Undo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
          <button class="pctl" type="button" data-scact="redo" aria-label="Redo" title="Redo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
        </div>
        <div class="node-title">${esc(displayName(s.name))} · ${esc(stateLabel(s))}</div>
        ${draftActive ? '<div class="note dash">Draft changes not active — the last valid version is still used.</div>' : ''}
        <div class="scn-canvas">
          ${parents ? `<div class="scn-group"><div class="scn-level">${parents}</div></div>` : ''}
          ${parents ? '<div class="scn-arrow" aria-hidden="true"></div>' : ''}
          <div class="scn-focus" data-scact="drop-zone" data-ref="${esc(proj.focus_ref)}"><div class="scn-focus-label">Currently editing — drag a question or answer here to edit it:</div><div class="scn-level">${focusBox}</div></div>
          ${(siblings || canAddSibling) ? `<div class="scn-group"><div class="scn-level">${siblings}${canAddSibling ? `<button class="scn-add has-cursor-tip" type="button" data-scact="add-sibling" data-ref="${esc(proj.focus_ref)}" data-tip="add another answer" aria-label="Add sibling">+</button>` : ''}</div></div>` : ''}
          ${(children || canAddChild) ? '<div class="scn-arrow" aria-hidden="true"></div>' : ''}
          ${(children || canAddChild) ? `<div class="scn-group"><div class="scn-level">${children}${canAddChild ? (proj.focus.kind === 'QUESTION'
            ? `<button class="scn-add has-cursor-tip" type="button" data-scact="add-child" data-ref="${esc(proj.focus_ref)}" data-tip="add another answer" aria-label="Add child">+</button>`
            : `<button class="scn-add scn-add-wide" type="button" data-scact="choose-child-question" data-ref="${esc(proj.focus_ref)}" aria-label="Choose another question">Choose another question</button>`) : ''}</div></div>` : ''}
        </div>
        <div class="scn-dustbin has-cursor-tip" data-tip="delete an item by dragging it here" data-scact="dustbin" aria-label="Delete an item" role="region">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </div>
      </div>`;
    if (_modal) renderModal();
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
    $view().addEventListener('click', (e) => {
      const btn = e.target.closest('[data-scact]');
      if (!btn) return;
      const act = btn.getAttribute('data-scact');
      const id = btn.getAttribute('data-id');
      const ref = btn.getAttribute('data-ref');

      if (act === 'back-home') { window.UI.renderHome(); return; }
      if (act === 'back-list') { openList(); return; }
      if (act === 'open-editor') { openEditor(id); return; }
      if (act === 'new-scenario') { renderNewScenario(); return; }
      if (act === 'open-template-picker') { openTemplatePicker(); return; }
      if (act === 'template-preview') { templatePreview(btn.getAttribute('data-starter')); return; }
      if (act === 'back-template-picker') { openTemplatePicker(); return; }
      if (act === 'template-use') { if (!requireName()) return; const s = SCN().createScenario(nameInput(), 'TEMPLATE', btn.getAttribute('data-starter')); openEditor(s.scenario_id); return; }
      if (act === 'create-copy') { if (!requireName()) return; renderCopyChoices(); return; }
      if (act === 'copy-pick') { const src = btn.getAttribute('data-src'); const s = SCN().createScenario(nameInput(), 'COPY', null, src); openEditor(s.scenario_id); return; }
      if (act === 'create-blank') { if (!requireName()) return; const s = SCN().createScenario(nameInput(), 'BLANK'); openEditor(s.scenario_id); return; }
      if (act === 'delete-scenario') { confirmDeleteScenario(id); return; }
      if (act === 'confirm-delete') { SCN().deleteScenario(id); openList(); return; }
      if (act === 'close-modal') { _modal = null; _pendingReplaceRef = null; if (_mode === 'editor') renderEditor(); else if (_mode === 'new') renderNewScenario(); else renderList(); return; }
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
      if (e.target && e.target.classList && e.target.classList.contains('scn-edit')) {
        const ref = e.target.getAttribute('data-ref');
        const isSub = e.target.getAttribute('data-field') === 'sub';
        const commitFn = isSub ? SCN().commitSubTextEdit : SCN().commitTextEdit;
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitFn(_scenarioId, ref, e.target.value); _editingRef = null; _editWidth = null; _editField = 'text'; renderEditor(); }
        else if (e.key === 'Escape') { _editingRef = null; _editWidth = null; _editField = 'text'; renderEditor(); }
      }
    });
    $view().addEventListener('blur', (e) => {
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

    // drag-to-focus — dropping onto the lavender "Currently Editing" box is the
    // only way to change focus (8px threshold, view-state only)
    let dragEl = null;
    // hover hint: since clicking a parent/sibling/child does nothing, a small
    // tooltip follows the cursor over draggable boxes saying "drag and drop"
    const tip = document.createElement('div');
    tip.className = 'scn-tip';
    tip.textContent = 'drag into the “Currently editing” box';
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
      const bin = e.target.closest('.scn-dustbin');
      if (bin) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!bin.classList.contains('scn-drop-hover')) bin.classList.add('scn-drop-hover');
        const kind = dragEl ? dragEl.getAttribute('data-kind') : '';
        tip.textContent = kind === 'QUESTION' ? 'delete this question' : (kind === 'ANSWER' ? 'delete this answer' : 'delete an item');
        tip.classList.add('on');
        const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
        tip.style.left = Math.max(8, x) + 'px';
        tip.style.top = (e.clientY + 16) + 'px';
        return;
      }
      const dz = e.target.closest('.scn-focus');
      if (!dz) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!dz.classList.contains('scn-drop-hover')) dz.classList.add('scn-drop-hover');
    });
    $view().addEventListener('dragleave', (e) => {
      const bin = e.target.closest('.scn-dustbin');
      if (bin) { bin.classList.remove('scn-drop-hover'); tip.classList.remove('on'); return; }
      const dz = e.target.closest('.scn-focus');
      if (dz) dz.classList.remove('scn-drop-hover');
    });
    $view().addEventListener('drop', (e) => {
      const bin = e.target.closest('.scn-dustbin');
      document.querySelectorAll('.scn-dustbin').forEach(el => el.classList.remove('scn-drop-hover'));
      document.querySelectorAll('.scn-focus').forEach(el => el.classList.remove('scn-drop-hover'));
      tip.classList.remove('on');
      const ref = e.dataTransfer.getData('text/plain');
      const kind = dragEl ? dragEl.getAttribute('data-kind') : '';
      dragEl = null;
      if (bin) {
        e.preventDefault();
        if (ref && (kind === 'QUESTION' || kind === 'ANSWER')) {
          SCN().deleteElementPlacement(_scenarioId, ref);
          renderEditor();
        }
        return;
      }
      const dz = e.target.closest('.scn-focus');
      if (!dz) return;
      e.preventDefault();
      if (ref) {
        _editingRef = null; _editWidth = null; _editField = 'text'; _switchTo = null;
        SCN().setFocus(_scenarioId, ref); renderEditor();
      }
    });
  }

  function renderCopyChoices() {
    const list = SCN().listScenarios().map(s => `<button class="opt" type="button" data-scact="copy-pick" data-src="${esc(s.scenario_id)}">${esc(s.name)}</button>`).join('');
    document.getElementById('copy-choices').innerHTML = '<div class="note">Copy which scenario?</div><div class="options">' + list + '</div>';
    document.getElementById('copy-choices').hidden = false;
  }

  function navSnapshot() { const saved = structuredClone({_mode,_scenarioId,_editingRef,_editField,_editWidth,_switchTo,_modal,_pendingReplaceRef}); return () => { ({_mode,_scenarioId,_editingRef,_editField,_editWidth,_switchTo,_modal,_pendingReplaceRef} = structuredClone(saved)); }; }
  return { navSnapshot, openList, openEditor, bind };
})();
