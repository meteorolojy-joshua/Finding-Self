const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1150 } });
  p.setDefaultTimeout(10000);
  const dismissTut = async () => {
    await p.waitForTimeout(800);
    await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
    await p.waitForTimeout(400);
  };
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await dismissTut();
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
  await dismissTut();
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-practice"]').click({ force: true });
  await p.waitForTimeout(800);

  // (1) zoomed-out: crop to the plant area
  const plant = await p.locator('.growth-plant').boundingBox();
  await p.screenshot({ path: '/tmp/pic-zoomout.png',
    clip: { x: plant.x - 60, y: plant.y - 40, width: plant.width + 120, height: plant.height + 120 } });

  // (2) monstera zoomed-in: open its editor (front face)
  await p.locator('.growing-leaf.filled[data-id="1"]').click();
  await p.waitForTimeout(900);
  const ed1 = await p.locator('.inplace-leaf').boundingBox();
  await p.screenshot({ path: '/tmp/pic-monstera-in.png',
    clip: { x: ed1.x - 20, y: ed1.y - 20, width: ed1.width + 40, height: ed1.height + 40 } });
  await p.locator('[data-il-done]').click();
  await p.waitForTimeout(600);

  // (4) fig zoomed-in
  await p.locator('.growing-leaf.filled[data-id="2"]').click();
  await p.waitForTimeout(900);
  const ed2 = await p.locator('.inplace-leaf').boundingBox();
  await p.screenshot({ path: '/tmp/pic-fig-in.png',
    clip: { x: ed2.x - 20, y: ed2.y - 20, width: ed2.width + 40, height: ed2.height + 40 } });

  console.log('shots ok');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
