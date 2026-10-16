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
  const html = await p.evaluate(() => {
    const s = document.querySelector('[data-page="story-shelf"] .support');
    return s ? s.outerHTML.slice(0, 200) : 'NOT FOUND';
  });
  console.log(html);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
