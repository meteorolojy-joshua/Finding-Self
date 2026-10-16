const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('fsaw.updated.v1') || '{}');
    d.growthIntroSeen = true; d.plantStyle = 'stems'; d.garden = {};
    localStorage.setItem('fsaw.updated.v1', JSON.stringify(d));
  });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-practice"]').click({ force: true });
  await p.waitForTimeout(700);
  const t = await p.evaluate(() => {
    const btn = document.querySelector('.growing-leaf.mini');
    const cs = getComputedStyle(btn);
    return { transform: cs.transform, position: cs.position, width: cs.width };
  });
  console.log(JSON.stringify(t));
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
