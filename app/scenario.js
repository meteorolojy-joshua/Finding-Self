/* ============================================================
   Scenario Setup engine — local question/answer graph editor.
   Stores user-owned overlays over the immutable v0.6 graph.
   No destination-app control, no run-data capture.
   ============================================================ */
'use strict';

window.SCENARIO = (() => {
  const LS_KEY = 'fsaw.scenarios.v1';
  const MIGRATION_VERSION = '0.1';
  const _redoStacks = {};

  const P = () => window.ENGINE.PKG;

  /* ---------- id helpers ---------- */
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function now() { return new Date().toISOString(); }

  /* ---------- storage ---------- */
  function loadStore() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { migration_version: null, scenarios: {} };
      const store = JSON.parse(raw);
      if (store && store.scenarios) return store;
      return { migration_version: null, scenarios: {} };
    } catch (e) { return { migration_version: null, scenarios: {} }; }
  }
  function saveStore(store) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable */ }
  }

  /* ---------- base graph (derived, never stored) ---------- */
  function findOption(id) {
    const Pk = P();
    for (const k in (Pk.optionsByNode || {})) {
      const o = Pk.optionsByNode[k].find(x => x.id === id);
      if (o) return o;
    }
    return null;
  }
  function destRef(dest) {
    const Pk = P();
    if (Pk.nodeById[dest]) return 'base:question:' + dest;
    const dd = Pk.destById[dest];
    if (dd && dd.next_node && Pk.nodeById[dd.next_node]) return 'base:question:' + dd.next_node;
    return 'system:' + dest;
  }
  function baseQuestionEl(nodeId) {
    const n = P().nodeById[nodeId]; if (!n) return null;
    return { ref: 'base:question:' + nodeId, kind: 'QUESTION', text: n.prompt, support: n.support_copy || '', inherited: true,
      runtime_contract: { selection_mode: /^Multi/i.test(n.selection_mode || '') ? 'MULTI' : 'SINGLE',
        response_slot: n.question_source_id || nodeId, world_code: n.world_code || 'W*',
        function_code: n.function_code || 'NEUTRAL', page_role: n.page_role || 'QUESTION' } };
  }
  function baseAnswerEl(oid) {
    const o = findOption(oid); if (!o) return null;
    return { ref: 'base:answer:' + oid, kind: 'ANSWER', text: o.label, inherited: true,
      runtime_contract: { interaction: o.control_intent === 'TOGGLE_SELECTION' ? 'MULTI_TOGGLE' : 'SELECT_AND_ROUTE',
        answer_intent: o.answer_intent || 'USER_AUTHORED', state_writes: o.state_writes || [] } };
  }
  function materializeBaseElement(elements, ref) {
    if (elements.has(ref)) return;
    if (typeof ref !== 'string') return;
    if (ref.startsWith('base:question:')) { const el = baseQuestionEl(ref.slice('base:question:'.length)); if (el) elements.set(ref, el); }
    else if (ref.startsWith('base:answer:')) { const el = baseAnswerEl(ref.slice('base:answer:'.length)); if (el) elements.set(ref, el); }
  }
  function buildBaseGraph(starterId) {
    const Pk = P();
    const starter = Pk.starterById[starterId];
    if (!starter) return { elements: new Map(), edges: new Map() };
    const elements = new Map(), edges = new Map(), visited = new Set();
    function addEl(ref, el) { if (!elements.has(ref)) elements.set(ref, el); }
    function addEdge(eid, f, t, r, o) { if (!edges.has(eid)) edges.set(eid, { edge_id: eid, from_ref: f, to_ref: t, relation: r, order: o }); }

    function visitQuestion(nodeId) {
      if (visited.has(nodeId)) return; visited.add(nodeId);
      const n = Pk.nodeById[nodeId]; if (!n) return;
      const qref = 'base:question:' + nodeId;
      addEl(qref, baseQuestionEl(nodeId));
      const spec = Pk.defaultByNode[nodeId];
      const seeded = spec ? (spec.seeded_answer_option_ids || []) : [];
      seeded.forEach((oid, idx) => {
        const aref = 'base:answer:' + oid;
        addEl(aref, baseAnswerEl(oid));
        addEdge('B.QHA.' + nodeId + '.' + oid, qref, aref, 'QUESTION_HAS_ANSWER', idx);
        const o = findOption(oid);
        if (o) {
          // multi-toggle answers self-route; their selection is not a navigational
          // child, so no ANSWER_ROUTES_TO edge is drawn (avoids a parent/child loop)
          const isToggle = o.control_intent === 'TOGGLE_SELECTION';
          if (!isToggle) { addEdge('B.ART.' + oid, aref, destRef(o.destination), 'ANSWER_ROUTES_TO', 0); visitDest(o.destination); }
        }
      });
      (spec ? (spec.continuation_control_option_ids || []) : []).forEach(oid => {
        const o = findOption(oid); if (!o) return;
        addEdge('B.QCT.' + nodeId + '.' + oid, qref, destRef(o.destination), 'QUESTION_CONTINUES_TO', 0);
        visitDest(o.destination);
      });
    }
    function visitDest(dest) {
      if (Pk.nodeById[dest]) { visitQuestion(dest); return; }
      const dd = Pk.destById[dest];
      if (dd && dd.next_node && Pk.nodeById[dd.next_node]) visitQuestion(dd.next_node);
    }

    if (starter.standard_entry_node) {
      addEdge('B.ENTRY.' + starterId + '.standard', 'entry:' + starterId + ':standard', 'base:question:' + starter.standard_entry_node, 'ENTRY_STARTS_AT', 0);
      visitQuestion(starter.standard_entry_node);
    }
    if (starter.low_entry_node) {
      addEdge('B.ENTRY.' + starterId + '.low', 'entry:' + starterId + ':low', 'base:question:' + starter.low_entry_node, 'ENTRY_STARTS_AT', 0);
      visitQuestion(starter.low_entry_node);
    }
    return { elements, edges };
  }

  /* ---------- effective graph composition ---------- */
  function composeGraph(scenario) {
    const elements = new Map(), edges = new Map();
    if (scenario.origin && scenario.origin.type === 'TEMPLATE' && scenario.origin.base_starter_id) {
      const base = buildBaseGraph(scenario.origin.base_starter_id);
      base.elements.forEach((el, ref) => elements.set(ref, { ...el }));
      base.edges.forEach((e, id) => edges.set(id, { ...e }));
    }
    (scenario.custom_elements || []).forEach(el => {
      elements.set(el.ref, { ref: el.ref, kind: el.kind, text: el.text, inherited: false, draft: !!el.draft,
        source_inventory_id: el.source_inventory_id, runtime_contract: el.runtime_contract });
    });
    (scenario.edge_patches || []).forEach(p => {
      if (p.operation === 'ADD') edges.set(p.edge.edge_id, { ...p.edge });
      else if (p.operation === 'HIDE') edges.delete(p.target_edge_id);
      else if (p.operation === 'REORDER') { const e = edges.get(p.target_edge_id); if (e) e.order = p.order; }
    });
    // edges may reference canonical questions/answers that the scenario's own
    // origin never pulled in (e.g. BLANK + "choose another question") —
    // materialize those base elements so the graph composes
    edges.forEach(e => { materializeBaseElement(elements, e.from_ref); materializeBaseElement(elements, e.to_ref); });
    (scenario.hidden_element_refs || []).forEach(ref => {
      elements.delete(ref);
      edges.forEach((e, id) => { if (e.from_ref === ref || e.to_ref === ref) edges.delete(id); });
    });
    (scenario.content_overrides || []).forEach(ov => {
      const el = elements.get(ov.target_ref);
      if (el) { el.text = ov.text; el.source_inventory_id = ov.source_inventory_id; }
    });
    (scenario.support_overrides || []).forEach(ov => {
      const el = elements.get(ov.target_ref);
      if (el) el.support = ov.text;
    });
    return { elements, edges, roots: scenario.roots || { standard: null, low: null } };
  }

  function effectiveElement(scenario, ref) { return composeGraph(scenario).elements.get(ref) || null; }

  /* ---------- validation ---------- */
  function validate(scenario) {    const issues = [];
    const g = composeGraph(scenario);
    const err = (code, msg, refs) => issues.push({ code, severity: 'ERROR', message: msg, affected_refs: refs || [] });
    const warn = (code, msg, refs) => issues.push({ code, severity: 'WARNING', message: msg, affected_refs: refs || [] });

    const stdRoot = g.roots.standard, lowRoot = g.roots.low;
    if (!stdRoot || !g.elements.has(stdRoot)) err('E_ROOT_MISSING', 'Standard root is missing or hidden', [stdRoot || 'entry:standard']);

    g.elements.forEach((el, ref) => {
      if (!el.draft && (!el.text || !String(el.text).trim())) err('E_EMPTY_COMMITTED_TEXT', 'Committed element has empty text', [ref]);
    });

    const answerOut = new Map();
    g.edges.forEach(e => {
      const from = g.elements.get(e.from_ref), toEl = g.elements.get(e.to_ref);
      const toIsSystem = e.to_ref.startsWith('system:');
      if (e.relation === 'QUESTION_HAS_ANSWER') {
        if (!from || from.kind !== 'QUESTION' || (toEl && toEl.kind !== 'ANSWER')) err('E_INVALID_ALTERNATION', 'QUESTION_HAS_ANSWER must go question→answer', [e.from_ref, e.to_ref]);
      } else if (e.relation === 'ANSWER_ROUTES_TO') {
        if (!from || from.kind !== 'ANSWER') err('E_INVALID_ALTERNATION', 'ANSWER_ROUTES_TO must start at an answer', [e.from_ref]);
        else if (!toIsSystem && (!toEl || toEl.kind !== 'QUESTION')) err('E_INVALID_ALTERNATION', 'ANSWER_ROUTES_TO must end at question or system', [e.to_ref]);
        answerOut.set(e.from_ref, (answerOut.get(e.from_ref) || 0) + 1);
      }
    });
    g.elements.forEach((el, ref) => {
      if (el.kind !== 'ANSWER') return;
      if (el.draft) return; // transient draft answers are not validated for dangling
      if (el.runtime_contract && el.runtime_contract.interaction === 'MULTI_TOGGLE') return;
      const n = answerOut.get(ref) || 0;
      if (n === 0) err('E_DANGLING_ANSWER', 'Single-select answer lacks a destination', [ref]);
      if (n > 1) err('E_MULTIPLE_UNCONDITIONAL_TARGETS', 'Answer has multiple unconditional destinations', [ref]);
    });
    g.elements.forEach((el, ref) => {
      if (el.kind !== 'QUESTION') return;
      if (el.draft) return; // transient draft questions skip the Continue rule
      if (!(el.runtime_contract && el.runtime_contract.selection_mode === 'MULTI')) return;
      const c = [];
      g.edges.forEach(e => { if (e.relation === 'QUESTION_CONTINUES_TO' && e.from_ref === ref) c.push(e.edge_id); });
      if (c.length === 0) err('E_MULTI_CONTINUE_MISSING', 'Multi-select question lacks a Continue connector', [ref]);
      if (c.length > 1) err('E_MULTI_CONTINUE_MULTIPLE', 'Multi-select question has multiple Continue connectors', [ref]);
    });
    (scenario.hidden_element_refs || []).forEach(ref => {
      if (ref.startsWith('base:')) {
        const raw = ref.slice(5);
        if (!raw.startsWith('question:') && !raw.startsWith('answer:')) err('E_UNKNOWN_BASE_REFERENCE', 'Unknown base reference', [ref]);
      }
    });
    if (stdRoot && (scenario.hidden_element_refs || []).includes(stdRoot)) err('E_HIDDEN_ROOT', 'Entry targets a hidden question', [stdRoot]);
    if (lowRoot && (scenario.hidden_element_refs || []).includes(lowRoot)) err('E_HIDDEN_ROOT', 'Entry targets a hidden question', [lowRoot]);

    let reachableExit = false;
    g.edges.forEach(e => { if (e.to_ref.startsWith('system:')) reachableExit = true; });
    if (!reachableExit && g.elements.size > 0) warn('W_NO_COMPLETION_REACHABLE', 'No completion or exit is reachable', []);

    const errors = issues.filter(i => i.severity === 'ERROR');
    return { issues, hasErrors: errors.length > 0, errorCodes: errors.map(i => i.code) };
  }

  /* ---------- snapshot / restore / revision ---------- */
  function snapMutable(s) {
    return JSON.parse(JSON.stringify({
      name: s.name, roots: s.roots, lifecycle_state: s.lifecycle_state, deleted_at: s.deleted_at ?? null,
      custom_elements: s.custom_elements || [], content_overrides: s.content_overrides || [],
      support_overrides: s.support_overrides || [],
      edge_patches: s.edge_patches || [], hidden_element_refs: s.hidden_element_refs || [],
      detached_items: s.detached_items || [], active_revision: s.active_revision
    }));
  }
  function restoreMutable(s, snap) {
    s.name = snap.name; s.roots = snap.roots; s.lifecycle_state = snap.lifecycle_state; s.deleted_at = snap.deleted_at;
    s.custom_elements = snap.custom_elements; s.content_overrides = snap.content_overrides;
    s.support_overrides = snap.support_overrides || [];
    s.edge_patches = snap.edge_patches; s.hidden_element_refs = snap.hidden_element_refs;
    s.detached_items = snap.detached_items; s.active_revision = snap.active_revision;
  }
  function revalidate(s) {
    const v = validate(s);
    const committedQuestion = (s.custom_elements || []).some(el => el.kind === 'QUESTION' && !el.draft && (el.text || '').trim());
    const hasBase = s.origin && (s.origin.type === 'TEMPLATE' || s.origin.type === 'COPY');
    const committed = hasBase || committedQuestion;
    if (v.hasErrors) { s.validation = { validated_revision: s.draft_revision, status: 'INVALID', issues: v.issues }; if (!s.deleted_at) s.lifecycle_state = 'DRAFT_CHANGES_NOT_ACTIVE'; }
    else if (!committed) { s.validation = { validated_revision: s.draft_revision, status: 'EMPTY', issues: v.issues }; if (!s.deleted_at) { s.lifecycle_state = 'EMPTY_DRAFT'; } }
    else { s.validation = { validated_revision: s.draft_revision, status: 'VALID', issues: v.issues }; if (!s.deleted_at) { s.active_revision = s.draft_revision; s.lifecycle_state = 'ACTIVE'; } }
  }
  function commit(s, command, beforeSnap) {
    const before = s.draft_revision;
    s.draft_revision = (s.draft_revision || 0) + 1;
    s.history = s.history || [];
    s.history.push({ event_id: 'EVT.' + uuid().slice(0,8), command, revision_before: before, revision_after: s.draft_revision,
      payload: snapMutable(s), inverse_payload: beforeSnap, committed_at: now() });
    revalidate(s);
    s.updated_at = now();
    return s;
  }

  /* ---------- migration ---------- */
  function migrate() {
    const store = loadStore();
    if (store.migration_version === MIGRATION_VERSION) return store;
    const templates = [
      { starter: 'SS01', id: 'SCN.DEFAULT.SS01', name: 'Before I Enter Social Media', std: 'NOW.FEED.S01', low: 'NOW.FEED.L01' },
      { starter: 'SS02', id: 'SCN.DEFAULT.SS02', name: 'After Something Felt Off', std: 'NOW.OFF.S01', low: 'NOW.OFF.L01' },
      { starter: 'SS06', id: 'SCN.DEFAULT.SS06', name: "When I Can't Tell What I Want", std: 'NOW.UNCLEAR.S01', low: 'NOW.UNCLEAR.L01' }
    ];
    templates.forEach(t => {
      if (store.scenarios[t.id]) return;
      const scenario = {
        scenario_id: t.id, name: t.name, origin: { type: 'TEMPLATE', base_starter_id: t.starter },
        base_content_version: '0.6', lifecycle_state: 'ACTIVE',
        roots: { standard: 'base:question:' + t.std, low: 'base:question:' + t.low },
        trigger_refs: [], custom_elements: [], content_overrides: [], support_overrides: [], edge_patches: [],
        hidden_element_refs: [], detached_items: [], draft_revision: 0, active_revision: 0,
        editor_view_state: { focus_ref: 'base:question:' + t.std, incoming_context_edge_id: null, expanded_parent_refs: [], advanced_system_nodes_visible: false },
        validation: { validated_revision: 0, status: 'VALID', issues: [] },
        history: [], deleted_at: null, created_at: now(), updated_at: now()
      };
      const v = validate(scenario);
      scenario.validation = { validated_revision: 0, status: v.hasErrors ? 'INVALID' : 'VALID', issues: v.issues };
      store.scenarios[t.id] = scenario;
    });
    store.migration_version = MIGRATION_VERSION;
    saveStore(store);
    return store;
  }

  /* ---------- list / get ---------- */
  function listScenarios() { const store = migrate(); return Object.values(store.scenarios).filter(s => !s.deleted_at && s.lifecycle_state !== 'DELETED'); }
  function allScenarios() { return Object.values(migrate().scenarios); }
  function getScenario(id) { return migrate().scenarios[id] || null; }
  function saveScenario(s) { const store = migrate(); store.scenarios[s.scenario_id] = s; saveStore(store); return s; }

  /* ---------- create / rename / delete / restore ---------- */
  function createScenario(name, originType, baseStarterId, sourceScenarioId) {
    const store = migrate();
    const id = 'SCN.CUSTOM.' + uuid().slice(0, 8);
    let origin, custom_elements = [], edge_patches = [], content_overrides = [], support_overrides = [], roots = { standard: null, low: null };
    if (originType === 'TEMPLATE') {
      const t = P().starterById[baseStarterId];
      origin = { type: 'TEMPLATE', base_starter_id: baseStarterId };
      roots = { standard: 'base:question:' + t.standard_entry_node, low: 'base:question:' + t.low_entry_node };
    } else if (originType === 'COPY') {
      const src = store.scenarios[sourceScenarioId];
      origin = { type: 'COPY', source_scenario_id: sourceScenarioId, source_revision: src ? (src.active_revision ?? 0) : 0 };
      if (src) { const snap = snapshotScenario(src); custom_elements = snap.custom_elements; edge_patches = snap.edge_patches; content_overrides = snap.content_overrides; support_overrides = snap.support_overrides || []; roots = snap.roots; }
    } else {
      origin = { type: 'BLANK' };
      const qid = uuid();
      custom_elements.push({ ref: 'scenario:question:' + qid, kind: 'QUESTION', text: '', draft: true, source_inventory_id: null,
        runtime_contract: { selection_mode: 'SINGLE', response_slot: 'scenario_response.' + id + '.' + qid.slice(0,8), world_code: 'W*', function_code: 'NEUTRAL', page_role: 'USER_AUTHORED' }, created_at: now(), updated_at: now() });
    }
    if (originType === 'BLANK' && custom_elements[0]) roots.standard = custom_elements[0].ref;
    const scenario = {
      scenario_id: id, name, origin, base_content_version: '0.6', lifecycle_state: 'EMPTY_DRAFT', roots,
      trigger_refs: [], custom_elements, content_overrides, support_overrides, edge_patches, hidden_element_refs: [], detached_items: [],
      draft_revision: 0, active_revision: null,
      editor_view_state: { focus_ref: roots.standard || null, incoming_context_edge_id: null, expanded_parent_refs: [], advanced_system_nodes_visible: false },
      validation: { validated_revision: 0, status: 'EMPTY', issues: [] },
      history: [], deleted_at: null, created_at: now(), updated_at: now()
    };
    revalidate(scenario);
    store.scenarios[id] = scenario; saveStore(store);
    return scenario;
  }

  function snapshotScenario(src) {
    const g = composeGraph(src);
    const custom_elements = [], content_overrides = [], edge_patches = [];
    const support_overrides = (src.support_overrides || []).map(ov => ({ ...ov }));
    g.elements.forEach((el, ref) => {
      if (ref.startsWith('scenario:')) custom_elements.push({ ref: el.ref, kind: el.kind, text: el.text, draft: false, source_inventory_id: el.source_inventory_id || null, runtime_contract: el.runtime_contract, created_at: now(), updated_at: now() });
      else if (ref.startsWith('base:')) content_overrides.push({ override_id: 'OV.' + uuid().slice(0,8), target_ref: ref, text: el.text, source_kind: 'INLINE_TEXT', source_inventory_id: null, preserve_runtime_contract: true, created_at: now(), updated_at: now() });
    });
    g.edges.forEach(e => edge_patches.push({ patch_id: 'P.' + uuid().slice(0,8), operation: 'ADD', edge: { ...e } }));
    return { custom_elements, content_overrides, support_overrides, edge_patches, roots: { ...src.roots } };
  }

  function renameScenario(id, name) { const s = getScenario(id); if (!s) return null; const snap = snapMutable(s); s.name = name; commit(s, 'RENAME_SCENARIO', snap); saveScenario(s); return s; }
  function deleteScenario(id) { const s = getScenario(id); if (!s) return null; const snap = snapMutable(s); s.lifecycle_state = 'DELETED'; s.deleted_at = now(); commit(s, 'DELETE_SCENARIO', snap); saveScenario(s); return s; }
  function restoreScenario(id) { const s = getScenario(id); if (!s) return null; const snap = snapMutable(s); s.deleted_at = null; s.lifecycle_state = s.active_revision != null ? 'ACTIVE' : 'EMPTY_DRAFT'; commit(s, 'RESTORE_SCENARIO', snap); saveScenario(s); return s; }

  /* ---------- authored elements ---------- */
  function mkQuestion(scenarioId, qid, text, inherit) {
    return { ref: 'scenario:question:' + qid, kind: 'QUESTION', text: text || '', draft: !text, source_inventory_id: null,
      runtime_contract: inherit || { selection_mode: 'SINGLE', response_slot: 'scenario_response.' + scenarioId + '.' + qid.slice(0,8), world_code: 'W*', function_code: 'NEUTRAL', page_role: 'USER_AUTHORED' }, created_at: now(), updated_at: now() };
  }
  function mkAnswer(scenarioId, aid, text, ownerQuestion, interaction) {
    return { ref: 'scenario:answer:' + aid, kind: 'ANSWER', text: text || '', draft: !text, source_inventory_id: null,
      runtime_contract: { interaction: interaction || 'SELECT_AND_ROUTE', answer_intent: 'USER_AUTHORED', state_writes: interaction === 'MULTI_TOGGLE' ? [ownerQuestion] : [ownerQuestion] }, created_at: now(), updated_at: now() };
  }

  /* ---------- editor commands ---------- */
  function commitTextEdit(id, targetRef, text) {
    const s = getScenario(id); if (!s) return null;
    const trimmed = String(text).trim(); if (!trimmed) return s;
    const snap = snapMutable(s);
    const custom = (s.custom_elements || []).find(e => e.ref === targetRef);
    if (custom) { custom.text = trimmed; custom.draft = false; custom.updated_at = now(); }
    else {
      const ov = (s.content_overrides || []).find(o => o.target_ref === targetRef);
      if (ov) { ov.text = trimmed; ov.updated_at = now(); }
      else s.content_overrides.push({ override_id: 'OV.' + uuid().slice(0,8), target_ref: targetRef, text: trimmed, source_kind: 'INLINE_TEXT', source_inventory_id: null, preserve_runtime_contract: true, created_at: now(), updated_at: now() });
    }
    commit(s, 'COMMIT_TEXT_EDIT', snap); saveScenario(s); return s;
  }
  function commitSubTextEdit(id, targetRef, text) {
    const s = getScenario(id); if (!s) return null;
    const trimmed = String(text).trim();
    const snap = snapMutable(s);
    s.support_overrides = s.support_overrides || [];
    const ovIdx = s.support_overrides.findIndex(o => o.target_ref === targetRef);
    if (!trimmed) {
      // empty edit reverts to the package default support copy
      if (ovIdx >= 0) s.support_overrides.splice(ovIdx, 1);
    } else if (ovIdx >= 0) { s.support_overrides[ovIdx].text = trimmed; s.support_overrides[ovIdx].updated_at = now(); }
    else s.support_overrides.push({ target_ref: targetRef, text: trimmed, updated_at: now() });
    commit(s, 'COMMIT_SUB_TEXT_EDIT', snap); saveScenario(s); return s;
  }
  function replaceContentReference(id, targetRef, sourceInventoryId, text) {
    const s = getScenario(id); if (!s) return null;
    const snap = snapMutable(s);
    const custom = (s.custom_elements || []).find(e => e.ref === targetRef);
    if (custom) { custom.text = text; custom.source_inventory_id = sourceInventoryId; custom.updated_at = now(); }
    else {
      const ov = (s.content_overrides || []).find(o => o.target_ref === targetRef);
      const sk = targetRef.startsWith('base:question:') ? 'QUESTION_INVENTORY' : 'ANSWER_INVENTORY';
      if (ov) { ov.text = text; ov.source_inventory_id = sourceInventoryId; ov.source_kind = sk; ov.updated_at = now(); }
      else s.content_overrides.push({ override_id: 'OV.' + uuid().slice(0,8), target_ref: targetRef, text, source_kind: sk, source_inventory_id: sourceInventoryId, preserve_runtime_contract: true, created_at: now(), updated_at: now() });
    }
    commit(s, 'REPLACE_CONTENT_REFERENCE', snap); saveScenario(s); return s;
  }
  function addChild(id, focusRef) {
    const s = getScenario(id); if (!s) return null;
    const g = composeGraph(s); const focus = g.elements.get(focusRef); if (!focus) return null;
    const snap = snapMutable(s);
    let newRef = null;
    if (focus.kind === 'QUESTION') {
      const aid = uuid(); const el = mkAnswer(id, aid, '', focusRef, (focus.runtime_contract && focus.runtime_contract.selection_mode === 'MULTI') ? 'MULTI_TOGGLE' : 'SELECT_AND_ROUTE');
      s.custom_elements.push(el); newRef = el.ref;
      s.edge_patches.push({ patch_id: 'P.' + uuid().slice(0,8), operation: 'ADD', edge: { edge_id: 'E.' + uuid().slice(0,8), from_ref: focusRef, to_ref: el.ref, relation: 'QUESTION_HAS_ANSWER', order: 999 } });
      commit(s, 'ADD_CHILD', snap); saveScenario(s);
    } else if (focus.kind === 'ANSWER') {
      const hasDest = [...g.edges.values()].some(e => e.relation === 'ANSWER_ROUTES_TO' && e.from_ref === focusRef);
      const isToggle = focus.runtime_contract && focus.runtime_contract.interaction === 'MULTI_TOGGLE';
      if (hasDest || isToggle) return null;
      const qid = uuid(); const el = mkQuestion(id, qid, ''); newRef = el.ref;
      s.custom_elements.push(el);
      s.edge_patches.push({ patch_id: 'P.' + uuid().slice(0,8), operation: 'ADD', edge: { edge_id: 'E.' + uuid().slice(0,8), from_ref: focusRef, to_ref: el.ref, relation: 'ANSWER_ROUTES_TO', order: 0 } });
      commit(s, 'ADD_CHILD', snap); saveScenario(s);
    }
    return newRef;
  }
  function addExistingChild(id, answerRef, questionRef) {
    const s = getScenario(id); if (!s) return null;
    const g = composeGraph(s);
    const from = g.elements.get(answerRef);
    if (!from || from.kind !== 'ANSWER') return null;
    // the target question may not be composed yet in this scenario (e.g. a
    // canonical question attached from a BLANK scenario) — resolve from the package
    let to = g.elements.get(questionRef);
    if (!to && typeof questionRef === 'string' && questionRef.startsWith('base:question:')) {
      to = baseQuestionEl(questionRef.slice('base:question:'.length));
    }
    if (!to || to.kind !== 'QUESTION') return null;
    const hasDest = [...g.edges.values()].some(e => e.relation === 'ANSWER_ROUTES_TO' && e.from_ref === answerRef);
    const isToggle = from.runtime_contract && from.runtime_contract.interaction === 'MULTI_TOGGLE';
    if (hasDest || isToggle) return null;
    const snap = snapMutable(s);
    s.edge_patches.push({ patch_id: 'P.' + uuid().slice(0,8), operation: 'ADD', edge: { edge_id: 'E.' + uuid().slice(0,8), from_ref: answerRef, to_ref: questionRef, relation: 'ANSWER_ROUTES_TO', order: 0 } });
    commit(s, 'ADD_EXISTING_CHILD', snap); saveScenario(s); return questionRef;
  }
  function addSibling(id, focusRef, incomingContextEdgeId) {
    const s = getScenario(id); if (!s) return null;
    const g = composeGraph(s); const focus = g.elements.get(focusRef); if (!focus) return null;
    const snap = snapMutable(s);
    let newRef = null;
    if (focus.kind === 'ANSWER') {
      const ownerEdge = [...g.edges.values()].find(e => e.relation === 'QUESTION_HAS_ANSWER' && e.to_ref === focusRef);
      if (!ownerEdge) return null;
      const aid = uuid(); const el = mkAnswer(id, aid, '', ownerEdge.from_ref); newRef = el.ref;
      s.custom_elements.push(el);
      s.edge_patches.push({ patch_id: 'P.' + uuid().slice(0,8), operation: 'ADD', edge: { edge_id: 'E.' + uuid().slice(0,8), from_ref: ownerEdge.from_ref, to_ref: el.ref, relation: 'QUESTION_HAS_ANSWER', order: 999 } });
      commit(s, 'ADD_SIBLING', snap); saveScenario(s);
    } else if (focus.kind === 'QUESTION') {
      const incoming = incomingContextEdgeId ? [...g.edges.values()].find(e => e.edge_id === incomingContextEdgeId) : null;
      if (!incoming) return null;
      const ownerQ = incoming.from_ref;
      const aid = uuid(), qid = uuid();
      const ans = mkAnswer(id, aid, '', ownerQ), q = mkQuestion(id, qid, ''); newRef = q.ref;
      s.custom_elements.push(ans, q);
      s.edge_patches.push({ patch_id: 'P.' + uuid().slice(0,8), operation: 'ADD', edge: { edge_id: 'E.' + uuid().slice(0,8), from_ref: ownerQ, to_ref: ans.ref, relation: 'QUESTION_HAS_ANSWER', order: 999 } });
      s.edge_patches.push({ patch_id: 'P.' + uuid().slice(0,8), operation: 'ADD', edge: { edge_id: 'E.' + uuid().slice(0,8), from_ref: ans.ref, to_ref: q.ref, relation: 'ANSWER_ROUTES_TO', order: 0 } });
      commit(s, 'ADD_SIBLING', snap); saveScenario(s);
    }
    return newRef;
  }
  function deleteElementPlacement(id, targetRef, incomingEdgeId) {
    const s = getScenario(id); if (!s) return null;
    const g = composeGraph(s); const target = g.elements.get(targetRef); if (!target) return s;
    if (s.roots.standard === targetRef || s.roots.low === targetRef) return s;
    let edgeId = incomingEdgeId;
    if (!edgeId) { const inc = [...g.edges.values()].find(e => e.to_ref === targetRef); if (inc) edgeId = inc.edge_id; }
    if (!edgeId) return s;
    const snap = snapMutable(s);
    const det = collectDetached(g, targetRef, edgeId);
    s.edge_patches.push({ patch_id: 'P.' + uuid().slice(0,8), operation: 'HIDE', target_edge_id: edgeId });
    if (det.element_refs.length) { s.detached_items.push({ detachment_id: 'D.' + uuid().slice(0,8), root_ref: targetRef, element_refs: det.element_refs, edge_ids: det.edge_ids, reason: 'DELETE_PLACEMENT', detached_at: now() }); }
    commit(s, 'DELETE_ELEMENT_PLACEMENT', snap); saveScenario(s); return s;
  }
  function deleteElementEverywhere(id, targetRef) {
    const s = getScenario(id); if (!s) return null;
    const g = composeGraph(s);
    if (s.roots.standard === targetRef || s.roots.low === targetRef) return s;
    const snap = snapMutable(s);
    const incoming = [...g.edges.values()].filter(e => e.to_ref === targetRef);
    const det = collectDetached(g, targetRef, null);
    incoming.forEach(e => s.edge_patches.push({ patch_id: 'P.' + uuid().slice(0,8), operation: 'HIDE', target_edge_id: e.edge_id }));
    if (det.element_refs.length) { s.detached_items.push({ detachment_id: 'D.' + uuid().slice(0,8), root_ref: targetRef, element_refs: det.element_refs, edge_ids: det.edge_ids, reason: 'DELETE_EVERYWHERE', detached_at: now() }); }
    commit(s, 'DELETE_ELEMENT_EVERYWHERE_IN_SCENARIO', snap); saveScenario(s); return s;
  }
  function collectDetached(g, targetRef, skipEdgeId) {
    const reachable = new Set(), seen = new Set(), queue = [targetRef];
    while (queue.length) {
      const cur = queue.shift(); if (seen.has(cur)) continue; seen.add(cur);
      g.edges.forEach(e => { if (e.edge_id === skipEdgeId) return; if (e.from_ref === cur && !reachable.has(e.to_ref)) { reachable.add(e.to_ref); queue.push(e.to_ref); } });
    }
    const element_refs = [...reachable].filter(r => r.startsWith('scenario:') && r !== targetRef);
    const edge_ids = [];
    g.edges.forEach(e => { if ((element_refs.includes(e.from_ref) || element_refs.includes(e.to_ref)) && e.edge_id !== skipEdgeId) edge_ids.push(e.edge_id); });
    return { element_refs, edge_ids };
  }
  function setRoot(id, rootKind, questionRef) { const s = getScenario(id); if (!s) return null; const snap = snapMutable(s); s.roots[rootKind] = questionRef; commit(s, 'SET_ROOT', snap); saveScenario(s); return s; }
  function setFocus(id, targetRef, incomingContextEdgeId) {
    const s = getScenario(id); if (!s) return null;
    s.editor_view_state.focus_ref = targetRef;
    s.editor_view_state.incoming_context_edge_id = incomingContextEdgeId || null;
    saveScenario(s); return s; // view-state only: no history/revision
  }

  /* ---------- undo / redo ---------- */
  function undo(id) {
    const s = getScenario(id); if (!s) return null;
    const evt = s.history.pop(); if (!evt) return s;
    restoreMutable(s, evt.inverse_payload);
    s.draft_revision = evt.revision_before;
    revalidate(s); saveScenario(s);
    (_redoStacks[id] = _redoStacks[id] || []).push(evt);
    return s;
  }
  function redo(id) {
    const s = getScenario(id); if (!s) return null;
    const evt = (_redoStacks[id] || []).pop(); if (!evt) return s;
    restoreMutable(s, evt.payload);
    s.draft_revision = evt.revision_after;
    revalidate(s); saveScenario(s);
    return s;
  }

  /* ---------- projection ---------- */
  // Everything reachable from startRef following question→answer and
  // answer→question edges forward. Used to distinguish real parents from
  // loop-back edges (a downstream answer routing back to an ancestor).
  function downstreamOf(g, startRef) {
    const seen = new Set([startRef]);
    const queue = [startRef];
    while (queue.length) {
      const cur = queue.shift();
      g.edges.forEach(e => {
        if (e.from_ref !== cur) return;
        if (e.relation !== 'QUESTION_HAS_ANSWER' && e.relation !== 'ANSWER_ROUTES_TO' && e.relation !== 'QUESTION_CONTINUES_TO') return;
        if (!seen.has(e.to_ref)) { seen.add(e.to_ref); queue.push(e.to_ref); }
      });
    }
    return seen;
  }
  function projection(scenario, focusRef) {
    const g = composeGraph(scenario);
    const focus = g.elements.get(focusRef) || null;
    const parents = [], siblings = [], children = [];
    const isEntryRoot = scenario.roots.standard === focusRef || scenario.roots.low === focusRef;

    if (focus && focus.kind === 'QUESTION') {
      const downstream = downstreamOf(g, focusRef);
      let firstParentAnswer = null;
      g.edges.forEach(e => {
        if (e.to_ref === focusRef && e.relation === 'ANSWER_ROUTES_TO') {
          // an answer that is itself downstream of the focus is a loop-back
          // (e.g. "Change a choice" returning to the first question) — not a parent
          if (downstream.has(e.from_ref)) return;
          const from = g.elements.get(e.from_ref);
          if (!firstParentAnswer) firstParentAnswer = e.from_ref;
          parents.push({ ref: e.from_ref, text: from ? from.text : '', kind: from ? from.kind : 'ANSWER', edge_id: e.edge_id,
            incoming_owner_question: ownerOfAnswer(g, e.from_ref) });
        }
      });
      g.edges.forEach(e => {
        if (e.from_ref === focusRef && e.relation === 'QUESTION_HAS_ANSWER') {
          const to = g.elements.get(e.to_ref);
          if (to) children.push({ ref: e.to_ref, text: to.text, kind: 'ANSWER', edge_id: e.edge_id, order: e.order, is_toggle: to.runtime_contract && to.runtime_contract.interaction === 'MULTI_TOGGLE' });
        }
        if (e.from_ref === focusRef && e.relation === 'QUESTION_CONTINUES_TO') {
          children.push({ ref: e.to_ref, text: 'After Continue', kind: 'CONTINUE', edge_id: e.edge_id, destination_ref: e.to_ref, editable: false });
        }
      });
      // Siblings are the other destinations of the parent answer's sibling
      // answers. They are only derived when the parent is a seeded/base
      // answer — a question explicitly chosen by the user (attached under a
      // scenario-authored answer) appears alone at its level.
      const ownerQ = firstParentAnswer && firstParentAnswer.indexOf('scenario:answer:') !== 0
        ? ownerOfAnswer(g, firstParentAnswer) : null;
      if (ownerQ) {
        g.edges.forEach(e => {
          if (e.from_ref === ownerQ && e.relation === 'QUESTION_HAS_ANSWER') {
            const ans = g.elements.get(e.to_ref); if (!ans) return;
            g.edges.forEach(e2 => { if (e2.from_ref === e.to_ref && e2.relation === 'ANSWER_ROUTES_TO' && e2.to_ref !== focusRef) {
              const q = g.elements.get(e2.to_ref); if (q) siblings.push({ ref: e2.to_ref, text: q.text, kind: 'QUESTION', edge_id: e2.edge_id });
            }});
          }
        });
      }
    } else if (focus && focus.kind === 'ANSWER') {
      const ownerEdge = [...g.edges.values()].find(e => e.relation === 'QUESTION_HAS_ANSWER' && e.to_ref === focusRef);
      if (ownerEdge) { const q = g.elements.get(ownerEdge.from_ref); parents.push({ ref: ownerEdge.from_ref, text: q ? q.text : '', kind: 'QUESTION', edge_id: ownerEdge.edge_id }); }
      if (ownerEdge) {
        g.edges.forEach(e => { if (e.from_ref === ownerEdge.from_ref && e.relation === 'QUESTION_HAS_ANSWER' && e.to_ref !== focusRef) {
          const to = g.elements.get(e.to_ref); if (to) siblings.push({ ref: e.to_ref, text: to.text, kind: 'ANSWER', edge_id: e.edge_id, order: e.order });
        }});
      }
      g.edges.forEach(e => {
        if (e.from_ref === focusRef && e.relation === 'ANSWER_ROUTES_TO') {
          if (e.to_ref.startsWith('system:')) return; // system transition is not shown as a child
          const q = g.elements.get(e.to_ref);
          children.push({ ref: e.to_ref, text: q ? q.text : '', kind: 'QUESTION', edge_id: e.edge_id });
        }
      });
    }

    return { focus_ref: focusRef, focus, parents, siblings, children, isEntryRoot };
  }

  function ownerOfAnswer(g, answerRef) { for (const e of g.edges.values()) if (e.relation === 'QUESTION_HAS_ANSWER' && e.to_ref === answerRef) return e.from_ref; return null; }

  return {
    LS_KEY, MIGRATION_VERSION, migrate, listScenarios, allScenarios, getScenario, saveScenario,
    createScenario, renameScenario, deleteScenario, restoreScenario,
    composeGraph, effectiveElement, buildBaseGraph, validate, projection,
    commitTextEdit, commitSubTextEdit, replaceContentReference, addChild, addExistingChild, addSibling,
    deleteElementPlacement, deleteElementEverywhere, setRoot, setFocus, undo, redo, uuid
  };
})();
