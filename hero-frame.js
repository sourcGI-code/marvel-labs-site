// Owner 10-24: "the truck should drive in on the center, then when it displays the truck on the side and the trailer
// it should be displayed more to the right, then the trailer should be on center when the truck leaves" (no letters
// ever blocked), and then: "the shake happens when it's moving it to the right and back to the center, smoothen it".
// The film's horizontal offset (--hero-shift, CSS translate on #hero-visual) is ONE precomputed eased curve over the
// opening film's time, recomputed only when the screen size changes:
//   0 while the pickup drives in; an eased slide right (SLIDE_IN film seconds) to the rig's place, centred in the space
//   right of the copy; hold; an eased slide back (SLIDE_OUT) to the trailer centred on screen once the pickup is gone.
// The slide timings are chosen per screen so the curve never dips under the copy, checked against the vehicles' extents
// in every frame (assets/marvel-v4/opening-film/desktop-frame.json). Nothing is recomputed from per-frame data while it
// plays, and the film clock is interpolated between decoded frames, so the motion has no steps.
// While the film PLAYS, the glide is handed to the browser's compositor as one Web Animation of `translate` built from
// the same curve (owner 10-25: "stutters while gliding", every browser): the compositor runs it at the display's
// refresh rate whatever the page's script is busy with, so a late script frame can no longer hitch it. Scrubbing,
// pausing and the hold fall back to setting the position directly.
const GAP=36, FPS=30, SLIDE_IN=1.8, SLIDE_OUT=2.7;
// When the side view begins (the rig must clear the copy from then), the latest/earliest start of the slide right, and
// the earliest start of the slide back. They belong to the film's choreography, so desktop-frame.json carries them
// ("timing"); these defaults are the calm take's.
let IN_LATEST=1.15, IN_EARLIEST=.5, CLEAR_FROM=1.9, OUT_EARLIEST=7.05;
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};   // smootherstep: zero speed and acceleration at both ends
export async function installHeroFrame(){
 const root=document.documentElement,host=document.getElementById('hero-visual'),story=document.getElementById('platform-story'),track=document.getElementById('top');
 if(!host||!story||!track)return;
 let data=null;
 try{const r=await fetch(new URL('assets/marvel-v4/opening-film/desktop-frame.json?v=3',import.meta.url));if(r.ok){const json=await r.json();data=json.frames;const k=json.timing||{};IN_LATEST=k.inLatest??IN_LATEST;IN_EARLIEST=k.inEarliest??IN_EARLIEST;CLEAR_FROM=k.clearFrom??CLEAR_FROM;OUT_EARLIEST=k.outEarliest??OUT_EARLIEST;}}catch{}
 let plan=null,last=NaN;
 // Written on the film element itself (not a page-wide variable: that restyled the whole page every frame and dropped
 // frames mid-slide), and only when it changes. '' hands the element back to the stylesheet (the delivery hold).
 function set(px){const v=px===null?'':Math.max(0,Math.round(px*100)/100)+'px 0';if(v!==last){last=v;host.style.translate=v;}}
 function build(){
  if(innerWidth<=760||!data){plan=null;return;}
  // Layout sizes and the pin's box: unaffected by the shift itself.
  const pin=host.parentElement.getBoundingClientRect(),cw=host.offsetWidth||innerWidth,ch=host.offsetHeight||innerHeight;
  const cx=pin.left+host.offsetLeft+cw/2,film=Math.max(cw,ch*1.6),copyRight=story.getBoundingClientRect().right;
  const aspect=cw/ch,fill=Math.max(aspect/1.6,1.6/aspect);
  const scale=t=>{const k=Math.max(0,Math.min(1,(t-9.1)/.9));return 1+(fill-1)*(1-k*k*(3-2*k));};   // arrival-reveal.js
  const x=(f,t)=>cx+(f-.5)*film*scale(t);
  const clear=i=>copyRight+GAP-x(data[i].l,i/FPS);                    // the shift a frame needs to clear the copy
  const last=data.length-1;
  // The rig's place: centred in the space right of the copy, and clear of it for the whole side view.
  let L=1,R=0,need=0;
  for(let i=Math.round(CLEAR_FROM*FPS);i<=Math.round(OUT_EARLIEST*FPS);i++){L=Math.min(L,data[i].l);R=Math.max(R,Math.min(data[i].r,.78));need=Math.max(need,clear(i));}
  const rig=Math.max(copyRight+(innerWidth-copyRight)/2-x((L+R)/2,4),need);
  // The trailer's place: centred on the screen, clear of the copy in the settled frames.
  const end=data[last];let needEnd=0;for(let i=Math.round(9*FPS);i<=last;i++)needEnd=Math.max(needEnd,clear(i));
  const trailer=Math.max(innerWidth/2-x((end.l+end.r)/2,10),needEnd,0);
  // The slide back starts as early as it can without the curve ever dipping under the copy.
  const shiftAt=(t,inStart,outStart)=>{
   if(t<inStart)return 0;
   if(t<outStart)return rig*ease((t-inStart)/SLIDE_IN);
   return rig+(trailer-rig)*ease((t-outStart)/SLIDE_OUT);
  };
  const holds=(inStart,outStart,from,to)=>{for(let i=Math.round(from*FPS);i<=Math.min(last,Math.round(to*FPS));i++)if(shiftAt(i/FPS,inStart,outStart)<clear(i)-1)return false;return true;};
  // The slide right starts as late as it can (the pickup drives in centred) while being clear of the copy from the end
  // of the camera's whip; the slide back starts as early as it can without ever dipping under the copy.
  let inStart=IN_LATEST;
  while(inStart>IN_EARLIEST&&!holds(inStart,99,CLEAR_FROM,inStart+SLIDE_IN))inStart-=.05;
  let outStart=OUT_EARLIEST;
  while(outStart<10-SLIDE_OUT&&!holds(inStart,outStart,outStart,10))outStart+=.05;
  plan={rig,trailer,inStart,outStart,at:t=>shiftAt(t,inStart,outStart)};   // a new object: a running glide is rebuilt for it
  root.dataset.heroFrame=`rig ${Math.round(rig)} trailer ${Math.round(trailer)} right ${inStart.toFixed(2)}-${(inStart+SLIDE_IN).toFixed(2)}s back ${outStart.toFixed(2)}-${(outStart+SLIDE_OUT).toFixed(2)}s`;
 }
 // The film clock between decoded frames: currentTime advances in steps, so while playing it is extrapolated from the
 // last change with the wall clock and the playback rate (never more than 0.12 s ahead of the decoder).
 // While playing, a smoothed clock runs at the playback rate and is nudged gently toward the decoder's time (snapped
 // only on a real jump: a seek or a scrub), so the curve is sampled at evenly advancing times.
 let est=null,estWall=0;
 function filmTime(p){
  const v=document.querySelector('video.opening-film');
  if(!v||v.readyState<1){est=null;return Math.min(10,p*40);}
  const now=performance.now(),ct=v.currentTime;
  if(v.paused||v.ended||v.seeking||est===null){est=ct;estWall=now;return ct;}
  est+=(now-estWall)/1000*(v.playbackRate||1);estWall=now;
  const off=ct-est;
  if(Math.abs(off)>.25)est=ct;else est+=off*.08;
  return est;
 }
 function update(){
  if(!plan){stopGlide();set(null);return;}
  if(host.closest('.pin')?.classList.contains('is-comparing')){stopGlide();set(null);return;}   // the hold: the stylesheet glides it home
  const p=parseFloat(track.dataset.sceneProgress||'0');
  if(p>=.25-1e-4){stopGlide();set(plan.trailer);return;}              // the delivery: hold the trailer's place
  const v=document.querySelector('video.opening-film');
  const t=Math.min(10,Math.max(0,filmTime(p)));
  if(v&&!v.paused&&!v.ended&&!v.seeking&&v.readyState>=2&&typeof host.animate==='function'){glide(v,t);return;}
  stopGlide();set(plan.at(t));
 }
 // The compositor glide: from film time t to the film's end at the film's playback rate. Rebuilt only when the film
 // starts, jumps, changes rate, or the plan changes; otherwise checked against the decoder every half second.
 let anim=null,animFrom=0,animRate=1,animWall=0,animPlan=null,checkedAt=0;
 function glide(v,t){
  const now=performance.now(),rate=v.playbackRate||1;
  if(anim&&animPlan===plan){
   // The flywheel changes the film's rate continuously: follow it with the animation's own rate (no rebuild).
   const want=rate/animRate;if(Math.abs((anim.playbackRate||1)-want)>.005)anim.updatePlaybackRate(want);
   if(now-checkedAt<500)return;
   checkedAt=now;
   const expected=animFrom+(anim.currentTime||0)/1000*animRate;
   if(Math.abs(expected-v.currentTime)<.12)return;                    // in step with the film
  }
  const from=v.currentTime,span=10-from;if(span<=.02){stopGlide();set(plan.at(10));return;}
  const steps=Math.max(2,Math.min(400,Math.ceil(span*40)));
  const frames=[];for(let i=0;i<=steps;i++){const ft=from+span*i/steps;frames.push({translate:Math.max(0,Math.round(plan.at(ft)*100)/100)+'px 0',offset:i/steps});}
  stopGlide(false);
  set(plan.at(from));                                                  // the resting value under the animation
  anim=host.animate(frames,{duration:span/rate*1000,easing:'linear',fill:'none'});
  anim.onfinish=()=>{if(anim){anim=null;set(plan.at(10));}};
  animFrom=from;animRate=rate;animWall=now;animPlan=plan;checkedAt=now;
 }
 function stopGlide(capture=true){
  if(!anim)return;
  if(capture){const v=document.querySelector('video.opening-film');if(v)set(plan?plan.at(Math.min(10,Math.max(0,v.currentTime))):0);}
  anim.cancel();anim=null;
 }
 build();
 (function loop(){if(document.body.dataset.activeScene==='top'&&!document.hidden)update();requestAnimationFrame(loop);})();
 let resizeTimer=0;
 addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{build();update();},120);});
 document.fonts?.ready?.then(()=>{build();update();});
 new ResizeObserver(()=>{build();update();}).observe(story);
}
