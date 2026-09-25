const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('text=Before I Enter Social Media'); await page.waitForTimeout(800);
  await page.click('text=Write my own option'); await page.waitForTimeout(800);
  await page.getByLabel('Your answer').fill('Just checking the weather quickly');
  await page.waitForTimeout(400);
  await page.click('text=Use these words and continue'); await page.waitForTimeout(1000);
  const t = (await page.innerText('body')).replace(/\s+/g, ' ').slice(0, 300);
  console.log('AFTER CUSTOM:', t);
  await browser.close();
})().catch(e => { console.error('FAILED', String(e).slice(0, 200)); process.exit(1); });
