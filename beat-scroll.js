// One scroll per thing (owner 10-24, "like USAvionix"): a forward wheel tick, a swipe up or ArrowDown/PageDown/Space
// takes the page to the NEXT BEAT and no further. Where the chapter has a film, the film plays natively to the beat
// (scene-playback.js playTo) so the page moves at the film's own pace; elsewhere the page glides. Further forward
// input is swallowed until the beat is reached, plus a short cooldown for trackpad inertia. Scrolling back is
// ordinary scrolling (and cancels a step in progress). Beats, in page order:
//   the arrival (hero, the opening film's end), the delivery hold (the second film's end), each tour chapter's
//   settled moment (the framework's own display table) plus the operator beats, the numbers, the contact.
// Off with ?freescroll=1, ?edit=1, or reduced motion.
import {DELIVERY_END} from './intro-timing.js?v=1';
import {displays} from './original-display-framework.js?v=10';
const HANDOFF=.75;                       // atlas-stage.js: hand-offs take 1.5 screens, the inset is half of that
const COOLDOWN_MS=550, GESTURE_GAP_MS=90, SWIPE_PX=28;
export function installBeatScroll({stage,tracks,playback,getActive,readProgress}){
 const params=new URLSearchParams(location.search);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(params.has('freescroll')||params.has('edit'))return null;
 const body=document.body;
 let stepping=null,cooldownUntil=0,lastWheel=0,glideFrame=0,touchY=null,touchDone=false;
 const sections=()=>[...document.querySelectorAll('main > section')];
 function operatorBeats(){
  if(body.dataset.operatorSequence!=='true')return [];
  const last=Number(body.dataset.fieldTimelineFrames)-1,start=Number(body.dataset.operatorStartFrame);
  if(!(last>0)||!(start>0))return [];
  // Tail-local seconds of the three operator beats (30 fps): carrying the clippings, the carton out, the closing line.
  return [169,491,595].map(f=>Math.min(1,(start+f)/last));
 }
 function beatsFor(section){
  const id=section.id;
  if(id==='top')return [.25,DELIVERY_END];
  if(id==='inside'){
   const table=displays.filter(d=>d.section==='inside'&&d.id!=='operator').map(d=>d.at);
   return [...new Set([...table,...operatorBeats()])].filter(p=>p>0&&p<=1).sort((a,b)=>a-b);
  }
  const d=displays.find(x=>x.section===id);
  return [d?d.at:.15];
 }
 function positionOf(section,index,p){
  const slot=stage.slot(section),vh=innerHeight,inset=index?vh*HANDOFF:0;
  return slot.offsetTop+inset+Math.max(0,Math.min(1,p))*(slot.offsetHeight-inset-vh*HANDOFF);
 }
 function beats(){
  const out=[];
  sections().forEach((section,index)=>{for(const p of beatsFor(section))out.push({section,index,p,y:positionOf(section,index,p)});});
  return out.sort((a,b)=>a.y-b.y);
 }
 function nextBeat(){const y=scrollY+4;return beats().find(b=>b.y>y)||null;}
 function glide(y){
  return new Promise(resolve=>{
   const from=scrollY,dy=y-from;if(Math.abs(dy)<2){resolve();return;}
   const duration=Math.min(2200,Math.max(650,500+Math.abs(dy)/10)),t0=performance.now();
   const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
   cancelAnimationFrame(glideFrame);
   glideFrame=requestAnimationFrame(function frame(now){
    const k=Math.min(1,(now-t0)/duration);scrollTo(0,from+dy*ease(k));
    if(k<1&&stepping)glideFrame=requestAnimationFrame(frame);else{glideFrame=0;resolve();}
   });
  });
 }
 function waitPaused(timeoutMs){
  return new Promise(resolve=>{
   let seen=false;const timer=setTimeout(done,timeoutMs);
   function done(){clearTimeout(timer);document.removeEventListener('motion:playback',on);resolve();}
   function on(e){const m=e.detail?.mode;if(m==='playing'||m==='loading')seen=true;if(m==='paused'&&(seen||e.detail?.error))done();}
   document.addEventListener('motion:playback',on);
  });
 }
 async function step(){
  const target=nextBeat();if(!target)return false;
  stepping=target;body.dataset.beatStep='1';
  document.dispatchEvent(new CustomEvent('beat:step',{detail:{section:target.section.id,p:target.p}}));
  try{
   const active=getActive();
   const same=active&&active.track===target.section;
   if(same&&active.view?.preparePlayback&&!reduced.matches&&readProgress(active)<target.p-1e-3&&playback.playTo(target.p)){
    const seconds=Math.max(3,(target.p-readProgress(active))*90);     // generous: the tour film is 77 s end to end
    await waitPaused(seconds*1000+4000);
    if(stepping===target&&Math.abs(scrollY-target.y)>3)await glide(target.y);
   }else if(stepping===target)await glide(target.y);
  }finally{
   if(stepping===target){stepping=null;delete body.dataset.beatStep;cooldownUntil=performance.now()+COOLDOWN_MS;
    document.dispatchEvent(new CustomEvent('beat:arrived',{detail:{section:target.section.id,p:target.p}}));}
  }
  return true;
 }
 function cancel(){
  if(!stepping)return;stepping=null;delete body.dataset.beatStep;cancelAnimationFrame(glideFrame);glideFrame=0;
  playback.pause({capture:true});cooldownUntil=0;
 }
 const inField=target=>!!target.closest?.('input,textarea,select,[contenteditable="true"],dialog[open]');
 addEventListener('wheel',event=>{
  if(reduced.matches||event.ctrlKey)return;
  const now=performance.now(),gap=now-lastWheel;lastWheel=now;
  if(!(event.deltaY>0)){if(stepping)cancel();return;}           // back (or sideways): ordinary scrolling
  if(stepping||now<cooldownUntil){event.preventDefault();return;}  // one tick is one beat: swallow the rest
  if(gap<GESTURE_GAP_MS)return;                                   // the tail of a gesture already handled
  if(!nextBeat())return;                                          // past the last beat: ordinary scrolling
  event.preventDefault();step();
 },{passive:false});
 addEventListener('touchstart',event=>{touchY=event.touches[0].clientY;touchDone=false;},{passive:true});
 addEventListener('touchmove',event=>{
  if(touchY===null||reduced.matches||inField(event.target))return;
  const dy=touchY-event.touches[0].clientY;                       // positive: finger moves up = forward
  if(dy<-8){if(stepping)cancel();touchY=null;return;}             // swipe down: ordinary scrolling
  if(stepping||performance.now()<cooldownUntil){event.preventDefault();return;}
  if(dy>SWIPE_PX&&!touchDone){touchDone=true;if(nextBeat()){event.preventDefault();step();}}
  else if(dy>0&&nextBeat())event.preventDefault();               // hold the page still until the swipe commits
 },{passive:false});
 addEventListener('touchend',()=>{touchY=null;},{passive:true});
 addEventListener('keydown',event=>{
  if(reduced.matches||inField(event.target)||event.altKey||event.metaKey||event.ctrlKey)return;
  if(['ArrowUp','PageUp','Home'].includes(event.code)){if(stepping)cancel();return;}
  if(!['ArrowDown','PageDown','Space'].includes(event.code))return;
  if(event.code==='Space'&&event.target.closest('button,a'))return;
  if(stepping||performance.now()<cooldownUntil){event.preventDefault();return;}
  if(!nextBeat())return;
  event.preventDefault();step();
 });
 document.addEventListener('stage:navigate',cancel);     // a nav link or chapter click takes over
 addEventListener('resize',()=>{if(stepping)cancel();});
 const api={step,cancel,beats,next:nextBeat,get stepping(){return stepping;}};
 window.__beats=api;
 return api;
}
