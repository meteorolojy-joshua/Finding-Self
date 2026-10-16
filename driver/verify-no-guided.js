const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1150 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.setDefaultTimeout(8000);
  const gotoGarden = async () => {
    await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      const no = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]');
      if (no) no.click();
    });
    await p.waitForTimeout(400);
    await p.locator('[data-act="longer-explorations"]').click();
    await p.locator('.room-label-btn[data-ract="open-practice"]').click({ force: true });
    await p.waitForTimeout(600);
  };
  const btnTexts = () => p.locator('[data-page="garden"] .btnrow button').allTextContents();

  // 1. First-run state: only 'Keep this collection'
  await gotoGarden();
  assert.ok(await p.locator('[data-page="garden"]').count() >= 1, 'garden page opens via room plant spot');
  let texts = await btnTexts();
  assert.deepEqual(texts, ['Keep this collection'], `first-run buttons: ${JSON.stringify(texts)}`);

  // 2. Seen state (seed growthIntroSeen): no button row at all
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('fsaw.updated.v1') || '{}');
    d.growthIntroSeen = true;
    localStorage.setItem('fsaw.updated.v1', JSON.stringify(d));
  });
  await gotoGarden();
  texts = await p.locator('[data-page="garden"] .btnrow button').allTextContents().catch(() => []);
  assert.deepEqual(texts, [], `seen-state buttons: ${JSON.stringify(texts)}`);
  const bodyText = await p.locator('[data-page="garden"]').textContent();
  assert.ok(!bodyText.includes('Continue guided exploration') && !bodyText.includes('Done for now'), 'removed buttons gone');

  // 3. No page errors
  assert.deepEqual(errors, []);
  console.log('PASS: guided-flow buttons removed from garden page (both states), no page errors');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
