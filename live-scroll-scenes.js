import {storyPose} from './scroll-story-mapping.js?v=2';
// Both scene rigs evaluate a pose from scroll progress. There is no playback clock.
export function installLiveScrollScenes(){
 const root=document.createElement('div');root.className='live-story-world';root.setAttribute('aria-hidden','true');document.body.prepend(root);
 const canvas=document.createElement('canvas'),fieldCanvas=document.createElement('canvas');root.append(canvas,fieldCanvas);canvas.style.visibility=fieldCanvas.style.visibility='hidden';
 const status=document.createElement('p');status.className='live-story-status';status.setAttribute('role','status');status.textContent='Preparing the trailer scene…';document.body.append(status);
 let opening,cargo,field,openingPromise,fieldPromise,failed=new Set(),frame=0,lastScene='';
 function request(){if(!frame)frame=requestAnimationFrame(draw);}
 async function ensureOpening(){
  if(openingPromise||failed.has('opening'))return;
  openingPromise=(async()=>{
   const [{createOpening},{createCargoSequence}]=await Promise.all([import('./opening-scene.js?v=30'),import('./cargo-sequence.js?v=27')]);
   opening=await createOpening(canvas,'lift',text=>{status.textContent=text;},{cinematic:true,transparent:false,deferRender:true});
   cargo=await createCargoSequence(opening.stage,opening.draw(1,false));request();
  })().catch(error=>{failed.add('opening');console.warn('Live opening could not load',error);request();});
 }
 async function ensureField(){
  if(fieldPromise||failed.has('field'))return;
  fieldPromise=(async()=>{const {createFieldWorkflow}=await import('./field-workflow-scene.js?v=44');field=await createFieldWorkflow(fieldCanvas);request();})().catch(error=>{failed.add('field');console.warn('Live working-day scene could not load',error);request();});
 }
 function draw(){
  frame=0;if(document.hidden)return;
  const section=document.body.dataset.activeScene,p=Number(document.body.dataset.activeProgress)||0,pose=storyPose(section,p);
  const yard=pose.scene==='opening'||pose.scene==='cargo',working=pose.scene==='field';
  root.style.visibility=yard||working?'visible':'hidden';canvas.style.visibility=yard?'visible':'hidden';fieldCanvas.style.visibility=working?'visible':'hidden';
  if(!yard&&!working){status.hidden=true;document.body.dataset.liveReady='false';return;}
  if(yard)ensureOpening();else ensureField();
  const ready=yard?!!cargo:!!field;document.body.dataset.liveReady=String(ready);status.hidden=ready;
  if(!ready){status.textContent=failed.has(yard?'opening':'field')?'The live scene could not load. Refresh to retry.':'Preparing the live trailer scene…';return;}
  if(document.body.classList.contains('motion-paused')&&lastScene===section)return;
  let state;
  if(yard){
   if(lastScene!==section)opening.resize(false);
   if(pose.scene==='opening'){cargo.reset();state=opening.draw(pose.p);}
   else{opening.draw(1,false);state=cargo.draw(pose.p,canvas.clientWidth,canvas.clientHeight);}
  }else{if(lastScene!==section)field.resize();state=field.draw(pose.p,false);}
  lastScene=section;
  window.__scrollStoryState={section,progress:p,pose,state,renderer:'live-webgl'};
 }
 document.addEventListener('story:progress',request);document.addEventListener('visibilitychange',request);
 addEventListener('resize',()=>{lastScene='';request();});
 new MutationObserver(request).observe(document.body,{attributes:true,attributeFilter:['class']});
 request();
}
