const fs=require('node:fs');const path=require('node:path');const {chromium}=require('playwright');
(async()=>{
const root=path.resolve(__dirname,'..'),work=path.join(__dirname,'.frames');fs.mkdirSync(work,{recursive:true});
const data=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage();
await page.setContent('<html><body><canvas id="c"></canvas><svg id="metrics" xmlns="http://www.w3.org/2000/svg" style="width:0;height:0"></svg></body></html>');
let count=0;
for(const item of data.characters){
 if(!(process.env.FORCE_YOON&&item.group==='yoon')&&fs.existsSync(path.join(work,item.id+'.json'))&&fs.existsSync(path.join(root,item.png)))continue;
 const result=await page.evaluate(item=>{
 const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),metrics=document.getElementById('metrics');metrics.replaceChildren();
 const parts=item.parts.map(p=>{const node=document.createElementNS('http://www.w3.org/2000/svg','path');node.setAttribute('d',p.median);metrics.append(node);return {...p,outlinePath:new Path2D(p.outline),medianPath:new Path2D(p.median),length:node.getTotalLength(),start:node.getPointAtLength(0)};});
 function draw(time,size){canvas.width=size;canvas.height=size;ctx.scale(size/1024,size/1024);ctx.fillStyle='#f7f9fc';ctx.fillRect(0,0,1024,1024);ctx.strokeStyle='#dce4ef';ctx.lineWidth=2;ctx.setLineDash([12,12]);ctx.stroke(new Path2D('M512 0V1024M0 512H1024M0 0L1024 1024M1024 0L0 1024'));ctx.setLineDash([]);
 for(const p of parts){const[s,x,y]=p.transform;ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#e0e6ee';ctx.fill(p.outlinePath);ctx.restore();}
 for(const p of parts){const progress=Math.max(0,Math.min(1,time-(p.stroke-1)));if(progress===0)continue;const[s,x,y]=p.transform;ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.clip(p.outlinePath);ctx.strokeStyle=progress<1?'#315dcc':'#21364b';ctx.lineWidth=128;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([p.length,p.length+4]);ctx.lineDashOffset=progress>=1?0:(1-progress)*p.length+1;ctx.stroke(p.medianPath);ctx.restore();}
 const seen=new Set();for(const p of parts){if(seen.has(p.stroke))continue;seen.add(p.stroke);const[s,x,y]=p.transform;const cx=Math.max(32,Math.min(992,p.start.x*s+x-34)),cy=Math.max(32,Math.min(992,p.start.y*s+y-42));ctx.beginPath();ctx.arc(cx,cy,24,0,2*Math.PI);ctx.fillStyle='#f7f9fc';ctx.fill();ctx.strokeStyle='#9aabc3';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#315dcc';ctx.font='600 30px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.stroke),cx,cy+1);}
 ctx.fillStyle='#607287';ctx.font='26px Arial';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(item.displayRomaji,25,22);ctx.textAlign='right';ctx.fillText(`${Math.min(item.strokes,Math.ceil(time))} / ${item.strokes}`,996,22);return canvas.toDataURL('image/png').split(',')[1];}
 const png=draw(item.strokes,512);const frames=[{png:draw(0,320),duration:350}];
 for(let stroke=1;stroke<=item.strokes;stroke++)for(let k=1;k<=8;k++)frames.push({png:draw(stroke-1+k/8,320),duration:k===8?160:80});frames[frames.length-1].duration=1400;
 return {png,frames};
 },item);
 fs.writeFileSync(path.join(root,item.png),Buffer.from(result.png,'base64'));fs.writeFileSync(path.join(work,item.id+'.json'),JSON.stringify(result.frames));
 if(++count%20===0)console.log('Rendered',count,'/',data.characters.length);
}
await browser.close();console.log('All PNG and animation frames rendered');
})().catch(e=>{console.error(e);process.exit(1)});
