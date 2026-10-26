'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.STUDY_URL||pathToFileURL(path.resolve(__dirname,'../index.html')).href;
const out=process.env.UI_TEST_OUTPUT||fs.mkdtempSync(path.join(require('node:os').tmpdir(),'kana-ui-'));fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});try{
const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);
const expected={basic:['a','k','s','t','n','h','m','y','r','w','n'],voiced:['g','z','d','b','p'],yoon:['ky','sh','ch','ny','hy','my','ry','gy','j','by','py']};
for(const script of ['hiragana','katakana']){
 await p.locator(`[data-script="${script}"]`).click();
 for(const group of ['basic','voiced','yoon']){
  await p.locator(`[data-group="${group}"]`).click();assert.deepEqual(await p.locator('.row-label').allTextContents(),expected[group]);
  const x=await p.locator('.row-label').first().boundingBox(),card=await p.locator('.kana-cell:not(.empty-slot)').first().boundingBox();assert.ok(x.x<card.x);
 }
}
await p.locator('[data-script="hiragana"]').click();await p.locator('[data-group="basic"]').click();
await p.locator('#search').fill('shi');assert.deepEqual(await p.locator('.row-label').allTextContents(),['s']);await p.locator('#clear-search').click();
await p.locator('#romaji-toggle').uncheck();assert.equal(await p.locator('.row-label').first().evaluate(e=>getComputedStyle(e).visibility),'hidden');await p.locator('#romaji-toggle').check();
assert.equal(await p.locator('.masthead a[href="sources.html"]').count(),0);assert.equal(await p.locator('footer a[href="sources.html"]').count(),1);
await p.locator('[data-id="hiragana-a"]').click();
let nav=await p.locator('.letter-nav').boundingBox(),drawing=await p.locator('.drawing-wrap').boundingBox(),title=await p.locator('.practice-title').boundingBox();assert.ok(nav.y>=title.y+title.height);assert.ok(nav.y+nav.height<=drawing.y);assert.ok(nav.y+nav.height<900);
await p.locator('#next').click();assert.equal(await p.locator('#selected-char').innerText(),'い');await p.locator('#previous').click();assert.equal(await p.locator('#selected-char').innerText(),'あ');await p.locator('#previous').click();assert.equal(await p.locator('#selected-char').innerText(),'ん');await p.locator('#next').click();assert.equal(await p.locator('#selected-char').innerText(),'あ');
await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
for(const width of [390,320]){
 await p.setViewportSize({width,height:844});await p.locator('[data-id="hiragana-a"]').click();
 nav=await p.locator('.letter-nav').boundingBox();drawing=await p.locator('.drawing-wrap').boundingBox();assert.ok(nav.y+nav.height<=drawing.y);assert.ok(nav.y>=0&&nav.y+nav.height<844);
 assert.ok((await p.locator('#next').boundingBox()).height>=44);
 await p.locator('#next').click();assert.equal(await p.locator('#selected-char').innerText(),'い');await p.locator('#previous').click();assert.equal(await p.locator('#selected-char').innerText(),'あ');
 await p.locator('#sheet-audio').click();await p.waitForFunction(()=>document.getElementById('player').currentTime>.03);
 await p.locator('#mobile-practice').evaluate(e=>e.scrollTop=200);nav=await p.locator('.letter-nav').boundingBox();const header=await p.locator('.sheet-header').boundingBox();assert.ok(nav.y>=header.y+header.height-1);assert.ok(nav.y+nav.height<844);
 assert.ok(await p.locator('#mobile-practice').evaluate(e=>e.scrollWidth<=e.clientWidth));await p.locator('#mobile-practice').evaluate(e=>e.scrollTop=0);
 await p.screenshot({path:path.join(out,`mobile-${width}.png`)});await p.locator('#sheet-close').click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
await p.goto(url.replace('index.html','drill.html'));assert.equal(await p.locator('.masthead a[href="sources.html"]').count(),0);assert.equal(await p.locator('footer a[href="sources.html"]').count(),1);assert.match(await p.locator('#pool-count').innerText(),/71/);
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({passed:true,checks:['all six charts use left Latin row labels','filtered irregular syllable row','hidden romaji hides row clues','top sources removed; footer retained','desktop navigation directly above drawing','forward/back/wraparound','390px and 320px top sticky mobile navigation','mobile audio playback','no overflow','drill navigation preserved'],errors},null,2));console.log('PASS: chart rows, navigation, header cleanup, desktop/mobile, playback.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
