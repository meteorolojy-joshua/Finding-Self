const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1150 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.setDefaultTimeout(10000);
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(400);
  // seed two grown leaves: left monstera, right fig
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
    const leaves = [...document.querySelectorAll('.growing-leaf.filled .saved-leaf')].map(el => ({
      src: el.getAttribute('src'), cls: el.className,
      transform: getComputedStyle(el).transform
    }));
    const minis = [...document.querySelectorAll('.growing-leaf.mini .mini-leaf')].map(el => ({
      src: el.getAttribute('src'), transform: el.style.transform || getComputedStyle(el).transform
    }));
    return { leaves, minis };
  });
  console.log(JSON.stringify(info, null, 1));
  assert.ok(info.leaves[0].src.includes('leaf-monstera-people.png'), 'left leaf = monstera/people');
  assert.ok(info.leaves[1].src.includes('leaf-fig-feelings.png'), 'right leaf = fig/feelings');
  assert.ok(info.minis.every(m => m.src.includes('leaf-monstera-others.png')), 'minis = monstera');
  assert.deepEqual(errors, []);
  await p.screenshot({ path: '/tmp/garden-new-leaves.png' });
  console.log('PASS: garden shows new leaf art');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
