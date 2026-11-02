const root='assets/intro-realism-v1/';
const variants={baseline:{name:'Current lighting',label:'00 / CURRENT LIGHTING',description:'Reference: the current lighting and finish, rendered on the same updated package-access model for a direct comparison.'},soft:{name:'Clean graphite',label:'01 / CLEAN GRAPHITE',description:'Small manufactured edge radii, corrected panel shading, and broad softbox reflections across the graphite paint.'},automotive:{name:'Polished graphite',label:'02 / POLISHED GRAPHITE',description:'The same edge and panel refinements, with a glossier clear coat and longer strip reflections for an automotive finish.'}};
let variant='soft',frame='672',playing=false,revision=0;
const $=s=>document.querySelector(s),image=$('#scene-image'),video=$('#scene-video'),note=$('#media-note');
async function render(){
 const request=++revision,data=variants[variant];
 document.querySelectorAll('[data-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.variant===variant)));
 document.querySelectorAll('[data-frame]').forEach(b=>b.setAttribute('aria-pressed',String(!playing&&b.dataset.frame===frame)));
 $('#motion').setAttribute('aria-pressed',String(playing));$('#motion').textContent=playing?'Ⅱ Pause clip':'▶ Play short clip';
 $('#scene-label').textContent=data.label;$('#treatment-description').textContent=data.description;$('#after-label').textContent=data.name;
 $('#detail-after').src=root+variant+'-detail.webp';$('#detail-after').alt='Close-up: '+data.name;
 image.src=root+variant+'-'+frame+'.webp';image.alt=data.name+' — '+({'168':'approach','336':'side view','672':'trailer presentation'}[frame]);
 if(playing){
  const source=root+variant+'-motion.mp4';
  if(video.getAttribute('src')!==source){video.src=source;video.load();}
  video.hidden=false;image.hidden=true;note.textContent='1.6-second movement sample · 15 fps draft';
  try{await video.play();}catch(e){if(request===revision){playing=false;video.pause();video.hidden=true;image.hidden=false;$('#motion').setAttribute('aria-pressed','false');$('#motion').textContent='▶ Play short clip';note.textContent='Playback paused. Press Play to try again.';}}
 }else{video.pause();video.hidden=true;image.hidden=false;note.textContent='Still frame · the original camera and background';}
 const params=new URLSearchParams({look:variant,frame});history.replaceState(null,'',location.pathname+'?'+params);
}
document.querySelectorAll('[data-variant]').forEach(b=>b.addEventListener('click',()=>{variant=b.dataset.variant;render();}));
document.querySelectorAll('[data-frame]').forEach(b=>b.addEventListener('click',()=>{frame=b.dataset.frame;playing=false;render();}));
$('#motion').addEventListener('click',()=>{playing=!playing;render();});
function reveal(x){x=Math.max(0,Math.min(100,x));$('#compare').value=String(x);$('#before-layer').style.clipPath=`inset(0 ${100-x}% 0 0)`;$('#divider').style.left=x+'%';}
$('#compare').addEventListener('input',e=>reveal(Number(e.target.value)));
const comparison=$('.comparison');
function drag(e){const r=comparison.getBoundingClientRect();reveal((e.clientX-r.left)/r.width*100);}
comparison.addEventListener('pointerdown',e=>{if(e.button!==0)return;comparison.setPointerCapture(e.pointerId);drag(e);});
comparison.addEventListener('pointermove',e=>{if(comparison.hasPointerCapture(e.pointerId))drag(e);});
comparison.addEventListener('pointerup',e=>{if(comparison.hasPointerCapture(e.pointerId))comparison.releasePointerCapture(e.pointerId);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){playing=false;render();}});
const params=new URLSearchParams(location.search);if(variants[params.get('look')])variant=params.get('look');if(['168','336','672'].includes(params.get('frame')))frame=params.get('frame');render();
