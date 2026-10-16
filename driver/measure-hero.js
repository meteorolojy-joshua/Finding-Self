const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1150 } });
  p.setDefaultTimeout(8000);
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.locator('[data-tut="no"]').click();
  await p.waitForTimeout(500);
  const info = await p.evaluate(() => {
    const hero = document.querySelector('.home-hero');
    const r = hero.getBoundingClientRect();
    const topbar = document.querySelector('.topbar, .gold-bar, header');
    return { heroTop: Math.round(r.y), topbarH: topbar ? Math.round(topbar.getBoundingClientRect().height) : null,
             topbarCls: topbar ? topbar.className : null, vh: window.innerHeight };
  });
  console.log(JSON.stringify(info));
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
