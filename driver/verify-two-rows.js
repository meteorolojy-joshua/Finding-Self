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
    const scene = box(document.querySelector('.explore-preview .pv-scene'));
    const btn = box(document.querySelector('.explore-preview'));
    return {
      rowCount: rows.length,
      rowItems: rows.map(r => [...r.querySelectorAll('.pv-obj')].map(o => o.className.match(/pv-(plant|torch|magnet|book|pair|circle|shovel)/)[1])),
      rowBoxes: rows.map(r => box(r)),
      itemHeights: [...document.querySelectorAll('.explore-preview .pv-obj')].map(o => Math.round(box(o).h)),
      scene, btn,
      zoom: getComputedStyle(document.querySelector('.explore-preview .pv-scene')).zoom
    };
  });
  assert.equal(info.rowCount, 2, 'two rows');
  assert.deepEqual(info.rowItems[0], ['plant', 'torch', 'magnet', 'book'], 'row 1 grouping');
  assert.deepEqual(info.rowItems[1], ['pair', 'circle', 'shovel'], 'row 2 grouping');
  assert.ok(info.itemHeights.every(h => h === info.itemHeights[0]), `uniform heights: ${info.itemHeights}`);
  assert.ok(Math.abs(info.itemHeights[0] - 44) <= 1, `10% larger (44px): got ${info.itemHeights[0]}`);
  const [r1, r2] = info.rowBoxes;
  assert.ok(r2.y > r1.y + r1.h, 'rows do not overlap');
  // scene horizontally centered within the preview button
  const sceneCx = info.scene.x + info.scene.w / 2, btnCx = info.btn.x + info.btn.w / 2;
  assert.ok(Math.abs(sceneCx - btnCx) < 4, 'scene centered');
  assert.equal(info.zoom, '1.1', 'unit scaled 1.1');
  assert.deepEqual(errors, []);
  const pv = await p.locator('.explore-preview').boundingBox();
  await p.screenshot({ path: '/tmp/home-two-rows.png', clip: { x: pv.x, y: Math.max(0, pv.y - 40), width: pv.width, height: pv.height + 80 } });
  console.log(`PASS: 2 rows (4+3), items ${info.itemHeights[0]}px, centered, zoom 1.1`);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
