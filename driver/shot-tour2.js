const { chromium } = require('playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.removeItem('fsaw.tutorial.v1');
      localStorage.setItem('fsaw.checkins.chosen.v1', JSON.stringify(['SS01', 'SS02', 'SS06']));
    } catch (e) {}
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0, 160)));
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await sleep(2000);
  // Accept the first-run tutorial offer.
  const yes = page.locator('[data-tut="yes"]').first();
  await yes.waitFor({ state: 'visible', timeout: 15000 });
  await yes.click();
  await sleep(1200);
  // Step 1: click the dotted add box; the popup opens and the tour advances to step 2.
  const add = page.locator('[data-act="add-checkin"]').first();
  await add.waitFor({ state: 'visible', timeout: 15000 });
  await add.click();
  await sleep(1500);
  // Wait until the tutorial box shows step 2's title.
  await page.waitForFunction(
    () => document.querySelector('.tut-box h2')?.textContent.includes('Use A Template'),
    null, { timeout: 10000 });
  await sleep(600);
  await page.screenshot({ path: '/home/hatch/workspace/screenshots/tour-step2-overlap.png' });
  console.log('step2 shot saved');
  // Continue to step 4: pick "Use template", then the first template card.
  const useTpl = page.locator('[data-od-id="create-choice"] [data-cc="template"]').first();
  await useTpl.click();
  await sleep(1500);
  await page.waitForFunction(
    () => document.querySelector('.tut-box h2')?.textContent.includes('Choose a Template'),
    null, { timeout: 10000 });
  const pick = page.locator('[data-act="template-pick"][data-starter="SS01"]').first();
  await pick.waitFor({ state: 'visible', timeout: 10000 });
  await pick.click();
  await sleep(1500);
  await page.waitForFunction(
    () => document.querySelector('.tut-box h2')?.textContent.includes('Use Template As It Is'),
    null, { timeout: 10000 });
  await sleep(600);
  await page.screenshot({ path: '/home/hatch/workspace/screenshots/tour-step4-overlap.png' });
  console.log('step4 shot saved');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
