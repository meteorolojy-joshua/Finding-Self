const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1150 } });
  p.setDefaultTimeout(10000);
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('fsaw.updated.v1') || '{}');
    d.growthIntroSeen = true;
    d.garden = {
      "1": { category: "people", shape: "monstera", words: "grow kindly", title: "Kindness" },
      "2": { category: "feelings", shape: "fig", words: "feel deeply", title: "Depth" }
    };
    localStorage.setItem('fsaw.updated.v1', JSON.stringify(d));
  });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(400);
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-practice"]').click({ force: true });
  await p.waitForTimeout(800);
  const info = await p.evaluate(() => {
    return [...document.querySelectorAll('.growing-leaf.filled')].map(btn => {
      const img = btn.querySelector('.saved-leaf');
      const br = btn.getBoundingClientRect(), ir = img.getBoundingClientRect();
      return { id: btn.dataset.id, btn: [Math.round(br.width), Math.round(br.height)],
               img: [Math.round(ir.width), Math.round(ir.height)],
               cls: img.className, src: img.getAttribute('src').split('/').pop() };
    });
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
