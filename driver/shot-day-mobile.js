const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    localStorage.clear();
    const ST = ENGINE.SmallThings;
    ST.startList();
    ST.addEntry({ text: 'morning pills', at: '2026-09-26T08:15:00' });
    ST.addEntry({ text: 'warm bread from the bakery', at: '2026-09-26T13:35:00' });
    ST.closeList();
  });
  const id = await page.evaluate(() => ENGINE.SmallThings.getKept()[0].id);
  await page.evaluate((id) => {
    const b = document.createElement('button');
    b.setAttribute('data-act', 'smallthings-view');
    b.setAttribute('data-id', id);
    document.querySelector('#view').appendChild(b);
    b.click(); b.remove();
  }, id);
  await page.waitForTimeout(600);
  console.log('day entries rendered:', await page.locator('.st-obj').count());
  await page.screenshot({ path: '/home/hatch/workspace/finding-self/driver/shot10-day-mobile.png' });
  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
