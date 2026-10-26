'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=process.env.DRILL_TEST_OUTPUT || fs.mkdtempSync(path.join(require('node:os').tmpdir(),'kana-drill-'));
fs.mkdirSync(out,{recursive:true});
const url=process.env.DRILL_URL||pathToFileURL(path.resolve(__dirname,'../drill.html')).href;
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)requests.push([r.status(),r.url()]);});
  await page.goto(url);await page.locator('#question').waitFor();await page.locator('#after-correct-audio').uncheck();
  assert.match(await page.locator('#pool-count').innerText(),/71/);
  assert.equal(await page.locator('#drill-player').getAttribute('src'),null);
  const answer=page.locator('#answer');
  const question=()=>page.locator('#question').getAttribute('data-id');
  const current=()=>page.evaluate(()=>KANA_DATA.characters.find(x=>x.id===document.getElementById('question').dataset.id));
  const total=()=>page.locator('#stat-total').innerText();
  let q=await current();await answer.fill('xx');assert.equal(await total(),'0');assert.equal(await page.locator('#answer').getAttribute('aria-invalid'),null);
  await answer.press('Enter');assert.equal(await page.locator('#answer').getAttribute('aria-invalid'),'true');assert.equal(await total(),'0');
  await answer.fill(q.romaji);assert.equal(await answer.evaluate(e=>e.readOnly),false,'Keep keyboard editable during feedback');await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='1');
  assert.equal(await page.locator('#stat-correct').innerText(),'0');assert.equal(await page.locator('#stat-helped').innerText(),'1');
  await page.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');
  q=await current();await answer.fill(q.romaji);await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='2');await page.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');
  assert.equal(await page.locator('#stat-correct').innerText(),'1');assert.equal(await page.locator('#stat-streak').innerText(),'1');assert.equal(await page.evaluate(()=>document.activeElement.id),'answer');
  // Composition must not answer until the IME has committed.
  q=await current();await answer.dispatchEvent('compositionstart');await answer.fill(q.romaji);assert.equal(await total(),'2');await answer.dispatchEvent('compositionend');await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='3');await page.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');
  await page.locator('#reveal').click();assert.ok(await page.locator('#answer-hint').isVisible());q=await current();await answer.fill(q.romaji);await page.waitForFunction(()=>document.getElementById('stat-total').textContent==='4');await page.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');assert.equal(await page.locator('#stat-helped').innerText(),'2');
  await page.locator('#skip-question').click();assert.equal(await page.locator('#skip-count').innerText(),'跳过 1 题');assert.equal(await total(),'5');
  await page.locator('#range-link').click();
  for(const[stage,count]of [[2,104],[3,175],[4,208],[1,71]]){await page.locator(`[data-stage="${stage}"]`).click();assert.match(await page.locator('#pool-count').innerText(),new RegExp(String(count)));}
  await page.locator('#clear-all').click();assert.ok(await page.locator('#empty-state').isVisible());assert.ok(!(await answer.isVisible()));
  await page.reload();assert.ok(await page.locator('#empty-state').isVisible());
  await page.locator('#start-hiragana').click();assert.match(await page.locator('#pool-count').innerText(),/71/);
  // Narrow to one row and verify pool persistence and no out-of-range questions.
  await page.locator('#range-link').click();await page.locator('#clear-all').click();
  await page.locator('input[data-row="hiragana-single-basic-0"]').check();assert.match(await page.locator('#pool-count').innerText(),/5/);
  await page.locator('#resume-drill').click();assert.equal(await page.locator('#range-options').evaluate(e=>e.open),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'answer');await page.reload();assert.match(await page.locator('#pool-count').innerText(),/5/);
  const seen=new Set();for(let i=0;i<5;i++){q=await current();seen.add(q.id);assert.equal(q.row,0);assert.equal(q.script,'hiragana');await answer.fill(q.romaji);await page.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');}assert.equal(seen.size,5);
  await page.locator('.drill-audio summary').click();await page.locator('#drill-audio-source').selectOption('previous');q=await current();await page.locator('#listen').click();await page.waitForFunction(()=>document.getElementById('drill-player').currentTime>0);assert.equal(await page.locator('#drill-player').getAttribute('src'),q.audioAlternative);
  await page.locator('#stroke').click();assert.equal(await page.locator('#stroke-image').getAttribute('src'),q.gif);await page.waitForFunction(()=>{const e=document.getElementById('stroke-image');return e.complete&&e.naturalWidth>0});
  await page.locator('#range-link').click();await page.locator('#clear-all').click();await page.locator('input[data-row="hiragana-yoon-yoon-0"]').check();
  assert.ok(await page.locator('#drill-audio-fallback').isVisible());await page.locator('#listen').click();await page.waitForFunction(()=>document.getElementById('drill-player').currentTime>0);assert.match(await page.locator('#drill-player').getAttribute('src'),/audio-djt/);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kana-study.preferences.v1')).audioSource),'previous');
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.locator('#range-options').evaluate(e=>e.open=false);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  // Site navigation and legacy page entry are both present.
  await page.goto(url.replace('drill.html','index.html'));await page.locator('.masthead a[href="drill.html"]').click();assert.ok(page.url().includes('drill.html'));
  const isolated=await browser.newContext();const denied=await isolated.newPage();await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('storage denied');}})});await denied.goto(url);assert.match(await denied.locator('#pool-count').innerText(),/71/);await denied.locator('#skip-question').click();assert.equal(await denied.locator('#stat-total').innerText(),'1');await isolated.close();
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({passed:true,url,checks:['default pool','automatic advance and focus','Enter-only mistakes','composition','assisted scoring','skip','4 stages','empty saved pool','row selection and shuffle','saved range','previous audio playback','DJT fallback without preference loss','stroke GIF','390/320px layout','navigation','storage denied'],errors,requests},null,2));
  console.log('PASS: drill end-to-end tests',url);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
