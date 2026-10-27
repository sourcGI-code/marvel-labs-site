// Scroll and let go: the part plays at its normal speed. Scroll again: ordinary scrolling, and letting go it plays on
// (owner 10-26: "i need to be able to scroll and let go and it plays normal okay? the second swipe activates a scroll at
// normal speed to just scroll through but if someone lets go it continues"; "i want the normal speed no speed change"):
//   * a forward scroll (any speed), a swipe up or ArrowDown/PageDown/Space plays the next part at its normal speed:
//     a chapter's film plays natively to the chapter's end (scene-playback.js playTo); between sections the page moves
//     with the same fixed glide (GLIDE_MS) and the part there plays. The rest of that same scroll changes nothing;
//   * scrolling again while a part plays (or while the page glides to one) is ordinary scrolling: the page moves with
//     the wheel, trackpad or finger, slowed down (owner: "the second scroll speeds and goes crazy fast ... slow it
//     down"; then "too slow, maybe do 60 percent of scroll"): the page moves FOLLOW_GAIN of the scroll and never
//     faster than FOLLOW_MAX_RATE times the film's normal speed (FOLLOW_MAX_PX_S outside the films), as far as they like;
//   * letting go, the part they are in plays on at its normal speed from there to its end, then holds. Let go inside a
//     section without a film (numbers, specs, app) it stays there; in a hand-off it glides on to the next part. The
//     momentum a trackpad or smooth mouse sends after a flick (its deltas only fade) counts as letting go;
//   * films only ever run at their normal speed, never faster or slower;
//   * one physical scroll is one request: events less than GESTURE_GAP_MS apart are one scroll (its momentum too), and
//     the scroll that started a part only turns into scrolling if it keeps going for STREAM_MS (FOLLOW_GUARD_MS);
//   * ArrowDown/PageDown/Space while a part plays cuts to the start of the next part (no fast-forward);
//   * scrolling back, the menu links, keys back and dragging the scrollbar are ordinary scrolling and stop it;
//     a backward wheel is eased (no 120 px jumps), so the film rewinds evenly.
// If a film cannot start promptly (slow connection, a device that refuses to start video) the page moves through the
// chapter at the film's own pace instead. Chapters: the hero arrival (0-.25) and delivery (.25-DELIVERY_END), the
// tour's parts, the sections after it. Off with ?freescroll=1, ?edit=1 or reduced motion.
import {DELIVERY_END} from './intro-timing.js?v=1';
import {displays} from './original-display-framework.js?v=15-hiw-crew1';
const HANDOFF=.75;                       // atlas-stage.js: hand-offs take 1.5 screens, the inset is half of that
const GLIDE_MS=2400, GESTURE_GAP_MS=400, REQUEST_GAP_MS=700, FOLLOW_GUARD_MS=900, STREAM_MS=2000, RELEASE_MS=220;
const FOLLOW_TAU=.08, FOLLOW_GAIN=.6, FOLLOW_MAX_RATE=2.25, FOLLOW_MAX_PX_S=1350, FOLLOW_LEAD_S=.25;
const SWIPE_PX=28, START_MS=1500, SCRUB_FALLBACK_S=14;
export function installBeatScroll({stage,tracks,playback,getActive,readProgress}){
 const params=new URLSearchParams(location.search);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(params.has('freescroll')||params.has('edit'))return null;
 const body=document.body;body.dataset.beatScroll='1';
 let playing=null,gliding=null,scrubbing=null,glideFrame=0,token=0,actionAt=-1e9;
 let following=false,followTarget=null,followPos=0,followFrame=0,followWall=0,releaseTimer=0;
 let lastWheel=0,lastPx=0,requestAt=-1e9,momentum=false,touch=null;
 const sections=()=>[...document.querySelectorAll('main > section')];
 const maxScroll=()=>Math.max(0,document.documentElement.scrollHeight-innerHeight);
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
 // The visitor has the page: the wheel or trackpad is scrolling it, or a finger is dragging it.
 const holding=()=>following||!!touch?.drag;
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
 function glide(chapter){
  // Between sections: the same fixed, eased move every time, then the part plays.
  const from=scrollY,dy=chapter.y-from;const mine=++token;gliding=chapter;body.dataset.beatStep='1';
  document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+chapter.section.id,beat:true}}));
  const t0=performance.now();
  glideFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const k=Math.min(1,(now-t0)/GLIDE_MS);scrollTo(0,from+dy*easeInOut(k));
   if(k<1){glideFrame=requestAnimationFrame(frame);return;}
   gliding=null;glideFrame=0;
   requestAnimationFrame(()=>{if(mine!==token)return;if(!play(chapter))done();});
  });
 }
 // Start the next part: the one in front of them if it hasn't finished, else glide to the next one.
 function go(){
  if(busy()||holding())return;
  actionAt=performance.now();
  const here=current();
  if(here&&here.film){
   const active=getActive(),at=active&&active.track===here.section?readProgress(active):1;
   if(at<here.end-.004){if(!play(here))scrub(here);return;}
  }
  const n=next();if(n)glide(n);
 }
 // A key press while a part is moving: cut to the start of the part after it, which plays (no fast-forward); to the
 // next section, cut to the end of this section's film and take the usual glide.
 function skip(){
  const owned=playing||gliding||scrubbing||(autoplaying()?current():null),all=chapters();
  const i=owned?all.findIndex(c=>c.section===owned.section&&Math.abs(c.start-owned.start)<1e-6):-1;
  const target=i>=0?all[i+1]:next();if(!target)return;
  stopMotion();actionAt=performance.now();
  if(owned&&target.section===owned.section){cut(target);return;}
  const last=owned?.film?all.filter(c=>c.section===owned.section).at(-1):null;
  if(last&&scrollY<last.yEnd)scrollTo(0,last.yEnd);
  glide(target);
 }
 function cut(chapter){
  const mine=++token;gliding=chapter;body.dataset.beatStep='1';
  document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+chapter.section.id,beat:true}}));
  scrollTo(0,chapter.y);
  // Two frames for the stage to switch chapter and the film to seek, then the part plays.
  glideFrame=requestAnimationFrame(()=>{glideFrame=requestAnimationFrame(()=>{if(mine!==token)return;gliding=null;glideFrame=0;if(!play(chapter))done();});});
 }
 // Requests start on the next task, after every listener of the gesture has run.
 function request(){setTimeout(()=>{if(!busy())go();else if(!holding()&&performance.now()-actionAt>=FOLLOW_GUARD_MS)skip();},0);}
 // The fastest the page may follow a forward scroll at y: FOLLOW_MAX_RATE times the film's normal speed there, or
 // FOLLOW_MAX_PX_S outside the films. The chapter table is read once per takeover (it doesn't move while scrolling).
 let followChapters=null;
 function followCap(y){
  let here=null;for(const c of followChapters||(followChapters=chapters()))if(c.y<=y+4)here=c;
  return here&&here.film&&y<here.yEnd-2?FOLLOW_MAX_RATE*(here.yEnd-here.y)/Math.max(.1,filmSeconds(here)):FOLLOW_MAX_PX_S;
 }
 // Scrolling: the page eased toward where the scroll has asked for (FOLLOW_TAU), both directions. Forward it moves
 // FOLLOW_GAIN of the scroll, capped (followCap) and never more than FOLLOW_LEAD_S ahead of the page.
 function steer(dy){
  if(followTarget===null){followPos=scrollY;followTarget=followPos;}
  if(following&&dy>0)followTarget=Math.min(followTarget+dy*FOLLOW_GAIN,Math.max(followTarget,followPos+followCap(followPos)*FOLLOW_LEAD_S));
  else followTarget+=dy;
  followTarget=Math.max(0,Math.min(maxScroll(),followTarget));
  if(!followFrame){followWall=performance.now();followFrame=requestAnimationFrame(stepFollow);}
 }
 function stepFollow(now){
  const dt=Math.min(.05,Math.max(.001,(now-followWall)/1000));followWall=now;
  const d=followTarget-followPos;
  if(Math.abs(d)<.75){followPos=followTarget;scrollTo(0,followPos);followFrame=0;followTarget=null;return;}
  let step=d*(1-Math.exp(-dt/FOLLOW_TAU));
  if(following&&step>0)step=Math.min(step,followCap(followPos)*dt);
  followPos+=step;scrollTo(0,followPos);
  followFrame=requestAnimationFrame(stepFollow);
 }
 function stopFollow(){clearTimeout(releaseTimer);releaseTimer=0;cancelAnimationFrame(followFrame);followFrame=0;followTarget=null;following=false;}
 // A second scroll while a part moves: it stops, and the page is theirs to scroll.
 function takeOver(){stopMotion();stopFollow();following=true;followChapters=null;}
 function armRelease(){clearTimeout(releaseTimer);releaseTimer=setTimeout(()=>{releaseTimer=0;release();},RELEASE_MS);}
 // They let go: the page stays where they scrolled it and plays on from there.
 function release(){if(!following)return;stopFollow();handBack();}
 function handBack(){
  const y=scrollY,here=current();
  if(here&&here.film&&y<here.yEnd-2){if(!play(here))scrub(here);return;}   // the part they are in plays on
  if(here&&!here.film&&y<=here.yEnd+2)return;                             // a section without a film: stays to be read
  const n=next();if(n)glide(n);                                           // a hand-off: on to the next part
 }
 // Back: everything stops; a backward wheel keeps easing the page (steer). A link, key back or resize also ends that.
 function back(){momentum=false;clearTimeout(releaseTimer);releaseTimer=0;following=false;stopMotion();}
 function halt(){back();stopFollow();}
 // Momentum: a trackpad or smooth mouse keeps sending events after a flick, each weaker than the last.
 const recent=[];
 function fading(now){
  // Over the last 300 ms the steps keep shrinking (most consecutive steps smaller or equal, and the newest clearly
  // below the oldest). A finger still scrolling, or a wheel spun steadily, does not look like that.
  while(recent.length&&now-recent[0][0]>300)recent.shift();
  const d=recent.map(([,v])=>v);if(d.length<6)return false;
  let down=0;for(let i=1;i<d.length;i++)if(d[i]<=d[i-1]+.01)down++;
  return down/(d.length-1)>=.8&&d[d.length-1]<=d[0]*.97;
 }
 // After momentum has begun, input only counts again once it is clearly new: a pause, a step that jumps up (a new
 // wheel tick), or steps that keep growing (a finger scrolling again).
 const rising=()=>{const d=recent.slice(-3).map(([,v])=>v);return d.length===3&&d[2]>d[1]&&d[1]>d[0]&&d[2]>d[0]*1.15;};
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
  if(px<0){recent.length=0;lastPx=0;back();if(!event.deltaX||Math.abs(event.deltaY)>=Math.abs(event.deltaX)){event.preventDefault();steer(px);}return;}
  if(!(px>0))return;                                               // sideways: ordinary
  if(!forwardAvailable()&&!following)return;                       // past the last part: ordinary scrolling
  event.preventDefault();
  let fresh=gap>=GESTURE_GAP_MS;const jump=lastPx>0&&px>lastPx*2;lastPx=px;
  if(momentum){if(fresh||jump||(recent.push([now,px]),rising())){momentum=false;recent.length=0;fresh=true;}else return;}
  if(fresh)recent.length=0;
  recent.push([now,px]);
  if(fading(now)){momentum=true;release();return;}                 // let go: momentum is not scrolling
  if(following){steer(px);armRelease();return;}                    // scrolling: the page moves with them
  if(!busy()){                                                     // at rest: the next part plays
   if(followTarget!==null)stopFollow();
   if((fresh||now-requestAt>=STREAM_MS)&&now-requestAt>=REQUEST_GAP_MS){requestAt=now;request();}
   return;
  }
  // A part is moving: a new scroll (or this one kept going) is ordinary scrolling, not the scroll that started it.
  if((fresh||now-requestAt>=STREAM_MS)&&now-actionAt>=FOLLOW_GUARD_MS){requestAt=now;takeOver();steer(px);armRelease();}
 },{passive:false});
 // Touch: a swipe at rest plays the next part; a swipe while one moves drags the page (slowed, like the wheel), and
 // lifting the finger plays on from there. A swipe down is ordinary scrolling.
 addEventListener('touchstart',event=>{touch={y0:event.touches[0].clientY,drag:false,done:false,native:false,last:0};},{passive:true});
 addEventListener('touchmove',event=>{
  if(!touch||touch.native||reduced.matches||inField(event.target))return;
  const y=event.touches[0].clientY,dy=touch.y0-y;                  // positive: finger moves up = forward
  if(touch.drag){event.preventDefault();steer(touch.last-y);touch.last=y;return;}   // slowed like the wheel (steer)
  if(scrollsWithin(event.target,dy)){touch.native=true;return;}
  if(dy<-8){back();touch.native=true;return;}                      // swipe down: ordinary scrolling
  if(!forwardAvailable())return;
  event.preventDefault();
  if(touch.done)return;
  if(busy()&&performance.now()-actionAt>=FOLLOW_GUARD_MS){
   if(dy<6)return;
   takeOver();touch.drag=true;touch.last=y;return;
  }
  if(dy>SWIPE_PX){touch.done=true;const now=performance.now();if(!busy()&&now-requestAt>=REQUEST_GAP_MS){requestAt=now;request();}}
 },{passive:false});
 addEventListener('touchend',()=>{const t=touch;touch=null;if(t?.drag)release();},{passive:true});
 addEventListener('touchcancel',()=>{const t=touch;touch=null;if(t?.drag)release();},{passive:true});
 addEventListener('keydown',event=>{
  if(reduced.matches||inField(event.target)||event.altKey||event.metaKey||event.ctrlKey)return;
  const internalDelta=['ArrowUp','PageUp'].includes(event.code)?-1:['ArrowDown','PageDown','Space'].includes(event.code)?1:0;
  if(!(event.code==='Space'&&event.target.closest('button,a'))&&scrollsWithin(event.target,internalDelta,true)){
   event.preventDefault();const section=scrollableSection(event.target,true);
   section.scrollBy({top:internalDelta*(event.code.startsWith('Arrow')?60:section.clientHeight*.8),behavior:'smooth'});return;
  }
  if(['ArrowUp','PageUp','Home'].includes(event.code)){halt();return;}
  if(!['ArrowDown','PageDown','Space'].includes(event.code))return;
  if(event.code==='Space'&&event.target.closest('button,a'))return;
  if(!forwardAvailable())return;
  event.preventDefault();stopFollow();
  const now=performance.now();if(event.repeat||now-requestAt<REQUEST_GAP_MS)return;
  requestAt=now;request();
 });
 document.addEventListener('stage:navigate',e=>{if(!e.detail?.beat)halt();});   // a nav link or chapter click takes over
 addEventListener('resize',halt);
 const api={request,back,chapters,next,current,get playing(){return playing;},get gliding(){return gliding;},get scrubbing(){return scrubbing;},get following(){return following;}};
 window.__beats=api;
 return api;
}
