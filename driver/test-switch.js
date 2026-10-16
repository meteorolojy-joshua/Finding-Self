const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  p.setDefaultTimeout(10000);
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(700);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('fsaw.updated.v1') || '{}');
    d.growthIntroSeen = true; d.plantStyle = 'stems';
    d.garden = { "1": { category: "people", shape: "monstera", words: "grow kindly", title: "Kindness" } };
    localStorage.setItem('fsaw.updated.v1', JSON.stringify(d));
  });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(700);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-practice"]').click({ force: true });
  await p.waitForTimeout(700);

  const pos = () => p.evaluate(() => {
    const btn = document.querySelector('.growing-leaf.filled');
    const r = btn.getBoundingClientRect();
    const plant = document.querySelector('.growth-plant').getBoundingClientRect();
    return { x: ((r.left + r.width/2 - plant.left) / plant.width * 100).toFixed(1),
             y: ((r.bottom - plant.top) / plant.height * 100).toFixed(1) };
  });
  const before = await pos();
  await p.locator('.plant-opt[data-id="bare"]').click();
  await p.waitForTimeout(700);
  const after = await pos();
  const style = await p.evaluate(() => JSON.parse(localStorage.getItem('fsaw.updated.v1')).plantStyle);
  console.log('before (stems):', JSON.stringify(before), 'after (bare):', JSON.stringify(after), 'saved:', style);
  console.log(Math.abs(parseFloat(before.x)-parseFloat(after.x)) > 5 || Math.abs(parseFloat(before.y)-parseFloat(after.y)) > 5
    ? 'PASS: leaf moved to new anchors' : 'FAIL: leaf did not move');

  // grow flow still works: click a mini, editor opens with monstera
  await p.locator('.plant-opt[data-id="stems"]').click();
  await p.waitForTimeout(500);
  await p.locator('.growing-leaf.mini').first().click();
  await p.waitForTimeout(1300);
  const edSrc = await p.evaluate(() => document.querySelector('.inplace-leaf .il-art')?.getAttribute('src'));
  console.log('editor opened:', edSrc && edSrc.includes('leaf-monstera-others') ? 'PASS' : 'FAIL: ' + edSrc);
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
