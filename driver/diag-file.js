const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'] }); // NO allow-file-access-from-files
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const t = (await page.innerText('body')).replace(/\s+/g, ' ').slice(0, 400);
  console.log('FILE-OPEN TEXT:', t);
  await page.screenshot({ path: '/tmp/fs-58-file-protocol.png' });
  await browser.close();
})().catch(e => { console.error('FAILED', String(e).slice(0, 200)); process.exit(1); });
