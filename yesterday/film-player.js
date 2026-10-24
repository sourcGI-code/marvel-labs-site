// A bounded, demand-loaded frame cache. Scroll remains entirely native.
export function createFilm(canvas,onReady,onUnavailable){
 const context=canvas.getContext('2d',{alpha:true});
 const layer=document.createElement('canvas'),composite=layer.getContext('2d',{alpha:true});
 const cache=new Map(),pending=new Set(),failed=new Set();
 const canonical=n=>n<12?0:n>=46&&n<=68?46:n;
 let desired=0,position=0,shown=-1,raf=0,disposed=false,width=1,height=1,pan=0;
 const mobile=matchMedia('(max-width:700px)').matches;
 const maxCached=mobile?6:9;
 const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 function paint(index,next=index,blend=0){
  if(!cache.has(index))return;const pair=cache.get(index);context.clearRect(0,0,canvas.width,canvas.height);
  const pose=position/95,retreat=Math.max(smooth(pose,.12,.27)*(1-smooth(pose,.39,.49)),smooth(pose,.72,.81)*(1-smooth(pose,.89,1)));
  pair.forEach((img,i)=>{
   // Back away as panels separate so the floating parts stay clear of the copy.
   const half=canvas.width/2,scale=Math.min(half/img.width,canvas.height/img.height)*(mobile?1.22:1.18)*(1-retreat*(mobile?.14:.30));
   const w=img.width*scale,h=img.height*scale,x=(half-w)/2,y=(canvas.height-h)/2;
   const blending=next!==index&&cache.has(next);
   composite.clearRect(0,0,layer.width,layer.height);
   // Add premultiplied frames on a transparent layer: no dark halos or doubled opacity.
   composite.globalCompositeOperation='source-over';composite.globalAlpha=blending?1-blend:1;composite.drawImage(img,x,y,w,h);
   if(blending){composite.globalCompositeOperation='lighter';composite.globalAlpha=blend;composite.drawImage(cache.get(next)[i],x,y,w,h);}
   composite.globalAlpha=1;composite.globalCompositeOperation='source-over';
   context.save();context.beginPath();context.rect(i*half,0,half,canvas.height);context.clip();
   context.translate(i*half+half/2,canvas.height/2+canvas.height*(pan*(i?-.7:1)+(mobile?0:retreat*.035)));context.rotate(pan*.75*(i?-1:1));
   context.drawImage(layer,-half/2,-canvas.height/2);context.restore();
  });shown=index;canvas.dataset.frame=index;onReady?.();
 }
 function nearest(){if(failed.has(desired)){onUnavailable?.();return;}const low=canonical(Math.floor(position)),high=canonical(Math.ceil(position));if(cache.has(low)&&cache.has(high)){paint(low,high,position-Math.floor(position));return;}let best=-1,distance=Infinity;for(const frame of cache.keys()){const d=Math.abs(frame-desired);if(d<distance){best=frame;distance=d;}}if(best>=0)paint(best);}
 function prune(){
  if(cache.size<=maxCached)return;
  const keys=[...cache.keys()].sort((a,b)=>Math.abs(b-desired)-Math.abs(a-desired));
  while(cache.size>maxCached){const key=keys.shift();if(key===shown)continue;cache.get(key).forEach(img=>img.close?.());cache.delete(key);}
 }
 async function request(index){
  if(index<0||index>95||cache.has(index)||pending.has(index)||failed.has(index)||disposed)return;
  pending.add(index);
  try{
   const results=await Promise.allSettled([20,16].map(async feet=>{
    const response=await fetch(new URL(`./assets/film/${feet}-${String(index).padStart(3,'0')}.webp?v=float-20261016`,import.meta.url));if(!response.ok)throw Error('Frame unavailable');
    const blob=await response.blob();return createImageBitmap(blob,mobile?{resizeWidth:720,resizeQuality:'high'}:{});
   }));
   if(results.some(result=>result.status==='rejected')){results.forEach(result=>{if(result.status==='fulfilled')result.value.close();});throw Error('Frame unavailable');}
   const pair=results.map(result=>result.value);
   if(disposed){pair.forEach(img=>img.close());return;}cache.set(index,pair);nearest();prune();
  }catch{failed.add(index);if(index===desired)onUnavailable?.();}finally{pending.delete(index);pump();}
 }
 function pump(){
  if(disposed)return;
  const wanted=[desired,desired+1,desired-1,desired+2,desired-2,desired+3,desired-3].map(canonical);
  for(const frame of wanted){if(pending.size>=3)break;if(frame>=0&&frame<=95&&!cache.has(frame)&&!pending.has(frame)&&!failed.has(frame))request(frame);}
 }
 function setProgress(value,drift=0){position=Math.max(0,Math.min(95,value*95));desired=canonical(Math.round(position));pan=drift;if(!raf)raf=requestAnimationFrame(()=>{raf=0;nearest();pump();});}
 function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(5000000/(width*height)));canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);layer.width=Math.ceil(canvas.width/2);layer.height=canvas.height;nearest();}
 new ResizeObserver(resize).observe(canvas);resize();pump();
 return {setProgress,resize,get frame(){return shown;},destroy(){disposed=true;cancelAnimationFrame(raf);cache.forEach(pair=>pair.forEach(i=>i.close?.()));cache.clear();}};
}
