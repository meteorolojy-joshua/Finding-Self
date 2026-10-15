const { chromium } = require('playwright-core');
const EXE = '/opt/meta-chromium/chrome';
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'];
async function gardenPage(browser, opts = {}) {
  const page = await browser.newPage({ viewport: { width: opts.w || 1280, height: opts.h || 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 130)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 130)); });
  await page.addInitScript(() => { try { localStorage.setItem('fsaw.tutorial.v1', 'no'); } catch (e) {} });
  if (opts.reduceMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.EXPLORATIONS.routes.garden());
  await page.waitForTimeout(700);
  return { page, errors };
}
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ARGS });

  // 1. Delete flow via zoom.
  {
    const { page, errors } = await gardenPage(browser);
    await page.locator('.garden-pile').first().click(); await page.waitForTimeout(250);
    await page.locator('.growing-leaf:not(.filled)').first().click(); await page.waitForTimeout(1300);
    await page.getByLabel('What would you like to grow?').fill('to delete');
    await page.click('.leaf-zoom-panel button[type="submit"]'); await page.waitForTimeout(1400);
    await page.locator('.growing-leaf.filled').first().click(); await page.waitForTimeout(1300);
    await page.click('.leaf-zoom-panel [data-lz-delete]'); await page.waitForTimeout(300);
    const confirmVisible = await page.evaluate(() => !!document.querySelector('.leaf-zoom-panel [data-lz-delete-yes]'));
    await page.click('.leaf-zoom-panel [data-lz-delete-yes]'); await page.waitForTimeout(1400);
    const st = await page.evaluate(() => ({ filled: document.querySelectorAll('.growing-leaf.filled').length, ovGone: !document.querySelector('.leaf-zoom-ov') }));
    console.log('DELETE:', JSON.stringify({ confirmVisible, ...st }), 'errors:', errors.length ? errors : 'none');
    await page.close();
  }
  // 2. Language picker inside zoom.
  {
    const { page, errors } = await gardenPage(browser);
    await page.locator('.garden-pile').first().click(); await page.waitForTimeout(250);
    await page.locator('.growing-leaf:not(.filled)').first().click(); await page.waitForTimeout(1300);
    await page.click('.leaf-zoom-panel [data-new="garden-language"]'); await page.waitForTimeout(600);
    const langOpen = await page.evaluate(() => !!document.querySelector('dialog.language-dialog'));
    await page.click('dialog.language-dialog [data-suggestion]'); await page.waitForTimeout(300);
    await page.click('dialog.language-dialog button[type="submit"]'); await page.waitForTimeout(600);
    const words = await page.evaluate(() => document.querySelector('.leaf-zoom-panel textarea[name="words"]').value.slice(0, 30));
    await page.keyboard.press('Escape'); await page.waitForTimeout(1300); // cancel zoom
    console.log('LANGUAGE:', JSON.stringify({ langOpen, words }), 'errors:', errors.length ? errors : 'none');
    await page.close();
  }
  // 3. Reduced-motion fallback -> dialog.
  {
    const { page, errors } = await gardenPage(browser, { reduceMotion: true });
    await page.locator('.garden-pile').first().click(); await page.waitForTimeout(250);
    await page.locator('.growing-leaf:not(.filled)').first().click(); await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({ dialog: !!document.querySelector('dialog.leaf-dialog'), ov: !!document.querySelector('.leaf-zoom-ov') }));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    console.log('REDUCED-MOTION:', JSON.stringify(st), 'errors:', errors.length ? errors : 'none');
    await page.close();
  }
  // 4. Mobile 390px: no h-overflow, zoom works.
  {
    const { page, errors } = await gardenPage(browser, { w: 390, h: 844 });
    await page.locator('.garden-pile').first().click(); await page.waitForTimeout(250);
    await page.locator('.growing-leaf:not(.filled)').first().click(); await page.waitForTimeout(1400);
    const st = await page.evaluate(() => ({
      panel: !!document.querySelector('.leaf-zoom-panel'),
      noX: document.documentElement.scrollWidth <= 391,
      panelW: Math.round(document.querySelector('.leaf-zoom-panel').getBoundingClientRect().width)
    }));
    await page.screenshot({ path: '/tmp/zoom-mobile.png' });
    console.log('MOBILE:', JSON.stringify(st), 'errors:', errors.length ? errors : 'none');
    await page.close();
  }
  // 5. Drag-drop a pile onto a slot (phantom-click guard).
  {
    const { page, errors } = await gardenPage(browser);
    const pile = page.locator('.garden-pile').first();
    const slot = page.locator('.growing-leaf:not(.filled)').first();
    const pb = await pile.boundingBox(), sb = await slot.boundingBox();
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.mouse.down(); await page.waitForTimeout(400);
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2, { steps: 12 });
    await page.mouse.up(); await page.waitForTimeout(1500);
    const st = await page.evaluate(() => ({ ov: !!document.querySelector('.leaf-zoom-ov'), dialog: !!document.querySelector('dialog.leaf-dialog') }));
    console.log('DRAG-DROP:', JSON.stringify(st), 'errors:', errors.length ? errors : 'none');
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('FAILED', String(e).slice(0, 300)); process.exit(1); });
