import {createRecordedScene} from './recorded-scene.js?v=7';
// Owner decision 2026-10-23: no receiving/packaging/rack system on the site. The field film is
// capped at frame 1380 of 1919 (the parked trailer, before the camera enters the rear bay), so the
// tour has five chapters. Stops are in field-film progress; the scroll track maps 0..1 -> 0..FIELD_END.
const FIELD_END=1380/1919;
const workflowStops=[0,.16,.34,.46,.58,FIELD_END];
import {createVisionOverlay} from './vision-overlay.js?v=8';
import {createScrollMotion} from './scroll-motion.js';
import {setAnimatedTitle,revealTitle,revealDetails} from './editorial-motion.js?v=5';
const clamp=v=>Math.max(0,Math.min(1,v));
export async function createOfficialJourney(canvas,{readProgress,paused}){
 let scene;
 try{
  scene=false /* live authoring is local-only */
   ?await (await import('./field-workflow-scene.js?v=34')).createFieldWorkflow(canvas)
   :await createRecordedScene(canvas,{name:'field',onChange:()=>requestAnimationFrame(()=>{if(active)request();})});
  scene.draw(readProgress()*FIELD_END,paused);canvas.parentElement.classList.add('scene-ready');
 }
 catch(error){canvas.closest('.pin').dataset.renderer='static';console.warn('Showing the enclosed trailer still.',error.message);}
 const $=id=>document.getElementById(id),pin=canvas.closest('.pin');
 const vision=createVisionOverlay(pin);
 const quoteScope=document.createElement('dl');quoteScope.id='workflow-scope';quoteScope.setAttribute('aria-label','Illustrative measured job scope');$('workflow-demo').insertBefore(quoteScope,$('workflow-demo').lastElementChild);
 let p=0,active=false,frame=0,lastCaption=-1,lastScope='',lastNote='';
 const reduceMotion=matchMedia('(prefers-reduced-motion:reduce)');
 const motion=createScrollMotion(readProgress());
 const captions=[
  ['01 / BRING YOUR EVERYDAY EQUIPMENT','Your tools.<br><em>A bigger opportunity.</em>','The ramp opens. Your zero-turn, push mower and trimmers have a place. Start with the equipment and the work you already know.','THE WORKING DAY','Equipment → understand the job → create value'],
  ['02 / UNDERSTAND THE JOB','See the work.<br><em>Capture the scope.</em>','Lawn, edging, hedges, planting beds and tree rings become a measured landscaping scope. Explore how a camera-assisted survey could support the next estimate.','FOR YOUR BUSINESS','A clearer scope before you price'],
  ['03 / KEEP THE SITE REFERENCE','Every detail.<br><em>In its place.</em>','RTK provides a site reference for camera observations. Keep estimated areas and edge lengths connected to the property you are quoting.','FOR YOUR BUSINESS','Site context you can return to'],
  ['04 / MOVE THE QUOTE FORWARD','Less retyping.<br><em>More follow-through.</em>','Carry the measured scope into an estimate and customer email draft. Review the work and price before anything goes to the customer.','VISUAL DEMONSTRATION','No email is sent'],
  ['05 / WORK THE JOB','The work you do.<br><em>A new possibility.</em>','Scope understood. Quote reviewed. Now work the job and keep suitable clippings for the next step. Your landscaping work stays at the center.','FOR YOUR BUSINESS','Service income + material opportunity']
 ];
 function draw(time){frame=0;if(!active)return;p=motion.step(readProgress(),time,paused||reduceMotion.matches);
  const filmP=p*FIELD_END;
  const i=Math.min(4,workflowStops.findLastIndex(s=>filmP>=s)),local=clamp((filmP-workflowStops[i])/(workflowStops[i+1]-workflowStops[i]));
  const [tag,title,copy,key,value]=captions[i];
  if(i!==lastCaption){
   const direction=i<lastCaption?-1:1;
   $('tour-kicker').textContent=tag;setAnimatedTitle($('tour-title'),title,{direction});$('tour-copy').textContent=copy;
   $('tour-count').textContent=`0${i+1} / 05`;document.querySelector('#tour-spec dt').textContent=key;document.querySelector('#tour-spec dd').textContent=value;
   document.querySelectorAll('.tour-chapters li').forEach((el,index)=>{if(index===i)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
   if(lastCaption>=0)revealDetails(['tour-count','tour-kicker','tour-copy','tour-spec'].map($),{direction});
   lastCaption=i;
  }
  const state=scene?.draw(filmP,paused);
  vision.update(state,canvas.clientWidth,canvas.clientHeight);
  pin.style.setProperty('--yard-reveal',state?.yardReveal||0);
  const mode=state?.mode||(filmP<.035?'towing':'parked');pin.dataset.fieldMode=mode;pin.dataset.fieldChapter=String(i);pin.dataset.interior='false';
  const status=mode==='towing'?'ARRIVING AT THE JOB':i===0?'PARKED · UNLOAD YOUR EQUIPMENT':i<=3?'PARKED · UNDERSTAND THE JOB':'PARKED · WORK & CREATE VALUE';
  if($('field-status').textContent!==status){$('field-status').textContent=status;revealDetails([$('field-status')],{delay:0});}
  document.querySelectorAll('.field-modes span').forEach((el,index)=>el.classList.toggle('active',index===(i===0?0:i<=3?1:2)));
  const quoteEntering=$('workflow-demo').hidden&&i===3;$('workflow-demo').hidden=i!==3;
  if(quoteEntering){revealTitle($('workflow-state'));revealDetails($('workflow-demo').querySelectorAll('p,li,#workflow-scope > div'),{delay:0});}
  const jobs=state?.vision?.jobs||[],scope=JSON.stringify(jobs);
  if(i===3&&scope!==lastScope){lastScope=scope;quoteScope.replaceChildren(...jobs.map(job=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=job.label;dd.textContent=job.value;row.append(dt,dd);return row;}));revealDetails(quoteScope.children);}
  // Native scroll positions round to pixels; keep exact chapter shortcuts on
  // their intended step even when the resulting fraction is slightly lower.
  const step=Math.min(3,Math.floor(local*4+1e-3));setAnimatedTitle($('workflow-state'),['Site understood','Estimate prepared','Quote assembled','Email drafted'][step]);
  document.querySelectorAll('#workflow-demo li').forEach((el,index)=>el.classList.toggle('complete',index<=step));
  const note=state?.annotation,callout=$('field-callout'),leader=$('field-leader');callout.hidden=!note;leader.toggleAttribute('hidden',!note);
  if(note){
   const w=canvas.clientWidth,h=canvas.clientHeight,mobile=w<=760;
   const labelWidth=mobile?175:230,x=Math.max(18,Math.min(w-labelWidth-18,note.x+28));
   const y=Math.max(h*(mobile?.40:.32),Math.min(h*.73,note.y-95));
   callout.style.left=x+'px';callout.style.top=y+'px';callout.querySelector('strong').textContent=note.title;callout.querySelector('span').textContent=note.detail;
   if(lastNote!==note.title){lastNote=note.title;revealDetails(callout.children,{delay:0});}
   leader.setAttribute('viewBox',`0 0 ${w} ${h}`);leader.querySelector('path').setAttribute('d',`M${note.x},${note.y} L${x+12},${y+43} L${x+labelWidth},${y+43}`);leader.querySelector('circle').setAttribute('cx',note.x);leader.querySelector('circle').setAttribute('cy',note.y);
  }else lastNote='';
  window.__officialJourneyState={p,filmP,index:i,local,mode,...state,targetProgress:clamp(readProgress())};
  if(motion.moving)request();
 }
 function request(){if(!frame)frame=requestAnimationFrame(draw);}
 addEventListener('resize',()=>{scene?.resize();request();});
 return {setProgress(){request();},setActive(value){if(value&&!active)motion.snap(readProgress());active=value;scene?.setActive?.(value);request();},setPaused(value){paused=value;request();},setPalette(){scene?.setPalette(document.documentElement.dataset.palette);request();}};
}
