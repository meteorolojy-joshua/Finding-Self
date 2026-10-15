const { chromium } = require('playwright-core');
(async () => {
  const errors = [];
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 140)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 140)); });
  await page.addInitScript(() => { try { localStorage.setItem('fsaw.tutorial.v1', 'no'); } catch (e) {} });
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.EXPLORATIONS.routes.garden());
  await page.waitForTimeout(800);

  // Open the zoom by clicking a dotted slot (after picking a pile).
  await page.locator('.garden-pile').first().click();
  await page.waitForTimeout(300);
  await page.locator('.growing-leaf:not(.filled)').first().click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: '/tmp/zoom-midflight.png' });
  const mid = await page.evaluate(() => ({
    ov: !!document.querySelector('.leaf-zoom-ov'),
    dialog: !!document.querySelector('dialog.leaf-dialog'),
    artVisible: (() => { const a = document.querySelector('.leaf-zoom-art'); if (!a) return null; const r = a.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })()
  }));
  console.log('MID-FLIGHT:', JSON.stringify(mid));
  await page.waitForTimeout(1200);
  const rest = await page.evaluate(() => ({
    panelVisible: getComputedStyle(document.querySelector('.leaf-zoom-panel')).visibility,
    panelOpacity: getComputedStyle(document.querySelector('.leaf-zoom-panel')).opacity,
    hasTitle: !!document.querySelector('.leaf-zoom-panel input[name="title"]'),
    hasWords: !!document.querySelector('.leaf-zoom-panel textarea[name="words"]'),
    focused: document.activeElement && document.activeElement.tagName,
    bgImg: getComputedStyle(document.querySelector('.leaf-zoom-panel .dialog-surface')).backgroundImage.slice(0, 70)
  }));
  console.log('AT REST:', JSON.stringify(rest));
  await page.screenshot({ path: '/tmp/zoom-open.png' });

  // Fill and confirm -> reverse zoom -> leaf placed.
  await page.getByLabel('Title').fill('Zoom Leaf');
  await page.getByLabel('What would you like to grow?').fill('zoom words');
  await page.click('.leaf-zoom-panel button[type="submit"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/zoom-return.png' });
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    ovGone: !document.querySelector('.leaf-zoom-ov'),
    filled: document.querySelectorAll('.growing-leaf.filled').length,
    pill: document.querySelector('.growing-leaf.filled .leaf-title')?.textContent || null,
    focusedSlot: document.activeElement?.dataset?.new || null
  }));
  console.log('AFTER SAVE:', JSON.stringify(after));

  // Reopen via the filled leaf, then ESC to cancel.
  await page.locator('.growing-leaf.filled').first().click();
  await page.waitForTimeout(1300);
  console.log('reopen panel:', await page.evaluate(() => !!document.querySelector('.leaf-zoom-ov')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  console.log('after ESC:', await page.evaluate(() => JSON.stringify({
    ovGone: !document.querySelector('.leaf-zoom-ov'),
    stillFilled: document.querySelectorAll('.growing-leaf.filled').length
  })));
  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
