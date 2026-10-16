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
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('fsaw.updated.v1') || '{}');
    d.growthIntroSeen = true;
    d.garden = { "1": { category: "people", shape: "monstera", words: "grow kindly", title: "Kindness" } };
    localStorage.setItem('fsaw.updated.v1', JSON.stringify(d));
  });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(400);
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-practice"]').click({ force: true });
  await p.waitForTimeout(800);
  // open the editor for leaf 1
  await p.locator('.growing-leaf.filled[data-id="1"]').click();
  await p.waitForTimeout(800);
  // flip to back to see theme/shape pickers
  await p.evaluate(() => {
    const flip = document.querySelector('.il-flip');
    // simulate swipe via class toggle (swipe needs pointer events; use keyboard instead)
  });
  await p.locator('.il-flip').press('ArrowRight');
  await p.waitForTimeout(600);
  const info = await p.evaluate(() => {
    const shapes = [...document.querySelectorAll('.il-shape')].map(b => ({
      shape: b.dataset.shape, picked: b.classList.contains('picked'),
      img: b.querySelector('img').getAttribute('src')
    }));
    const themes = [...document.querySelectorAll('.il-theme')].map(b => ({
      theme: b.dataset.theme, picked: b.classList.contains('picked'),
      img: b.querySelector('img').getAttribute('src')
    }));
    return { shapes, themes };
  });
  console.log(JSON.stringify(info, null, 1));
  assert.equal(info.shapes.length, 2, 'two leaf shape options');
  assert.ok(info.shapes[0].picked && info.shapes[0].shape === 'monstera');
  assert.ok(info.themes.length === 8, 'eight theme swatches');
  assert.ok(info.themes.every(t => t.img.includes('leaf-monstera-')), 'swatches show monstera in each theme color');
  // switch to fig
  await p.locator('.il-shape[data-shape="fig"]').click();
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => ({
    art: document.querySelector('.il-front .il-art').getAttribute('src'),
    figCls: document.querySelector('.il-front .il-art').classList.contains('leaf-fig'),
    swatches: [...document.querySelectorAll('.il-theme img')].map(i => i.getAttribute('src'))
  }));
  assert.ok(after.art.includes('leaf-fig-people.png'), `art switched to fig: ${after.art}`);
  assert.ok(after.figCls, 'fig rotation class applied');
  assert.ok(after.swatches.every(s => s.includes('leaf-fig-')), 'swatches now show fig');
  // switch theme to feelings -> recolored fig
  await p.locator('.il-theme[data-theme="feelings"]').click();
  await p.waitForTimeout(500);
  const recolor = await p.evaluate(() => document.querySelector('.il-front .il-art').getAttribute('src'));
  assert.ok(recolor.includes('leaf-fig-feelings.png'), `theme recolors fig: ${recolor}`);
  assert.deepEqual(errors, []);
  await p.screenshot({ path: '/tmp/leaf-editor.png' });
  console.log('PASS: editor shape picker + theme recoloring work');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
