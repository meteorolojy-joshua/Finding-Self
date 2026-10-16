const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1150 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.setDefaultTimeout(8000);
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.locator('[data-tut="no"]').click();

  const info = await p.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const objs = [...document.querySelectorAll('.explore-preview .pv-obj')].map(box);
    const jersey = document.querySelector('.pv-magnet img');
    return { objs, jerseyTransform: jersey ? getComputedStyle(jersey).transform : null, jerseySrc: jersey ? jersey.src.split('/').pop() : null };
  });
  assert.equal(info.objs.length, 7, 'seven preview items');
  const heights = info.objs.map(o => Math.round(o.h));
  assert.ok(heights.every(h => h === heights[0]), `all same height: ${heights}`);
  const bottoms = info.objs.map(o => Math.round(o.y + o.h));
  assert.ok(bottoms.every(b => Math.abs(b - bottoms[0]) <= 1), `bottoms aligned: ${bottoms}`);
  const gaps = [];
  const sorted = [...info.objs].sort((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i++) gaps.push(Math.round(sorted[i].x - (sorted[i - 1].x + sorted[i - 1].w)));
  assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 2, `even gaps: ${gaps}`);
  assert.equal(info.jerseySrc, 'jersey-new.png', 'magnet slot shows the jersey');
  assert.ok(info.jerseyTransform === 'none' || info.jerseyTransform === '', `jersey upright, transform=${info.jerseyTransform}`);
  assert.deepEqual(errors, []);
  await p.screenshot({ path: '/tmp/home-uniform-row.png', fullPage: true });
  // zoom into the preview section for J
  const pv = await p.locator('.explore-preview').boundingBox();
  await p.screenshot({ path: '/tmp/home-uniform-row-zoom.png', clip: { x: pv.x, y: Math.max(0, pv.y - 40), width: pv.width, height: pv.height + 80 } });
  console.log(`PASS: 7 items at ${heights[0]}px, bottoms aligned, gaps ${gaps}, jersey upright`);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
