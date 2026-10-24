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
const GLIDE_MS=2400, COOLDOWN_MS=350, GESTURE_GAP_MS=90, SWIPE_PX=28;   // 2.4 s: owner 10-24, the 1.1 s move "displays it too fast"
export function installBeatScroll({stage,tracks,playback,getActive,readProgress}){
 const params=new URLSearchParams(location.search);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(params.has('freescroll')||params.has('edit'))return null;
 const body=document.body;
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
 function stopPlaying(){if(playing){playing=null;playback.pause({capture:true});}}
 function stopGlide(){if(gliding){gliding=null;cancelAnimationFrame(glideFrame);glideFrame=0;}}
 function settle(){delete body.dataset.beatStep;cooldownUntil=performance.now()+COOLDOWN_MS;}
 function play(chapter){
  // The chapter's film plays by itself to the chapter's end; the page waits there.
  if(!chapter.film||reduced.matches)return false;
  const active=getActive();
  if(!active||active.track!==chapter.section||readProgress(active)>=chapter.end-.004)return false;
  if(!playback.playTo(chapter.end))return false;
  playing=chapter;body.dataset.beatStep='1';
  const mine=++token;
  const onPlayback=e=>{if(mine!==token)return;const m=e.detail?.mode;if(m==='paused'){document.removeEventListener('motion:playback',onPlayback);if(playing===chapter){playing=null;settle();}}};
  document.addEventListener('motion:playback',onPlayback);
  return true;
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
 function forward(){
  if(gliding)return;                                   // already moving: one move per scroll
  if(playing){const n=next();if(n)glide(n);return;}    // skip ahead while a film plays
  const here=current();
  if(here&&here.film&&play(here))return;               // the thing in front of them plays
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
  forward();
 },{passive:false});
 addEventListener('touchstart',event=>{touchY=event.touches[0].clientY;touchDone=false;},{passive:true});
 addEventListener('touchmove',event=>{
  if(touchY===null||reduced.matches||inField(event.target))return;
  const dy=touchY-event.touches[0].clientY;                        // positive: finger moves up = forward
  if(dy<-8){back();touchY=null;return;}                            // swipe down: ordinary scrolling
  if(!next()&&!(current()?.film&&!playing))return;
  event.preventDefault();
  if(dy>SWIPE_PX&&!touchDone){touchDone=true;if(!gliding&&performance.now()>=cooldownUntil)forward();}
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
  forward();
 });
 document.addEventListener('stage:navigate',e=>{if(!e.detail?.beat)back();});   // a nav link or chapter click takes over
 addEventListener('resize',back);
 const api={forward,back,chapters,next,current,get playing(){return playing;},get gliding(){return gliding;}};
 window.__beats=api;
 return api;
}
