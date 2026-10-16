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
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-belonging"]').click({ force: true });

  const rugs = await p.locator('.community-rug:not(.rug-add)').count();
  assert.equal(rugs, 3, 'exactly three starter rugs');
  assert.equal(await p.locator('.rug-add').count(), 1, 'add-rug button present');
  assert.equal(await p.locator('.rug-add .rug-name').textContent(), 'Add a rug');
  const cornerSrc = (await p.locator('.rug-corner img').getAttribute('src')).split('/').pop();
  assert.equal(cornerSrc, 'corner-rugs-0.png', 'corner empty');
  assert.deepEqual(errors, []);
  await p.screenshot({ path: '/tmp/rug-three-page.png', fullPage: true });
  console.log('PASS: 3 rugs + Add a rug + empty corner, no page errors');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
