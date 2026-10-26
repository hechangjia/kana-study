'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const url=process.env.DRILL_URL||pathToFileURL(path.resolve(__dirname,'../drill.html')).href;
(async()=>{const b=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);
 const get=()=>p.evaluate(()=>KANA_DATA.characters.find(x=>x.id===document.getElementById('question').dataset.id));
 await p.evaluate(()=>{window.audioEvents=[];const a=document.getElementById('drill-player');for(const type of ['playing','ended','error'])a.addEventListener(type,()=>audioEvents.push({type,src:a.getAttribute('src'),currentTime:a.currentTime,duration:a.duration,id:document.getElementById('question').dataset.id}));});
 let q=await get();await p.locator('#answer').fill(q.romaji);await p.waitForFunction(()=>audioEvents.some(x=>x.type==='ended'));
 assert.equal((await p.evaluate(()=>audioEvents.find(x=>x.type==='ended'))).id,q.id,'question must stay until ended');await p.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');
 assert.equal(await p.locator('#stat-correct').innerText(),'1');
 await p.locator('.drill-audio summary').click();await p.locator('#drill-audio-source').selectOption('previous');q=await get();await p.locator('#answer').fill(q.romaji);await p.waitForFunction(()=>audioEvents.filter(x=>x.type==='ended').length===2);assert.equal((await p.evaluate(()=>audioEvents.filter(x=>x.type==='ended')[1])).src,q.audioAlternative);await p.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');
 await p.locator('[data-mode="listen"]').click();assert.equal(await p.locator('#question').isVisible(),false);await p.locator('#listen-question').click();await p.waitForFunction(()=>document.getElementById('drill-player').currentTime>.03);await p.waitForFunction(()=>audioEvents.filter(x=>x.type==='ended').length===3);
 await p.locator('#after-correct-audio').uncheck();q=await get();await p.locator('#answer').fill(q.audioReading);await p.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');await p.waitForFunction(()=>audioEvents.filter(x=>x.type==='playing').length>=4);assert.equal(await p.locator('#stat-helped').innerText(),'0');assert.equal(await p.locator('#stat-correct').innerText(),'1');
 // A blocked audio prompt must remain usable and not count as answered.
 const denied=await b.newPage();await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked storage')}})});await denied.goto(url);await denied.locator('[data-mode="listen"]').click();await denied.locator('#focus-toggle').click();await denied.locator('#listen-question').click();await denied.waitForFunction(()=>document.getElementById('drill-player').currentTime>.03);await denied.close();
 assert.deepEqual(errors,[]);const events=await p.evaluate(()=>audioEvents);const ended=events.filter(x=>x.type==='ended');assert.ok(ended.every(x=>x.currentTime>=x.duration-.05));
 if(process.env.MODE_TEST_OUTPUT){fs.mkdirSync(process.env.MODE_TEST_OUTPUT,{recursive:true});fs.writeFileSync(path.join(process.env.MODE_TEST_OUTPUT,'real-audio.json'),JSON.stringify({passed:true,events,errors},null,2));}
 console.log('PASS: real DJT/prior correct audio ends before advance; listening auto-next audio; storage denied.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
