const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 300));
  });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 300)));

  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/fs-01-landing.png' });

  console.log('TITLE:', await page.title());
  console.log('ERRORS:', JSON.stringify(errors.slice(0, 20), null, 1));
  await browser.close();
})();
