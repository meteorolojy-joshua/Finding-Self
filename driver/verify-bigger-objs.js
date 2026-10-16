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
  await p.waitForTimeout(600);

  const info = await p.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const rows = [...document.querySelectorAll('.explore-preview .pv-row')];
    const items = [...document.querySelectorAll('.explore-preview .pv-obj')];
    const minGap = rows.map(r => {
      const bs = [...r.querySelectorAll('.pv-obj')].map(box).sort((a, b) => a.x - b.x);
      let m = Infinity;
      for (let i = 1; i < bs.length; i++) m = Math.min(m, bs[i].x - (bs[i - 1].x + bs[i - 1].w));
      return Math.round(m);
    });
    return {
      heights: items.map(o => Math.round(box(o).h * 10) / 10),
      minGap,
      rowGap: (() => { const a = box(rows[0]), b = box(rows[1]); return Math.round((b.y - (a.y + a.h)) * 10) / 10; })(),
      centers: items.map(o => { const r = box(o); return Math.round((r.x + r.w / 2) * 10) / 10; })
    };
  });
  assert.ok(info.heights.every(h => Math.abs(h - 52.8) < 1.5), `20% bigger (52.8px): ${info.heights}`);
  assert.ok(info.minGap.every(g => g > 0), `no overlap, min visual gaps: ${info.minGap}`);
  assert.deepEqual(errors, []);
  const pv = await p.locator('.explore-preview').boundingBox();
  await p.screenshot({ path: '/tmp/home-bigger-objs.png', clip: { x: pv.x, y: Math.max(0, pv.y - 40), width: pv.width, height: pv.height + 80 } });
  console.log(`PASS: items ~${info.heights[0]}px, min gaps ${info.minGap}, row gap ${info.rowGap}px`);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
