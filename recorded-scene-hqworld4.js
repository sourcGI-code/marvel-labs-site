// Recorded once by scripts/record-site-films.py. Visitors decode video;
// no geometry, texture uploads, shader compilation or WebGL context is needed.
import {loadFilmSources,sceneFilmSource,introFilmKind} from './film-sources-hqworld4.js?v=sleek20-review-v1';
import {filmFraming,placeFilm} from './film-framing-hqworld4.js?v=sleek20-review-v1';
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>a+(b-a)*t;
export function interpolateRecordedState(a,b,t){
 if(typeof a==='number'&&typeof b==='number')return mix(a,b,t);
 if(Array.isArray(a)||Array.isArray(b)){
  // Label collections appear/disappear at chapter boundaries. Different-sized
  // arrays must stay arrays instead of falling through to object interpolation.
  if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length)return a.map((v,i)=>interpolateRecordedState(v,b[i],t));
  return t<.5?a:b;
 }
 if(a&&b&&typeof a==='object'&&typeof b==='object')return Object.fromEntries(Object.keys(a).map(k=>[k,interpolateRecordedState(a[k],b[k],t)]));
 return t<.5?a:b;
}

export async function createRecordedScene(canvas,{name,onChange=()=>{},maxSeconds=Infinity}){
 await loadFilmSources();
 let filmSource=sceneFilmSource(name),revision=filmSource.revision;
 const host=canvas.parentElement,video=document.createElement('video'),still=new Image();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 video.className='recorded-scene';video.muted=video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.disablePictureInPicture=true;video.tabIndex=-1;video.setAttribute('aria-hidden','true');
 still.className='recorded-scene recorded-still';still.alt='';still.setAttribute('aria-hidden','true');
 host.append(video,still);canvas.style.visibility='hidden';
 let metadata,kind='',wanted=0,enabled=true,visible=true,shown=false,failed=false,loading=0,frame=0,objectURL=null,localPending=false,lastSeek=0;
 let mediaURL='',generation=0,controller,stillFile='',pendingStill='',lastPresentedTime=0;
 // Cover fit + optional push-in (film-framing.js). The video and still are placed with the same transform the
 // overlays are projected with, so labels, callouts and leaders stay on their objects at any aspect ratio.
 let framing=filmFraming('','',null),frameWindow=null,placed='',lastPlace=null;
 // popout.css --hold-zoom is the single switch for every push-in: its value caps the zoom (1 = plain cover).
 function capFraming(){const cap=parseFloat(getComputedStyle(host).getPropertyValue('--hold-zoom'));if(Number.isFinite(cap)&&cap>=1)framing={...framing,maxZoom:Math.min(framing.maxZoom,cap)};}
 function place(w,h,time){
  const f=placeFilm(w,h,metadata.width,metadata.height,framing,time,frameWindow);lastPlace=f;
  const key=[w,h,f.cover,f.zoom,f.dx,f.dy].map(v=>v.toFixed(3)).join();
  if(key!==placed){placed=key;const width=`${metadata.width*f.cover}px`,height=`${metadata.height*f.cover}px`,transform=`translate3d(${f.dx}px,${f.dy}px,0) scale(${f.zoom})`;
   for(const el of [video,still])Object.assign(el.style,f.media?{left:f.media.left+'px',top:f.media.top+'px',right:'auto',bottom:'auto',width:f.media.width+'px',height:f.media.height+'px',transformOrigin:'0 0',transform:'none'}:{left:'0',top:'0',right:'auto',bottom:'auto',width,height,transformOrigin:'0 0',transform});
   // Zoomed out below cover (film-framing.js minZoom): feather the film's edges into the page, in proportion.
   const feather=f.feather===false?0:Math.max(0,Math.min(14,(1-f.zoom)*70));host.style.setProperty('--film-feather',feather.toFixed(2)+'%');host.classList.toggle('film-contained',f.feather!==false&&f.zoom<.999);}
  return f;
 }
 function unplace(){placed='';lastPlace=null;host.classList.remove('film-contained');for(const el of [video,still])for(const k of ['left','top','right','bottom','width','height','transformOrigin','transform'])el.style[k]='';}
 const changed=()=>onChange();
 const matches=()=>metadata&&Math.abs(video.currentTime-targetTime())<.075;
 const playbackDuration=()=>metadata?Math.min(maxSeconds,(metadata.playbackDuration??metadata.duration)-1/metadata.fps):0;
 // Map the visible cut back to the original sample timeline, including a
 // shorter editorial endpoint within an already trimmed movie.
 const sourceProgress=()=>metadata?wanted*playbackDuration()*metadata.fps/(metadata.frames-1):0;
 const targetTime=()=>metadata?Math.min(wanted*playbackDuration(),Math.max(0,video.duration-.001)):0;
 const usingStill=()=>reduced.matches||failed;
 const chapterStill=()=>metadata?.stills?.findLast(s=>sourceProgress()>=s.start)||metadata?.stills?.[0];
 function updateVisibility(){video.style.visibility=visible&&shown&&!usingStill()?'visible':'hidden';still.style.visibility=visible&&shown&&usingStill()?'visible':'hidden';}
 function requestSeek(){if(enabled&&video.paused&&!video.dataset.timelinePlaying&&!frame)frame=requestAnimationFrame(seek);}
 function seek(){
  frame=0;if(!metadata||!enabled||!video.paused||video.dataset.timelinePlaying)return;
  if(usingStill()){loadStill();return;}
  if(video.readyState<2||video.seeking)return;
  const target=targetTime();
  if(Math.abs(video.currentTime-target)<1/(metadata.fps*2)){if(!shown){shown=true;updateVisibility();changed();}return;}
  const now=performance.now();if(now-lastSeek<1000/30){requestSeek();return;}
  let seekable=false;
  for(let i=0;i<video.seekable.length;i++)if(target>=video.seekable.start(i)&&target<=video.seekable.end(i)+.04)seekable=true;
  if(!seekable){if(video.networkState===video.NETWORK_IDLE)localCopy();return;}
  lastSeek=now;lastPresentedTime=video.currentTime;video.currentTime=target;
 }
 async function loadStill(){
  const chapter=chapterStill();if(!chapter||chapter.file===stillFile||chapter.file===pendingStill)return;
  const file=chapter.file,current=generation;pendingStill=file;
  const image=new Image();image.src=`${filmSource.base}/${file}?v=${revision}`;
  try{await image.decode();if(current!==generation||file!==chapterStill()?.file)return;still.src=image.src;stillFile=file;shown=true;updateVisibility();changed();}
  catch{if(current===generation)changed();}
  finally{if(pendingStill===file)pendingStill='';}
 }
 // Static development servers may omit byte ranges. Only those servers need a
 // local complete copy. Production/range-aware hosts stream requested frames.
 async function localCopy(){
  if(localPending||objectURL||failed)return;localPending=true;const current=generation;
  try{const response=await fetch(mediaURL,{cache:'force-cache',signal:controller.signal});if(!response.ok)throw Error('Film unavailable');const blob=await response.blob();if(current!==generation)return;objectURL=URL.createObjectURL(blob);video.src=objectURL;video.load();}
  catch(error){if(current===generation&&error.name!=='AbortError'){failed=true;changed();}}
  finally{if(current===generation)localPending=false;}
 }
 async function source(){
  const portraitField=name==='field'&&innerWidth<=1024&&innerHeight>innerWidth;
  // A staged desktop/phone rollout pins the initial complete movie AND its
  // metadata. Resizing may change fit, but never the navigation's timeline.
  const next=name==='cargo'?introFilmKind():filmSource.kind??(innerWidth<=760||portraitField?'mobile':'desktop');
  if(next===kind)return;kind=next;filmSource=sceneFilmSource(name,kind);revision=filmSource.revision;const current=++generation;unplace();
  controller?.abort();controller=new AbortController();loading++;shown=false;failed=false;metadata=null;stillFile=pendingStill='';updateVisibility();
  if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}localPending=false;
  const base=`${filmSource.base}/${kind}`;mediaURL=`${filmSource.mediaBase||filmSource.base}/${filmSource.videoFile||kind+'.mp4'}?v=${revision}`;   // 10-29: the movie may live off GitHub Pages (mediaBase); json + stills stay herevideo.dataset.filmQuality=filmSource.quality||'original';
  // A deep link waits for its actual frame, never an unrelated first-frame still.
  video.removeAttribute('poster');video.pause();
  if(reduced.matches)video.removeAttribute('src');else video.src=mediaURL;
  video.load();
  try{const response=await fetch(`${base}.json?v=${revision}`,{signal:controller.signal});if(!response.ok)throw Error('Film timeline unavailable');const data=await response.json();if(current!==generation)return;metadata=data;framing=filmFraming(filmSource.base,kind,data);capFraming();requestSeek();changed();}
  catch(error){if(current===generation&&error.name!=='AbortError'){failed=true;changed();}}
  finally{loading--;}
 }
 video.addEventListener('playing',()=>{shown=true;updateVisibility();changed();});
 video.addEventListener('loadeddata',requestSeek);
 video.addEventListener('progress',requestSeek);
 video.addEventListener('seeked',()=>{if(matches()){shown=true;updateVisibility();}requestSeek();changed();});
 video.addEventListener('error',()=>{if(reduced.matches)return;if(!objectURL&&!localPending)localCopy();else{failed=true;requestSeek();changed();}});
 reduced.addEventListener('change',()=>{kind='';source();});

 function draw(p){
  wanted=clamp(p);requestSeek();if(!metadata)return {p:wanted,loading:true};
  const originalP=sourceProgress();
  // Cargo's stage and overlays follow the displayed movie during native playback.
  // A pending scrub retains the last decoded camera; its sought frame changes both
  // film and host framing together on seeked. Other scene clocks stay unchanged.
  const decodedCargo=name==='cargo'&&framing.oldDeliveryStage&&shown&&!usingStill();
  if(decodedCargo&&!video.seeking)lastPresentedTime=video.currentTime;
  const sampleP=usingStill()?(chapterStill()?.p??originalP):decodedCargo?
   clamp(lastPresentedTime*metadata.fps/(metadata.frames-1)):originalP;
  const samples=metadata.samples,frameIndex=sampleP*(metadata.frames-1)/3,index=Math.min(samples.length-2,Math.floor(frameIndex));
  const a=samples[Math.max(0,index)],b=samples[Math.max(0,index)+1]||a;
  const state=interpolateRecordedState(a,b,clamp((sampleP-a.p)/Math.max(.000001,b.p-a.p)));
  const w=canvas.clientWidth||host.clientWidth,h=canvas.clientHeight||host.clientHeight;
  const {scale,dx,dy}=place(w,h,sampleP*(metadata.frames-1)/metadata.fps);
  const point=v=>({...v,x:v.x*scale+dx,y:v.y*scale+dy});
  if(state.labels)state.labels=state.labels.map(point);
  if(state.annotation)state.annotation=point(state.annotation);
  if(state.route?.properties)state.route.properties=state.route.properties.map(v=>{const q=point(v);if(v.box)q.box={x0:v.box.x0*scale+dx,y0:v.box.y0*scale+dy,x1:v.box.x1*scale+dx,y1:v.box.y1*scale+dy};return q;})   // 10-29: house boxes (auto-quote);
  const workflowP=state.workflowP??sampleP;
  if(name==='cargo'&&state.cargoFeet){state.cargoFeet=[12,8];state.factoryFeet=8;}
  if(metadata.vision){
   const full=metadata.vision,classification=clamp((workflowP-.205)/.065),measuring=clamp((workflowP-.275)/.05);
   const count=workflowP<.205?0:Math.min(full.total,Math.floor(classification*full.total)+1);
   state.vision={...full,visible:workflowP>=.20&&workflowP<.46&&!state.route?.active,mix:1,count,classification,measuring,measured:measuring>=1,stage:workflowP>=.34?'localize':measuring>0?'measure':'classify',activeId:full.observations[Math.min(count-1,full.total-1)]?.id,origin:point(full.origin),observations:full.observations.slice(0,count).map(o=>({...o,box:{...point(o.box),width:o.box.width*scale,height:o.box.height*scale},polygons:o.polygons?.map(poly=>poly.map(point))}))};
   state.yardReveal=1;
  }
  return {...state,p:wanted,workflowP,sourceProgress:sampleP,playback:usingStill()?'still':'recorded',videoTime:video.currentTime,presentationTime:sampleP*(metadata.frames-1)/metadata.fps,videoTarget:targetTime(),videoReady:shown,loading:!shown,frameReused:true,webglFrames:0};
 }
 await source();
 return {draw,async retry(){if(failed||video.error){kind='';await source();}return !failed;},resize(){placed='';source();requestSeek();},setFrameWindow(rect){frameWindow=rect||null;},get framing(){return lastPlace;},setPalette(){},setActive(value){enabled=value;if(value)requestSeek();},setVisible(value){visible=value;updateVisibility();},get ready(){return shown;},get atTarget(){return shown&&(usingStill()?stillFile===chapterStill()?.file:!video.seeking&&matches());},get failed(){return failed;},get duration(){return playbackDuration();},inspect:()=>({playback:usingStill()?'still':'recorded',kind,zoom:lastPlace?.zoom,ready:shown,failed,loading:!!loading,videoTime:video.currentTime,videoTarget:targetTime()}),video};
}
