'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../core.js');const root=path.resolve(__dirname,'..');const items=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')).characters;
const labels={basic:['a','k','s','t','n','h','m','y','r','w','n'],voiced:['g','z','d','b','p'],yoon:['ky','sh','ch','ny','hy','my','ry','gy','j','by','py']};
test('Latin row labels are stable for every kana, script and filtered row',()=>{
 for(const item of items)assert.equal(core.rowLabel(item),labels[item.group][item.row],item.id);
 for(const query of ['shi','chi','tsu','fu','じ','ぢ','を','しゅ']){
  const matches=items.filter(x=>x.char===query||x.romaji===query);
  for(const item of matches)assert.equal(core.rowLabel(item),labels[item.group][item.row]);
 }
});
test('header source links removed but footer attribution retained on both learning pages',()=>{
 for(const name of ['index.html','drill.html']){
  const html=fs.readFileSync(path.join(root,name),'utf8');
  assert.doesNotMatch(html.match(/<header[\s\S]*?<\/header>/)[0],/href="sources.html"/);
  assert.match(html.match(/<footer[\s\S]*?<\/footer>/)[0],/href="sources.html"/);
 }
});
test('previous and next are between character title and drawing, only one copy',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('class="practice-title"')<html.indexOf('class="letter-nav"'));
 assert.ok(html.indexOf('class="letter-nav"')<html.indexOf('class="drawing-wrap"'));
 for(const id of ['previous','next','sheet-audio'])assert.equal(html.split(`id="${id}"`).length-1,1);
});
