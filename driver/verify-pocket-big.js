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
  const info = await p.evaluate(() => {
    const b = document.querySelector('.pocket-btn').getBoundingClientRect();
    const bar = document.querySelector('.app-bar').getBoundingClientRect();
    return { btnW: Math.round(b.width), btnH: Math.round(b.height), barH: Math.round(bar.height),
             fits: b.y >= bar.y - 1 && (b.y + b.height) <= (bar.y + bar.height) + 1 };
  });
  assert.equal(info.btnW, 57, `button 57px wide: ${info.btnW}`);
  assert.equal(info.btnH, 57, `button 57px tall: ${info.btnH}`);
  assert.ok(info.fits, `button fits inside the bar (bar ${info.barH}px)`);
  assert.deepEqual(errors, []);
  const b = await p.locator('.pocket-btn').boundingBox();
  await p.screenshot({ path: '/tmp/pocket-big.png', clip: { x: b.x - 80, y: Math.max(0, b.y - 50), width: b.width + 160, height: b.height + 100 } });
  console.log(`PASS: pocket 57x57, bar ${info.barH}px, fits: ${info.fits}`);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
