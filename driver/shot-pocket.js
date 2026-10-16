const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1150 }, deviceScaleFactor: 3 });
  p.setDefaultTimeout(8000);
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.locator('[data-tut="no"]').click();
  await p.waitForTimeout(500);
  const b = await p.locator('.pocket-btn').boundingBox();
  await p.screenshot({ path: '/tmp/pocket-zoom.png', clip: { x: b.x - 60, y: b.y - 40, width: b.width + 120, height: b.height + 80 } });
  console.log('shot ok', JSON.stringify(b));
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
