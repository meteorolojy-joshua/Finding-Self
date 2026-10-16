const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 130)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 130)); });
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.EXPLORATIONS.routes.garden());
  await page.waitForTimeout(700);
  console.log('tutorial start:', await page.evaluate(() => { try { window.GARDEN_TUTORIAL.start(); return true; } catch (e) { return 'no: ' + e.message; } }));
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    document.querySelector('.garden-pile').click();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    document.querySelector('.growing-leaf:not(.filled)').click();
  });
  await page.waitForTimeout(2000);
  const st = await page.evaluate(() => ({
    zoomOpen: !!document.querySelector('.leaf-zoom-ov'),
    tutVisible: !!document.querySelector('.tut-spot'),
    tutTitle: document.querySelector('.tut-box')?.textContent?.slice(0, 60) || null
  }));
  console.log('TUTORIAL:', JSON.stringify(st));
  console.log('ERRORS:', errors.length ? errors : 'none');
  await page.screenshot({ path: '/tmp/tut-zoom.png' });
  await browser.close();
})().catch(e => { console.error('FAILED', String(e).slice(0, 250)); process.exit(1); });
