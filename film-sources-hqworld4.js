// One atomic manifest selects complete scene timelines. During a desktop-first
// rollout, each viewport keeps its own complete timeline until the pair is ready.
// A later cargo correction cannot replace a newer neighborhood/operator film.
const fallback={"version":1,"cargo":{"base":"assets/scene-recovery-v2/cargo","revision":"scene-recovery-3d-20261125","desktop":{"base":"assets/scene-recovery-v2/cargo","revision":"scene-recovery-3d-20261125","kind":"desktop","trueWorld":{"version":1,"nativeWidth":2560,"nativeHeight":1600,"renderWidth":4608,"renderHeight":2048,"cropX":1328,"cropY":224},"videoFile":"desktop-web.mp4","quality":"native-30fps-every-frame-rendered","nativeVideo":{"file":"desktop-web.mp4","width":4608,"height":2048,"framerate":30,"bitrate":6870946,"codec":"avc1.640034"},"motionFps":30,"modelRevision":"realism-v2","reversedCopy":true},"videoFile":"mobile-web.mp4","quality":"native-30fps-every-frame-rendered","motionFps":30,"nativeVideo":{"file":"mobile-web.mp4","width":1080,"height":2160,"framerate":30,"bitrate":2515497,"codec":"avc1.640032"},"modelRevision":"realism-v2","reversedCopy":true},"field":{"base":"assets/scene-recovery-v2/field","revision":"field-jobfirst-20261125-publish","video4kFile":"desktop-4k.mp4","video4kCodec":"av01.0.12M.08","neighborhood":true,"operator":true,"timelineFrames":2629,"operatorStartFrame":1339,"howItWorks":{"fieldLeadFrames":0,"deliveryStartFrame":1639,"deliveryFrames":990,"order":"job-first","trim":"aerial-5s-3s-end-on-dropoff","timeMap":[[0,0],[600,600],[944,750],[1175,842],[2961,2628]]},"kind":"desktop","videoFile":"desktop.mp4","motionFps":30,"liteVideoFile":"desktop-lite.mp4","quality":"realistic-walkthrough-30fps","nativeVideo":{"file":"desktop.mp4","width":1920,"height":1080,"framerate":30,"bitrate":3618416,"codec":"avc1.640032"},"footage":"ai-generated","reversedCopy":true},"opening":{"base":"assets/scene-recovery-v2/opening","revision":"opening-hq-3d-20261125","desktop":{"base":"assets/scene-recovery-v2/opening","revision":"opening-hq-3d-20261125","kind":"desktop","trueWorld":{"version":1,"nativeWidth":2560,"nativeHeight":1600,"renderWidth":4608,"renderHeight":2048,"cropX":1328,"cropY":224},"videoFile":"desktop-hq.mp4","quality":"high-resolution-native-60fps","nativeVideo":{"file":"desktop-hq.mp4","width":3840,"height":1706,"framerate":60,"bitrate":15834458,"codec":"avc1.640034"},"motionFps":60,"modelRevision":"realism-v2","playbackRevision":"opening-continuity-20261122","duration":14,"rewind":{"start":14.0},"ladder":15},"modelRevision":"realism-v2","videoFile":"mobile-hq.mp4","motionFps":60,"nativeVideo":{"file":"mobile-hq.mp4","width":1440,"height":2880,"framerate":60,"bitrate":10856022,"codec":"avc1.640033"},"quality":"high-resolution-native-60fps","playbackRevision":"opening-continuity-20261122","duration":14,"rewind":{"start":14.0},"ladder":15},"fieldMobile":{"base":"assets/scene-recovery-v2/field","revision":"field-jobfirst-20261125-publish","neighborhood":true,"operator":true,"timelineFrames":2629,"operatorStartFrame":1339,"howItWorks":{"fieldLeadFrames":0,"deliveryStartFrame":1639,"deliveryFrames":990,"order":"job-first","trim":"aerial-5s-3s-end-on-dropoff","timeMap":[[0,0],[600,600],[944,750],[1175,842],[2961,2628]]},"kind":"mobile","videoFile":"mobile.mp4","motionFps":30,"nativeVideo":{"file":"mobile.mp4","width":1280,"height":720,"framerate":30,"bitrate":2196993,"codec":"avc1.64001F"},"liteVideoFile":"mobile-lite.mp4","quality":"realistic-walkthrough-30fps","footage":"ai-generated","reversedCopy":true},"modelRevision":"realism-v2","sceneRevision":"scene-recovery-20261109b"};
let sources=fallback,pending;
const validEntry=value=>value&&typeof value.base==='string'&&/^assets\/[a-zA-Z0-9_/-]+$/.test(value.base)&&!value.base.split('/').includes('..')&&typeof value.revision==='string'&&(value.mediaBase===undefined||(typeof value.mediaBase==='string'&&/^(?:https:\/\/[a-zA-Z0-9._-]+\/|assets\/)[a-zA-Z0-9._/-]+$/.test(value.mediaBase)&&!value.mediaBase.split('/').includes('..')));   // 10-29: mediaBase = where the big .mp4 lives (GitHub Pages caps files at 100 MB); the timeline json and stills stay under base
const validField=value=>validEntry(value)&&typeof value.neighborhood==='boolean'&&typeof value.operator==='boolean'&&Number.isInteger(value.timelineFrames)&&value.timelineFrames>=2&&(!value.operator||(Number.isInteger(value.operatorStartFrame)&&value.operatorStartFrame>=0&&value.operatorStartFrame<value.timelineFrames));
// Preserve the separate static-phone archive when main workday films advance.
const archiveFieldSources=manifest=>{
 const archive=typeof document!=='undefined'&&document.body?.dataset.filmVariant==='static'?manifest.fieldVariants?.static:null;
 return archive?{...manifest,field:archive.field,fieldMobile:archive.fieldMobile}:manifest;
};
const forViewport=(manifest,kind)=>{manifest=archiveFieldSources(manifest);return {...manifest,opening:manifest.opening??fallback.opening,field:manifest.fieldMobile&&kind==='mobile'?manifest.fieldMobile:manifest.field};};
const initialFieldKind=()=>typeof innerWidth!=='undefined'&&(innerWidth<=760||(innerWidth<=1024&&typeof innerHeight!=='undefined'&&innerHeight>innerWidth))?'mobile':'desktop';
export function loadFilmSources(){
 return pending??=(async()=>{
  const fieldKind=initialFieldKind();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),2500);
  try{
   const response=await fetch(new URL('film-sources-hqworld4.json?v=field-restored-20261122',import.meta.url),{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Film manifest unavailable');
   const next=await response.json();
   if(next.version!==1||!validEntry(next.cargo)||!validField(next.field))throw Error('Invalid film manifest');
   if(next.opening!==undefined&&!validEntry(next.opening))throw Error('Invalid opening film');
   const split=next.fieldMobile!==undefined;
   if(split?(!validField(next.fieldMobile)||next.field.kind!=='desktop'||next.fieldMobile.kind!=='mobile'):next.field.kind!==undefined)throw Error('Invalid viewport film pair');
   const archive=next.fieldVariants?.static;
   if(archive&&(!validField(archive.field)||!validField(archive.fieldMobile)))throw Error('Invalid static-phone archive pair');
   sources=forViewport(next,fieldKind);
  }catch{sources=forViewport(fallback,fieldKind);}
  finally{clearTimeout(timeout);}
  await chooseDesktopFilms();
  if(typeof document!=='undefined'&&document.body){
   const data=document.body.dataset;
   data.neighborhood=String(sources.field.neighborhood);
   data.operatorSequence=String(sources.field.operator);
   data.fieldTimelineFrames=String(sources.field.timelineFrames);
   if(sources.field.operator)data.operatorStartFrame=String(sources.field.operatorStartFrame);else delete data.operatorStartFrame;
   if(sources.field.mediaBase)data.fieldMediaBase=sources.field.mediaBase;else delete data.fieldMediaBase;   // 10-29: the movie's host, read by recorded-scene.js
  }
  return sources;
 })();
}
// Portrait devices keep the original mobile movie. Portrait desktop windows use
// that same existing asset; landscape proofs do not authorize a portrait render.
export const introFilmKind=()=>innerHeight>=innerWidth?'mobile':'desktop';
export function sceneFilmSource(name,kind){const entry=sources[name]??fallback[name];return kind==='desktop'&&entry.desktop?entry.desktop:entry;}
async function chooseDesktopFilms(){if(introFilmKind()==='mobile')return;for(const name of ['opening','cargo']){const entry=sources[name]?.desktop;if(entry){entry.videoFile??='desktop.mp4';entry.quality=entry.quality||'draft';if(document.body)document.body.dataset[name+'FilmQuality']=entry.quality;}}}
