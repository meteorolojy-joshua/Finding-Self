const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1150 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.setDefaultTimeout(8000);
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.locator('[data-tut="no"]').click();
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-belonging"]').click({ force: true });

  const cornerImg = () => p.locator('.rug-corner img').getAttribute('src');
  async function drag(source, target) {
    const a = await source.boundingBox(), z = await target.boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await p.mouse.down();
    await p.mouse.move(z.x + z.width / 2, z.y + z.height / 2, { steps: 18 });
    await p.mouse.up();
  }
  const cornerSrc = async () => (await cornerImg()).split('/').pop();

  // 1. Initial state: empty corner, old basket gone.
  assert.equal(await p.locator('.rug-basket').count(), 0, 'old basket removed');
  assert.equal(await cornerSrc(), 'corner-rugs-0.png', 'corner shows empty state');
  assert.equal(await p.locator('.rug-corner').getAttribute('aria-label'), 'Corner — no rugs rolled up right now');

  // 2. Layout: first row = 2 rugs + corner; corner pinned to col 3 / row 1.
  const cells = await p.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const rugs = [...document.querySelectorAll('.community-rug:not(.rug-add)')].slice(0, 3).map(box);
    const corner = box(document.querySelector('.rug-corner'));
    const cs = getComputedStyle(document.querySelector('.rug-corner'));
    return { rugs, corner, col: cs.gridColumnStart, row: cs.gridRowStart };
  });
  assert.deepEqual([cells.row, cells.col], ['1', '3'], 'corner pinned to col 3 row 1');
  const [r0, r1, r2] = cells.rugs;
  assert.ok(Math.abs(r0.y - r1.y) < 8, 'rug 1 and 2 share the first row');
  assert.ok(Math.abs(r0.y - cells.corner.y) < cells.corner.h, 'corner sits in the first row');
  assert.ok(r0.x + r0.w < r1.x + 8 && r1.x + r1.w < cells.corner.x + 8, 'order: rug, rug, corner');
  assert.ok(r2.y > r0.y + r0.h * 0.5, 'rug 3 starts in row 2, below the corner row');

  // 3. Screenshot the natural state for J.
  await p.screenshot({ path: '/tmp/rug-corner-page.png', fullPage: true });

  // 4. Real drag: rug -> corner rolls up, image switches to 1.
  await drag(p.locator('.community-rug:not(.rug-add)').first(), p.locator('.rug-corner'));
  await p.waitForTimeout(900);
  assert.equal(await cornerSrc(), 'corner-rugs-1.png', 'corner shows 1 rug after drag');
  assert.equal(await p.evaluate(() => Object.values(EXPLORATIONS.data.contracts).filter(c => (c.placement || 'inside') === 'outside').length), 1);

  // 5. Roll up 4 more via real drags; image advances each time.
  for (let i = 2; i <= 5; i++) {
    await drag(p.locator('.community-rug:not(.rug-add)').first(), p.locator('.rug-corner'));
    await p.waitForTimeout(900);
    const expect = i === 5 ? 'corner-rugs-5.jpg' : `corner-rugs-${i}.png`;
    assert.equal(await cornerSrc(), expect, `corner shows ${i} rugs`);
  }
  assert.equal(await p.evaluate(() => Object.values(EXPLORATIONS.data.contracts).filter(c => (c.placement || 'inside') === 'outside').length), 5);

  // 6. Sixth roll-up refused: notice + image stays.
  await drag(p.locator('.community-rug:not(.rug-add)').first(), p.locator('.rug-corner'));
  await p.waitForTimeout(900);
  assert.equal(await cornerSrc(), 'corner-rugs-5.jpg', 'sixth roll-up refused, image unchanged');
  assert.ok((await p.locator('#app-notice').textContent()).includes('full'), 'full notice shown');

  // 7. Tap the corner: last rug lays flat again.
  await p.locator('.rug-corner').click();
  await p.waitForTimeout(400);
  assert.equal(await cornerSrc(), 'corner-rugs-4.png', 'tap lays one rug flat');
  assert.equal(await p.evaluate(() => Object.values(EXPLORATIONS.data.contracts).filter(c => (c.placement || 'inside') === 'outside').length), 4);
  assert.ok((await p.locator('#app-notice').textContent()).includes('laid back on the floor'));

  // 8. Zoom page: roll-up button label + cap enforced there too.
  await p.locator('.community-rug:not(.rug-add)').first().click();
  assert.equal(await p.locator('[data-rug-place]').textContent(), 'Roll up into the corner');
  await p.locator('[data-rug-place]').click(); // 5th again
  await p.locator('[data-rug-keep]').click();
  await p.waitForTimeout(400);
  assert.equal(await cornerSrc(), 'corner-rugs-5.jpg', 'zoom roll-up works to reach 5');
  await p.locator('.community-rug:not(.rug-add)').first().click();
  await p.locator('[data-rug-place]').click(); // attempt 6th from zoom
  assert.ok((await p.locator('#app-notice').textContent()).includes('full'), 'zoom cap notice shown');
  await p.locator('[data-rug-back]').click();
  assert.equal(await cornerSrc(), 'corner-rugs-5.jpg', 'zoom refusal keeps 5');

  assert.deepEqual(errors, []);
  console.log('PASS: corner states 0-5, 2-rug first row, cap enforced on drag + zoom, tap-to-unroll');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
