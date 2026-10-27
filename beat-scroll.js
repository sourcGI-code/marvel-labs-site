// Scroll at the faster of two speeds (owner 10-26: "if someone scrolls and lets go it goes a proper speed and if they
// keep scrolling it goes like a normal speed of their scroll and they are able to go through things faster without
// waiting"). Going forward, the page always moves at whichever is faster: the part's own pace or the visitor's scroll.
//   * a scroll and let go (any size, a swipe up, a wheel tick): the next part plays at its own pace. A chapter's film
//     plays natively to the chapter's end (scene-playback.js playTo); between sections the page glides to the next
//     part (GLIDE_MS, quicker when it is entered at speed) and its film plays;
//   * scrolling on: a film runs faster with the scroll (up to MAX_RATE times its pace, still playing natively); a
//     scroll faster than that, and any scroll between sections, simply moves the page with it (the film scrubs).
//     Nothing queues and nobody waits: it carries straight through chapter and section ends while they scroll;
//   * letting go: the page does not keep their speed. It settles to the part's own pace (a flick coasts down to it,
//     COAST_TAU; a faster film eases back to its pace, BOOST_TAU), finishes the part by itself, then holds. Let go
//     inside a section without a film (numbers, specs, app), it stays there to be read;
//   * the momentum a trackpad or smooth mouse sends after a flick (deltas that only fade) counts as letting go;
//   * scrolling back, the menu links, keys back and the scrollbar are ordinary scrolling and stop it. A backward
//     wheel is eased (no 120 px jumps), so the film rewinds evenly.
// Keys (ArrowDown/PageDown/Space) still play one part each, queued behind the one that is moving. If a film cannot
// start promptly (slow connection, a device that refuses to start video) the page moves through the chapter at the
// film's own pace instead. Chapters: the hero arrival (0-.25) and delivery (.25-DELIVERY_END), the tour's parts, the
// sections after it. Off with ?freescroll=1, ?edit=1 or reduced motion.
import {DELIVERY_END} from './intro-timing.js?v=1';
import {displays} from './original-display-framework.js?v=15-hiw-crew1';
const HANDOFF=.75;                       // atlas-stage.js: hand-offs take 1.5 screens, the inset is half of that
const GLIDE_MS=2400, MIN_GLIDE_S=.35, GESTURE_GAP_MS=260, REQUEST_GAP_MS=900, START_MS=1500, SCRUB_FALLBACK_S=14;
const SPEED_WINDOW_MS=250, RELEASE_MS=220, STILL_SCROLLING_MS=300, FOLLOW_TAU=.08, COAST_TAU=.45, EXTEND_S=.8;
const MAX_RATE=3, OPENING_MAX=7/5, BOOST_TAU=.6, TAKEOVER=1.2, HANDBACK=.6, COAST_TO=.8, STAY_V=300;
export function installBeatScroll({stage,tracks,playback,getActive,readProgress}){
 const params=new URLSearchParams(location.search);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(params.has('freescroll')||params.has('edit'))return null;
 const body=document.body;body.dataset.beatScroll='1';
 let playing=null,gliding=null,scrubbing=false,queued=false,glideFrame=0,coastFrame=0,token=0,ownV=0,coastV=0;
 let following=false,followTarget=null,followPos=0,followFrame=0,followWall=0,pageV=0,releaseTimer=0;
 let lastWheel=0,lastPx=0,lastReal=-1e9,requestAt=-1e9,momentum=false,touch=null;
 let boost=1,boostWall=0,boostFrame=0;
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
 // The film's own pace as page speed (px/s), and how much faster than that it may play before the page follows the
 // scroll instead (the arrival is already played at 5/7 and never above 1x: scene-playback.js playRate).
 const nativeSpeed=c=>Math.max(1,(c.yEnd-c.y)/Math.max(.1,filmSeconds(c)));
 const maxRate=c=>c.section.id==='top'&&c.start<.25?OPENING_MAX:MAX_RATE;
 function positionOf(section,index,p){
  const slot=stage.slot(section),vh=innerHeight,inset=index?vh*HANDOFF:0;
  return slot.offsetTop+inset+Math.max(0,Math.min(1,p))*(slot.offsetHeight-inset-vh*HANDOFF);
 }
 function chapters(){
  const out=[];
  sections().forEach((section,index)=>{for(const c of chaptersFor(section))out.push({...c,section,index,y:positionOf(section,index,c.start),yEnd:positionOf(section,index,c.end)});});
  return out.sort((a,b)=>a.y-b.y);
 }
 const chapterAt=y=>{let at=null;for(const c of chapters()){if(c.y<=y+4)at=c;}return at;};
 const current=()=>chapterAt(scrollY);
 const next=(y=scrollY)=>chapters().find(c=>c.y>y+4)||null;
 const filmLeft=(c,y)=>!!c&&c.film&&y<c.yEnd-2;
 const easeInOut=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
 const autoplaying=()=>!playing&&['playing','loading'].includes(body.dataset.animationPlayback||'');
 // Something of ours is moving: a part, a glide/scrub/coast, or the page's own load-time autoplay.
 const busy=()=>!!playing||!!gliding||scrubbing||!!coastFrame||autoplaying();
 // The visitor has the page: the wheel is following them, or a finger is dragging it.
 const holding=()=>following||!!touch?.drag;
 function stopMotion(){
  token++;
  if(glideFrame||coastFrame||gliding||scrubbing){cancelAnimationFrame(glideFrame);cancelAnimationFrame(coastFrame);glideFrame=coastFrame=0;gliding=null;scrubbing=false;}
  ownV=0;
  if(playing||autoplaying()){playing=null;playback.pause({capture:true});}
  delete body.dataset.beatStep;
 }
 // The visitor's speed: real (not momentum) forward scrolling over the last SPEED_WINDOW_MS, px/s. One wheel tick
 // reads as a gentle scroll; a wheel spun on, or a finger still moving, reads as its real speed.
 const speedLog=[];
 function inputSpeed(now){while(speedLog.length&&now-speedLog[0][0]>SPEED_WINDOW_MS)speedLog.shift();return speedLog.reduce((a,[,d])=>a+d,0)/(SPEED_WINDOW_MS/1000);}
 // How fast our own motion is going, px/s.
 function ownSpeed(){
  if(coastFrame)return coastV;
  if(gliding||scrubbing)return ownV;
  const c=playing||(autoplaying()?current():null);
  return c?nativeSpeed(c)*Math.min(boost,maxRate(c)):0;
 }
 // A film running faster than its pace (the scroll's speed over its own) eases back to it with BOOST_TAU.
 function setBoost(rate){
  boost=Math.max(boost,Math.min(MAX_RATE,rate||1));
  if(boost>1&&!boostFrame){boostWall=performance.now();boostFrame=requestAnimationFrame(decay);}
  playback.setRate(boost);
 }
 function decay(now){
  const dt=Math.max(0,(now-boostWall)/1000);boostWall=now;
  boost=1+(boost-1)*Math.exp(-dt/BOOST_TAU);
  if(boost<1.005)boost=1;
  playback.setRate(boost);
  boostFrame=boost>1?requestAnimationFrame(decay):0;
 }
 function resetBoost(){cancelAnimationFrame(boostFrame);boostFrame=0;boost=1;playback.setRate(1);}
 // The page following the scroll: eased toward where the scroll has asked for (FOLLOW_TAU), both directions.
 function steer(dy){
  if(followTarget===null){followPos=scrollY;followTarget=followPos;pageV=0;}
  followTarget=Math.max(0,Math.min(maxScroll(),followTarget+dy));
  if(!followFrame){followWall=performance.now();followFrame=requestAnimationFrame(stepFollow);}
 }
 function stepFollow(now){
  const dt=Math.min(.05,Math.max(.001,(now-followWall)/1000));followWall=now;
  const d=followTarget-followPos;
  if(Math.abs(d)<.75){followPos=followTarget;scrollTo(0,followPos);pageV=0;followFrame=0;followTarget=null;return;}
  const step=d*(1-Math.exp(-dt/FOLLOW_TAU));pageV=step/dt;followPos+=step;scrollTo(0,followPos);
  followFrame=requestAnimationFrame(stepFollow);
 }
 function stopFollow(){clearTimeout(releaseTimer);releaseTimer=0;cancelAnimationFrame(followFrame);followFrame=0;followTarget=null;pageV=0;following=false;}
 function takeOver(){if(following)return;queued=false;stopMotion();resetBoost();stopFollow();following=true;}
 function armRelease(){clearTimeout(releaseTimer);releaseTimer=setTimeout(()=>{releaseTimer=0;release(inputSpeed(performance.now()));},RELEASE_MS);}
 // They let go (or slowed to what the film itself can play): hand the page back to the part's own pace.
 function release(rateFrom){if(!following)return;const v=Math.max(0,pageV);stopFollow();handBack(v,rateFrom);}
 function handBack(v,rateFrom=v){
  const y=scrollY,here=chapterAt(y);
  if(filmLeft(here,y)){
   const vn=nativeSpeed(here),top=maxRate(here);
   if(v>vn*top){coast(v);return;}                                 // still faster than the film can play: coast down to it
   if(rateFrom>vn)setBoost(rateFrom/vn);
   if(!play(here))scrub(here);
   return;
  }
  // Stopped inside a section that has no film (the workday numbers, the specs, the app): it stays there to be read.
  // Let go in a hand-off, or flicked on, it glides to the next part.
  if(here&&!here.film&&y<=here.yEnd+2&&v<STAY_V)return;
  const n=next(y);if(n)glide(n,v);
 }
 function coast(v){
  // A flick let go faster than the film can play: the page carries on, slowing (COAST_TAU) until the film can take
  // it at that speed (then eases to its pace), or until it reaches the next section (then glides to the next part).
  const mine=++token;coastV=v;let pos=scrollY,wall=performance.now();body.dataset.beatStep='1';
  coastFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const dt=Math.min(.05,Math.max(.001,(now-wall)/1000));wall=now;
   coastV*=Math.exp(-dt/COAST_TAU);pos=Math.min(maxScroll(),pos+coastV*dt);scrollTo(0,pos);
   const here=chapterAt(pos);
   if(filmLeft(here,pos)&&pos<maxScroll()&&coastV>nativeSpeed(here)*maxRate(here)*COAST_TO){coastFrame=requestAnimationFrame(frame);return;}
   coastFrame=0;delete body.dataset.beatStep;
   requestAnimationFrame(()=>{if(mine===token)handBack(coastV);});   // one frame for the stage to catch up
  });
 }
 // A part has finished: a queued key press, or a visitor still scrolling, goes straight on to the next one.
 function done(){
  delete body.dataset.beatStep;
  if(queued){queued=false;setTimeout(go,120);return;}
  if(performance.now()-lastReal<STILL_SCROLLING_MS)setTimeout(()=>{if(!busy()&&!holding())start(inputSpeed(performance.now()),0);},0);
 }
 // The page's own load-time autoplay finishing also releases a part queued (or scrolled for) during it.
 document.addEventListener('motion:playback',e=>{if(e.detail?.mode==='paused'&&!playing&&!gliding&&!scrubbing&&!coastFrame&&!holding()&&(queued||performance.now()-lastReal<STILL_SCROLLING_MS))done();});
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
 // Still scrolling as the playing film nears its chapter's end: run on into the next chapter of the same film
 // without stopping (scene-playback.js extendTo), instead of pausing and starting again.
 function extend(){
  const c=playing,active=getActive();if(!c||!active||active.track!==c.section)return;
  const perP=filmSeconds(c)/Math.max(1e-6,c.end-c.start),left=(c.end-readProgress(active))*perP/Math.max(1,boost);
  if(left>EXTEND_S)return;
  const n=chapters().find(x=>x.section===c.section&&x.film&&Math.abs(x.start-c.end)<1e-6);
  if(n&&playback.extendTo?.(n.end)){c.end=n.end;c.yEnd=n.yEnd;}
 }
 function scrub(chapter){
  // The film cannot play here: move the page through the chapter at the film's own pace.
  const from=scrollY,to=chapter.yEnd,dy=to-from;if(Math.abs(dy)<2){done();return;}
  const remaining=Math.max(0,Math.min(1,dy/Math.max(1,chapter.yEnd-chapter.y)));
  const ms=Math.max(1500,filmSeconds(chapter)*remaining*1000);
  const mine=++token;scrubbing=true;ownV=dy/(ms/1000);body.dataset.beatStep='1';const t0=performance.now();
  glideFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const k=Math.min(1,(now-t0)/ms);scrollTo(0,from+dy*k);
   if(k<1){glideFrame=requestAnimationFrame(frame);return;}
   scrubbing=false;glideFrame=0;ownV=0;done();
  });
 }
 function glide(chapter,speed=0){
  // Between sections: an eased move to the next part, then its film plays. Entered at speed, it starts at that speed
  // (never slower: it gets shorter, down to MIN_GLIDE_S) and still comes to rest at the part.
  const from=scrollY,dy=chapter.y-from;const mine=++token;gliding=chapter;body.dataset.beatStep='1';
  document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+chapter.section.id,beat:true}}));
  const dist=Math.max(1,Math.abs(dy)),v=Math.max(0,speed||0);
  const D=v>0?Math.max(MIN_GLIDE_S,Math.min(GLIDE_MS/1000,1.5*dist/v)):GLIDE_MS/1000,m0=Math.min(1.5,v*D/dist);
  const shape=k=>m0>0?(k*k*k-2*k*k+k)*m0+(-2*k*k*k+3*k*k):easeInOut(k);
  const t0=performance.now();let lastY=from,lastT=t0;ownV=v;
  glideFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const k=Math.min(1,(now-t0)/(D*1000)),y=from+dy*shape(k);scrollTo(0,y);
   if(now>lastT)ownV=(y-lastY)/((now-lastT)/1000);lastY=y;lastT=now;
   if(k<1){glideFrame=requestAnimationFrame(frame);return;}
   gliding=null;glideFrame=0;ownV=0;
   requestAnimationFrame(()=>{if(mine!==token)return;if(!play(chapter))done();});
  });
 }
 // Start the next part from rest: the film in front of them if it hasn't finished (faster for a faster scroll), else
 // glide to the next part. A scroll faster than the film can play moves the page with it instead.
 function start(speed,px){
  const here=current(),y=scrollY;
  if(filmLeft(here,y)){
   const active=getActive(),at=active&&active.track===here.section?readProgress(active):1;
   if(at<here.end-.004){
    const vn=nativeSpeed(here);
    if(speed>vn*maxRate(here)){takeOver();steer(px);armRelease();return;}
    if(speed>vn)setBoost(speed/vn);
    if(!play(here))scrub(here);return;
   }
  }
  const n=next(y);if(n)glide(n,speed);
 }
 // A key press: the next part at its own pace. With nothing moving it starts at once; otherwise it is queued behind
 // the part that is moving (one at most). It starts on the next task, after every listener of the press has run.
 function go(){if(busy()||holding())return;start(0,0);}
 function request(){setTimeout(()=>{if(busy()){if(next()||current()?.film)queued=true;}else go();},0);}
 // Real forward scrolling (not momentum): the page goes at the faster of the part's pace and the scroll.
 function forward(px,now){
  lastReal=now;speedLog.push([now,px]);const speed=inputSpeed(now);
  if(!following)stopFollow();                                      // a backward ease still running ends here
  if(following){
   steer(px);armRelease();
   const ahead=followTarget??scrollY,here=chapterAt(ahead);
   // Slowed to what the film can play: back to the film, at the scroll's speed, easing to its pace.
   if(filmLeft(here,ahead)&&speed<nativeSpeed(here)*maxRate(here)*HANDBACK)release(speed);
   return;
  }
  if(!busy()){start(speed,px);return;}
  const c=playing||(autoplaying()?current():null);
  if(c){
   const vn=nativeSpeed(c);
   if(speed>vn*maxRate(c)){takeOver();steer(px);armRelease();return;}
   setBoost(speed/vn);extend();return;
  }
  if(speed>ownSpeed()*TAKEOVER){takeOver();steer(px);armRelease();}   // faster than the glide/coast: follow the scroll
 }
 function back(){queued=false;momentum=false;lastReal=-1e9;clearTimeout(releaseTimer);releaseTimer=0;following=false;stopMotion();resetBoost();}
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
  if(scrollsWithin(event.target,px)){queued=false;return;}
  if(px<0){recent.length=0;speedLog.length=0;lastPx=0;back();if(!event.deltaX||Math.abs(event.deltaY)>=Math.abs(event.deltaX)){event.preventDefault();steer(px);}return;}
  if(!(px>0))return;                                               // sideways: ordinary
  if(!forwardAvailable()&&!following&&!busy())return;              // past the last part: ordinary scrolling
  event.preventDefault();
  const jump=lastPx>0&&px>lastPx*2;lastPx=px;
  if(momentum){if(gap>=GESTURE_GAP_MS||jump||(recent.push([now,px]),rising())){momentum=false;recent.length=0;}else return;}
  if(gap>=GESTURE_GAP_MS)recent.length=0;
  recent.push([now,px]);
  if(fading(now)){momentum=true;if(following)release(inputSpeed(now));return;}   // let go: their speed is not kept
  forward(px,now);
 },{passive:false});
 // Touch: a forward drag moves the page with the finger; lifting it hands back at the finger's speed (a flick coasts
 // down to the part's pace). A finger on the screen catches a coasting page, like native scrolling. A swipe down is
 // ordinary scrolling.
 addEventListener('touchstart',event=>{
  const y=event.touches[0].clientY;touch={y0:y,drag:false,native:false,base:0,from:0,log:[[performance.now(),y]]};
  if(coastFrame)stopMotion();
 },{passive:true});
 addEventListener('touchmove',event=>{
  if(!touch||touch.native||reduced.matches||inField(event.target))return;
  const y=event.touches[0].clientY,now=performance.now(),dy=touch.y0-y;   // positive: finger moves up = forward
  if(!touch.drag){
   if(scrollsWithin(event.target,dy)){queued=false;touch.native=true;return;}
   if(dy<-8){back();touch.native=true;return;}                    // swipe down: ordinary scrolling
   if(!forwardAvailable())return;
   event.preventDefault();
   if(dy<6)return;
   touch.drag=true;queued=false;lastReal=-1e9;stopMotion();resetBoost();stopFollow();touch.base=scrollY;touch.from=y;
  }
  event.preventDefault();
  touch.log.push([now,y]);while(touch.log.length>2&&now-touch.log[0][0]>100)touch.log.shift();
  scrollTo(0,Math.max(0,Math.min(maxScroll(),touch.base+touch.from-y)));
 },{passive:false});
 addEventListener('touchend',()=>{
  const t=touch;touch=null;if(!t?.drag)return;
  const now=performance.now(),log=t.log.filter(([at])=>now-at<=120);
  const v=log.length>1?(log[0][1]-log[log.length-1][1])/Math.max(.016,(log[log.length-1][0]-log[0][0])/1000):0;
  if(v<-40)return;                                                 // let go moving back: stay where they left it
  handBack(Math.max(0,v));
 },{passive:true});
 addEventListener('touchcancel',()=>{touch=null;},{passive:true});
 addEventListener('keydown',event=>{
  if(reduced.matches||inField(event.target)||event.altKey||event.metaKey||event.ctrlKey)return;
  const internalDelta=['ArrowUp','PageUp'].includes(event.code)?-1:['ArrowDown','PageDown','Space'].includes(event.code)?1:0;
  if(!(event.code==='Space'&&event.target.closest('button,a'))&&scrollsWithin(event.target,internalDelta,true)){
   queued=false;event.preventDefault();const section=scrollableSection(event.target,true);
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
 const api={get boost(){return boost;},request,back,chapters,next,current,get playing(){return playing;},get gliding(){return gliding;},get queued(){return queued;},get scrubbing(){return scrubbing;},get following(){return following;},get coasting(){return !!coastFrame;},get momentum(){return momentum;},speed:()=>inputSpeed(performance.now()),own:ownSpeed};
 window.__beats=api;
 return api;
}
