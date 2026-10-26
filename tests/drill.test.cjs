'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../drill-core.js');
const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'../manifest.json'),'utf8')).characters;
const item=h=>rows.find(x=>x.hira===h);
test('four categories partition all 208 characters without overlap',()=>{
 const groups=D.categories(rows);assert.deepEqual(groups.map(g=>g.rows.flatMap(r=>r.ids).length),[71,33,71,33]);
 const ids=groups.flatMap(g=>g.rows.flatMap(r=>r.ids));assert.equal(new Set(ids).size,208);
 assert.equal(D.pool(rows,[]).length,0);
 for(let stage=1;stage<=4;stage++)assert.equal(D.pool(rows,D.stageIds(rows,stage)).length,[71,104,175,208][stage-1]);
 assert.deepEqual(D.pool(rows,['unknown',rows[0].id,rows[0].id]),[rows[0]]);
});
test('all readings, common variants and special pronunciation mappings',()=>{
 for(const row of rows){assert.equal(D.check(row,row.romaji),'correct');assert.equal(D.check(row,row.audioReading),'correct');}
 for(const[h,variants]of [['し',['shi','si','ＳＨＩ',' SHI ']],['ち',['chi','ti']],['つ',['tsu','tu']],['ふ',['fu','hu']],['じ',['ji','zi']],['ぢ',['ji','di','zi','dzi']],['づ',['zu','du','dzu']],['を',['o','wo']],['しゃ',['sha','sya']],['しゅ',['shu','syu']],['ちゃ',['cha','tya','cya']],['ちょ',['cho','tyo','cyo']],['じゃ',['ja','jya','zya']],['じゅ',['ju','jyu','zyu']]])
  for(const v of variants)assert.equal(D.check(item(h),v),'correct',h+' '+v);
 assert.equal(D.check(item('し'),'s'),'pending');assert.equal(D.check(item('し'),'sh'),'pending');
 assert.equal(D.check(item('し'),''),'empty');assert.equal(D.check(item('し'),'xyz'),'wrong');
 assert.equal(D.check(item('は'),'wa'),'wrong');assert.equal(D.check(item('へ'),'e'),'wrong');
});
test('shuffle covers every item once per round; avoids adjacent repeats',()=>{
 const pool=rows.slice(0,5),bag=new D.Deck(pool,()=>0.3);let previous=null;
 for(let round=0;round<10;round++){
  const ids=[];for(let n=0;n<5;n++){const row=bag.next();assert.notEqual(row.id,previous);previous=row.id;ids.push(row.id);}
  assert.equal(new Set(ids).size,5);
 }
 bag.reset([rows[0]]);assert.equal(bag.next(),rows[0]);assert.equal(bag.next(),rows[0]);
 bag.reset([]);assert.equal(bag.next(),null);
});
