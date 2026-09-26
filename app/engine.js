/* ============================================================
   Finding Self, Author of Worlds — functional prototype engine
   Generic content player + deterministic router.
   All content, routes, classifications, and persistence rules
   come from the structured package in ../content-package/.
   No generative interpretation; no external actions.
   ============================================================ */
'use strict';

/* Resolved once from the document path so the loader works from any URL
   (extension page, http root-relative, or file://). */
function getDataDir() {
  try {
    if (typeof document !== 'undefined') {
      const base = new URL(document.baseURI);
      // document.baseURI always includes the page; strip to its directory
      const dir = new URL('.', base);
      return new URL('../content-package/prototype-ready-vertical-slice-v0.6', dir).href;
    }
  } catch (e) { /* fall through */ }
  return '../content-package/prototype-ready-vertical-slice-v0.6';
}
const DATA_DIR = getDataDir();

/* ---------- classification constants (codebook; also present in data) ---------- */
const WORLDS = {
  'W1': { color: '#5F7F9A', label: 'Inner world' },
  'W2': { color: '#738B72', label: 'Embodied & personal world' },
  'W3': { color: '#A8844F', label: 'Relational / small-room world' },
  'W4': { color: '#806C82', label: 'Wider / public world' },
  'W*': { color: '#59636E', label: 'Any world' }
};
const FUNCTIONS = {
  'N': { symbol: '◎', label: 'Notice my own self', color: '#507B78' },
  'P': { symbol: '⇅', label: 'Power analysis', color: '#807B9B' },
  'A': { symbol: '↗', label: 'Align this world, or how I show up in it', color: '#9A6F5C' },
  'NPA': { symbol: '◎⇅↗', label: 'Notice + Power + Align', color: '#59636E' }
};

/* ---------- in-memory store of the package ---------- */
const PKG = {
  manifest: null, validation: null,
  starters: [], nodes: [], options: [], entryPoints: [], destinations: [],
  persistenceRules: [], guardrails: [], triggers: [],
  acceptance: [], deviations: [],
  onboarding: [], recommendationRules: [],
  inventoryAnswers: [],
  defaultOptionSets: [],
  curation: null, visibleAnswerIdSet: null, searchableAnswers: [],
  nodeById: {}, destById: {}, optionsByNode: {}, starterById: {}, defaultByNode: {}
};

/* Global premade-answer search visibility allowlist
   (global-answer-inventory-curation-v0.1.json). Applied ONLY to global
   answer browsing/search; exact-ID resolution and question-level
   option loading are unchanged. */
const CURATION_URL = DATA_DIR.replace(/prototype-ready-vertical-slice-v0\.6\/?$/, '') + '../global-answer-inventory-curation-v0.1.json';

async function loadPackage() {
  const files = {
    manifest: 'manifest.json', validation: 'validation_report.json',
    starters: 'starters.json', nodes: 'nodes.json', options: 'options.json',
    entryPoints: 'entry_points.json', destinations: 'destinations.json',
    persistenceRules: 'persistence_rules.json', guardrails: 'guardrails.json',
    triggers: 'triggers.json', acceptance: 'acceptance_coverage.json',
    deviations: 'deviations.json', onboarding: 'onboarding.json',
    recommendationRules: 'recommendation_rules.json',
    inventoryAnswers: 'inventory_answers.json',
    defaultOptionSets: 'default_option_sets.json'
  };
  const jobs = Object.entries(files).map(async ([key, file]) => {
    let res;
    try {
      res = await fetch(`${DATA_DIR}/${file}`);
    } catch (e) {
      throw new Error(`Failed to load ${file}: network unreachable (serve over HTTP)`);
    }
    if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status} — check DATA_DIR resolution (${DATA_DIR})`);
    const json = await res.json();
    PKG[key] = json.records !== undefined ? json.records : json;
  });
  await Promise.all(jobs);
  // curation allowlist (optional file; absence falls back to the full catalog)
  try {
    const cRes = await fetch(CURATION_URL);
    if (cRes.ok) PKG.curation = await cRes.json();
  } catch (e) { PKG.curation = null; }
  indexPackage();
  return PKG;
}

function indexPackage() {
  PKG.nodeById = {}; PKG.nodes.forEach(n => { PKG.nodeById[n.id] = n; });
  PKG.destById = {}; PKG.destinations.forEach(d => { PKG.destById[d.id] = d; });
  PKG.optionsByNode = {};
  PKG.options.forEach(o => {
    (PKG.optionsByNode[o.node_id] = PKG.optionsByNode[o.node_id] || []).push(o);
  });
  Object.values(PKG.optionsByNode).forEach(list => list.sort((a, b) => a.order - b.order));
  PKG.starterById = {}; PKG.starters.forEach(s => { PKG.starterById[s.id] = s; });
  PKG.defaultByNode = {};
  PKG.defaultOptionSets.forEach(d => { PKG.defaultByNode[d.node_id] = d; });
  // Global premade-answer search visibility: allowlist over inventory_answers.json.
  // Canonical order preserved; unknown/malformed/fragmentary records excluded;
  // the full catalog (PKG.inventoryAnswers) stays intact for exact-ID resolution.
  PKG.visibleAnswerIdSet = (PKG.curation && Array.isArray(PKG.curation.visible_answer_ids))
    ? new Set(PKG.curation.visible_answer_ids) : null;
  PKG.searchableAnswers = PKG.inventoryAnswers.filter(a =>
    a && a.id && typeof a.label === 'string' && a.label.trim() &&
    (!PKG.visibleAnswerIdSet || PKG.visibleAnswerIdSet.has(a.id)));
}

/* ---------- small things: a day's micro-list ----------
   One list stays open at a time — the user starts it, adds entries through the
   day (each stamped with the minute it was added, like a photo), or keys in a
   whole day at once (tapping any time to set it for something earlier), then
   closes it. Closing keeps the list; nothing is kept before that.
   Entries may hold text, a photo, or both.
   Open list:  fsaw.smallthings.open.v1 -> {id, startedAt, entries:[{id, at, text, image}]}
   Kept lists: fsaw.smallthings.kept.v1 -> [{id, startedAt, closedAt, entries:[...]}] */
const SmallThings = {
  _validEntry(e) {
    return e && typeof e.id === 'string' && typeof e.at === 'string' && !isNaN(new Date(e.at).getTime());
  },
  _cleanEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.filter(e => SmallThings._validEntry(e)).map(e => ({
      id: e.id, at: e.at,
      text: typeof e.text === 'string' ? e.text : '',
      image: typeof e.image === 'string' && e.image.indexOf('data:image/') === 0 ? e.image : null
    }));
  },
  _saveOpen(list) {
    try {
      if (list) localStorage.setItem(LS.smallthingsOpen, JSON.stringify(list));
      else localStorage.removeItem(LS.smallthingsOpen);
      return true;
    } catch (e) { return false; }
  },
  _saveKept(lists) {
    try { localStorage.setItem(LS.smallthings, JSON.stringify(lists)); return true; }
    catch (e) { return false; }
  },
  /* The currently open list, or null. Corrupt records are discarded. */
  getOpen() {
    const raw = lsGet(LS.smallthingsOpen, null);
    if (!raw || typeof raw.id !== 'string' || typeof raw.startedAt !== 'string') return null;
    return { id: raw.id, startedAt: raw.startedAt, entries: SmallThings._cleanEntries(raw.entries) };
  },
  /* Start a list, or return the one already open (resume). */
  startList() {
    const open = SmallThings.getOpen();
    if (open) return open;
    const list = { id: 'stl-' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36), startedAt: new Date().toISOString(), entries: [] };
    SmallThings._saveOpen(list);
    return list;
  },
  /* Add an entry. `at` defaults to now (the camera-like automatic stamp);
     pass an ISO string to backdate it (the batch/key-in mode). */
  addEntry({ text, image, at } = {}) {
    const list = SmallThings.getOpen();
    if (!list) return null;
    const entry = {
      id: 'ste-' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
      at: (at && !isNaN(new Date(at).getTime())) ? new Date(at).toISOString() : new Date().toISOString(),
      text: typeof text === 'string' ? text : '',
      image: typeof image === 'string' && image.indexOf('data:image/') === 0 ? image : null
    };
    if (!entry.text.trim() && !entry.image) return null;
    list.entries.push(entry);
    if (!SmallThings._saveOpen(list)) return null;
    return entry;
  },
  updateEntry(id, patch) {
    const list = SmallThings.getOpen();
    if (!list) return false;
    const e = list.entries.find(x => x.id === id);
    if (!e) return false;
    if (patch && typeof patch.text === 'string') e.text = patch.text;
    if (patch && typeof patch.image === 'string' && patch.image.indexOf('data:image/') === 0) e.image = patch.image;
    else if (patch && patch.image === null) e.image = null;
    return SmallThings._saveOpen(list);
  },
  /* Set an entry's time from an HH:MM string, keeping its calendar date. */
  setEntryTime(id, hhmm) {
    const m = typeof hhmm === 'string' && hhmm.match(/^(\d{2}):(\d{2})$/);
    if (!m) return false;
    const list = SmallThings.getOpen();
    if (!list) return false;
    const e = list.entries.find(x => x.id === id);
    if (!e) return false;
    const d = new Date(e.at);
    d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    e.at = d.toISOString();
    return SmallThings._saveOpen(list);
  },
  removeEntry(id) {
    const list = SmallThings.getOpen();
    if (!list) return false;
    const before = list.entries.length;
    list.entries = list.entries.filter(x => x.id !== id);
    if (list.entries.length === before) return false;
    return SmallThings._saveOpen(list);
  },
  /* Close the open list: with entries it is kept, empty it is discarded.
     Returns {kept, list} or null when nothing was open. */
  closeList() {
    const list = SmallThings.getOpen();
    if (!list) return null;
    SmallThings._saveOpen(null);
    if (!list.entries.length) return { kept: false, list };
    const kept = SmallThings.getKept();
    const record = { id: list.id, startedAt: list.startedAt, closedAt: new Date().toISOString(), entries: list.entries };
    kept.push(record);
    SmallThings._saveKept(kept);
    return { kept: true, list: record };
  },
  discardOpen() { SmallThings._saveOpen(null); },
  getKept() {
    const raw = lsGet(LS.smallthings, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(r => r && typeof r.id === 'string' && typeof r.startedAt === 'string')
      .map(r => ({ id: r.id, startedAt: r.startedAt, closedAt: typeof r.closedAt === 'string' ? r.closedAt : r.startedAt, entries: SmallThings._cleanEntries(r.entries) }))
      .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));
  },
  getKeptById(id) { return SmallThings.getKept().find(r => r.id === id) || null; }
};

/* ---------- runtime state ---------- */
/* Volatile by default. Persisted objects (patches, trigger
   config, kept notes) live in localStorage under explicit keys, never inferred. */
const LS = {
  patch: 'fsaw.toolkitPatches.v1',
  trigger: 'fsaw.triggerConfig.v1',
  diagnostic: 'fsaw.diagnosticTrace.v1',
  addedAnswers: 'fsaw.addedAnswers.v1',
  arrangement: 'fsaw.arrangements.v1',
  condition: 'fsaw.conditions.v1',
  sampler: 'fsaw.sampler.v1',
  smallthings: 'fsaw.smallthings.kept.v1',
  smallthingsOpen: 'fsaw.smallthings.open.v1'
};

function lsGet(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
}

/* ---------- sampler: a stitched record of completed practices ----------
   Stitches are kept explicitly — one tap on the practice completion screen
   adds a stitch for that run. Nothing is stitched without the user's choice.
   Store: fsaw.sampler.v1 -> [{id, practiceId, at, season, runId}]
   Seasons are meteorological; winter groups December with the following
   January/February, so one cold season is one cloth. */
const SAMPLER_SEASON_NAMES = ['Winter', 'Spring', 'Summer', 'Autumn'];
const SAMPLER_MOTIFS = {
  'PRACTICE:S1': {
    name: 'bloom', color: '#7d8c6f', title: 'Practice 1 — A signal worth keeping',
    svg: '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="18" cy="18" r="3.5"/><path d="M18 6v7M18 23v7M6 18h7M23 18h7M9.5 9.5l5 5M21.5 21.5l5 5M26.5 9.5l-5 5M14.5 21.5l-5 5"/></svg>'
  },
  'PRACTICE:S2': {
    name: 'crossing', color: '#b3563f', title: 'Practice 2 — Carrying a signal across worlds',
    svg: '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 29l8-16 5 8 6-11 9 19"/></svg>'
  }
};
const SAMPLER_FALLBACK_MOTIF = {
  name: 'stitch', color: '#8a7f6a', title: 'A practice',
  svg: '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M10 10l5 5M15 10l-5 5M21 10l5 5M26 10l-5 5M10 21l5 5M15 21l-5 5M21 21l5 5M26 21l-5 5"/></svg>'
};

const Sampler = {
  /* {key, label, cloth} — key sorts chronologically, e.g. 20261 = Spring 2026 */
  seasonOf(input) {
    const d = input instanceof Date ? input : new Date(input);
    const m = d.getMonth(), y = d.getFullYear();
    let idx, sy;
    if (m <= 1) { idx = 0; sy = y - 1; }
    else if (m <= 4) { idx = 1; sy = y; }
    else if (m <= 7) { idx = 2; sy = y; }
    else if (m <= 10) { idx = 3; sy = y; }
    else { idx = 0; sy = y; }
    return { key: sy * 10 + idx, label: SAMPLER_SEASON_NAMES[idx] + ' ' + sy, cloth: SAMPLER_SEASON_NAMES[idx] + ' sampler' };
  },
  seasonLabel(key) {
    const sy = Math.floor(key / 10), idx = key % 10;
    const name = SAMPLER_SEASON_NAMES[idx] || 'Season';
    return { key, label: name + ' ' + sy, cloth: name + ' sampler' };
  },
  currentSeason() { return this.seasonOf(new Date()); },
  isKnownPractice(practiceId) { return Object.prototype.hasOwnProperty.call(SAMPLER_MOTIFS, practiceId); },
  motifFor(practiceId) { return SAMPLER_MOTIFS[practiceId] || SAMPLER_FALLBACK_MOTIF; },
  getStitches() {
    const raw = lsGet(LS.sampler, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(s => s && typeof s.id === 'string' && typeof s.practiceId === 'string'
      && typeof s.at === 'string' && typeof s.season === 'number');
  },
  hasRunStitch(runId) {
    if (!runId) return false;
    return this.getStitches().some(s => s.runId === runId);
  },
  addStitch(practiceId, runId, at) {
    if (!practiceId) return null;
    const all = this.getStitches();
    if (runId) {
      const existing = all.find(s => s.runId === runId);
      if (existing) return existing;
    }
    const when = at ? new Date(at) : new Date();
    const season = this.seasonOf(isNaN(when.getTime()) ? new Date() : when);
    const stitch = {
      id: 'st-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36),
      practiceId,
      at: (isNaN(when.getTime()) ? new Date() : when).toISOString(),
      season: season.key,
      runId: runId || null
    };
    all.push(stitch);
    lsSet(LS.sampler, all);
    return stitch;
  },
  removeStitch(id) {
    lsSet(LS.sampler, this.getStitches().filter(s => s.id !== id));
  },
  /* seasons with stitches, newest first: [{key,label,cloth,stitches[]}] */
  seasons() {
    const groups = {};
    this.getStitches().forEach(s => { (groups[s.season] = groups[s.season] || []).push(s); });
    return Object.keys(groups).map(Number).sort((a, b) => b - a).map(key => {
      const meta = this.seasonLabel(key);
      return { key, label: meta.label, cloth: meta.cloth,
        stitches: groups[key].slice().sort((a, b) => a.at < b.at ? -1 : 1) };
    });
  },
  formatDate(iso) {
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }
};

const Session = {
  runId: null,
  currentNodeId: null,
  history: [],           // stack of nodeIds visited in this run
  returnPointer: null,   // nodeId to return to after inventory
  runAnswers: {},        // nodeId -> selected option id(s), volatile
  customText: {},        // nodeId -> free text, volatile
  pendingPatch: null,    // proposed addition before confirmation
  activeStarter: null,   // starter id for the current run
  routeVariant: 'Standard',
  practiceId: null,
  pausedBookmark: null,  // minimal resume pointer
  inspectorVisible: false,
  triggerSim: { label: null, fired: false },
  // v0.3 condition/effect state (volatile, reset per run)
  visitedWorlds: new Set(),   // W1–W4 traversed during this run
  activeTrigger: false,       // a simulated invitation context is active
  artifactDecision: null,     // 'not_saved' | 'saved_future' | 'saved_inventory'
  toolkitChangeKind: null,    // toolkit_change:* kind selected in Teach My Toolkit
  artifactCandidate: null,    // portable artifact candidate (run-only)
  // v0.4 semantic state contract (volatile, reset per run)
  threadState: {},            // state_writes → user-facing label(s); carried state
  semanticMeta: {},           // state_writes → machine semantic_value (metadata only)
  multiSelections: {},        // nodeId → ordered array of selected option IDs (multi-select)
  transitionAck: null,        // latest transition_acknowledgment to display (substituted)
  pendingCustom: null,        // { originNodeId, nextNode, fallback, destId, writes } for custom_input capture
  // v0.4 preview/draft state (separate from threadState; powers the non-threadState
  // placeholders on toolkit / invitation / inventory-preview screens)
  draft: { toolkit: null, inventory: null }
};

function newRun() {
  Session.runId = 'run-' + Date.now();
  Session.currentNodeId = null;
  Session.history = [];
  Session.returnPointer = null;
  Session.runAnswers = {};
  Session.customText = {};
  Session.pendingPatch = null;
  Session.activeStarter = null;
  Session.practiceId = null;
  Session.routeVariant = 'Standard';
  Session.visitedWorlds = new Set();
  Session.activeTrigger = false;
  Session.artifactDecision = null;
  Session.toolkitChangeKind = null;
  Session.artifactCandidate = null;
  Session.threadState = {};
  Session.semanticMeta = {};
  Session.multiSelections = {};
  Session.transitionAck = null;
  Session.pendingCustom = null;
  Session.draft = { toolkit: null, inventory: null };
  Session.triggerSim = { label: null, fired: false };
}

/* ---------- condition evaluation (v0.3 display_condition / route_condition) ---------- */
/* Conditions are deterministic strings from the package; no inference. Unknown
   conditions resolve to `true` (visible) so canonical content is never hidden
   by an engine gap, and are logged to the diagnostic trace. */
const TOOLKIT_Q_OR_A = ['answer_order', 'question_exclusion', 'question_sequence', 'route_prompt_filter', 'inventory_item'];
function evalCondition(cond) {
  const c = (cond || 'Always').trim();
  if (!c || c === 'Always') return true;
  if (c.startsWith('Always;')) return true;           // note-editor hint, not a visibility gate
  if (/Display-only echo/i.test(c)) return 'echo';    // non-selectable display line
  if (c === 'An active trigger context exists') return !!Session.activeTrigger;
  if (c === 'An active starter-system or template context exists') return !!Session.activeStarter;
  if (c === 'The selected Toolkit change targets a question or answer') return TOOLKIT_Q_OR_A.includes(Session.toolkitChangeKind);
  if (c === 'The selected Toolkit change has toolkit_change_kind=inventory_item') return Session.toolkitChangeKind === 'inventory_item';
  if (c === 'W1 was visited in this Practice run') return Session.visitedWorlds.has('W1');
  if (c === 'W2 was visited in this Practice run') return Session.visitedWorlds.has('W2');
  if (c === 'W3 was visited in this Practice run') return Session.visitedWorlds.has('W3');
  if (c === 'W4 was visited in this Practice run') return Session.visitedWorlds.has('W4');
  if (c === 'At least two worlds were visited in this Practice run') return Session.visitedWorlds.size >= 2;
  if (c === 'The preceding Artifact decision was Do not save') return Session.artifactDecision === 'not_saved';
  logDiagnostic('unknown-condition', c);
  return true;
}

/* An option is selectable only when BOTH its display and route conditions
   pass. `echo` (Display-only echo) options are excluded from the selectable
   list — the renderer has no non-button display slot for them. */
function conditionPasses(opt) {
  const d = evalCondition(opt.display_condition);
  if (d === false || d === 'echo') return false;
  return evalCondition(opt.route_condition) !== false;
}

/* ---------- option visibility ---------- */
function visibleOptions(nodeId) {
  const list = PKG.optionsByNode[nodeId] || [];
  return list.filter(conditionPasses);
}

function effectiveOptions(nodeId) {
  return visibleOptions(nodeId);
}

/* ---------- v0.5 curated default screens ---------- */
/* Render only the seeded answers + progression controls + one More options
   control, per default_option_sets.json, plus any user-added answers. */
function moreOptionsControl(nodeId, spec) {
  const mode = spec && spec.more_options_mode;
  if (!mode || mode === 'NONE') return null;
  if (mode === 'EXPLICIT_FILTERED_CONTROL') {
    const all = PKG.optionsByNode[nodeId] || [];
    for (const id of (spec.more_options_option_ids || [])) {
      const o = all.find(x => x.id === id);
      if (o && conditionPasses(o)) return o;
    }
    return null; // explicit control conditionally unavailable
  }
  // GLOBAL_NODE_INVENTORY_CONTROL → synthesize exactly one More options control
  return {
    id: '__MORE:' + nodeId, node_id: nodeId, label: '+ More options',
    semantic_tag: 'inventory', control_intent: 'OPEN_INVENTORY',
    destination: 'INV.SEARCH', display_condition: 'Always', route_condition: 'Always',
    effect: '', state_writes: [], _moreOptions: true
  };
}

function screenOptions(nodeId) {
  const spec = PKG.defaultByNode[nodeId];
  const all = PKG.optionsByNode[nodeId] || [];
  const byId = (id) => all.find(o => o.id === id);
  const isVisible = (o) => o && conditionPasses(o);
  const list = [];
  if (spec) {
    (spec.seeded_answer_option_ids || []).forEach(id => { const o = byId(id); if (isVisible(o)) list.push(o); });
    (spec.continuation_control_option_ids || []).forEach(id => { const o = byId(id); if (isVisible(o)) list.push(o); });
    const more = moreOptionsControl(nodeId, spec);
    if (more) list.push(more);
  } else {
    all.filter(isVisible).forEach(o => list.push(o));
  }
  return list;
}

/* Display-only rows render separately from buttons (never as selectable answers). */
function displayOnlyOptions(nodeId) {
  const spec = PKG.defaultByNode[nodeId];
  if (!spec) return [];
  const all = PKG.optionsByNode[nodeId] || [];
  return (spec.display_only_option_ids || []).map(id => all.find(o => o.id === id)).filter(Boolean);
}

/* Non-seeded answers for a node, searched by More options (keep their route). */
function nodeInventoryOptions(nodeId) {
  const spec = PKG.defaultByNode[nodeId];
  if (!spec) return [];
  const all = PKG.optionsByNode[nodeId] || [];
  return (spec.node_inventory_option_ids || []).map(id => all.find(o => o.id === id)).filter(Boolean);
}

/* Find an option selectable from a node: curated screen first, then the full
   node option list (so "use once" can select an inventory-only option). */
function findSelectableOption(nodeId, optionId) {
  const inScreen = screenOptions(nodeId).find(o => o.id === optionId);
  if (inScreen) return inScreen;
  return (PKG.optionsByNode[nodeId] || []).find(o => o.id === optionId);
}

/* ---------- effect application (v0.3) ---------- */
/* `effect` is a state mutation expressed separately from navigation. Only the
   machine-readable patterns are applied; descriptive free text is a no-op and
   the option's `destination` remains the authoritative route. */
function applyEffect(effect, opt) {
  if (!effect) return;
  const e = effect.trim();
  let m;
  if ((m = e.match(/set\s+active\s+practice\s+to\s+(PRACTICE:S[12])/i))) Session.practiceId = m[1];
  if ((m = e.match(/set\s+artifact_decision\s*=\s*(\w+)/i))) Session.artifactDecision = m[1];
  if ((m = e.match(/set\s+toolkit_change_kind\s*=\s*(\w+)/i))) Session.toolkitChangeKind = m[1];
  if ((m = e.match(/set\s+artifact\s+candidate\s+to\s+(.+)/i))) Session.artifactCandidate = m[1].trim();
  if (/use\s+configured\s+starter\s+low\s+entry/i.test(e)) Session.routeVariant = 'Low';
  if (/use\s+configured\s+starter\s+standard\s+entry/i.test(e)) Session.routeVariant = 'Standard';
  // toolkit_change:* and toolkit_scope:* are also encoded in semantic_tag
  if (opt && typeof opt.semantic_tag === 'string') {
    if (opt.semantic_tag.startsWith('toolkit_change:')) Session.toolkitChangeKind = opt.semantic_tag.slice('toolkit_change:'.length);
  }
}

/* ---------- v0.4 semantic state contract ---------- */
/* Applies an option's state_writes / state_clears / transition_acknowledgment.
   These fields ship as JSON arrays. state_preserves is a no-op at runtime: the
   run already keeps those slots unless a later option explicitly clears them. */
function asStringList(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(x => String(x));
  return String(v).split(/\s+/).filter(Boolean);
}
function applySemanticState(opt) {
  if (!opt) return;
  const writes = asStringList(opt.state_writes);
  const ctrl = opt.control_intent || '';
  const commit = isCommitControl(opt);

  // Ordinary single-select answer → store the human-readable label, never the
  // machine `semantic_value`. CUSTOM_INPUT writes nothing here (the confirmed
  // text is stored by confirmCustomInput); TOGGLE_SELECTION writes nothing
  // here (toggleSelection accumulates); COMMIT_SELECTION ("Continue") writes
  // nothing (it preserves the accumulated selection).
  if (!commit && ctrl !== 'CUSTOM_INPUT' && ctrl !== 'TOGGLE_SELECTION' && writes.length) {
    const value = opt.label || '';
    writes.forEach(k => {
      Session.threadState[k] = value;
      if (opt.semantic_value != null && opt.semantic_value !== '') Session.semanticMeta[k] = opt.semantic_value;
    });
  }

  asStringList(opt.state_clears).forEach(k => { delete Session.threadState[k]; delete Session.semanticMeta[k]; });

  const ack = (opt.transition_acknowledgment || '').trim();
  Session.transitionAck = ack ? interpolate(ack, { selected_answer: opt.label || '' }) : null;
}

/* A "Continue"/commit control preserves accumulated selections and writes no
   answer of its own. Detected by control_intent, semantic_tag, or label. */
function isCommitControl(opt) {
  return opt.control_intent === 'COMMIT_SELECTION'
    || opt.semantic_tag === 'continue'
    || /^continue$/i.test((opt.label || '').trim());
}

/* Multi-select: toggle an option and rebuild the affected threadState slots as
   an ordered array of selected labels. Returns the new on/off state. */
function toggleSelection(optionId) {
  const nodeId = Session.currentNodeId;
  const opts = PKG.optionsByNode[nodeId] || [];
  const opt = opts.find(o => o.id === optionId);
  if (!opt) return null;
  const arr = Session.multiSelections[nodeId] || (Session.multiSelections[nodeId] = []);
  const i = arr.indexOf(optionId);
  let on;
  if (i >= 0) { arr.splice(i, 1); on = false; }
  else { arr.push(optionId); on = true; }
  rebuildMultiSelectState(nodeId);
  return on;
}

function rebuildMultiSelectState(nodeId) {
  const opts = PKG.optionsByNode[nodeId] || [];
  const selected = (Session.multiSelections[nodeId] || [])
    .map(id => opts.find(o => o.id === id)).filter(Boolean);
  // clear every slot written by a selectable (non-control) option on this node
  const slots = new Set();
  opts.forEach(o => {
    if (isCommitControl(o) || o.control_intent === 'OPEN_INVENTORY' || o.control_intent === 'CUSTOM_INPUT') return;
    asStringList(o.state_writes).forEach(k => slots.add(k));
  });
  slots.forEach(k => { delete Session.threadState[k]; });
  const labels = {};
  selected.forEach(o => asStringList(o.state_writes).forEach(k => { (labels[k] = labels[k] || []).push(o.label || ''); }));
  Object.keys(labels).forEach(k => { Session.threadState[k] = labels[k]; });
}

/* Interpolate {placeholder} tokens in user-visible text from carried state.
   Resolution order: explicit context → threadState → preview/draft state.
   Unresolved tokens are omitted so raw {…} never reaches the interface. */
function interpolate(text, context) {
  if (text == null) return '';
  return String(text).replace(/\{([^{}]*)\}/g, (m, raw) => {
    const key = raw.trim();
    if (context && Object.prototype.hasOwnProperty.call(context, key)) {
      const v = context[key];
      return (v == null || v === '') ? '' : String(v);
    }
    const v = Session.threadState[key];
    if (v != null && v !== '') return Array.isArray(v) ? v.join(', ') : String(v);
    const pv = resolvePreviewValue(key);
    if (pv !== undefined) return String(pv);
    return '';
  });
}

/* ---------- preview/draft state for non-threadState placeholders ---------- */
/* Accumulate draft state as the user moves through the toolkit flows. */
function updateDraft(opt) {
  if (!opt) return;
  const nid = Session.currentNodeId;
  const label = opt.label || '';
  const isExit = /^EXIT/.test(opt.destination || '');
  if (nid === 'TT.01') {
    if (isExit) return;
    Session.draft.toolkit = Session.draft.toolkit || {};
    Session.draft.toolkit.kind = label;
    Session.draft.toolkit.proposed = label;
    if (!Session.draft.toolkit.current) Session.draft.toolkit.current = 'your current setup';
  } else if (nid === 'TT.02') {
    if (isExit) return;
    Session.draft.toolkit = Session.draft.toolkit || {};
    Session.draft.toolkit.scope = label;
  }
}

/* Resolve a non-threadState preview placeholder to a value, or undefined if the
   key is not a known preview key. Empty string means "known but currently absent". */
function resolvePreviewValue(key) {
  switch (key) {
    case 'current order/route/content': return (Session.draft.toolkit && Session.draft.toolkit.current) || '';
    case 'proposed order/route/content': return (Session.draft.toolkit && Session.draft.toolkit.proposed) || '';
    case 'scope': return (Session.draft.toolkit && Session.draft.toolkit.scope) || (Session.draft.inventory && Session.draft.inventory.scope) || '';
    case 'trigger label': return Session.triggerSim.label || '';
    case 'current option list': return (Session.draft.inventory && Session.draft.inventory.currentList) || '';
    case 'current option list plus selected item': return (Session.draft.inventory && Session.draft.inventory.plusSelected) || '';
    case 'origin question and configured scope': return (Session.draft.inventory && Session.draft.inventory.originQuestion) || '';
    default: return undefined;
  }
}

/* Per-screen preview spec: which keys matter and the complete fallback sentence
   used when the required draft is unavailable (never a broken/empty fragment). */
const PREVIEW_SPEC = {
  'TT.03': {
    ready: () => !!(Session.draft.toolkit && Session.draft.toolkit.proposed && Session.draft.toolkit.scope),
    fallback: 'Nothing has changed yet. Review the change before confirming.'
  },
  'TT.04': {
    ready: () => !!(Session.draft.toolkit && Session.draft.toolkit.scope),
    fallback: 'Your change is confirmed. You can undo it in Workshop.'
  },
  'TR.00': {
    ready: () => !!Session.triggerSim.label,
    fallback: 'This invitation was set up by you. You can enter without doing a check-in.'
  },
  'INV.PREVIEW': {
    ready: () => !!(Session.draft.inventory && Session.draft.inventory.plusSelected),
    fallback: 'Review this addition before confirming. Nothing has been added yet.'
  }
};

/* Render one copy field (prompt / support_copy / thread_display_template) for a
   node, substituting preview placeholders when their draft is complete and
   falling back to a full sentence otherwise. */
function previewCopy(node, field) {
  const raw = node ? node[field] : '';
  if (!raw) return '';
  const spec = node ? PREVIEW_SPEC[node.id] : null;
  if (!spec) return interpolate(raw);
  return spec.ready() ? interpolate(raw) : spec.fallback;
}

/* Is a destination's required_context satisfied? `carried_context` means the
   run has a thread (prior selections); `origin_node_id`
   means a source node is set; any other token is looked up in threadState. */
function contextAvailable(required) {
  const tokens = asStringList(required);
  if (!tokens.length) return true;
  return tokens.every(t => {
    if (t === 'carried_context') return Object.keys(Session.runAnswers).length > 0;
    if (t === 'origin_node_id') return !!Session.currentNodeId;
    return Object.prototype.hasOwnProperty.call(Session.threadState, t);
  });
}

/* custom_input capture — confirm writes the run-only text and advances. */
function confirmCustomInput(text) {
  const pc = Session.pendingCustom;
  if (!pc) return render();
  const value = text == null ? '' : String(text);
  Session.customText[pc.originNodeId] = value;
  (pc.writes || []).forEach(k => { Session.threadState[k] = value; });
  Session.pendingCustom = null;
  return gotoNode(pc.nextNode);
}
function cancelCustomInput() {
  const pc = Session.pendingCustom;
  Session.pendingCustom = null;
  return gotoNode(pc && pc.fallback ? pc.fallback : 'ROUTE.INVALID');
}

/* Append a run diagnostic (recoverable; never throws). */
function logDiagnostic(reason, detail) { try {
    const trace = lsGet(LS.diagnostic, []);
    trace.push({ id: 'DIAG-' + Date.now(), reason, detail: String(detail || ''), at: new Date().toISOString() });
    lsSet(LS.diagnostic, trace);
  } catch (e) { /* storage unavailable */ }
}

/* ---------- route resolution ---------- */
/* Resolve a destination string to either a node or a destination record. */
function resolveDestination(dest) {
  if (!dest) return { kind: 'error', reason: 'empty destination' };
  if (PKG.nodeById[dest]) return { kind: 'node', node: PKG.nodeById[dest] };
  if (PKG.destById[dest]) return { kind: 'destination', destination: PKG.destById[dest] };
  return { kind: 'error', reason: `unresolvable destination: ${dest}` };
}

/* ---------- handlers for named destination primitives ---------- */
const Handlers = {
  /* Cross-mode entry into Practice through the optional context seam */
  'practice_entry': (dest, opt) => {
    Session.practiceId = dest.id; // 'PRACTICE:S1' | 'PRACTICE:S2'
    return gotoNode(dest.next_node || 'PM.00');
  },
  'practice_context_return': () => {
    const nodeId = Session.customText['__practiceReturnNode'] || null;
    if (nodeId && PKG.nodeById[nodeId]) return gotoNode(nodeId);
    // fall back to the practice's original entry
    return Handlers['practice_entry']({ id: Session.practiceId || 'PRACTICE:S1', next_node: 'PM.00' });
  },
  'practice_context_route': (dest) => {
    // HANDLER.PRACTICE.ORIGINAL.ENTRY → enter practice at its S.00
    if (dest.id === 'HANDLER.PRACTICE.ORIGINAL.ENTRY') {
      const pid = Session.practiceId || 'PRACTICE:S1'; // recoverable fallback; PM.03 context may not carry one
      const entry = pid === 'PRACTICE:S2' ? 'S2.00' : 'S1.00';
      return gotoNode(entry);
    }
    // HANDLER.PRACTICE.COMPLETION → close out practice to its completion node
    if (dest.id === 'HANDLER.PRACTICE.COMPLETION') {
      const pid = Session.practiceId || 'PRACTICE:S1';
      const completion = pid === 'PRACTICE:S2' ? 'S2.R3' : 'S1.13';
      return gotoNode(completion);
    }
    return gotoNode(dest.next_node || 'PM.00');
  },
  'practice_function_route': () => {
    // HANDLER.PRACTICE.{NOTICE,POWER,ALIGN,WITNESS}.* resolve "the selected
    // PM.03 focus inside the active Practice script". No focus→node table
    // ships in this slice, so enter the practice at its original entry
    // (see DEVIATIONS.md). Previously these destinations had no handler and
    // fell through to ROUTE.INVALID.
    const pid = Session.practiceId || 'PRACTICE:S1';
    return gotoNode(pid === 'PRACTICE:S2' ? 'S2.00' : 'S1.00');
  },
  'conditional_route': (dest) => {
    // HANDLER.S1.AFTER.11 → practice continuation S1.12
    if (dest.id === 'HANDLER.S1.AFTER.11') return gotoNode('S1.12');
    // HANDLER.S2.AFTER.R1A → practice continuation S2.R2
    if (dest.id === 'HANDLER.S2.AFTER.R1A') return gotoNode('S2.R2');
    return gotoNode(dest.next_node || 'PM.00');
  },
  'return_pointer': () => {
    const nodeId = Session.returnPointer;
    Session.returnPointer = null;
    if (nodeId && PKG.nodeById[nodeId]) return gotoNode(nodeId);
    return gotoNode('ROUTE.INVALID');
  },
  'resume_pointer': () => {
    const bm = Session.pausedBookmark;
    if (bm && PKG.nodeById[bm.nodeId]) {
      Session.currentNodeId = bm.nodeId;
      Session.history = bm.history || [];
      Session.activeStarter = bm.activeStarter;
      Session.practiceId = bm.practiceId;
      Session.routeVariant = bm.routeVariant || 'Standard';
      Session.pausedBookmark = null;
      return render();
    }
    return gotoNode('ROUTE.INVALID');
  },
  'restart_route': () => {
    const bm = Session.pausedBookmark;
    Session.pausedBookmark = null;
    if (bm && bm.entryNode && PKG.nodeById[bm.entryNode]) return gotoNode(bm.entryNode);
    return gotoNode('ROUTE.INVALID');
  },
  'onboarding': () => render(),
  'flow_preview': (dest) => gotoNode(dest.next_node || 'TT.04'),
  'ui_primitive': (dest) => {
    if (dest.next_node && PKG.nodeById[dest.next_node]) return gotoNode(dest.next_node);
    // terminal primitives (artifact preview etc.) resolve to a terminal view
    return renderPrimitiveTerminal(dest);
  },
  'defined_external': (dest) => renderExternalTerminal(dest),
  'inventory_filter': (dest) => openInventory(dest),
  'terminal': (dest) => renderTerminal(dest),
  /* Complete the active context without assuming a Practice is running. */
  'context_completion': (dest) => {
    if (dest.id === 'HANDLER.DISCARD.VOLATILE.RUN.CONTEXT.COMPLETION') {
      Session.runAnswers = {}; Session.customText = {};
    }
    const pid = Session.practiceId;
    if (pid === 'PRACTICE:S1' && PKG.nodeById['S1.13']) return gotoNode('S1.13');
    if (pid === 'PRACTICE:S2' && PKG.nodeById['S2.R3']) return gotoNode('S2.R3');
    if (Session.returnPointer && PKG.nodeById[Session.returnPointer]) {
      const rp = Session.returnPointer; Session.returnPointer = null; return gotoNode(rp);
    }
    return renderTerminal({ id: 'HOME' });
  },
  'artifact_candidate_picker': (dest) => gotoNode(dest.next_node || 'ARTIFACT.PREVIEW'),
  'artifact_custom_input': (dest) => gotoNode(dest.next_node || 'ARTIFACT.PREVIEW'),
  /* v0.4 — explicit custom-answer capture (never inferred from the label). */
  'custom_input': (dest, opt) => {
    const origin = Session.currentNodeId;
    Session.pendingCustom = {
      originNodeId: origin,
      nextNode: dest.next_node || dest.next_destination,
      fallback: dest.fallback_destination || origin,
      destId: dest.id,
      writes: asStringList(opt && opt.state_writes)
    };
    Session.currentNodeId = '__CUSTOM_INPUT__';
    return render();
  },
  /* v0.4 — enter a practice carrying the current thread (no restart). */
  'practice_entry_with_context': (dest) => {
    if (!contextAvailable(dest.required_context)) {
      return gotoNode(dest.fallback_destination || 'ROUTE.INVALID');
    }
    const pid = dest.id.indexOf('S2') >= 0 ? 'PRACTICE:S2' : 'PRACTICE:S1';
    Session.practiceId = pid;
    Session.threadState.carried_context = true;
    return gotoNode(dest.next_node || 'PM.03');
  },
  /* v0.4 — explicit restart: discard carried moment context, begin fresh. */
  'practice_entry_fresh': (dest) => {
    const pid = dest.id.indexOf('S2') >= 0 ? 'PRACTICE:S2' : 'PRACTICE:S1';
    Session.practiceId = pid;
    delete Session.threadState.carried_context;
    Session.runAnswers = {};
    Session.customText = {};
    return gotoNode(dest.next_node || (pid === 'PRACTICE:S2' ? 'S2.00' : 'S1.00'));
  }
};

/* ---------- main router ---------- */
function selectOption(optionId) {
  const opt = findSelectableOption(Session.currentNodeId, optionId);
  if (!opt) return routeInvalid(null, `option not found: ${optionId}`);
  // synthesized "More options" control opens the node-specific inventory
  if (opt._moreOptions) return openInventory({});
  // record volatile selection
  Session.runAnswers[Session.currentNodeId] = optionId;
  if (opt.semantic_tag === 'custom') {
    Session.customText[Session.currentNodeId] = Session.customText[Session.currentNodeId] || '';
  }
  // apply any state effect before routing (effects are separate from navigation)
  applyEffect(opt.effect, opt);
  // apply v0.4 semantic state (state_writes / state_clears / transition acknowledgment)
  applySemanticState(opt);
  // accumulate preview/draft state for toolkit / invitation screens
  updateDraft(opt);
  const res = resolveDestination(opt.destination);
  if (res.kind === 'error') return routeInvalid(opt, res.reason);
  if (res.kind === 'node') return gotoNode(res.node.id);
  const dest = res.destination;
  const handler = Handlers[dest.handler] || Handlers[dest.destination_class];
  if (handler) return handler(dest, opt);
  return routeInvalid(opt, `no handler for destination ${dest.id}`);
}

function gotoNode(id) {
  if (!PKG.nodeById[id]) {
    const dest = PKG.destById[id];
    if (dest) {
      // A destination ID (e.g. ONBOARDING) is a valid jump target.
      if (Session.currentNodeId && Session.currentNodeId !== id) Session.history.push(Session.currentNodeId);
      Session.currentNodeId = id;
      const handler = Handlers[dest.handler] || Handlers[dest.destination_class];
      if (handler) return handler(dest);
      return render();
    }
    return routeInvalid(null, `node not found: ${id}`);
  }
  if (Session.currentNodeId && Session.currentNodeId !== id) {
    Session.history.push(Session.currentNodeId);
  }
  Session.currentNodeId = id;
  trackWorld(PKG.nodeById[id]);
  return render();
}

/* Record traversal through a concrete world (W1–W4) for the "visited in this
   Practice run" conditions. W* (any/unspecified) does not count. */
function trackWorld(node) {
  if (!node || !node.world_code) return;
  if (['W1', 'W2', 'W3', 'W4'].includes(node.world_code)) Session.visitedWorlds.add(node.world_code);
}

function goBack() {
  const prev = Session.history.pop();
  if (prev && PKG.nodeById[prev]) {
    Session.currentNodeId = prev;
    return render();
  }
  return renderHome();
}

function exitFlow() {
  // discard volatile state; keep only explicitly persisted objects
  newRun();
  return renderHome();
}

function pauseFlow() {
  Session.pausedBookmark = {
    nodeId: Session.currentNodeId,
    history: Session.history.slice(),
    activeStarter: Session.activeStarter,
    practiceId: Session.practiceId,
    routeVariant: Session.routeVariant,
    entryNode: Session.history[0] || Session.currentNodeId
  };
  return gotoNode('RUN.RESUME');
}

function resumeFlow() { return Handlers['resume_pointer'](); }

/* ---------- recovery ---------- */
function routeInvalid(opt, reason) {
  const diag = {
    id: 'DIAG-' + Date.now(),
    nodeId: Session.currentNodeId,
    optionId: opt ? opt.id : null,
    reason,
    at: new Date().toISOString()
  };
  const trace = lsGet(LS.diagnostic, []);
  trace.push(diag); lsSet(LS.diagnostic, trace);
  Session.returnPointer = Session.currentNodeId;
  Session.currentNodeId = 'ROUTE.INVALID';
  return render();
}
/* ---------- onboarding (deterministic recommendation) ---------- */
function runOnboarding(answers) {
  // answers: { questionId: selectedAnswerKey }
  const scores = {};
  const reasons = {};
  PKG.recommendationRules.forEach(r => {
    const chosen = answers[r.question_id];
    if (!chosen) return;
    // selected_answer_key is "OQ01 · Before something" style
    const key = r.selected_answer_key;
    // Compare against either the full "Q · answer" key or the answer text
    // after the " · " separator. Brittle containment matching would falsely
    // block some rules against others.
    if (chosen === key || (key && key.slice(key.indexOf(' · ') + 3) === chosen)) {
      scores[r.starter_id] = (scores[r.starter_id] || 0) + r.weight;
      (reasons[r.starter_id] = reasons[r.starter_id] || []).push(r.reason);
    }
  });
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return ranked.map(([starterId, score]) => ({
    starter: PKG.starterById[starterId],
    score, reasons: reasons[starterId] || []
  }));
}

/* ---------- inventory ---------- */
function openInventory(dest) {
  Session.returnPointer = Session.currentNodeId || Session.returnPointer;
  Session.currentNodeId = 'INV.SEARCH';
  return render();
}

/* Search the node's non-seeded inventory options (node_inventory_option_ids). */
function searchInventory(nodeId, query) {
  // v0.5: search the node's non-seeded options (node_inventory_option_ids),
  // excluding options already visible on the originating screen.
  const visible = new Set(screenOptions(nodeId).map(o => o.id));
  const candidates = nodeInventoryOptions(nodeId).filter(o => !visible.has(o.id));
  const q = (query || '').toLowerCase().trim();
  if (!q) return candidates;
  return candidates.filter(o => (o.label || '').toLowerCase().split(/[\s-]+/).some(w => w.startsWith(q)));
}
/* ---------- persistence ---------- */
function savePatch(patch) {
  const patches = lsGet(LS.patch, []);
  const rec = { id: 'patch-' + Date.now(), ...patch, savedAt: new Date().toISOString() };
  patches.push(rec); lsSet(LS.patch, patches);
  return rec;
}
function undoPatch(id) {
  let patches = lsGet(LS.patch, []);
  patches = patches.filter(p => p.id !== id);
  lsSet(LS.patch, patches);
}
/* ---------- trigger simulator ---------- */
function simulateTrigger(label) {
  Session.triggerSim = { label: label || 'Before selected persuasive destination', fired: true };
  Session.activeTrigger = true;
  return gotoNode('TR.00');
}
function setTriggerConfig(cfg) { lsSet(LS.trigger, cfg); }
function getTriggerConfig() { return lsGet(LS.trigger, { snooze: null, paused: false }); }

/* ---------- classification helper ---------- */
function classify(node) {
  const w = WORLDS[node.world_code] || WORLDS['W*'];
  const f = FUNCTIONS[node.function_code] || { symbol: '', label: node.function_label || '', color: '#59636E' };
  return { world: w, fn: f };
}

/* ---------- render dispatch (implemented in ui.js) ---------- */
function render() { return UI.render(); }
function renderHome() { return UI.renderHome(); }
function renderTerminal(dest) { return UI.renderTerminal(dest); }
function renderExternalTerminal(dest) { return UI.renderExternalTerminal(dest); }
function renderPrimitiveTerminal(dest) { return UI.renderPrimitiveTerminal(dest); }

/* expose for tests */
function isAnswerSearchVisible(id) {
  if (!PKG.visibleAnswerIdSet) {
    const a = PKG.inventoryAnswers.find(x => x && x.id === id);
    return !!(a && typeof a.label === 'string' && a.label.trim());
  }
  return PKG.visibleAnswerIdSet.has(id);
}

window.ENGINE = {
  loadPackage, PKG, Session, LS, lsGet, lsSet, WORLDS, FUNCTIONS,
  Sampler, SmallThings,
  isAnswerSearchVisible,
  newRun, visibleOptions, effectiveOptions, resolveDestination,
  screenOptions, displayOnlyOptions, nodeInventoryOptions,
  findSelectableOption,
  selectOption, gotoNode, goBack, exitFlow, pauseFlow, resumeFlow,
  routeInvalid, runOnboarding, openInventory, searchInventory,
  savePatch, undoPatch,
  simulateTrigger, setTriggerConfig, getTriggerConfig, classify,
  evalCondition, applyEffect, applySemanticState, contextAvailable,
  toggleSelection, isCommitControl, interpolate, previewCopy, resolvePreviewValue,
  updateDraft,
  confirmCustomInput, cancelCustomInput, Handlers
};
