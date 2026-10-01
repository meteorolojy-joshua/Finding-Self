// Ghost-card walkthrough: fresh profile, abandoned blank, typed blank,
// template as-is/modify regression, grid counts, desktop + mobile shots.
const { chromium } = require('playwright-core');

(async () => {
  const mobile = process.env.MOBILE === '1';
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const out = [];
  const note = (k, v) => { const line = k + ': ' + JSON.stringify(v); out.push(line); console.log(line); };
  const tag = mobile ? 'm' : 'd';

  const snap = () => page.evaluate(() => ({
    view: document.body.dataset.view || document.querySelector('#view')?.dataset?.page || null,
    popups: [...document.querySelectorAll('.scn-modal-backdrop h2, .modal h2, [role="dialog"] h2')].map(h => h.textContent.trim()),
    buttons: [...document.querySelectorAll('button')].slice(0, 40).map(b => (b.textContent || '').trim().slice(0, 30)),
  }));

  // FRESH profile: no seeds whatsoever
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  note('tut-popup', await page.locator('text=Would you like a tutorial?').count());
  await page.click('button[data-tut="no"]');
  await page.waitForTimeout(800);

  const homeState = () => page.evaluate(() => ({
    subtitle: (document.querySelector('.home-sec[data-od-id="checkins"] .support') || {}).textContent || null,
    hangCards: document.querySelectorAll('.checkin-grid .opt.hang').length,
    addBox: document.querySelectorAll('.checkin-add').length,
    cardTexts: [...document.querySelectorAll('.checkin-grid .opt.hang b')].map(b => b.textContent),
  }));
  note('fresh-home', await homeState());
  await page.screenshot({ path: `/tmp/ghost-fresh-${tag}.png` });

  // add -> scratch -> Exit without typing
  await page.click('.checkin-add');
  await page.waitForTimeout(600);
  note('choice-popup', await page.locator('text=Create from scratch or use template?').count());
  await page.click('button[data-cc="scratch"]');
  await page.waitForTimeout(1000);
  note('editor-box', await page.locator('text=Drag item here to edit').count());
  note('snap-after-scratch', await snap());
  const exitBtn = page.locator('header.app-bar nav button[data-nav="exit"]');
  note('exit-btn-count', await exitBtn.count());
  await exitBtn.first().click({ timeout: 10000 });
  await page.waitForTimeout(1000);
  note('after-abandon', await homeState());

  // add -> scratch -> type a question -> Exit
  await page.click('.checkin-add');
  await page.waitForTimeout(600);
  await page.click('button[data-cc="scratch"]');
  await page.waitForTimeout(1000);
  await page.click('.scn-focus .scn-clickedit');
  await page.waitForTimeout(800);
  await page.keyboard.type('How am I arriving today?', { delay: 8 });
  await page.waitForTimeout(600);
  await page.click('header.app-bar nav button[data-nav="exit"]');
  await page.waitForTimeout(1000);
  const withContent = await homeState();
  note('after-typing', withContent);
  await page.screenshot({ path: `/tmp/ghost-content-${tag}.png` });

  // reload: typed check-in persists, no ghost
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  note('after-reload', await homeState());

  // storage-level check: no pristine Untitled scenarios remain
  note('storage', await page.evaluate(() => ({
    pristine: window.SCENARIO.listScenarios().filter(s => window.SCENARIO.isPristineUntitled(s)).length,
    total: window.SCENARIO.listScenarios().length,
  })));

  // template regression: as-is adds a card, modify opens laid-out editor
  await page.click('.checkin-add');
  await page.waitForTimeout(600);
  await page.click('button[data-cc="template"]');
  await page.waitForTimeout(800);
  note('template-page', await page.locator('text=Choose a template').count());
  await page.click('text=Before I Enter Social Media');
  await page.waitForTimeout(600);
  note('use-or-modify', await page.locator('text=Use template as is or modify it yourself?').count());
  await page.click('button[data-tu="asis"]');
  await page.waitForTimeout(1000);
  note('after-asis', await homeState());
  await page.screenshot({ path: `/tmp/ghost-asis-${tag}.png` });

  console.log(out.join('\n'));
  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
