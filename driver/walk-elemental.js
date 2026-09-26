// Elemental rooms walkthrough: open fury room, prompt cycling, writing, tray
// tap-to-place, drag-to-move, keep flow, kept view with altar, Things I'm
// keeping tiles, grief room smoke test, mobile layout. Dumps console/page errors.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 300)); });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 300)));

  const shot = async (name) => {
    await page.screenshot({ path: `/home/hatch/workspace/finding-self/driver/${name}.png` });
    console.log('SHOT:', name);
  };
  const text = async () => (await page.innerText('body')).slice(0, 900);

  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => localStorage.clear());

  // 1. Longer Self-Explorations shows both elemental rooms as room objects
  await page.evaluate(() => UI.renderLongerExplorations());
  await page.waitForTimeout(900);
  const le = await text();
  console.log('fury room object:', le.includes('Somewhere to put the fury'));
  console.log('grief room object:', le.includes('In memory'));

  // 2. open fury room via the room object
  await page.locator('[data-room-id="ember"]').click();
  await page.waitForTimeout(900);
  let t = await text();
  console.log('room title:', t.includes('Somewhere to put the fury'));
  console.log('intro:', t.includes('without the requirement to calm down'));
  console.log('prompt 1:', t.includes('What happened, in your own words.'));
  console.log('canvas running:', await page.evaluate(() => !!document.querySelector('.el-canvas')));
  console.log('tray objects:', await page.evaluate(() => document.querySelectorAll('.el-tray-obj').length));
  await shot('shot11-room-fury');

  // 3. cycle the prompt
  await page.locator('[data-el="another"]').click();
  await page.waitForTimeout(300);
  console.log('prompt 2:', (await text()).includes('Where does it sit in your body right now?'));

  // 4. write words
  await page.fill('#el-text', 'The meeting where nobody listened.\nIt is still loud in my chest.');

  // 5. tap a tray object -> placed in the room, tray loses it
  await page.locator('.el-tray-obj[data-obj="ember-bowl"]').click();
  await page.waitForTimeout(400);
  console.log('placed count:', await page.evaluate(() => document.querySelectorAll('.el-placed').length));
  console.log('tray shrinks:', await page.evaluate(() => document.querySelectorAll('.el-tray-obj').length));

  // 6. drag the placed object to a new spot (pointer events via mouse)
  const before = await page.evaluate(() => { const e = document.querySelector('.el-placed'); return { l: e.style.left, t: e.style.top }; });
  const box = await page.locator('.el-placed').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 60, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => { const e = document.querySelector('.el-placed'); return { l: e.style.left, t: e.style.top }; });
  console.log('drag moved object:', before.l !== after.l || before.t !== after.t);

  // 7. keep -> confirmation
  await page.locator('[data-el="keep"]').click();
  await page.waitForTimeout(600);
  console.log('kept confirm:', (await text()).includes('Kept.'));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fsaw.elemental.v1') || '[]'));
  console.log('stored entries:', stored.length, '| altar:', stored[0]?.altar?.length, '| text kept:', (stored[0]?.text || '').includes('nobody listened'));
  await shot('shot11-kept-confirm');

  // 8. Things I'm keeping -> elemental tile -> kept view with words + altar
  await page.evaluate(() => EXPLORATIONS.routes.collection());
  await page.waitForTimeout(600);
  console.log('keeping section:', (await text()).includes('Elemental rooms'));
  console.log('tile present:', await page.evaluate(() => !!document.querySelector('.el-tile-fury')));
  await page.locator('.el-tile-fury').click();
  await page.waitForTimeout(800);
  t = await text();
  console.log('kept view words:', t.includes('nobody listened'));
  console.log('kept view altar:', await page.evaluate(() => document.querySelectorAll('.el-placed.static').length));
  console.log('kept view date:', /[A-Z][a-z]+ \d{1,2}, \d{4}/.test(t));
  await shot('shot11-kept-view');

  // 9. grief room smoke test (no words, one object, keep)
  await page.evaluate(() => ELEMENTAL.openRoom('grief'));
  await page.waitForTimeout(800);
  console.log('grief title:', (await text()).includes('In memory'));
  await page.locator('.el-tray-obj[data-obj="candle"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-el="keep"]').click();
  await page.waitForTimeout(500);
  const stored2 = await page.evaluate(() => JSON.parse(localStorage.getItem('fsaw.elemental.v1') || '[]'));
  console.log('two kept:', stored2.length === 2, '| grief altar-only:', stored2[0].element === 'grief' && stored2[0].altar.length === 1 && !stored2[0].text.trim());

  // 10. keep-rule: empty keep keeps nothing
  await page.evaluate(() => ELEMENTAL.openRoom('fury'));
  await page.waitForTimeout(500);
  await page.locator('[data-el="keep"]').click();
  await page.waitForTimeout(300);
  console.log('empty keep blocked:', (await text()).includes('Add a few words or place an object first'));

  // 11. mobile layout
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => ELEMENTAL.openRoom('grief'));
  await page.waitForTimeout(800);
  await shot('shot11-room-mobile');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > 392);
  console.log('no horizontal overflow at 390px:', !overflow);

  // 12. leave without keeping (two-step)
  await page.fill('#el-text', 'draft words');
  await page.locator('[data-el="leave"]').click();
  await page.waitForTimeout(300);
  const armed = await page.evaluate(() => document.querySelector('[data-el="leave"]').textContent);
  console.log('leave arms first:', armed.includes('without keeping'));
  await page.locator('[data-el="leave"]').click();
  await page.waitForTimeout(600);
  console.log('left to explorations:', (await text()).includes('Longer Self-Explorations'));

  console.log('CONSOLE/PAGE ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('WALK FAILED:', e.message); process.exit(1); });
