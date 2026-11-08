// The checkout owns the selected size. The shared Jet black preview can rotate
// independently, but cannot change the reservation or payment step.
const section=document.querySelector('section.reserve-stage');
if(section){
  const host=section.querySelector('.rs-3d');
  const image=section.querySelector('.rv-preview img');
  const caption=section.querySelector('.rv-preview figcaption');
  const status=section.querySelector('.rv-viewer-status');
  const retry=section.querySelector('.rv-viewer-retry');
  const compare=section.querySelector('[data-colour-comparison]');
  const frame=document.createElement('iframe');
  frame.className='rv-jetblack-frame';
  frame.title='Jet black trailer — drag to rotate and inspect';
  frame.setAttribute('allow','fullscreen');
  let size=section.dataset.open||section.querySelector('[name="size"]:checked')?.value||'20';
  let timeout;
  function setState(state){
    clearTimeout(timeout);section.dataset.viewer=state;
    section.classList.toggle('rs-live',state==='interactive');
    host.setAttribute('aria-busy',String(state==='loading'));
    status.hidden=state==='interactive';retry.hidden=state!=='image';
    status.querySelector('span').textContent=state==='loading'?'Loading the interactive Jet black preview…':'Jet black preview · Interactive view unavailable';
    if(state==='loading')timeout=setTimeout(()=>setState('image'),45000);
  }
  function showSize(next){
    if(!['16','20'].includes(next))return;
    size=next;section.dataset.size=size;
    image.src=`assets/trailer-realism-v2/jet-black-${size}.png`;
    image.alt=`${size} ft Marvel Labs trailer in matte Jet black with grey graphics`;
    caption.textContent=`${size} ft · Jet black · Matte · Grey graphics`;
    compare.href=`trailer-colours.html?colour=black&finish=matte&decal=grey&size=${size}`;
  }
  function load(){
    setState('loading');
    frame.src=`trailer-colours.html?embedded=1&colour=black&finish=matte&decal=grey&size=${size}&v=site-jetblack-v1`;
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='marvel:trailer-state'||event.data.size!==size)return;
    if(event.data.state==='ready')setState('interactive');
    else if(event.data.state==='error')setState('image');
    else if(event.data.state==='loading')setState('loading');
  });
  for(const type of ['rs:enter','rs:size'])section.addEventListener(type,event=>{
    if(!['16','20'].includes(event.detail)||event.detail===size||section.dataset.orderStep==='review')return;
    showSize(event.detail);setState('loading');
    frame.contentWindow?.postMessage({type:'marvel:trailer-size',size},location.origin);
  });
  frame.addEventListener('load',()=>frame.contentWindow?.postMessage({type:'marvel:trailer-size',size},location.origin));
  frame.addEventListener('error',()=>setState('image'));
  retry.addEventListener('click',load);
  showSize(size);host.append(frame);load();
}
