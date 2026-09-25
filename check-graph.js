/* Graph integrity check: every option destination must resolve to a node id,
   destination id, or known engine handler. Run: node check-graph.js */
const fs = require('fs');
const CP = '/home/hatch/workspace/finding-self/content-package/prototype-ready-vertical-slice-v0.6/';
const J = f => JSON.parse(fs.readFileSync(CP + f, 'utf8')).records;

const nodes = new Set(J('nodes.json').map(n => n.id));
const dests = new Map(J('destinations.json').map(d => [d.id, d]));
const options = J('options.json');

// handlers known in engine.js Handlers map (keep in sync manually)
const HANDLERS = new Set([
  'HANDLER.PRACTICE.ORIGINAL.ENTRY','HANDLER.S1.AFTER.11','HANDLER.S2.AFTER.R1A',
  'HANDLER.DISCARD.VOLATILE.RUN.CONTEXT.COMPLETION'
]);
const engineSrc = fs.readFileSync('/home/hatch/workspace/finding-self/app/engine.js', 'utf8');
// collect handler keys defined in Handlers map: '<id>': or "<id>":
const defined = new Set([...engineSrc.matchAll(/^\s*['"]([A-Z0-9_.:$-]+)['"]\s*:/gm)].map(m => m[1]));

let bad = 0;
for (const o of options) {
  const dest = o.destination;
  if (!dest) { console.log('NO DEST:', o.id); bad++; continue; }
  if (nodes.has(dest) || dests.has(dest) || HANDLERS.has(dest) || defined.has(dest)) continue;
  // EXIT / HOME / terminals handled in code
  if (/^(EXIT|HOME|MOMENTS|PRACTICE\.LIBRARY)/.test(dest)) continue;
  console.log('DANGLING:', o.id, 'node:', o.node_id, '->', dest);
  bad++;
}
// destination next_node references
for (const [id, d] of dests) {
  const nn = d.next_node;
  if (nn && !nodes.has(nn)) { console.log('DANGLING next_node:', id, '->', nn); bad++; }
}
console.log(bad ? `\n${bad} problem(s)` : '\nOK: all destinations resolve');
process.exit(bad ? 1 : 0);
