const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  p.setDefaultTimeout(10000);
  const dismiss = async () => {
    await p.waitForTimeout(700);
    await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
    await p.waitForTimeout(300);
  };
  const gotoGarden = async () => {
    await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
    await dismiss();
    await p.locator('[data-act="longer-explorations"]').click();
    await p.locator('.room-label-btn[data-ract="open-practice"]').click({ force: true });
    await p.waitForTimeout(700);
  };
  const seed = (style, garden) => p.evaluate(([s, g]) => {
    const d = JSON.parse(localStorage.getItem('fsaw.updated.v1') || '{}');
    d.growthIntroSeen = true; d.plantStyle = s; d.garden = g;
    localStorage.setItem('fsaw.updated.v1', JSON.stringify(d));
  }, [style, garden]);

  const leaves = {
    "1": { category: "people", shape: "monstera", words: "grow kindly", title: "Kindness" },
    "3": { category: "feelings", shape: "fig", words: "feel deeply", title: "Depth" }
  };
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await seed('stems', leaves);
  await gotoGarden();
  const plant = await p.locator('.growth-plant').boundingBox();
  await p.screenshot({ path: '/tmp/plant-stems.png',
    clip: { x: plant.x - 20, y: Math.max(0, plant.y - 20), width: plant.width + 40, height: plant.height + 120 } });

  await seed('bare', leaves);
  await gotoGarden();
  const plant2 = await p.locator('.growth-plant').boundingBox();
  await p.screenshot({ path: '/tmp/plant-bare.png',
    clip: { x: plant2.x - 20, y: Math.max(0, plant2.y - 20), width: plant2.width + 40, height: plant2.height + 120 } });

  // minis only, stems
  await seed('stems', {});
  await gotoGarden();
  const plant3 = await p.locator('.growth-plant').boundingBox();
  await p.screenshot({ path: '/tmp/plant-stems-minis.png',
    clip: { x: plant3.x - 20, y: Math.max(0, plant3.y - 20), width: plant3.width + 40, height: plant3.height + 120 } });

  console.log('ok');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
