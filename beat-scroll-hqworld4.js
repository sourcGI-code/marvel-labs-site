// Scroll and let go: the part plays at its normal speed. Keep scrolling: it goes faster with the scroll, smoothly, and
// carries on past the part; let go and it settles back to normal speed (owner 10-26: "i need to be able to scroll and
// let go and it plays normal"; "the second swipe activates a scroll ... to just scroll through but if someone lets go it
// continues"; 1:1 was "crazy fast", 40% "too slow", "make do 50 percent", then "5 percent off" (45%); "I am scrolling and it doesnt speed up the
// quote animation or the solo trailer or any, I need it to smoothly scroll past it"):
//   * a forward scroll (any speed), a swipe up or ArrowDown/PageDown/Space plays the next part at its normal speed:
//     a chapter's film plays natively to the chapter's end (scene-playback.js playTo); between sections the page moves
//     at one steady speed (GLIDE_VH_S) and the part there plays. A short scroll (START_WINDOW_MS) does nothing more;
//   * scrolling on, or scrolling again: a playing film runs faster, FOLLOW_GAIN of the scroll's speed over the film's own
//     (up to scene-playback.js MAX_RATE), still playing natively so the motion stays smooth, and runs straight on into
//     the next chapter (scene-playback.js extendTo). Between sections the page moves at the same steady speed whether
//     they scroll or not (owner 10-26: "it scrolls down too slow I want a consistent speed across the whole thing"),
//     and while they keep scrolling it carries on from part to part. A phone drag moves the page FOLLOW_GAIN of the finger;
//   * letting go: the film eases back to its normal speed (RATE_DOWN_TAU) and finishes the part, then holds. Let go
//     inside a section without a film (numbers, specs, app) it stays there; in a hand-off it glides on to the next part.
//     The momentum a trackpad or smooth mouse sends after a flick (its deltas only fade) counts as letting go;
//   * ArrowDown/PageDown/Space while a part plays cuts to the start of the next part (no fast-forward);
//   * scrolling back, the menu links, keys back and dragging the scrollbar are ordinary scrolling and stop it;
//     a backward wheel is eased (no 120 px jumps), so the film rewinds evenly.
// If a film cannot start promptly (slow connection, a device that refuses to start video) the page moves through the
// chapter at the film's own pace instead. Chapters: the hero arrival (0-.25) and delivery (.25-DELIVERY_END), the
// tour's parts, the sections after it. Off with ?freescroll=1, ?edit=1 or reduced motion.
import {DELIVERY_END} from './intro-timing.js?v=1';
import {displays} from './original-display-framework-hqworld4.js?v=sleek20-review-v1';
const HANDOFF=.75;                       // atlas-stage.js: hand-offs take 1.5 screens, the inset is half of that
const GLIDE_VH_S=2.8, GLIDE_ACCEL_VH=8, GLIDE_DECEL_VH=6, GESTURE_GAP_MS=400, REQUEST_GAP_MS=700, START_WINDOW_MS=350, RELEASE_MS=220, SPEED_WINDOW_MS=250;
const FOLLOW_GAIN=.45, FOLLOW_MAX_PX_S=1125, FOLLOW_TAU=.08, FOLLOW_LEAD_S=.25, RATE_UP_TAU=.15, RATE_DOWN_TAU=.5;
const RATE_SCROLLING=2, RATE_GAIN=.9;
const EXTEND_S=.6, SWIPE_PX=28, START_MS=1500, SCRUB_FALLBACK_S=14;
export function installBeatScroll({stage,tracks,playback,getActive,readProgress}){
 const params=new URLSearchParams(location.search);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(params.has('freescroll')||params.has('edit'))return null;
 const body=document.body;body.dataset.beatScroll='1';
 let playing=null,gliding=null,scrubbing=null,entering=null,glideFrame=0,token=0;
 let following=false,followTarget=null,followPos=0,followFrame=0,followWall=0,releaseTimer=0;
 let lastWheel=0,lastPx=0,requestAt=-1e9,startAt=-1e9,lastReal=-1e9,momentum=false,touch=null;
 let rate=1,rateFrame=0,rateWall=0;
 const sections=()=>[...document.querySelectorAll('main > section')];
 const maxScroll=()=>Math.max(0,document.documentElement.scrollHeight-innerHeight);
 function tourStarts(){
  // The tour as three things (owner 10-24: "I want the understand the job to be one scroll so it shows the entire
  // workflow from equipment to work all in one scroll"): the arrival at the job, the whole workflow (equipment,
  // vision, RTK, quote, work) and the operator story (grass in, product out, imagine). The fractions are where the
  // captions switch on the installed films: the desktop film (2302 frames, operator in the second half) and the
  // phone film (1381 frames, no operator, so its workflow runs to the end).
  // How it works (owner 10-26): grass in + product out / the drop-off / the drive to the next job / the whole workflow.
  // Owner 10-28: "once I scroll one time on that entire section it should just play all the way from grass in to work
  // automatically" - How it works is one chapter, grass in through work.
  if(body.dataset.fieldLeadFrames)return [0];
  if(body.dataset.operatorSequence==='true')return [0,.185,.73];
  if(body.dataset.neighborhood!=='true')return [0,.097];
  const table=displays.filter(d=>d.section==='inside').map(d=>d.start).filter(p=>p>=0&&p<1);
  return [...new Set([0,...table])].sort((a,b)=>a-b);
 }
 function chaptersFor(section){
  const id=section.id;
  if(id==='top')return [{start:0,end:.25,film:true},{start:.25,end:DELIVERY_END,film:true}];
  if(id==='inside'){const s=tourStarts();return s.map((p,i)=>({start:p,end:i+1<s.length?s[i+1]:1,film:true}));}
  // 10-30 owner: "when I scroll it shows me the 1 through 4 ... instead of just playing it": the Marvel Crew section has one
  // stop per feature; a forward scroll glides to the next stop and crew-app.js plays that feature's part of the film.
  if(id==='app'){const n=section.querySelectorAll('.crew-beats li').length||1,stops=[...Array(n)].map((_,i)=>.15+i*.85/n);return stops.map((p,i)=>({start:p,end:i+1<n?stops[i+1]:1,film:false}));}
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
 // The film's normal speed as page speed (px/s).
 const nativeSpeed=c=>Math.max(1,(c.yEnd-c.y)/Math.max(.1,filmSeconds(c)));
 function positionOf(section,index,p){
  const slot=stage.slot(section),vh=innerHeight,inset=index?vh*HANDOFF:0;
  return slot.offsetTop+inset+Math.max(0,Math.min(1,p))*(slot.offsetHeight-inset-vh*HANDOFF);
 }
 function chapters(){
  const out=[];
  sections().forEach((section,index)=>{for(const c of chaptersFor(section))out.push({...c,section,index,y:positionOf(section,index,c.start),yEnd:positionOf(section,index,c.end)});});
  return out.sort((a,b)=>a.y-b.y);
 }
 const chapterAt=(y,all=chapters())=>{let at=null;for(const c of all){if(c.y<=y+4)at=c;}return at;};
 const current=()=>chapterAt(scrollY);
 const next=()=>chapters().find(c=>c.y>scrollY+4)||null;
 const filmLeft=(c,y)=>!!c&&c.film&&y<c.yEnd-2;
 const autoplaying=()=>!playing&&['playing','loading'].includes(body.dataset.animationPlayback||'');
 // Something is already moving: one of our parts, our glide/scrub, or the page's own load-time autoplay.
 const busy=()=>!!playing||!!gliding||!!scrubbing||!!entering||autoplaying();
 // The visitor has the page: the wheel or trackpad is moving it, or a finger is dragging it.
 const holding=()=>following||!!touch?.drag;
 const scrolling=(now=performance.now())=>now-lastReal<RELEASE_MS;
 function stopMotion(){
  token++;
  if(gliding||scrubbing||entering){cancelAnimationFrame(glideFrame);glideFrame=0;gliding=scrubbing=entering=null;}
  if(playing||autoplaying()){playing=null;playback.pause({capture:true});}
  delete body.dataset.beatStep;
 }
 // A part has finished. Still scrolling: on to the next part, starting from the speed the film was going.
 function done(c=null){
  delete body.dataset.beatStep;
  if(!scrolling()||holding()||busy())return;
  const n=next();if(n)glide(n,c?.film?nativeSpeed(c)*rate:0);
 }
 // The page's own load-time autoplay (the arrival) finishing while they scroll: straight on to the next part.
 document.addEventListener('motion:playback',e=>{if(e.detail?.mode==='paused'&&!busy()&&!holding()&&scrolling())setTimeout(go,0);});
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
   if(m==='playing'){started=true;playback.setRate(rate);}
   if(m==='paused'){clearTimeout(watchdog);document.removeEventListener('motion:playback',onPlayback);
    if(playing!==chapter)return;
    if(e.detail?.error||readProgress(active)<chapter.end-.02)fallback();else{playing=null;done(chapter);}}
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
   scrubbing=null;glideFrame=0;done(chapter);
  });
 }
 function glide(chapter,v0=0){
  // Between sections: one steady speed everywhere, GLIDE_VH_S screens a second whatever the distance or the screen,
  // eased in (from v0, the speed the page was already going) and out (GLIDE_ACCEL_VH / GLIDE_DECEL_VH, screens/s²),
  // then the part plays (faster, if they are still scrolling).
  const mine=++token;gliding=chapter;body.dataset.beatStep='1';
  document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+chapter.section.id,beat:true}}));
  const vh=innerHeight,top=GLIDE_VH_S*vh,accel=GLIDE_ACCEL_VH*vh,decel=GLIDE_DECEL_VH*vh;
  let pos=scrollY,v=Math.min(top,Math.max(0,v0)),wall=performance.now();
  glideFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const dt=Math.min(.05,Math.max(.001,(now-wall)/1000));wall=now;
   const left=chapter.y-pos;
   if(left<=.5){
    if(left>0)scrollTo(0,chapter.y);
    glideFrame=requestAnimationFrame(()=>{if(mine!==token)return;gliding=null;glideFrame=0;if(!play(chapter))done();else if(scrolling())speedUp();});
    return;
   }
   v=Math.min(top,v+accel*dt,Math.sqrt(2*decel*left));
   pos+=Math.min(left,v*dt);scrollTo(0,pos);
   glideFrame=requestAnimationFrame(frame);
  });
 }
 // Start the next part: the one in front of them if it hasn't finished, else glide to the next one.
 function go(){
  if(busy()||holding())return;
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
  const owned=playing||entering||gliding||scrubbing||(autoplaying()?current():null),all=chapters();
  const i=owned?all.findIndex(c=>c.section===owned.section&&Math.abs(c.start-owned.start)<1e-6):-1;
  const target=i>=0?all[i+1]:next();if(!target)return;
  stopMotion();
  if(owned&&target.section===owned.section){enter(target,true);return;}
  const last=owned?.film?all.filter(c=>c.section===owned.section).at(-1):null;
  if(last&&scrollY<last.yEnd)scrollTo(0,last.yEnd);
  glide(target);
 }
 // Play a chapter from where the page is (a cut puts the page at its start first). Two frames for the stage to switch
 // chapter and the film to seek, then it plays.
 function enter(chapter,cut=false){
  const mine=++token;entering=chapter;body.dataset.beatStep='1';
  document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+chapter.section.id,beat:true}}));
  if(cut)scrollTo(0,chapter.y);
  glideFrame=requestAnimationFrame(()=>{glideFrame=requestAnimationFrame(()=>{if(mine!==token)return;entering=null;glideFrame=0;if(!play(chapter))scrub(chapter);});});
 }
 // Requests start on the next task, after every listener of the gesture has run. A scroll only ever starts the next
 // part (start); a key press while a part moves skips it (request).
 function start(){setTimeout(()=>{if(!busy()&&!holding())go();},0);}
 function request(){setTimeout(()=>{if(!busy())go();else if(!holding())skip();},0);}
 // The visitor's speed: real (not momentum) forward scrolling over the last SPEED_WINDOW_MS, px/s.
 const speedLog=[];
 function inputSpeed(now){while(speedLog.length&&now-speedLog[0][0]>SPEED_WINDOW_MS)speedLog.shift();return speedLog.reduce((a,[,d])=>a+d,0)/(SPEED_WINDOW_MS/1000);}
 // The film's speed while they scroll: FOLLOW_GAIN of the scroll's speed over the film's normal speed, never below
 // normal, rising quickly (RATE_UP_TAU) and settling back to normal once they stop (RATE_DOWN_TAU).
 function speedUp(){if(!rateFrame){rateWall=performance.now();rateFrame=requestAnimationFrame(rateStep);}}
 function rateStep(now){
  const dt=Math.min(.05,Math.max(.001,(now-rateWall)/1000));rateWall=now;
  const c=playing||entering||(autoplaying()?current():null),on=scrolling(now)&&!!c;
  // 10-28 owner: "scrolling faster doesnt seem to work" (a steady scroll gave 1.25x on the arrival, 1.7x in How it works):
  // while they scroll the film runs at least RATE_SCROLLING, faster for a faster scroll (RATE_GAIN), up to MAX_RATE.
  // v3 (10-28): How it works is a 3840x2400 60 fps film; Chrome decodes it at ~2.3x at most (measured), so cap it there.
  const target=Math.min(on?Math.max(RATE_SCROLLING,RATE_GAIN*inputSpeed(now)/nativeSpeed(c)):1,c?.section?.id==='inside'?2.3:99);
  rate=target+(rate-target)*Math.exp(-dt/(target>rate?RATE_UP_TAU:RATE_DOWN_TAU));
  if(!on&&rate<1.01){rate=1;playback.setRate(1);rateFrame=0;return;}
  playback.setRate(rate);
  if(on)extend();
  rateFrame=requestAnimationFrame(rateStep);
 }
 // Still scrolling as the playing film nears its chapter's end: run on into the next chapter of the same film.
 function extend(){
  const c=playing,active=getActive();if(!c||!active||active.track!==c.section)return;
  const perP=filmSeconds(c)/Math.max(1e-6,c.end-c.start),left=(c.end-readProgress(active))*perP/Math.max(1,rate);
  if(left>EXTEND_S)return;
  const n=chapters().find(x=>x.section===c.section&&x.film&&Math.abs(x.start-c.end)<1e-6);
  if(n&&playback.extendTo?.(n.end)){c.end=n.end;c.yEnd=n.yEnd;}
 }
 // The page following the scroll (between sections, phone drags): eased toward where the scroll has asked for
 // (FOLLOW_TAU). Forward it moves FOLLOW_GAIN of the scroll, at most followCap, never far ahead of the page.
 let followChapters=null;
 function followCap(y){
  const here=chapterAt(y,followChapters||(followChapters=chapters()));
  return filmLeft(here,y)?nativeSpeed(here)*4:FOLLOW_MAX_PX_S;
 }
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
 function takeOver(){stopMotion();stopFollow();following=true;followChapters=null;}
 function armRelease(){clearTimeout(releaseTimer);releaseTimer=setTimeout(()=>{releaseTimer=0;release();},RELEASE_MS);}
 // They let go: the page stays where it is and plays on from there.
 function release(){if(!following)return;stopFollow();handBack();}
 function handBack(){
  const y=scrollY,here=current();
  if(filmLeft(here,y)){if(!play(here))scrub(here);return;}                // the part they are in plays on
  if(here&&!here.film&&y<=here.yEnd+2)return;                             // a section without a film: stays to be read
  const n=next();if(n)glide(n);                                           // a hand-off: on to the next part
 }
 // Back: everything stops; a backward wheel keeps easing the page (steer). A link, key back or resize also ends that.
 function back(){momentum=false;lastReal=-1e9;clearTimeout(releaseTimer);releaseTimer=0;following=false;stopMotion();}
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
  if(px<0){recent.length=0;speedLog.length=0;lastPx=0;back();if(!event.deltaX||Math.abs(event.deltaY)>=Math.abs(event.deltaX)){event.preventDefault();steer(px);}return;}
  if(!(px>0))return;                                               // sideways: ordinary
  if(!forwardAvailable()&&!following)return;                       // past the last part: ordinary scrolling
  event.preventDefault();
  let fresh=gap>=GESTURE_GAP_MS;const jump=lastPx>0&&px>lastPx*2;lastPx=px;
  if(momentum){if(fresh||jump||(recent.push([now,px]),rising())){momentum=false;recent.length=0;fresh=true;}else return;}
  if(fresh)recent.length=0;
  recent.push([now,px]);
  if(fading(now)){momentum=true;lastReal=-1e9;release();return;}   // let go: momentum is not scrolling
  if(following){speedLog.push([now,px]);lastReal=now;steer(px);armRelease();return;}   // between sections: the page follows
  if(!busy()){                                                     // at rest: the next part plays at its normal speed
   if(followTarget!==null)stopFollow();
   if(now-requestAt>=REQUEST_GAP_MS){requestAt=startAt=now;start();}
   return;
  }
  if(!fresh&&now-startAt<START_WINDOW_MS)return;                   // the short scroll that started the part
  speedLog.push([now,px]);lastReal=now;
  if(playing||entering||autoplaying()){speedUp();return;}          // a film: faster with the scroll
  // A move between sections keeps its one steady speed; still scrolling when it arrives, it carries on (done).
 },{passive:false});
 // Touch: a swipe at rest plays the next part; a swipe while one moves drags the page (FOLLOW_GAIN, like the wheel),
 // and lifting the finger plays on from there. A swipe down is ordinary scrolling.
 addEventListener('touchstart',event=>{touch={y0:event.touches[0].clientY,drag:false,done:false,native:false,last:0};},{passive:true});
 addEventListener('touchmove',event=>{
  if(!touch||touch.native||reduced.matches||inField(event.target))return;
  const y=event.touches[0].clientY,dy=touch.y0-y;                  // positive: finger moves up = forward
  if(touch.drag){event.preventDefault();steer(touch.last-y);touch.last=y;return;}
  if(scrollsWithin(event.target,dy)){touch.native=true;return;}
  if(dy<-8){back();touch.native=true;return;}                      // swipe down: ordinary scrolling
  if(!forwardAvailable())return;
  event.preventDefault();
  if(touch.done)return;
  if(busy()&&performance.now()-startAt>=START_WINDOW_MS){
   if(dy<6)return;
   takeOver();touch.drag=true;touch.last=y;return;
  }
  if(dy>SWIPE_PX){touch.done=true;const now=performance.now();if(!busy()&&now-requestAt>=REQUEST_GAP_MS){requestAt=startAt=now;start();}}
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
  requestAt=startAt=now;request();
 });
 document.addEventListener('stage:navigate',e=>{if(!e.detail?.beat)halt();});   // a nav link or chapter click takes over
 addEventListener('resize',halt);
 const api={request,back,chapters,next,current,get rate(){return rate;},get playing(){return playing;},get gliding(){return gliding;},get scrubbing(){return scrubbing;},get following(){return following;}};
 window.__beats=api;
 return api;
}
