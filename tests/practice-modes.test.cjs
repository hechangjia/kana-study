'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../drill-core.js');const items=JSON.parse(fs.readFileSync(path.join(__dirname,'../manifest.json'),'utf8')).characters;
const get=h=>items.find(x=>x.hira===h);
test('listening pool groups identical readings, not kana spellings',()=>{
 const pool=D.listeningPool(items);assert.equal(pool.length,101);assert.equal(new Set(pool.map(D.readingKey)).size,101);
 assert.equal(D.listeningPool([get('お'),get('を')]).length,1);assert.equal(D.listeningPool([]).length,0);
 assert.deepEqual(D.listeningPool([get('を')]),[get('を')]);
});
test('homophones accept equivalent roman spellings in both directions',()=>{
 for(const [glyphs,answers] of [[['お','を'],['o','wo']],[['じ','ぢ'],['ji','zi','di','dzi']],[['ず','づ'],['zu','du','dzu']]])
  for(const h of glyphs)for(const answer of answers)assert.equal(D.checkListening(get(h),answer,items),'correct',h+answer);
 assert.equal(D.check(get('お'),'wo'),'wrong','visual spelling quiz unchanged');
 assert.equal(D.checkListening(get('か'),'ga',items),'wrong');assert.equal(D.checkListening(get('し'),'s',items),'pending');
 for(const item of items)assert.equal(D.checkListening(item,item.romaji,items),'correct');
});
