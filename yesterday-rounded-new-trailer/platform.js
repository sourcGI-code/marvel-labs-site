import {createRecordedScene} from './recorded-scene.js?v=7';
import {createOpeningFilm,filmPose,filmDuration} from './opening-film.js?v=16';
import {createScrollMotion} from './scroll-motion.js';
import {setAnimatedTitle,revealDetails} from './editorial-motion.js?v=5';
const clamp=v=>Math.max(0,Math.min(1,v));
// Owner decision 2026-10-23: no receiving/packaging/rack system on the site. The cargo film is
// stopped on the two-trailer display beat (cargo progress .50 = ~18 s of 36 s), before the camera
// turns to the rear bay. Scroll: p<.25 opening film, then DELIVERY_SPAN of the track plays cargo
// 0 -> CARGO_END at yesterday's pace, and the remainder holds the finished two-trailer view.
const CARGO_END=.50,DELIVERY_SPAN=.63;
const cargoProgress=p=>clamp((p-.25)/DELIVERY_SPAN)*CARGO_END;
const $=id=>document.getElementById(id);
const colors={charcoal:'#4dd8e8',ivory:'#356b50',burgundy:'#ff7866',midnight:'#d2ed70'};
export async function createPlatform(canvas,{readProgress,writeProgress,isActive,paused}){
 const host=canvas.parentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const livePreview=false /* live authoring is local-only */;
 let recorded,deliveryVisible=false;
 let p=readProgress(),active=isActive(),frame=0,auto=false,available=true,playRequest=0,state={},lastCopy='',previousP=p;
 let opening,cargo,livePromise,liveReady=false,liveError=false,prepareTimer=0,liveMode='',openedOnce=false;
 const motion=createScrollMotion(p);
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
    recorded=await createRecordedScene(canvas,{name:'cargo',onChange:request});
    recorded.draw(cargoProgress(p));liveReady=recorded.ready;request();return;
   }
   const [{createOpening},{createCargoSequence},{prepareScene}]=await Promise.all([import('./opening-scene.js?v=23'),import('./cargo-sequence.js?v=19'),import('./prepare-scene.js?v=2')]);
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
 function revealWhen(el,hidden){const entering=el.hidden&&!hidden;el.hidden=hidden;if(entering)revealDetails(el.id==='capacity-labels'?el.querySelectorAll('strong,span'):el.children,{delay:0});}
 function draw(){
  if(recorded){liveReady=recorded.ready;if(recorded.failed&&!liveReady){liveError=true;$('platform-status').textContent='The trailer film could not load. Refresh to try again.';}}
  const continuation=p>=.25,t=cargoProgress(p),pose=filmPose(clamp(p/.25));
  if(!auto)film.seek(p/.25);
  // Matching boundary images share the same frame fit. Hold that image until
  // delivery's requested frame is decoded; subsequent scrubbing stays in cargo.
  if(recorded)recorded.draw(t);
  if(!continuation)deliveryVisible=false;
  else if(liveReady&&(!recorded||recorded.atTarget))deliveryVisible=true;
  const filmOpacity=liveReady&&deliveryVisible?0:1;film.opacity(filmOpacity);
  if(recorded){recorded.setVisible(deliveryVisible||reduced.matches);recorded.video.style.opacity=deliveryVisible||reduced.matches?'1':'0';}
  host.classList.toggle('film-ready',film.ready&&!reduced.matches);
  if(active&&(p>=.12||reduced.matches||film.failed))ensureLive();
  $('platform-status').hidden=!liveError&&(p<.25||liveReady);
  if(!liveError&&!liveReady&&p>=.25)$('platform-status').textContent='Loading the trailer film';
  document.body.style.setProperty('--opening-mix',`${!livePreview?100:film.ready&&!reduced.matches?filmOpacity*100:0}%`);
  host.closest('.pin').classList.toggle('is-comparing',continuation);
  host.closest('.pin').classList.remove('is-focused');
  if(continuation&&!liveReady){film.seek(1);state={loading:true};return;}
  if(!continuation){
   if(liveReady&&(filmOpacity<1||!film.ready||reduced.matches)){
    if(recorded)state=recorded.draw(0);
    else{if(liveMode!=='opening')cargo.reset();state=opening.draw(reduced.matches?1:pose);}
    liveMode='opening';host.classList.add('scene-ready');
   }
   copy('THE AUTONOMOUS MICROFACTORY TRAILER','Your next trailer.<br><em>A factory inside.</em>','More than a place for your mowers and equipment. Your trailer turns grass, leaves, and food waste into products, creating a new source of income for your business with every product it produces.');
   $('platform-story').style.opacity='1';
   $('capacity-labels').hidden=true;$('capacity-summary').hidden=true;
  }else{
   opening?.draw(1,false);
   const progress=reduced.matches?(t<.32?.29:CARGO_END):t;
   state=recorded?recorded.draw(progress):cargo.draw(progress,canvas.clientWidth,canvas.clientHeight);liveMode='cargo';host.classList.add('scene-ready');
   const phase=t<.32?0:1;
   const words=[
    ['A SECOND ARRIVAL / 16 FT','A smaller footprint.<br><em>Delivered.</em>','The compact trailer arrives behind the Ford pickup. The 20 ft platform stays right where it is.'],
    ['PARK / UNHITCH / PULL AWAY','Set it down.<br><em>See the whole fleet.</em>','The support jack lowers. The pickup uncouples and pulls clear as the camera widens to both trailers.']
   ];copy(...words[phase]);$('platform-story').style.opacity='1';
   revealWhen($('capacity-labels'),state.split<.98);
   state.labels.forEach(label=>{const el=$('capacity-'+label.id),mobile=innerWidth<700;el.style.left=`${Math.max(60,Math.min(innerWidth-60,label.x))}px`;el.style.top=`${Math.max(225,Math.min(innerHeight-160,label.y-8))}px`;});
   revealWhen($('capacity-summary'),true);
  }
  $('hero-count').textContent=p<.25?'01 / 03':t<.32?'02 / 03':'03 / 03';
  $('hero-step').textContent=p<.25?'THE ARRIVAL':t<.32?'16 FT DELIVERY':'PARK & UNHITCH';
  $('platform-invitation').textContent=auto?'THE PLATFORM ARRIVES':p<.25?'SCROLL TO REVEAL ↓':t<CARGO_END?'SCROLL TO DELIVER ↓':'SCROLL FOR THE SPECS ↓';
  previousP=p;
 }
 function tick(time){frame=0;
  if(auto&&active&&!document.hidden){
   if(film.failed)stop();
   else if(film.playing||film.ended){p=film.ended?.25:Math.min(.25,film.time/filmDuration*.25);writeProgress(p);if(p>=.25)stop();}
  }
  if(!auto&&active)p=motion.step(readProgress(),time,paused||reduced.matches);
  if(active)draw();if((auto||motion.moving)&&active&&!frame)frame=requestAnimationFrame(tick);
 }
 function request(){if(available&&!frame)frame=requestAnimationFrame(tick);}
 function stop(){if(auto)motion.snap(p);auto=false;playRequest++;film.pause();}
 async function start(){if(auto||paused||reduced.matches||!active||p>=.25)return;openedOnce=true;auto=true;const current=++playRequest;film.seek(p/.25);request();const played=await film.play();if(current!==playRequest)return;if(!played)auto=false;request();}
 function manual(){stop();request();}
 document.addEventListener('stage:navigate',manual);
 addEventListener('wheel',manual,{passive:true});addEventListener('touchstart',manual,{passive:true});
 addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End','Space'].includes(e.code))manual();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 addEventListener('resize',()=>{opening?.resize(false);recorded?.resize();const resume=auto;if(film.resize()&&resume){stop();start();}request();});
 function palette(){const name=document.documentElement.dataset.palette;opening?.setPalette(name,false);cargo?.setPalette(colors[name]||colors.charcoal);request();}
 const api={setProgress(){request();},setActive(value){const entering=value&&!active;if(entering)p=motion.snap(readProgress());active=value;film.setActive(value);recorded?.setActive(value);if(!active){stop();document.body.style.setProperty('--opening-mix','0%');}request();if(entering&&!openedOnce&&p<.01)start();},setPaused(value){const wasPaused=paused;paused=value;if(value)stop();else if(wasPaused)start();request();},setPalette:palette,inspect:()=>({...state,playback:livePreview?'live':'recorded',webgl:livePreview,ready:liveReady,liveReady,liveLoading:!!livePromise&&!liveReady&&!liveError,p,targetProgress:readProgress(),cargoProgress:state.p,auto,continuation:p>=.25,...cargo?.inspect(),film:{ready:film.ready,failed:film.failed,playing:film.playing,time:film.time,kind:film.kind,opacity:Number(film.video.style.opacity)}})};
 window.__platform={state:api.inspect,seek(value){stop();p=motion.snap(clamp(value));writeProgress(p);api.setProgress(p);}};
 palette();request();
 const review=new URLSearchParams(location.search);
 if(review.has('live-preview')&&review.has('progress')){const at=Number(review.get('progress'));if(Number.isFinite(at))window.__platform.seek(at);}
 else if(p<.01)start();
 if(reduced.matches||film.failed||p>=.12)ensureLive();
 return api;
}
