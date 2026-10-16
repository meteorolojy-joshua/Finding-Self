const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('fsaw.updated.v1') || '{}');
    d.stories = [
      { source: 'Family', words: 'Work hard', bookmark: 'Keep' },
      { source: 'School', words: 'Be quiet', bookmark: 'Change' },
    ];
    localStorage.setItem('fsaw.updated.v1', JSON.stringify(d));
  });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-story"]').click({ force: true });
  await p.waitForTimeout(700);
  const frame = await p.locator('.shelf-art-frame').boundingBox();
  await p.screenshot({ path: '/tmp/narratives-shelf.png',
    clip: { x: frame.x - 10, y: frame.y - 60, width: frame.width + 20, height: frame.height + 20 } });
  console.log('ok');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
