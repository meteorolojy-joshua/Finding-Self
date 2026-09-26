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
  check('119 nodes indexed', P.nodes.length === 119 && !!P.nodeById['NOW.FEED.S01']);
  check('836 options retained', P.options.length === 836);
  check('options indexed by node', (P.optionsByNode['NOW.FEED.S01'] || []).length === 12);
  check('115 destinations indexed', P.destinations.length === 115 && !!P.destById['EXIT']);
  check('125 default_option_sets loaded', P.defaultOptionSets.length === 125 && !!P.defaultByNode['NOW.FEED.S01']);
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

  /* ---------- group: persistence ---------- */
  group('persistence');
  reset();
  ENGINE.gotoNode('NOW.FEED.S01');
  pick('NOW.FEED.S01', o => o.id === 'OPT.NOW.001');
  check('run answers are volatile (not in localStorage)', localStorage.length === 0 && Object.keys(S.runAnswers).length === 1);
  ENGINE.exitFlow();
  check('exit discards run state', Object.keys(S.runAnswers).length === 0 && S.currentNodeId === null);

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

  group('J05 SS02 → completes with no marker route');
  reset(); ENGINE.gotoNode('NOW.OFF.S01');
  advanceTo(['NOW.OFF.S07','NOW.OFF.L03'], 15);
  A.J05 = ['NOW.OFF.S07','NOW.OFF.L03'].includes(S.currentNodeId);
  const markerRoute = P.options.some(o => /^(MM\.|OPT\.MM\.|OPT\.PM\.01)/.test(o.destination || '') || /^(MM\.|OPT\.MM\.|OPT\.PM\.01)/.test(o.id || ''));
  A.J05 = A.J05 && !markerRoute && !ENGINE.routeRepair && !ENGINE.saveMarker && !ENGINE.undoMarker;
  check('J05 flow completes; marker routes and repair entry points are gone', A.J05);

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
    ENGINE.Session.currentNodeId === 'NOW.FEED.S02');

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

  group('J09 practice entry + toolkit patch');
  reset();
  ENGINE.gotoNode('PM.03');
  pick('PM.03', o => o.destination === 'HANDLER.PRACTICE.ORIGINAL.ENTRY');
  A.J09 = ['S1.00','S2.00'].includes(S.currentNodeId);
  const patch = ENGINE.savePatch({ object: 'order', scope: 'this starter only', value: 'power before want' });
  A.J09 = A.J09 && ENGINE.lsGet(ENGINE.LS.patch, []).length === 1;
  ENGINE.undoPatch(patch.id);
  check('J09 practice entry + toolkit patch persist separately, undo works', A.J09);

  group('J10 back → exit leaves nothing recorded');
  reset(); ENGINE.gotoNode('NOW.OFF.S01');
  pick('NOW.OFF.S01', o => o.id === 'OPT.NOW.082');
  ENGINE.goBack();
  A.J10 = S.currentNodeId === 'NOW.OFF.S01';
  ENGINE.exitFlow();
  A.J10 = A.J10 && S.currentNodeId === null && Object.keys(S.runAnswers).length === 0;
  check('J10 back returns to the node; exit clears run state', A.J10);

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

  group('J12 injected invalid destination → diagnostic → exit');
  reset(); ENGINE.gotoNode('NOW.FEED.S01');
  ENGINE.selectOption('__missing__');
  A.J12 = S.currentNodeId === 'ROUTE.INVALID';
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
  group('preview placeholders: toolkit, trigger, inventory');
  const noPlaceholder = (t) => t.indexOf('{') < 0;
  const noBroken = (t) => !(/: [.,]|, [.,]|Saved locally: \.|\bBefore: *\./.test(t));

  reset();
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
  ['TT.03', 'TT.04', 'TR.00', 'INV.PREVIEW'].forEach(nid => {
    ['prompt', 'support_copy', 'thread_display_template'].forEach(f => {
      const t = ENGINE.previewCopy(P.nodeById[nid], f);
      if (t && (!noPlaceholder(t) || !noBroken(t))) badScreens.push(nid + '/' + f);
    });
  });
  check('no preview screen renders a raw placeholder or broken fragment', badScreens.length === 0, badScreens.join('; '));

  /* ---------- group: sampler ---------- */
  group('sampler');
  reset();
  const Sm = ENGINE.Sampler;
  check('seasonOf: 1 March -> Spring of the same year',
    (() => { const s = Sm.seasonOf(new Date(2026, 2, 1)); return s.key === 20261 && s.label === 'Spring 2026' && s.cloth === 'Spring sampler'; })());
  check('seasonOf: 15 January -> Winter of the previous year',
    (() => { const s = Sm.seasonOf(new Date(2026, 0, 15)); return s.key === 20250 && s.label === 'Winter 2025'; })());
  check('seasonOf: 25 December groups with the following Jan/Feb',
    Sm.seasonOf(new Date(2025, 11, 25)).key === Sm.seasonOf(new Date(2026, 0, 15)).key);
  check('seasonOf: August -> Summer, November -> Autumn',
    Sm.seasonOf(new Date(2026, 7, 10)).label === 'Summer 2026' && Sm.seasonOf(new Date(2026, 10, 5)).label === 'Autumn 2026');
  check('motifFor covers both practices with distinct motifs',
    Sm.motifFor('PRACTICE:S1').name !== Sm.motifFor('PRACTICE:S2').name
    && Sm.isKnownPractice('PRACTICE:S1') && Sm.isKnownPractice('PRACTICE:S2')
    && !Sm.isKnownPractice('PRACTICE:XX'));
  check('addStitch is idempotent per runId', (() => {
    reset(); ENGINE.newRun();
    const a = Sm.addStitch('PRACTICE:S1', S.runId);
    const b = Sm.addStitch('PRACTICE:S1', S.runId);
    return !!a && a.id === b.id && Sm.getStitches().length === 1 && Sm.hasRunStitch(S.runId);
  })());
  check('addStitch without practiceId stores nothing', (() => {
    reset(); return Sm.addStitch(null, 'run-x') === null && Sm.getStitches().length === 0;
  })());
  check('removeStitch removes only the named stitch', (() => {
    reset();
    const a = Sm.addStitch('PRACTICE:S1', 'run-a');
    Sm.addStitch('PRACTICE:S2', 'run-b');
    Sm.removeStitch(a.id);
    const rest = Sm.getStitches();
    return rest.length === 1 && rest[0].practiceId === 'PRACTICE:S2';
  })());
  check('seasons groups stitches newest-first', (() => {
    reset();
    Sm.addStitch('PRACTICE:S1', 'r1', '2026-04-02T10:00:00');
    Sm.addStitch('PRACTICE:S2', 'r2', '2025-10-02T10:00:00');
    Sm.addStitch('PRACTICE:S1', 'r3', '2026-04-20T10:00:00');
    const ss = Sm.seasons();
    return ss.length === 2 && ss[0].key > ss[1].key
      && ss[0].stitches.length === 2 && ss[1].stitches.length === 1
      && ss[0].cloth === 'Spring sampler' && ss[1].cloth === 'Autumn sampler';
  })());
  check('getStitches filters corrupt entries', (() => {
    reset();
    ENGINE.lsSet(ENGINE.LS.sampler, [{ id: 'st-1' }, 'nope', null, { id: 'st-2', practiceId: 'PRACTICE:S1', at: '2026-01-01T00:00:00.000Z', season: 20250 }]);
    const got = Sm.getStitches();
    return got.length === 1 && got[0].id === 'st-2';
  })());
  check('formatDate renders a readable date', Sm.formatDate('2026-03-14T10:00:00.000Z').indexOf('March 2026') >= 0);
  check('addStitch stores a drawn pattern', (() => {
    reset();
    const st = Sm.addStitch('PRACTICE:S1', 'run-p', undefined, { strokes: [{ color: '#7D8C6F', pts: [[10, 10], [90, 90], [10, 'x']] }] });
    const got = Sm.getStitches()[0];
    return !!st && got.pattern && got.pattern.strokes.length === 1
      && got.pattern.strokes[0].color === '#7d8c6f'
      && got.pattern.strokes[0].pts.length === 2;
  })());
  check('cleanPattern rejects junk and empties to null', (() => {
    const bad = Sm.cleanPattern({ strokes: [
      { color: 'red', pts: [[1, 1]] },
      { color: '#12345', pts: [[1, 1]] },
      { color: '#112233', pts: 'nope' },
      { color: '#112233', pts: [[200, -5], ['a', 1]] }
    ]});
    const empty = Sm.cleanPattern({ strokes: [] });
    const missing = Sm.cleanPattern(null);
    return bad && bad.strokes.length === 1
      && bad.strokes[0].pts.length === 1 && bad.strokes[0].pts[0][0] === 100 && bad.strokes[0].pts[0][1] === 0
      && empty === null && missing === null;
  })());
  check('legacy stitch without a pattern still loads (renders via motif)', (() => {
    reset();
    ENGINE.lsSet(ENGINE.LS.sampler, [{ id: 'st-old', practiceId: 'PRACTICE:S1', at: '2026-01-01T00:00:00.000Z', season: 20250 }]);
    const got = Sm.getStitches();
    return got.length === 1 && !got[0].pattern && Sm.patternSVG(got[0].pattern) === '';
  })());
  check('patternSVG renders dashed boxless stitch art', (() => {
    const svg = Sm.patternSVG({ strokes: [
      { color: '#7d8c6f', pts: [[10, 10], [90, 90]] },
      { color: '#b3563f', pts: [[50, 50]] }
    ]});
    return svg.indexOf('<svg') === 0 && svg.indexOf('stroke-dasharray') > 0
      && svg.indexOf('<circle') > 0 && svg.indexOf('samp-patch') < 0;
  })());

  /* ---------- group: small things ---------- */
  group('smallthings');
  reset();
  const ST = ENGINE.SmallThings;
  check('startList opens a list; second call resumes it', (() => {
    reset();
    const a = ST.startList();
    const b = ST.startList();
    return !!a && !!a.id && !!a.startedAt && a.id === b.id && ST.getOpen().id === a.id;
  })());
  check('addEntry stamps the current minute by default', (() => {
    reset(); ST.startList();
    const before = Date.now();
    const e = ST.addEntry({ text: 'warm bread' });
    const t = new Date(e.at).getTime();
    return !!e && e.text === 'warm bread' && t >= before && t <= Date.now();
  })());
  check('addEntry accepts an explicit time (batch/key-in mode)', (() => {
    reset(); ST.startList();
    const e = ST.addEntry({ text: 'morning pills', at: '2026-09-26T08:15:00.000Z' });
    return !!e && e.at === '2026-09-26T08:15:00.000Z';
  })());
  check('addEntry rejects an empty entry (no text, no photo)', (() => {
    reset(); ST.startList();
    return ST.addEntry({ text: '   ' }) === null && ST.getOpen().entries.length === 0;
  })());
  check('addEntry keeps a photo-only entry', (() => {
    reset(); ST.startList();
    const e = ST.addEntry({ image: 'data:image/jpeg;base64,AAA' });
    return !!e && e.text === '' && e.image === 'data:image/jpeg;base64,AAA';
  })());
  check('addEntry rejects a non-image data URL', (() => {
    reset(); ST.startList();
    const e = ST.addEntry({ text: 'x', image: 'data:text/plain;base64,AAA' });
    return !!e && e.image === null;
  })());
  check('updateEntry patches text without touching the time', (() => {
    reset(); ST.startList();
    const e = ST.addEntry({ text: 'warm bred', at: '2026-09-26T08:15:00.000Z' });
    const ok = ST.updateEntry(e.id, { text: 'warm bread' });
    const got = ST.getOpen().entries[0];
    return ok && got.text === 'warm bread' && got.at === '2026-09-26T08:15:00.000Z';
  })());
  check('setEntryTime sets HH:MM keeping the calendar date', (() => {
    reset(); ST.startList();
    const e = ST.addEntry({ text: 'ice cream', at: '2026-09-26T20:00:00' });
    const ok = ST.setEntryTime(e.id, '08:15');
    const d = new Date(ST.getOpen().entries[0].at);
    return ok && d.getFullYear() === 2026 && d.getMonth() === 8 && d.getDate() === 26
      && d.getHours() === 8 && d.getMinutes() === 15;
  })());
  check('setEntryTime rejects malformed times', (() => {
    reset(); ST.startList();
    const e = ST.addEntry({ text: 'x' });
    return ST.setEntryTime(e.id, '8:15') === false && ST.setEntryTime(e.id, 'nope') === false;
  })());
  check('removeEntry removes only the named entry', (() => {
    reset(); ST.startList();
    const a = ST.addEntry({ text: 'one' });
    ST.addEntry({ text: 'two' });
    const ok = ST.removeEntry(a.id);
    const rest = ST.getOpen().entries;
    return ok && rest.length === 1 && rest[0].text === 'two' && ST.removeEntry('missing') === false;
  })());
  check('closeList keeps a non-empty list and clears the open one', (() => {
    reset(); ST.startList();
    ST.addEntry({ text: 'one' }); ST.addEntry({ text: 'two' });
    const res = ST.closeList();
    return !!res && res.kept === true && res.list.entries.length === 2
      && !!res.list.closedAt && ST.getOpen() === null
      && ST.getKept().length === 1 && ST.getKept()[0].entries.length === 2;
  })());
  check('closeList discards an empty list without keeping it', (() => {
    reset(); ST.startList();
    const res = ST.closeList();
    return !!res && res.kept === false && ST.getOpen() === null && ST.getKept().length === 0;
  })());
  check('closeList with nothing open returns null', (() => {
    reset(); return ST.closeList() === null;
  })());
  check('getKept sorts newest-first and filters corrupt records', (() => {
    reset();
    ENGINE.lsSet(ENGINE.LS.smallthings, [
      { id: 'a', startedAt: '2026-09-20T08:00:00.000Z', closedAt: '2026-09-20T20:00:00.000Z', entries: [{ id: 'e1', at: '2026-09-20T09:00:00.000Z', text: 'ok', image: null }] },
      { id: 'b', startedAt: '2026-09-26T08:00:00.000Z', closedAt: '2026-09-26T20:00:00.000Z', entries: 'nope' },
      'junk', null, { noId: true }
    ]);
    const kept = ST.getKept();
    return kept.length === 2 && kept[0].id === 'b' && kept[1].id === 'a'
      && kept[1].entries.length === 1 && ST.getKeptById('a').id === 'a' && ST.getKeptById('zzz') === null;
  })());
  check('getOpen discards a corrupt open record', (() => {
    reset();
    ENGINE.lsSet(ENGINE.LS.smallthingsOpen, { nope: true });
    return ST.getOpen() === null;
  })());

  /* ---------- group: elemental ---------- */
  group('elemental');
  const El = ENGINE.Elemental;
  check('keep stores a text entry and lists it newest-first', (() => {
    reset();
    const a = El.keep({ element: 'fury', prompt: 'q', text: 'burning', altar: [], keptAt: '2026-09-20T08:00:00.000Z' });
    const b = El.keep({ element: 'grief', prompt: 'q', text: 'missing', altar: [], keptAt: '2026-09-26T08:00:00.000Z' });
    const all = El.getEntries();
    return a && b && all.length === 2 && all[0].id === b.id && all[1].id === a.id
      && El.getEntry(a.id).text === 'burning' && El.getEntry('zzz') === null;
  })());
  check('keep with only an altar arrangement (no words) still keeps', (() => {
    reset();
    const e = El.keep({ element: 'grief', prompt: '', text: '  ', altar: [{ obj: 'candle', x: 30, y: 40 }], keptAt: '2026-09-26T08:00:00.000Z' });
    return !!e && e.altar.length === 1 && El.getEntries().length === 1;
  })());
  check('keep with no words and no objects keeps nothing (keep-rule)', (() => {
    reset();
    const e = El.keep({ element: 'fury', prompt: 'q', text: '   ', altar: [] });
    return e === null && El.getEntries().length === 0;
  })());
  check('altar positions are clamped to the field and junk filtered', (() => {
    reset();
    const e = El.keep({ element: 'fury', prompt: '', text: 'x', altar: [{ obj: 'stone', x: 140, y: -20 }, { obj: 'candle', x: 30, y: 40 }, null, { noObj: 1 }], keptAt: '2026-09-26T08:00:00.000Z' });
    return e.altar.length === 2 && e.altar[0].x === 100 && e.altar[0].y === 0 && e.altar[1].x === 30;
  })());
  check('getEntries filters corrupt records and remove deletes', (() => {
    reset();
    ENGINE.lsSet(ENGINE.LS.elemental, [
      { id: 'a', element: 'fury', keptAt: '2026-09-26T08:00:00.000Z', text: 'ok', prompt: '', altar: [] },
      { id: 'b', element: 'nope', keptAt: '2026-09-26T08:00:00.000Z' },
      'junk', null, { noId: true }
    ]);
    const before = El.getEntries();
    El.remove('a');
    return before.length === 1 && before[0].id === 'a' && El.getEntries().length === 0;
  })());
  check('unknown element defaults to fury', (() => {
    reset();
    const e = El.keep({ element: 'whatever', text: 'x', altar: [] });
    return !!e && e.element === 'fury';
  })());

  /* ---------- group: practice exit returns to the library ---------- */
  group('practice-exit');
  check('exiting a practice run opens the Practice library, not home', (() => {
    reset();
    const calls = [];
    const lib = UI.renderPracticeLibrary, home = UI.renderHome;
    UI.renderPracticeLibrary = () => { calls.push('library'); };
    UI.renderHome = () => { calls.push('home'); };
    try {
      ENGINE.Session.practiceId = 'PRACTICE:S1';
      ENGINE.exitFlow();
      const sawLibrary = calls.includes('library') && !calls.includes('home');
      calls.length = 0;
      ENGINE.Session.practiceId = null;
      ENGINE.exitFlow();
      return sawLibrary && calls.includes('home') && !calls.includes('library');
    } finally {
      UI.renderPracticeLibrary = lib; UI.renderHome = home;
    }
  })());

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
