// Diagnostic: what's under the "Keep this note" button and is it clickable?
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('text=Make a note');
  await page.waitForTimeout(800);
  // add a words element and type into it
  const wordsBtn = page.getByRole('button', { name: 'Words' });
  await wordsBtn.click();
  await page.waitForTimeout(800);
  await page.mouse.click(640, 215);
  await page.waitForTimeout(400);
  await page.keyboard.type('Today I noticed the light through the leaves.');
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const states = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /keep this note/i.test(b.textContent || ''));
    return btns.map(b => {
      const r = b.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const under = document.elementFromPoint(cx, cy);
      const cs = getComputedStyle(b);
      return {
        text: (b.textContent || '').trim().slice(0, 40),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        disabled: b.disabled,
        ariaDisabled: b.getAttribute('aria-disabled'),
        pointerEvents: cs.pointerEvents,
        visibility: cs.visibility,
        display: cs.display,
        under: under ? (under.tagName + '.' + under.className.toString().slice(0, 60)) : 'none',
        underIsBtn: under === b,
        hasClickAttr: b.hasAttribute('onclick'),
      };
    });
  });
  console.log('WITH CONTENT:', JSON.stringify(states.map(s => ({ disabled: s.disabled, ariaDisabled: s.ariaDisabled, pointerEvents: s.pointerEvents })), null, 1));
  await browser.close();
})().catch(e => { console.error('DIAG FAILED', String(e).slice(0, 300)); process.exit(1); });
