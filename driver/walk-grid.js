// Grid 0-6 states + modify-template regression.
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
  const tag = mobile ? 'm' : 'd';
  const homeState = () => page.evaluate(() => ({
    hangCards: document.querySelectorAll('.checkin-grid .opt.hang').length,
    addBox: document.querySelectorAll('.checkin-add').length,
    cardTexts: [...document.querySelectorAll('.checkin-grid .opt.hang b')].map(b => b.textContent),
    gridCols: getComputedStyle(document.querySelector('.checkin-grid')).gridTemplateColumns,
  }));

  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('button[data-tut="no"]');
  await page.waitForTimeout(600);

  // seed 5 named customs, reload -> 5 cards + add box
  await page.evaluate(() => { for (let i = 1; i <= 5; i++) window.SCENARIO.createScenario('Seed ' + i, 'BLANK'); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const s5 = await homeState();
  console.log('five:', JSON.stringify(s5));
  await page.screenshot({ path: `/tmp/grid-five-${tag}.png` });

  // seed 1 more -> 6 cards, add box hidden
  await page.evaluate(() => { window.SCENARIO.createScenario('Seed 6', 'BLANK'); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const s6 = await homeState();
  console.log('six:', JSON.stringify(s6));
  await page.screenshot({ path: `/tmp/grid-six-${tag}.png` });

  // clear, then modify-template regression: editor shows laid-out template
  await page.evaluate(() => {
    window.SCENARIO.listScenarios().forEach(s => window.SCENARIO.deleteScenario(s.scenario_id));
    window.SCENARIO.setChosenStarterIds([]);
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('.checkin-add');
  await page.waitForTimeout(500);
  await page.click('button[data-cc="template"]');
  await page.waitForTimeout(800);
  await page.click('text=Before I Enter Social Media');
  await page.waitForTimeout(600);
  await page.click('button[data-tu="modify"]');
  await page.waitForTimeout(1200);
  const mod = await page.evaluate(() => ({
    editorOpen: document.querySelectorAll('.scn-editor-card').length,
    canvasText: document.querySelector('.scn-canvas').textContent.replace(/\s+/g, ' ').slice(0, 160),
    boxCount: document.querySelectorAll('.scn-canvas .scn-box').length,
  }));
  console.log('modify:', JSON.stringify(mod));
  await page.screenshot({ path: `/tmp/grid-modify-${tag}.png` });

  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
