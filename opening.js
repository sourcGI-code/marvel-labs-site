import {createOpening} from './opening-scene.js?v=30';
import {duration,sceneProgress,timelineProgress} from './opening-timing.js?v=2';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const take=params.get('take')==='lift'?'lift':'through',clamp=v=>Math.max(0,Math.min(1,v));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let p=0,playing=false,ready=false,scene,frame=0,last=0,dirty=true,state;
const time=s=>`00:${Math.floor(s).toString().padStart(2,'0')}`;
const maxScroll=()=>Math.max(1,document.documentElement.scrollHeight-innerHeight);
const syncScroll=()=>window.scrollTo({top:p*maxScroll(),behavior:'instant'});
function requestDraw(){dirty=true;if(!frame)frame=requestAnimationFrame(tick);}
function setPlaying(value){playing=!!value&&ready;if(playing&&p>=1)p=0;last=playing?performance.now():0;syncScroll();$('play').setAttribute('aria-label',playing?'Pause animation':'Play animation');$('play').querySelector('.play-icon').textContent=playing?'Ⅱ':'▶';$('play').querySelector('.play-label').textContent=playing?'Pause':'Play';requestDraw();}
function seek(value){p=clamp(value);setPlaying(false);syncScroll();requestDraw();}
function update(){
 const pose=sceneProgress(p),beat=pose<.43?0:pose<.66?1:pose<.86?2:3;
 const copy=take==='lift'?[
  ['THE APPROACH','Straight<br><em>at you.</em>','The platform arrives head-on.'],
  ['CONTACT / CAMERA LIFT','A new<br><em>perspective.</em>','The impact carries the camera up and over.'],
  ['THE TRAILER REVEAL','Meet the<br><em>platform.</em>','The camera settles on the mobile platform.'],
  ['THE MOBILE PLATFORM','Production.<br><em>In motion.</em>','20 ft. An enclosed factory. Room for the work.']
 ]:[
  ['THE APPROACH','Straight<br><em>at you.</em>','The platform arrives head-on.'],
  ['THROUGH THE LENS','Through<br><em>the frame.</em>','The truck passes through the viewpoint.'],
  ['THE TRAILER REVEAL','Follow<br><em>what’s next.</em>','A sweep around the trailer reveals the platform.'],
  ['THE MOBILE PLATFORM','Production.<br><em>In motion.</em>','20 ft. An enclosed factory. Room for the work.']
 ];
 $('scene-name').textContent=copy[beat][0];$('opening-title').innerHTML=copy[beat][1];$('opening-caption').textContent=copy[beat][2];
 const hide=pose>.32&&pose<.72?Math.max(0,1-Math.min((pose-.32)/.07,(.72-pose)/.07)):1;
 $('opening-story').style.opacity=String(hide);
 $('occlusion').style.opacity=String(state.occlusion);
 $('playhead').value=String(Math.round(p*1000));$('playhead').style.setProperty('--position',`${p*100}%`);$('playhead').setAttribute('aria-valuetext',`${copy[beat][0]}, ${time(p*duration)} of ${time(duration)}`);$('time').textContent=`${time(p*duration)} / ${time(duration)}`;
 $('mode').textContent=playing?'PLAYING OPENING '+(take==='lift'?'B':'A'):p>=1?'OPENING COMPLETE':'SCROLL OR SCRUB TO EXPLORE';
 $('continue').hidden=pose<.94;
 const label=$('trailer-label');label.hidden=pose<.90;label.style.left=`${Math.max(150,Math.min(innerWidth-150,state.trailerLabel.x))}px`;label.style.top=`${state.trailerLabel.y}px`;
 document.querySelectorAll('#opening-chapters button').forEach((el,i)=>el.setAttribute('aria-current',String(beat===i)));
}
function tick(now){frame=0;if(!ready)return;if(playing){if(last)p=clamp(p+Math.max(0,(now-last)/1000)/duration);last=now;dirty=true;syncScroll();if(p>=1)setPlaying(false);}if(dirty){state=scene.draw(sceneProgress(p));update();dirty=false;}if(playing)frame=requestAnimationFrame(tick);}
$('take-'+take).setAttribute('aria-current','page');$('take-name').textContent='OPENING '+(take==='lift'?'B':'A');$('transition-label').textContent=take==='lift'?'Impact & lift':'Through the lens';
document.title=`Marvel Labs — ${take==='lift'?'Impact & lift':'Through the lens'}`;
if(['charcoal','ivory','burgundy','midnight'].includes(params.get('palette')))$('palette').value=params.get('palette');
function paletteLinks(){const name=$('palette').value;document.documentElement.dataset.palette=name;for(const key of ['through','lift'])$('take-'+key).href=`opening.html?take=${key}&palette=${name}`;for(const id of ['continue','full-journey'])$(id).href=`animation.html?start=0.13&palette=${name}`;}
paletteLinks();
$('palette').addEventListener('change',()=>{paletteLinks();scene?.setPalette($('palette').value);const url=new URL(location.href);url.searchParams.set('palette',$('palette').value);history.replaceState(null,'',url);requestDraw();});
$('play').addEventListener('click',()=>setPlaying(!playing));$('restart').addEventListener('click',()=>{seek(0);setPlaying(true);});$('playhead').addEventListener('input',e=>seek(Number(e.target.value)/1000));
document.querySelectorAll('#opening-chapters button').forEach(b=>b.addEventListener('click',()=>seek(timelineProgress(Number(b.dataset.at)))));
function manual(){if(playing)setPlaying(false);}
addEventListener('wheel',manual,{passive:true});$('world').addEventListener('touchstart',manual,{passive:true});addEventListener('scroll',()=>{if(ready&&!playing){p=clamp(scrollY/maxScroll());requestDraw();}},{passive:true});
addEventListener('keydown',e=>{if(e.target.closest('input,select,button,a'))return;if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}else if(e.key==='Escape')setPlaying(false);else if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key))manual();});
addEventListener('resize',()=>{scene?.resize();syncScroll();requestDraw();});document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});reduced.addEventListener('change',()=>{if(reduced.matches)setPlaying(false);});
function fail(error){console.error(error);ready=playing=false;$('loading').hidden=true;$('error').hidden=false;}
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('WebGL context lost'));});
window.__opening={seek,play:()=>setPlaying(true),pause:()=>setPlaying(false),state:()=>({ready,playing,...state,p,pose:sceneProgress(p),duration})};
try{scene=await createOpening($('world'),take,text=>$('loading-status').textContent=text);scene.setPalette($('palette').value);ready=true;document.querySelectorAll('.player button,.player input').forEach(el=>el.disabled=false);$('loading').hidden=true;p=clamp(scrollY/maxScroll());setPlaying(!reduced.matches&&!params.has('paused'));}catch(error){fail(error);}
