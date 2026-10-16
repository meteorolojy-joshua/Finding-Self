const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const p = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('fsaw.updated.v1') || '{}');
    d.stories = [{ source: 'Family', words: 'Work hard', bookmark: 'Keep' }];
    localStorage.setItem('fsaw.updated.v1', JSON.stringify(d));
  });
  await p.goto('file:///home/hatch/workspace/finding-self/app/index.html');
  await p.waitForTimeout(500);
  await p.evaluate(() => { const n = document.querySelector('[data-od-id="tutorial-offer"] [data-tut="no"]'); if (n) n.click(); });
  await p.waitForTimeout(300);
  await p.locator('[data-act="longer-explorations"]').click();
  await p.locator('.room-label-btn[data-ract="open-story"]').click({ force: true });
  await p.waitForTimeout(700);
  // click a book to open editor
  await p.locator('.story-cover').first().click();
  await p.waitForTimeout(700);
  const checks = await p.evaluate(() => ({
    noDragText: !document.body.textContent.includes('Drag a bookmark onto the book'),
    noStacks: !document.querySelector('.bookmark-stacks'),
    noPrev: !document.querySelector('[data-new="story-prev"]'),
    noNext: !document.querySelector('[data-new="story-next"]'),
    noAdd: !document.querySelector('[data-new="story-add"]'),
    noSave: !document.body.textContent.includes('Keep my stories'),
    hasReturn: document.body.textContent.includes('Return to bookshelf'),
    noView: !document.body.textContent.includes('View bookshelf'),
  }));
  console.log(JSON.stringify(checks));
  console.log('pageerrors:', errors.length ? errors : 'none');
  await p.screenshot({ path: '/tmp/book-editor.png', clip: { x: 290, y: 0, width: 520, height: 800 } });
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
