/* v0.6 question-clarity verifier.
   Confirms the plain-language wording integration: audit rows match their
   runtime/inventory/onboarding records, counts are unchanged, and the two
   required before/after wording facts hold. */
'use strict';
const fs = require('fs'), path = require('path');
const store = new Map();
globalThis.localStorage = { get length(){ return store.size; }, getItem: k => store.has(k) ? store.get(k) : null, setItem: (k,v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
globalThis.window = globalThis;
globalThis.document = { getElementById: () => ({ innerHTML: '' }) };
globalThis.addEventListener = () => {};
globalThis.UI = { render: () => {}, renderHome: () => {}, renderTerminal: () => {}, renderExternalTerminal: () => {}, renderPrimitiveTerminal: () => {}, renderOnboardingResult: () => {}, updateInspector: () => {} };
globalThis.fetch = async (u) => ({ ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), String(u).replace('../content-package', 'content-package')), 'utf8')) });

const engineS = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
eval(engineS);
const E = window.ENGINE;
const BASE = '../content-package/prototype-ready-vertical-slice-v0.6';

let pass = 0, fail = 0;
const failures = [];
function check(label, cond, detail) {
  if (cond) pass++; else { fail++; failures.push((detail ? detail + ' — ' : '') + label); }
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + label + (cond ? '' : ' :: ' + detail));
}

(async () => {
  await E.loadPackage();
  const P = E.PKG;

  // counts unchanged
  check('128 routed nodes', P.nodes.length === 128);
  check('890 options', P.options.length === 890);
  check('129 destinations', P.destinations.length === 129);
  check('128 default-option sets', P.defaultOptionSets.length === 128 && !!P.defaultByNode['NOW.FEED.S01']);

  // required wording facts
  const s05 = P.nodeById['NOW.UNCLEAR.S05'];
  check('NOW.UNCLEAR.S05 shows revised wording',
    s05 && s05.prompt === 'Even though you are unsure, what would you like to do for now?', s05 && s05.prompt);
  const stale = [];
  P.nodes.forEach(n => ['prompt', 'support_copy', 'thread_display_template'].forEach(f => {
    if (n[f] && /can uncertainty decide/i.test(n[f])) stale.push(n.id + '/' + f);
  }));
  check('"What can uncertainty decide for now?" no longer appears', stale.length === 0, stale.join('; '));

  // load audit + inventory_questions + onboarding for the consistency check
  const loadJSON = async (rel) => (await fetch(BASE + '/' + rel)).json();
  const audit = await loadJSON('question_clarity_audit.json');
  const iq = await loadJSON('inventory_questions.json');
  const iqRecs = iq.records !== undefined ? iq.records : iq;
  const iqById = {}; iqRecs.forEach(q => { iqById[q.id] = q; });
  const ob = P.onboarding; // loaded into PKG
  const auditRecs = audit.records !== undefined ? audit.records : audit;

  check('178 clarity revisions', auditRecs.length === 178, String(auditRecs.length));
  const reviewed = P.nodes.length + iqRecs.length + new Set(ob.map(o => o.question_id)).size;
  check('323 question records reviewed (128 + 189 + 6)', reviewed === 323, String(reviewed));

  let rowFail = 0;
  auditRecs.forEach(r => {
    let match = false;
    if (r.surface === 'ROUTED_SCREEN') {
      const n = P.nodeById[r.record_id];
      match = !!(n && n.prompt === r.revised_question);
    } else if (r.surface === 'QUESTION_INVENTORY') {
      const q = iqById[r.record_id];
      match = !!(q && q.question === r.revised_question);
    } else if (r.surface === 'ONBOARDING') {
      const q = ob.find(o => o.question_id === r.record_id);
      match = !!(q && q.question === r.revised_question);
    }
    if (!match) { rowFail++; failures.push(r.id + ' ' + r.record_id + ' does not match record'); }
    if (r.routes_or_answers_changed !== false) { rowFail++; failures.push(r.id + ' reports routes/answers changed'); }
  });
  check('every audit row matches its runtime/inventory/onboarding record (and no route/answer changes)', rowFail === 0, rowFail + ' mismatches');

  // interpolated prompts carry revised wording without raw placeholders
  E.newRun(); E.gotoNode('NOW.FEED.S01'); E.selectOption('OPT.NOW.001'); // purpose = "Find one specific thing"
  const tpl = E.previewCopy(P.nodeById['NOW.FEED.S02'], 'thread_display_template');
  check('interpolated prompt shows revised wording with no raw placeholder',
    tpl.indexOf('Find one specific thing') >= 0 && tpl.indexOf('What is this platform likely to pull') >= 0 && tpl.indexOf('{') < 0, tpl);

  console.log('RESULT ' + pass + '/' + (pass + fail) + ' passing');
  if (failures.length) { console.log('--- failures ---'); failures.forEach(f => console.log('  ' + f)); }
})().catch(e => { console.log('ERROR: ' + e.stack); });
