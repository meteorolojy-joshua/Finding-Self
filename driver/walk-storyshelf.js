// Story-shelf walkthrough: room book -> shelf page, 3 levels with name tags,
// trash bin lid (drag-open / tap-toggle / keyboard), dotted add-book on the trolley,
// legacy Release migration, bookmark order on story page.
const { chromium } = require('playwright-core');

(async () => {
  const mobile = process.env.MOBILE === '1';
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    const stories = [
      { id: 's-keep', source: 'Kept tale', words: 'words kept', bookmark: 'Keep' },
      { id: 's-discard', source: 'Discarded tale', words: 'words discarded', bookmark: 'Discard' },
      { id: 's-change', source: 'Changed tale', words: 'words changed', bookmark: 'Change' },
      { id: 's-undecided', source: 'Maybe tale', words: 'words maybe', bookmark: 'Undecided' },
      { id: 's-fresh', source: 'Fresh tale', words: 'words fresh', bookmark: null },
      { id: 's-legacy', source: 'Legacy tale', words: 'words legacy', bookmark: 'Release' },
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
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const out = [];
  const note = (k, v) => { const line = k + ': ' + JSON.stringify(v); out.push(line); console.log(line); };
  const tag = mobile ? 'm' : 'd';

  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  note('tut-popup', await page.locator('text=Would you like a tutorial?').count());

  // home -> Self-Explorations room
  await page.click('button[data-act="longer-explorations"]');
  await page.waitForTimeout(1200);
  note('room-page', await page.evaluate(() => document.querySelector('#view [data-page]')?.dataset.page || document.querySelector('#view [data-od-id]')?.dataset.odId || null));
  await page.screenshot({ path: `/tmp/storyshelf-room-${tag}.png` });

  // click the story book -> must land on the SHELF page, not an individual story
  await page.click('[data-ract="open-story"]');
  await page.waitForTimeout(1000);
  const shelfState = () => page.evaluate(() => ({
    page: document.querySelector('#view [data-page]')?.dataset.page || null,
    levels: document.querySelectorAll('.shelf-level').length,
    keep: [...document.querySelectorAll('.shelf-level[data-level="keep"] .shelf-book b')].map(b => b.textContent),
    undecided: [...document.querySelectorAll('.shelf-level[data-level="undecided"] .shelf-book b')].map(b => b.textContent),
    change: [...document.querySelectorAll('.shelf-level[data-level="change"] .shelf-book b')].map(b => b.textContent),
    binBooks: [...document.querySelectorAll('.bin-mouth .bin-book b')].map(b => b.textContent),
    binLabel: document.querySelector('.bin-label')?.textContent || null,
    lidTip: document.querySelector('.bin-lid')?.dataset.tip || null,
    hasAddStory: !!document.querySelector('#view button[data-new="story-add"]'),
    hasKeepStories: !!document.querySelector('#view button[data-new="story-save"]'),
    hasLookOver: !!document.querySelector('#view button[data-new="story-review"]'),
    oldShelfGone: document.querySelectorAll('.story-shelf').length,
  }));
  note('shelf', await shelfState());
  note('add-book', await page.evaluate(() => {
    const b = document.querySelector('.book-trolley .story-add-book');
    if (!b) return null;
    const cs = getComputedStyle(b);
    return {
      onTrolley: true, notOnLevel: !b.closest('.shelf-level'),
      text: b.textContent.trim(), hasPlus: !!b.querySelector('svg'),
      noFill: cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent',
      dotted: cs.borderStyle.includes('dotted'), action: b.dataset.new,
    };
  }));
  note('level-tags', await page.evaluate(() =>
    [...document.querySelectorAll('.shelf-level')].map(l => ({
      level: l.dataset.level, tag: l.querySelector('.level-tag')?.textContent || null,
      groupLabel: l.getAttribute('aria-label'),
    }))));
  note('no-bookmark-small', await page.evaluate(() => document.querySelectorAll('#view .story-cover small').length));
  await page.screenshot({ path: `/tmp/storyshelf-closed-${tag}.png` });

  // dotted add-book -> new story page, then back to shelf shows it on the middle level
  await page.click('.story-add-book');
  await page.waitForTimeout(800);
  note('add-story-page', await page.evaluate(() => ({
    page: document.querySelector('#view [data-page]')?.dataset.page || null,
    identity: document.querySelector('.story-identity')?.textContent || null,
    pager: document.querySelector('.story-pages span')?.textContent || null,
  })));
  await page.click('button[data-new="story-shelf"]');
  await page.waitForTimeout(800);
  note('after-add-shelf', await page.evaluate(() => ({
    undecided: [...document.querySelectorAll('.shelf-level[data-level="undecided"] .shelf-book b')].map(b => b.textContent),
    addBookStillThere: !!document.querySelector('.book-trolley .story-add-book'),
  })));

  // hover the closed lid -> hover text
  const lid = page.locator('.bin-lid');
  await lid.hover();
  await page.waitForTimeout(300);
  note('lid-hover-tip', await page.evaluate(() => document.querySelector('.scn-tip.on')?.textContent || null));

  // drag the lid open (upwards)
  const box = await lid.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(cx, cy - i * 18, { steps: 2 }); await page.waitForTimeout(25); }
  await page.mouse.up();
  await page.waitForTimeout(600);
  note('after-drag', await page.evaluate(() => ({
    open: document.querySelector('.trash-bin-wrap').classList.contains('lid-open'),
    tip: document.querySelector('.bin-lid').dataset.tip,
    angle: document.querySelector('.bin-lid').style.transform,
  })));
  await page.screenshot({ path: `/tmp/storyshelf-open-${tag}.png` });

  // hover the open lid -> hover text
  await lid.hover();
  await page.waitForTimeout(300);
  note('lid-open-hover-tip', await page.evaluate(() => document.querySelector('.scn-tip.on')?.textContent || null));

  // click the open lid -> closes
  await lid.click();
  await page.waitForTimeout(600);
  note('after-click-close', await page.evaluate(() => ({
    open: document.querySelector('.trash-bin-wrap').classList.contains('lid-open'),
    tip: document.querySelector('.bin-lid').dataset.tip,
  })));

  // tap the closed lid -> opens (tap toggles the lid)
  await lid.click();
  await page.waitForTimeout(400);
  note('tap-closed-opens', await page.evaluate(() => ({
    open: document.querySelector('.trash-bin-wrap').classList.contains('lid-open'),
    tip: document.querySelector('.bin-lid').dataset.tip,
  })));

  // keyboard toggles both ways
  await lid.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  note('keyboard-toggle-close', await page.evaluate(() => document.querySelector('.trash-bin-wrap').classList.contains('lid-open')));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  note('keyboard-toggle-open', await page.evaluate(() => document.querySelector('.trash-bin-wrap').classList.contains('lid-open')));
  await page.click('.bin-mouth .bin-book b:has-text("Discarded tale")');
  await page.waitForTimeout(800);
  note('bin-book-open', await page.evaluate(() => ({
    page: document.querySelector('#view [data-page]')?.dataset.page || null,
    identity: document.querySelector('.story-identity')?.textContent || null,
    bookmarkOrder: [...document.querySelectorAll('.bookmark-stack')].map(b => b.getAttribute('aria-label')),
    placed: document.querySelector('.placed-bookmark')?.textContent.trim() || null,
    support: document.querySelector('#view .support')?.textContent.slice(0, 120) || null,
  })));
  await page.screenshot({ path: `/tmp/storyshelf-storypage-${tag}.png` });

  note('page-errors', errors);
  await browser.close();
})().catch((e) => { console.error('WALKTHROUGH FAILED:', e); process.exit(1); });
