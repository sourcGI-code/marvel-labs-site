import {createRouteQuotes} from './route-quotes.js?v=2';
import {createRecordedScene} from './recorded-scene.js?v=18';
const workflowStops=[0,.16,.34,.46,.58,1380/1919];
import {createVisionOverlay} from './vision-overlay.js?v=9';
import {createScrollMotion} from './scroll-motion.js';
import {setAnimatedTitle,revealTitle,revealDetails} from './editorial-motion.js?v=7';
const clamp=v=>Math.max(0,Math.min(1,v));
export async function createOfficialJourney(canvas,{readProgress,paused}){
 let scene;
 try{
  scene=document.body.dataset.sceneSource!=='accepted-films'&&false /* live authoring is local-only */
   ?await (await import('./field-workflow-scene.js?v=44')).createFieldWorkflow(canvas)
   :await createRecordedScene(canvas,{name:'field',onChange:()=>requestAnimationFrame(()=>{if(active)request();})});
  scene.draw(readProgress(),paused);canvas.parentElement.classList.add('scene-ready');
 }
 catch(error){canvas.closest('.pin').dataset.renderer='static';console.warn('Showing the enclosed trailer still.',error.message);}
 const $=id=>document.getElementById(id),pin=canvas.closest('.pin');
 const vision=createVisionOverlay(pin);const routeQuotes=createRouteQuotes(pin);
 const quoteScope=document.createElement('dl');quoteScope.id='workflow-scope';quoteScope.setAttribute('aria-label','Illustrative measured job scope');$('workflow-demo').insertBefore(quoteScope,$('workflow-demo').lastElementChild);
 let p=0,active=false,frame=0,lastCaption=-1,lastScope='',lastNote='',lastP=0;
 const reduceMotion=matchMedia('(prefers-reduced-motion:reduce)');
 const motion=createScrollMotion(readProgress());
 let playbackTarget=null;
 function pinPlayback(value){p=motion.snap(value);playbackTarget={value,read:readProgress()};request();}
 const captions=[
  // #tour-count carries the chapter number ("0n / 05"); the kickers are labels only.
  ['BRING YOUR EVERYDAY EQUIPMENT','Your tools.<br><em>A bigger opportunity.</em>','The ramp opens. Your zero-turn, push mower and trimmers have a place. Start with the equipment and the work you already know.','THE WORKING DAY','Equipment → understand the job → create value'],
  ['UNDERSTAND THE JOB','See the work.<br><em>Capture the scope.</em>','Lawn, edging, hedges, planting beds and tree rings become a measured landscaping scope. Explore how a camera-assisted survey could support the next estimate.','FOR YOUR BUSINESS','A clearer scope before you price'],
  ['KEEP THE SITE REFERENCE','Every detail.<br><em>In its place.</em>','RTK provides a site reference for camera observations. Keep estimated areas and edge lengths connected to the property you are quoting.','FOR YOUR BUSINESS','Site context you can return to'],
  ['MOVE THE QUOTE FORWARD','Less retyping.<br><em>More follow-through.</em>','Carry the measured scope into an estimate and customer email draft. Review the work and price before anything goes to the customer.','VISUAL DEMONSTRATION','No email is sent'],
  ['WORK THE JOB','The work you do.<br><em>A new possibility.</em>','Scope understood. Quote reviewed. Now work the job and keep suitable clippings for the next step. Your landscaping work stays at the center.','FOR YOUR BUSINESS','Service income + material opportunity'],

 ];
 // Work chapter, second half (owner 14:51): two beats and the closing line, nothing else. They appear only
 // while the installed field timeline carries `operator` states (the film with the person); until that film is
 // installed the Work copy above stays. No spec callouts during the beats (empty key hides #tour-spec).
 const grassIn=['GRASS IN','Grass in.','Off the mower. The clippings go into the hopper beside the side hatch.','',''];
 const productOut=['PRODUCT OUT','Product out.','Open the hatch. A packaged product comes out on the conveyor.','',''];
 const possibilities=['GRASS IN · PRODUCT OUT','Imagine<br><em>the possibilities.</em>','','',''];
 const operatorCaptions=Object.fromEntries([
  ...['dismount','to bag','lift clippings','carry clippings','grass in','collect-grass','load-grass'].map(stage=>[stage,grassIn]),
  ...['to hatch','at hatch','open hatch','product out','side-door','retrieve-product'].map(stage=>[stage,productOut]),
  ['hold',possibilities]
 ]);
 function draw(time){frame=0;if(!active)return;const next=readProgress();if(playbackTarget&&Math.abs(next-playbackTarget.read)<1e-8)p=motion.snap(playbackTarget.value);else{playbackTarget=null;p=motion.step(next,time,paused||reduceMotion.matches);}
  const state=scene?.draw(p,paused),workflowP=state?.workflowP??p*(1380/1919);
  const i=Math.min(4,workflowStops.findLastIndex(s=>workflowP>=s)),local=clamp((workflowP-workflowStops[i])/(workflowStops[i+1]-workflowStops[i]));
  const operator=state?.operator,operatorActive=!!operator?.active,operatorCopy=operatorActive&&operatorCaptions[operator.stage];
  const routeActive=!!state?.route?.active,pitchActive=!operatorActive&&(routeActive||workflowP<.07),captionKey=operatorCopy?'operator-'+operatorCopy[1]:pitchActive?-2:i;
  const [tag,title,copy,key,value]=operatorCopy||(pitchActive?['THE WORKDAY OPPORTUNITY','The route you run.<br><em>More possibility.</em>','Bring your tools and a microfactory to the same job. Keep suitable grass clippings from your route and put that material to work.','YOUR WORKING DAY','Service income + material opportunity']:captions[i]);
  const fact=$('route-fact');if(fact)fact.hidden=!pitchActive;
  if(captionKey!==lastCaption){
   const direction=p<lastP?-1:1;
   $('tour-kicker').textContent=tag;setAnimatedTitle($('tour-title'),title,{direction});$('tour-copy').textContent=copy;$('tour-copy').hidden=!copy;
   // The operator beats are the second half of chapter 5 (Work), so the count and the chapter nav stay on 05.
   const chapter=operatorActive?4:i;
   $('tour-count').textContent=`0${chapter+1} / 05`;$('tour-spec').hidden=!key;document.querySelector('#tour-spec dt').textContent=key;document.querySelector('#tour-spec dd').textContent=value;
   document.querySelectorAll('.tour-chapters li').forEach((el,index)=>{if(index===chapter)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
   if(lastCaption>=0)revealDetails(['tour-count','tour-kicker','tour-copy','tour-spec'].map($),{direction});
   lastCaption=captionKey;
  }
  vision.update(state,canvas.clientWidth,canvas.clientHeight);routeQuotes.update(state,canvas.clientWidth,canvas.clientHeight);
  pin.style.setProperty('--yard-reveal',state?.yardReveal||0);
  const mode=state?.mode||(p<.035?'towing':'parked');pin.dataset.fieldMode=mode;pin.dataset.fieldChapter=String(i);pin.dataset.interior=String(i>=5);
  pin.dataset.operator=String(operatorActive);
  const status=operatorActive?'PARKED · '+tag:routeActive?'DRIVE-BY AUTO QUOTES':mode==='towing'?'ARRIVING AT THE JOB':i===0?'PARKED · UNLOAD YOUR EQUIPMENT':i<=3?'PARKED · UNDERSTAND THE JOB':'PARKED · WORK & CREATE VALUE';
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
  const note=operatorActive?null:state?.annotation,callout=$('field-callout'),leader=$('field-leader');callout.hidden=!note;leader.toggleAttribute('hidden',!note);
  if(note){
   const w=canvas.clientWidth,h=canvas.clientHeight,mobile=w<=760;
   const labelWidth=mobile?208:230,x=Math.max(18,Math.min(w-labelWidth-18,note.x+28));
   // Phones: never let the callout rise into the chapter copy (short screens put the copy's bottom below 40%).
   const copyBottom=mobile?(document.querySelector('.official-tour .tour-copy')?.getBoundingClientRect().bottom??0)-canvas.getBoundingClientRect().top+12:0;
   const y=Math.max(h*(mobile?.40:.32),copyBottom,Math.min(h*.73,note.y-95));
   callout.style.left=x+'px';callout.style.top=y+'px';callout.querySelector('strong').textContent=note.title;callout.querySelector('span').textContent=note.detail;
   if(lastNote!==note.title){lastNote=note.title;revealDetails(callout.children,{delay:0});}
   leader.setAttribute('viewBox',`0 0 ${w} ${h}`);leader.querySelector('path').setAttribute('d',`M${note.x},${note.y} L${x+12},${y+43} L${x+labelWidth},${y+43}`);leader.querySelector('circle').setAttribute('cx',note.x);leader.querySelector('circle').setAttribute('cy',note.y);
  }else lastNote='';
  window.__officialJourneyState={p,index:i,local,mode,...state,targetProgress:clamp(readProgress())};
  lastP=p;
  if(motion.moving)request();
 }
 function request(){if(!frame)frame=requestAnimationFrame(draw);}
 addEventListener('resize',()=>{scene?.resize();request();});
 return {async preparePlayback({progress=readProgress(),signal}={}){
  if(!scene?.video)return null;
  await scene.retry();if(signal?.aborted)return null;pinPlayback(progress);scene.draw(p);request();
  return {video:scene.video,start:0,end:1,duration:scene.duration};
 },setPlaybackProgress:pinPlayback,setProgress(){request();},setActive(value){if(value&&!active)motion.snap(readProgress());active=value;scene?.setActive?.(value);request();},setPaused(value){paused=value;request();},setPalette(){scene?.setPalette(document.documentElement.dataset.palette);request();}};
}
