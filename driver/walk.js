// Walkthrough driver: each invocation performs steps described in STEPS env (JSON array).
// A step: {click: "visible text"} | {wait: ms} | {shot: "name"} | {text: "into input with placeholder X", value: "..."}
// Always dumps console errors at the end.
const { chromium } = require('playwright-core');

(async () => {
  const steps = JSON.parse(process.env.STEPS || '[]');
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 200)); });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 200)));

  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  for (const s of steps) {
    if (s.click) {
      await page.click(`text=${s.click}`, { timeout: 8000 }).catch(e => console.log('CLICK FAILED:', s.click, String(e).slice(0,120)));
      await page.waitForTimeout(s.after || 1200);
    } else if (s.wait) {
      await page.waitForTimeout(s.wait);
    } else if (s.shot) {
      await page.screenshot({ path: `/tmp/${s.shot}.png` });
      console.log('SHOT:', s.shot);
    } else if (s.fill) {
      await page.fill(`text=${s.fill}`, s.value).catch(e => console.log('FILL FAILED', String(e).slice(0,120)));
      await page.waitForTimeout(600);
    } else if (s.press) {
      await page.keyboard.press(s.press);
      await page.waitForTimeout(800);
    } else if (s.role) {
      await page.getByRole(s.role, { name: s.name }).first().click({ timeout: 8000 }).catch(e => console.log('ROLE CLICK FAILED:', s.role, s.name, String(e).slice(0,120)));
      await page.waitForTimeout(s.after || 1200);
    } else if (s.phfill) {
      await page.getByPlaceholder(s.phfill).fill(s.value).catch(e => console.log('PHFILL FAILED', String(e).slice(0,120)));
      await page.waitForTimeout(600);
    } else if (s.reload) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      console.log('RELOADED');
    } else if (s.type) {
      await page.keyboard.type(s.type, { delay: 10 });
      await page.waitForTimeout(600);
    } else if (s.tapxy) {
      await page.touchscreen.tap(s.tapxy[0], s.tapxy[1]);
      await page.waitForTimeout(800);
    } else if (s.dblclickxy) {
      await page.mouse.dblclick(s.dblclickxy[0], s.dblclickxy[1]);
      await page.waitForTimeout(800);
    } else if (s.clickxy) {
      await page.mouse.click(s.clickxy[0], s.clickxy[1]);
      await page.waitForTimeout(800);
    } else if (s.list) {
      const items = await page.getByRole('button').all();
      const names = [];
      for (const it of items.slice(0, 60)) {
        let t = '';
        try { t = await it.innerText(); } catch (e) { t = '?'; }
        let a = '';
        try { a = await it.getAttribute('aria-label'); } catch (e) { a = ''; }
        names.push(t + ' // ' + a);
      }
      console.log('BUTTONS:', JSON.stringify(names.slice(0, 40)));
    } else if (s.fullshot) {
      await page.screenshot({ path: `/tmp/${s.fullshot}.png`, fullPage: true });
      console.log('FULLSHOT:', s.fullshot);
    }
  }
  const bodyText = (await page.innerText('body')).slice(0, 600);
  console.log('VISIBLE TEXT:', JSON.stringify(bodyText));
  console.log('ERRORS:', JSON.stringify([...new Set(errors)].slice(0, 10)));
  await browser.close();
})().catch(e => { console.error('DRIVER FAILED', String(e).slice(0,300)); process.exit(1); });
