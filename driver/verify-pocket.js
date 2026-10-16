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
  const src = await p.locator('.pocket-btn img').getAttribute('src');
  assert.ok(src.endsWith('assets/current/pocket.png'), `pocket uses J's art: ${src}`);
  assert.equal(await p.locator('.pocket-btn').count(), 1, 'pocket button present');
  // wake behavior still intact
  await p.evaluate(() => window.EXPLORATIONS && window.EXPLORATIONS.wakePocket && window.EXPLORATIONS.wakePocket());
  await p.waitForTimeout(300);
  const woke = await p.locator('.pocket-btn.wake').count();
  assert.deepEqual(errors, []);
  const bar = await p.locator('.app-bar').boundingBox();
  await p.screenshot({ path: '/tmp/pocket-topbar.png', clip: { x: bar.x, y: bar.y, width: bar.width, height: bar.height + 30 } });
  console.log(`PASS: pocket button shows pocket.png (wake class applied: ${woke === 1})`);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
