// One atomic manifest selects complete scene timelines. During a desktop-first
// rollout, each viewport keeps its own complete timeline until the pair is ready.
// A later cargo correction cannot replace a newer neighborhood/operator film.
const fallback={"version":1,"cargo":{"base":"assets/marvel-v4/recorded/cargo","revision":"hqgloss1","desktop":{"base":"assets/true-world-v1/recorded/cargo","revision":"sleek20-review-v1","kind":"desktop","trueWorld":{"version":1,"nativeWidth":2560,"nativeHeight":1600,"renderWidth":4608,"renderHeight":2048,"cropX":1328,"cropY":224},"videoFile":"desktop.mp4","quality":"draft","nativeVideo":{"file":"desktop.mp4","width":2304,"height":1024,"framerate":30,"codec":"avc1.640032","bitrate":1208831},"compatibilityVideo":{"file":"desktop.mp4","width":2304,"height":1024,"framerate":30,"linearResolution":0.25,"codec":"avc1.640032","bitrate":1208831,"verticalResolution":0.25},"motionFps":10.036968576709796}},"field":{"base":"assets/how-it-works-v1/recorded/field","revision":"hiw-crew1","neighborhood":true,"operator":true,"timelineFrames":2836,"operatorStartFrame":0,"howItWorks":{"fieldLeadFrames":1164,"deliveryStartFrame":336,"deliveryFrames":828}},"opening":{"base":"assets/marvel-v4/opening-film","revision":"hqgloss1","desktop":{"base":"assets/true-world-v1/opening-film","revision":"sleek20-review-v1","kind":"desktop","trueWorld":{"version":1,"nativeWidth":2560,"nativeHeight":1600,"renderWidth":4608,"renderHeight":2048,"cropX":1328,"cropY":224},"videoFile":"desktop.mp4","quality":"draft","nativeVideo":{"file":"desktop.mp4","width":2304,"height":1024,"framerate":84,"codec":"avc1.640033","bitrate":2100553},"compatibilityVideo":{"file":"desktop.mp4","width":2304,"height":1024,"framerate":84,"linearResolution":0.25,"codec":"avc1.640033","bitrate":2100553,"verticalResolution":0.25},"motionFps":30.071428571428573}}};
let sources=fallback,pending;
const validEntry=value=>value&&typeof value.base==='string'&&/^assets\/[a-zA-Z0-9_/-]+$/.test(value.base)&&!value.base.split('/').includes('..')&&typeof value.revision==='string'&&(value.mediaBase===undefined||(typeof value.mediaBase==='string'&&/^https:\/\/[a-zA-Z0-9._/-]+$/.test(value.mediaBase)));   // 10-29: mediaBase = where the big .mp4 lives (GitHub Pages caps files at 100 MB); the timeline json and stills stay under base
const validField=value=>validEntry(value)&&typeof value.neighborhood==='boolean'&&typeof value.operator==='boolean'&&Number.isInteger(value.timelineFrames)&&value.timelineFrames>=2&&(!value.operator||(Number.isInteger(value.operatorStartFrame)&&value.operatorStartFrame>=0&&value.operatorStartFrame<value.timelineFrames));
const initialFieldKind=()=>typeof innerWidth!=='undefined'&&(innerWidth<=760||(innerWidth<=1024&&typeof innerHeight!=='undefined'&&innerHeight>innerWidth))?'mobile':'desktop';
export function loadFilmSources(){
 return pending??=(async()=>{
  const fieldKind=initialFieldKind();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),2500);
  try{
   const response=await fetch(new URL('film-sources-hqworld4.json?v=sleek20-review-v1',import.meta.url),{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Film manifest unavailable');
   const next=await response.json();
   if(next.version!==1||!validEntry(next.cargo)||!validField(next.field))throw Error('Invalid film manifest');
   if(next.opening!==undefined&&!validEntry(next.opening))throw Error('Invalid opening film');
   const split=next.fieldMobile!==undefined;
   if(split?(!validField(next.fieldMobile)||next.field.kind!=='desktop'||next.fieldMobile.kind!=='mobile'):next.field.kind!==undefined)throw Error('Invalid viewport film pair');
   sources={...next,opening:next.opening??fallback.opening,field:split&&fieldKind==='mobile'?next.fieldMobile:next.field};
  }catch{sources=fallback;}
  finally{clearTimeout(timeout);}
  await chooseDesktopFilms();
  if(typeof document!=='undefined'&&document.body){
   const data=document.body.dataset;
   data.neighborhood=String(sources.field.neighborhood);
   data.operatorSequence=String(sources.field.operator);
   data.fieldTimelineFrames=String(sources.field.timelineFrames);
   if(sources.field.operator)data.operatorStartFrame=String(sources.field.operatorStartFrame);else delete data.operatorStartFrame;
  }
  return sources;
 })();
}
// Portrait devices keep the original mobile movie. Portrait desktop windows use
// that same existing asset; landscape proofs do not authorize a portrait render.
export const introFilmKind=()=>innerWidth<=760||innerHeight>=innerWidth?'mobile':'desktop';
export function sceneFilmSource(name,kind){const entry=sources[name]??fallback[name];return kind==='desktop'&&entry.desktop?entry.desktop:entry;}
async function chooseDesktopFilms(){if(introFilmKind()==='mobile')return;for(const name of ['opening','cargo']){const entry=sources[name]?.desktop;if(entry){entry.videoFile='desktop.mp4';entry.quality=entry.quality||'draft';if(document.body)document.body.dataset[name+'FilmQuality']=entry.quality;}}}
