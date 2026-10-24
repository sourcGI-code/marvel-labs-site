import {createJourney, clamp, phase} from './journey-scene.js?v=16';
const $=id=>document.getElementById(id);
const duration=140;
const chapters=[
 {at:0,name:'Arrival',tag:'THE ARRIVAL',title:'Production.<br><em>In motion.</em>',copy:'The factory goes to the material. A new way to make, wherever the work takes you.'},
 {at:.06,name:'Platform',tag:'THE MOBILE PLATFORM',title:'Bring the factory<br><em>to the material.</em>',copy:'An enclosed production space, built into a trailer. Local inputs. Useful products. A platform that travels.'},
 {at:.13,name:'Two sizes',tag:'ONE PLATFORM / TWO FOOTPRINTS',title:'Same capability.<br><em>More room.</em>',copy:'20 ft and 16 ft. Both share the same seven-foot factory compartment. The difference is the cargo space behind it.'},
 {at:.22,name:'Layout',tag:'THE SEVEN-FOOT PARTITION',title:'A place to make.<br><em>Room to carry.</em>',copy:'A full-height wall separates the factory from the empty rear cargo bay. The side entry sits behind that wall.'},
 {at:.31,name:'Vision',tag:'PHYSICAL AI / SEE',title:'Understand<br><em>the surroundings.</em>',copy:'Camera vision helps the platform interpret the site. Illustrated detection volumes show how observations could inform a job.'},
 {at:.39,name:'RTK',tag:'PHYSICAL AI / LOCALIZE',title:'Know the place.<br><em>Plan the path.</em>',copy:'RTK positioning adds a location reference for the work. This route is a demonstration of the proposed workflow.'},
 {at:.47,name:'Quote',tag:'PHYSICAL AI / SIMPLIFY',title:'From site<br><em>to quote.</em>',copy:'Turn observations into an estimate, prepare a quote, and draft the customer email. A visual walkthrough of the intended automation.'},
 {at:.55,name:'Equipment',tag:'SAME TOOLS / DIFFERENT CARGO SPACE',title:'Room to<br><em>get to work.</em>',copy:'A zero-turn, push mower, and trimmers enter the cargo bay. The enclosed factory stays separate. Equipment and clearances are illustrative.'},
 {at:.65,name:'Biomass',tag:'THE BIOMASS LIBRARY',title:'Everyday inputs.<br><em>New possibilities.</em>',copy:'Grass. Seaweed. Wood. Coffee grounds. Exploring what the material around us could become.'},
 {at:.72,name:'Production',tag:'FROM MATERIAL TO OBJECT',title:'Made from<br><em>seaweed.</em>',copy:'A seaweed sink emerges through an exterior hatch in the front compartment. The production process remains enclosed.'},
 {at:.82,name:'Packaging',tag:'PROTECT / PREPARE',title:'Ready for<br><em>what’s next.</em>',copy:'Protective packaging forms around the finished sink. An exterior handling concept keeps the cargo area available.'},
 {at:.90,name:'Storage',tag:'MAKE / PACK / STORE',title:'Made. Packed.<br><em>Stored.</em>',copy:'The packaged product moves to a rack beside the trailer, ready for collection. This handling sequence is a concept for review.'},
 {at:.96,name:'Next',tag:'MARVEL LABS / MAKE IT LOCAL',title:'Small footprint.<br><em>New possibilities.</em>',copy:'One production platform. Two trailer sizes. Designed around the materials, tools, and work close to home.'}
];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let p=0,playing=false,ready=false,scene,last=0,frame=0,dirty=true,current=-1,renderState;
const labels=new Map();
const fmt=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
function maxScroll(){return Math.max(1,document.documentElement.scrollHeight-innerHeight);}
function syncScroll(){window.scrollTo({top:p*maxScroll(),behavior:'instant'});}
function requestDraw(){dirty=true;if(!frame)frame=requestAnimationFrame(tick);}
function setPlaying(value){playing=!!value&&ready;if(playing&&p>=1){p=0;syncScroll();}last=0;
 $('play').setAttribute('aria-label',playing?'Pause animation':'Play animation');$('play').querySelector('.play-icon').textContent=playing?'Ⅱ':'▶';$('play').querySelector('.play-label').textContent=playing?'Pause':'Play';
 $('mode').textContent=playing?'PLAYING THE JOURNEY':p>=1?'JOURNEY COMPLETE':'SCROLL OR SCRUB TO EXPLORE';requestDraw();}
function seek(value,{pause=true}={}){p=clamp(value);if(pause)setPlaying(false);syncScroll();requestDraw();}
function updateUI(){
 let index=chapters.findLastIndex(c=>p>=c.at);index=Math.max(index,0);const c=chapters[index];
 if(index!==current){current=index;
  $('chapter-number').textContent=`${String(index+1).padStart(2,'0')} / 13`;$('chapter-tag').textContent=c.tag;
  $('chapter-title').innerHTML=c.title;$('chapter-description').textContent=c.copy;
  $('story').classList.toggle('compact',index===4||index===12);document.body.dataset.chapter=c.name.toLowerCase();
  [...$('chapters').children].forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));$('chapter-select').value=String(index);
 }
 $('playhead').value=String(Math.round(p*1000));$('playhead').style.setProperty('--position',`${p*100}%`);$('playhead').setAttribute('aria-valuetext',`${c.name}, ${fmt(p*duration)} of ${fmt(duration)}`);
 $('time').textContent=`${fmt(p*duration)} / ${fmt(duration)}`;
 const next=chapters[index+1]?.at??1.02,fadeIn=phase(p,c.at,c.at+.004),fadeOut=1-phase(p,next-.004,next);
 $('story').style.opacity=String(index===0?fadeOut:Math.min(.22+.78*fadeIn,fadeOut));
 $('quote').hidden=index!==6;const step=Math.min(3,Math.floor(phase(p,.478,.546)*4));
 $('quote-title').textContent=['Site understood.','Estimate prepared.','Quote assembled.','Email drafted.'][step];
 document.querySelectorAll('.quote-steps span').forEach((n,i)=>n.classList.toggle('active',i<=step));
 $('estimate-row').style.opacity=step>=1?'1':'.2';$('email-preview').hidden=step<3;
 $('material-name').hidden=index!==8;$('material-name').querySelector('strong').textContent=({grass:'Grass',seaweed:'Seaweed',wood:'Wood',coffee:'Coffee grounds'})[renderState?.material]??'Grass';
 $('final-action').hidden=index!==12;
 const active=new Set();
 for(const a of renderState?.labels??[]){
  // Keep anchored callouts clear of the player and within the viewport.
  if(!a.visible||a.x<25||a.x>innerWidth-25||a.y<105||a.y>innerHeight-125)continue;
  if(innerWidth<650&&['wall','cargo','equipment'].includes(a.id))continue;
  active.add(a.id);let el=labels.get(a.id);
  if(!el){el=document.createElement('div');el.className=`anchor ${a.type}`;const title=document.createElement('span'),detail=document.createElement('small');title.className='label-title';title.textContent=a.title;detail.textContent=a.detail;el.append(title,detail);$('labels').append(el);labels.set(a.id,el);}
  el.hidden=false;const half=Math.min(el.offsetWidth/2,innerWidth/2-20);el.style.left=`${clamp(a.x,half+20,innerWidth-half-20)}px`;el.style.top=`${a.y}px`;
 }
 labels.forEach((el,id)=>el.hidden=!active.has(id));
}
function tick(now){frame=0;if(!ready)return;
 if(playing){if(last)p=clamp(p+Math.min(1,(now-last)/1000)/duration);last=now;dirty=true;syncScroll();if(p>=1)setPlaying(false);}
 if(dirty){renderState=scene.draw(p);updateUI();dirty=false;}
 if(playing)frame=requestAnimationFrame(tick);
}
chapters.forEach((c,i)=>{
 const button=document.createElement('button');button.type='button';button.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span>${c.name}`;button.setAttribute('aria-label',`Jump to ${c.name}`);button.disabled=true;button.addEventListener('click',()=>seek(c.at+.006));$('chapters').append(button);
 const option=document.createElement('option');option.value=String(i);option.textContent=`${i+1}. ${c.name}`;$('chapter-select').append(option);
});
$('play').addEventListener('click',()=>setPlaying(!playing));$('restart').addEventListener('click',()=>{seek(0);setPlaying(true);});
$('playhead').addEventListener('input',e=>seek(Number(e.target.value)/1000));
$('chapter-select').addEventListener('change',e=>seek(chapters[Number(e.target.value)].at+.006));
const params=new URLSearchParams(location.search);const preferred=params.get('palette');
if(['charcoal','ivory','burgundy','midnight'].includes(preferred))$('palette').value=preferred;
document.documentElement.dataset.palette=$('palette').value;
$('palette').addEventListener('change',e=>{const value=e.target.value;document.documentElement.dataset.palette=value;scene?.setPalette(value);const url=new URL(location.href);url.searchParams.set('palette',value);history.replaceState(null,'',url);requestDraw();});
function manual(){if(playing)setPlaying(false);}
addEventListener('wheel',manual,{passive:true});$('world').addEventListener('touchstart',manual,{passive:true});
addEventListener('scroll',()=>{if(ready&&!playing){p=clamp(scrollY/maxScroll());requestDraw();}},{passive:true});
addEventListener('keydown',e=>{
 if(e.target.closest('input,select,button,a'))return;
 if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}else if(e.key==='Escape')setPlaying(false);
 else if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End'].includes(e.key))manual();
});
addEventListener('resize',()=>{scene?.resize();syncScroll();requestDraw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
reduced.addEventListener('change',()=>{if(reduced.matches)setPlaying(false);});
function fail(error){console.error(error);ready=false;playing=false;$('loading').hidden=true;$('error').hidden=false;$('error-detail').textContent='The 3D assets could not be displayed. Reload the page, or view the still trailer layout below.';}
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('WebGL context lost'));});
window.__journey={seek,play:()=>setPlaying(true),pause:()=>setPlaying(false),state:()=>({ready,p,playing,chapter:chapters[current]?.name,...renderState,...scene?.inspect()})};
try{
 scene=await createJourney($('world'),status=>$('loading-status').textContent=status);
 scene.setPalette($('palette').value);ready=true;p=params.has('start')&&Number.isFinite(Number(params.get('start')))?clamp(Number(params.get('start'))):clamp(scrollY/maxScroll());syncScroll();
 document.querySelectorAll('.player button,.player select,.player input').forEach(el=>el.disabled=false);
 $('loading').hidden=true;setPlaying(!reduced.matches&&!params.has('paused'));
}catch(error){fail(error);}
