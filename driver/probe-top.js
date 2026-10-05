const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.click('button[data-tut="no"]');
  await page.waitForTimeout(500);
  await page.click('.checkin-add');
  await page.waitForTimeout(500);
  await page.click('button[data-cc="scratch"]');
  await page.waitForTimeout(1000);
  const info = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Exit' && x.offsetParent !== null);
    if (!b) return null;
    const gp = b.parentElement.parentElement;
    return { outer: b.outerHTML.slice(0, 120), parentTag: b.parentElement.tagName, parentHtml: b.parentElement.outerHTML.slice(0, 300), grandparent: gp ? gp.tagName + '.' + gp.className : null };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
