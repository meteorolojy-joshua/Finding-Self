const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-story"]').click({ force: true });
  await p.waitForTimeout(700);
  await p.screenshot({ path: '/tmp/narratives-header.png', clip: { x: 290, y: 0, width: 520, height: 450 } });
  console.log('ok');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
