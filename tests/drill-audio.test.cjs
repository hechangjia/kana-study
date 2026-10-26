'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {AudioPlayback}=require('../drill-audio.js');
class Media extends EventTarget {
 constructor(){super();this.currentTime=0;this.src='';this.calls=0;this.reject=false;}
 play(){this.calls++;return this.reject?Promise.reject(new Error('blocked')):Promise.resolve();}
 pause(){} load(){} removeAttribute(){this.src='';}
}
test('successful play waits for ended, not play() resolution',async()=>{
 const media=new Media(),audio=new AudioPlayback(media,50);let done=false;
 const task=audio.play('first.mp3').then(x=>{done=true;return x;});await Promise.resolve();assert.equal(done,false);
 media.dispatchEvent(new Event('ended'));assert.equal(await task,'ended');audio.cancel();
});
test('cancelled and superseded audio settles without stale completion',async()=>{
 const media=new Media(),audio=new AudioPlayback(media,50);const a=audio.play('a.mp3'),b=audio.play('b.mp3');assert.equal(await a,'cancelled');
 audio.cancel();assert.equal(await b,'cancelled');assert.equal(media.src,'');
 media.dispatchEvent(new Event('ended'));
});
test('decode error and blocked autoplay settle without hanging',async()=>{
 const media=new Media(),audio=new AudioPlayback(media,50);const task=audio.play('a.mp3');media.dispatchEvent(new Event('error'));assert.equal(await task,'error');
 media.reject=true;assert.equal(await audio.play('b.mp3'),'error');audio.cancel();
});
test('stalled load times out; progress extends deadline without truncating audio',async()=>{
 const media=new Media(),audio=new AudioPlayback(media,40);assert.equal(await audio.play('a.mp3'),'timeout');
 let done=false;const task=audio.play('b.mp3').then(x=>{done=true;return x;});
 for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,20));media.currentTime++;media.dispatchEvent(new Event('timeupdate'));assert.equal(done,false);}
 media.dispatchEvent(new Event('ended'));assert.equal(await task,'ended');audio.cancel();
});
