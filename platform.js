import {DELIVERY_END,cargoProgress} from './intro-timing.js?v=1';
import {createRecordedScene} from './recorded-scene.js?v=16';
import {createOpeningFilm,filmPose,filmDuration} from './opening-film.js?v=26';
import {loadFilmSources} from './film-sources.js?v=3';
import {createArrivalReveal} from './arrival-reveal.js?v=4';
import {createScrollMotion} from './scroll-motion.js';
import {setAnimatedTitle,revealDetails} from './editorial-motion.js?v=5';
const clamp=v=>Math.max(0,Math.min(1,v));
const $=id=>document.getElementById(id);
const colors={charcoal:'#4dd8e8',ivory:'#356b50',burgundy:'#ff7866',midnight:'#d2ed70'};
export async function createPlatform(canvas,{readProgress,writeProgress,isActive,paused}){
 await loadFilmSources();
 const host=canvas.parentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const arrivalReveal=createArrivalReveal({reduced});
 const livePreview=document.body.dataset.sceneSource!=='accepted-films'&&false /* live authoring is local-only */;
 let recorded,deliveryVisible=false;
 let p=readProgress(),active=isActive(),frame=0,auto=false,autoStarted=false,available=true,playRequest=0,state={},lastCopy='',previousP=p;
 let opening,cargo,livePromise,liveReady=false,liveError=false,prepareTimer=0,liveMode='',openedOnce=false;
 const motion=createScrollMotion(p);
 let playbackTarget=null;
 function pinPlayback(value){p=motion.snap(value);playbackTarget={value,read:readProgress()};request();}
 const film=createOpeningFilm(host,{reduced,enabled:active,onChange(){
  if(film.failed)ensureLive();
  else if(film.playing&&film.bufferedAhead>=1.8&&!prepareTimer&&!livePromise)prepareTimer=setTimeout(ensureLive,350);
  request();
 }});
 async function ensureLive(){
  if(!active)return;
  if(livePromise||liveError)return livePromise;
  clearTimeout(prepareTimer);
  livePromise=(async()=>{
   if(!livePreview){
    recorded=await createRecordedScene(canvas,{name:'cargo',maxSeconds:18,onChange:request});
    recorded.draw(cargoProgress(p));liveReady=recorded.ready;request();return;
   }
   const [{createOpening},{createCargoSequence},{prepareScene}]=await Promise.all([import('./opening-scene.js?v=30'),import('./cargo-sequence.js?v=27'),import('./prepare-scene.js?v=2')]);
   opening=await createOpening(canvas,'lift',()=>{},{cinematic:true,transparent:true,deferRender:true});
   cargo=await createCargoSequence(opening.stage,opening.draw(1,false));
   palette();await prepareScene(opening.stage);
   liveReady=true;request();
  })().catch(error=>{liveError=true;$('platform-status').textContent='The trailer film could not load. Refresh to try again.';$('platform-status').hidden=false;console.warn('Live trailer unavailable.',error.message);request();});
  return livePromise;
 }
 function copy(tag,title,description){
  if(tag===lastCopy)return;
  lastCopy=tag;const direction=p<previousP?-1:1;
  $('platform-tag').textContent=tag;$('hero-description').textContent=description;
  if(setAnimatedTitle($('hero-title'),title,{direction}))revealDetails([$('platform-tag'),$('hero-description'),$('hero-count'),$('hero-step')],{direction});
 }
 // The delivery hold frames both trailers in the gap the size cards leave (film-framing.js 'fit' keys).
 // Measured from layout offsets (no transforms), relative to the pin = the film host, once per viewport.
 let windowKey='',frameWindow=null;
 function measureWindow(){
  const specs=$('sizes'),key=`${innerWidth}x${innerHeight}:${document.fonts?.status}`;
  if(!specs||key===windowKey)return frameWindow;windowKey=key;
  const pin=host.closest('.pin'),hidden=specs.hidden;
  if(hidden){specs.style.visibility='hidden';specs.hidden=false;}
  // The headline's bottom in its .is-comparing layout (centred, 2 lines), derived from the CSS formula so it
  // does not depend on the class at measuring time: top 15% + eyebrow + 2 x clamp(34px,3.4vw,52px) x 1.05.
  const storyBox=()=>{const title=Math.min(52,Math.max(34,innerWidth*.034));return {y1:pin.clientHeight*.15+30+title*2.1};};
  const box=el=>{let x=0,y=0,n=el;while(n&&n!==pin){x+=n.offsetLeft;y+=n.offsetTop;n=n.offsetParent;}return el&&el.offsetHeight&&getComputedStyle(el).display!=='none'?{x0:x,y0:y,x1:x+el.offsetWidth,y1:y+el.offsetHeight}:null;};
  const big=box(specs.querySelector('.delivery-size-20')),story=storyBox(),small=box(specs.querySelector('.delivery-size-16')),strip=box(specs.querySelector('.delivery-earnings')),line=box(specs.querySelector('.delivery-loadout')),note=box(specs.querySelector('.delivery-price-note'));
  if(hidden){specs.hidden=true;specs.style.visibility='';}
  let rect=null;
  if(big&&small&&strip){
   const w=pin.clientWidth;
   rect=innerWidth<=760
    ?{x0:12,x1:w-12,y0:Math.max(big.y1,small.y1,note?note.y1:0)+8,y1:strip.y0-8}
    :{x0:big.x1+18,x1:small.x0-18,y0:Math.max(line?line.y1+14:story.y1+14,Math.min(big.y0,small.y0)),y1:strip.y0-14};
   if(rect.x1-rect.x0<120||rect.y1-rect.y0<80)rect=null;
  }
  return frameWindow=rect;
 }
 document.fonts?.ready.then(()=>{windowKey='';request();});
 function revealWhen(el,hidden){const entering=el.hidden&&!hidden;el.hidden=hidden;if(entering)revealDetails(el.id==='capacity-labels'?el.querySelectorAll('strong,span'):el.children,{delay:0});}
 function draw(){
  if(recorded){liveReady=recorded.ready;if(recorded.failed&&!liveReady){liveError=true;$('platform-status').textContent='The trailer film could not load. Refresh to try again.';}}
  const continuation=p>=.25,t=cargoProgress(p),pose=filmPose(clamp(p/.25));
  if(!auto)film.seek(p/.25);
  // Matching boundary images share the same frame fit. Hold that image until
  // delivery's requested frame is decoded; subsequent scrubbing stays in cargo.
  if(recorded){recorded.setFrameWindow?.(measureWindow());recorded.draw(t);}
  if(!continuation)deliveryVisible=false;
  else if(liveReady&&(!recorded||recorded.atTarget))deliveryVisible=true;
  const filmOpacity=liveReady&&deliveryVisible?0:1;film.opacity(filmOpacity);
  arrivalReveal.update({active,progress:p,time:film.presentedTime,failed:film.failed||liveError,ready:film.ready,deliveryVisible,live:livePreview,blocked:document.body.dataset.autoplayBlocked==='true'});
  if(recorded){recorded.setVisible(deliveryVisible||reduced.matches);recorded.video.style.opacity=deliveryVisible||reduced.matches?'1':'0';}
  host.classList.toggle('film-ready',film.ready&&!reduced.matches);
  if(active&&(p>=.12||reduced.matches||film.failed))ensureLive();
  $('platform-status').hidden=!liveError&&(p<.25||liveReady);
  if(!liveError&&!liveReady&&p>=.25)$('platform-status').textContent='Loading the trailer film';
  document.body.style.setProperty('--opening-mix',`${!livePreview?100:film.ready&&!reduced.matches?filmOpacity*100:0}%`);
  host.closest('.pin').classList.toggle('is-comparing',continuation&&t>=13/18);
  host.closest('.pin').classList.toggle('is-focused',continuation&&t>=.50);
  host.closest('.pin').classList.toggle('is-opening',!continuation);
  const specs=$('sizes');
  if(specs?.classList.contains('delivery-specs')){specs.hidden=!(continuation&&liveReady&&t>=13/18);specs.inert=specs.hidden;}
  if(continuation&&!liveReady){film.seek(1);state={loading:true};return;}
  if(!continuation){
   if(liveReady&&(filmOpacity<1||!film.ready||reduced.matches)){
    if(recorded)state=recorded.draw(0);
    else{if(liveMode!=='opening')cargo.reset();state=opening.draw(reduced.matches?1:pose);}
    // Recorded films: the poster stays until the opening has a decodable frame (phones that refused autoplay).
    liveMode='opening';if(!recorded||reduced.matches||film.ready)host.classList.add('scene-ready');
   }
   copy('THE AUTONOMOUS MICROFACTORY TRAILER','Your next trailer.<br><em>A factory inside.</em>','More than a place for your mowers and equipment. Your trailer turns grass, leaves, and food waste into products, creating a new source of income for your business with every product it produces.');
   $('platform-story').style.opacity='1';
   $('capacity-labels').hidden=true;$('capacity-summary').hidden=true;
  }else{
   opening?.draw(1,false);
   const progress=t;
   state=recorded?recorded.draw(progress):cargo.draw(progress*(540/1079),canvas.clientWidth,canvas.clientHeight);liveMode='cargo';host.classList.add('scene-ready');
   if(t>=15/18)copy('A SECOND ARRIVAL','A smaller footprint.<br><em>Delivered.</em>','Your equipment. Your footprint. Choose the 16 ft or 20 ft trailer, with your tools on board and an 8 ft factory behind the wall.');
   else copy('THE AUTONOMOUS MICROFACTORY TRAILER','Your next trailer.<br><em>A factory inside.</em>','More than a place for your mowers and equipment. Your trailer turns grass, leaves, and food waste into products, creating a new source of income for your business with every product it produces.');
   $('platform-story').style.opacity='1';
   $('capacity-labels').hidden=true;
   state.labels.forEach(label=>{const el=$('capacity-'+label.id),mobile=innerWidth<700;el.style.left=`${Math.max(60,Math.min(innerWidth-60,label.x))}px`;el.style.top=`${Math.max(225,Math.min(innerHeight-160,label.y-8))}px`;});
   $('capacity-summary').hidden=true;
   $('cargo-loadout').textContent='ZERO-TURN · PUSH MOWER · 3 WEED TRIMMERS';
  }
  $('hero-count').textContent=continuation&&t>=15/18?'02 / 02':'01 / 02';
  $('hero-step').textContent=continuation&&t>=15/18?'THE DELIVERY':'THE ARRIVAL';
  $('platform-invitation').textContent=auto?'THE PLATFORM ARRIVES':p<.25?'SCROLL TO REVEAL ↓':'SCROLL TO CONTINUE ↓';
  previousP=p;
 }
 function tick(time){frame=0;
  if(auto&&active&&!document.hidden){
   if(film.failed)stop();
   // A seek to the end also reports ended; only playback that really started may advance the page.
   else if(film.playing||(autoStarted&&film.ended)){p=film.ended?.25:Math.min(.25,film.time/filmDuration*.25);writeProgress(p);if(p>=.25)stop();}
  }
  if(!auto&&active){const next=readProgress();if(playbackTarget&&Math.abs(next-playbackTarget.read)<1e-8)p=motion.snap(playbackTarget.value);else{playbackTarget=null;p=motion.step(next,time,paused||reduced.matches);}}
  if(active)draw();if((auto||motion.moving)&&active&&!frame)frame=requestAnimationFrame(tick);
 }
 function request(){if(available&&!frame)frame=requestAnimationFrame(tick);}
 function stop(){if(auto)motion.snap(p);auto=false;autoStarted=false;playRequest++;film.pause();}
 async function start(){if(document.body.dataset.scrollOnly==='true'||auto||paused||reduced.matches||!active||p>=.25)return;openedOnce=true;auto=true;const current=++playRequest;film.seek(p/.25);request();const played=await film.play();if(current!==playRequest)return;if(!played)auto=false;else autoStarted=true;request();}
 function manual(){stop();request();}
 document.addEventListener('stage:navigate',manual);
 addEventListener('wheel',manual,{passive:true});addEventListener('touchstart',manual,{passive:true});
 // iOS paints seeked frames only after a user gesture has played the element once (and Low Power Mode
 // loads nothing before that): unlock each film on the first touch so scroll-scrubbing shows frames.
 const unlocked=new WeakSet();
 function unlock(video){if(!video||unlocked.has(video)||video.dataset.timelinePlaying||!video.paused)return;unlocked.add(video);const played=video.play();video.pause();played?.catch?.(()=>{});}
 addEventListener('touchend',()=>{unlock(film.video);unlock(recorded?.video);request();},{passive:true});
 addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End','Space'].includes(e.code))manual();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 addEventListener('resize',()=>{windowKey='';opening?.resize(false);recorded?.resize();const resume=auto;if(film.resize()&&resume){stop();start();}request();});
 function palette(){const name=document.documentElement.dataset.palette;opening?.setPalette(name,false);cargo?.setPalette(colors[name]||colors.charcoal);request();}
 const api={async preparePlayback({progress=readProgress(),signal}={}){
  stop();
  // The final scroll interval holds the delivery frame. Play there replays the intro.
  if(progress>=DELIVERY_END-1e-6){progress=0;writeProgress(0);}
  pinPlayback(progress);
  if(p<.25){film.retry();film.seek(p/.25);draw();return {video:film.video,start:0,end:.25,duration:filmDuration};}
  await ensureLive();if(!recorded)return null;
  await recorded.retry();if(signal?.aborted)return null;liveError=recorded.failed;
  recorded.draw(cargoProgress(p));draw();
  return {video:recorded.video,start:.25,end:DELIVERY_END,duration:recorded.duration,terminal:true};
 },setPlaybackProgress:pinPlayback,setProgress(){request();},setActive(value){const entering=value&&!active;if(entering)p=motion.snap(readProgress());active=value;film.setActive(value);recorded?.setActive(value);if(!active){stop();arrivalReveal.clear();document.body.style.setProperty('--opening-mix','0%');}request();if(entering&&!openedOnce&&p<.01)start();},setPaused(value){const wasPaused=paused;paused=value;if(value)stop();else if(wasPaused)start();request();},setPalette:palette,inspect:()=>({...state,playback:livePreview?'live':'recorded',webgl:livePreview,ready:liveReady,liveReady,liveLoading:!!livePromise&&!liveReady&&!liveError,p,targetProgress:readProgress(),cargoProgress:state.p,auto,arrivalQuiet:arrivalReveal.quiet,continuation:p>=.25,...cargo?.inspect(),film:{ready:film.ready,failed:film.failed,playing:film.playing,time:film.time,kind:film.kind,opacity:Number(film.video.style.opacity)}})};
 window.__platform={state:api.inspect,seek(value){stop();p=motion.snap(clamp(value));writeProgress(p);api.setProgress(p);}};
 palette();request();
 const review=new URLSearchParams(location.search);
 if(review.get('review')==='bay'){
  const url=new URL(location.href);url.searchParams.delete('review');history.replaceState(null,'',url);
  window.__platform.seek(0);
 }
 else if(review.has('live-preview')&&review.has('progress')){const at=Number(review.get('progress'));if(Number.isFinite(at))window.__platform.seek(at);}
 else if(p<.01)start();
 if(reduced.matches||film.failed||p>=.12)ensureLive();
 return api;
}
