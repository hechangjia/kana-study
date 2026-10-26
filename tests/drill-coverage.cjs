'use strict';
const assert=require('node:assert/strict'),path=require('node:path');const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{const b=await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const url=process.env.DRILL_URL||pathToFileURL(path.resolve(__dirname,'../drill.html')).href;
 await p.goto(url);await p.locator('#after-correct-audio').uncheck();await p.locator('#range-link').click();await p.locator('#clear-all').click();
 for(const[group,count]of [['hiragana-single',71],['hiragana-yoon',33],['katakana-single',71],['katakana-yoon',33]]){
  await p.locator(`[data-group="${group}"][data-action="all"]`).click();assert.equal(await p.locator(`#${group}-count`).innerText(),`${count} / ${count}`);
  assert.match(await p.locator('#pool-count').innerText(),new RegExp(String(count)));await p.locator(`[data-group="${group}"][data-action="none"]`).click();assert.ok(await p.locator('#empty-state').isVisible());
 }
 await p.locator('[data-stage="4"]').click();const seen=new Set();
 for(let i=0;i<208;i++){
  const q=await p.evaluate(()=>KANA_DATA.characters.find(x=>x.id===document.getElementById('question').dataset.id));seen.add(q.id);
  const accepted=await p.evaluate(id=>KanaDrill.answers(KANA_DATA.characters.find(x=>x.id===id)),q.id);
  await p.locator('#answer').fill(accepted[accepted.length-1]);await p.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');
 }
 assert.equal(seen.size,208);assert.equal(await p.locator('#stat-total').innerText(),'208');assert.equal(await p.locator('#stat-correct').innerText(),'208');
 // A correct answer followed immediately by clearing the pool must cancel the next-question timer.
 const q=await p.evaluate(()=>KANA_DATA.characters.find(x=>x.id===document.getElementById('question').dataset.id));await p.locator('#answer').fill(q.romaji);await p.locator('#clear-all').click();await p.waitForTimeout(300);assert.ok(await p.locator('#empty-state').isVisible());assert.equal(await p.locator('#stat-total').innerText(),'0');
 // A one-character pool can repeat without hanging.
 await p.locator('input[data-row="hiragana-single-basic-10"]').check();assert.equal(await p.locator('#question').innerText(),'ん');for(let i=0;i<3;i++){await p.locator('#answer').fill('n');await p.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');assert.equal(await p.locator('#question').innerText(),'ん');}
 // Invalid saved data is ignored, not a boot error.
 await p.evaluate(()=>localStorage.setItem('kana-study.drill.v1','{oops'));await p.reload();assert.match(await p.locator('#pool-count').innerText(),/71/);
 assert.deepEqual(errors,[]);console.log('PASS: all 208 questions answered with variants; group controls, timer cancellation, singleton, corrupt storage.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)})
