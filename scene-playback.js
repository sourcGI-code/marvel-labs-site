// The opening can autoplay once; scrolling then owns the timeline. During playback,
// decoded media time drives that same timeline, including captions and navigation.
// The arrival takes 14 seconds on screen. The new 60 fps export already has
// that timing; older 10-second exports retain their original slower playback.
// While someone keeps scrolling, beat-scroll.js speeds the playing film up (setRate, owner 10-26: "I am scrolling and it
// doesnt speed up the quote animation or the solo trailer ... I need it to smoothly scroll past it"), up to MAX_RATE.
// Scrolling back (owner 11-20: "scrolling up on the website on laptop isnt that great"): a browser cannot play a
// video backwards, and seeking frame by frame showed 7-13 pictures a second. A film may therefore carry its own
// frames a second time in reverse order after its end (timeline json `rewind`). A reverse segment
// ({reverse:true,rewindStart}) is ordinary playback of that second half; only the time <-> progress mapping flips.
import {waitPlayable} from './playthrough.js?v=3';
const OPENING_SECONDS=14;
const MAX_RATE=8;
const playRate=(base,boost)=>Math.round(Math.min(MAX_RATE,base*boost)*1e4)/1e4;
export function installScenePlayback({getActive,readProgress,writeProgress,setPaused,reduced}){
 const buttons=[...document.querySelectorAll('.motion-button')];
 let owner=null,segment=null,mode='paused',generation=0,frame=0,abort=null,error='',lastUI='',completedOwner=null;
 let autoplayEnd=null,autoplayed=false,blockTimer=0;
 // stopAt: beat-scroll.js plays the chapter's film to the next beat and no further (owner 10-24: one scroll per thing).
 let stopAt=null;
 // setRate: the stepper's flywheel (owner 10-25: react to the scroll at once, faster for a faster scroll, then settle
 // to the part's own pace) multiplies the part's base rate (the arrival's OPENING_RATE, else 1).
 let baseRate=1,rateBoost=1;
 const rewindBroken=new WeakSet();
 // Direction of the playback that is starting or running, so a rewind that is still loading is not started again.
 let direction=1;
 // Phones that refuse autoplay (iOS Low Power Mode, data saver, "never auto-play") keep the poster
 // and show the hero's tap-to-play pill: body[data-autoplay-blocked] drives that CSS.
 const touchFirst=matchMedia('(hover:none) and (pointer:coarse)');
 function markBlocked(value){clearTimeout(blockTimer);blockTimer=0;if((document.body.dataset.autoplayBlocked==='true')===value)return;if(value)document.body.dataset.autoplayBlocked='true';else delete document.body.dataset.autoplayBlocked;lastUI='';sync();}
 const clamp=v=>Math.max(0,Math.min(1,v));
 // Media time for a progress within a segment, and back. Reverse: the frame for progress `end` sits at
 // rewindStart, the frame for `start` one segment duration later.
 const mediaTime=(part,at)=>{const f=clamp((at-part.start)/(part.end-part.start));return part.reverse?part.rewindStart+(1-f)*part.duration:f*part.duration;};
 const mediaFraction=part=>part.reverse?clamp(1-(part.video.currentTime-part.rewindStart)/part.duration):Math.min(.999999,clamp(part.video.currentTime/part.duration));
 const mediaDone=part=>part.video.ended||part.video.currentTime>=(part.reverse?part.rewindStart+part.duration:part.duration);
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
  const p=segment.start+(segment.end-segment.start)*mediaFraction(segment);
  writeProgress(owner,p);owner.view.setPlaybackProgress?.(p);
 }
 function pause({capture=true}={}){
  generation++;abort?.abort();abort=null;cancelAnimationFrame(frame);frame=0;
  if(capture&&mode==='playing')position();
  if(segment){delete segment.video.dataset.timelinePlaying;segment.video.pause();}owner=null;segment=null;mode='paused';
  autoplayEnd=null;stopAt=null;setPaused(true);sync();
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
    // play() requests decoded frames. Waiting for loadeddata first can deadlock
    // a metadata-only preload, particularly on a fresh mobile visit.
    if(!video.seeking)finish();
   }
   events.forEach(e=>video.addEventListener(e,check));signal.addEventListener('abort',cancel,{once:true});
   if(signal.aborted)cancel();else check();
  });
 }
 async function begin(nextOwner,at=readProgress(nextOwner),{reverse=false}={}){
  const token=++generation;owner=nextOwner;mode='loading';error='';direction=reverse?-1:1;
  abort?.abort();abort=new AbortController();const signal=abort.signal;
  setPaused(false);sync();
  try{
   const next=await owner.view.preparePlayback({progress:at,signal,reverse});
   if(token!==generation)return;
   if(!next?.video||!(next.duration>0)||!!next.reverse!==reverse)throw new Error('Animation is not ready. Press Play to retry.');
   segment=next;
   next.video.muted=next.video.defaultMuted=true;next.video.playsInline=true;
   // Promote only the requested film; later chapters retain their lazy loading.
   if(next.video.preload!=='auto'){
    next.video.preload='auto';
    if(next.video.readyState<2)next.video.load();
   }
   await waitForMedia(next.video,mediaTime(next,at),signal);
   if(token!==generation)return;
   next.video.dataset.timelinePlaying='true';
   // Keep the approved 14-second arrival; decoded time keeps captions and
   // the hand-off in step with both the current and legacy movie exports.
   baseRate=(owner.track.id==='top'&&next.end<=.25+1e-6)?next.duration/OPENING_SECONDS:1;
   next.video.playbackRate=playRate(baseRate,rateBoost);
   // The opening starts as soon as the browser can play it. Scrolled chapters
   // retain their short buffering allowance before playback.
   const until=mediaTime(next,stopAt!==null?stopAt:reverse?next.start:next.end);
   // The buffering allowance is judged at no more than double speed: a scroll's
   // boost lasts a moment, and waiting for 8x of download would swallow the flick.
   if(autoplayEnd===null)await waitPlayable(next.video,{rate:Math.min(2*baseRate,playRate(baseRate,rateBoost)),until,maxWait:1200,signal});
   if(token!==generation)return;
   await next.video.play();
   if(token!==generation){if(segment?.video!==next.video)next.video.pause();return;}
   mode='playing';markBlocked(false);sync();frame=requestAnimationFrame(tick);
  }catch(cause){
   if(token!==generation)return;
   const wasAutoplay=autoplayEnd!==null;
   // A reversed copy that will not start is not an error the visitor must see:
   // scrolling back falls back to frame-by-frame seeking for this film.
   if(reverse){pause();if(cause.name!=='AbortError'){rewindBroken.add(nextOwner);console.warn('Scrolling back by seeking: the reversed copy did not start.',cause.message);sync();}return;}
   pause();if(cause.name!=='AbortError'){error=cause.message;if(cause.name==='NotAllowedError'||(wasAutoplay&&touchFirst.matches))markBlocked(true);sync();}
  }
 }
 function tick(){
  frame=0;if(mode!=='playing'||!segment)return;
  if(getActive()!==owner||document.hidden){pause({capture:getActive()===owner});return;}
  if(segment.reverse&&mediaDone(segment)){
   // Rewound to the start of this film. An earlier film of the same chapter continues the rewind.
   const nextOwner=owner,start=segment.start;
   delete segment.video.dataset.timelinePlaying;segment.video.pause();segment=null;mode='loading';writeProgress(nextOwner,start);nextOwner.view.setPlaybackProgress?.(start);
   if(start>1e-6&&(stopAt===null||stopAt<start-1e-4))begin(nextOwner,start,{reverse:true});else pause({capture:false});
   return;
  }
  if(mediaDone(segment)){
   const nextOwner=owner,end=segment.end,terminal=segment.terminal===true,finishIntro=autoplayEnd!==null&&end>=autoplayEnd;
   // Freeze old media before preparing the next segment.
   const settled=finishIntro?end-1e-6:end;
   delete segment.video.dataset.timelinePlaying;segment.video.pause();segment=null;mode='loading';writeProgress(nextOwner,settled);nextOwner.view.setPlaybackProgress?.(settled);
   if(end<1&&!finishIntro&&!terminal)begin(nextOwner,end);else{completedOwner=finishIntro?null:nextOwner;pause();}
   return;
  }
  const problem=segment.video.error?'Animation playback failed. Press Play to retry.':segment.video.paused?'Animation stopped. Press Play to resume.':'';
  if(problem){pause({capture:false});error=problem;sync();return;}
  if(stopAt!==null){
   const at=segment.start+(segment.end-segment.start)*mediaFraction(segment);
   if(segment.reverse?at<=stopAt+1e-4:at>=stopAt-1e-4){const target=stopAt,nextOwner=owner;writeProgress(nextOwner,target);nextOwner.view.setPlaybackProgress?.(target);pause({capture:false});return;}
  }
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
 // During a beat step the stepper owns input: its own back-scroll cancels; forward ticks are swallowed by it.
 const interrupt=()=>{if(document.body.dataset.beatStep)return;completedOwner=null;if(mode!=='paused')pause();};
 // With beat scrolling installed (body[data-beat-scroll]) the stepper owns wheel, touch and keys: a forward gesture
 // skips to the next chapter, a backward one stops the film. Other interrupts (navigation, tab hidden) stay here.
 const inputInterrupt=()=>{if(document.body.dataset.beatScroll)return;interrupt();};
 addEventListener('wheel',inputInterrupt,{passive:true});
 addEventListener('touchstart',event=>{if(!event.target.closest('.motion-button,#ve-motion'))inputInterrupt();},{passive:true});
 addEventListener('keydown',event=>{
  if(event.target.closest('input,textarea,select,[contenteditable="true"],button'))return;
  if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End','Space'].includes(event.code))inputInterrupt();
 });
 addEventListener('pointerdown',event=>{if(event.clientX>=document.documentElement.clientWidth)interrupt();});
 document.addEventListener('stage:navigate',interrupt);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
 let viewportWidth=innerWidth;
 addEventListener('resize',()=>{const widthChanged=Math.abs(innerWidth-viewportWidth)>1;viewportWidth=innerWidth;if(!touchFirst.matches||widthChanged)interrupt();});
 reduced.addEventListener('change',()=>{interrupt();sync();});
 sync();return {pause,toggle,sync,setRate(boost){
  rateBoost=Math.max(.25,Math.min(MAX_RATE,boost||1));
  if(segment&&mode==='playing'){const r=playRate(baseRate,rateBoost);if(Math.abs(segment.video.playbackRate-r)>=.02||(rateBoost===1&&segment.video.playbackRate!==r))segment.video.playbackRate=r;}
 },playTo(target){
  // Play the active chapter's film from where it is to `target` (a progress fraction), then pause there.
  const next=getActive();if(!next?.view?.preparePlayback||reduced.matches)return false;
  const at=readProgress(next);if(!(target>at+1e-4))return false;
  if(mode!=='paused')pause({capture:false});
  completedOwner=null;autoplayEnd=null;stopAt=target;begin(next,at);return true;
 },canRewind(){
  // True when the active film carries its reversed copy, so scrolling back can play instead of seeking.
  const next=getActive();return !reduced.matches&&!!next?.view?.canRewind?.()&&!rewindBroken.has(next);
 },rewindTo(target){
  // Play the active chapter's film backwards from where it is to `target`, then pause there.
  const next=getActive();if(!next?.view?.canRewind?.()||rewindBroken.has(next)||reduced.matches)return false;
  const at=readProgress(next);if(!(target<at-1e-4))return false;
  if(mode!=='paused')pause();
  completedOwner=null;autoplayEnd=null;stopAt=target;begin(next,at,{reverse:true});return true;
 },retarget(target){
  // continuous-scroll.js: another notch back while a rewind is starting or running moves its stop further back
  // without restarting it (a restart would seek into the reversed copy again).
  if(mode==='paused'||direction>0||stopAt===null||getActive()!==owner)return false;
  stopAt=Math.max(0,target);return true;
 },extendTo(target){
  // beat-scroll.js: still scrolling as the film nears its stop, so it runs on to a later stop without pausing.
  if(mode==='paused'||segment?.reverse)return false;
  const limit=stopAt??autoplayEnd;
  if(limit===null||target<=limit)return false;
  autoplayEnd=null;stopAt=target;return true;
 },autoplay(next,{end=.25,resume=false}={}){
  if(!next?.view?.preparePlayback)return false;
  const at=readProgress(next);
  if((autoplayed&&!resume)||mode!=='paused'||document.hidden||reduced.matches||getActive()!==next||at>=end-1e-4||(!resume&&at>.01))return false;
  autoplayed=true;autoplayEnd=end;begin(next,resume?at:0);
  // A phone still not playing 3 s after the attempt gets the pill while the media keeps loading.
  if(touchFirst.matches)blockTimer=setTimeout(()=>{blockTimer=0;if(mode!=='playing')markBlocked(true);},3000);
  return true;
 },inspect:()=>({mode,error,section:owner?.track.id,time:segment?.video.currentTime,reverse:mode!=='paused'&&direction<0,blocked:document.body.dataset.autoplayBlocked==='true'})};
}
