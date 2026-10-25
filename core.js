(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanaCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const progress=(time,stroke)=>Math.max(0,Math.min(1,time-(stroke-1)));
 const toHira=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
 const aliases={ti:'chi',si:'shi',tu:'tsu',hu:'fu',zi:'ji'};
 const filter=(rows,script,group,search='')=>{let q=toHira(search.trim().toLowerCase());q=aliases[q]||q;return rows.filter(x=>x.script===script&&x.group===group&&(!q||toHira(x.char).includes(q)||x.hira?.includes(q)||x.romaji.includes(q)||x.displayRomaji?.includes(q)));};
 const audioChoices=item=>[item.audio?{key:'djt',src:item.audio,label:'DJT Kana',credit:item.audioCredit}:null,item.audioAlternative?{key:'previous',src:item.audioAlternative,label:'之前录音 · '+item.audioAlternativeProvider,credit:item.audioAlternativeCredit}:null].filter(Boolean);
 return {progress,filter,audioChoices,toHira};
});
