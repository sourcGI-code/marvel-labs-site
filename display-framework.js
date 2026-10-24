// Shared by the homepage, local editor and display overview.
export const displays = [
 {
  "id": "arrival",
  "section": "top",
  "label": "The arrival",
  "title": "#hero-title",
  "copy": "#hero-description",
  "clips": "01 + 02 + 03",
  "purpose": "Approach, yard view and unhitch along one reversible scroll timeline. Target: 16 ft arrives beside the parked 20 ft unit; MICROFACTORY sides, MARVEL LABS rear.",
  "group": "Homepage",
  "start": 0,
  "at": 0
 },
 {
  "id": "bay",
  "section": "inside",
  "label": "Inside the bay",
  "title": "#bay-title",
  "copy": "#bay-description",
  "clips": "04 + 05 + 06",
  "purpose": "The trailer exterior and rear cargo layout, with the front factory enclosed.",
  "group": "Homepage",
  "start": 0,
  "at": 0
 },
 {
  "id": "route",
  "section": "route",
  "label": "On the route",
  "title": "#route-title",
  "copy": "#route-description",
  "clips": "09 + 13 \u00b7 optional 10\u201312",
  "purpose": "Everyday equipment and collection, with vision, RTK and quote views along the same scroll timeline. Target: collected material travels up the ramp into the partition intake.",
  "group": "Homepage",
  "start": 0,
  "at": 0
 },
 {
  "id": "sizes",
  "section": "sizes",
  "label": "Size & numbers",
  "title": "#sizes-title",
  "copy": "#sizes-description",
  "clips": "07 + 08",
  "purpose": "Compare confirmed 16 ft and 20 ft dimensions, then change the sales and expense assumptions in the earnings calculator.",
  "group": "Homepage",
  "start": 0,
  "at": 0
 },
 {
  "id": "founding",
  "section": "founding",
  "label": "Founding pilot",
  "title": "#founding-title",
  "copy": "#founding-description",
  "clips": "17 + 18",
  "purpose": "Dark closing display with trailer size, mower loadout and route ZIP selector. Target shot: MARVEL LABS rear doors close. The current preview uses the newly branded GLB in an scroll-controlled 3D view.",
  "group": "Homepage",
  "start": 0,
  "at": 0
 }
];
const aliases={delivery:'arrival',unhitch:'arrival',cargo:'bay',overhead:'bay',receiving:'bay',equipment:'route',vision:'route',rtk:'route',quote:'route',work:'route',production:'route',packaging:'route',storage:'route',numbers:'sizes',contact:'founding'};
export const displayById=id=>displays.find(d=>d.id===(aliases[id]||id));
export const displayAt=(section,progress=0)=>displays.find(d=>d.section===section);
export function installDisplayFramework({stage,refresh=()=>{}}={}){
 let current='';let pending=false;
 function update(){
  pending=false;const line=innerHeight*.33;let active=displays[0];
  if(stage)active=displays.find(d=>d.section===document.body.dataset.activeScene)||active;
  else for(const d of displays){if(document.getElementById(d.section)?.getBoundingClientRect().top<=line)active=d;}
  if(active.id===current)return;current=active.id;document.body.dataset.activeDisplay=current;document.body.dataset.activeScene=active.section;
  for(const a of document.querySelectorAll('[data-display-target]')){if(displayById(a.dataset.displayTarget)?.id===current)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');}
  document.dispatchEvent(new CustomEvent('display:change',{detail:{id:current}}));
 }
 function navigate(id,{url=true,progress=id==='numbers'?.65:0}={}){
  const d=displayById(id);if(!d)return false;const target=document.getElementById(d.section);if(!target)return false;
  if(stage)stage.seekProgress(target,progress,{refresh:true});else target.scrollIntoView({behavior:'instant',block:'start'});update();refresh();
  if(url){const address=new URL(location.href);address.searchParams.set('display',id==='numbers'?'numbers':d.id);address.hash=d.section;history.replaceState(null,'',address);}return true;
 }
 document.addEventListener('display:navigate',e=>navigate(e.detail?.id,{progress:e.detail?.progress??0}));
 document.addEventListener('click',e=>{const a=e.target.closest('[data-display-target]');if(!a||e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;if(navigate(a.dataset.displayTarget))e.preventDefault();});
 addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(update);}},{passive:true});addEventListener('resize',update);
 const initial=displayById(new URLSearchParams(location.search).get('display'));
 if(initial)Promise.resolve(document.fonts?.ready).then(()=>requestAnimationFrame(()=>navigate(initial.id,{url:false})));
 update();return {navigate,update};
}
