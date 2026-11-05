// One atomic manifest selects complete scene timelines. During a desktop-first
// rollout, each viewport keeps its own complete timeline until the pair is ready.
// A later cargo correction cannot replace a newer neighborhood/operator film.
const fallback={"version":1,"cargo":{"base":"assets/owner-approved-fleet-neutral-v2","revision":"neutral-graphite-v2","desktop":{"base":"assets/owner-approved-fleet-neutral-v2","revision":"neutral-graphite-v2","kind":"desktop","trueWorld":{"version":1,"nativeWidth":2560,"nativeHeight":1600,"renderWidth":4608,"renderHeight":2048,"cropX":1328,"cropY":224},"videoFile":"desktop.mp4","quality":"native-30fps","nativeVideo":{"file":"desktop.mp4","width":2304,"height":1024,"framerate":30,"bitrate":3020363,"codec":"avc1.640032"},"compatibilityVideo":{"file":"desktop.mp4","width":2304,"height":1024,"framerate":30,"bitrate":3020363,"codec":"avc1.640032","linearResolution":1,"verticalResolution":1},"motionFps":30,"modelRevision":"owner-approved-trailer-v1"},"videoFile":"mobile.mp4","quality":"native-30fps","motionFps":30,"nativeVideo":{"file":"mobile.mp4","width":1080,"height":2160,"framerate":30,"bitrate":2730767,"codec":"avc1.640032"},"compatibilityVideo":{"file":"mobile.mp4","width":1080,"height":2160,"framerate":30,"bitrate":2730767,"codec":"avc1.640032","linearResolution":1,"verticalResolution":1},"modelRevision":"owner-approved-trailer-v1"},"field":{"base":"assets/workday-no-push-mower-v1","revision":"workday-no-push-mower-v1","neighborhood":true,"operator":true,"timelineFrames":3088,"operatorStartFrame":0,"howItWorks":{"fieldLeadFrames":1416,"deliveryStartFrame":300,"deliveryFrames":1116},"mediaBase":"https://github.com/sourcGI-code/marvel-labs-site/releases/download/films-workday-no-push-mower-20261104","kind":"desktop","videoFile":"desktop.mp4","motionFps":30},"opening":{"base":"assets/owner-approved-intro-clean-corners-v3","revision":"clean-corners-v3","desktop":{"base":"assets/owner-approved-intro-clean-corners-v3","revision":"clean-corners-v3","kind":"desktop","trueWorld":{"version":1,"nativeWidth":2560,"nativeHeight":1600,"renderWidth":4608,"renderHeight":2048,"cropX":1328,"cropY":224},"videoFile":"desktop.mp4","quality":"native-30fps","nativeVideo":{"file":"desktop.mp4","width":2304,"height":1024,"framerate":30,"bitrate":3031921,"codec":"avc1.640032"},"compatibilityVideo":{"file":"desktop.mp4","width":2304,"height":1024,"framerate":30,"bitrate":3031921,"codec":"avc1.640032","linearResolution":1,"verticalResolution":1},"motionFps":30,"modelRevision":"owner-approved-trailer-v1"},"modelRevision":"owner-approved-trailer-v1","videoFile":"mobile.mp4","motionFps":30,"nativeVideo":{"file":"mobile.mp4","width":720,"height":1440,"framerate":30,"bitrate":2492924,"codec":"avc1.640020"},"compatibilityVideo":{"file":"mobile.mp4","width":720,"height":1440,"framerate":30,"bitrate":2492924,"codec":"avc1.640020","linearResolution":1,"verticalResolution":1}},"fieldMobile":{"base":"assets/workday-no-push-mower-v1","revision":"workday-no-push-mower-v1","neighborhood":true,"operator":true,"timelineFrames":3088,"operatorStartFrame":0,"howItWorks":{"fieldLeadFrames":1416,"deliveryStartFrame":300,"deliveryFrames":1116},"kind":"mobile","mediaBase":"https://github.com/sourcGI-code/marvel-labs-site/releases/download/films-workday-no-push-mower-20261104","videoFile":"mobile.mp4","motionFps":30},"fieldVariants":{"static":{"field":{"base":"assets/how-it-works-v2/recorded/field","revision":"hiw-gloss4k","neighborhood":true,"operator":true,"timelineFrames":3088,"operatorStartFrame":0,"howItWorks":{"fieldLeadFrames":1416,"deliveryStartFrame":300,"deliveryFrames":1116},"mediaBase":"https://github.com/sourcGI-code/marvel-labs-site/releases/download/films","kind":"desktop"},"fieldMobile":{"base":"assets/how-it-works-v2/recorded/field","revision":"hiw-mobile-recovery-v1","neighborhood":true,"operator":true,"timelineFrames":3088,"operatorStartFrame":0,"howItWorks":{"fieldLeadFrames":1416,"deliveryStartFrame":300,"deliveryFrames":1116},"kind":"mobile"}}}};
let sources=fallback,pending;
const validEntry=value=>value&&typeof value.base==='string'&&/^assets\/[a-zA-Z0-9_/-]+$/.test(value.base)&&!value.base.split('/').includes('..')&&typeof value.revision==='string'&&(value.mediaBase===undefined||(typeof value.mediaBase==='string'&&/^https:\/\/[a-zA-Z0-9._/-]+$/.test(value.mediaBase)));   // 10-29: mediaBase = where the big .mp4 lives (GitHub Pages caps files at 100 MB); the timeline json and stills stay under base
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
   const response=await fetch(new URL('film-sources-hqworld4.json?v=clean-corners-v3',import.meta.url),{cache:'no-store',signal:controller.signal});
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
export const introFilmKind=()=>innerWidth<=760||innerHeight>=innerWidth?'mobile':'desktop';
export function sceneFilmSource(name,kind){const entry=sources[name]??fallback[name];return kind==='desktop'&&entry.desktop?entry.desktop:entry;}
async function chooseDesktopFilms(){if(introFilmKind()==='mobile')return;for(const name of ['opening','cargo']){const entry=sources[name]?.desktop;if(entry){entry.videoFile='desktop.mp4';entry.quality=entry.quality||'draft';if(document.body)document.body.dataset[name+'FilmQuality']=entry.quality;}}}
