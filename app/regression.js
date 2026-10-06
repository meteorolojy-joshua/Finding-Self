/* Regression + whole-path verifier for the v0.4 package.
   Drives ENGINE against regression_cases.json and whole_path_verification.json. */
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

async function loadJSON(rel) {
  const res = await fetch(BASE + '/' + rel);
  return res.json();
}

function effectiveTarget(destId) {
  if (E.PKG.nodeById[destId]) return destId;
  const d = E.PKG.destById[destId];
  if (!d) return null;
  if (d.next_node) return d.next_node;
  return null;
}

async function runRegressionCases(cases) {
  const results = [];
  for (const c of cases) {
    E.newRun();
    E.gotoNode(c.start);
    const visited = [c.start];
    const dests = [];
    for (const sel of c.selections) {
      const opt = (E.visibleOptions(E.Session.currentNodeId) || []).find(o => o.id === sel);
      if (opt) dests.push(opt.destination);
      E.selectOption(sel);
      if (E.Session.pendingCustom) E.confirmCustomInput('regression words');
      visited.push(E.Session.currentNodeId);
    }
    let ok = JSON.stringify(visited) === JSON.stringify(c.expected_sequence);
    let detail = '';
    if (c.expected_destination_prefix && dests.length) {
      const firstOk = dests[0].startsWith(c.expected_destination_prefix);
      if (!firstOk) { ok = false; detail += 'dest-prefix-mismatch(' + dests[0] + ') '; }
    }
    if (c.expected_destinations) {
      const want = c.expected_destinations;
      const haveOk = want.every(w => dests.includes(w));
      if (!haveOk) { ok = false; detail += 'dests-mismatch(' + dests.join(',') + ') '; }
    }
    results.push({ id: c.id, pass: ok, visited, expected: c.expected_sequence, detail });
  }
  return results;
}

async function runPaths(paths) {
  const results = [];
  for (const p of paths) {
    E.newRun();
    E.gotoNode(p.visited[0]);
    const got = [p.visited[0]];
    for (let i = 1; i < p.visited.length; i++) {
      const target = p.visited[i];
      if (target === 'TERMINAL') {
        const opts = E.visibleOptions(E.Session.currentNodeId) || [];
        const o = opts.find(o =>
          o.destination === 'EXIT' || o.destination === 'EXIT:Destination' ||
          (E.PKG.destById[o.destination] && (E.PKG.destById[o.destination].terminal === true || E.PKG.destById[o.destination].handler === 'defined_external')));
        if (o) E.selectOption(o.id);
        got.push('TERMINAL');
        break;
      }
      const opts = E.visibleOptions(E.Session.currentNodeId) || [];
      const o = opts.find(o => effectiveTarget(o.destination) === target || o.destination === target);
      if (!o) { got.push('(MISSING:' + target + ')'); break; }
      E.selectOption(o.id);
      if (E.Session.pendingCustom) E.confirmCustomInput('path words');
      got.push(E.Session.currentNodeId);
    }
    const ok = JSON.stringify(got) === JSON.stringify(p.visited);
    results.push({ id: p.id, pass: ok, visited: got, expected: p.visited });
  }
  return results;
}

(async () => {
  await E.loadPackage();
  const regCases = (await loadJSON('regression_cases.json')).records;
  const paths = (await loadJSON('whole_path_verification.json')).path_results;

  const r1 = await runRegressionCases(regCases);
  const r2 = await runPaths(paths);

  let pass = 0, fail = 0;
  console.log('=== regression_cases.json (' + r1.length + ') ===');
  r1.forEach(r => {
    r.pass ? pass++ : fail++;
    console.log((r.pass ? 'PASS' : 'FAIL') + ' ' + r.id + (r.pass ? '' : ' | got=' + JSON.stringify(r.visited) + ' want=' + JSON.stringify(r.expected) + ' ' + r.detail));
  });
  console.log('=== whole_path_verification.json (' + r2.length + ') ===');
  r2.forEach(r => {
    r.pass ? pass++ : fail++;
    if (!r.pass) console.log('FAIL ' + r.id + ' | got=' + JSON.stringify(r.visited) + ' want=' + JSON.stringify(r.expected));
  });
  console.log('RESULT ' + pass + '/' + (pass + fail) + ' passing');
})().catch(e => { console.log('ERROR: ' + e.stack); });
