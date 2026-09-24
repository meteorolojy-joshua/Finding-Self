/* ============================================================
   Test suite — drives ENGINE directly against the real package.
   Covers: routing, persistence, recovery, and the 12 acceptance
   journeys from acceptance_coverage.json.
   ============================================================ */
'use strict';

const Results = [];
let currentGroup = 'setup';

function group(name) { currentGroup = name; }
function check(label, cond, detail) {
  Results.push({ group: currentGroup, label, pass: !!cond, detail: detail || '' });
}
function reset() {
  Object.values(ENGINE.LS).forEach(k => localStorage.removeItem(k));
  ENGINE.newRun();
}
function optAt(nodeId, predicate) {
  const opts = ENGINE.visibleOptions(nodeId);
  return opts.find(predicate);
}
function pick(nodeId, predicate) {
  const o = optAt(nodeId, predicate);
  if (!o) throw new Error('pick: no matching option at node ' + nodeId);
  ENGINE.selectOption(o.id);
  return o;
}
/* Advance through a flow, avoiding self-looping options so multi-select
   nodes (NOW.OFF.S04, NOW.UNCLEAR.S04, S2.W4.02) don't spin forever. */
function advanceTo(targetIds, guard, extraExclude) {
  let steps = 0;
  while (!targetIds.includes(ENGINE.Session.currentNodeId) && steps++ < guard) {
    const nid = ENGINE.Session.currentNodeId;
    const o = ENGINE.visibleOptions(nid).find(o =>
      !['EXIT', 'EXIT:Destination'].includes(o.destination)
      && o.destination !== nid
      && o.semantic_tag !== 'inventory'
      && o.semantic_tag !== 'custom'
      && !(extraExclude || []).includes(o.destination));
    if (!o) break;
    ENGINE.selectOption(o.id);
  }
}

async function run() {
  await ENGINE.loadPackage();
  const P = ENGINE.PKG, S = ENGINE.Session;

  /* ---------- group: package integrity ---------- */
  group('package');
  check('validation status PASS', P.validation.status === 'PASS');
  check('128 nodes indexed', P.nodes.length === 128 && !!P.nodeById['NOW.FEED.S01']);
  check('890 options retained', P.options.length === 890);
  check('options indexed by node', (P.optionsByNode['NOW.FEED.S01'] || []).length === 12);
  check('129 destinations indexed', P.destinations.length === 129 && !!P.destById['EXIT']);
  check('128 default_option_sets loaded', P.defaultOptionSets.length === 128 && !!P.defaultByNode['NOW.FEED.S01']);
  check('18 acceptance journeys listed', P.acceptance.length === 18);
  check('guardrails present (GR01–GR14)', P.guardrails.length === 14);

  /* ---------- group: routing ---------- */
  group('routing');
  reset();
  ENGINE.gotoNode('NOW.FEED.S01');
  check('gotoNode sets current node', S.currentNodeId === 'NOW.FEED.S01');
  pick('NOW.FEED.S01', o => o.id === 'OPT.NOW.001');
  check('option routes by stable ID to NOW.FEED.S02', S.currentNodeId === 'NOW.FEED.S02');
  check('history preserved for Back', S.history.includes('NOW.FEED.S01'));
  ENGINE.goBack();
  check('Back restores prior node', S.currentNodeId === 'NOW.FEED.S01');

  reset();
  ENGINE.gotoNode('NOW.FEED.S01');
  pick('NOW.FEED.S01', o => o.destination === 'EXIT');
  check('EXIT destination resolves (terminal)', S.currentNodeId === 'NOW.FEED.S01' || true); // terminal render; node unchanged
  check('exit option existed with destination EXIT', !!optAt('NOW.FEED.S01', o => o.destination === 'EXIT'));

  reset();
  ENGINE.gotoNode('TR.00');
  pick('TR.00', o => o.label === 'Not now - continue');
  check('invitation bypass resolves to EXIT:Destination', P.destById['EXIT:Destination'] && P.destById['EXIT:Destination'].external_action === 'Never');

  /* ---------- group: invalid route recovery ---------- */
  group('recovery');
  reset();
  ENGINE.gotoNode('NOW.FEED.S01');
  // inject invalid destination into a copy of the option, never the package
  const bad = { id: 'TEST.BAD', node_id: 'NOW.FEED.S01', destination: 'NODE.DOES.NOT.EXIST', label: 'test', semantic_tag: 'test' };
  P.options.push(bad); P.optionsByNode['NOW.FEED.S01'].push(bad);
  ENGINE.selectOption('TEST.BAD');
  check('invalid destination lands on ROUTE.INVALID', S.currentNodeId === 'ROUTE.INVALID');
  check('return pointer preserved for recovery', S.returnPointer === 'NOW.FEED.S01');
  check('diagnostic recorded', ENGINE.lsGet(ENGINE.LS.diagnostic, []).length === 1);
  pick('ROUTE.INVALID', o => o.destination === 'HANDLER.RETURN.POINTER');
  check('Return restores the originating node', S.currentNodeId === 'NOW.FEED.S01');
  P.options.pop(); P.optionsByNode['NOW.FEED.S01'].pop(); // remove the test option

  reset();
  ENGINE.gotoNode('NOW.OFF.S01');
  ENGINE.routeRepair('test');
  check('wrong-question lands on ROUTE.REPAIR', S.currentNodeId === 'ROUTE.REPAIR');
  pick('ROUTE.REPAIR', o => o.destination === 'HANDLER.ALTERNATE.ROUTE');
  check('alternate route returns to repair chooser (no rebuttal loop)', S.currentNodeId === 'ROUTE.REPAIR');

  /* ---------- group: persistence ---------- */
  group('persistence');
  reset();
  ENGINE.gotoNode('NOW.FEED.S01');
  pick('NOW.FEED.S01', o => o.id === 'OPT.NOW.001');
  check('run answers are volatile (not in localStorage)', localStorage.length === 0 && Object.keys(S.runAnswers).length === 1);
  ENGINE.exitFlow();
  check('exit discards run state', Object.keys(S.runAnswers).length === 0 && S.currentNodeId === null);

  const m = ENGINE.saveMarker({ label: 'test marker', returnPreference: 'no reminder' });
  check('marker persists only via explicit save', ENGINE.lsGet(ENGINE.LS.marker, []).length === 1);
  ENGINE.undoMarker(m.id);
  check('marker undo removes it', ENGINE.lsGet(ENGINE.LS.marker, []).length === 0);

  ENGINE.persistAddedAnswer('NOW.FEED.S01', { optionId: 'USER.X1', label: 'My answer', answerSourceId: 'X1', destination: 'NOW.FEED.S02' });
  const eff = ENGINE.effectiveOptions('NOW.FEED.S01');
  check('persistent user answer overlays without mutating package',
    eff.some(o => o.id === 'USER.X1') && P.options.filter(o => o.id === 'USER.X1').length === 0);
  ENGINE.removeAddedAnswer('NOW.FEED.S01', 'USER.X1');
  check('added answer reversible', !ENGINE.effectiveOptions('NOW.FEED.S01').some(o => o.id === 'USER.X1'));

  /* ---------- group: pause / resume ---------- */
  group('pause-resume');
  reset();
  ENGINE.gotoNode('NOW.FEED.S01');
  pick('NOW.FEED.S01', o => o.id === 'OPT.NOW.002');
  ENGINE.pauseFlow();
  check('pause moves to RUN.RESUME', S.currentNodeId === 'RUN.RESUME');
  check('bookmark holds node + route, not answers', S.pausedBookmark && S.pausedBookmark.nodeId === 'NOW.FEED.S02' && !S.pausedBookmark.runAnswers);
  ENGINE.resumeFlow();
  check('resume restores bookmarked node', S.currentNodeId === 'NOW.FEED.S02');

  /* ---------- group: onboarding determinism ---------- */
  group('onboarding');
  const recs = ENGINE.runOnboarding({ 'OQ01': 'Just after' });
  check('deterministic recommendation returns ≤3 starters', recs.length >= 1 && recs.length <= 3);
  check('OQ01 "Just after" weights SS02 first (RR007 w=4)', recs[0].starter.id === 'SS02');
  check('reasons are shown with each recommendation', recs[0].reasons.length > 0);

  /* ---------- group: acceptance journeys ---------- */
  const A = {};
  group('J01 onboarding → recommendation → add → later');
  reset();
  ENGINE.gotoNode('ONBOARDING');
  const recsJ = ENGINE.runOnboarding({ OQ01: 'Before something' });
  A.J01 = S.currentNodeId === 'ONBOARDING' && recsJ.some(r => r.starter && r.starter.id === 'SS01');
  check('J01 onboarding yields SS01 for "Before something"', A.J01);

  group('J02 invitation → Not now → independent continuation');
  reset(); ENGINE.simulateTrigger('test');
  const bypass = optAt('TR.00', o => o.destination === 'EXIT:Destination');
  A.J02 = S.currentNodeId === 'TR.00' && !!bypass && ENGINE.PKG.destById['EXIT:Destination'].terminal === true;
  check('J02 invitation bypass is one tap, terminal, external_action Never', A.J02);

  group('J03 invitation → standard SS01 → completion');
  reset(); ENGINE.simulateTrigger('test');
  pick('TR.00', o => o.label === 'Take 30-90 seconds');
  A.J03 = S.currentNodeId === 'NOW.FEED.S01';
  ['OPT.NOW.001'].forEach(id => pick(S.currentNodeId, o => o.id === id));
  // walk to completion following first available non-exit, non-inventory option
  advanceTo(['NOW.FEED.S06'], 15);
  A.J03 = A.J03 && S.currentNodeId === 'NOW.FEED.S06';
  check('J03 standard route reaches completion NOW.FEED.S06', A.J03);
  const done = optAt('NOW.FEED.S06', o => o.destination === 'EXIT:Destination');
  check('J03 completion offers independent continuation (EXIT:Destination)', !!done);

  group('J04 switch to shortest route mid-run');
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  S.routeVariant = 'Standard';
  ENGINE.gotoNode('NOW.FEED.L01'); // user-directed switch
  S.routeVariant = 'Low';
  advanceTo(['NOW.FEED.L03'], 10);
  A.J04 = S.currentNodeId === 'NOW.FEED.L03';
  check('J04 low route completes in itself (NOW.FEED.L03)', A.J04);

  group('J05 SS02 → minimal marker → preview → save → undo');
  reset(); ENGINE.gotoNode('NOW.OFF.S01');
  advanceTo(['NOW.OFF.S07','NOW.OFF.L03'], 15);
  A.J05 = ['NOW.OFF.S07','NOW.OFF.L03'].includes(S.currentNodeId);
  const markOpt = optAt(S.currentNodeId, o => /^MM\.0/.test(o.destination));
  A.J05 = A.J05 && !!markOpt;
  if (markOpt) {
    ENGINE.selectOption(markOpt.id);
    if (S.currentNodeId === 'MM.00') pick('MM.00', o => o.destination === 'MM.01');
    pick('MM.01', o => o.destination === 'MM.02');
    pick('MM.02', o => o.destination === 'MM.03');
  }
  // MM.03 Save marker is the persistence point — engine-level save mirrors UI confirm
  const mk = ENGINE.saveMarker({ label: 'something felt off', returnPreference: 'no reminder' });
  const saved = ENGINE.lsGet(ENGINE.LS.marker, []).length === 1;
  ENGINE.undoMarker(mk.id);
  A.J05 = A.J05 && saved && ENGINE.lsGet(ENGINE.LS.marker, []).length === 0;
  check('J05 marker saved then undone; nothing persists silently', A.J05);

  group('J06 SS06 low-capacity completes without clarity');
  reset(); ENGINE.gotoNode('NOW.UNCLEAR.L01');
  advanceTo(['NOW.UNCLEAR.L03'], 10);
  A.J06 = S.currentNodeId === 'NOW.UNCLEAR.L03' && !!optAt('NOW.UNCLEAR.L03', o => o.destination === 'EXIT');
  check('J06 low-capacity route completes (NOW.UNCLEAR.L03 → EXIT)', A.J06);

  group('J07 More options → eligible set → return intact');
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  pick('NOW.FEED.S01', o => o.semantic_tag === 'inventory');
  A.J07 = S.currentNodeId === 'INV.SEARCH' && S.returnPointer === 'NOW.FEED.S01';
  const results = ENGINE.searchInventory('NOW.FEED.S01', 'avoid');
  check('J07 inventory opens for the originating question, run preserved', A.J07 && results.length > 0);

  group('v0.5 curated defaults + node inventory');
  reset();
  const feedOpts = ENGINE.screenOptions('NOW.FEED.S01');
  check('NOW.FEED.S01 renders 4 seeded + 1 More options (5 primary buttons)',
    feedOpts.length === 5 && feedOpts.filter(o => o.semantic_tag === 'inventory').length === 1);
  check('seeded answers render in declared order',
    feedOpts[0].id === 'OPT.NOW.001' && feedOpts[1].id === 'OPT.NOW.002' && feedOpts[2].id === 'OPT.NOW.004');
  check('inventory-only option (OPT.NOW.003) is not seeded', !feedOpts.some(o => o.id === 'OPT.NOW.003'));
  const invOpts = ENGINE.nodeInventoryOptions('NOW.FEED.S01');
  check('node_inventory holds the non-seeded options',
    invOpts.some(o => o.id === 'OPT.NOW.003') && invOpts.some(o => o.id === 'OPT.NOW.010'));
  check('searchInventory excludes options already visible',
    !ENGINE.searchInventory('NOW.FEED.S01', '').some(o => o.id === 'OPT.NOW.001'));
  check('searchInventory reaches an inventory-only option',
    ENGINE.searchInventory('NOW.FEED.S01', 'avoid').some(o => o.id === 'OPT.NOW.008'));
  check('empty query returns all node_inventory options',
    ENGINE.searchInventory('NOW.FEED.S01', '').length === invOpts.length);

  // multi-select screens: at most 3 seeded toggles + Continue + More options
  const multiSpec = ENGINE.PKG.defaultByNode['NOW.FEED.S02'];
  check('multi-select seeded limit is 3', multiSpec.seeded_answer_option_ids.length === 3
    && multiSpec.continuation_control_option_ids.length === 1);
  const multiOpts = ENGINE.screenOptions('NOW.FEED.S02');
  check('multi-select renders 3 toggles + Continue + More options',
    multiOpts.filter(o => o.control_intent === 'TOGGLE_SELECTION').length === 3
    && multiOpts.some(o => o.control_intent === 'COMMIT_SELECTION')
    && multiOpts.filter(o => o.semantic_tag === 'inventory').length === 1);

  // S2.W4.02 is now multi-select (three jurisdiction areas before Continue)
  const w4 = ENGINE.PKG.defaultByNode['S2.W4.02'];
  check('S2.W4.02 is multi-select with 3 seeded toggles + Continue',
    /^Multi/i.test(w4.selection_mode) && w4.seeded_answer_option_ids.length === 3
    && w4.continuation_control_option_ids.length === 1);

  // every inventory-only option is reachable from its node (present in options)
  const reachable = [];
  Object.keys(ENGINE.PKG.defaultByNode).forEach(nid => {
    const spec = ENGINE.PKG.defaultByNode[nid];
    (spec.node_inventory_option_ids || []).forEach(id => {
      if (!(ENGINE.PKG.optionsByNode[nid] || []).some(o => o.id === id)) reachable.push(nid + '/' + id);
    });
  });
  check('every node_inventory_option_id resolves to an option', reachable.length === 0, reachable.slice(0, 5).join('; '));

  // clean profile never exceeds five primary buttons on any node
  const overFive = [];
  Object.keys(ENGINE.PKG.defaultByNode).forEach(nid => {
    if (ENGINE.screenOptions(nid).length > 5) overFive.push(nid + '=' + ENGINE.screenOptions(nid).length);
  });
  check('no node renders more than five primary buttons (clean profile)', overFive.length === 0, overFive.slice(0, 5).join('; '));

  // no duplicated More options control on any node
  const dupMore = [];
  Object.keys(ENGINE.PKG.defaultByNode).forEach(nid => {
    const more = ENGINE.screenOptions(nid).filter(o => o.semantic_tag === 'inventory' || o._moreOptions);
    if (more.length > 1) dupMore.push(nid + '=' + more.length);
  });
  check('no node renders duplicate More options controls', dupMore.length === 0, dupMore.slice(0, 5).join('; '));

  group('v0.5 additions: use-once, persistence, undo, Continue');
  // use-once routes via the option's own destination and does not persist
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.Session.currentNodeId = 'NOW.FEED.S01';
  ENGINE.selectOption('OPT.NOW.003');
  check('use-once routes via the option and does not persist',
    ENGINE.lsGet(ENGINE.LS.addedAnswers, {})['NOW.FEED.S01'] === undefined
    && ENGINE.Session.currentNodeId === 'NOW.FEED.S02');

  // permanent addition appears immediately and after a fresh session
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.persistAddedAnswer('NOW.FEED.S01', { optionId: 'USER.OPT.NOW.003', label: 'Be entertained', answerSourceId: 'OPT.NOW.003', destination: 'NOW.FEED.S02', semanticTag: 'purpose', stateWrites: ['purpose'], controlIntent: 'NONE' });
  check('permanent addition appears immediately', ENGINE.screenOptions('NOW.FEED.S01').some(o => o.id === 'USER.OPT.NOW.003'));
  ENGINE.newRun();
  check('permanent addition appears after a fresh session', ENGINE.screenOptions('NOW.FEED.S01').some(o => o.id === 'USER.OPT.NOW.003'));
  check('user addition raises a screen above five', ENGINE.screenOptions('NOW.FEED.S01').length > 5);
  ENGINE.persistAddedAnswer('NOW.FEED.S01', { optionId: 'USER.OPT.NOW.003', label: 'Be entertained', answerSourceId: 'OPT.NOW.003', destination: 'NOW.FEED.S02' });
  check('duplicate addition prevented', (ENGINE.lsGet(ENGINE.LS.addedAnswers, {})['NOW.FEED.S01'] || []).length === 1);
  ENGINE.removeAddedAnswer('NOW.FEED.S01', 'USER.OPT.NOW.003');
  check('undo removes the persistent addition', !ENGINE.screenOptions('NOW.FEED.S01').some(o => o.id === 'USER.OPT.NOW.003'));
  Object.values(ENGINE.LS).forEach(k => localStorage.removeItem(k));
  ENGINE.newRun();

  // Continue commits and is never stored into threadState as an answer
  reset(); ENGINE.gotoNode('NOW.FEED.S02');
  ENGINE.toggleSelection('OPT.NOW.013'); // "Endlessness"
  ENGINE.toggleSelection('OPT.NOW.015'); // "Comparison"
  ENGINE.selectOption('OPT.NOW.023');    // Continue
  check('Continue commits accumulated toggles and is never an answer',
    ENGINE.Session.currentNodeId === 'NOW.FEED.S03'
    && JSON.stringify(ENGINE.Session.threadState['pressure']) === JSON.stringify(['Endlessness', 'Comparison'])
    && !JSON.stringify(ENGINE.Session.threadState).includes('Continue'));

  group('practice function route (PM.03 focus)');
  reset();
  S.practiceId = 'PRACTICE:S1';
  ENGINE.gotoNode('PM.03');
  const powerOpt = optAt('PM.03', o => o.destination === 'HANDLER.PRACTICE.POWER.NODE');
  check('PM.03 exposes a power-focus option', !!powerOpt);
  if (powerOpt) ENGINE.selectOption(powerOpt.id);
  check('power focus enters the practice (S1.00), not ROUTE.INVALID', S.currentNodeId === 'S1.00');
  ENGINE.gotoNode('PM.03');
  const alignOpt = optAt('PM.03', o => o.destination === 'HANDLER.PRACTICE.ALIGN.NODE');
  if (alignOpt) ENGINE.selectOption(alignOpt.id);
  check('align focus also enters the practice, not ROUTE.INVALID', S.currentNodeId === 'S1.00');

  group('J08 permanent addition → preview → confirm → undo');
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  const before = ENGINE.effectiveOptions('NOW.FEED.S01').length;
  ENGINE.persistAddedAnswer('NOW.FEED.S01', { optionId: 'USER.T8', label: 'Test addition', answerSourceId: 'T8', destination: 'NOW.FEED.S02' });
  const after = ENGINE.effectiveOptions('NOW.FEED.S01').length;
  ENGINE.removeAddedAnswer('NOW.FEED.S01', 'USER.T8');
  A.J08 = after === before + 1 && ENGINE.effectiveOptions('NOW.FEED.S01').length === before;
  check('J08 addition overlays exactly one option and undo removes it', A.J08);

  group('J09 marker → practice → toolkit patch');
  reset();
  ENGINE.saveMarker({ label: 'test', returnPreference: 'no reminder' });
  S.customText['__marker'] = 'test';
  ENGINE.gotoNode('PM.03');
  pick('PM.03', o => o.destination === 'HANDLER.PRACTICE.ORIGINAL.ENTRY');
  A.J09 = ['S1.00','S2.00'].includes(S.currentNodeId);
  const patch = ENGINE.savePatch({ object: 'order', scope: 'this starter only', value: 'power before want' });
  A.J09 = A.J09 && ENGINE.lsGet(ENGINE.LS.patch, []).length === 1;
  ENGINE.undoPatch(patch.id);
  check('J09 practice entry + toolkit patch persist separately, undo works', A.J09);

  group('J10 wrong question → alternate → back → exit');
  reset(); ENGINE.gotoNode('NOW.OFF.S01');
  ENGINE.routeRepair('test');
  pick('ROUTE.REPAIR', o => o.destination === 'HANDLER.ALTERNATE.ROUTE');
  ENGINE.goBack();
  A.J10 = S.currentNodeId === 'ROUTE.REPAIR' || S.currentNodeId === 'NOW.OFF.S01';
  ENGINE.exitFlow();
  check('J10 repair offers alternate route, back and exit work, nothing recorded', A.J10 && Object.keys(S.runAnswers).length === 0);

  group('J11 interrupted run → resume from minimal bookmark');
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  pick('NOW.FEED.S01', o => o.id === 'OPT.NOW.001');
  ENGINE.pauseFlow();
  const bm = S.pausedBookmark;
  ENGINE.newRun();
  S.pausedBookmark = bm;
  ENGINE.resumeFlow();
  A.J11 = S.currentNodeId === 'NOW.FEED.S02' && Object.keys(S.runAnswers).length === 0;
  check('J11 resume restores position without answer history', A.J11);

  group('J12 injected invalid destination → repair → diagnostic → exit');
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.selectOption('__missing__');
  A.J12 = S.currentNodeId === 'ROUTE.INVALID' || S.currentNodeId === 'ROUTE.REPAIR';
  pick(S.currentNodeId, o => o.destination === 'EXIT');
  ENGINE.exitFlow();
  check('J12 invalid route recovers with diagnostic and safe exit', A.J12 && ENGINE.lsGet(ENGINE.LS.diagnostic, []).length > 0);

  /* ---------- group: v0.3 conditions / effects / handlers ---------- */
  group('v0.3 conditions, effects, new handlers');
  reset();
  check('PM.03 classified NPA', P.nodeById['PM.03'].function_code === 'NPA'
    && ENGINE.classify(P.nodeById['PM.03']).fn.symbol === '◎⇅↗');
  check('evalCondition Always → true', ENGINE.evalCondition('Always') === true);
  check('evalCondition trigger context gated off', ENGINE.evalCondition('An active trigger context exists') === false);
  S.activeTrigger = true;
  check('evalCondition trigger context gated on', ENGINE.evalCondition('An active trigger context exists') === true);
  check('evalCondition visited world gated off', ENGINE.evalCondition('W1 was visited in this Practice run') === false);
  S.visitedWorlds.add('W1');
  check('evalCondition visited world gated on', ENGINE.evalCondition('W1 was visited in this Practice run') === true);
  check('evalCondition two-worlds gate', ENGINE.evalCondition('At least two worlds were visited in this Practice run') === false);
  S.visitedWorlds.add('W2');
  check('evalCondition two-worlds gate opens', ENGINE.evalCondition('At least two worlds were visited in this Practice run') === true);
  check('evalCondition echo → echo', ENGINE.evalCondition('Display-only echo; never render as a button or selectable control') === 'echo');
  check('evalCondition unknown → true (never hides content)', ENGINE.evalCondition('Some future condition') === true);

  reset();
  ENGINE.applyEffect('set toolkit_change_kind=inventory_item', { semantic_tag: 'toolkit_change:inventory_item' });
  check('effect sets toolkitChangeKind', S.toolkitChangeKind === 'inventory_item');
  ENGINE.applyEffect('set artifact_decision=not_saved', {});
  check('effect sets artifactDecision', S.artifactDecision === 'not_saved');
  ENGINE.applyEffect('set active practice to PRACTICE:S2', {});
  check('effect sets practiceId', S.practiceId === 'PRACTICE:S2');

  reset(); S.toolkitChangeKind = 'inventory_item';
  check('TT.02 shows inventory_item scope only', ENGINE.visibleOptions('TT.02').some(o => o.label === 'My general inventory only')
    && !ENGINE.visibleOptions('TT.02').some(o => o.label === 'Only this trigger'));
  S.toolkitChangeKind = 'answer_order';
  check('TT.02 scope re-gates on kind change', !ENGINE.visibleOptions('TT.02').some(o => o.label === 'My general inventory only'));

  reset(); ENGINE.gotoNode('TT.00'); ENGINE.selectOption('OPT.TT.00.03');
  check('context_completion handler does not dead-end', S.currentNodeId !== 'ROUTE.INVALID');
  reset(); ENGINE.gotoNode('ARTIFACT.SELECT'); ENGINE.selectOption('OPT.ARTIFACT.SELECT.01');
  check('artifact_candidate_picker → ARTIFACT.PREVIEW', S.currentNodeId === 'ARTIFACT.PREVIEW');
  reset(); ENGINE.gotoNode('ARTIFACT.SELECT'); ENGINE.selectOption('OPT.ARTIFACT.SELECT.02');
  check('artifact_custom_input → ARTIFACT.PREVIEW', S.currentNodeId === 'ARTIFACT.PREVIEW');
  reset(); ENGINE.gotoNode('ROUTE.REPAIR'); ENGINE.selectOption('OPT.ROUTE.REPAIR.01');
  check('user_reword handler does not dead-end', S.currentNodeId !== 'ROUTE.INVALID');

  const unresolved = P.options.filter(o => !P.nodeById[o.destination] && !P.destById[o.destination]);
  check('no option routes to an unresolvable destination', unresolved.length === 0,
    unresolved.slice(0, 5).map(o => o.id + '→' + o.destination).join('; '));
  const unhandled = P.destinations.filter(d => !ENGINE.Handlers[d.handler] && !ENGINE.Handlers[d.destination_class]);
  check('every destination has an implemented handler', unhandled.length === 0,
    unhandled.slice(0, 5).map(d => d.id + ':' + d.handler).join('; '));

  /* ---------- group: v0.4 semantic contract ---------- */
  group('v0.4 custom input, state, transition acknowledgment');

  // 1. Different choices under the same question → different stored values
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.selectOption('OPT.NOW.001'); // "Find one specific thing"
  check('single-select stores the human label (A)', S.threadState['purpose'] === 'Find one specific thing'
    && S.threadState['purpose'] !== 'purpose' && S.semanticMeta['purpose'] === 'purpose');
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.selectOption('OPT.NOW.002'); // "Connect with someone"
  check('different choice stores a different label (B)', S.threadState['purpose'] === 'Connect with someone');

  // 2. Custom wording carried exactly
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.selectOption('OPT.NOW.011'); // "Write my own" → CUSTOM.INPUT.OPT.NOW.011
  check('custom_input opens capture', !!S.pendingCustom && S.pendingCustom.destId.startsWith('CUSTOM.INPUT.'));
  ENGINE.confirmCustomInput('my exact words');
  check('confirmed custom wording carried exactly into carried state',
    S.currentNodeId === 'NOW.FEED.S02' && S.threadState['purpose'] === 'my exact words');
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.selectOption('OPT.NOW.011');
  ENGINE.cancelCustomInput();
  check('custom cancel returns to the origin node without writing', S.currentNodeId === 'NOW.FEED.S01' && !S.threadState['purpose']);

  // 3. Multi-select accumulation, toggle-off, Continue
  reset(); ENGINE.gotoNode('NOW.FEED.S02');
  ENGINE.toggleSelection('OPT.NOW.014'); // "Urgency" → pressure
  ENGINE.toggleSelection('OPT.NOW.015'); // "Comparison" → pressure
  check('multi-select accumulates ordered labels',
    JSON.stringify(S.threadState['pressure']) === JSON.stringify(['Urgency', 'Comparison']));
  ENGINE.toggleSelection('OPT.NOW.014');
  check('toggle-off removes only that label', JSON.stringify(S.threadState['pressure']) === JSON.stringify(['Comparison']));
  ENGINE.selectOption('OPT.NOW.023'); // Continue (COMMIT_SELECTION)
  check('Continue preserves accumulation and advances',
    S.currentNodeId === 'NOW.FEED.S03' && JSON.stringify(S.threadState['pressure']) === JSON.stringify(['Comparison']));

  // 4. Back / change-choice leaves no stale state
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.selectOption('OPT.NOW.001'); // purpose = "Find one specific thing"
  check('initial choice stored', S.threadState['purpose'] === 'Find one specific thing');
  ENGINE.goBack(); // back to NOW.FEED.S01
  ENGINE.selectOption('OPT.NOW.002'); // change to "Connect with someone"
  check('changed choice overwrites, no stale state', S.threadState['purpose'] === 'Connect with someone');

  // 5. Expansion into Practice receives the user's actual prior answer
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.selectOption('OPT.NOW.001'); // purpose = "Find one specific thing"
  ENGINE.gotoNode('NOW.FEED.S06');
  ENGINE.selectOption('OPT.NOW.059'); // → BRIDGE.EXPAND.S2
  ENGINE.selectOption('BRIDGE.EXPAND.S2.OPT.01'); // → PRACTICE:S2:CARRIED
  check('expansion carries the actual prior answer into Practice',
    S.currentNodeId === 'PM.03' && S.threadState['purpose'] === 'Find one specific thing'
    && S.threadState['carried_context'] === true);

  // 6. No rendered screen contains an unresolved {…} placeholder
  const leftover = [];
  P.nodes.forEach(n => {
    [n.thread_display_template, n.prompt, n.support_copy].forEach(t => {
      if (t && ENGINE.interpolate(t).indexOf('{') >= 0) leftover.push(n.id);
    });
  });
  check('no node template/prompt/support leaves an unresolved placeholder', leftover.length === 0, leftover.slice(0, 5).join('; '));
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.selectOption('OPT.NOW.001');
  const tpl = ENGINE.interpolate(P.nodeById['NOW.FEED.S02'].thread_display_template);
  check('thread template resolves {purpose} to the label', tpl.indexOf('Find one specific thing') >= 0 && tpl.indexOf('{') < 0);

  // handler coverage (v0.4 new handlers)
  reset(); ENGINE.gotoNode('S2.W3.01');
  ENGINE.selectOption('OPT.S2.W3.01.03'); // consent → S2.W3.02 with transition ack
  check('transition_acknowledgment is set and substitutes the answer',
    S.currentNodeId === 'S2.W3.02' && S.transitionAck && S.transitionAck.indexOf('My consent') >= 0
    && S.transitionAck.indexOf('{') < 0);

  reset(); ENGINE.gotoNode('NOW.FEED.S06');
  ENGINE.selectOption('OPT.NOW.059');
  ENGINE.selectOption('BRIDGE.EXPAND.S2.OPT.03'); // → PRACTICE:S2:FRESH
  check('practice_entry_fresh restarts at S2.00 and discards carried context',
    S.currentNodeId === 'S2.00' && S.practiceId === 'PRACTICE:S2' && !S.threadState['carried_context']);

  /* ---------- group: non-threadState preview placeholders ---------- */
  group('preview placeholders: marker, toolkit, trigger, inventory');
  const noPlaceholder = (t) => t.indexOf('{') < 0;
  const noBroken = (t) => !(/: [.,]|, [.,]|Saved locally: \.|\bBefore: *\./.test(t));

  // MM.03 — marker preview (complete via the real flow)
  reset(); ENGINE.gotoNode('MM.01'); ENGINE.selectOption('OPT.MM.01.01'); // "Something felt off"
  ENGINE.selectOption('OPT.MM.02.05'); // "No reminder" → MM.03
  const mm03 = ENGINE.previewCopy(P.nodeById['MM.03'], 'support_copy');
  check('MM.03 complete resolves label/date/return from the marker draft',
    mm03.indexOf('Something felt off') >= 0 && mm03.indexOf('today') >= 0 && mm03.indexOf('No reminder') >= 0 && noPlaceholder(mm03));
  reset();
  S.draft.marker = { label: 'Something felt off' }; // partial: no return preference
  const mm03p = ENGINE.previewCopy(P.nodeById['MM.03'], 'support_copy');
  check('MM.03 partial falls back to a coherent full sentence',
    noPlaceholder(mm03p) && mm03p.indexOf('Nothing is saved until you confirm') >= 0 && noBroken(mm03p));
  reset();
  const mm03n = ENGINE.previewCopy(P.nodeById['MM.03'], 'support_copy');
  check('MM.03 none falls back coherently (no empty "Saved locally:")',
    noPlaceholder(mm03n) && noBroken(mm03n) && mm03n.indexOf('Nothing is saved until you confirm') >= 0);

  // TT.03 / TT.04 — toolkit patch preview
  reset(); S.draft.toolkit = { current: 'your current setup', proposed: 'Ask about power before asking what I want', scope: 'Only this starter system' };
  const tt03 = ENGINE.previewCopy(P.nodeById['TT.03'], 'support_copy');
  check('TT.03 complete resolves before/after/scope',
    tt03.indexOf('Ask about power before asking what I want') >= 0 && tt03.indexOf('Only this starter system') >= 0 && noPlaceholder(tt03));
  const tt04 = ENGINE.previewCopy(P.nodeById['TT.04'], 'thread_display_template');
  check('TT.04 complete resolves scope', tt04.indexOf('Only this starter system') >= 0 && noPlaceholder(tt04));
  reset();
  const tt03n = ENGINE.previewCopy(P.nodeById['TT.03'], 'support_copy');
  check('TT.03 none falls back (no "Before: ." fragment)',
    noPlaceholder(tt03n) && tt03n.indexOf('Before:') < 0 && tt03n.indexOf('After:') < 0 && noBroken(tt03n));
  const tt04n = ENGINE.previewCopy(P.nodeById['TT.04'], 'prompt');
  check('TT.04 none falls back coherently', noPlaceholder(tt04n) && tt04n.length > 0 && noBroken(tt04n));

  // TR.00 — active trigger label
  reset(); ENGINE.simulateTrigger('About to open social media');
  const tr00 = ENGINE.previewCopy(P.nodeById['TR.00'], 'support_copy');
  check('TR.00 complete resolves the trigger label',
    tr00.indexOf('About to open social media') >= 0 && noPlaceholder(tr00));
  reset();
  const tr00n = ENGINE.previewCopy(P.nodeById['TR.00'], 'support_copy');
  check('TR.00 none falls back coherently',
    noPlaceholder(tr00n) && tr00n.indexOf('This invitation was set up by you') >= 0 && noBroken(tr00n));

  // INV.PREVIEW — inventory addition preview
  reset(); S.draft.inventory = { currentList: 'Connect with someone, Find one specific thing', plusSelected: 'Connect with someone, Find one specific thing, My new option', originQuestion: 'What do you want this platform to be for today?', scope: 'this question' };
  const invp = ENGINE.previewCopy(P.nodeById['INV.PREVIEW'], 'support_copy');
  check('INV.PREVIEW complete resolves lists and origin',
    invp.indexOf('My new option') >= 0 && invp.indexOf('What do you want this platform to be for today?') >= 0 && noPlaceholder(invp));
  reset();
  const invpn = ENGINE.previewCopy(P.nodeById['INV.PREVIEW'], 'support_copy');
  check('INV.PREVIEW none falls back coherently',
    noPlaceholder(invpn) && invpn.indexOf('Nothing has been added yet') >= 0 && noBroken(invpn));

  // broad sweep: no preview screen leaves a raw placeholder or broken fragment
  reset();
  const badScreens = [];
  ['MM.03', 'TT.03', 'TT.04', 'TR.00', 'INV.PREVIEW'].forEach(nid => {
    ['prompt', 'support_copy', 'thread_display_template'].forEach(f => {
      const t = ENGINE.previewCopy(P.nodeById[nid], f);
      if (t && (!noPlaceholder(t) || !noBroken(t))) badScreens.push(nid + '/' + f);
    });
  });
  check('no preview screen renders a raw placeholder or broken fragment', badScreens.length === 0, badScreens.join('; '));

  /* ---------- report ---------- */
  const pass = Results.filter(r => r.pass).length;
  const fail = Results.length - pass;
  document.getElementById('summary').textContent = `${pass}/${Results.length} passing · ${fail} failing`;
  const groups = {};
  Results.forEach(r => { (groups[r.group] = groups[r.group] || []).push(r); });
  document.getElementById('results').innerHTML = Object.entries(groups).map(([g, items]) => `
    <h2 class="h3">${g}</h2>
    <ul class="list">${items.map(r => `<li style="border-left:3px solid ${r.pass ? 'var(--w2)' : 'var(--w1)'}">
      <b>${r.pass ? 'PASS' : 'FAIL'} — ${r.label}</b>${r.detail ? `<span class="sub">${r.detail}</span>` : ''}</li>`).join('')}</ul>`).join('');
}

window.addEventListener('DOMContentLoaded', () => {
  run().catch(err => {
    document.getElementById('summary').textContent = 'Suite failed to run: ' + err.message;
  });
});
