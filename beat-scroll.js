// Scroll-to-play at a predetermined speed (owner 10-25: "I need it to be a predetermined speed, so even if I scroll
// slow or fast it needs to play, but it also needs to be scrollable if people want it to be"):
//   * a forward scroll (any speed), a swipe up or ArrowDown/PageDown/Space plays the next part at its own set pace:
//     a chapter's film plays natively to the chapter's end (scene-playback.js playTo); between sections the page moves
//     with the same fixed glide (GLIDE_MS). How hard or fast someone scrolls changes nothing;
//   * scrolling forward again while a part plays QUEUES the next part (one at most), which follows straight on at the
//     same pace: nothing skips, nothing speeds up, and nobody is held at a part that has finished;
//   * the momentum a trackpad or smooth mouse keeps sending after a flick is recognised (its deltas only fade) and
//     ignored, so a hard flick counts the same as a gentle scroll;
//   * scrolling back, the menu links, keys back and dragging the scrollbar are ordinary scrolling and stop/clear it;
//     a backward wheel is eased into a steady glide (no 120 px jumps), so the film rewinds evenly.
// The flywheel (owner 10-25: "react real time so if I scroll even a little bit it reacts and plays, but it needs to
// account for the scroll speed then go to its own"): the part starts on the first event of a scroll; its film runs
// faster for a faster scroll (up to MAX_BOOST times its pace, from the wheel speed) and eases back to its own pace with
// time constant BOOST_TAU; scrolling on keeps it up, stopping lets it settle. A glide starts at the scroll's speed.
// If a film cannot start promptly (slow connection, a device that refuses to start video) the page moves through the
// chapter at the film's own pace instead. Chapters: the hero arrival (0-.25) and delivery (.25-DELIVERY_END), the
// tour's arrival / whole workflow / operator story, the numbers, the contact. Off with ?freescroll=1, ?edit=1 or
// reduced motion.
import {DELIVERY_END} from './intro-timing.js?v=1';
import {displays} from './original-display-framework.js?v=10';
const HANDOFF=.75;                       // atlas-stage.js: hand-offs take 1.5 screens, the inset is half of that
const GLIDE_MS=2400, GESTURE_GAP_MS=260, REQUEST_GAP_MS=900, STREAM_MS=1800, SWIPE_PX=28, START_MS=1500, SCRUB_FALLBACK_S=14;
const MAX_BOOST=2, BOOST_PER_PX_S=1/1800, BOOST_TAU=.6, BACK_EASE=.18;
export function installBeatScroll({stage,tracks,playback,getActive,readProgress}){
 const params=new URLSearchParams(location.search);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(params.has('freescroll')||params.has('edit'))return null;
 const body=document.body;body.dataset.beatScroll='1';
 let playing=null,gliding=null,scrubbing=false,queued=false,glideFrame=0,token=0;
 let lastWheel=0,requestAt=-1e9,touchY=null,touchDone=false;
 let boost=1,boostWall=0,boostFrame=0,backTarget=null,backFrame=0;
 const sections=()=>[...document.querySelectorAll('main > section')];
 function tourStarts(){
  // The tour as three things (owner 10-24: "I want the understand the job to be one scroll so it shows the entire
  // workflow from equipment to work all in one scroll"): the arrival at the job, the whole workflow (equipment,
  // vision, RTK, quote, work) and the operator story (grass in, product out, imagine). The fractions are where the
  // captions switch on the installed films: the desktop film (2302 frames, operator in the second half) and the
  // phone film (1381 frames, no operator, so its workflow runs to the end).
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
 // Something is already moving: one of our parts, our glide/scrub, or the page's own load-time autoplay.
 const busy=()=>!!playing||!!gliding||scrubbing||['playing','loading'].includes(body.dataset.animationPlayback||'');
 function stopMotion(){
  token++;
  if(gliding||scrubbing){cancelAnimationFrame(glideFrame);glideFrame=0;gliding=null;scrubbing=false;}
  if(playing||['playing','loading'].includes(body.dataset.animationPlayback||'')){playing=null;playback.pause({capture:true});}
  delete body.dataset.beatStep;
 }
 // The flywheel: the wheel's speed over the last 120 ms (px/s) -> a rate boost that decays toward 1 (the part's pace).
 const speedLog=[];
 function wheelSpeed(now){while(speedLog.length&&now-speedLog[0][0]>120)speedLog.shift();return speedLog.reduce((a,[,d])=>a+d,0)/.12;}
 function pushBoost(now){
  const target=Math.min(MAX_BOOST,1+wheelSpeed(now)*BOOST_PER_PX_S);
  if(target>boost)boost=target;
  if(!boostFrame){boostWall=now;boostFrame=requestAnimationFrame(decay);}
  playback.setRate(boost);
 }
 function decay(now){
  const dt=Math.max(0,(now-boostWall)/1000);boostWall=now;
  boost=1+(boost-1)*Math.exp(-dt/BOOST_TAU);
  if(boost<1.005)boost=1;
  playback.setRate(boost);
  boostFrame=boost>1?requestAnimationFrame(decay):0;
 }
 // A part has finished: the queued part (if any) follows straight on.
 function done(){
  delete body.dataset.beatStep;
  if(queued){queued=false;setTimeout(go,120);}
 }
 // The page's own load-time autoplay finishing also releases a part queued during it.
 document.addEventListener('motion:playback',e=>{if(e.detail?.mode==='paused'&&!playing&&!gliding&&!scrubbing&&queued)done();});
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
   if(m==='playing'){started=true;playback.setRate(boost);}
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
  const mine=++token;scrubbing=true;body.dataset.beatStep='1';const t0=performance.now();
  glideFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const k=Math.min(1,(now-t0)/ms);scrollTo(0,from+dy*k);
   if(k<1){glideFrame=requestAnimationFrame(frame);return;}
   scrubbing=false;glideFrame=0;done();
  });
 }
 function glide(chapter){
  // Between sections: the same fixed, eased move every time, then the chapter plays.
  const from=scrollY,dy=chapter.y-from;const mine=++token;gliding=chapter;body.dataset.beatStep='1';
  document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+chapter.section.id,beat:true}}));
  const t0=performance.now(),D=GLIDE_MS/1000;
  // Start at the scroll's own speed (never above what a smooth stop allows), then ease to rest at the chapter.
  const v0=Math.sign(dy)*Math.min(Math.abs(dy)*1.5/D,wheelSpeed(t0)),m0=v0*D/(dy||1);
  const shape=k=>m0>0?(k*k*k-2*k*k+k)*m0+(-2*k*k*k+3*k*k):easeInOut(k);
  glideFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const k=Math.min(1,(now-t0)/GLIDE_MS);scrollTo(0,from+dy*shape(k));
   if(k<1){glideFrame=requestAnimationFrame(frame);return;}
   gliding=null;glideFrame=0;
   requestAnimationFrame(()=>{if(mine!==token)return;if(!play(chapter))done();});
  });
 }
 // Start the next part: the one in front of them if it hasn't finished, else glide to the next one.
 function go(){
  if(busy())return;
  const here=current();
  if(here&&here.film){
   const active=getActive(),at=active&&active.track===here.section?readProgress(active):1;
   if(at<here.end-.004){if(!play(here))scrub(here);return;}
  }
  const n=next();if(n)glide(n);
 }
 // A forward request: start the next part, or queue it behind the one that's moving (one at most). Requests start on
 // the next task, after every listener of the gesture has run (the hero's own wheel listener pauses the opening film).
 function request(){
  setTimeout(()=>{if(busy()){if(next()||current()?.film)queued=true;}else go();},0);
 }
 function back(){queued=false;stopMotion();}
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
 const newGestureAt=(now,gap)=>gap>=GESTURE_GAP_MS;
 const inField=target=>!!target.closest?.('input,textarea,select,[contenteditable="true"],dialog[open]');
 const forwardAvailable=()=>!!next()||!!(current()?.film);
 addEventListener('wheel',event=>{
  if(reduced.matches||event.ctrlKey)return;
  const now=performance.now(),gap=now-lastWheel;lastWheel=now;
  const px=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
  if(px<0){recent.length=0;speedLog.length=0;back();if(!event.deltaX||Math.abs(event.deltaY)>=Math.abs(event.deltaX)){event.preventDefault();smoothBack(px);}return;}
  if(!(px>0))return;                                               // sideways: ordinary
  if(!forwardAvailable())return;                                   // past the last part: ordinary scrolling
  event.preventDefault();cancelBack();
  recent.push([now,Math.abs(px)]);speedLog.push([now,Math.abs(px)]);
  if(!fading(now))pushBoost(now);                                  // real scrolling speeds the film; coasting momentum doesn't
  const newGesture=newGestureAt(now,gap);
  const stillScrolling=!newGesture&&now-requestAt>=STREAM_MS&&!fading(now);
  if(!(newGesture||stillScrolling)||now-requestAt<REQUEST_GAP_MS)return;
  requestAt=now;request();
 },{passive:false});
 addEventListener('touchstart',event=>{touchY=event.touches[0].clientY;touchDone=false;},{passive:true});
 addEventListener('touchmove',event=>{
  if(touchY===null||reduced.matches||inField(event.target))return;
  const dy=touchY-event.touches[0].clientY;                        // positive: finger moves up = forward
  if(dy<-8){back();touchY=null;return;}                            // swipe down: ordinary scrolling
  if(!forwardAvailable())return;
  event.preventDefault();
  if(dy>SWIPE_PX&&!touchDone){touchDone=true;const now=performance.now();if(now-requestAt>=REQUEST_GAP_MS){requestAt=now;request();}}
 },{passive:false});
 addEventListener('touchend',()=>{touchY=null;},{passive:true});
 addEventListener('keydown',event=>{
  if(reduced.matches||inField(event.target)||event.altKey||event.metaKey||event.ctrlKey)return;
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
 const api={get boost(){return boost;},request,back,chapters,next,current,get playing(){return playing;},get gliding(){return gliding;},get queued(){return queued;},get scrubbing(){return scrubbing;}};
 window.__beats=api;
 return api;
}
