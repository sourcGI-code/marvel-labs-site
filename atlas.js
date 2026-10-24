import {fieldProgress} from './neighborhood-timing.js?v=2';
import {loadFilmSources} from './film-sources.js?v=3';
await loadFilmSources();
const {installDisplayFramework}=await import(document.body.dataset.displayFramework==='original'?'./original-display-framework.js?v=10':'./display-framework.js?v=4');
import {installScenePlayback} from './scene-playback.js?v=11';
import { createStage } from './atlas-stage.js?v=9';
import {setupGrassEconomics} from './grass-economics.js?v=2';
import {createAmbientSpace} from './ambient-space.js?v=4';
import {createEditorialMotion,setAnimatedTitle,revealTitle,revealDetails} from './editorial-motion.js?v=5';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const clamp = x => Math.max(0, Math.min(1, x));
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduce.matches || (['localhost','127.0.0.1','[::1]'].includes(location.hostname) && new URLSearchParams(location.search).has('edit'));
const scenes = [];
let playback;
const manualPlayback=document.body.dataset.scrollOnly==='true'&&document.body.dataset.sceneSource==='accepted-films';
document.documentElement.classList.add('enhanced');
const stage = createStage();
const variant = document.body.dataset.variant || 'explore';
const official = document.body.dataset.experience === 'official';
const editorial = official ? createEditorialMotion() : null;
if(editorial)scenes.push(editorial);
if(official)setTimeout(()=>{const atmosphere=createAmbientSpace({paused});if(atmosphere)scenes.push(atmosphere);},1000);
const paletteNames = {charcoal:'Charcoal / Cyan',ivory:'Ivory / Forest',burgundy:'Burgundy / Coral',midnight:'Midnight / Lime'};
function applyPalette(palette) {
  document.documentElement.dataset.palette = palette;
  if ($('#palette-current')) $('#palette-current').textContent = paletteNames[palette];
  $('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  $$('[data-palette]').forEach(a => { if (a.tagName === 'A') { a.toggleAttribute('data-selected', a.dataset.palette === palette); if (a.dataset.palette === palette) a.setAttribute('aria-current','true'); else a.removeAttribute('aria-current'); } });
  $$('[data-variant-link]').forEach(a => { const u = new URL(a.href); u.searchParams.set('palette',palette); a.href = u.href; if(a.dataset.variantLink === variant) a.setAttribute('aria-current','page'); });
  $$('a[href^="inside.html"],a[data-return]').forEach(a => { const u = new URL(a.href); u.searchParams.set('palette',palette); a.href=u.href; });
  for (const scene of scenes) scene.setPalette?.();
}
document.addEventListener('design:palette',event=>applyPalette(event.detail.palette));
applyPalette(document.documentElement.dataset.palette);
$$('.palette-choices a').forEach(a => a.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); applyPalette(a.dataset.palette);
  const u = new URL(location.href); u.searchParams.set('palette',a.dataset.palette); history.replaceState(null,'',u);
}));
function closeDesign(){if($('#design-panel'))$('#design-panel').hidden=true;$('#design-toggle')?.setAttribute('aria-expanded','false');}
$('#design-toggle')?.addEventListener('click',()=>{const panel=$('#design-panel');panel.hidden=!panel.hidden;$('#design-toggle').setAttribute('aria-expanded',String(!panel.hidden));});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.review-dock'))closeDesign();});
function closeMenu(){if($('#mobile-menu'))$('#mobile-menu').hidden=true;$('.menu-button')?.setAttribute('aria-expanded','false');}
$('.menu-button')?.addEventListener('click',()=>{const panel=$('#mobile-menu');panel.hidden=!panel.hidden;$('.menu-button').setAttribute('aria-expanded',String(!panel.hidden));});
$$('#mobile-menu a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#design-panel')&&!$('#design-panel').hidden){closeDesign();$('#design-toggle').focus();}if($('#mobile-menu')&&!$('#mobile-menu').hidden){closeMenu();$('.menu-button').focus();}}});
function applyMotion(){
 document.body.classList.toggle('motion-paused',paused);
 if(!manualPlayback)$$('.motion-button').forEach(b=>{b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',paused?'Resume motion':'Pause motion');b.innerHTML=paused?'▷':'Ⅱ';});
 scenes.forEach(s=>s.setPaused(paused));
}
if(!manualPlayback)$$('.motion-button').forEach(b=>b.addEventListener('click',()=>{paused=!paused;applyMotion();requestUpdate();}));
reduce.addEventListener('change',e=>{playback?.pause();paused=e.matches;applyMotion();requestUpdate();});applyMotion();

const variantCopy = {
 explore:{title:'Room for<br><em>your idea.</em>',description:'A production line, opened up. Four connected stages, ready to explore.',step:'LOOK AROUND',notes:['Four stages. One platform.','The same idea. Less space.'],details:['Dedicated bays · preparation to inspection','Compact bays · shared working aisle']},
 free:{title:'Every idea<br><em>starts here.</em>',description:'A free planning concept: explore a material, a product, and a possible layout.',step:'START FREE',notes:['$0 planning concept','$0 planning concept'],details:['Material discussion + 20 ft layout preview','Material discussion + 16 ft layout preview']},
 frame:{title:'Built from<br><em>the ground up.</em>',description:'The equipment lifts away. A closer look at the structure that carries the idea.',step:'THE STRUCTURE',notes:['A foundation for more.','A more compact beginning.'],details:['Extended frame · illustrative structure','Compact frame · illustrative structure']}
};
const heroCopies = [
 {title:'Made<br>from <em>here.</em>',description:'The factory goes to the material. Local biomass. New possibilities.',step:'THE EXTERIOR',notes:['More room for what’s next.','A smaller place to start.'],details:['Four process bays · extended layout','Four process bays · compact layout']},
 {title:'Open up<br><em>possibility.</em>',description:'Beyond the enclosure: preparation, formulation, forming, and inspection.',step:'BENEATH THE SURFACE',notes:['A complete line, connected.','A compact line, connected.'],details:['Prepare → formulate → form → inspect','Prepare → formulate → form → inspect']},
 variantCopy[variant],
 {title:'Your next<br><em>move.</em>',description:'Find the footprint for your ambition. Let’s explore a pilot together.',step:'FIND YOUR FIT',notes:['$2,500','$1,900'],details:['/ month · illustrative 20 ft pilot','/ month · illustrative 16 ft pilot']}
];
const materials = [
 ['GR—01','GR','Grass','THE EVERYDAY, REIMAGINED','From cut fibers to a consistent powder. A familiar material becomes a starting point for something new.','SHRED / CONDITION / MILL'],
 ['SW—02','SW','Seaweed','FROM SHORE TO SOMETHING MORE','Marine biomass with a new purpose. Explore the material behind sinks and other objects in the Marvel Labs portfolio.','CONDITION / FORMULATE / SHAPE'],
 ['WD—03','WD','Wood','A SECOND LIFE IN THE MAKING','Wood-derived material finds new forms, from lighting to guitar bodies. The grain of an idea, shaped into an object.','PREPARE / BLEND / FORM'],
 ['CF—04','CF','Coffee grounds','AFTER THE LAST CUP','Spent grounds can be the beginning of a new material story. Explore housewares with an unexpected origin.','DRY / PREPARE / FORMULATE']
];
const tour = [
 ['A FACTORY ON THE MOVE','Go to<br><em>the source.</em>','Bring the production line closer to local materials. A mobile concept for a different kind of manufacturing.','FOOTPRINT','20 ft / 6.10 m concept'],
 ['BENEATH THE SURFACE','Open to<br><em>possibility.</em>','The enclosure separates to reveal four connected production bays. Follow the material from preparation to a finished object.','INSIDE','Four connected process zones'],
 ['A CONNECTED PLATFORM','Every part.<br><em>A purpose.</em>','Separate the modules to understand how the process comes together. Equipment and services are scoped around each pilot.','CONFIGURATION','Illustrative modular arrangement'],
 ['01 / PREPARATION','From fibers<br><em>to powder.</em>','Condition and mill the incoming biomass into a more consistent material for the next stage.','ILLUSTRATED EQUIPMENT','Hopper + preparation module'],
 ['02 / FORMULATION','A recipe for<br><em>what’s next.</em>','Combine prepared biomass with the binders and additives selected for the intended product and material properties.','ILLUSTRATED EQUIPMENT','Mixing + dosing assembly'],
 ['03 / FORMING','Give the idea<br><em>a shape.</em>','Form the part and finish its surface. The process is selected around the material, the design, and its intended use.','ILLUSTRATED EQUIPMENT','Enclosed forming cell'],
 ['04 / INSPECTION','Close the loop<br><em>with quality.</em>','Inspect the output and use process measurements to inform control. Stage finished parts for their next journey.','ILLUSTRATED EQUIPMENT','Vision arch + output conveyor']
];
function appear(elements){if(paused)return;for(const el of elements.filter(Boolean)){el.getAnimations().forEach(a=>a.cancel());el.animate([{opacity:.15},{opacity:1}],{duration:700,easing:'cubic-bezier(.2,.65,.2,1)'});}}
const tracks=[];
function registerTrack(selector,count,onChapter,copySelector){
 const track=$(selector);if(!track)return null;
 const pin=track.querySelector('.pin'),copy=copySelector?[...track.querySelectorAll(copySelector)]:[];let chapter=-1;
 const state={track,pin,p:0,view:null,update(){
   this.p=stage.progress(track);
   const next=Math.min(count-1,Math.floor(this.p*count));
   if(next!==chapter){chapter=next;pin.dataset.chapter=String(next);onChapter(next);}
   // Copy transitions belong to the scroll timeline too, including reverse.
   const fraction=this.p*count-next;
   const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
   const opacity=paused?1:.25+.75*Math.min(next===0?1:ease(fraction/.08),next===count-1?1:ease((1-fraction)/.08));
   for(const el of copy)el.style.opacity=opacity;
   pin.style.setProperty('--progress',this.p);this.view?.setActive?.(stage.visible(track));this.view?.setProgress(this.p);
 }};tracks.push(state);return state;
}
function registerLiveTrack(selector){
 const track=$(selector);if(!track)return null;
 const state={track,pin:track.querySelector('.pin'),p:0,view:null,update(){this.p=stage.progress(track);this.pin.style.setProperty('--progress',this.p);this.view?.setActive(stage.visible(track));this.view?.setProgress(this.p);}};
 tracks.push(state);return state;
}
const heroState=official?registerLiveTrack('#top'):registerTrack('#top',4,index=>{
 const copy=heroCopies[index];$('#hero-title').innerHTML=copy.title;$('#hero-description').textContent=copy.description;$('#hero-count').textContent=`0${index+1} / 04`;$('#hero-step').textContent=copy.step;
 $$('.model-note').forEach((p,i)=>p.textContent=copy.notes[i]);$$('.model-detail').forEach((p,i)=>p.textContent=copy.details[i]);$$('.model-inquire').forEach(a=>a.hidden=index!==3);
 $('.orbit-controls').hidden=!(variant==='explore'&&index===2);
 $('#concept-note').textContent=index===3?'Mock prices for design comparison · not an offer or quote':index===2&&variant==='free'?'Illustrative planning offer · trailer hardware not included':'Trailer concepts · illustrative interiors';
 const pose=index===1||index===2?(variant==='frame'&&index===2?'chassis':'cutaway'):'exterior';
 $$('#hero-visual .scene-fallback img').forEach((img,i)=>{img.src=img.dataset.suppliedTrailerPreview||`assets/film/${i?16:20}-${pose}.webp`;img.alt=`${i?16:20}-foot trailer ${pose} concept`;});
},'#hero-title,#hero-description,.model-note');
const grassStages=[
 ['COLLECT / 01','Collect.','START WITH THE ROUTE YOU ALREADY RUN','Keep suitable clippings from the job. Separate contamination and track what comes back from each property.','MOW → COLLECT → SORT'],
 ['PREPARE / 02','Prepare.','CONSISTENCY MAKES THE DIFFERENCE','Condition, dry and mill the collected grass. A repeatable feedstock is the starting point for a repeatable product.','CONDITION → DRY → MILL'],
 ['CREATE VALUE / 03','Make it useful.','A PRODUCT WITH A PURPOSE — AND A BUYER','Explore grass-fiber materials and product concepts. Validate the recipe, quality and local demand before you scale.','FORMULATE → FORM → VALIDATE']
];
const materialState=registerTrack('#materials',official?3:4,index=>{
 if(official){
  const [code,name,label,copy,output]=grassStages[index];$('#material-code').textContent=code;setAnimatedTitle($('#material-name'),name);$('#material-label').textContent=label;$('#material-copy').textContent=copy;$('#material-output').textContent=output;
  revealDetails([$('#material-code'),$('#material-label'),$('#material-copy'),$('#material-output')]);
  $$('.grass-chapters li').forEach((li,i)=>{if(i===index)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
  return;
 }
 const [code,short,name,label,copy,output]=materials[index];$('#material-code').textContent=code;$('.material-ghost').textContent=short;$('#material-name').textContent=name;$('#material-label').textContent=label;$('#material-copy').textContent=copy;$('#material-output').textContent=output;
 $$('.material-list li').forEach((li,i)=>{if(i===index)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
 const fallback=$('.material-fallback img');if(fallback){fallback.src=`assets/biomass/${['grass','seaweed','wood','coffee'][index]}-poster.webp`;fallback.alt=`${name} material specimen`;}
 appear([$('.material-description')]);
});
setupGrassEconomics();
const tourState=official?registerLiveTrack('#inside'):registerTrack('#inside',7,index=>{
 const [kicker,title,copy,key,value]=tour[index];$('#tour-kicker').textContent=kicker;$('#tour-title').innerHTML=title;$('#tour-copy').textContent=copy;$('#tour-count').textContent=`0${index+1} / 07`;$('#tour-spec dt').textContent=key;$('#tour-spec dd').textContent=value;
 $$('.tour-chapters li').forEach((li,i)=>{if(i===index)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
 const image=$('#tour-visual .scene-fallback img');image.src=image.dataset.suppliedTrailerPreview||`assets/film/20-${index===0?'exterior':'cutaway'}.webp`;image.alt=index===0?'20-foot trailer exterior concept':'20-foot trailer interior concept';
},'#tour-title,#tour-copy');
if(manualPlayback)playback=installScenePlayback({
 getActive:()=>tracks.find(state=>state.track.id===document.body.dataset.activeScene),
 readProgress:state=>stage.progress(state.track),
 writeProgress:(state,p)=>{stage.seekProgress(state.track,p);requestUpdate();},
 setPaused:value=>{paused=value;applyMotion();requestUpdate();},
 reduced:reduce
});
let scrollFrame=0;
function update(){scrollFrame=0;stage.update();for(const state of tracks)state.update();editorial?.update();playback?.sync();}
function requestUpdate(){if(!scrollFrame)scrollFrame=requestAnimationFrame(update);}
addEventListener('scroll',requestUpdate,{passive:true});addEventListener('resize',requestUpdate);update();
installDisplayFramework({stage,refresh:update});
if(official)import('./hero-frame.js?v=4').then(m=>m.installHeroFrame()).catch(e=>console.warn('Hero framing unavailable.',e.message));
// One scroll per thing (owner 10-24): forward input steps beat to beat, playing each chapter's film; back scrolls freely.
if(manualPlayback&&official&&playback)import('./beat-scroll.js?v=12').then(m=>m.installBeatScroll({stage,tracks,playback,getActive:()=>tracks.find(state=>state.track.id===document.body.dataset.activeScene),readProgress:state=>stage.progress(state.track)})).catch(e=>console.warn('Beat scrolling unavailable.',e.message));
async function loadTrailer(state,canvas,single=false){
 if(!state)return;
 if(official){
  try{
   if(single){
    const review=new URLSearchParams(location.search).get('review');
    const originalAt={equipment:.12,vision:.33,rtk:.40,quote:.55,storage:.65}[review];
    const at=originalAt===undefined?undefined:fieldProgress(originalAt);
    if(at!==undefined){
     await document.fonts.ready;
     if(document.readyState!=='complete')await new Promise(resolve=>addEventListener('load',resolve,{once:true}));
     await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
     stage.seekProgress(state.track,at,{refresh:true});
    }
   }
   const view=single?await (await import('./official-journey.js?v=50')).createOfficialJourney($(canvas),{readProgress:()=>stage.progress(state.track),paused}):await (await import('./platform.js?v=58')).createPlatform($(canvas),{readProgress:()=>stage.progress(state.track),writeProgress:p=>stage.seekProgress(state.track,p),isActive:()=>stage.visible(state.track),paused});
   scenes.push(view);state.view=view;view.setActive(stage.visible(state.track));view.setProgress(stage.progress(state.track));view.setPalette();view.setPaused(paused);playback?.sync();
   if(!single&&!new URLSearchParams(location.search).has('edit'))playback?.autoplay(state,{end:.25});
  }catch(e){state.pin.dataset.renderer='static';const status=$('#platform-status');if(!single&&status){document.documentElement.classList.remove('arrival-quiet');document.querySelectorAll('.masthead,#mobile-menu,#platform-story,.hero-base,#capacity-labels,#capacity-summary,#platform-status').forEach(el=>el.inert=false);document.body.style.setProperty('--opening-mix','0%');status.hidden=false;status.textContent='The trailer preview is unavailable. Explore the layouts and pilot details below.';}console.warn('Showing the trailer still.',e.message);}
  return;
 }
 try{const {createTrailerScene}=await import('./atlas-scene.js?v=10');const view=await createTrailerScene($(canvas),{single,variant,paused,readProgress:()=>stage.progress(state.track)});scenes.push(view);state.view=view;view.setActive(stage.visible(state.track));view.setProgress(stage.progress(state.track));view.setPaused(paused);}
 catch(e){state.pin.dataset.renderer='static';console.warn('Showing trailer photographs while the live view is unavailable.',e.message);}
}
loadTrailer(heroState,'#hero-canvas');
function whenNear(element,callback){if(!element)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();callback();}},{rootMargin:'700px'});observer.observe(stage.slot(element));}
whenNear($('#materials'),async()=>{try{
 const photo=$('.grass-photograph img[data-src]');if(photo){photo.src=photo.dataset.src;delete photo.dataset.src;}
 const view=official?await(await import('./grass-story.js?v=6')).createGrassStory($('#grass-product-canvas')):await(await import('./biomass-viewer.js?v=2')).createBiomassViewer($('#biomass-canvas'),{paused});
 materialState.view=view;scenes.push(view);view.setPaused(paused);view.setActive(stage.visible(materialState.track));view.setProgress(materialState.p);
}catch(e){console.warn('Showing the grass photograph.',e.message);}});
whenNear($('#inside'),()=>loadTrailer(tourState,'#tour-canvas',true));
$$('[data-rotate]').forEach(b=>b.addEventListener('click',()=>heroState?.view?.rotate(Number(b.dataset.rotate))));
// Reveal copy on entry without obscuring keyboard-focused content.
const revealObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.remove('waiting');revealObserver.unobserve(e.target);}},{threshold:.12});
if(!official)$$('.reveal').forEach(el=>{if(!paused)el.classList.add('waiting');revealObserver.observe(el);el.addEventListener('focusin',()=>el.classList.remove('waiting'));});
const investor=$('#invest-dialog');
$$('[data-invest]').forEach(b=>b.addEventListener('click',()=>{investor.showModal();if(official){revealTitle($('#invest-title'));revealDetails(investor.querySelectorAll('p,.line-link'));}}));
$('.dialog-close')?.addEventListener('click',()=>investor.close());
$$('[data-interest]').forEach(a=>a.addEventListener('click',()=>{if($('#interest'))$('#interest').value=a.dataset.interest;investor?.close();}));
$('#inquiry-form')?.addEventListener('submit',e=>{
 e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
 const name=form.elements.name.value.trim(),message=form.elements.message.value.trim();if(!name||!message){$('#form-status').textContent='Please add your name and equipment needs.';return;}
 const interest=form.elements.interest.value;
 const business=form.elements.business?.value.trim();
 const body=`Hello Marvel Labs,\n\nI’m interested in ${interest.toLowerCase()}.\n${business?'\nBusiness / service area: '+business+'\n':''}\n${message}\n\nPlease send details about the trailer configuration, pilot scope, pricing and availability.\n\nBest,\n${name}`;
 const href=`mailto:hello@marvellabs.com?subject=${encodeURIComponent('Marvel Labs — '+interest)}&body=${encodeURIComponent(body)}`;
 $('#email-fallback').href=href;$('#email-fallback').hidden=false;$('#form-status').textContent='Your request is prepared. Open the email draft below to review and send it.';$('#email-fallback').focus();
});
