import {componentInfo} from './component-info.js?v=float-20261016';

export async function createExperience({paused=false}={}){
  let heroViewer=null,trailerViewer=null,biomassViewer=null,processViewer=null;
  const explorer=document.querySelector('#explore-dialog'),workspace=document.querySelector('.cad-workspace');
  const investor=document.querySelector('#invest-dialog');
  function fillSpecs(element,specs){element.replaceChildren(...specs.map(([label,value])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;div.append(dt,dd);return div;}));}
  const trailerChapters=[
    {label:'EXTERIOR / 00',category:'THE MOBILE PLATFORM',title:'A factory. On the move.',description:'A trailer brings manufacturing closer to the material. Scroll to look beneath the shell and follow the production line.',specs:[['Body study','6.10 × 2.4 m'],['Production concept','Four connected process zones']]},
    {label:'CUTAWAY / 01',category:'OPENING THE SHELL',title:'One connected production line.',description:'The exterior slices away to reveal preparation, formulation, forming, and inspection. Each bay has a place in the material journey.',specs:[['Inside the study','Four equipment modules'],['Interior height study','1.8 m']]},
    {label:'EXPLODED / 02',category:'A CLOSER LOOK',title:'Space for every part.',description:'The production modules separate to reveal how the interior concept fits together. Keep scrolling to move into the working bays.',specs:[['Platform','Tandem-axle trailer concept'],['Configuration','Illustrative layout']]},
    ...['intake','formulation','forming','quality'].map((id,i)=>({...componentInfo[id],label:`BAY 0${i+1} / 04`}))
  ];
  let journeyProgress=0,journeyChapter=-1,biomassIndex=-1,journeyFrame=0;
  const cadHome=document.querySelector('#cad-home'),mount=document.querySelector('#immersive-mount');
  const biomassJourney=document.querySelector('#biomass-journey'),biomassPin=document.querySelector('.biomass-library');
  const clamp=value=>Math.max(0,Math.min(1,value));
  const ease=value=>{const x=clamp(value);return x*x*(3-2*x);};
  function arrive(element){
    if(paused)return;
    element.getAnimations().forEach(animation=>animation.cancel());
    element.animate([{opacity:.25,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  function progressFor(track,pin,top){return clamp((top-track.getBoundingClientRect().top)/Math.max(1,track.offsetHeight-pin.offsetHeight));}
  function updateJourney(immediate=false){
    const track=explorer.open?mount:cadHome,top=explorer.open?document.querySelector('.explore-dialog-header').offsetHeight:78;
    journeyProgress=progressFor(track,workspace,top);trailerViewer?.setJourney(journeyProgress,immediate);
    workspace.style.setProperty('--journey-progress',journeyProgress);
    const chapter=Math.min(6,Math.floor(journeyProgress*7));
    workspace.dataset.chapter=chapter;
    if(chapter!==journeyChapter){journeyChapter=chapter;const data=trailerChapters[chapter];
      document.querySelector('.cad-fallback img').src=`assets/film/20-${chapter===0?'exterior':'cutaway'}.webp?v=float-20261016`;
      document.querySelector('#cad-view-label').textContent=data.label;
      document.querySelector('#part-number').textContent=`0${chapter+1} / 07`;
      document.querySelector('#journey-position').textContent=`0${chapter+1} / 07`;
      document.querySelector('#part-category').textContent=data.category;
      document.querySelector('#part-title').textContent=data.title;
      document.querySelector('#part-description').textContent=data.description;
      fillSpecs(document.querySelector('#part-specs'),data.specs);
      arrive(document.querySelector('#part-detail'));
      document.querySelectorAll('[data-chapter]').forEach(el=>{if(Number(el.dataset.chapter)===chapter)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    }
  }
  function enterTrailer(){
    explorer.showModal();mount.append(workspace);document.body.classList.add('modal-open');explorer.scrollTop=0;
    heroViewer?.setPaused(true);biomassViewer?.setPaused(true);processViewer?.setPaused(true);
    requestAnimationFrame(()=>{trailerViewer?.resize();updateJourney(true);});
  }
  document.querySelector('#enter-trailer').addEventListener('click',enterTrailer);
  document.querySelector('#hero-detail-open').addEventListener('click',enterTrailer);
  document.querySelector('#explore-close').addEventListener('click',()=>explorer.close());document.querySelector('#explore-finish').addEventListener('click',()=>explorer.close());
  document.querySelector('.explore-motion').addEventListener('click',()=>document.querySelector('#motion-toggle').click());
  explorer.addEventListener('close',()=>{cadHome.append(workspace);document.body.classList.remove('modal-open');heroViewer?.setPaused(paused);biomassViewer?.setPaused(paused);processViewer?.setPaused(paused);requestAnimationFrame(()=>{trailerViewer?.resize();updateJourney(true);});});
  explorer.addEventListener('scroll',()=>{updateJourney();updateFlow();},{passive:true});
  document.querySelectorAll('[data-open-investor]').forEach(button=>button.addEventListener('click',()=>{investor.showModal();document.body.classList.add('modal-open');}));
  investor.querySelector('.dialog-close').addEventListener('click',()=>investor.close());investor.addEventListener('close',()=>document.body.classList.remove('modal-open'));
  investor.querySelector('.invest-contact').addEventListener('click',()=>investor.close());

  const biomassData={grass:['GR–01','From cut fibers to a consistent, process-ready powder. Local grass is one starting point for the biomass platform.','PREPARATION / SHRED · CONDITION · MILL'],seaweed:['SW–02','Seaweed people don’t eat can become useful objects. Marvel Labs’ portfolio includes seaweed sinks, eyewear, and architectural hardware.','PORTFOLIO / SINKS · EYEWEAR · HARDWARE'],wood:['WD–03','Wood-based material takes on new forms through formulation, shaping, and finishing. The portfolio includes lighting and a guitar body.','PORTFOLIO / LIGHTING · GUITAR BODIES'],coffee:['CF–04','Spent coffee grounds become a starting material for objects with a second life. The portfolio includes mugs and other housewares.','PORTFOLIO / MUGS · HOUSEWARES']};
  const materials=['grass','seaweed','wood','coffee'];
  function updateBiomass(){
    const progress=progressFor(biomassJourney,biomassPin,78),index=Math.min(3,Math.floor(progress*4));
    biomassViewer?.setProgress(progress);biomassPin.style.setProperty('--material-progress',progress);
    if(index===biomassIndex)return;biomassIndex=index;
    const id=materials[index],data=biomassData[id],name={grass:'Grass',seaweed:'Seaweed',wood:'Wood',coffee:'Coffee grounds'}[id];
    document.querySelector('#specimen-code').textContent=data[0];document.querySelector('#biomass-name').textContent=name;
    document.querySelector('#biomass-summary').textContent=data[1];document.querySelector('#biomass-output').textContent=data[2];
    arrive(document.querySelector('#biomass-description'));
    document.querySelector('#biomass-count').textContent=`0${index+1} / 04`;document.querySelector('#biomass-sample').dataset.material=id;
    const fallback=document.querySelector('.biomass-static');
    if(id==='grass')fallback.innerHTML='<img src="assets/grass-to-powder.jpg" alt="Grass fibers conditioned into material powder" width="1600" height="900">';
    else{const label=document.createElement('span');label.className='biomass-static-label';label.textContent=name;fallback.replaceChildren(label);}
    document.querySelectorAll('[data-biomass]').forEach(el=>{if(el.dataset.biomass===id)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
  }
  // Select photographs keep their documentary role, with a small scroll-driven camera move.
  const depthPhotos=[...document.querySelectorAll('.product-main,.field-photo,.factory-image')];
  function updateDepth(){for(const el of depthPhotos){const rect=el.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)continue;const phase=paused?0:Math.max(-1,Math.min(1,(rect.top+rect.height/2-innerHeight/2)/innerHeight));el.style.setProperty('--photo-depth',phase);}}
  const processTrack=document.querySelector('#process-journey'),processPin=document.querySelector('.process-layout');let processIndex=-1;
  function updateProcess(){const progress=progressFor(processTrack,processPin,78);processViewer?.setProgress(progress);const index=Math.min(3,Math.floor(progress*4));if(index!==processIndex){processIndex=index;window.dispatchEvent(new CustomEvent('process-step',{detail:index}));arrive(document.querySelector('#process-detail'));}}
  // Only nearby scenes need a handoff. Sticky geometry and chapter travel stay native.
  const flowStages=[document.querySelector('#stage'),workspace,biomassPin,processPin];
  const flowCopy=[...document.querySelectorAll('.overview-story,.platform-summary,.explorer-heading,.intro-layout,.factory-heading,.size-study,.product-layout,.contact-layout')];
  const flowElements=[...flowStages,...flowCopy],nearbyFlow=new Set();
  flowStages.forEach(el=>el.classList.add('flow-stage'));
  flowCopy.forEach(el=>el.classList.add('flow-copy'));
  function updateFlow(){
    for(const el of paused?flowElements:nearbyFlow){
      const rect=el.getBoundingClientRect(),height=innerHeight;
      const lift=el.classList.contains('flow-copy')?parseFloat(el.style.getPropertyValue('--flow-lift'))||0:0;
      const entry=paused?1:ease((height-rect.top+lift)/(height*.6));
      const exit=paused?1:ease((rect.bottom-lift)/(height*.55));
      el.style.setProperty('--flow-opacity',(entry*exit).toFixed(4));
      el.style.setProperty('--flow-lift',`${((1-entry)*32-(1-exit)*22).toFixed(2)}px`);
    }
  }
  const flowObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting)nearbyFlow.add(entry.target);else nearbyFlow.delete(entry.target);});
    scheduleJourneys();
  },{rootMargin:'150px'});
  flowElements.forEach(el=>flowObserver.observe(el));
  function updateJourneys(){journeyFrame=0;updateJourney();updateBiomass();updateProcess();updateDepth();updateFlow();}
  function scheduleJourneys(){if(!journeyFrame)journeyFrame=requestAnimationFrame(updateJourneys);}
  window.addEventListener('scroll',scheduleJourneys,{passive:true});window.addEventListener('resize',scheduleJourneys);
  updateJourneys();
  try{const {createComparison}=await import('./comparison.js?v=float-20261016');heroViewer=await createComparison({paused});}catch(error){console.warn('Trailer comparison unavailable; showing static studies.',error);}
  function near(element,initialize){
    let started=false;
    const observer=new IntersectionObserver(entries=>{if(!started&&entries.some(e=>e.isIntersecting)){started=true;observer.disconnect();initialize().then(updateJourneys).catch(error=>console.warn('A live study is using its static alternative.',error));}},{rootMargin:'600px'});
    observer.observe(element);
    return ()=>{if(!started){started=true;observer.disconnect();initialize().then(updateJourneys).catch(error=>console.warn('Live study unavailable.',error));}};
  }
  const startTrailer=near(workspace,async()=>{const {createTrailerViewer}=await import('./trailer-viewer.js?v=float-20261016');trailerViewer=await createTrailerViewer(document.querySelector('#trailer-canvas'),{paused});});
  document.querySelectorAll('#enter-trailer,#hero-detail-open').forEach(button=>button.addEventListener('click',startTrailer));
  near(document.querySelector('#biomass-sample'),async()=>{const {createBiomassViewer}=await import('./biomass-viewer.js?v=2');biomassViewer=await createBiomassViewer(document.querySelector('#biomass-canvas'),{paused});});
  near(document.querySelector('.process-art'),async()=>{const {createProcessWorld}=await import('./process-world.js?v=float-20261016');processViewer=createProcessWorld(document.querySelector('#process-canvas'),{paused});});
  updateJourneys();
  return {setPaused(value){paused=value;heroViewer?.setPaused(value||explorer.open);trailerViewer?.setPaused(value);biomassViewer?.setPaused(value||explorer.open);processViewer?.setPaused(value||explorer.open);updateDepth();updateFlow();if(value)flowElements.forEach(el=>el.getAnimations({subtree:true}).forEach(animation=>animation.cancel()));const toggle=document.querySelector('.explore-motion');toggle.setAttribute('aria-pressed',String(value));toggle.setAttribute('aria-label',value?'Resume animation':'Pause animation');toggle.textContent=value?'▷':'Ⅱ';}};
}
