const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1200 } });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('fsaw.updated.v1') || '{}');
    d.growthIntroSeen = true; d.plantStyle = 'stems';
    d.garden = { "1": { category: "people", shape: "monstera", words: "grow kindly", title: "Kindness" } };
    localStorage.setItem('fsaw.updated.v1', JSON.stringify(d));
  });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-practice"]').click({ force: true });
  await p.waitForTimeout(700);
  await p.locator('.growing-leaf.filled').click();
  await p.waitForTimeout(1000);
  // flip to back
  await p.evaluate(() => document.querySelector('.il-flip').classList.add('flipped'));
  await p.waitForTimeout(800);
  const ed = await p.locator('.inplace-leaf').boundingBox();
  await p.screenshot({ path: '/tmp/leaf-back.png',
    clip: { x: ed.x - 10, y: ed.y - 10, width: ed.width + 20, height: ed.height + 20 } });
  const hasWords = await p.evaluate(() => !!document.querySelector('.il-back-fields textarea[name="words"]'));
  const prompt = await p.evaluate(() => document.querySelector('.il-back-fields .pb-field span')?.textContent);
  console.log('words field present:', hasWords, '| prompt:', prompt);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
