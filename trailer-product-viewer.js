const section = document.querySelector('.trailer-showroom');
const models = {
  '16': {width:'7 ft',cargo:'9 ft 9½ in',price:'$44,999'},
  '20': {width:'8.5 ft',cargo:'13 ft 9½ in',price:'$49,999'},
};
const host = section.querySelector('.rs-3d');
const poster = section.querySelector('.showroom-poster img');
const status = section.querySelector('.viewer-status');
const lockButton = section.querySelector('.rs-lock');
new MutationObserver(()=>{lockButton.textContent=section.classList.contains('is-locked')?'Unlock view':'Lock view';}).observe(section,{attributes:true,attributeFilter:['class']});
const menu = document.querySelector('#showroom-menu');
const menuButton = document.querySelector('.menu-button');
function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}
menuButton.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));});
menu.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.showroom-header'))closeMenu();});

function selectSize(size, updateUrl=true){
  const model=models[size];if(!model)return;
  section.dataset.size=size;section.dataset.open=size;
  for(const el of document.querySelectorAll('[data-model-size]'))el.textContent=size;
  for(const key of ['width','cargo','price'])document.querySelector(`[data-model-${key}]`).textContent=model[key];
  for(const button of section.querySelectorAll('.rs-switch button'))button.setAttribute('aria-pressed',String(button.dataset.size===size));
  for(const link of document.querySelectorAll('[data-reserve]'))link.href=`reserve.html?size=${size}`;
  document.querySelector('[data-colours]').href=`trailer-colours.html?colour=black&size=${size}`;
  poster.src=`assets/trailer-realism-v2/jet-black-${size}.png`;
  poster.alt=`${size} ft Marvel Labs trailer design in matte Jet black with grey graphics`;
  host.setAttribute('aria-label',`Interactive ${size} ft Jet black trailer. Drag to rotate.`);
  document.title=`${size} ft × ${model.width} microfactory trailer — Marvel Labs`;
  if(updateUrl)history.replaceState(null,'',`trailer-${size}.html${location.search}`);
}
for(const button of section.querySelectorAll('.rs-switch button'))button.addEventListener('click',()=>{
  selectSize(button.dataset.size);
  section.dispatchEvent(new CustomEvent('rs:enter',{detail:button.dataset.size}));
});
section.addEventListener('rs:size',event=>selectSize(event.detail));
selectSize(section.dataset.size,false);

const tabs=[...section.querySelectorAll('[role=tab]')];
function selectTab(tab){
  for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;}
}
for(const tab of tabs){
  tab.addEventListener('click',()=>selectTab(tab));
  tab.addEventListener('keydown',event=>{
    const index=tabs.indexOf(tab);let next;
    if(event.key==='ArrowRight')next=tabs[(index+1)%tabs.length];
    if(event.key==='ArrowLeft')next=tabs[(index+tabs.length-1)%tabs.length];
    if(event.key==='Home')next=tabs[0];if(event.key==='End')next=tabs.at(-1);
    if(next){event.preventDefault();selectTab(next);next.focus({preventScroll:true});}
  });
}
const info=section.querySelector('.showroom-info');
const sizeInfo=()=>section.style.setProperty('--viewer-panel-height',`${info.getBoundingClientRect().height}px`);
new ResizeObserver(sizeInfo).observe(info);sizeInfo();

const controller=new AbortController();
let timeout;
function fallback(){
  clearTimeout(timeout);controller.abort();section.classList.remove('rs-live');section.dataset.viewer='image';host.setAttribute('aria-busy','false');
  status.textContent='3D view unavailable · Trailer design preview';
  for(const button of section.querySelectorAll('.showroom-tools button,.rs-back'))button.disabled=true;
}
timeout=setTimeout(fallback,30000);
import('./reserve-3d-jetblack.js?v=fullscreen-20261109').then(({startReservationViewer})=>{
  if(controller.signal.aborted)return;
  return startReservationViewer(section,{signal:controller.signal,onError:fallback,onReady(){
    if(controller.signal.aborted)return;
    clearTimeout(timeout);section.classList.add('rs-live');section.dataset.viewer='interactive';host.setAttribute('aria-busy','false');
    for(const button of section.querySelectorAll('.showroom-tools button,.rs-back'))button.disabled=false;
  }});
}).catch(fallback);
