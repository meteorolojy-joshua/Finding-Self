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
    const h1 = document.querySelector('.home-hero h1');
    const r = h1.getBoundingClientRect();
    return { text: h1.textContent, centerY: Math.round(r.y + r.height / 2), vh: window.innerHeight };
  });
  assert.equal(info.text, 'Choose A Grounding Activity');
  assert.ok(Math.abs(info.centerY - info.vh / 2) < 12, `h1 vertically centered: center=${info.centerY}, viewport center=${info.vh / 2}`);
  assert.deepEqual(errors, []);
  await p.screenshot({ path: '/tmp/home-hero.png' });
  console.log(`PASS: "${info.text}" centered at y=${info.centerY} (viewport center ${info.vh / 2})`);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
