const { chromium } = require('playwright-core');
(async () => {
  const mobile = process.env.MOBILE === '1';
  const tag = mobile ? 'm' : 'd';
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'] });
  const page = await browser.newPage(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)));
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('button[data-tut="no"]');
  await page.waitForTimeout(800);
  const pv = page.locator('.explore-preview');
  await pv.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await pv.screenshot({ path: `/tmp/explore-preview-${tag}.png` });
  // what art is actually in the preview at runtime?
  const pvArt = await page.evaluate(() => [...document.querySelectorAll('.pv-obj')].map(el => ({
    cls: el.className, html: el.innerHTML.slice(0, 120)
  })));
  console.log('PREVIEW ART:', JSON.stringify(pvArt, null, 0).slice(0, 900));
  await page.click('.explore-preview');
  await page.waitForTimeout(1500);
  const room = page.locator('.room-scene');
  await room.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await room.screenshot({ path: `/tmp/explore-room-${tag}.png` });
  const roomArt = await page.evaluate(() => [...document.querySelectorAll('.room-scene .room-item')].map(el => ({
    id: el.dataset.roomId, img: (el.querySelector('img') || {}).src?.split('/').pop() || el.innerHTML.slice(0, 60)
  })));
  console.log('ROOM ART:', JSON.stringify(roomArt));
  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
