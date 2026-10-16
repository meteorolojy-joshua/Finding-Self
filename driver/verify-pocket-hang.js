const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1150 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.setDefaultTimeout(8000);
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(400);
  const info = await p.evaluate(() => {
    const b = document.querySelector('.pocket-btn').getBoundingClientRect();
    const bar = document.querySelector('.app-bar').getBoundingClientRect();
    return { btnTop: Math.round(b.top), barBottom: Math.round(bar.bottom),
             btnRight: Math.round(b.right), barRight: Math.round(bar.right),
             btnW: Math.round(b.width), btnH: Math.round(b.height) };
  });
  assert.ok(Math.abs(info.btnTop - info.barBottom) <= 1, `pocket top (${info.btnTop}) sits on bar bottom (${info.barBottom})`);
  assert.ok(info.barRight - info.btnRight >= 10 && info.barRight - info.btnRight <= 30, `near right side of page: ${info.barRight - info.btnRight}px`);
  assert.equal(info.btnW, 57); assert.equal(info.btnH, 57);
  assert.deepEqual(errors, []);
  await p.screenshot({ path: '/tmp/pocket-hang.png', clip: { x: info.btnRight - 320, y: 0, width: 320, height: 220 } });
  console.log(`PASS: pocket hangs from bar edge (top=${info.btnTop}, bar bottom=${info.barBottom}), ${info.barRight - info.btnRight}px from page right edge`);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
