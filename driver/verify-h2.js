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
  await p.waitForTimeout(500);
  const fmt = await p.evaluate(() => {
    const cs = el => { const s = getComputedStyle(el); return [s.fontSize, s.fontWeight, s.textAlign, s.marginTop, s.marginBottom, s.lineHeight].join('|'); };
    return {
      checkins: cs(document.querySelector('[data-od-id="checkins"] h2')),
      templates: cs(document.querySelector('[data-od-id="home-templates"] h2'))
    };
  });
  assert.equal(fmt.templates, fmt.checkins, `identical formatting:\n  checkins: ${fmt.checkins}\n  templates: ${fmt.templates}`);
  assert.deepEqual(errors, []);
  console.log('PASS: Templates header formats identically to Check-Ins');
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
