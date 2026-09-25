const outputDir=require('node:path').join(require('node:os').tmpdir(),'finding-self-validation');require('node:fs').mkdirSync(outputDir,{recursive:true});
const {chromium}=require('C:/Users/hurri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1000,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/app/index.html');await page.locator('[data-act="longer-explorations"]').waitFor();
 async function shot(name){await page.mouse.move(0,0);await page.waitForTimeout(350);await page.screenshot({path:path.join(outputDir,name+'-check.png'),fullPage:true});}
 async function longer(){await page.locator('[data-nav="exit"]').click();await page.locator('[data-ract="open-explore"]').waitFor();}
 async function saveDialog(){await page.locator('dialog button[type="submit"]').click();await page.locator('dialog').waitFor({state:'detached'});}
 await page.locator('[data-act="longer-explorations"]').click();await shot('explorations');
 await page.locator('[data-ract="open-lamp-room"]').click();
 await page.locator('[data-new="space"][data-id="1"]').click();await page.locator('dialog textarea').fill('A room with morning light');await saveDialog();
 assert.equal(await page.evaluate(()=>EXPLORATIONS.data.spaces['1'].words),'A room with morning light');
 await page.locator('[data-new="space"][data-id="2"]').click();await page.locator('dialog textarea').fill('Cancelled words');await page.locator('[data-new="close-modal"]').click();assert.equal(await page.evaluate(()=>EXPLORATIONS.data.spaces['2']),undefined);
 await shot('spaces');await longer();
 await page.locator('[data-ract="open-explore"]').click();
 const before=await page.evaluate(()=>NAV.debug.history.length);
 // Position via real keyboard events; torch movement itself must not navigate.
 await page.locator('.movable-torch').focus();for(let i=0;i<7;i++)await page.keyboard.press('ArrowUp');
 assert.equal(await page.evaluate(()=>NAV.debug.history.length),before);
 await shot('gems');await longer();
 await page.locator('[data-ract="open-story"]').click();await page.locator('[name="source"]').fill('A family saying');await page.locator('[name="words"]').fill('I have to be useful to belong.');await page.locator('[data-new="bookmark"][data-value="Change"]').click();await page.locator('[data-new="story-next"]').click();await page.locator('[name="words"]').fill('Curiosity is welcome.');await page.locator('[data-new="bookmark"][data-value="Keep"]').click();await page.locator('[data-new="story-prev"]').click();assert.equal(await page.locator('[name="words"]').inputValue(),'I have to be useful to belong.');await page.locator('[data-new="story-save"]').click();await shot('story');await page.locator('[data-new="story-shelf"]').click();await shot('bookshelf');await longer();
 await page.locator('[data-ract="open-belonging"] span').click();await page.locator('[data-new="contract"][data-id="1"]').click();await page.locator('[name="Name"]').fill('Creative circle');await page.locator('[name="Current Arrangement"]').fill('We make time to draw together.');const slider=page.locator('[role="slider"]').first();await slider.focus();await page.keyboard.press('End');await saveDialog();assert.equal(await page.evaluate(()=>EXPLORATIONS.data.contracts['1'].ratings.Safe),100);
 await page.locator('[data-new="contract"][data-id="2"]').click();assert.equal(await page.locator('[name="Name"]').inputValue(),'');assert.equal(await page.locator('[role="slider"]').first().getAttribute('aria-valuetext'),'Unanswered');await page.locator('[data-new="close-modal"]').click();await page.locator('[data-new="contract"][data-id="1"]').click();await shot('contract');await page.locator('[data-new="close-modal"]').click();await longer();
 await page.locator('[data-ract="open-practice"]').click();await page.locator('[data-new="garden-category"][data-id="interests"]').click();await page.locator('[data-new="garden-slot"][data-id="1"]').click();await page.locator('[name="words"]').fill('Drawing with no one watching');await saveDialog();await shot('garden');await page.locator('[data-new="growth-continue"]').first().click();await page.locator('#room-q2').fill('Not enough quiet time');await page.locator('[data-nav="settings"]').click();await page.locator('[data-nav="exit"]').click();assert.equal(await page.locator('#room-q2').inputValue(),'Not enough quiet time');await page.locator('[data-ract="p-next"]').click();await page.locator('#room-q3').fill('A quiet hour');await page.locator('[data-nav="back"]').click();assert.equal(await page.locator('#room-q2').inputValue(),'Not enough quiet time');
 await longer();await page.locator('[data-ract="open-influence"]').click();await shot('influences');await page.locator('[data-influence="book-0"]').fill('A book that stayed with me');await page.locator('[data-new="influence-continue"]').first().click();await shot('influence-sorting');
 await page.reload();await page.locator('[data-act="longer-explorations"]').waitFor();assert.equal(await page.evaluate(()=>EXPLORATIONS.data.stories[0].bookmark),'Change');assert.equal(await page.evaluate(()=>EXPLORATIONS.data.contracts['1'].fields.Name),'Creative circle');
 await page.setViewportSize({width:390,height:844});await shot('mobile-home');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log(JSON.stringify({passed:true,errors,checks:'Spaces isolation/cancel, story drafts/bookmarks/save/reload, per-contract values, keyboard sliders, growth integration, Back/Settings draft restoration, mobile width'},null,2));assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
