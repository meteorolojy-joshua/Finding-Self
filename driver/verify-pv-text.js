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
  await p.waitForTimeout(500);
  assert.equal(await p.locator('.pv-title').textContent(), 'Objects To Hold A Piece Of Yourself');
  assert.equal(await p.locator('.pv-support').textContent(), 'Use these objects as stores and reminders of pieces of yourself - your feelings, plans, and everything in between');
  assert.deepEqual(errors, []);
  const pv = await p.locator('.explore-preview').boundingBox();
  await p.screenshot({ path: '/tmp/home-new-text.png', clip: { x: pv.x, y: Math.max(0, pv.y - 40), width: pv.width, height: pv.height + 80 } });
  console.log('PASS: new title + subtext, no page errors');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
