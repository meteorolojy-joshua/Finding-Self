const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('text=Make a note');
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Words' }).click();
  await page.waitForTimeout(600);
  await page.mouse.click(640, 215); await page.waitForTimeout(300);
  await page.keyboard.type('Hello world');
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  await page.mouse.click(640, 500); await page.waitForTimeout(500); // click empty canvas to deselect
  const st = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => /keep this note/i.test(x.textContent || ''));
    return b ? { disabled: b.disabled, aria: b.getAttribute('aria-disabled') } : null;
  });
  console.log('AFTER DESELECT:', JSON.stringify(st));
  await browser.close();
})().catch(e => { console.error('DIAG FAILED', String(e).slice(0, 200)); process.exit(1); });
