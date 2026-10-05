const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('fsaw.tutorial.v1', 'no');
      localStorage.setItem('fsaw.checkins.chosen.v1', JSON.stringify(['SS01', 'SS02', 'SS06']));
    } catch (e) {}
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0, 160)));
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await sleep(2000);
  const add = page.locator('[data-act="add-checkin"]').first();
  await add.waitFor({ state: 'visible', timeout: 15000 });
  await add.click();
  await sleep(1200);
  const popup = page.locator('[data-od-id="create-choice"]');
  await popup.waitFor({ state: 'visible', timeout: 8000 });
  const box = await popup.locator('.scn-modal').boundingBox();
  await page.screenshot({
    path: '/home/hatch/workspace/screenshots/create-choice-recolor.png',
    clip: { x: box.x - 60, y: box.y - 60, width: box.width + 120, height: box.height + 120 },
  });
  console.log('shot saved');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
