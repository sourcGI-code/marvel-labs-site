const clamp=v=>Math.max(0,Math.min(1,v));
export const filmDuration=10;
// The fast approach/impact is retained; the reveal settles sooner for the handoff.
export function filmPose(progress){const s=clamp(progress)*filmDuration;return s<=1.5?s/1.5*.46:s<=2.9?.46+(s-1.5)/1.4*.14:.6+(s-2.9)/7.1*.4;}
export function filmFraming(width,height){const aspect=width/height,reference=width<700?9/16:16/9,scale=Math.min(1,reference/aspect);return {scale,offset:(width<700?.10:.035)/scale};}
export function createOpeningFilm(host,{reduced,onChange,enabled=true}){
 const livePreview=new URLSearchParams(location.search).has('live-preview');
 if(livePreview)host.querySelectorAll('.arrival-poster,.scene-fallback').forEach(el=>el.style.display='none');
 const video=document.createElement('video');video.className='opening-film';video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.disablePictureInPicture=true;video.setAttribute('aria-hidden','true');video.tabIndex=-1;
 let failed=livePreview,ready=false,wanted=0,kind='',playing=false,generation=0,playRequest=0,controller,objectURL,mediaURL='',localPending=false;
 const notify=()=>onChange?.();
 function seekable(time){for(let i=0;i<video.seekable.length;i++)if(time>=video.seekable.start(i)&&time<=video.seekable.end(i)+.04)return true;return false;}
 function usable(){return ready&&!failed;}
 function bufferedAhead(){for(let i=0;i<video.buffered.length;i++)if(video.currentTime>=video.buffered.start(i)-.05&&video.currentTime<=video.buffered.end(i))return video.buffered.end(i)-video.currentTime;return 0;}
 // Start directly from fast-start MP4 metadata. Only hosts without usable
 // seeking need a complete local copy, and only when the user actually seeks.
 async function localCopy(){
  if(localPending||objectURL||failed)return;
  localPending=true;const current=generation;
  try{
   const response=await fetch(mediaURL,{cache:'force-cache',signal:controller.signal});
   if(!response.ok)throw Error('Opening film unavailable');
   const blob=await response.blob();if(current!==generation)return;
   objectURL=URL.createObjectURL(blob);ready=false;video.src=objectURL;video.load();
  }catch(error){if(current===generation&&error.name!=='AbortError'){failed=true;ready=false;playing=false;video.style.opacity='0';notify();}}
  finally{if(current===generation)localPending=false;}
 }
 function seek(){
  if(!ready||playing||video.seeking)return;
  if(wanted>=video.duration-.05&&video.currentTime>=video.duration-.05)return;
  const target=Math.min(wanted,Math.max(0,video.duration-.04));
  if(Math.abs(video.currentTime-target)<=.025)return;
  if(seekable(target))video.currentTime=target;
  else if(wanted>.05)localCopy();
 }
 function source(){
  const next=innerWidth<=760?'mobile':'desktop';if(!enabled||livePreview||kind===next||reduced.matches)return false;
  video.pause();playing=false;playRequest++;kind=next;ready=false;failed=false;generation++;localPending=false;
  controller?.abort();controller=new AbortController();
  if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
  video.poster=`assets/opening-film/${kind}-poster.webp?v=13`;
  mediaURL=`assets/opening-film/${kind}.mp4?v=13`;video.src=mediaURL;video.load();
  return true;
 }
 video.addEventListener('loadeddata',()=>{ready=true;seek();notify();});
 video.addEventListener('playing',()=>{playing=true;notify();});
 video.addEventListener('progress',()=>{seek();notify();});
 video.addEventListener('seeked',()=>{seek();notify();});video.addEventListener('ended',()=>{playing=false;notify();});
 video.addEventListener('error',()=>{if(!objectURL&&!localPending){localCopy();return;}failed=true;ready=false;playing=false;video.style.opacity='0';notify();});
 host.append(video);source();
 return {
  video,
  setActive(value){enabled=value;if(value)source();},
  async play(){
   if(failed||reduced.matches)return false;
   source();const current=generation,request=++playRequest,deadline=performance.now()+2500;
   // Fast local/cache hits play immediately; slower first visits build a small
   // lead before model downloads compete with the opening's network stream.
   while(!failed&&current===generation&&request===playRequest){
    const remaining=Number.isFinite(video.duration)?Math.max(0,video.duration-video.currentTime-.05):3;
    const ahead=bufferedAhead();
    if(ready&&(ahead>=Math.min(2,remaining)||(video.networkState===video.NETWORK_IDLE&&ahead>.5)))break;
    if(performance.now()>=deadline)break;
    await new Promise(resolve=>setTimeout(resolve,80));
   }
   if(failed||current!==generation||request!==playRequest)return false;
   try{await video.play();if(current!==generation||request!==playRequest)return false;playing=true;notify();return true;}catch{if(request===playRequest)playing=false;return false;}
  },
  pause(){playRequest++;playing=false;video.pause();},
  seek(progress){wanted=clamp(progress)*filmDuration;seek();},
  opacity(value){video.style.opacity=String(usable()&&!reduced.matches?value:0);},
  resize:source,
  get ready(){return usable();},get bufferedAhead(){return bufferedAhead();},get failed(){return failed;},get playing(){return playing;},get time(){return video.currentTime;},get ended(){return video.ended;},get kind(){return kind;}
 };
}
