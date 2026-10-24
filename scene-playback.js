// The opening can autoplay once; scrolling then owns the timeline. During playback,
// decoded media time drives that same timeline, including captions and navigation.
export function installScenePlayback({getActive,readProgress,writeProgress,setPaused,reduced}){
 const buttons=[...document.querySelectorAll('.motion-button')];
 let owner=null,segment=null,mode='paused',generation=0,frame=0,abort=null,error='',lastUI='',completedOwner=null;
 let autoplayEnd=null,autoplayed=false,blockTimer=0;
 // Phones that refuse autoplay (iOS Low Power Mode, data saver, "never auto-play") keep the poster
 // and show the hero's tap-to-play pill: body[data-autoplay-blocked] drives that CSS.
 const touchFirst=matchMedia('(hover:none) and (pointer:coarse)');
 function markBlocked(value){clearTimeout(blockTimer);blockTimer=0;if((document.body.dataset.autoplayBlocked==='true')===value)return;if(value)document.body.dataset.autoplayBlocked='true';else delete document.body.dataset.autoplayBlocked;lastUI='';sync();}
 const clamp=v=>Math.max(0,Math.min(1,v));
 function sync(){
  if(owner&&getActive()!==owner){pause({capture:false});return;}
  const available=!!getActive()?.view?.preparePlayback&&!reduced.matches;
  const label=reduced.matches?'Animation disabled by reduced motion setting':mode==='loading'?'Cancel animation loading':mode==='playing'?'Pause animation':error?'Retry animation':'Play animation';
  const ui=JSON.stringify([available,label,mode,error]);if(ui===lastUI)return;lastUI=ui;
  for(const button of buttons){
   button.disabled=!available;button.setAttribute('aria-label',label);
   button.setAttribute('aria-pressed',String(mode==='playing'));
   button.setAttribute('aria-busy',String(mode==='loading'));
   button.title=error||label;button.textContent=mode==='loading'?'…':mode==='playing'?'Ⅱ':'▷';
  }
  document.body.dataset.animationPlayback=mode;
  document.dispatchEvent(new CustomEvent('motion:playback',{detail:{mode,error}}));
 }
 function position(){
  if(!owner||!segment)return;
  // Only ended advances across a segment boundary. Its final decoded frame
  // remains visible while the next segment is prepared.
  const fraction=Math.min(.999999,clamp(segment.video.currentTime/segment.duration));
  const p=segment.start+(segment.end-segment.start)*fraction;
  writeProgress(owner,p);owner.view.setPlaybackProgress?.(p);
 }
 function pause({capture=true}={}){
  generation++;abort?.abort();abort=null;cancelAnimationFrame(frame);frame=0;
  if(capture&&mode==='playing')position();
  if(segment){delete segment.video.dataset.timelinePlaying;segment.video.pause();}owner=null;segment=null;mode='paused';
  autoplayEnd=null;setPaused(true);sync();
 }
 function waitForMedia(video,target,signal){
  return new Promise((resolve,reject)=>{
   let sought=false;
   const events=['loadedmetadata','loadeddata','canplay','seeked','error'];
   const timeout=setTimeout(()=>finish(new Error('Animation is still loading. Press Play to retry.')),15000);
   function finish(error){clearTimeout(timeout);events.forEach(e=>video.removeEventListener(e,check));signal.removeEventListener('abort',cancel);error?reject(error):resolve();}
   function cancel(){finish(new DOMException('Playback cancelled','AbortError'));}
   function check(){
    if(video.error){finish(new Error('Animation could not load. Refresh and try again.'));return;}
    if(video.readyState<1)return;
    if(!sought){sought=true;const time=Math.min(target,Math.max(0,video.duration-.04));if(Math.abs(video.currentTime-time)>.035)video.currentTime=time;}
    if(video.readyState>=2&&!video.seeking)finish();
   }
   events.forEach(e=>video.addEventListener(e,check));signal.addEventListener('abort',cancel,{once:true});
   if(signal.aborted)cancel();else check();
  });
 }
 async function begin(nextOwner,at=readProgress(nextOwner)){
  const token=++generation;owner=nextOwner;mode='loading';error='';
  abort?.abort();abort=new AbortController();const signal=abort.signal;
  setPaused(false);sync();
  try{
   const next=await owner.view.preparePlayback({progress:at,signal});
   if(token!==generation)return;
   if(!next?.video||!(next.duration>0))throw new Error('Animation is not ready. Press Play to retry.');
   segment=next;const progress=clamp((at-next.start)/(next.end-next.start));
   await waitForMedia(next.video,progress*next.duration,signal);
   if(token!==generation)return;
   next.video.dataset.timelinePlaying='true';
   await next.video.play();
   if(token!==generation){if(segment?.video!==next.video)next.video.pause();return;}
   mode='playing';markBlocked(false);sync();frame=requestAnimationFrame(tick);
  }catch(cause){
   if(token!==generation)return;
   const wasAutoplay=autoplayEnd!==null;
   pause();if(cause.name!=='AbortError'){error=cause.message;if(cause.name==='NotAllowedError'||(wasAutoplay&&touchFirst.matches))markBlocked(true);sync();}
  }
 }
 function tick(){
  frame=0;if(mode!=='playing'||!segment)return;
  if(getActive()!==owner||document.hidden){pause({capture:getActive()===owner});return;}
  if(segment.video.ended||segment.video.currentTime>=segment.duration){
   const nextOwner=owner,end=segment.end,terminal=segment.terminal===true,finishIntro=autoplayEnd!==null&&end>=autoplayEnd;
   // Freeze old media before preparing the next segment.
   const settled=finishIntro?end-1e-6:end;
   delete segment.video.dataset.timelinePlaying;segment.video.pause();segment=null;mode='loading';writeProgress(nextOwner,settled);nextOwner.view.setPlaybackProgress?.(settled);
   if(end<1&&!finishIntro&&!terminal)begin(nextOwner,end);else{completedOwner=finishIntro?null:nextOwner;pause();}
   return;
  }
  const problem=segment.video.error?'Animation playback failed. Press Play to retry.':segment.video.paused?'Animation stopped. Press Play to resume.':'';
  if(problem){pause({capture:false});error=problem;sync();return;}
  position();frame=requestAnimationFrame(tick);
 }
 function toggle({end=null}={}){
  if(mode!=='paused'){pause();return;}
  const next=getActive();if(!next?.view?.preparePlayback||reduced.matches)return;
  const replay=next===completedOwner||readProgress(next)>=.99999;completedOwner=null;
  if(replay)writeProgress(next,0);
  autoplayEnd=end;begin(next,replay?0:readProgress(next));
 }
 // The hero pill stands in for the refused autoplay, so like autoplay it stops at the opening's end.
 buttons.forEach(button=>button.addEventListener('click',()=>toggle(button.classList.contains('hero-play')?{end:.25}:{})));
 const interrupt=()=>{completedOwner=null;if(mode!=='paused')pause();};
 addEventListener('wheel',interrupt,{passive:true});
 addEventListener('touchstart',event=>{if(!event.target.closest('.motion-button,#ve-motion'))interrupt();},{passive:true});
 addEventListener('keydown',event=>{
  if(event.target.closest('input,textarea,select,[contenteditable="true"],button'))return;
  if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End','Space'].includes(event.code))interrupt();
 });
 addEventListener('pointerdown',event=>{if(event.clientX>=document.documentElement.clientWidth)interrupt();});
 document.addEventListener('stage:navigate',interrupt);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
 addEventListener('resize',interrupt);reduced.addEventListener('change',()=>{interrupt();sync();});
 sync();return {pause,toggle,sync,autoplay(next,{end=.25}={}){
  if(autoplayed||mode!=='paused'||reduced.matches||!next?.view?.preparePlayback||getActive()!==next||readProgress(next)>.01)return false;
  autoplayed=true;autoplayEnd=end;begin(next,0);
  // A phone still not playing 3 s after the attempt gets the pill while the media keeps loading.
  if(touchFirst.matches)blockTimer=setTimeout(()=>{blockTimer=0;if(mode!=='playing')markBlocked(true);},3000);
  return true;
 },inspect:()=>({mode,error,section:owner?.track.id,time:segment?.video.currentTime,blocked:document.body.dataset.autoplayBlocked==='true'})};
}
