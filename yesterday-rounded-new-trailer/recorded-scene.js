// Recorded once by scripts/record-site-films.py. Visitors decode video;
// no geometry, texture uploads, shader compilation or WebGL context is needed.
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

export async function createRecordedScene(canvas,{name,onChange=()=>{}}){
 // Revision 5/4 (2026-10-23): rack-free films, field capped at frame 1380 and cargo at the two-trailer beat.
 const revision=name==='field'?5:40;
 const host=canvas.parentElement,video=document.createElement('video'),still=new Image();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 video.className='recorded-scene';video.muted=video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.disablePictureInPicture=true;video.tabIndex=-1;video.setAttribute('aria-hidden','true');
 still.className='recorded-scene recorded-still';still.alt='';still.setAttribute('aria-hidden','true');
 host.append(video,still);canvas.style.visibility='hidden';
 let metadata,kind='',wanted=0,enabled=true,visible=true,shown=false,failed=false,loading=0,frame=0,objectURL=null,localPending=false,lastSeek=0;
 let mediaURL='',generation=0,controller,stillFile='',pendingStill='';
 const changed=()=>onChange();
 const matches=()=>metadata&&Math.abs(video.currentTime-targetTime())<.075;
 const targetTime=()=>metadata?Math.min(wanted*(metadata.duration-1/metadata.fps),Math.max(0,video.duration-.04)):0;
 const usingStill=()=>reduced.matches||failed;
 const chapterStill=()=>metadata?.stills?.findLast(s=>wanted>=s.start)||metadata?.stills?.[0];
 function updateVisibility(){video.style.visibility=visible&&shown&&!usingStill()?'visible':'hidden';still.style.visibility=visible&&shown&&usingStill()?'visible':'hidden';}
 function requestSeek(){if(enabled&&!frame)frame=requestAnimationFrame(seek);}
 function seek(){
  frame=0;if(!metadata||!enabled)return;
  if(usingStill()){loadStill();return;}
  if(video.readyState<2||video.seeking)return;
  const target=targetTime();
  if(Math.abs(video.currentTime-target)<1/(metadata.fps*2)){if(!shown){shown=true;updateVisibility();changed();}return;}
  const now=performance.now();if(now-lastSeek<1000/30){requestSeek();return;}
  let seekable=false;
  for(let i=0;i<video.seekable.length;i++)if(target>=video.seekable.start(i)&&target<=video.seekable.end(i)+.04)seekable=true;
  if(!seekable){if(video.networkState===video.NETWORK_IDLE)localCopy();return;}
  lastSeek=now;video.currentTime=target;
 }
 async function loadStill(){
  const chapter=chapterStill();if(!chapter||chapter.file===stillFile||chapter.file===pendingStill)return;
  const file=chapter.file,current=generation;pendingStill=file;
  const image=new Image();image.src=`assets/recorded/${name}/${file}?v=${revision}`;
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
  const next=innerWidth<=760||portraitField?'mobile':'desktop';
  video.style.objectFit=still.style.objectFit=portraitField&&innerWidth>760?'cover':'contain';
  if(next===kind)return;kind=next;const current=++generation;
  controller?.abort();controller=new AbortController();loading++;shown=false;failed=false;metadata=null;stillFile=pendingStill='';updateVisibility();
  if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}localPending=false;
  const base=`assets/recorded/${name}/${kind}`;mediaURL=`${base}.mp4?v=${revision}`;
  // A deep link waits for its actual frame, never an unrelated first-frame still.
  video.removeAttribute('poster');video.pause();
  if(reduced.matches)video.removeAttribute('src');else video.src=mediaURL;
  video.load();
  try{const response=await fetch(`${base}.json?v=${revision}`,{signal:controller.signal});if(!response.ok)throw Error('Film timeline unavailable');const data=await response.json();if(current!==generation)return;metadata=data;requestSeek();changed();}
  catch(error){if(current===generation&&error.name!=='AbortError'){failed=true;changed();}}
  finally{loading--;}
 }
 video.addEventListener('loadeddata',requestSeek);
 video.addEventListener('progress',requestSeek);
 video.addEventListener('seeked',()=>{if(matches()){shown=true;updateVisibility();}requestSeek();changed();});
 video.addEventListener('error',()=>{if(reduced.matches)return;if(!objectURL&&!localPending)localCopy();else{failed=true;requestSeek();changed();}});
 reduced.addEventListener('change',()=>{kind='';source();});

 function draw(p){
  wanted=clamp(p);requestSeek();if(!metadata)return {p:wanted,loading:true};
  const sampleP=usingStill()?(chapterStill()?.p??wanted):wanted;
  const samples=metadata.samples,frameIndex=sampleP*(metadata.frames-1)/3,index=Math.min(samples.length-2,Math.floor(frameIndex));
  const a=samples[Math.max(0,index)],b=samples[Math.max(0,index)+1]||a;
  const state=interpolateRecordedState(a,b,clamp((sampleP-a.p)/Math.max(.000001,b.p-a.p)));
  const w=canvas.clientWidth,h=canvas.clientHeight,fill=name==='field'&&kind==='mobile'&&w>760;
  const scale=(fill?Math.max:Math.min)(w/metadata.width,h/metadata.height);
  const dx=(w-metadata.width*scale)/2,dy=(h-metadata.height*scale)/2;
  const point=v=>({...v,x:v.x*scale+dx,y:v.y*scale+dy});
  if(state.labels)state.labels=state.labels.map(point);
  if(state.annotation)state.annotation=point(state.annotation);
  if(metadata.vision){
   const full=metadata.vision,classification=clamp((wanted-.205)/.065),measuring=clamp((wanted-.275)/.05);
   const count=wanted<.205?0:Math.min(full.total,Math.floor(classification*full.total)+1);
   state.vision={...full,visible:wanted>=.20&&wanted<.46,mix:1,count,classification,measuring,measured:measuring>=1,stage:wanted>=.34?'localize':measuring>0?'measure':'classify',activeId:full.observations[Math.min(count-1,full.total-1)]?.id,origin:point(full.origin),observations:full.observations.slice(0,count).map(o=>({...o,box:{...point(o.box),width:o.box.width*scale,height:o.box.height*scale},polygons:o.polygons?.map(poly=>poly.map(point))}))};
   state.yardReveal=1;
  }
  return {...state,p:wanted,playback:usingStill()?'still':'recorded',videoTime:video.currentTime,videoTarget:targetTime(),videoReady:shown,loading:!shown,frameReused:true,webglFrames:0};
 }
 await source();
 return {draw,resize(){source();requestSeek();},setPalette(){},setActive(value){enabled=value;if(value)requestSeek();},setVisible(value){visible=value;updateVisibility();},get ready(){return shown;},get atTarget(){return shown&&(usingStill()?stillFile===chapterStill()?.file:!video.seeking&&matches());},get failed(){return failed;},inspect:()=>({playback:usingStill()?'still':'recorded',kind,ready:shown,failed,loading:!!loading,videoTime:video.currentTime,videoTarget:targetTime()}),video};
}
