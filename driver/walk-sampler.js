// Sampler walkthrough: genuine practice-completion path, stitch flow, library,
// seasons, detail overlay, removal, empty state. Dumps console/page errors.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 300)); });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + String(err).slice(0, 300)));

  const shot = async (name) => {
    await page.screenshot({ path: `/tmp/${name}.png` });
    console.log('SHOT:', name);
  };
  const text = async () => (await page.innerText('body')).slice(0, 400);

  await page.goto('file:///home/hatch/workspace/finding-self/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. genuine path: jump to the S1 closing question, answer it for real
  await page.evaluate(() => { ENGINE.newRun(); ENGINE.Session.practiceId = 'PRACTICE:S1'; ENGINE.gotoNode('S1.13'); });
  await page.waitForTimeout(800);
  console.log('S1.13 visible:', JSON.stringify(await text()));
  await shot('s9-complete-question');
  await page.getByRole('button', { name: 'Me', exact: true }).click({ timeout: 8000 }).catch(e => console.log('ANSWER CLICK FAILED', String(e).slice(0, 120)));
  await page.waitForTimeout(1200);
  const completeText = await text();
  console.log('COMPLETE visible:', JSON.stringify(completeText));
  console.log('stitch button present:', completeText.includes('Stitch it into your sampler'));
  await shot('s9-complete-screen');

  // 2. stitch it in via the real button
  await page.getByRole('button', { name: 'Stitch it into your sampler', exact: true }).click({ timeout: 8000 }).catch(e => console.log('STITCH CLICK FAILED', String(e).slice(0, 120)));
  await page.waitForTimeout(800);
  const afterStitch = await text();
  console.log('after stitch:', JSON.stringify(afterStitch.slice(0, 200)));
  console.log('stitched confirmation shown:', afterStitch.includes('Stitched into your sampler.'));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fsaw.sampler.v1') || '[]').length);
  console.log('stitches in storage:', stored);

  // 3. library shows the stitch
  await page.evaluate(() => ENGINE.gotoNode('PRACTICE.LIBRARY'));
  await page.waitForTimeout(800);
  const libText = await text();
  console.log('library has sampler:', libText.includes('Your sampler'), '| cloth label:', /(\w+ sampler)/.exec(libText)?.[1]);
  await shot('s9-library-one-stitch');

  // 4. seed a fuller history: S2 now, two in past seasons
  await page.evaluate(() => {
    ENGINE.Sampler.addStitch('PRACTICE:S2', 'seed-r2');
    ENGINE.Sampler.addStitch('PRACTICE:S1', 'seed-r3', '2025-10-14T09:00:00');
    ENGINE.Sampler.addStitch('PRACTICE:S2', 'seed-r4', '2025-10-20T09:00:00');
    ENGINE.Sampler.addStitch('PRACTICE:S1', 'seed-r5', '2026-01-08T09:00:00');
    ENGINE.gotoNode('PRACTICE.LIBRARY');
  });
  await page.waitForTimeout(800);
  console.log('finished cloths shown:', (await text()).includes('Finished cloths'));
  await shot('s9-library-full');

  // 5. stitch detail overlay
  await page.click('.samp-patch[data-act="sampler-detail"]', { timeout: 8000 }).catch(e => console.log('PATCH CLICK FAILED', String(e).slice(0, 120)));
  await page.waitForTimeout(800);
  const overlayCount = await page.locator('.samp-overlay').count();
  const ovText = await page.locator('.samp-overlay').innerText().catch(() => '');
  console.log('overlay open:', overlayCount === 1 && ovText.includes('Practice again') && ovText.includes('Remove this stitch'));
  await shot('s9-stitch-detail');

  // 6. remove the stitch via the overlay
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('fsaw.sampler.v1') || '[]').length);
  await page.getByRole('button', { name: 'Remove this stitch', exact: true }).click({ timeout: 8000 }).catch(e => console.log('REMOVE FAILED', String(e).slice(0, 120)));
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('fsaw.sampler.v1') || '[]').length);
  console.log('remove works:', before, '->', after);

  // 7. past season view (click the finished-cloth button itself)
  await page.locator('[data-act="sampler-season"]').first().click({ timeout: 8000 }).catch(e => console.log('SEASON CLICK FAILED', String(e).slice(0, 120)));
  await page.waitForTimeout(800);
  const seasonText = await text();
  console.log('season view:', seasonText.includes('Autumn 2025 sampler'));
  await shot('s9-past-season');
  await page.getByRole('button', { name: 'Back to the Practice library' }).click({ timeout: 8000 }).catch(e => console.log('BACK FAILED', String(e).slice(0, 120)));
  await page.waitForTimeout(800);
  console.log('back to library:', (await text()).includes('Two practices are available'));

  // 8. empty state
  await page.evaluate(() => { localStorage.removeItem('fsaw.sampler.v1'); ENGINE.gotoNode('PRACTICE.LIBRARY'); });
  await page.waitForTimeout(800);
  const emptyText = await text();
  console.log('empty state shown:', emptyText.includes('waiting for its first stitch'));
  await shot('s9-library-empty');

  // 9. completion screen with no practice context: no stitch button, no crash
  await page.evaluate(() => { ENGINE.newRun(); ENGINE.gotoNode('PRACTICE.COMPLETE'); });
  await page.waitForTimeout(800);
  const noCtx = await text();
  console.log('no-context completion ok:', noCtx.includes('Practice complete.') && !noCtx.includes('Stitch it into your sampler'));

  console.log('ERRORS:', JSON.stringify([...new Set(errors)].slice(0, 10)));
  await browser.close();
})().catch(e => { console.error('DRIVER FAILED', String(e).slice(0, 300)); process.exit(1); });
