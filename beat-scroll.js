// One scroll plays a part, the next scroll skips to the next part (owner 10-26: "a scroll is too fast right now ... we
// need the normal slow scroll to engage the animation but when they scroll down again they can skip it and go to the
// next"):
//   * a forward scroll (any speed), a swipe up or ArrowDown/PageDown/Space plays the next part at its own set pace:
//     a chapter's film plays natively to the chapter's end (scene-playback.js playTo); between sections the page moves
//     with the same fixed glide (GLIDE_MS) and the part there plays. How hard or fast someone scrolls changes nothing;
//   * scrolling forward again while a part plays (or while the page glides to one) skips it: a quick move (SKIP_*_MS)
//     to the start of the part after it, which then plays. Each further scroll skips one more part;
//   * one physical scroll is one request: events less than GESTURE_GAP_MS apart are one scroll, the momentum a trackpad
//     or smooth mouse keeps sending after a flick (its deltas only fade) belongs to it, and a part cannot be skipped by
//     the scroll that started it (SKIP_GUARD_MS). A scroll kept going for STREAM_MS counts as scrolling again;
//   * scrolling back, the menu links, keys back and dragging the scrollbar are ordinary scrolling and stop it;
//     a backward wheel is eased into a steady glide (no 120 px jumps), so the film rewinds evenly.
// If a film cannot start promptly (slow connection, a device that refuses to start video) the page moves through the
// chapter at the film's own pace instead. Chapters: the hero arrival (0-.25) and delivery (.25-DELIVERY_END), the
// tour's parts, the sections after it. Off with ?freescroll=1, ?edit=1 or reduced motion.
import {DELIVERY_END} from './intro-timing.js?v=1';
import {displays} from './original-display-framework.js?v=15-hiw-crew1';
const HANDOFF=.75;                       // atlas-stage.js: hand-offs take 1.5 screens, the inset is half of that
const GLIDE_MS=2400, SKIP_MIN_MS=450, SKIP_MAX_MS=1100, SKIP_PX_PER_MS=4, GESTURE_GAP_MS=400, REQUEST_GAP_MS=700;
const SKIP_GUARD_MS=1200, STREAM_MS=2000, SWIPE_PX=28, START_MS=1500, SCRUB_FALLBACK_S=14, BACK_EASE=.18;
export function installBeatScroll({stage,tracks,playback,getActive,readProgress}){
 const params=new URLSearchParams(location.search);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(params.has('freescroll')||params.has('edit'))return null;
 const body=document.body;body.dataset.beatScroll='1';
 let playing=null,gliding=null,scrubbing=null,glideFrame=0,token=0,actionAt=-1e9;
 let lastWheel=0,requestAt=-1e9,touchY=null,touchDone=false,backTarget=null,backFrame=0;
 const sections=()=>[...document.querySelectorAll('main > section')];
 function tourStarts(){
  // The tour as three things (owner 10-24: "I want the understand the job to be one scroll so it shows the entire
  // workflow from equipment to work all in one scroll"): the arrival at the job, the whole workflow (equipment,
  // vision, RTK, quote, work) and the operator story (grass in, product out, imagine). The fractions are where the
  // captions switch on the installed films: the desktop film (2302 frames, operator in the second half) and the
  // phone film (1381 frames, no operator, so its workflow runs to the end).
  // How it works (owner 10-26): grass in + product out / the drop-off / the drive to the next job / the whole workflow.
  if(body.dataset.fieldLeadFrames){const last=Number(body.dataset.fieldTimelineFrames)-1,lead=Number(body.dataset.fieldLeadFrames);
   return [0,Number(body.dataset.deliveryStartFrame)/last,lead/last,(lead+426)/last];}
  if(body.dataset.operatorSequence==='true')return [0,.185,.73];
  if(body.dataset.neighborhood!=='true')return [0,.097];
  const table=displays.filter(d=>d.section==='inside').map(d=>d.start).filter(p=>p>=0&&p<1);
  return [...new Set([0,...table])].sort((a,b)=>a-b);
 }
 function chaptersFor(section){
  const id=section.id;
  if(id==='top')return [{start:0,end:.25,film:true},{start:.25,end:DELIVERY_END,film:true}];
  if(id==='inside'){const s=tourStarts();return s.map((p,i)=>({start:p,end:i+1<s.length?s[i+1]:1,film:true}));}
  const d=displays.find(x=>x.section===id);
  return [{start:d?d.at:.15,end:1,film:false}];
 }
 function filmSeconds(chapter){
  // How long the chapter's film runs between its start and end, from the page's own videos.
  const id=chapter.section.id;let total=0;
  if(id==='top'){
   const opening=document.querySelector('video.opening-film'),cargo=chapter.section.querySelector('video.recorded-scene');
   total=chapter.start<.25?((opening?.duration||10)/.7)/.25:(cargo?.duration||18)/(DELIVERY_END-.25);
  }else{const v=chapter.section.querySelector('video.recorded-scene');total=v?.duration||SCRUB_FALLBACK_S/(chapter.end-chapter.start);}
  if(!(total>0))total=SCRUB_FALLBACK_S/(chapter.end-chapter.start);
  return total*(chapter.end-chapter.start);
 }
 function positionOf(section,index,p){
  const slot=stage.slot(section),vh=innerHeight,inset=index?vh*HANDOFF:0;
  return slot.offsetTop+inset+Math.max(0,Math.min(1,p))*(slot.offsetHeight-inset-vh*HANDOFF);
 }
 function chapters(){
  const out=[];
  sections().forEach((section,index)=>{for(const c of chaptersFor(section))out.push({...c,section,index,y:positionOf(section,index,c.start),yEnd:positionOf(section,index,c.end)});});
  return out.sort((a,b)=>a.y-b.y);
 }
 const current=()=>{const y=scrollY+4,all=chapters();let at=null;for(const c of all){if(c.y<=y)at=c;}return at;};
 const next=()=>chapters().find(c=>c.y>scrollY+4)||null;
 const easeInOut=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
 const autoplaying=()=>!playing&&['playing','loading'].includes(body.dataset.animationPlayback||'');
 // Something is already moving: one of our parts, our glide/scrub, or the page's own load-time autoplay.
 const busy=()=>!!playing||!!gliding||!!scrubbing||autoplaying();
 function stopMotion(){
  token++;
  if(gliding||scrubbing){cancelAnimationFrame(glideFrame);glideFrame=0;gliding=null;scrubbing=null;}
  if(playing||autoplaying()){playing=null;playback.pause({capture:true});}
  delete body.dataset.beatStep;
 }
 const done=()=>{delete body.dataset.beatStep;};
 function play(chapter){
  if(!chapter.film||reduced.matches||body.dataset.autoplayBlocked==='true')return false;
  const active=getActive();
  if(!active||active.track!==chapter.section||readProgress(active)>=chapter.end-.004)return false;
  if(!playback.playTo(chapter.end))return false;
  playing=chapter;body.dataset.beatStep='1';
  const mine=++token;let started=false;
  const fallback=()=>{if(mine!==token||playing!==chapter)return;playing=null;playback.pause({capture:false});scrub(chapter);};
  const watchdog=setTimeout(()=>{if(!started)fallback();},START_MS);
  const onPlayback=e=>{
   if(mine!==token){document.removeEventListener('motion:playback',onPlayback);clearTimeout(watchdog);return;}
   const m=e.detail?.mode;
   if(m==='playing')started=true;
   if(m==='paused'){clearTimeout(watchdog);document.removeEventListener('motion:playback',onPlayback);
    if(playing!==chapter)return;
    if(e.detail?.error||readProgress(active)<chapter.end-.02)fallback();else{playing=null;done();}}
  };
  document.addEventListener('motion:playback',onPlayback);
  return true;
 }
 function scrub(chapter){
  // The film cannot play here: move the page through the chapter at the film's own pace.
  const from=scrollY,to=chapter.yEnd,dy=to-from;if(Math.abs(dy)<2){done();return;}
  const remaining=Math.max(0,Math.min(1,dy/Math.max(1,chapter.yEnd-chapter.y)));
  const ms=Math.max(1500,filmSeconds(chapter)*remaining*1000);
  const mine=++token;scrubbing=chapter;body.dataset.beatStep='1';const t0=performance.now();
  glideFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const k=Math.min(1,(now-t0)/ms);scrollTo(0,from+dy*k);
   if(k<1){glideFrame=requestAnimationFrame(frame);return;}
   scrubbing=null;glideFrame=0;done();
  });
 }
 function glide(chapter,ms=GLIDE_MS){
  // An eased move to the part (the fixed GLIDE_MS between sections, quicker for a skip), then the part plays.
  const from=scrollY,dy=chapter.y-from;const mine=++token;gliding=chapter;body.dataset.beatStep='1';
  document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+chapter.section.id,beat:true}}));
  const t0=performance.now();
  glideFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const k=Math.min(1,(now-t0)/ms);scrollTo(0,from+dy*easeInOut(k));
   if(k<1){glideFrame=requestAnimationFrame(frame);return;}
   gliding=null;glideFrame=0;
   requestAnimationFrame(()=>{if(mine!==token)return;if(!play(chapter))done();});
  });
 }
 // Start the next part: the one in front of them if it hasn't finished, else glide to the next one.
 function go(){
  if(busy())return;
  actionAt=performance.now();
  const here=current();
  if(here&&here.film){
   const active=getActive(),at=active&&active.track===here.section?readProgress(active):1;
   if(at<here.end-.004){if(!play(here))scrub(here);return;}
  }
  const n=next();if(n)glide(n);
 }
 // Skip: the part that is playing (or being glided to) is passed over; a quick move to the part after it, which plays.
 function skip(){
  const owned=playing||gliding||scrubbing||(autoplaying()?current():null),all=chapters();
  const i=owned?all.findIndex(c=>c.section===owned.section&&Math.abs(c.start-owned.start)<1e-6):-1;
  const target=i>=0?all[i+1]:next();if(!target)return;
  stopMotion();actionAt=performance.now();
  const dist=Math.abs(target.y-scrollY);
  glide(target,Math.max(SKIP_MIN_MS,Math.min(SKIP_MAX_MS,dist/SKIP_PX_PER_MS)));
 }
 // A forward request: play the next part, or skip the one that is moving. Not the scroll that started it: a part is
 // only skipped SKIP_GUARD_MS after it began. Requests start on the next task, after every listener of the gesture
 // has run (the hero's own wheel listener pauses the opening film).
 function request(){
  setTimeout(()=>{
   if(!busy()){go();return;}
   if(performance.now()-actionAt>=SKIP_GUARD_MS)skip();
  },0);
 }
 function back(){stopMotion();}
 // Backward wheel: eased toward the wanted position each frame, so the page (and the film it scrubs) moves evenly.
 function smoothBack(dy){
  if(backTarget===null)backTarget=scrollY;
  backTarget=Math.max(0,backTarget+dy);
  if(!backFrame)backFrame=requestAnimationFrame(stepBack);
 }
 function stepBack(){
  const y=scrollY,d=backTarget-y;
  if(Math.abs(d)<.5){scrollTo(0,backTarget);backTarget=null;backFrame=0;return;}
  scrollTo(0,y+d*BACK_EASE);backFrame=requestAnimationFrame(stepBack);
 }
 function cancelBack(){if(backFrame)cancelAnimationFrame(backFrame);backFrame=0;backTarget=null;}
 // Momentum: a trackpad or smooth mouse keeps sending events after a flick, each weaker than the last. A stream only
 // counts as a new request when it is NOT fading (a finger still scrolling), checked over the last 300 ms.
 const recent=[];
 function fading(now){
  // Momentum: over the last 300 ms the steps keep shrinking (most consecutive steps smaller or equal, and the newest
  // clearly below the oldest). A finger still scrolling, or a wheel spun steadily, does not look like that.
  while(recent.length&&now-recent[0][0]>300)recent.shift();
  const d=recent.map(([,v])=>v);if(d.length<6)return false;
  let down=0;for(let i=1;i<d.length;i++)if(d[i]<=d[i-1]+.01)down++;
  return down/(d.length-1)>=.8&&d[d.length-1]<=d[0]*.97;
 }
 // The restored specs/story can be taller than a short screen. Let their
 // own content scroll before interpreting the next gesture as the next section.
 const scrollableSection=(target,active=false)=>target.closest?.('#sizes,#story')||(active&&['sizes','story'].includes(body.dataset.activeScene)?document.getElementById(body.dataset.activeScene):null);
 const scrollsWithin=(target,delta,active=false)=>{
  const section=scrollableSection(target,active);if(!section||!delta)return false;
  const remaining=section.scrollHeight-section.clientHeight;
  return remaining>2&&(delta>0?section.scrollTop<remaining-2:section.scrollTop>2);
 };
 const inField=target=>!!target.closest?.('input,textarea,select,[contenteditable="true"],dialog[open]');
 const forwardAvailable=()=>!!next()||!!(current()?.film);
 addEventListener('wheel',event=>{
  if(reduced.matches||event.ctrlKey)return;
  const now=performance.now(),gap=now-lastWheel;lastWheel=now;
  const px=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
  if(scrollsWithin(event.target,px))return;
  if(px<0){recent.length=0;back();if(!event.deltaX||Math.abs(event.deltaY)>=Math.abs(event.deltaX)){event.preventDefault();smoothBack(px);}return;}
  if(!(px>0))return;                                               // sideways: ordinary
  if(!forwardAvailable())return;                                   // past the last part: ordinary scrolling
  event.preventDefault();cancelBack();
  recent.push([now,Math.abs(px)]);
  const newGesture=gap>=GESTURE_GAP_MS;
  const stillScrolling=!newGesture&&now-requestAt>=STREAM_MS&&!fading(now);
  if(!(newGesture||stillScrolling)||now-requestAt<REQUEST_GAP_MS)return;
  requestAt=now;request();
 },{passive:false});
 addEventListener('touchstart',event=>{touchY=event.touches[0].clientY;touchDone=false;},{passive:true});
 addEventListener('touchmove',event=>{
  if(touchY===null||reduced.matches||inField(event.target))return;
  const dy=touchY-event.touches[0].clientY;                        // positive: finger moves up = forward
  if(scrollsWithin(event.target,dy))return;
  if(dy<-8){back();touchY=null;return;}                            // swipe down: ordinary scrolling
  if(!forwardAvailable())return;
  event.preventDefault();
  if(dy>SWIPE_PX&&!touchDone){touchDone=true;const now=performance.now();if(now-requestAt>=REQUEST_GAP_MS){requestAt=now;request();}}
 },{passive:false});
 addEventListener('touchend',()=>{touchY=null;},{passive:true});
 addEventListener('keydown',event=>{
  if(reduced.matches||inField(event.target)||event.altKey||event.metaKey||event.ctrlKey)return;
  const internalDelta=['ArrowUp','PageUp'].includes(event.code)?-1:['ArrowDown','PageDown','Space'].includes(event.code)?1:0;
  if(!(event.code==='Space'&&event.target.closest('button,a'))&&scrollsWithin(event.target,internalDelta,true)){
   event.preventDefault();const section=scrollableSection(event.target,true);
   section.scrollBy({top:internalDelta*(event.code.startsWith('Arrow')?60:section.clientHeight*.8),behavior:'smooth'});return;
  }
  if(['ArrowUp','PageUp','Home'].includes(event.code)){back();return;}
  if(!['ArrowDown','PageDown','Space'].includes(event.code))return;
  if(event.code==='Space'&&event.target.closest('button,a'))return;
  if(!forwardAvailable())return;
  event.preventDefault();
  const now=performance.now();if(event.repeat||now-requestAt<REQUEST_GAP_MS)return;
  requestAt=now;request();
 });
 document.addEventListener('stage:navigate',e=>{if(!e.detail?.beat)back();});   // a nav link or chapter click takes over
 addEventListener('resize',back);
 const api={request,back,chapters,next,current,get playing(){return playing;},get gliding(){return gliding;},get scrubbing(){return scrubbing;}};
 window.__beats=api;
 return api;
}
