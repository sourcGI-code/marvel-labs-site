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
const GAP=36, FPS=30, SLIDE_IN=1.3, SLIDE_OUT=2.0, IN_START=1.15, CLEAR_FROM=1.9, OUT_EARLIEST=7.05;
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};   // smootherstep: zero speed and acceleration at both ends
export async function installHeroFrame(){
 const root=document.documentElement,host=document.getElementById('hero-visual'),story=document.getElementById('platform-story'),track=document.getElementById('top');
 if(!host||!story||!track)return;
 let data=null;
 try{const r=await fetch(new URL('assets/marvel-v4/opening-film/desktop-frame.json',import.meta.url));if(r.ok)data=(await r.json()).frames;}catch{}
 let plan=null,last=NaN;
 function set(px){px=Math.max(0,Math.round(px*100)/100);if(px!==last){last=px;root.style.setProperty('--hero-shift',px+'px');}}
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
  const shiftAt=(t,outStart)=>{
   if(t<IN_START)return 0;
   if(t<outStart)return rig*ease((t-IN_START)/SLIDE_IN);
   return rig+(trailer-rig)*ease((t-outStart)/SLIDE_OUT);
  };
  let outStart=OUT_EARLIEST;
  for(;outStart<10-SLIDE_OUT;outStart+=.05){
   let ok=true;for(let i=Math.round(outStart*FPS);i<=last;i++)if(shiftAt(i/FPS,outStart)<clear(i)-1){ok=false;break;}
   if(ok)break;
  }
  plan={rig,trailer,outStart,at:t=>shiftAt(t,outStart)};
  root.dataset.heroFrame=`rig ${Math.round(rig)} trailer ${Math.round(trailer)} back at ${outStart.toFixed(2)}s`;
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
  if(!plan){set(0);return;}
  const p=parseFloat(track.dataset.sceneProgress||'0');
  if(p>=.25-1e-4){set(plan.trailer);return;}                          // the delivery: hold the trailer's place
  set(plan.at(Math.min(10,Math.max(0,filmTime(p)))));
 }
 build();
 (function loop(){if(document.body.dataset.activeScene==='top'&&!document.hidden)update();requestAnimationFrame(loop);})();
 let resizeTimer=0;
 addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{build();update();},120);});
 document.fonts?.ready?.then(()=>{build();update();});
 new ResizeObserver(()=>{build();update();}).observe(story);
}
