// Book-drag walkthrough: drag books between shelf levels and the bin;
// verify bookmark auto-updates and the story page shows the new bookmark.
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    const stories = [
      { id: 's-keep', source: 'Kept tale', words: 'words kept', bookmark: 'Keep' },
      { id: 's-discard', source: 'Discarded tale', words: 'words discarded', bookmark: 'Discard' },
      { id: 's-change', source: 'Changed tale', words: 'words changed', bookmark: 'Change' },
      { id: 's-undecided', source: 'Maybe tale', words: 'words maybe', bookmark: 'Undecided' },
    ];
    localStorage.setItem('fsaw.updated.v1', JSON.stringify({
      version: 2, contributions: {}, appearance: 'portrait-original', growthIntroSeen: false,
      roomState: null, garden: {}, spaces: {}, gems: {}, stories, contracts: {}, influences: {}, attachments: [],
    }));
    localStorage.setItem('fsaw.tutorial.v1', 'no');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)));
  const note = (k, v) => console.log(k + ': ' + JSON.stringify(v));
  const shelfBooks = (level) => page.evaluate((l) =>
    [...document.querySelectorAll(`.shelf-level[data-level="${l}"] .shelf-book b`)].map(b => b.textContent), level);
  const binBooks = () => page.evaluate(() =>
    [...document.querySelectorAll('.bin-book b')].map(b => b.textContent));

  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.click('button[data-act="longer-explorations"]');
  await page.waitForTimeout(1000);
  await page.click('[data-ract="open-story"]');
  await page.waitForTimeout(1000);
  note('start-keep', await shelfBooks('keep'));
  note('start-change', await shelfBooks('change'));

  // drag "Kept tale" from Keep level to Change level (mouse)
  const dragBook = async (bookSel, targetSel) => {
    const b = await page.locator(bookSel).boundingBox();
    const t = await page.locator(targetSel).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 12 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(800);
  };
  await dragBook('.shelf-level[data-level="keep"] .shelf-book', '.shelf-level[data-level="change"]');
  note('after-drag-keep', await shelfBooks('keep'));
  note('after-drag-change', await shelfBooks('change'));
  await page.screenshot({ path: '/tmp/bookdrag-shelf.png' });

  // open the moved book -> story page should show Change bookmark pressed
  await page.click('.shelf-level[data-level="change"] .shelf-book');
  await page.waitForTimeout(800);
  note('story-bookmark-pressed', await page.evaluate(() =>
    [...document.querySelectorAll('.bookmark-stack[aria-pressed="true"]')].map(b => b.getAttribute('aria-label'))));
  note('story-bookmark-img', await page.evaluate(() =>
    document.querySelector('.placed-bookmark img')?.getAttribute('src') || null));
  await page.screenshot({ path: '/tmp/bookdrag-story.png' });

  // back to shelf, drag "Maybe tale" from Undecided to the bin
  await page.click('button[data-new="story-shelf"]');
  await page.waitForTimeout(800);
  await dragBook('.shelf-level[data-level="undecided"] .shelf-book', '.trash-bin');
  note('after-bin-undecided', await shelfBooks('undecided'));
  // open lid to see bin contents
  const lid = await page.locator('.bin-lid').boundingBox();
  await page.mouse.move(lid.x + lid.width / 2, lid.y + lid.height / 2);
  await page.mouse.down();
  await page.mouse.move(lid.x + lid.width / 2, lid.y - 80, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  note('bin-contents', await binBooks());
  await page.screenshot({ path: '/tmp/bookdrag-bin.png' });

  // drag the book back OUT of the bin to the Keep level
  await dragBook('.bin-book[data-id="3"]', '.shelf-level[data-level="keep"]');
  note('after-restore-keep', await shelfBooks('keep'));
  await page.screenshot({ path: '/tmp/bookdrag-restored.png' });

  note('errors', errors);
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
