const { chromium } = require('playwright-core');
const SHOTDIR = '/home/hatch/workspace/screenshots';
const APP_URL = 'https://meteorolojy-joshua.github.io/Finding-Self/app/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function bodySig(page) {
  return (await page.innerText('body')).replace(/\s+/g, ' ').slice(0, 220);
}

async function clickBtn(page, text, timeout = 15000) {
  const loc = page.locator('button', { hasText: text }).first();
  await loc.waitFor({ state: 'visible', timeout });
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const label = (await loc.innerText()).trim().slice(0, 50).replace(/\s+/g, ' ');
  await loc.click();
  console.log('CLICK:', JSON.stringify(label));
  await sleep(1400);
}

async function clickOption(page, text) {
  let loc = page.locator('#view button', { hasText: text }).first();
  try { await loc.waitFor({ state: 'visible', timeout: 5000 }); }
  catch (e) {
    console.log('  expanding More options to find:', text);
    const more = page.locator('#view button', { hasText: 'More options' }).first();
    await more.waitFor({ state: 'visible', timeout: 10000 });
    await more.click(); await sleep(1400);
    loc = page.locator('button', { hasText: text }).first();
    await loc.waitFor({ state: 'visible', timeout: 10000 });
  }
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const label = (await loc.innerText()).trim().slice(0, 50).replace(/\s+/g, ' ');
  await loc.click(); await sleep(1500);
  console.log('OPTION:', JSON.stringify(label));
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    proxy: { server: 'http://127.0.0.1:3129' },
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0, 160)));

  console.log('== loading live app ==');
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);
  console.log('loaded:', await bodySig(page));

  // ---------- SHOT 3: template leak in More-options picker ----------
  console.log('== shot 3: check-in flow to RESOURCE.S ==');
  await clickBtn(page, 'When Something Feels Off');
  console.log('s1:', await bodySig(page));
  await clickOption(page, 'Inside me');
  await clickOption(page, 'A practical next step');
  await clickOption(page, 'Distance');
  const atResource = await bodySig(page);
  console.log('at RESOURCE.S:', atResource);
  if (!atResource.includes('requested_support') && !atResource.includes('possible or useful')) {
    throw new Error('did not reach RESOURCE.S, got: ' + atResource);
  }
  const more = page.locator('#view button', { hasText: 'More options' }).first();
  await more.waitFor({ state: 'visible', timeout: 10000 });
  await more.click(); await sleep(1600);
  const picker = await bodySig(page);
  console.log('picker shows leak:', picker.includes('{requested_support}'));
  await page.screenshot({ path: SHOTDIR + '/template-leak.png' });
  console.log('SAVED template-leak.png');

  // ---------- SHOT 5: room About popup ----------
  console.log('== shot 5: explorations list -> room about ==');
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  await clickBtn(page, 'Longer Self-Explorations');
  await sleep(1200);
  console.log('list page:', await bodySig(page));
  await clickBtn(page, 'About this exploration');
  await sleep(1200);
  const dlg1 = await page.locator('dialog').count();
  console.log('dialog open:', dlg1);
  await page.screenshot({ path: SHOTDIR + '/room-about-popup.png' });
  console.log('SAVED room-about-popup.png');
  const close1 = page.locator('dialog button', { hasText: 'Close' }).first();
  if (await close1.count()) { await close1.click(); await sleep(800); }

  // ---------- SHOT 4: plant About popup ----------
  console.log('== shot 4: garden -> plant about ==');
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  await clickBtn(page, 'Longer Self-Explorations');
  await sleep(1200);
  const plantSpot = page.locator('button[data-room-id="plant"]').first();
  await plantSpot.waitFor({ state: 'attached', timeout: 15000 });
  await plantSpot.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(600);
  await plantSpot.click(); await sleep(1800);
  console.log('garden page:', await bodySig(page));
  await clickBtn(page, 'About this exploration');
  await sleep(1200);
  const dlg2 = await page.locator('dialog').count();
  console.log('dialog open:', dlg2);
  await page.screenshot({ path: SHOTDIR + '/about-popup-duplicated.png' });
  console.log('SAVED about-popup-duplicated.png');

  // ---------- SHOTS 1+2: seed cue, settings, remove ----------
  console.log('== shots 1/2: seed cue ==');
  await page.evaluate(() => {
    const cue = {
      optionId: 'USER.CUE.shot1',
      label: 'Cue: Calm, steady mornings before the phone wakes up',
      answerSourceId: 'shot-arr',
      destination: 'NOW.FEED.S01',
      semanticTag: 'cue', stateWrites: [], controlIntent: 'NONE'
    };
    localStorage.setItem('fsaw.addedAnswers.v1', JSON.stringify({ 'NOW.FEED.S01': [cue] }));
  });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  const opened = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const gear = btns.find(b =>
      /setting/i.test(b.getAttribute('aria-label') || '') ||
      b.getAttribute('data-act') === 'settings');
    if (gear) { gear.click(); return 'gear clicked'; }
    return 'GEAR NOT FOUND: ' + btns.map(b => (b.getAttribute('aria-label') || '').slice(0, 24)).join('|').slice(0, 280);
  });
  console.log('settings open:', opened);
  await sleep(1500);
  console.log('settings page:', await bodySig(page));
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-act="cue-remove"]');
    if (btn) btn.scrollIntoView({ block: 'center' });
  });
  await sleep(900);
  await page.screenshot({ path: SHOTDIR + '/settings-added-answers.png' });
  console.log('SAVED settings-added-answers.png');

  const rm = page.locator('button[data-act="cue-remove"]').first();
  await rm.waitFor({ state: 'visible', timeout: 8000 });
  await rm.click(); await sleep(2200);
  console.log('after remove:', await bodySig(page));
  await page.screenshot({ path: SHOTDIR + '/cue-remove-error.png' });
  console.log('SAVED cue-remove-error.png');

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FAILED:', String(e && e.message || e).slice(0, 600)); process.exit(1); });
