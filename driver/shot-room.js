const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
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
  // Open the Self-Explorations room.
  const btn = page.locator('[data-room-id="shovel"], [data-ract="open-explorations"], a[href*="explor"]').first();
  const explore = page.locator('button', { hasText: 'View all' }).first();
  await explore.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await explore.click().catch(() => {});
  await sleep(2000);
  const room = page.locator('.room-scene').first();
  await room.waitFor({ state: 'visible', timeout: 15000 });
  await room.scrollIntoViewIfNeeded();
  await sleep(800);
  await room.screenshot({ path: process.argv[2] || '/home/hatch/workspace/screenshots/room-shovel.png' });
  console.log('room shot saved');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
