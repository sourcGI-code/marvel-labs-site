// One atomic manifest selects complete scene timelines. During a desktop-first
// rollout, each viewport keeps its own complete timeline until the pair is ready.
// A later cargo correction cannot replace a newer neighborhood/operator film.
const fallback={version:1,opening:{base:'assets/hq-v3/opening-film',revision:'13'},cargo:{base:'assets/pickup-wheel-fixed-v1/recorded/cargo',revision:'pickup-wheel-fixed-1'},field:{base:'assets/rack-free-v1/recorded/field',revision:'rack-free-1',neighborhood:false,operator:false,timelineFrames:1381}};
let sources=fallback,pending;
const validEntry=value=>value&&typeof value.base==='string'&&/^assets\/[a-zA-Z0-9_/-]+$/.test(value.base)&&!value.base.split('/').includes('..')&&typeof value.revision==='string';
const validField=value=>validEntry(value)&&typeof value.neighborhood==='boolean'&&typeof value.operator==='boolean'&&Number.isInteger(value.timelineFrames)&&value.timelineFrames>=2&&(!value.operator||(Number.isInteger(value.operatorStartFrame)&&value.operatorStartFrame>=0&&value.operatorStartFrame<value.timelineFrames));
const initialFieldKind=()=>typeof innerWidth!=='undefined'&&(innerWidth<=760||(innerWidth<=1024&&typeof innerHeight!=='undefined'&&innerHeight>innerWidth))?'mobile':'desktop';
export function loadFilmSources(){
 return pending??=(async()=>{
  const fieldKind=initialFieldKind();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),2500);
  try{
   const response=await fetch('film-sources.json',{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Film manifest unavailable');
   const next=await response.json();
   if(next.version!==1||!validEntry(next.cargo)||!validField(next.field))throw Error('Invalid film manifest');
   if(next.opening!==undefined&&!validEntry(next.opening))throw Error('Invalid opening film');
   const split=next.fieldMobile!==undefined;
   if(split?(!validField(next.fieldMobile)||next.field.kind!=='desktop'||next.fieldMobile.kind!=='mobile'):next.field.kind!==undefined)throw Error('Invalid viewport film pair');
   sources={...next,opening:next.opening??fallback.opening,field:split&&fieldKind==='mobile'?next.fieldMobile:next.field};
  }catch{sources=fallback;}
  finally{clearTimeout(timeout);}
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
export function sceneFilmSource(name){return sources[name]??fallback[name];}
