const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('fsaw.tutorial.v1', 'no');
      localStorage.setItem('fsaw.checkins.chosen.v1', JSON.stringify(['SS01', 'SS02', 'SS06']));
    } catch (e) {}
  });
  const page = await ctx.newPage();
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await sleep(2000);
  const explore = page.locator('button', { hasText: 'View all' }).first();
  await explore.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await explore.click().catch(() => {});
  await sleep(2000);
  const scene = page.locator('.room-scene').first();
  await scene.waitFor({ state: 'visible', timeout: 15000 });
  await scene.scrollIntoViewIfNeeded();
  await sleep(800);
  // Crop the ledge + fireplace region: room units x 0-428, y 0-320 -> full width, top 36%.
  const box = await scene.boundingBox();
  const clip = { x: box.x, y: box.y, width: box.width, height: box.height * 0.36 };
  await page.screenshot({ path: '/home/hatch/workspace/screenshots/ledge-fireplace.png', clip });
  console.log('ledge shot saved', JSON.stringify(clip));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
