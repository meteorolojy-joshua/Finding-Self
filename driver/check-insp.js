const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-influence"]').click({ force: true });
  await p.waitForTimeout(700);
  await p.screenshot({ path: '/tmp/inspirations-page.png' });
  const imgs = await p.evaluate(() => [...document.querySelectorAll('img')].map(i => i.getAttribute('src')).join('\n'));
  console.log(imgs);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
