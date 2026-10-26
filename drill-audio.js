(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanaAudio=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  class AudioPlayback {
    constructor(media, stallMs=10000) { this.media=media; this.stallMs=stallMs; this.pending=null; }
    cancel() {
      if(this.pending)this.pending();
      this.media.pause();this.media.removeAttribute('src');this.media.load();
    }
    play(src, onStarted=()=>{}) {
      this.cancel();const media=this.media;
      return new Promise(resolve=>{
        let settled=false,timer=null,lastTime=0;
        const finish=result=>{
          if(settled)return;settled=true;clearTimeout(timer);
          media.removeEventListener('ended',ended);media.removeEventListener('error',error);media.removeEventListener('timeupdate',progress);
          this.pending=null;if(result!=='ended')media.pause();resolve(result);
        };
        const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>finish('timeout'),this.stallMs);};
        const ended=()=>finish('ended'),error=()=>finish('error');
        const progress=()=>{if(media.currentTime>lastTime){lastTime=media.currentTime;arm();}};
        this.pending=()=>finish('cancelled');
        media.addEventListener('ended',ended);media.addEventListener('error',error);media.addEventListener('timeupdate',progress);
        arm();media.src=src;
        try{Promise.resolve(media.play()).then(()=>{if(!settled)onStarted();},error);}catch{error();}
      });
    }
  }
  return {AudioPlayback};
});
