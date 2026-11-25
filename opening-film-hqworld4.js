import {sceneFilmSource,introFilmKind} from './film-sources-hqworld4.js?v=frozenfix-20261124';
const clamp=v=>Math.max(0,Math.min(1,v));
export const filmDuration=14;
// The fast approach/impact is retained; the reveal settles sooner for the handoff.
export function filmPose(progress){const s=clamp(progress)*10;return s<=1.5?s/1.5*.46:s<=2.9?.46+(s-1.5)/1.4*.14:.6+(s-2.9)/7.1*.4;}
export function filmFraming(width,height){const aspect=width/height,reference=width<700?9/16:16/9,scale=Math.min(1,reference/aspect);return {scale,offset:(width<700?.10:.035)/scale};}
export function createOpeningFilm(host,{reduced,onChange,enabled=true}){
 const livePreview=document.body.dataset.sceneSource!=='accepted-films'&&new URLSearchParams(location.search).has('live-preview');
 if(livePreview)host.querySelectorAll('.arrival-poster,.scene-fallback').forEach(el=>el.style.display='none');
 const video=document.createElement('video');video.className='opening-film';video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='metadata';video.disablePictureInPicture=true;video.setAttribute('aria-hidden','true');video.tabIndex=-1;
 let failed=livePreview,ready=false,presented=false,wanted=0,kind='',playing=false,generation=0,playRequest=0,presentedTime=0;
 let timelineDuration=filmDuration,ladderCount=0,ladderIndex=-1;
 // The film may carry its own frames a second time in reverse order after its end (manifest `rewind`), which
 // scene-playback.js plays when the visitor scrolls back. A time in that half shows the frame of this film time.
 let rewindStart=0,frameSeconds=1/60,rewindRest=0,restTimer=0;
 const rewind=()=>rewindStart>0&&video.duration>=rewindStart*2-.5?{start:rewindStart}:null;
 const filmTime=t=>rewind()&&t>=rewindStart-1e-4?Math.max(0,rewindStart-frameSeconds-(t-rewindStart)):t;
 const notify=()=>onChange?.();
 function usable(){return ready&&presented&&!failed;}
 function bufferedAhead(){for(let i=0;i<video.buffered.length;i++)if(video.currentTime>=video.buffered.start(i)-.05&&video.currentTime<=video.buffered.end(i))return video.buffered.end(i)-video.currentTime;return 0;}
 function seek(){
  if(!ready||playing||video.dataset.timelinePlaying||video.seeking)return;
  const end=rewind()?timelineDuration:video.duration;
  if(wanted>=end-.05&&video.currentTime>=end-.05&&video.currentTime<end+.1)return;
  const target=Math.min(wanted,Math.max(0,end-.04));
  if(Math.abs(video.currentTime-target)<=.025){rewindRest=0;return;}
  // Stopped on a frame of the reversed copy: hold it for a moment so more scrolling back resumes
  // at once, then return to the film's own frame.
  const now=performance.now();
  if(rewind()&&video.currentTime>=rewindStart-1e-4&&Math.abs(filmTime(video.currentTime)-target)<=.06){
   rewindRest||=now;
   if(now-rewindRest<450){clearTimeout(restTimer);restTimer=setTimeout(seek,450-(now-rewindRest)+12);return;}
  }
  rewindRest=0;
  video.currentTime=target;
 }
 function source(){
  const next=introFilmKind();if(!enabled||livePreview||kind===next||reduced.matches)return false;
  video.pause();playing=false;playRequest++;kind=next;ready=false;presented=false;failed=false;generation++;presentedTime=0;
  const selected=sceneFilmSource('opening',kind),revision=encodeURIComponent(selected.revision);
  timelineDuration=selected.duration||10;
  rewindStart=Number(selected.rewind?.start)||0;frameSeconds=1/(selected.motionFps||60);
  ladderCount=Number(selected.ladder)||0;ladderIndex=-1;
  // Other modules read the film's own length and the start of its reversed copy from the element.
  video.dataset.filmDuration=String(timelineDuration);
  if(rewindStart)video.dataset.rewindStart=String(rewindStart);else delete video.dataset.rewindStart;
  video.poster=`${selected.base}/${kind}-start.webp?v=${revision}`;
  const poster=host.querySelector('.arrival-poster');
  if(poster){
   const phone=poster.querySelector('source[data-opening-mobile]');
   const original=sceneFilmSource('opening');
   if(phone)phone.srcset=`${original.base}/mobile-start.webp?v=${encodeURIComponent(original.revision)}`;
   const desktop=sceneFilmSource('opening','desktop');
   const image=poster.querySelector('img');if(image)image.src=`${desktop.base}/desktop-start.webp?v=${encodeURIComponent(desktop.revision)}`;
  }
  video.dataset.filmQuality=selected.quality||'original';
  // The current manifest includes the approved 60 fps intro. Older ?fps=60
  // preview links must use this same trailer, not the retired preview film.
  const mediaURL=`${selected.base}/${selected.videoFile||kind+'.mp4'}?v=${revision}`;
  video.src=mediaURL;video.load();
  return true;
 }
 video.addEventListener('loadeddata',()=>{
  ready=true;seek();
  const current=generation;
  const reveal=(_now,frame)=>{if(current!==generation||failed)return;presentedTime=frame?.mediaTime??video.currentTime;presented=true;notify();};
  // Metadata and decoded data can arrive before the compositor submits a
  // frame. Keep the matching first-frame image until that handoff is ready.
  if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(reveal);
  else requestAnimationFrame(()=>requestAnimationFrame(reveal));
  notify();
 });
 video.addEventListener('pause',()=>{playing=false;notify();});
 video.addEventListener('playing',()=>{playing=true;notify();});
 video.addEventListener('progress',()=>{seek();notify();});
 video.addEventListener('seeked',()=>{presentedTime=video.currentTime;seek();notify();});
 video.addEventListener('timeupdate',()=>{if(!video.seeking){presentedTime=video.currentTime;notify();}});
 video.addEventListener('ended',()=>{presentedTime=video.currentTime;playing=false;notify();});
 video.addEventListener('error',()=>{failed=true;ready=false;playing=false;video.style.opacity='0';notify();});
 host.append(video);source();
 return {
  video,
  retry(){if(failed||video.error){kind='';source();}},
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
  // 11-24 owner (Clarity): "people just scroll and the screen stays the same". When the phone will not play the film
  // (iPhone Low Power Mode, Data Saver, a slow first load) the poster used to stay for the whole intro. Now the poster
  // steps through one still per second of the film, in step with the scroll, until the video can present frames.
  ladder(progress){
   if(usable()||!ladderCount||livePreview)return;
   const k=Math.round(clamp(progress)*(ladderCount-1));if(k===ladderIndex)return;ladderIndex=k;
   const poster=host.querySelector('.arrival-poster');if(!poster)return;
   const pad=String(k).padStart(2,'0'),phone=sceneFilmSource('opening'),desk=sceneFilmSource('opening','desktop');
   const mob=`${phone.base}/mobile-ladder-${pad}.webp?v=${encodeURIComponent(phone.revision)}`,wide=`${desk.base}/desktop-ladder-${pad}.webp?v=${encodeURIComponent(desk.revision)}`;
   const want=matchMedia('(orientation:portrait)').matches?mob:wide,image=new Image();image.src=want;
   // swap only once decoded (no blank frame); warm the next still the scroll is heading to
   image.decode().then(()=>{if(ladderIndex!==k)return;const source=poster.querySelector('source[data-opening-mobile]');if(source)source.srcset=mob;const img=poster.querySelector('img');if(img)img.src=wide;}).catch(()=>{});
   if(k+1<ladderCount){const next=new Image();next.src=want.replace(`-ladder-${pad}.`,`-ladder-${String(k+1).padStart(2,'0')}.`);}
  },
  seek(progress){wanted=clamp(progress)*timelineDuration;seek();},
  opacity(value){video.style.opacity=String(usable()&&!reduced.matches?value:0);},
  resize:source,
  get duration(){return timelineDuration;},get hasLadder(){return ladderCount>0;},get ready(){return usable();},get bufferedAhead(){return bufferedAhead();},get failed(){return failed;},get playing(){return playing;},get time(){return filmTime(video.currentTime);},get presentedTime(){return filmTime(presentedTime);},
  // With a reversed copy the file goes on past the film's end; "ended" still means the film reached its last frame.
  get ended(){return rewind()?video.currentTime>=timelineDuration-.04&&video.currentTime<rewindStart+.2:video.ended;},get rewind(){return rewind();},get kind(){return kind;}
 };
}
