import {DELIVERY_END,cargoProgress} from './intro-timing.js?v=1';
import {createRecordedScene} from './recorded-scene.js?v=18-oldstage4';
import {createOpeningFilm,filmPose,filmDuration} from './opening-film.js?v=26';
import {loadFilmSources} from './film-sources.js?v=3';
import {createArrivalReveal} from './arrival-reveal.js?v=6';
import {createScrollMotion} from './scroll-motion.js';
import {setAnimatedTitle,revealDetails} from './editorial-motion.js?v=7';
const clamp=v=>Math.max(0,Math.min(1,v));
const $=id=>document.getElementById(id);
const colors={charcoal:'#4dd8e8',ivory:'#356b50',burgundy:'#ff7866',midnight:'#d2ed70'};
export async function createPlatform(canvas,{readProgress,writeProgress,isActive,paused}){
 await loadFilmSources();
 const host=canvas.parentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const arrivalReveal=createArrivalReveal({reduced});
 const livePreview=document.body.dataset.sceneSource!=='accepted-films'&&false /* live authoring is local-only */;
 let recorded,deliveryVisible=false,lastMix='';
 let p=readProgress(),active=isActive(),frame=0,auto=false,autoStarted=false,available=true,playRequest=0,state={},lastCopy='',previousP=p;
 let opening,cargo,livePromise,liveReady=false,liveError=false,prepareTimer=0,liveMode='',openedOnce=false;
 const motion=createScrollMotion(p);
 // Reproject fleet labels during the short intro framing release, including paused seeks.
 host.addEventListener('hero-frame-change',request);
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
  $('hero-title').innerHTML=title; // Copy stays still; only its content changes at the old phase boundary.
 }
 // Exact old centered contain throughout; no price-card window or late fit/zoom.
 // The opening and delivery share one neutral stage and fixed background treatment.
 let windowKey='',frameWindow=null;
 function measureWindow(){return null;}
 document.fonts?.ready.then(()=>{windowKey='';request();});
 function revealWhen(el,hidden){const entering=el.hidden&&!hidden;el.hidden=hidden;if(entering)revealDetails(el.id==='capacity-labels'?el.querySelectorAll('strong,span'):el.children,{delay:0});}
 function draw(){
  if(recorded){liveReady=recorded.ready;if(recorded.failed&&!liveReady){liveError=true;$('platform-status').textContent='The trailer film could not load. Refresh to try again.';}}
  const continuation=p>.25+1e-6,t=cargoProgress(p),pose=filmPose(clamp(p/.25));
  if(!auto)film.seek(p/.25);
  // Keep the approved opening visible at the arrival chapter's exact stop.
  // Switch only once delivery advances and its requested frame is decoded.
  if(recorded){recorded.setFrameWindow?.(measureWindow());recorded.draw(t);}
  if(!continuation)deliveryVisible=false;
  else if(liveReady&&(!recorded||recorded.atTarget))deliveryVisible=true;
  const filmOpacity=liveReady&&deliveryVisible?0:1;film.opacity(filmOpacity);
  arrivalReveal.update({active,progress:p,time:film.presentedTime,failed:film.failed||liveError,ready:film.ready,deliveryVisible,live:livePreview,blocked:document.body.dataset.autoplayBlocked==='true'});
  if(recorded){recorded.setVisible(deliveryVisible||reduced.matches);recorded.video.style.opacity=deliveryVisible||reduced.matches?'1':'0';}
  host.classList.toggle('film-ready',film.ready&&!reduced.matches);
  if(active&&(p>=.12||reduced.matches||film.failed))ensureLive();
  $('platform-status').hidden=!liveError&&(!continuation||liveReady);
  if(!liveError&&!liveReady&&continuation)$('platform-status').textContent='Loading the trailer film';
  const mix=`${!livePreview?100:film.ready&&!reduced.matches?filmOpacity*100:0}%`;if(mix!==lastMix){lastMix=mix;document.body.style.setProperty('--opening-mix',mix);}
  host.closest('.pin').classList.toggle('is-comparing',continuation&&deliveryVisible);
  host.closest('.pin').classList.toggle('is-focused',false); // Rear/interior phases are outside this 18-second cut.
  host.closest('.pin').classList.toggle('is-opening',!continuation);
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
   if(t<11.52/18)copy('A SECOND ARRIVAL','A smaller footprint.<br><em>Delivered.</em>','The compact trailer arrives behind the Ford pickup. The 20 ft platform stays right where it is.');
   else copy('PARK / UNHITCH / PULL AWAY','Set it down.<br><em>See the whole fleet.</em>','The support jack lowers. The pickup uncouples and pulls clear as the camera widens to both trailers.');
   $('platform-story').style.opacity='1';
   host.closest('.pin').dataset.deliveryPhase=t<11.52/18?'arrival':'fleet';
   const nativeLabels=recorded?.video.dataset.timelinePlaying==='true'&&!recorded.video.seeking&&recorded.video.readyState>=2;
   const labels=state.labels||[],showLabels=state.split>=.98&&labels.length===2&&deliveryVisible&&(!recorded||recorded.atTarget||nativeLabels);
   $('capacity-labels').hidden=!showLabels;
   // No text reveal animation. Labels use the same neutral contain projection.
   const hostBox=host.getBoundingClientRect(),pinBox=host.closest('.pin').getBoundingClientRect();
   const sx=hostBox.width/(host.offsetWidth||hostBox.width),sy=hostBox.height/(host.offsetHeight||hostBox.height);
   for(const label of labels){
    const el=$('capacity-'+label.id);if(!el)continue;
    el.style.left=`${hostBox.left-pinBox.left+label.x*sx}px`;
    el.style.top=`${hostBox.top-pinBox.top+label.y*sy-12}px`;
   }
   $('capacity-summary').hidden=true;
   $('cargo-loadout').textContent='ZERO-TURN · PUSH MOWER · 3 WEED TRIMMERS';
  }
  $('hero-count').textContent=continuation&&t>=15/18?'02 / 02':'01 / 02';
  $('hero-step').textContent=continuation?(t>=14.4/18?'THE TWO SIZES':'THE DELIVERY'):'THE ARRIVAL';
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
 // With beat scrolling (body[data-beat-scroll]) the stepper owns wheel, touch and keys; navigation still stops it.
 const input=()=>{if(!document.body.dataset.beatScroll)manual();};
 addEventListener('wheel',input,{passive:true});addEventListener('touchstart',input,{passive:true});
 // iOS paints seeked frames only after a user gesture has played the element once (and Low Power Mode
 // loads nothing before that): unlock each film on the first touch so scroll-scrubbing shows frames.
 const unlocked=new WeakSet();
 function unlock(video){if(!video||unlocked.has(video)||video.dataset.timelinePlaying||!video.paused)return;unlocked.add(video);const played=video.play();video.pause();played?.catch?.(()=>{});}
 addEventListener('touchend',()=>{unlock(film.video);unlock(recorded?.video);request();},{passive:true});
 addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End','Space'].includes(e.code))input();});
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
 },setPlaybackProgress:pinPlayback,setProgress(){request();},setActive(value){const entering=value&&!active;if(entering)p=motion.snap(readProgress());active=value;film.setActive(value);recorded?.setActive(value);if(!active){stop();arrivalReveal.clear();document.body.style.setProperty('--opening-mix','0%');}request();if(entering&&!openedOnce&&p<.01)start();},setPaused(value){const wasPaused=paused;paused=value;if(value)stop();else if(wasPaused)start();request();},setPalette:palette,inspect:()=>({...state,playback:livePreview?'live':'recorded',webgl:livePreview,ready:liveReady,liveReady,liveLoading:!!livePromise&&!liveReady&&!liveError,p,targetProgress:readProgress(),cargoProgress:state.p,auto,arrivalQuiet:arrivalReveal.quiet,continuation:p>.25+1e-6,...cargo?.inspect(),film:{ready:film.ready,failed:film.failed,playing:film.playing,time:film.time,kind:film.kind,opacity:Number(film.video.style.opacity)}})};
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
