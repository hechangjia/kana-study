/* Local freehand practice; user strokes live only in memory. No grading or uploads. */
(() => {
'use strict';
const canvas=document.getElementById('practice-pad'),ctx=canvas.getContext('2d'),guide=document.getElementById('pad-guide'),undo=document.getElementById('pad-undo'),status=document.getElementById('pad-status');
let item=null,strokes=[],active=null,pointer=null;
function paint(){
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,640,640);ctx.fillStyle='#f7f9fc';ctx.fillRect(0,0,640,640);
 ctx.strokeStyle='#dce4ef';ctx.lineWidth=1;ctx.setLineDash([7,7]);ctx.stroke(new Path2D('M320 0V640M0 320H640M0 0L640 640M640 0L0 640'));ctx.setLineDash([]);
 if(guide.checked&&item){ctx.save();ctx.scale(640/1024,640/1024);ctx.fillStyle='#dce5f1';for(const p of item.parts){const[s,x,y]=p.transform;ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fill(new Path2D(p.outline));ctx.restore();}ctx.restore();}
 ctx.strokeStyle='#247263';ctx.fillStyle='#247263';ctx.lineWidth=8;ctx.lineCap='round';ctx.lineJoin='round';
 for(const points of strokes){if(points.length===1){ctx.beginPath();ctx.arc(points[0].x,points[0].y,4,0,2*Math.PI);ctx.fill();continue;}ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();}
 undo.disabled=!strokes.length;status.textContent=strokes.length?`已写 ${strokes.length} 笔 · 练习不会自动保存`:'尚未书写 · 切换假名会清空练习';
 canvas.dataset.strokeCount=strokes.length;
}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*640/r.width,y:(e.clientY-r.top)*640/r.height};}
function finish(){if(pointer!==null&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;active=null;}
canvas.addEventListener('pointerdown',e=>{if(pointer!==null||e.button!==0)return;e.preventDefault();pointer=e.pointerId;active=[point(e)];strokes.push(active);canvas.setPointerCapture(pointer);paint();});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||!active)return;e.preventDefault();active.push(point(e));paint();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(e.pointerId===pointer)finish();});
guide.addEventListener('change',paint);undo.addEventListener('click',()=>{finish();strokes.pop();paint();});document.getElementById('pad-clear').addEventListener('click',()=>{finish();strokes=[];paint();});
window.KanaPractice={select(next){finish();item=next;strokes=[];canvas.setAttribute('aria-label',`${item.char} 手写练习画布，支持鼠标与触控`);paint();}};
paint();
})();
