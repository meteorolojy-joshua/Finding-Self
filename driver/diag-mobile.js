const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/fs-59-mobile-home.png' });
  await page.click('text=Before I Enter Social Media'); await page.waitForTimeout(800);
  await page.click('text=Find one specific thing'); await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/fs-60-mobile-flow.png' });
  // horizontal overflow check
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('H-OVERFLOW px:', overflow);
  console.log('ERRORS:', JSON.stringify([...new Set(errors)]));
  await browser.close();
})().catch(e => { console.error('FAILED', String(e).slice(0, 200)); process.exit(1); });
