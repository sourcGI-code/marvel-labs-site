// A fixed, actor-free world behind the existing foreground films. These videos
// contain only the separately rendered background; no second truck is shown.
const MIN_DESKTOP=761;
const FILES={opening:{movie:'opening-world.mp4',poster:'opening-world-poster.webp',fps:84},
 cargo:{movie:'cargo-world.mp4',poster:'cargo-world-poster.webp',fps:30}};
const url=file=>new URL('assets/hqworld-background-v3/'+file+'?v=1',import.meta.url).href;

// Keep the real world projection beneath the contained foreground. Only the
// outermost background pixels stretch into the otherwise-uncovered strips.
export function heroWorldSlices(sw,sh,{width,height,filmWidth,filmHeight,shift=0,scale=1}){
 const dw=filmWidth*scale,dh=filmHeight*scale,x=(width-dw)/2+shift,y=(height-dh)/2;
 const right=x+dw,bottom=y+dh,slices=[];
 const add=(sx,sy,swidth,sheight,dx,dy,dwidth,dheight)=>{if(dwidth>0&&dheight>0)slices.push([sx,sy,swidth,sheight,dx,dy,dwidth,dheight]);};
 add(0,0,sw,sh,x,y,dw,dh);
 add(0,0,1,sh,0,y,Math.max(0,x),dh);
 add(sw-1,0,1,sh,right,y,Math.max(0,width-right),dh);
 add(0,0,sw,1,x,0,dw,Math.max(0,y));
 add(0,sh-1,sw,1,x,bottom,dw,Math.max(0,height-bottom));
 add(0,0,1,1,0,0,Math.max(0,x),Math.max(0,y));
 add(sw-1,0,1,1,right,0,Math.max(0,width-right),Math.max(0,y));
 add(0,sh-1,1,1,0,bottom,Math.max(0,x),Math.max(0,height-bottom));
 add(sw-1,sh-1,1,1,right,bottom,Math.max(0,width-right),Math.max(0,height-bottom));
 return slices;
}

export function installHeroWorldBackground(){
 const host=document.getElementById('hero-visual'),pin=host?.closest('.pin');
 if(!host||!pin)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let wrapper=null,poster=null,canvas=null,context=null,posterScene='',posterKey='',desktop=false,destroyed=false,raf=0,shown=null,wanted='opening';
 let foregroundStill=null,stillCleanup=null,stillObserver=null,staticCargoVisible=false,staticCargoStep=0;
 let paintSource=null,lastPaintKey='',geometry={shift:0,scale:1},viewport={width:0,height:0,filmWidth:0,filmHeight:0,dpr:1};
 let containedWidth='',containedHeight='';
 const foreground={opening:null,cargo:null},background={opening:null,cargo:null};
 const cleanups=[];
 function listen(target,name,fn){target.addEventListener(name,fn);return ()=>target.removeEventListener(name,fn);}
 function schedule(){if(desktop&&!destroyed&&!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
 function active(){return !document.hidden&&document.body.dataset.activeScene==='top';}
 function pause(state){
  if(!state)return;state.playToken++;
  if(!state.video.paused)state.video.pause();
 }
 function pauseAll(){for(const state of Object.values(background))pause(state);}
 function posterFor(scene,step=0){
  const key=scene+(scene==='cargo'?'-'+step:'');
  if(poster&&posterKey!==key){posterScene=scene;posterKey=key;poster.src=url(scene==='cargo'&&step>0?'cargo-world-step-'+step+'.webp':FILES[scene].poster);}
 }
 function showPoster(scene,step=0){
  posterFor(scene,step);shown=null;
  if(poster?.complete&&poster.naturalWidth>0)paintSource=poster;
 }
 function show(state){
  if(shown===state.name)return;
  shown=state.name;paintSource=state.video;posterFor(state.name);
 }
 function paint(){
  if(!context||!paintSource)return;
  const video=paintSource.tagName==='VIDEO';
  if(video&&paintSource.readyState<2)return;
  const sw=video?paintSource.videoWidth:paintSource.naturalWidth,sh=video?paintSource.videoHeight:paintSource.naturalHeight;
  if(!(sw>0&&sh>0))return;
  const key=[shown,posterKey,video?paintSource.currentTime:'poster',geometry.shift,geometry.scale,viewport.width,viewport.height,viewport.dpr].join('|');
  if(key===lastPaintKey)return;
  try{
   for(const slice of heroWorldSlices(sw,sh,{...viewport,...geometry}))context.drawImage(paintSource,...slice);
   lastPaintKey=key;canvas.style.opacity='1';
  }catch{} // Retain the last fully drawn world if decoding is temporarily busy.
 }
 function makeBackground(name){
  const video=document.createElement('video');
  video.className='hero-world-film hero-world-'+name;video.muted=video.defaultMuted=true;video.volume=0;
  video.playsInline=true;video.preload='auto';video.disablePictureInPicture=true;video.tabIndex=-1;
  video.setAttribute('aria-hidden','true');video.style.opacity='0';
  const state={name,video,failed:false,loaded:false,playPending:false,playBlocked:false,playToken:0,cleanups:[]};
  for(const event of ['loadedmetadata','loadeddata','canplay','seeked','playing','pause','waiting','stalled'])
   state.cleanups.push(listen(video,event,schedule));
  state.cleanups.push(listen(video,'error',()=>{state.failed=true;pause(state);if(shown===name)showPoster(wanted);schedule();}));
  wrapper.append(video);background[name]=state;return state;
 }
 function ensureSource(name){
  const state=background[name]||makeBackground(name);
  if(!state.loaded&&!reduced.matches){state.loaded=true;state.video.src=url(FILES[name].movie);state.video.load();}
  return state;
 }
 function unbindForeground(name){
  foreground[name]?.cleanups.forEach(fn=>fn());foreground[name]=null;
 }
 function bindForeground(name,video){
  if(foreground[name]?.video===video)return;
  unbindForeground(name);if(!video)return;
  const state={video,decodedTime:0,cleanups:[]};foreground[name]=state;
  for(const event of ['loadedmetadata','loadeddata','play','playing','pause','seeking','seeked','timeupdate','ratechange','ended','error']){
   state.cleanups.push(listen(video,event,()=>{
    if(!video.seeking&&video.readyState>=2&&Number.isFinite(video.currentTime))state.decodedTime=video.currentTime;
    if(event==='play'||event==='playing')for(const bg of Object.values(background))if(bg)bg.playBlocked=false;
    schedule();
   }));
  }
 }
 function refreshStill(){
  const loaded=foregroundStill?.complete&&foregroundStill.naturalWidth>0;
  const match=loaded&&(foregroundStill.currentSrc||foregroundStill.src||'').match(/(?:desktop|mobile)-step-([012])\.webp(?:[?#]|$)/);
  if(match)staticCargoStep=Number(match[1]);
  staticCargoVisible=!!(loaded&&foregroundStill.style.visibility==='visible'&&foregroundStill.style.display!=='none'&&!foregroundStill.hidden);
  schedule();
 }
 function bindStill(image){
  if(image===foregroundStill)return;
  stillCleanup?.();stillObserver?.disconnect();foregroundStill=image;staticCargoVisible=false;staticCargoStep=0;
  if(!image)return;
  stillCleanup=listen(image,'load',refreshStill);
  stillObserver=new MutationObserver(refreshStill);stillObserver.observe(image,{attributes:true,attributeFilter:['src','style','class','hidden']});
  refreshStill();
 }
 function discover(){
  if(!desktop)return;
  bindForeground('opening',host.querySelector('video.opening-film'));
  bindForeground('cargo',host.querySelector('video.recorded-scene'));
  bindStill(host.querySelector('img.recorded-still'));
  // Cargo becomes available during the intro; preload its world in time for
  // the decoded handoff without making any mobile movie requests.
  if(foreground.cargo&&!reduced.matches)ensureSource('cargo');
  schedule();
 }
 function attach(){
  if(wrapper)return;
  wrapper=document.createElement('div');wrapper.id='hero-world-background';wrapper.setAttribute('aria-hidden','true');
  canvas=document.createElement('canvas');canvas.className='hero-world-canvas';canvas.style.opacity='0';context=canvas.getContext('2d',{alpha:false});
  poster=document.createElement('img');poster.className='hero-world-poster';poster.alt='';poster.decoding='async';poster.style.display='none';
  poster.addEventListener('load',()=>{if(!shown){paintSource=poster;lastPaintKey='';paint();}schedule();});
  wrapper.append(canvas,poster);pin.insertBefore(wrapper,host);
  // Seed once in case a paused intro was already positioned before this module
  // attached. Subsequent movement comes only from geometry events.
  const initial=getComputedStyle(host),shift=parseFloat(initial.translate),scale=parseFloat(initial.scale);
  geometry={shift:Number.isFinite(shift)?shift:0,scale:Number.isFinite(scale)&&scale>0?scale:1};
  sizeCanvas();
  posterFor(reduced.matches?'cargo':'opening');
  if(!reduced.matches)ensureSource('opening');
  discover();
 }
 function detach(){
  if(raf){cancelAnimationFrame(raf);raf=0;}
  for(const name of Object.keys(background)){
   const state=background[name];if(!state)continue;
   pause(state);state.cleanups.forEach(fn=>fn());state.video.removeAttribute('src');state.video.load();background[name]=null;
  }
  for(const name of Object.keys(foreground))unbindForeground(name);
  bindStill(null);
  wrapper?.remove();wrapper=poster=canvas=context=null;posterScene=posterKey='';shown=null;paintSource=null;lastPaintKey='';
 }
 function sizeCanvas(){
  if(!canvas||!context)return;
  const width=Math.round(viewport.width*viewport.dpr),height=Math.round(viewport.height*viewport.dpr);
  if(canvas.width!==width||canvas.height!==height){canvas.style.opacity='0';canvas.width=width;canvas.height=height;context.setTransform(viewport.dpr,0,0,viewport.dpr,0,0);lastPaintKey='';paint();}
 }
 function resize(){
  // Only resize reads layout dimensions. The per-frame clock follower does not
  // read styles or bounding boxes and never changes foreground transforms.
  const width=host.offsetWidth||innerWidth,height=host.offsetHeight||innerHeight;
  const filmWidth=Math.min(width,height*1.6),w=filmWidth+'px',h=filmWidth/1.6+'px';
  viewport={width,height,filmWidth,filmHeight:filmWidth/1.6,dpr:Math.min(1.5,Math.max(1,window.devicePixelRatio||1))};
  if(w!==containedWidth){containedWidth=w;host.style.setProperty('--hero-contained-width',w);}
  if(h!==containedHeight){containedHeight=h;host.style.setProperty('--hero-contained-height',h);}
  const next=innerWidth>=MIN_DESKTOP;
  if(next!==desktop){desktop=next;if(desktop)attach();else detach();}
  if(desktop){attach();sizeCanvas();discover();schedule();}
 }
 function play(state){
  if(!state.video.paused||state.playPending||state.playBlocked)return;
  state.playPending=true;const token=++state.playToken;
  Promise.resolve(state.video.play()).then(()=>{
   const source=foreground[state.name]?.video;
   if(destroyed||!desktop||reduced.matches||!active()||wanted!==state.name||!source||source.paused||source.seeking||token!==state.playToken)state.video.pause();
  }).catch(()=>{state.playBlocked=true;}).finally(()=>{state.playPending=false;schedule();});
 }
 function tick(){
  raf=0;if(!desktop||destroyed)return;
  if(!active()){pauseAll();return;}
  // .is-comparing is set only when the foreground cargo target is decoded.
  wanted=reduced.matches||staticCargoVisible?'cargo':pin.classList.contains('is-comparing')?'cargo':'opening';
  if(reduced.matches||staticCargoVisible){pauseAll();showPoster(wanted,staticCargoStep);paint();return;}
  const state=ensureSource(wanted),sourceState=foreground[wanted],source=sourceState?.video;
  for(const other of Object.values(background))if(other&&other!==state)pause(other);
  if(state.failed||!source||source.error){pause(state);showPoster(wanted,wanted==='cargo'?staticCargoStep:0);paint();return;}
  const video=state.video;
  if(!source.seeking&&source.readyState>=2&&Number.isFinite(source.currentTime))sourceState.decodedTime=source.currentTime;
  const target=Math.max(0,Math.min(sourceState.decodedTime,Number.isFinite(video.duration)?Math.max(0,video.duration-.001):Infinity));
  const running=!source.paused&&!source.ended&&!source.seeking&&source.readyState>=2;
  if(video.playbackRate!==source.playbackRate)video.playbackRate=source.playbackRate||1;
  if(!running)pause(state);
  if(video.readyState>=1&&!video.seeking){
   const tolerance=running?.055:1/FILES[wanted].fps;
   if(Math.abs(video.currentTime-target)>tolerance){
    pause(state);
    try{video.currentTime=target;}catch{} // A later metadata/progress event retries.
   }
  }
  const aligned=video.readyState>=2&&!video.seeking&&Math.abs(video.currentTime-target)<=Math.max(.055,1/FILES[wanted].fps);
  if(aligned){show(state);if(running)play(state);}
  paint();
  // Keep the last decoded world while a new target seeks. The actor-free poster
  // and pin's CSS poster remain underneath, so no empty rectangle is exposed.
  if(running||source.seeking||video.seeking||state.playPending)schedule();
 }
 const mediaObserver=new MutationObserver(discover);mediaObserver.observe(host,{childList:true,subtree:true});
 const stateObserver=new MutationObserver(schedule);stateObserver.observe(pin,{attributes:true,attributeFilter:['class']});
 stateObserver.observe(document.body,{attributes:true,attributeFilter:['data-active-scene']});
 cleanups.push(listen(window,'resize',resize));
 cleanups.push(listen(host,'hero-frame-geometry',event=>{
  const shift=Number(event.detail?.shift),scale=Number(event.detail?.scale);
  if(Number.isFinite(shift)&&Number.isFinite(scale)&&scale>0){geometry={shift,scale};schedule();}
 }));
 cleanups.push(listen(document,'visibilitychange',()=>{if(document.hidden){pauseAll();if(raf){cancelAnimationFrame(raf);raf=0;}}else schedule();}));
 cleanups.push(listen(reduced,'change',()=>{if(desktop){if(!reduced.matches)ensureSource(pin.classList.contains('is-comparing')?'cargo':'opening');discover();schedule();}}));
 cleanups.push(listen(document,'pointerdown',()=>{for(const state of Object.values(background))if(state)state.playBlocked=false;schedule();}));
 resize();
 return {resize,inspect:()=>({desktop,wanted,shown,poster:posterScene,posterKey,staticCargoStep,geometry,viewport,
  opening:background.opening?.video.currentTime??null,cargo:background.cargo?.video.currentTime??null}),
  destroy(){destroyed=true;desktop=false;detach();mediaObserver.disconnect();stateObserver.disconnect();cleanups.forEach(fn=>fn());}};
}
