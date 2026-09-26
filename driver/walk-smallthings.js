// Small things walkthrough: live entry with auto times, batch key-in with hand-set
// times, photo entries (composer + per-entry), zoom viewer, removal, reload
// resume, close-and-keep, past lists, mobile layout. Dumps console/page errors.
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
  const text = async () => (await page.innerText('body')).slice(0, 500);

  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => localStorage.clear());

  // 1. library -> Begin Small things; empty-state guidance
  await page.evaluate(() => UI.renderTerminal({ id: 'PRACTICE.LIBRARY' }));
  await page.waitForTimeout(600);
  console.log('library has Practice 3:', (await text()).includes('Practice 3 — Small things'));
  await page.locator('[data-act="smallthings-begin"]').click();
  await page.waitForTimeout(600);
  const emptyText = await text();
  console.log('empty guidance:', emptyText.includes('What did today hold?') && emptyText.includes('Leave this open'));
  console.log('open-since line:', /Open since \d\d:\d\d/.test(emptyText));
  await shot('shot10-empty');

  // 2. live entry: type + Add, time stamped automatically
  await page.fill('#st-composer-text', 'warm bread from the bakery');
  await page.locator('#st-composer-form button[type="submit"]').click();
  await page.waitForTimeout(600);
  let entries = await page.locator('.st-entry').count();
  const autoTime = await page.locator('.st-entry input[data-st-time]').first().inputValue();
  const nowHHMM = new Date().toTimeString().slice(0, 5);
  console.log('entries after add:', entries, '| auto time:', autoTime, '| now:', nowHHMM, '| match:', autoTime === nowHHMM);

  // 3. batch/key-in: add another, then set its time by hand to 08:15
  await page.fill('#st-composer-text', 'morning pills');
  await page.keyboard.press('Enter'); // composer submit via Enter
  await page.waitForTimeout(600);
  await page.locator('.st-entry input[data-st-time]').nth(1).fill('08:15');
  await page.waitForTimeout(400);
  const stored = await page.evaluate(() => ENGINE.SmallThings.getOpen().entries.map(e => ({ text: e.text, at: e.at })));
  console.log('stored entries:', JSON.stringify(stored));
  const d = new Date(stored.find(e => e.text === 'morning pills').at);
  console.log('hand-set time kept:', d.getHours() === 8 && d.getMinutes() === 15);

  // 4. photo in the composer: attach, then Add -> entry with thumbnail
  await page.setInputFiles('#st-file', '/home/hatch/workspace/finding-self/validation/photo-fixture.png');
  await page.waitForSelector('.st-pending img', { timeout: 8000 });
  console.log('composer photo preview shown: true');
  await page.fill('#st-composer-text', 'bakery window');
  await page.locator('#st-composer-form button[type="submit"]').click();
  await page.waitForTimeout(600);
  const thumbs = await page.locator('.st-entry .st-thumb').count();
  console.log('entries now:', await page.locator('.st-entry').count(), '| thumbnails:', thumbs);

  // 5. per-entry photo: attach to the text-only entry
  const targetId = await page.evaluate(() => ENGINE.SmallThings.getOpen().entries.find(e => !e.image).id);
  await page.evaluate((id) => { document.querySelector('#st-file').dataset.target = id; }, targetId);
  await page.setInputFiles('#st-file', '/home/hatch/workspace/finding-self/validation/photo-fixture.png');
  await page.waitForFunction((id) => {
    const l = ENGINE.SmallThings.getOpen();
    const e = l && l.entries.find(x => x.id === id);
    return !!(e && e.image);
  }, targetId, { timeout: 8000 });
  await page.waitForTimeout(400);
  console.log('per-entry photo attached: true | thumbnails now:', await page.locator('.st-entry .st-thumb').count());
  await shot('shot10-list');

  // 6. zoom viewer opens and closes
  await page.locator('.st-entry .st-thumbbtn').first().click();
  await page.waitForTimeout(500);
  console.log('viewer open:', await page.locator('.st-viewer img').isVisible());
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await page.waitForTimeout(400);
  console.log('viewer closed:', (await page.locator('.st-viewer').count()) === 0);

  // 7. remove one entry
  const before = await page.locator('.st-entry').count();
  await page.locator('.st-entry [data-act="smallthings-remove"]').first().click();
  await page.waitForTimeout(400);
  console.log('remove works:', (await page.locator('.st-entry').count()) === before - 1);

  // 8. reload mid-day -> open list resumes
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => UI.renderTerminal({ id: 'PRACTICE.LIBRARY' }));
  await page.waitForTimeout(400);
  await page.locator('[data-act="smallthings-begin"]').click();
  await page.waitForTimeout(600);
  console.log('open list resumed after reload:', (await page.locator('.st-entry').count()) === before - 1);

  // 9. close and keep -> kept screen -> past lists -> read-only view
  await page.getByRole('button', { name: 'Close and keep this list', exact: true }).click();
  await page.waitForTimeout(600);
  const keptText = await text();
  console.log('kept screen:', keptText.includes('Kept.') && keptText.includes('kept on this device'));
  await page.getByRole('button', { name: 'Past lists', exact: true }).click();
  await page.waitForTimeout(500);
  console.log('past list row:', (await text()).includes('entries ·'));
  await page.locator('[data-act="smallthings-view"]').first().click();
  await page.waitForTimeout(500);
  const viewText = await text();
  console.log('read-only view:', viewText.includes('bakery window') && (await page.locator('.st-day .st-day-entry').count()) === 2);
  await shot('shot10-past');

  // 10. starting a new list after closing
  await page.evaluate(() => UI.renderTerminal({ id: 'PRACTICE.LIBRARY' }));
  await page.waitForTimeout(400);
  await page.locator('[data-act="smallthings-begin"]').click();
  await page.waitForTimeout(500);
  console.log('new list after close is empty:', (await page.locator('.st-entry').count()) === 0);
  console.log('kept still stored:', await page.evaluate(() => ENGINE.SmallThings.getKept().length));

  // 11. mobile layout
  await page.setViewportSize({ width: 390, height: 844 });
  await page.fill('#st-composer-text', 'rain on the skylight');
  await page.locator('#st-composer-form button[type="submit"]').click();
  await page.waitForTimeout(600);
  await shot('shot10-mobile');

  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('WALK FAILED:', e.message); process.exit(1); });
