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
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await sleep(2000);
  const explore = page.locator('button', { hasText: 'View all' }).first();
  await explore.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await explore.click().catch(() => {});
  await sleep(2000);
  const info = await page.evaluate(() => {
    const scene = document.querySelector('.room-scene');
    const sh = document.querySelector('[data-room-id="shovel"]');
    const pl = document.querySelector('[data-room-id="plant"]');
    const W = 428, H = 744.5;
    const r = el => { const b = el.getBoundingClientRect(); const s = scene.getBoundingClientRect();
      return { x: (b.left - s.left) / s.width * W, y: (b.top - s.top) / s.height * H, w: b.width / s.width * W, h: b.height / s.height * H }; };
    const floorEl = scene.querySelector('.room-floor');
    const fr = floorEl.getBoundingClientRect(); const sr = scene.getBoundingClientRect();
    return { shovel: r(sh), plant: r(pl), floorTopUnits: (fr.top - sr.top) / sr.height * H,
      regShovel: { ...window.ROOM_LAYOUT ? {} : {} } };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
