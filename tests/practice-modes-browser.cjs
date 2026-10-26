'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.DRILL_URL||pathToFileURL(path.resolve(__dirname,'../drill.html')).href;
const out=process.env.MODE_TEST_OUTPUT||fs.mkdtempSync(path.join(require('node:os').tmpdir(),'kana-modes-'));fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});try{
 const p=await b.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  window.mediaCalls=[];window.failAudio=false;
  HTMLMediaElement.prototype.play=function(){window.mediaCalls.push(this.getAttribute('src'));return window.failAudio?Promise.reject(new Error('blocked')):Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){};HTMLMediaElement.prototype.load=function(){};
 });
 const current=()=>p.evaluate(()=>KANA_DATA.characters.find(x=>x.id===document.getElementById('question').dataset.id));
 const id=()=>p.locator('#question').getAttribute('data-id');
 const finish=()=>p.locator('#drill-player').dispatchEvent('ended');
 const ready=()=>p.waitForFunction(()=>document.getElementById('answer').getAttribute('aria-busy')!=='true');
 await p.goto(url);assert.equal(await p.locator('#after-correct-audio').isChecked(),true);assert.equal(await p.evaluate(()=>mediaCalls.length),0);
 let q=await current();await p.locator('#answer').fill(q.romaji);assert.equal(await id(),q.id);assert.equal(await p.locator('#stat-total').innerText(),'1');assert.equal(await p.locator('#answer').getAttribute('aria-busy'),'true');assert.equal(await p.locator('#drill-player').getAttribute('src'),q.audio);
 await p.locator('#answer-form').dispatchEvent('submit');assert.equal(await p.locator('#stat-total').innerText(),'1');await finish();await ready();assert.notEqual(await id(),q.id);
 await p.locator('#after-correct-audio').uncheck();q=await current();let calls=await p.evaluate(()=>mediaCalls.length);await p.locator('#answer').fill(q.romaji);await ready();assert.equal(await p.evaluate(()=>mediaCalls.length),calls);
 // Audio failure exposes recovery; a retry and manual next do not double count.
 await p.locator('#after-correct-audio').check();await p.evaluate(()=>failAudio=true);q=await current();await p.locator('#answer').fill(q.romaji);await p.locator('#retry-audio').waitFor({state:'visible'});assert.equal(await id(),q.id);assert.match(await p.locator('#audio-message').innerText(),/失败/);
 const total=await p.locator('#stat-total').innerText();await p.evaluate(()=>failAudio=false);await p.locator('#retry-audio').click();await finish();await ready();assert.equal(await p.locator('#stat-total').innerText(),total);
 // Failed pronunciation can be skipped; turning off replay during playback also releases the answer.
 await p.evaluate(()=>failAudio=true);q=await current();await p.locator('#answer').fill(q.romaji);await p.locator('#retry-audio').waitFor({state:'visible'});await p.locator('#advance-question').click();assert.notEqual(await id(),q.id);await p.evaluate(()=>failAudio=false);
 q=await current();await p.locator('#answer').fill(q.romaji);await p.locator('#after-correct-audio').uncheck();assert.notEqual(await id(),q.id);await p.locator('#after-correct-audio').check();
 // Mode switch invalidates a pending correct-answer playback and its callback.
 q=await current();await p.locator('#answer').fill(q.romaji);await p.locator('[data-mode="listen"]').click();await finish();assert.equal(await p.locator('#stat-total').innerText(),'0');assert.equal(await p.locator('#answer').getAttribute('aria-busy'),null);
 assert.equal(await p.locator('#question').isVisible(),false);assert.equal(await p.locator('#question').innerText(),'');assert.equal(await p.locator('#listen-question').isVisible(),true);await p.evaluate(()=>failAudio=true);await p.locator('#listen-question').click();await p.locator('#retry-audio').waitFor({state:'visible'});assert.equal(await p.locator('#stat-helped').innerText(),'0');await p.evaluate(()=>failAudio=false);
 await p.locator('#listen-question').click();q=await current();await finish();assert.equal(await p.locator('#stat-helped').innerText(),'0');
 await p.locator('#after-correct-audio').uncheck();await p.locator('#answer').fill(q.audioReading);await ready();assert.equal(await p.locator('#stat-correct').innerText(),'1');assert.equal(await p.locator('#question').isVisible(),false);
 // Persistent listening mode must not play on reload, nor accept answers before playback.
 await p.reload();assert.equal(await p.evaluate(()=>mediaCalls.length),0);assert.equal(await p.locator('#question').isVisible(),false);q=await current();await p.locator('#answer').fill(q.romaji);assert.equal(await p.locator('#stat-total').innerText(),'0');assert.match(await p.locator('#feedback').innerText(),/播放/);
 // Saved singleton o still accepts wo: sound cannot distinguish spelling.
 await p.evaluate(()=>{localStorage.setItem('kana-study.drill.v1',JSON.stringify({ids:['hiragana-o']}));});await p.reload();await p.locator('#listen-question').click();await finish();await p.locator('#answer').fill('wo');await ready();assert.equal(await p.locator('#stat-correct').innerText(),'1');
 // A reveal is assistance; ordinary question playback isn't.
 await p.locator('#reveal').click();assert.equal(await p.locator('#question').isVisible(),true);await p.locator('#answer').fill('o');await ready();assert.equal(await p.locator('#stat-helped').innerText(),'1');
 await p.locator('#focus-toggle').click();assert.equal(await p.locator('#focus-toggle').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('.masthead').isVisible(),false);assert.equal(await p.locator('.drill-stats').isVisible(),false);assert.equal(await p.locator('#range-options').isVisible(),false);assert.equal(await p.locator('#answer').isVisible(),true);
 await p.reload();assert.equal(await p.locator('#focus-toggle').getAttribute('aria-pressed'),'true');assert.equal(await p.evaluate(()=>mediaCalls.length),0);await p.keyboard.press('Escape');assert.equal(await p.locator('.masthead').isVisible(),true);
 // Source switches during completion replay the chosen recording, with no stale auto-next.
 await p.locator('[data-mode="read"]').click();await p.locator('#after-correct-audio').check();q=await current();await p.locator('#answer').fill(q.romaji);
 await p.locator('.drill-audio summary').click();await p.locator('#drill-audio-source').selectOption('previous');assert.equal(await p.locator('#drill-player').getAttribute('src'),q.audioAlternative);assert.equal(await id(),q.id);await finish();await ready();
 // Cancelling playback to change range and simulated late ended cannot restart a question.
 q=await current();await p.locator('#answer').fill(q.romaji);await p.locator('#range-link').click();await p.locator('#clear-all').click();await finish();assert.equal(await p.locator('#empty-state').isVisible(),true);assert.equal(await p.locator('#stat-total').innerText(),'0');await p.locator('#start-hiragana').click();
 // Every listening question appears once per sound round, including a mixed-script pool.
 await p.locator('#range-link').click();await p.locator('[data-stage="4"]').click();await p.locator('[data-mode="listen"]').click();await p.locator('#after-correct-audio').uncheck();await p.locator('#listen-question').click();
 const sounds=new Set();
 for(let n=0;n<101;n++){q=await current();sounds.add(q.audioReading);await p.locator('#answer').fill(q.audioReading);await ready();}
 assert.equal(sounds.size,101);assert.equal(await p.locator('#stat-correct').innerText(),'101');
 await p.locator('[data-mode="read"]').click();await p.locator('#after-correct-audio').check();
 await p.locator('#range-options').evaluate(e=>e.open=false);await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 await p.locator('[data-mode="listen"]').click();await p.locator('#focus-toggle').click();
 for(const width of [390,320]){await p.setViewportSize({width,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await p.locator('#focus-toggle').isVisible());await p.screenshot({path:path.join(out,`focus-${width}.png`),fullPage:true});}
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({passed:true,listeningCoverage:101,checks:['default on; no startup autoplay','wait for ended','optional quick advance','no duplicate score','error retry','mode/source/range cancellation','hidden listening glyph','listening no assistance penalty','homophone o/wo','listening reload waits for gesture','reveal assisted','persistent focus + Escape','320/390px focus'],errors},null,2));console.log('PASS: audio/listening/focus interactions and cancellation.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
