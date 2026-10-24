import {createFilm} from './film-player.js?v=float-20261016';

const variants={
 explore:{step:'Explore',title:'Room for\nyour next idea.',description:'Four connected stages. One mobile production line. Look around, then keep scrolling to find your fit.',cards:[['A little more possibility.','Four dedicated process bays','Space for preparation and service'],['A smaller beginning.','Four compact process bays','Designed around a local pilot']]},
 free:{step:'Start free',title:'Every new process\nstarts with an idea.',description:'Explore a material, a product, and a possible layout with a free planning concept.',cards:[['$0','20 ft planning concept','Material discussion + layout preview'],['$0','16 ft planning concept','Material discussion + layout preview']]},
 frame:{step:'Structure',title:'An idea needs\na foundation.',description:'The equipment lifts away to reveal the structure that carries the production line.',cards:[['Room to build on.','20 ft structural concept','Extended frame and service envelope'],['Ready for a smaller footprint.','16 ft structural concept','Compact frame and service envelope']]}
};
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(x,a,b)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export async function createComparison({paused=false}={}){
 const variant=document.body.dataset.variant||'explore',config=variants[variant];
 const track=document.querySelector('#top'),pin=document.querySelector('#stage'),host=document.querySelector('.comparison-visual'),canvas=document.querySelector('#comparison-canvas');
 const title=document.querySelector('#compare-title'),description=document.querySelector('#compare-description'),kicker=document.querySelector('#compare-kicker');
 const cards=[...document.querySelectorAll('.compare-card')],steps=[...document.querySelectorAll('[data-compare-step]')];
 let target=0,progress=0,chapter=-1,raf=0,lastTime=0,visible=true,orbit=0,drag=null,live=null,livePromise=null;
 const film=createFilm(canvas,()=>{host.classList.add('is-ready');pin.dataset.model='studio-sequence';},()=>{host.classList.remove('is-ready');pin.dataset.model='static-study';});
 const copy=[
  ['MOBILE MANUFACTURING / MARVEL LABS','Manufacturing,\ncloser to nature.','A factory that goes to the material. Two footprints. A new way to make.'],
  ['01 — BENEATH THE SURFACE','Open up\nthe possibilities.','Preparation, formulation, forming, and inspection. Connected inside one mobile platform.'],
  ['02 — '+config.step.toUpperCase(),config.title,config.description],
  ['03 — FIND YOUR FIT','Your material.\nYour next move.','Choose the space for your ambition. Explore a pilot with Marvel Labs.']
 ];
 const cardCopy=[
  [['More space. More possibility.','20 ft / 6.10 m','Extended production concept'],['Small footprint. Big ambition.','16 ft / 4.88 m','Compact production concept']],
  [['A complete line, connected.','Prepare → formulate → form → inspect','Four bays with room to work'],['The same thinking. Less space.','Prepare → formulate → form → inspect','Four bays in a compact layout']],
  config.cards,
  [['$2,500','/ month · illustrative pilot plan','20 ft concept · four process zones'],['$1,900','/ month · illustrative pilot plan','16 ft concept · four process zones']]
 ];
 steps[2].querySelector('span').textContent=config.step;
 document.querySelectorAll('[data-variant-link]').forEach(a=>{if(a.dataset.variantLink===variant)a.setAttribute('aria-current','page');});
 function updateCopy(next){
  if(chapter===next)return;chapter=next;pin.dataset.chapter=next;
  const still=next===0||next===3?'exterior':variant==='frame'&&next===2?'chassis':'cutaway';
  document.querySelectorAll('.comparison-fallback img').forEach((img,i)=>{img.src=`assets/film/${i?16:20}-${still}.webp?v=float-20261016`;img.alt=`${i?16:20}-foot trailer ${still} concept`;});
  [kicker.textContent,title.textContent,description.textContent]=copy[next];
  if(!paused)for(const el of [title,description,...cards])el.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});
  steps.forEach((s,i)=>{if(i===next)s.setAttribute('aria-current','step');else s.removeAttribute('aria-current');});
  cards.forEach((card,i)=>{const [heading,line,detail]=cardCopy[next][i];card.querySelector('h3').textContent=heading;card.querySelector('.compare-card-line').textContent=line;card.querySelector('.compare-card-detail').textContent=detail;card.querySelector('a').hidden=next!==3;card.classList.toggle('is-priced',next===3||(next===2&&variant==='free'));});
  document.querySelector('.inspection-controls').hidden=!(next===2&&variant==='explore');
  document.querySelector('#compare-note').textContent=next===3?'Mock prices for concept comparison. Final scope and pricing are defined together.':next===2&&variant==='free'?'Illustrative free planning offer. Trailer hardware is not included.':'Mobile production concepts · illustrative equipment and layouts';
  if(next!==2){orbit=0;host.classList.remove('is-inspecting');}
 }
 function draw(){
  const opened=smooth(progress,.16,.43),closing=smooth(progress,.80,.94);
  const middle=variant==='frame'?smooth(progress,.53,.70):0;
  let pose=(.60*opened+.40*middle)*(1-closing);
  if(paused)pose=chapter===0||chapter===3?0:variant==='frame'&&chapter===2?1:.6;
  const drift=paused?0:Math.sin(progress*Math.PI*2)*-.018;
  film.setProgress(pose,drift);
  const opening=smooth(pose,.12,.48),frame=smooth(pose,.72,1);
  pin.dataset.renderProgress=progress.toFixed(4);pin.dataset.open=opening.toFixed(3);pin.dataset.frame=frame.toFixed(3);
  live?.draw(orbit,opening,frame,drift);
 }
 function tick(time){raf=0;if(!visible||document.hidden)return;const dt=lastTime?Math.min(.1,(time-lastTime)/1000):1/60;lastTime=time;progress=paused?target:progress+(target-progress)*(1-Math.exp(-dt*8));if(Math.abs(progress-target)<.00005)progress=target;draw();if(progress!==target)schedule();}
 function schedule(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
 function update(){const rect=track.getBoundingClientRect();target=clamp(-rect.top/Math.max(1,track.offsetHeight-pin.offsetHeight));updateCopy(target<.16?0:target<.51?1:target<.79?2:3);pin.style.setProperty('--comparison-progress',target);pin.dataset.progress=target.toFixed(4);document.body.classList.toggle('stage-active',rect.bottom>pin.offsetHeight*.4);if(paused){progress=target;if(visible)draw();}else schedule();}
 async function inspect(delta){
  if(chapter!==2||variant!=='explore')return;orbit+=delta;
  if(!livePromise){host.classList.add('inspection-loading');livePromise=import('./inspection.js?v=float-20261016').then(m=>m.createInspection(document.querySelector('#inspection-canvas'))).then(view=>{live=view;host.classList.remove('inspection-loading');if(chapter===2){host.classList.add('is-inspecting');draw();}return view;}).catch(()=>{host.classList.remove('inspection-loading');document.querySelector('#inspection-label').textContent='Continue scrolling to compare the plans';return null;});}
  const view=await livePromise;if(view&&chapter===2){host.classList.add('is-inspecting');draw();}
 }
 window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){lastTime=0;progress=target;draw();}else{cancelAnimationFrame(raf);raf=0;}},{rootMargin:'100px'}).observe(pin);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
 document.querySelector('#stage-motion').addEventListener('click',()=>document.querySelector('#motion-toggle').click());
 document.querySelector('#inspect-left').addEventListener('click',()=>inspect(-.25));document.querySelector('#inspect-right').addEventListener('click',()=>inspect(.25));document.querySelector('#inspect-reset').addEventListener('click',()=>{orbit=0;host.classList.remove('is-inspecting');draw();});
 host.addEventListener('pointerdown',e=>{if(chapter===2&&variant==='explore'&&e.pointerType==='mouse'){drag=e.clientX;host.setPointerCapture(e.pointerId);}});
 host.addEventListener('pointermove',e=>{if(drag===null)return;inspect((e.clientX-drag)*.008);drag=e.clientX;});
 host.addEventListener('pointerup',()=>drag=null);host.addEventListener('pointercancel',()=>drag=null);
 update();return {setPaused(value){paused=value;progress=target;draw();},resize(){film.resize();live?.resize();}};
}
