// Owner 10-24: "the truck should drive in on the center, then when it displays the truck on the side and the trailer
// it should be displayed more to the right, then the trailer should be on center when the truck leaves" (and no
// letters may ever be blocked). The film's horizontal offset (--hero-shift, applied with the CSS translate property on
// #hero-visual) follows the opening film's own clock:
//   approach (to 1.45 s)       0: the pickup drives in centred;
//   side view (1.45 s - 7.1 s) the rig (trailer + pickup) centred in the space right of the copy, never under it;
//   pickup gone (7.1 s - 8.6 s) eases to the trailer centred on the screen, never under the copy;
//   delivery (scroll past the arrival) holds that; the delivery hold (.is-comparing) and phones: no shift.
// Vehicle extents per frame come from the installed film (assets/marvel-v4/opening-film/desktop-frame.json: l/r as
// fractions of the film width, truck = pickup in frame). The film is cover-fitted at 16:10 and, during the arrival,
// scaled by --arrival-film-scale about its centre.
const GAP=36, APPROACH_END=1.45, SIDE_IN=2.1, TRUCK_GONE=7.1, SETTLE_END=8.6;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export async function installHeroFrame(){
 const root=document.documentElement,host=document.getElementById('hero-visual'),story=document.getElementById('platform-story'),track=document.getElementById('top');
 if(!host||!story||!track)return;
 let data=null;
 try{const r=await fetch(new URL('assets/marvel-v4/opening-film/desktop-frame.json',import.meta.url));if(r.ok)data=(await r.json()).frames;}catch{}
 let last='';
 function set(px){const v=Math.max(0,Math.round(px))+'px';if(v!==last){last=v;root.style.setProperty('--hero-shift',v);}}
 function frameAt(t){if(!data)return null;return data[Math.max(0,Math.min(data.length-1,Math.round(t*30)))];}
 function geometry(){
  // Layout sizes and the pin's box: unaffected by the shift itself (measuring the shifted box fed the shift back in).
  const pin=host.parentElement.getBoundingClientRect(),cw=host.offsetWidth||innerWidth,ch=host.offsetHeight||innerHeight;
  const scale=parseFloat(getComputedStyle(root).getPropertyValue('--arrival-film-scale'))||1;
  return {cx:pin.left+host.offsetLeft+cw/2,film:Math.max(cw,ch*1.6),scale,copyRight:story.getBoundingClientRect().right};
 }
 const x=(g,f,scale)=>g.cx+(f-.5)*g.film*scale;          // a film fraction -> screen x, before the shift
 function clearance(g,l,scale){return g.copyRight+GAP-x(g,l,scale);}
 // The rig's place for the whole side view: centred in the space right of the copy, at least clear of it.
 function rigShift(g){
  let L=1,R=0;for(let i=Math.round(SIDE_IN*30);i<=Math.round(6.9*30);i++){const f=data[i];if(f){L=Math.min(L,f.l);R=Math.max(R,Math.min(f.r,.78));}}
  const centre=g.copyRight+(innerWidth-g.copyRight)/2-x(g,(L+R)/2,g.scale);
  return Math.max(centre,clearance(g,L,g.scale));
 }
 // The trailer's place once the pickup has gone: centred on the screen, at least clear of the copy (final frame, scale 1).
 function trailerShift(g){
  const f=data[data.length-1];
  return Math.max(innerWidth/2-x(g,(f.l+f.r)/2,1),clearance(g,f.l,1));
 }
 function shiftAt(t,g){
  if(t<APPROACH_END)return 0;
  const rig=rigShift(g),f=frameAt(t),clear=f?clearance(g,f.l,g.scale):0;
  if(t<TRUCK_GONE){
   const k=smooth((t-APPROACH_END)/(SIDE_IN-APPROACH_END));
   return t>=1.9?Math.max(rig*k,clear):rig*k;          // the whip (1.45-1.9 s) is a blur: ease in, clearance after it
  }
  const k=smooth((t-TRUCK_GONE)/(SETTLE_END-TRUCK_GONE));
  return Math.max(rig*(1-k)+trailerShift(g)*k,clear);
 }
 function update(){
  if(innerWidth<=760||!data){set(0);return;}
  const g=geometry(),p=parseFloat(track.dataset.sceneProgress||'0');
  if(p>=.25-1e-4){set(trailerShift(g));return;}                     // the delivery: hold the trailer's place
  const video=document.querySelector('video.opening-film');
  const t=video&&video.readyState>=1&&!video.ended?video.currentTime:Math.min(10,p*40);
  set(shiftAt(Math.min(10,Math.max(0,t)),g));
 }
 (function loop(){if(document.body.dataset.activeScene==='top'&&!document.hidden)update();requestAnimationFrame(loop);})();
 addEventListener('resize',update);
 document.fonts?.ready?.then(update);
}
