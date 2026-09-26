const fs = require('fs'), path = require('path');
const store = new Map();
globalThis.localStorage = { get length(){ return store.size; }, getItem: k => store.has(k) ? store.get(k) : null, setItem: (k,v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
globalThis.window = globalThis;
globalThis.document = { getElementById: () => ({ innerHTML: '' }) };
globalThis.addEventListener = () => {};
globalThis.UI = { render: () => {}, renderHome: () => {}, renderTerminal: () => {}, renderExternalTerminal: () => {}, renderPrimitiveTerminal: () => {}, renderOnboardingResult: () => {}, updateInspector: () => {} };
globalThis.fetch = async (u) => ({ ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), String(u).replace('../content-package', 'content-package')), 'utf8')) });
const engineS = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
const testsS = fs.readFileSync(path.join(__dirname, 'tests.js'), 'utf8');
try { eval(engineS + ";\n" + testsS + "\n;run().then(() => { const pass = Results.filter(r=>r.pass).length; console.log('SUMMARY ' + pass + '/' + Results.length); Results.filter(r=>!r.pass).forEach(r=>console.log('FAIL: ' + r.label)); });"); } catch(e) { console.log('PARSE: ' + e.message); }