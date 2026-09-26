const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto('file:///home/hatch/workspace/finding-self/app/tests.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.getElementById('summary').textContent.includes('passing'), null, { timeout: 60000 });
  console.log('SUITE:', await page.textContent('#summary'));
  const fails = await page.$$eval('#results li', els => els.filter(e => e.textContent.includes('FAIL')).map(e => e.textContent.slice(0, 160)));
  console.log('FAILS:', JSON.stringify(fails));
  console.log('PAGEERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
