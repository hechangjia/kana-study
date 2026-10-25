/* Local UI and controlled SVG animation. No network or storage dependencies. */
(() => {
'use strict';
const data=window.KANA_DATA, core=window.KanaCore, $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
let script='hiragana',group='basic',selected=data.characters.find(x=>x.id==='hiragana-a'),time=0,playing=false,last=0,frame=0,drawParts=[],numberNodes=[];
const groups={basic:'清音',voiced:'浊音 / 半浊音',yoon:'拗音'}, scriptNames={hiragana:'平假名',katakana:'片假名'};
const audio=$('player');let audioToken=0;
const all=()=>core.filter(data.characters,script,group);
const visible=()=>core.filter(data.characters,script,group,$('search').value);
const currentAudio=()=>core.audioChoices(selected)[0];
function el(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
function stopAudio(){audioToken++;audio.pause();audio.removeAttribute('src');audio.load();$('audio-status').textContent=selected.audio?'点击播放，可反复聆听':'未收录，不使用单音拼接';$('audio-play').querySelector('span').textContent='听发音';}
function renderChart(){
 const rows=visible(),grid=$('kana-grid');grid.replaceChildren();grid.classList.toggle('yoon',group==='yoon');grid.classList.toggle('paired',$('paired-toggle').checked);
 const columns=group==='yoon'?['a','u','o']:['a','i','u','e','o'];
 grid.append(document.createElement('span'));
 for(const c of columns){const node=document.createElement('span');node.className='column-label';node.textContent=c;grid.append(node);}
 const rowIds=[...new Set(rows.map(x=>x.row))];
 for(const row of rowIds){
  const label=document.createElement('span');label.className='row-label';const rowItem=rows.find(x=>x.row===row);label.textContent=rowItem.rowLabel.replace('行','');label.lang='ja';grid.append(label);
  for(let col=0;col<columns.length;col++){
   const item=rows.find(x=>x.row===row&&x.col===col);
   if(!item){const empty=document.createElement('span');empty.className='kana-cell empty-slot';empty.setAttribute('aria-hidden','true');grid.append(empty);continue;}
   const b=document.createElement('button');b.className='kana-cell'+(item.id===selected.id?' selected':'');b.dataset.id=item.id;b.setAttribute('aria-pressed',String(item.id===selected.id));b.setAttribute('aria-label',`${item.char} ${item.displayRomaji}，查看笔顺`);
   const glyph=document.createElement('span');glyph.className='glyph';glyph.lang='ja';glyph.textContent=item.char;
   const pair=document.createElement('span');pair.className='glyph-pair';pair.append(glyph);
   const other=data.characters.find(x=>x.hira===item.hira&&x.script!==script);const secondary=document.createElement('span');secondary.className='pair-kana';secondary.lang='ja';secondary.textContent=other.char;pair.append(secondary);
   const roman=document.createElement('span');roman.className='romaji';roman.textContent=item.displayRomaji;const hint=document.createElement('span');hint.className='cell-hint';hint.textContent=`${item.strokes} 笔 · ${item.audio?'真人录音':'暂无录音'}`;hint.dataset.tier=item.audioTier;b.append(pair,roman,hint);b.addEventListener('click',()=>select(item));
   b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();let dest;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const i=rows.indexOf(item);dest=rows[(i+(e.key==='ArrowLeft'?-1:1)+rows.length)%rows.length];}else{const d=e.key==='ArrowUp'?-1:1;dest=rows.find(x=>x.row===item.row+d&&x.col===item.col)||item;}select(dest,false);grid.querySelector(`[data-id="${dest.id}"]`)?.focus();});grid.append(b);
  }
 }
 $('no-results').hidden=rows.length>0;
 $('chart-title').textContent=$('paired-toggle').checked?'平片对照 · '+scriptNames[script]+'笔顺':scriptNames[script]+'表';
 $('group-note').textContent=group==='yoon'?'小「ゃ・ゅ・ょ」与前字合读。此区提供笔顺素材，暂无拗音录音。':'按 a、i、u、e、o 排列。点选一个字，查看笔顺与发音。';
 $('coverage').textContent=group==='yoon'?'33 组拗音 · 暂无录音':group==='basic'?'46 个清音 · 全部真人录音':'25 个音 · 全部真人录音';
 document.querySelectorAll('[data-script]').forEach(b=>{b.classList.toggle('active',b.dataset.script===script);b.setAttribute('aria-pressed',String(b.dataset.script===script));});
 document.querySelectorAll('[data-group]').forEach(b=>{b.classList.toggle('active',b.dataset.group===group);b.setAttribute('aria-pressed',String(b.dataset.group===group));});
 $('clear-search').hidden=!$('search').value;
}
function drawBoard(){
 $('draw-defs').replaceChildren();$('draw-paths').replaceChildren();$('draw-numbers').replaceChildren();drawParts=[];numberNodes=[];
 const numbered=new Set(),background=el('g',{'data-layer':'ghosts'});$('draw-paths').append(background);
 selected.parts.forEach((p,i)=>{
  const [scale,x,y]=p.transform,wrap=el('g',{transform:`translate(${x} ${y}) scale(${scale})`});
  const clip=el('clipPath',{id:`clip-${i}`});clip.append(el('path',{d:p.outline}));$('draw-defs').append(clip);
  const ghost=el('path',{d:p.outline,fill:'#e0e6ee',transform:`translate(${x} ${y}) scale(${scale})`});background.append(ghost);const path=el('path',{d:p.median,'clip-path':`url(#clip-${i})`,fill:'none',stroke:'#21364b','stroke-width':128,'stroke-linecap':'round','stroke-linejoin':'round',pathLength:1000,'stroke-dasharray':'1000 1002','stroke-dashoffset':1001});wrap.append(path);$('draw-paths').append(wrap);drawParts.push({node:path,stroke:p.stroke});
  if(!numbered.has(p.stroke)){
   numbered.add(p.stroke);const pt=path.getPointAtLength(0);const cx=Math.max(32,Math.min(992,pt.x*scale+x-34)),cy=Math.max(32,Math.min(992,pt.y*scale+y-42));
   const badge=el('g');badge.append(el('circle',{cx,cy,r:24,fill:'#f7f9fc',stroke:'#9aabc3','stroke-width':2}));const txt=el('text',{x:cx,y:cy+10,'text-anchor':'middle',fill:'#315dcc','font-family':'Arial, sans-serif','font-size':30,'font-weight':600});txt.textContent=p.stroke;badge.append(txt);$('draw-numbers').append(badge);numberNodes.push({node:badge,stroke:p.stroke});
  }
 });
 $('drawing').setAttribute('aria-label',`${selected.char} 的笔顺，共 ${selected.strokes} 笔`);$('stroke-count').textContent=`${selected.strokes} 笔`;$('timeline').max=selected.strokes;
 $('draw-numbers').style.display=$('numbers-toggle').checked?'':'none';
}
function paint(){
 for(const p of drawParts){const progress=core.progress(time,p.stroke);p.node.style.strokeDashoffset=String(1001-progress*1001);p.node.setAttribute('stroke',progress>0&&progress<1?'#315dcc':'#21364b');}
 $('timeline').value=time;
 $('stroke-status').textContent=time>=selected.strokes?'完整字形':time<=0?'准备起笔':Number.isInteger(time)?`已完成 ${time} / ${selected.strokes} 笔`:`第 ${Math.min(selected.strokes,Math.floor(time)+1)} / ${selected.strokes} 笔`;
 $('play').textContent=playing?'Ⅱ 暂停':time>0&&time<selected.strokes?'▶ 继续':'▶ 播放笔顺';
}
function pause(){playing=false;cancelAnimationFrame(frame);paint();}
function tick(now){if(!playing)return;if(last){time+=(now-last)/1000*Number($('speed').value)/.95;}last=now;if(time>=selected.strokes){time=selected.strokes;playing=false;}paint();if(playing)frame=requestAnimationFrame(tick);}
function play(restart=false){if(restart||time>=selected.strokes)time=0;playing=true;last=0;cancelAnimationFrame(frame);paint();frame=requestAnimationFrame(tick);}
function noteFor(item){
 if(item.group==='yoon')return '先写大假名，再写右下侧的小假名。两字合读一拍；当前未收录对应录音，不能以两个单音代替。';
 const notes={wo:'「を」通常读 o，罗马音也常写作 wo。此处保留 wo 便于区分字形。',di:'「ぢ / ヂ」通常与「じ / ジ」同音。di 是区分拼写的标记，不要读成英语 di。',du:'「づ / ヅ」通常与「ず / ズ」同音。du 是区分拼写的标记，不要读成英语 du。',ha:'本音为 ha；「は」作提示主题的助词时读 wa。',he:'本音为 he；「へ」作方向助词时读 e。',n:'「ん」单独占一拍；实际发音会随相邻音变化。先听示范，再结合单词练习。',fu:'罗马音 fu。请听录音模仿，不要直接套用英语的 f 音。',shi:'罗马音 shi。注意与「し / シ」对应，而不是英语单词 she。',chi:'罗马音 chi，日文输入时也常用 ti。',tsu:'罗马音 tsu。与小「っ / ッ」不同，当前字是正常大小的「つ / ツ」。'};
 return notes[item.romaji]||'先观察起笔和行笔方向，再跟着笔画编号慢慢练习。点“下一笔”可分步查看。';
}
function select(item,animate=true){
 pause();selected=item;stopAudio();script=item.script;group=item.group;renderChart();
 $('selected-char').textContent=item.char;$('selected-romaji').textContent=item.displayRomaji;$('selected-kind').textContent=`${scriptNames[script]} / ${groups[group]}`;
 const opposite=data.characters.find(x=>x.hira===item.hira&&x.script!==script);$('counterpart').textContent=opposite.char;$('counterpart').setAttribute('aria-label',`切换到${opposite.char}`);$('counterpart-label').textContent=scriptNames[opposite.script];
 renderAudio();$('learning-note').textContent=noteFor(item);window.KanaPractice.select(item);
 for(const[type,key]of [['png','png'],['gif','gif'],['svg','svg'],['audio','audio']]){const link=$('download-'+type);link.hidden=!item[key];if(item[key]){link.href=item[key];link.removeAttribute('download');link.target='_blank';link.rel='noopener';}else link.removeAttribute('href');}
 const list=all();$('letter-index').textContent=`${list.indexOf(item)+1} / ${list.length}`;
 drawBoard();time=item.strokes;paint();if(animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)play(true);
}
$('play').addEventListener('click',()=>playing?pause():play());$('restart').addEventListener('click',()=>play(true));$('step').addEventListener('click',()=>{pause();time=time>=selected.strokes?1:Math.min(selected.strokes,Math.floor(time)+1);paint();});
// Read slider value before pause() updates the UI.
$('timeline').oninput=e=>{const value=Number(e.target.value);pause();time=value;paint();};
$('numbers-toggle').addEventListener('change',()=>{$('draw-numbers').style.display=$('numbers-toggle').checked?'':'none';});$('romaji-toggle').addEventListener('change',()=>{$('kana-grid').classList.toggle('no-romaji',!$('romaji-toggle').checked);});
function renderAudio(){
 const current=currentAudio();
 $('audio-play').disabled=!current;
 $('audio-caption').textContent=current?'真人录音 · 本地 MP3':'拗音录音尚未收录';
 $('audio-credit').textContent=current?selected.audioCredit:'未使用单音拼接或语音合成。';
 $('audio-status').textContent=current?'点击播放，可反复聆听':'未收录，不使用单音拼接';
 const link=$('download-audio');link.hidden=!current;if(current)link.href=current.src;else link.removeAttribute('href');
}
$('paired-toggle').addEventListener('change',renderChart);
$('audio-play').addEventListener('click',async()=>{
 const current=currentAudio();if(!current)return;const token=++audioToken;audio.pause();audio.src=current.src;audio.currentTime=0;
 try{await audio.play();if(token!==audioToken)return;$('audio-status').textContent='正在播放…';$('audio-play').querySelector('span').textContent='再听一次';}catch(error){if(token!==audioToken)return;$('audio-status').textContent='播放失败，请检查 assets 文件夹是否完整，或使用下方 MP3 链接。';}
});audio.addEventListener('ended',()=>{$('audio-status').textContent='播放完毕，可以再听一次';$('audio-play').querySelector('span').textContent='听发音';});
$('counterpart').addEventListener('click',()=>{const item=data.characters.find(x=>x.hira===selected.hira&&x.script!==script);$('search').value='';select(item);});
document.querySelectorAll('[data-script]').forEach(b=>b.addEventListener('click',()=>{if(script===b.dataset.script)return;$('search').value='';select(data.characters.find(x=>x.script===b.dataset.script&&x.hira===selected.hira));}));
document.querySelectorAll('[data-group]').forEach(b=>b.addEventListener('click',()=>{if(group===b.dataset.group)return;group=b.dataset.group;$('search').value='';select(all()[0],false);}));
$('search').addEventListener('input',renderChart);$('clear-search').addEventListener('click',()=>{$('search').value='';renderChart();$('search').focus();});
for(const[id,direction]of [['previous',-1],['next',1]])$(id).addEventListener('click',()=>{const list=all(),idx=list.indexOf(selected);$('search').value='';select(list[(idx+direction+list.length)%list.length]);});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();$('search').focus();}if(e.key==='Escape'&&e.target===$('search')){$('search').value='';renderChart();}});
select(selected,false);
})();
