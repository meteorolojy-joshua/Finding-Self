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
  assert.equal(await p.locator('.pv-ledge').count(), 0, 'preview ledge gone');
  assert.equal(await p.locator('.entry-shelf-ledge').count(), 0, 'entry shelf ledge gone');
  assert.ok(await p.locator('.explore-preview').count() >= 1, 'self-explorations preview still there');
  assert.ok(await p.locator('[data-act="practice-library"]').count() >= 1, 'self-records button still there');
  assert.deepEqual(errors, []);
  await p.screenshot({ path: '/tmp/home-no-ledges.png', fullPage: true });
  console.log('PASS: homepage ledges removed, no page errors');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
