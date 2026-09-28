const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('button[data-tut="no"]');
  await page.waitForTimeout(600);
  await page.click('.checkin-add');
  await page.waitForTimeout(500);
  await page.click('button[data-cc="scratch"]');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/editor-view.png', fullPage: true });
  console.log('done');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
