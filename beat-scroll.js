// One scroll per thing (owner 10-24, "like USAvionix"; 2nd pass after "fast and slow and inconsistent"):
//   * every forward wheel tick, swipe up or ArrowDown/PageDown/Space answers the same way: the SAME short glide
//     (GLIDE_MS, 2.4 s) to the next chapter, and that chapter's film then plays by itself to the chapter's end
//     (scene-playback.js playTo); nothing is locked, the page just waits at the end for the next scroll;
//   * a forward scroll while a film is playing skips ahead: the same short glide to the next chapter, which plays;
//   * a forward scroll at the start of a chapter that has not played yet plays it (no glide needed);
//   * scrolling back is ordinary scrolling, and stops whatever was playing.
// Chapters: the hero arrival (0-.25) and delivery (.25-DELIVERY_END), the tour's arrival / whole workflow / operator
// story, the numbers, the contact. Off with ?freescroll=1, ?edit=1
// or reduced motion.
import {DELIVERY_END} from './intro-timing.js?v=1';
import {displays} from './original-display-framework.js?v=10';
const HANDOFF=.75;                       // atlas-stage.js: hand-offs take 1.5 screens, the inset is half of that
const GLIDE_MS=2400, COOLDOWN_MS=350, GESTURE_GAP_MS=90, SWIPE_PX=28, START_MS=700, CUT_MS=380;   // 2.4 s: owner 10-24, the 1.1 s move "displays it too fast"
export function installBeatScroll({stage,tracks,playback,getActive,readProgress}){
 const params=new URLSearchParams(location.search);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(params.has('freescroll')||params.has('edit'))return null;
 const body=document.body;body.dataset.beatScroll='1';
 let playing=null,gliding=null,cooldownUntil=0,lastWheel=0,glideFrame=0,touchY=null,touchDone=false,token=0;
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
 function stopPlaying(){playing=null;playback.pause({capture:true});}   // ours or the page's own load-time autoplay
 function stopGlide(){if(gliding){gliding=null;cancelAnimationFrame(glideFrame);glideFrame=0;}if(veil)veil.style.opacity='0';}
 function settle(){delete body.dataset.beatStep;cooldownUntil=performance.now()+COOLDOWN_MS;}
 function play(chapter){
  // The chapter's film plays by itself to the chapter's end; the page waits there. If the film cannot start
  // promptly (still downloading on a slow connection, a phone that refuses to start video without a tap) or stops
  // with an error, the page glides to the chapter's end instead: a scroll must always move the page.
  if(!chapter.film||reduced.matches||body.dataset.autoplayBlocked==='true')return false;
  const active=getActive();
  if(!active||active.track!==chapter.section||readProgress(active)>=chapter.end-.004)return false;
  if(!playback.playTo(chapter.end))return false;
  playing=chapter;body.dataset.beatStep='1';
  const mine=++token;let started=false;
  const fallback=()=>{if(mine!==token||playing!==chapter)return;playing=null;playback.pause({capture:false});glideTo(chapter.yEnd,chapter.section);};
  const watchdog=setTimeout(()=>{if(!started)fallback();},START_MS);
  const onPlayback=e=>{
   if(mine!==token)return;const m=e.detail?.mode;
   if(m==='playing')started=true;
   if(m==='paused'){clearTimeout(watchdog);document.removeEventListener('motion:playback',onPlayback);
    if(playing!==chapter)return;
    if(e.detail?.error||readProgress(active)<chapter.end-.02)fallback();else{playing=null;settle();}}
  };
  document.addEventListener('motion:playback',onPlayback);
  return true;
 }
 function glideTo(y,section){
  // The same move as a chapter change, to a position; used when a film cannot play.
  stopGlide();
  const from=scrollY,dy=y-from;const mine=++token;gliding={y,section};body.dataset.beatStep='1';
  const t0=performance.now(),ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  glideFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const k=Math.min(1,(now-t0)/GLIDE_MS);scrollTo(0,from+dy*ease(k));
   if(k<1){glideFrame=requestAnimationFrame(frame);return;}
   gliding=null;glideFrame=0;settle();
  });
 }
 function glide(chapter){
  // The same short move for every chapter change, then the chapter plays.
  stopPlaying();stopGlide();
  const from=scrollY,dy=chapter.y-from;const mine=++token;gliding=chapter;body.dataset.beatStep='1';
  document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+chapter.section.id,beat:true}}));
  const t0=performance.now(),ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;   // soft in and out
  glideFrame=requestAnimationFrame(function frame(now){
   if(mine!==token)return;
   const k=Math.min(1,(now-t0)/GLIDE_MS);scrollTo(0,from+dy*ease(k));
   if(k<1){glideFrame=requestAnimationFrame(frame);return;}
   gliding=null;glideFrame=0;
   requestAnimationFrame(()=>{if(mine!==token)return;if(!play(chapter))settle();});
  });
 }
 // Steps start on the next task, after every listener of the gesture has run: the hero's own wheel/key/touch
 // listener (platform.js) pauses the opening film on each gesture, and it would land right after our play().
 // A film is "playing" whether this module started it or the page's own load-time autoplay did.
 const busy=()=>!!playing||['playing','loading'].includes(body.dataset.animationPlayback||'');
 function later(skip){setTimeout(()=>forward(skip),0);}
 // Skipping ahead through a film never fast-forwards it (owner 10-24: "too fast like holy shit"): the screen fades
 // to black, the page jumps to the next chapter, the screen fades back, and that chapter plays.
 let veil=null;
 function cut(chapter){
  stopPlaying();stopGlide();
  if(!veil){veil=document.createElement('div');veil.id='beat-cut';veil.style.cssText='position:fixed;inset:0;background:#0a0c0d;opacity:0;pointer-events:none;z-index:9000;transition:opacity '+CUT_MS+'ms ease';document.body.append(veil);}
  const mine=++token;gliding=chapter;body.dataset.beatStep='1';
  requestAnimationFrame(()=>{veil.style.opacity='1';});
  setTimeout(()=>{
   if(mine!==token)return;
   document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+chapter.section.id,beat:true}}));
   scrollTo(0,chapter.y);
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(mine!==token)return;veil.style.opacity='0';
    setTimeout(()=>{if(mine!==token)return;gliding=null;if(!play(chapter))settle();},CUT_MS);
   }));
  },CUT_MS+40);
 }
 function forward(skip=false){
  if(gliding)return;                                   // already moving: one move per scroll
  if(skip||playing){const n=next();if(n)cut(n);return;}     // skip ahead while a film plays: a fade cut, no scrub
  const here=current();
  if(here&&here.film){
   const active=getActive(),at=active&&active.track===here.section?readProgress(active):1;
   if(at<here.end-.004){if(!play(here))glideTo(here.yEnd,here.section);return;}   // the thing in front of them plays, or scrubs by
  }
  const n=next();if(n)glide(n);
 }
 function back(){stopPlaying();stopGlide();delete body.dataset.beatStep;cooldownUntil=0;}
 const inField=target=>!!target.closest?.('input,textarea,select,[contenteditable="true"],dialog[open]');
 addEventListener('wheel',event=>{
  if(reduced.matches||event.ctrlKey)return;
  const now=performance.now(),gap=now-lastWheel;lastWheel=now;
  if(!(event.deltaY>0)){back();return;}                            // back (or sideways): ordinary scrolling
  if(!next()&&!(current()?.film&&!playing))return;                  // past the last chapter: ordinary scrolling
  event.preventDefault();
  if(gliding||now<cooldownUntil||gap<GESTURE_GAP_MS)return;        // one gesture, one move
  later(busy());
 },{passive:false});
 addEventListener('touchstart',event=>{touchY=event.touches[0].clientY;touchDone=false;},{passive:true});
 addEventListener('touchmove',event=>{
  if(touchY===null||reduced.matches||inField(event.target))return;
  const dy=touchY-event.touches[0].clientY;                        // positive: finger moves up = forward
  if(dy<-8){back();touchY=null;return;}                            // swipe down: ordinary scrolling
  if(!next()&&!(current()?.film&&!playing))return;
  event.preventDefault();
  if(dy>SWIPE_PX&&!touchDone){touchDone=true;if(!gliding&&performance.now()>=cooldownUntil)later(busy());}
 },{passive:false});
 addEventListener('touchend',()=>{touchY=null;},{passive:true});
 addEventListener('keydown',event=>{
  if(reduced.matches||inField(event.target)||event.altKey||event.metaKey||event.ctrlKey)return;
  if(['ArrowUp','PageUp','Home'].includes(event.code)){back();return;}
  if(!['ArrowDown','PageDown','Space'].includes(event.code))return;
  if(event.code==='Space'&&event.target.closest('button,a'))return;
  if(!next()&&!(current()?.film&&!playing))return;
  event.preventDefault();
  if(gliding||performance.now()<cooldownUntil)return;
  later(busy());
 });
 document.addEventListener('stage:navigate',e=>{if(!e.detail?.beat)back();});   // a nav link or chapter click takes over
 addEventListener('resize',back);
 const api={forward,back,chapters,next,current,get playing(){return playing;},get gliding(){return gliding;}};
 window.__beats=api;
 return api;
}
