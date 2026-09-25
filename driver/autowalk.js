// Auto-walk: repeatedly click the first content option button until the screen stops changing or max steps.
const { chromium } = require('playwright-core');
(async () => {
  const startText = process.env.START; // text to click to enter the flow
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click(`text=${startText}`);
  await page.waitForTimeout(1000);
  let prev = '';
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    const text = await page.innerText('body');
    const sig = text.slice(0, 400);
    if (sig === prev) { console.log('STABLE after', i, 'steps'); break; }
    if (seen.has(sig)) { console.log('LOOP DETECTED at step', i); break; }
    seen.add(sig);
    prev = sig;
    // find first clickable option that isn't header nav
    const clicked = await page.evaluate(() => {
      const els = [...document.querySelectorAll('button, a')].filter(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 5 || r.height < 5) return false;
        const t = (el.innerText || '').trim();
        if (!t) return false;
        if (/^(back|exit|settings)$/i.test(t)) return false;
        if (/choose from more options|more options|write my own/i.test(t)) return false;
        if (/this doesn.t fit|reword it/i.test(t)) return false;
        // skip header area
        if (r.top < 90) return false;
        return true;
      });
      if (!els.length) return null;
      const t = els[0].innerText.trim().slice(0, 60);
      els[0].click();
      return t;
    });
    if (!clicked) { console.log('NO MORE OPTIONS at step', i); break; }
    console.log(`step ${i}: clicked "${clicked}"`);
    await page.waitForTimeout(900);
  }
  const finalText = (await page.innerText('body')).replace(/\s+/g, ' ').slice(0, 700);
  console.log('FINAL:', finalText);
  await page.screenshot({ path: '/tmp/fs-autowalk-end.png' });
  console.log('ERRORS:', JSON.stringify([...new Set(errors)]));
  await browser.close();
})().catch(e => { console.error('AUTOWALK FAILED', String(e).slice(0, 200)); process.exit(1); });
