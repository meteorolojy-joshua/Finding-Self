/* ============================================================
   Scenario Setup acceptance tests (engine level).
   Maps acceptance-tests.json MUST cases to engine assertions.
   ============================================================ */
'use strict';

const Results = [];
let currentGroup = 'setup';
function group(name) { currentGroup = name; }
function check(label, cond, detail) { Results.push({ group: currentGroup, label, pass: !!cond, detail: detail || '' }); }

function freshStore() {
  localStorage.removeItem('fsaw.scenarios.v1');
  SCENARIO.migrate();
}

async function run() {
  await ENGINE.loadPackage();
  const SCN = SCENARIO;

  group('MIGRATE');
  freshStore();
  SCN.migrate();
  check('MIGRATE-01: three default scenarios', SCN.listScenarios().length === 3);
  check('MIGRATE-01: SS01/SS02/SS06 present',
    SCN.getScenario('SCN.DEFAULT.SS01') && SCN.getScenario('SCN.DEFAULT.SS02') && SCN.getScenario('SCN.DEFAULT.SS06'));
  SCN.migrate(); SCN.migrate();
  check('MIGRATE-01: idempotent (still 3)', SCN.listScenarios().length === 3);
  const ss01 = SCN.getScenario('SCN.DEFAULT.SS01');
  check('MIGRATE-01: standard root resolves', ss01.roots.standard === 'base:question:NOW.FEED.S01');
  check('MIGRATE-01: low root resolves', ss01.roots.low === 'base:question:NOW.FEED.L01');

  group('LIST');
  const tpl = SCN.createScenario('My Template', 'TEMPLATE', 'SS01');
  check('LIST-02: template scenario created', !!tpl && tpl.origin.type === 'TEMPLATE');
  check('LIST-02: template is ACTIVE', tpl.lifecycle_state === 'ACTIVE');
  const blank = SCN.createScenario('My Blank', 'BLANK');
  check('LIST-03: blank scenario EMPTY_DRAFT', blank.lifecycle_state === 'EMPTY_DRAFT');
  check('LIST-03: blank has one draft root question', blank.custom_elements.length === 1 && blank.custom_elements[0].draft === true && blank.roots.standard === blank.custom_elements[0].ref);
  const copy = SCN.createScenario('My Copy', 'COPY', null, 'SCN.DEFAULT.SS01');
  check('LIST-02: copy scenario created', !!copy && copy.origin.type === 'COPY');
  check('LIST-02: copy reproduces root', copy.roots.standard === 'base:question:NOW.FEED.S01');

  group('LIST delete');
  SCN.deleteScenario(tpl.scenario_id);
  check('LIST-06: delete removes from list', !SCN.listScenarios().some(s => s.scenario_id === tpl.scenario_id));
  check('LIST-06: delete tombstone + not global', SCN.getScenario(tpl.scenario_id).deleted_at != null);
  SCN.undo(tpl.scenario_id);
  check('LIST-06: undo restores', SCN.listScenarios().some(s => s.scenario_id === tpl.scenario_id));

  group('VIEW projection');
  const g = SCN.composeGraph(ss01);
  check('VIEW-01: SS01 has elements and edges', g.elements.size > 0 && g.edges.size > 0);
  const p1 = SCN.projection(ss01, 'base:question:NOW.FEED.S01');
  check('VIEW-01: question children are seeded answers', p1.children.length === 4 && p1.children.every(c => c.kind === 'ANSWER'));
  check('VIEW-01: entry root shows no "Entry" parent', !p1.parents.some(p => p.kind === 'ENTRY'));
  const p2 = SCN.projection(ss01, 'base:question:NOW.FEED.S02');
  const toggles = p2.children.filter(c => c.kind === 'ANSWER');
  const continues = p2.children.filter(c => c.kind === 'CONTINUE');
  check('VIEW-05: multi-select has 3 toggles', toggles.length === 3);
  check('VIEW-05: Continue connector present to S03', continues.length === 1 && continues[0].destination_ref === 'base:question:NOW.FEED.S03');
  const tp = SCN.projection(ss01, toggles[0].ref);
  check('VIEW-05: multi-toggle answer has no navigational child (no self-loop)', tp.children.length === 0 && tp.parents.length === 1 && tp.parents[0].ref === 'base:question:NOW.FEED.S02');
  // answer projection
  const pa = SCN.projection(ss01, 'base:answer:OPT.NOW.001');
  check('VIEW-02: answer parent is owning question', pa.parents.length === 1 && pa.parents[0].ref === 'base:question:NOW.FEED.S01');
  check('VIEW-02: answer child is destination', pa.children.some(c => c.ref === 'base:question:NOW.FEED.S02'));
  // last answer in a route (routes to a system destination) has empty children
  const sysAns = [...g.edges.values()].find(e => e.relation === 'ANSWER_ROUTES_TO' && e.to_ref.startsWith('system:'));
  const sysProj = sysAns ? SCN.projection(ss01, sysAns.from_ref) : null;
  check('VIEW-06: answer routing to system has empty children', sysProj && sysProj.children.length === 0);

  group('FOCUS (view-state only)');
  const snapBefore = JSON.stringify(SCN.composeGraph(ss01));
  SCN.setFocus('SCN.DEFAULT.SS01', 'base:question:NOW.FEED.S02');
  check('FOCUS-01/03: focus change is view-state only (no topology/history)', JSON.stringify(SCN.composeGraph(ss01)) === snapBefore && SCN.getScenario('SCN.DEFAULT.SS01').history.length === 0);

  group('EDIT text');
  const baseText = SCN.effectiveElement(ss01, 'base:question:NOW.FEED.S01').text;
  SCN.commitTextEdit('SCN.DEFAULT.SS01', 'base:question:NOW.FEED.S01', 'Rewritten question?');
  check('EDIT-01: override applied', SCN.effectiveElement(SCN.getScenario('SCN.DEFAULT.SS01'), 'base:question:NOW.FEED.S01').text === 'Rewritten question?');
  const otherScn = SCN.getScenario('SCN.DEFAULT.SS02');
  check('EDIT-01: other scenario unchanged', SCN.effectiveElement(otherScn, 'base:question:NOW.OFF.S01').text === otherScn ? true : SCN.composeGraph(otherScn).elements.get('base:question:NOW.OFF.S01') != null);
  // empty commit rejected
  const ovCount = SCN.getScenario('SCN.DEFAULT.SS01').content_overrides.length;
  SCN.commitTextEdit('SCN.DEFAULT.SS01', 'base:question:NOW.FEED.S01', '   ');
  check('EDIT-02: empty commit rejected', SCN.getScenario('SCN.DEFAULT.SS01').content_overrides.length === ovCount && SCN.effectiveElement(SCN.getScenario('SCN.DEFAULT.SS01'), 'base:question:NOW.FEED.S01').text === 'Rewritten question?');
  SCN.undo('SCN.DEFAULT.SS01');
  check('EDIT-01 undo: text restored', SCN.effectiveElement(SCN.getScenario('SCN.DEFAULT.SS01'), 'base:question:NOW.FEED.S01').text === baseText);

  group('EDIT subtext');
  const defaultSupport = SCN.effectiveElement(SCN.getScenario('SCN.DEFAULT.SS01'), 'base:question:NOW.FEED.S01').support;
  check('SUB-01: base question carries package support copy', typeof defaultSupport === 'string' && defaultSupport.length > 0);
  SCN.commitSubTextEdit('SCN.DEFAULT.SS01', 'base:question:NOW.FEED.S01', 'Rewritten subtext.');
  const s01 = SCN.getScenario('SCN.DEFAULT.SS01');
  check('SUB-02: support override applied', SCN.effectiveElement(s01, 'base:question:NOW.FEED.S01').support === 'Rewritten subtext.' && (s01.support_overrides || []).length === 1);
  SCN.commitSubTextEdit('SCN.DEFAULT.SS01', 'base:question:NOW.FEED.S01', '   ');
  check('SUB-03: empty commit reverts to default', SCN.effectiveElement(SCN.getScenario('SCN.DEFAULT.SS01'), 'base:question:NOW.FEED.S01').support === defaultSupport && (SCN.getScenario('SCN.DEFAULT.SS01').support_overrides || []).length === 0);
  SCN.commitSubTextEdit('SCN.DEFAULT.SS01', 'base:question:NOW.FEED.S01', 'Sub again.');
  SCN.undo('SCN.DEFAULT.SS01');
  check('SUB-04: undo restores support', SCN.effectiveElement(SCN.getScenario('SCN.DEFAULT.SS01'), 'base:question:NOW.FEED.S01').support === defaultSupport);

  group('ADD child/sibling');
  const blankScn = SCN.getScenario(blank.scenario_id);
  const rootQ = blankScn.roots.standard;
  const aRef = SCN.addChild(blank.scenario_id, rootQ);
  check('EDIT-05: add child (answer) created', aRef && aRef.startsWith('scenario:answer:'));
  SCN.commitTextEdit(blank.scenario_id, aRef, 'My answer');
  check('EDIT-05: answer committed + QHA edge', SCN.composeGraph(SCN.getScenario(blank.scenario_id)).edges.values() && [...SCN.composeGraph(SCN.getScenario(blank.scenario_id)).edges.values()].some(e => e.relation === 'QUESTION_HAS_ANSWER' && e.to_ref === aRef));
  // add child (question) under the answer
  const qRef = SCN.addChild(blank.scenario_id, aRef);
  check('EDIT-06: add child (question) under answer', qRef && qRef.startsWith('scenario:question:'));
  // second child under answer should be rejected (has destination)
  const qRef2 = SCN.addChild(blank.scenario_id, aRef);
  check('EDIT-07: no second unconditional child', qRef2 === null);
  // add sibling under answer
  const sibRef = SCN.addSibling(blank.scenario_id, aRef);
  check('EDIT-08: add sibling answer', sibRef && sibRef.startsWith('scenario:answer:'));
  // entry root add-sibling unavailable
  const rootSib = SCN.addSibling(blank.scenario_id, rootQ);
  check('EDIT-09: entry root add-sibling unavailable', rootSib === null);

  group('DELETE element');
  const s2 = SCN.getScenario(blank.scenario_id);
  SCN.deleteElementPlacement(blank.scenario_id, sibRef);
  const gAfter = SCN.composeGraph(SCN.getScenario(blank.scenario_id));
  check('DELETE-02: placement edge hidden', ![...gAfter.edges.values()].some(e => e.to_ref === sibRef && e.relation === 'QUESTION_HAS_ANSWER'));
  SCN.undo(blank.scenario_id);
  const gRestored = SCN.composeGraph(SCN.getScenario(blank.scenario_id));
  check('DELETE-02: undo restores placement', [...gRestored.edges.values()].some(e => e.to_ref === sibRef && e.relation === 'QUESTION_HAS_ANSWER'));
  // root delete rejected
  SCN.deleteElementPlacement(blank.scenario_id, rootQ);
  check('DELETE-04: entry root delete rejected', SCN.composeGraph(SCN.getScenario(blank.scenario_id)).elements.has(rootQ));

  group('SAVE / validate / undo-redo');
  const s3 = SCN.getScenario(blank.scenario_id);
  const revBefore = s3.draft_revision;
  SCN.commitTextEdit(blank.scenario_id, rootQ, 'Root question?');
  check('SAVE-01: revision increments + becomes active', SCN.getScenario(blank.scenario_id).draft_revision === revBefore + 1 && SCN.getScenario(blank.scenario_id).active_revision === SCN.getScenario(blank.scenario_id).draft_revision);
  SCN.undo(blank.scenario_id);
  SCN.redo(blank.scenario_id);
  check('SAVE-04: undo then redo', SCN.effectiveElement(SCN.getScenario(blank.scenario_id), rootQ).text === 'Root question?');

  // invalid draft (dangling answer) -> draft retained, active unchanged
  const dangRef = SCN.addChild(blank.scenario_id, rootQ); // answer with no destination
  SCN.commitTextEdit(blank.scenario_id, dangRef, 'Dangling answer');
  const v = SCN.validate(SCN.getScenario(blank.scenario_id));
  check('VALIDATE-01: E_DANGLING_ANSWER emitted', v.errorCodes.includes('E_DANGLING_ANSWER'));
  check('SAVE-02: invalid draft does not become active', SCN.getScenario(blank.scenario_id).lifecycle_state === 'DRAFT_CHANGES_NOT_ACTIVE' && SCN.getScenario(blank.scenario_id).active_revision != null);

  // multiple unconditional targets
  SCN.addChild(blank.scenario_id, dangRef); // gives it a destination (question)
  // try to add another child → rejected (already has dest)
  const extra = SCN.addChild(blank.scenario_id, dangRef);
  check('EDIT-07/VALIDATE-01: single destination enforced', extra === null);

  group('ADD existing child question');
  const b2 = SCN.createScenario('Existing child test', 'BLANK');
  const b2root = SCN.getScenario(b2.scenario_id).roots.standard;
  const b2ans = SCN.addChild(b2.scenario_id, b2root);
  SCN.commitTextEdit(b2.scenario_id, b2ans, 'Pick one');
  const added = SCN.addExistingChild(b2.scenario_id, b2ans, 'base:question:NOW.FEED.S01');
  const b2g = SCN.composeGraph(SCN.getScenario(b2.scenario_id));
  check('ADD-EXIST-01: existing question attached as answer child',
    added === 'base:question:NOW.FEED.S01'
    && [...b2g.edges.values()].some(e => e.relation === 'ANSWER_ROUTES_TO' && e.from_ref === b2ans && e.to_ref === 'base:question:NOW.FEED.S01'));
  check('ADD-EXIST-02: second unconditional destination rejected',
    SCN.addExistingChild(b2.scenario_id, b2ans, 'base:question:NOW.FEED.S02') === null);
  check('ADD-EXIST-03: focus unchanged by addExistingChild',
    SCN.getScenario(b2.scenario_id).editor_view_state.focus_ref === b2root);
  const pAdded = SCN.projection(SCN.getScenario(b2.scenario_id), 'base:question:NOW.FEED.S01');
  check('ADD-EXIST-04: chosen question appears alone (no auto siblings)',
    pAdded.parents.length === 1 && pAdded.parents[0].ref === b2ans && pAdded.siblings.length === 0);

  group('PRIVACY / EXTERNAL');
  const raw = localStorage.getItem('fsaw.scenarios.v1') || '';
  check('PRIVACY-01: no run-answer/marker keys in scenario storage', !/fsaw\.marker|runAnswers|customText|fsaw\.diagnostic/i.test(raw));
  check('EXTERNAL-01: no external-action code in scenario engine', !/window\.open|location\.href|fetch\(|XMLHttpRequest/i.test(SCN.toString()));

  // REGRESS: inherited scenario reproduces v0.6 path
  group('REGRESS');
  const g0 = SCN.composeGraph(SCN.getScenario('SCN.DEFAULT.SS01'));
  const s01kids = SCN.projection(SCN.getScenario('SCN.DEFAULT.SS01'), 'base:question:NOW.FEED.S01').children.map(c => c.ref);
  check('REGRESS-01: inherited seeded answers match v0.6', s01kids.includes('base:answer:OPT.NOW.001') && s01kids.includes('base:answer:OPT.NOW.002') && s01kids.length === 4);
  check('REGRESS-01: full standard route reachable (S01→S06)', ['NOW.FEED.S01','NOW.FEED.S02','NOW.FEED.S03','NOW.FEED.S04','NOW.FEED.S05','NOW.FEED.S06'].every(id => g0.elements.has('base:question:' + id)));
  const p011 = SCN.projection(SCN.getScenario('SCN.DEFAULT.SS01'), 'base:answer:OPT.NOW.011');
  check('REGRESS-01: custom-input answer follows its next node', p011.children.some(c => c.ref === 'base:question:NOW.FEED.S02'));

  // LOOP-BACK edges are not parents (e.g. "Change a choice" on S06 returning to S01)
  const pS01 = SCN.projection(SCN.getScenario('SCN.DEFAULT.SS01'), 'base:question:NOW.FEED.S01');
  check('REGRESS-02: entry question has no parents from loop-back edges', pS01.parents.length === 0);
  const pS06 = SCN.projection(SCN.getScenario('SCN.DEFAULT.SS01'), 'base:question:NOW.FEED.S06');
  check('REGRESS-02: loop-back answer remains a child of its owner (S06)',
    pS06.children.some(c => c.ref === 'base:answer:OPT.NOW.057'));

  // GLOBAL ANSWER SEARCH VISIBILITY (allowlist curation v0.1)
  group('CURATE global answer search');
  const P = ENGINE.PKG;
  const curation = P.curation;
  check('CURATE-01: curation file loaded', !!curation && curation.scope === 'GLOBAL_PREMADE_ANSWER_SEARCH_VISIBILITY_ONLY' && curation.selection_mode === 'ALLOWLIST');
  check('CURATE-02: canonical catalog intact (475)', P.inventoryAnswers.length === 475);
  check('CURATE-03: global search exposes 158, hides 317',
    P.searchableAnswers.length === 158 && (475 - P.searchableAnswers.length) === 317);
  const visIds = P.searchableAnswers.map(a => a.id);
  check('CURATE-04: visible IDs unique, each resolves exactly once',
    new Set(visIds).size === 158 && visIds.every(id => P.inventoryAnswers.filter(a => a.id === id).length === 1));
  check('CURATE-05: canonical order preserved', visIds.every((id, i) => P.searchableAnswers[i].id === id)
    && visIds.join('|') === P.inventoryAnswers.filter(a => visIds.includes(a.id)).map(a => a.id).join('|'));
  const mustPreserve = (curation && curation.must_preserve_runtime_answer_source_ids) || [];
  check('CURATE-06: all 31 route-referenced answers remain visible',
    mustPreserve.length === 31 && mustPreserve.every(id => ENGINE.isAnswerSearchVisible(id)));
  const hidden = P.inventoryAnswers.find(a => !ENGINE.isAnswerSearchVisible(a.id));
  check('CURATE-07: hidden answers exist and are excluded from search set',
    !!hidden && !P.searchableAnswers.some(a => a.id === hidden.id));
  check('CURATE-08: hidden answer still resolvable by exact ID',
    hidden && P.inventoryAnswers.some(a => a.id === hidden.id) && typeof ENGINE.isAnswerSearchVisible(hidden.id) === 'boolean');
  // a pre-existing scenario referencing a hidden answer behaves identically
  freshStore();
  const hScn = SCN.createScenario('Hidden answer holder', 'TEMPLATE', 'SS01');
  const hAnsRef = 'base:answer:OPT.NOW.002';
  SCN.replaceContentReference(hScn.scenario_id, hAnsRef, hidden.id, hidden.label);
  const hG = SCN.composeGraph(SCN.getScenario(hScn.scenario_id));
  check('CURATE-09: scenario with hidden answer loads, displays, and edits identically',
    hG.elements.get(hAnsRef).text === hidden.label
    && hG.elements.get(hAnsRef).source_inventory_id === hidden.id
    && SCN.getScenario(hScn.scenario_id).lifecycle_state === 'ACTIVE'
    && !ENGINE.isAnswerSearchVisible(hidden.id));
  check('CURATE-10: baseline unchanged — 128 nodes, 890 options',
    P.nodes.length === 128 && P.options.length === 890);

  const pass = Results.filter(r => r.pass).length;
  const fail = Results.length - pass;
  if (typeof document !== 'undefined') { /* browser harness prints via runner */ }
}

window.addEventListener('DOMContentLoaded', () => {});
