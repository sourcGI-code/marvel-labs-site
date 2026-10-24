import {displays,displayById} from './display-framework.js?v=4';
import {createStage} from './atlas-stage.js';
import {installDisplayFramework} from './display-framework.js?v=4';
export function installCinema(){
 document.documentElement.classList.add('cinematic');document.body.dataset.experience='official';
 const lengths={top:280,inside:240,route:300,sizes:230,founding:140};
 for(const [id,length] of Object.entries(lengths))document.getElementById(id).dataset.scrollLength=length;
 const sizes=document.querySelector('#sizes'),workspace=document.createElement('div');workspace.className='cinema-workspace';
 const specs=document.createElement('div');specs.className='workspace-panel';specs.id='size-panel';specs.append(sizes.querySelector('.size-grid'),sizes.querySelector('.small-note'));
 const earnings=document.createElement('div');earnings.className='workspace-panel';earnings.id='earnings-panel';earnings.hidden=true;earnings.append(sizes.querySelector('#story'));
 workspace.append(specs,earnings);sizes.append(workspace);
 document.querySelector('#founding').append(document.querySelector('.site-footer'));
 for(const id of ['sizes','founding']){
  const host=document.createElement('div');host.className='new-model-stage';host.setAttribute('aria-hidden','true');host.innerHTML='<img src="assets/autonomous-trailer/low-ramp-v2/preview.webp?v=2" alt=""><div class="model-shade"></div>';document.getElementById(id).prepend(host);
 }
 const hud=document.createElement('div');hud.className='scene-controls scroll-hud';hud.innerHTML='<p id="scene-position">01 / 05 · THE ARRIVAL</p><span class="scroll-meter" aria-hidden="true"><i></i></span><span>SCROLL TO UNFOLD ↓</span>';document.body.append(hud);
 const stage=createStage();let frame=0,showroomStarted=false;
 function request(){if(!frame)frame=requestAnimationFrame(update);}
 const framework=installDisplayFramework({stage,refresh:request});
 function update(){
  frame=0;stage.update();framework.update();
  const d=displayById(document.body.dataset.activeDisplay)||displays[0],i=displays.indexOf(d),section=document.getElementById(d.section),p=stage.progress(section);
  document.body.dataset.activeProgress=p.toFixed(6);
  document.querySelectorAll('main>.display').forEach(s=>s.classList.toggle('cinema-active',s===section));
  hud.querySelector('p').textContent=`${String(i+1).padStart(2,'0')} / ${String(displays.length).padStart(2,'0')} · ${d.label.toUpperCase()}`;
  hud.querySelector('i').style.transform=`scaleX(${(i+p)/displays.length})`;
  const money=stage.progress(sizes)>=.48;specs.hidden=money;earnings.hidden=!money;specs.inert=money;earnings.inert=!money;
  if(!showroomStarted&&i>=3){showroomStarted=true;import('./trailer-showroom.js?v=8').then(m=>m.installTrailerShowroom()).catch(console.warn);}
  document.dispatchEvent(new CustomEvent('story:progress',{detail:{section:d.section,progress:p}}));
 }
 // All narrative transitions come from the scroll timeline. Business links are shortcuts.
 document.addEventListener('click',event=>{
  const a=event.target.closest('a[href^="#"]');if(!a||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const hash=a.getAttribute('href');let id=displays.find(d=>'#'+d.section===hash)?.id,p=0;
  if(hash==='#story'){id='sizes';p=.65;}
  if(['#contact','#inquiry-form'].includes(hash))id='founding';
  if(!id)return;event.preventDefault();framework.navigate(id,{progress:p});
 },true);
 function initial(){if(location.hash==='#story'||new URLSearchParams(location.search).get('display')==='numbers')framework.navigate('numbers',{url:false,progress:.65});request();}
 addEventListener('scroll',request,{passive:true});addEventListener('resize',request);addEventListener('hashchange',initial);
 Promise.resolve(document.fonts?.ready).then(()=>requestAnimationFrame(()=>requestAnimationFrame(initial)));update();
 return {stage,request};
}
