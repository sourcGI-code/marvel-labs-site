import {DELIVERY_TITLE_START} from './intro-timing.js?v=1';
import {fieldProgress,neighborhoodEnabled} from './neighborhood-timing.js?v=2';
import {loadFilmSources} from './film-sources.js?v=3';
await loadFilmSources();
// One ordered map for the homepage's displays, editor navigation and chapter links.
export const displays = [
 {id:'arrival',group:'Opening',label:'Arrival',section:'top',start:0,at:.055,title:'#hero-title',copy:'#hero-description',purpose:'Introduce the microfactory trailer. Keep the truck, approach and impact in one continuous scene.'},
 {id:'delivery',group:'Opening',label:'16 ft delivery',section:'top',start:DELIVERY_TITLE_START,at:.94,title:'#hero-title',copy:'#hero-description',purpose:'Finish the continuous delivery with both sizes: 20 ft on the left and 16 ft on the right, with their equipment and factory dimensions.'},
 {id:'equipment',group:'Working day',label:'01 · Equipment',section:'inside',start:0,at:.10,title:'#tour-title',copy:'#tour-copy',purpose:'Begin at the job with the equipment the operator already uses.'},
 {id:'vision',group:'Working day',label:'02 · Vision',section:'inside',start:.16,at:.25,title:'#tour-title',copy:'#tour-copy',purpose:'Connect the camera survey to a visible, measured job scope.'},
 {id:'rtk',group:'Working day',label:'03 · RTK reference',section:'inside',start:.34,at:.40,title:'#tour-title',copy:'#tour-copy',purpose:'Show how site observations stay tied to the property reference.'},
 {id:'quote',group:'Working day',label:'04 · Quote',section:'inside',start:.46,at:.53,title:'#tour-title',copy:'#tour-copy',purpose:'Carry the scope into an estimate and an email draft for operator review.'},
 {id:'work',group:'Working day',label:'05 · Work and collection',section:'inside',start:.58,at:.65,title:'#tour-title',copy:'#tour-copy',purpose:'Follow the landscaping work and suitable material collection.'},
 {id:'sizes',group:'Choose a trailer',label:'Start with the specs',section:'sizes',start:0,at:.15,title:'#sizes-title',copy:'.offer-title-row > p',purpose:'Choose the 16 ft or 20 ft footprint, then review the current Buy and Free options.'},
 {id:'numbers',group:'Choose a trailer',label:'The numbers',section:'story',start:0,at:.15,title:'#story-title',copy:'.daily-pitch .offer-lead',purpose:'Explain the illustrative earnings with the assumptions visible alongside the numbers.'},
 {id:'founding',group:'Next step',label:'Founding operators',section:'founding',start:0,at:.15,title:'#founding-title',copy:'.founding-grid .offer-lead',purpose:'Explain early participation and the operator input needed for the pilot.'},
 {id:'contact',group:'Next step',label:'Request pilot details',section:'contact',start:0,at:.65,title:'#contact-title',copy:'.contact-grid > div > p',purpose:'Collect the operator’s equipment needs and selected trailer option.'}
].map(display=>display.section==='inside'?{...display,start:fieldProgress(display.start),at:fieldProgress(display.at)}:display);
if(neighborhoodEnabled())displays.splice(displays.findIndex(d=>d.id==='equipment'),0,{id:'route',group:'Working day',label:'Drive-by auto quotes',section:'inside',start:0,at:.06,title:'#tour-title',copy:'#tour-copy',purpose:'Quote each property along the route, then stop at the selected house.'});
if(document.body.dataset.operatorSequence==='true'){
 const last=Number(document.body.dataset.fieldTimelineFrames)-1,start=Number(document.body.dataset.operatorStartFrame);
 displays.splice(displays.findIndex(d=>d.id==='numbers'),0,{id:'operator',group:'Working day',label:'05 · Grass in, product out',section:'inside',start:start/last,at:Math.min(1,(start+90)/last),title:'#tour-title',copy:'#tour-copy',purpose:'Second half of Work: clippings into the hopper, then the packaged product out on the conveyor at the side hatch. Ends on "Imagine the possibilities."'});
}
const sectionOrder=['top','sizes','story','inside','founding','contact'];
displays.sort((a,b)=>sectionOrder.indexOf(a.section)-sectionOrder.indexOf(b.section));
export const displayById = id => displays.find(display => display.id === (['unhitch','cargo','overhead','receiving'].includes(id)?'delivery':['production','packaging','storage'].includes(id)?(document.body.dataset.operatorSequence==='true'?'operator':'work'):id));
export function displayAt(section, progress) {
 return displays.filter(display => display.section === section && progress >= display.start - 1e-6).at(-1);
}
export function installDisplayFramework({stage, refresh}) {
 let current = '';
 function update() {
  const section = document.body.dataset.activeScene;
  const track = document.getElementById(section);
  const display = track && displayAt(section, stage.progress(track));
  if (!display || display.id === current) return;
  current = display.id; document.body.dataset.activeDisplay = current;
  document.dispatchEvent(new CustomEvent('display:change', {detail:{id:current}}));
 }
 function navigate(id, {url=true}={}) {
  const display = displayById(id); const track = display && document.getElementById(display.section);
  if (!track) return false;
  document.dispatchEvent(new CustomEvent('stage:navigate', {detail:{hash:'#'+display.section}}));
  stage.seekProgress(track, display.at, {refresh:true}); refresh(); update();
  if (url) {const address=new URL(location.href);address.searchParams.set('display',id);address.hash=display.section;history.replaceState(null,'',address);}
  return true;
 }
 document.addEventListener('display:navigate', event => navigate(event.detail?.id));
 document.addEventListener('click', event => {
  const button=event.target.closest('[data-display-target]');
  if (!button || event.defaultPrevented) return;
  if(navigate(button.dataset.displayTarget)) event.preventDefault();
 });
 addEventListener('scroll', update, {passive:true});
 const initial = displayById(new URLSearchParams(location.search).get('display'));
 if (initial) {
  // Wait for stage's normal hash initialization, then choose the exact chapter.
  Promise.resolve(document.fonts?.ready).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>navigate(initial.id,{url:false}))));
 }
 update(); return {navigate,update};
}
