import {createRouteQuotes} from './route-quotes.js?v=v4-1030';
import {createRecordedScene} from './recorded-scene-hqworld4.js?v=v4-1030e';
const workflowStops=[0,.16,.34,.46,.58,1380/1919];
import {createVisionOverlay} from './vision-overlay.js?v=9';
import {createScrollMotion} from './scroll-motion.js';
import {setAnimatedTitle,revealTitle,revealDetails} from './editorial-motion.js?v=7';
const clamp=v=>Math.max(0,Math.min(1,v));
export async function createOfficialJourney(canvas,{readProgress,paused}){
 let scene;
 try{
  scene=document.body.dataset.sceneSource!=='accepted-films'&&false /* live authoring is local-only */
   ?await (await import('./field-workflow-scene.js?v=v4-1030')).createFieldWorkflow(canvas)
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
  ['YOUR EQUIPMENT · 10 OR 14 FT CARGO BAY','Your mowers<br><em>ride in the back.</em>','The ramp drops. Zero-turn, push mower and trimmers ride in the rear bay, like any equipment trailer. The factory sits sealed up front.','THE WORKING DAY','Haul → measure → quote → mow → make'],
  ['CAMERAS MEASURE THE YARD','Cameras measure.<br><em>You set the price.</em>','The trailer’s cameras turn the lawn, edging, hedges, beds and tree rings into a measured scope, so the estimate starts from numbers, not a guess.','CONCEPT DEMONSTRATION','A measured scope before you price'],
  ['RTK · SURVEY-GRADE GPS','Every measurement<br><em>pinned to the lot.</em>','Survey-grade GPS (RTK) ties each measurement to the property, so the scope still lines up the next time you pull up.','CONCEPT DEMONSTRATION','Site context you can return to'],
  ['AUTO QUOTE · YOU APPROVE IT','The survey becomes<br><em>a quote draft.</em>','The measured scope becomes an estimate and an email that shows the customer their yard before and after. Nothing goes out until you approve the price.','VISUAL DEMONSTRATION','No email is sent'],
  ['MOW & BAG THE CLIPPINGS','Mow like always.<br><em>Bag the clippings.</em>','Nothing changes about the mowing. The clippings you bag go into the hopper and become the factory’s next sink.','FOR YOUR BUSINESS','Mowing income + a share of every sink sold'],

 ];
 // Work chapter, second half (owner 14:51): two beats and the closing line, nothing else. They appear only
 // while the installed field timeline carries `operator` states (the film with the person); until that film is
 // installed the Work copy above stays. No spec callouts during the beats (empty key hides #tour-spec).
 const grassIn=['GRASS IN · THE HOPPER','Grass in.','Off the mower. The chute folds out of the factory wall, takes the bagged clippings, and the factory starts on a sink.','',''];
 const chuteShut=['GRASS IN · FACTORY RUNNING','Chute shut.<br><em>Back to the truck.</em>','The chute folds away. The enclosed factory makes the sink on its own while you get on with the day.','',''];
 const productOut=['PRODUCT OUT · BOXED SINK','Sink out.','Open the side hatch. A finished sink, boxed and ready to ship, rides out on the conveyor.','',''];
 const possibilities=['GRASS IN · PRODUCT OUT','Grass goes in.<br><em>Sinks come out.</em>','','',''];
 // How it works (owner 10-26): after the product comes out, a drop-off run to the post office, then the next job.
 const deliveryCaptions={
  A:['DROP IT OFF · THE UPS STORE','On your route.<br><em>No extra trip.</em>','Close up and drive. The boxed sink rides along to The UPS Store, on the way to the next job.','',''],
  B1:['AT THE UPS STORE','Hatch open.<br><em>Sink out.</em>','Parked at The UPS Store. The hatch opens and the boxed sink rolls out, packaged and ready to ship.','',''],
  B2:['HAND IT OVER','Into the store.<br><em>Onto the counter.</em>','Carry it in and hand it over. The clerk scans the box and it ships. You are back in the truck.','',''],
  B3:['MARVEL CREW APP','Dropped off.<br><em>Confirmed on your phone.</em>','Marvel Crew confirms the drop-off on your phone the moment the box is handed over. Nothing to write down.','',''],
  C:['BACK ON THE ROUTE','Shipped.<br><em>Next yard.</em>','The sink is on its way. You drive to the next job, where the next bag of clippings is waiting.','','']};
 const operatorCaptions=Object.fromEntries([
  ...['dismount','to bag','lift clippings','carry clippings','open chute','grass in','collect-grass','load-grass'].map(stage=>[stage,grassIn]),
  ...['close chute','to truck'].map(stage=>[stage,chuteShut]),
  ...['to hatch','at hatch','open hatch','product out','side-door','retrieve-product'].map(stage=>[stage,productOut]),
  ['hold',possibilities]
 ]);
 function draw(time){frame=0;if(!active)return;const next=readProgress();if(playbackTarget&&Math.abs(next-playbackTarget.read)<1e-8)p=motion.snap(playbackTarget.value);else{playbackTarget=null;p=motion.step(next,time,paused||reduceMotion.matches);}
  const state=scene?.draw(p,paused),workflowP=state?.workflowP??p*(1380/1919);
  const i=Math.min(4,workflowStops.findLastIndex(s=>workflowP>=s)),local=clamp((workflowP-workflowStops[i])/(workflowStops[i+1]-workflowStops[i]));
  const operator=state?.operator,operatorActive=!!operator?.active,operatorCopy=operatorActive&&operatorCaptions[operator.stage];
  const delivery=state?.segment==='delivery'?(state.delivery||{shot:'A'}):null,deliveryCopy=delivery&&deliveryCaptions[delivery.shot];
  const routeActive=!!state?.route?.active,pitchActive=!operatorActive&&!delivery&&(routeActive||workflowP<.07),captionKey=operatorCopy?'operator-'+operatorCopy[1]:deliveryCopy?'delivery-'+deliveryCopy[1]:pitchActive?-2:i;
  const [tag,title,copy,key,value]=operatorCopy||deliveryCopy||(pitchActive?captions[0]:captions[i]);
  const fact=$('route-fact');if(fact)fact.hidden=!pitchActive;
  if(captionKey!==lastCaption){
   const direction=p<lastP?-1:1;
   $('tour-kicker').textContent=tag;setAnimatedTitle($('tour-title'),title,{direction});$('tour-copy').textContent=copy;$('tour-copy').hidden=!copy;
   // The operator beats are the second half of chapter 5 (Work), so the count and the chapter nav stay on 05.
   const how=!!document.body.dataset.fieldLeadFrames,chapter=how?(operatorActive?0:delivery?1:i+2):operatorActive?4:i;
   $('tour-count').textContent=`0${chapter+1} / 0${how?7:5}`;$('tour-spec').hidden=!key;document.querySelector('#tour-spec dt').textContent=key;document.querySelector('#tour-spec dd').textContent=value;
   document.querySelectorAll('.tour-chapters li').forEach((el,index)=>{if(index===chapter)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
   if(lastCaption>=0)revealDetails(['tour-count','tour-kicker','tour-copy','tour-spec'].map($),{direction});
   lastCaption=captionKey;
  }
  vision.update(state,canvas.clientWidth,canvas.clientHeight);routeQuotes.update(state,canvas.clientWidth,canvas.clientHeight);
  pin.style.setProperty('--yard-reveal',state?.yardReveal||0);
  const mode=state?.mode||(p<.035?'towing':'parked');pin.dataset.fieldMode=mode;pin.dataset.fieldChapter=String(i);pin.dataset.interior=String(i>=5);
  pin.dataset.operator=String(operatorActive);
  const status=delivery?(delivery.shot==='C'?'BACK ON THE ROUTE':'DROP-OFF · THE UPS STORE'):operatorActive?tag:routeActive?'DRIVE-BY AUTO QUOTES':mode==='towing'?'ARRIVING AT THE JOB':i===0?'UNLOAD YOUR EQUIPMENT':i<=3?'MEASURE & QUOTE THE YARD':'MOW & COLLECT';
  if($('field-status').textContent!==status){$('field-status').textContent=status;revealDetails([$('field-status')],{delay:0});}
  document.querySelectorAll('.field-modes span').forEach((el,index)=>el.classList.toggle('active',index===(delivery||operatorActive?2:i===0?0:i<=3?1:2)));
  const quoteEntering=$('workflow-demo').hidden&&i===3;$('workflow-demo').hidden=i!==3;
  if(quoteEntering){revealTitle($('workflow-state'));revealDetails($('workflow-demo').querySelectorAll('p,li,#workflow-scope > div'),{delay:0});}
  const jobs=state?.vision?.jobs||[],scope=JSON.stringify(jobs);
  if(i===3&&scope!==lastScope){lastScope=scope;quoteScope.replaceChildren(...jobs.map(job=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=job.label;dd.textContent=job.value;row.append(dt,dd);return row;}));revealDetails(quoteScope.children);}
  // Native scroll positions round to pixels; keep exact chapter shortcuts on
  // their intended step even when the resulting fraction is slightly lower.
  const step=Math.min(3,Math.floor(local*4+1e-3));setAnimatedTitle($('workflow-state'),['Yard measured','Scope priced','Quote built','Email drafted'][step]);
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
