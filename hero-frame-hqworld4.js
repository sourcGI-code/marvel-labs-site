import {introFilmKind} from './film-sources-hqworld4.js?v=workday-hd-20261122';
// Preview only. Preserve the original glide over one genuinely expanded movie.
// Restore the original right/left glide over the unchanged HQ
// films. Projection is centered CONTAIN; there is no arrival zoom or tail dip.
const GAP=36,EDGE=24,FPS=30,SLIDE_IN=1.8,SLIDE_OUT=2.7,RELEASE_MS=900;
// Phones (owner 11-20: "positioning of the trailer is too the left too much on mobile"). The portrait film frames
// the trailer against its left edge, and the cover crop cut a further strip off that side, so the nose was clipped
// with empty floor to the right. Once the truck has passed the camera, the film is drawn from its own left edge and
// enlarged (mobile-layout.css reads --phone-film-x / --phone-film-zoom; --phone-trailer-zoom there says how much and
// on which screens): the trailer sits in the middle and is larger. Times are on the ten-second authoring clock
// (frames 124-151 of the 14 s phone film, while the trailer sweeps across the whole frame and hides the move).
// recorded-scene-hqworld4.js starts the two-trailer film in the same place and eases back as its camera pulls away.
const PHONE_CENTER_FROM=1.476,PHONE_CENTER_OVER=.32;
export const phoneTrailerWeight=t=>heroEase((t-PHONE_CENTER_FROM)/PHONE_CENTER_OVER);
const INTRO_TAG='THE AUTONOMOUS MICROFACTORY TRAILER';
const clamp=v=>Math.max(0,Math.min(1,v));
// Framing is authored on a ten-second clock; the delivery export runs for 14.
// A film that carries a reversed copy for scrolling back is twice as long as the film itself:
// opening-film-hqworld4.js states the film's own length and where the copy starts on the element.
const filmSeconds=video=>{const own=Number(video?.dataset?.filmDuration);return own>0?own:Number.isFinite(video?.duration)&&video.duration>0?video.duration:10;};
const rewinding=video=>{const start=Number(video?.dataset?.rewindStart);return start>0&&(video.currentTime||0)>=start;};
export const heroMediaScale=video=>10/filmSeconds(video);
export const heroMediaTime=video=>{const t=video?.currentTime||0;return (rewinding(video)?Math.max(0,2*Number(video.dataset.rewindStart)-t):t)*heroMediaScale(video);};
export const heroEase=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};

export function projectHeroActor(frame,{cx,cy,filmWidth,filmHeight},shift=0,scale=1){
 return {left:cx+shift+scale*(frame.l-.5)*filmWidth,right:cx+shift+scale*(frame.r-.5)*filmWidth,
  top:cy+scale*(frame.t-.5)*filmHeight,bottom:cy+scale*(frame.b-.5)*filmHeight};
}

// Pure planner: geometry tests use the same code as the actual page.
export function createHeroGlidePlan({frames,timing={},viewportWidth,cw,ch,cx,cy,copyRight,rects}){
 if(!frames?.length||!rects?.length||!(cw>0&&ch>0))return null;
 const clearFrom=timing.clearFrom??1.9,inLatest=timing.inLatest??1.15,inEarliest=timing.inEarliest??.5,outEarliest=timing.outEarliest??7.05;
 const filmWidth=Math.min(cw,ch*1.6),filmHeight=filmWidth/1.6,projection={cx,cy,filmWidth,filmHeight};
 const last=frames.length-1,firstSide=Math.round(clearFrom*FPS),lastSide=Math.min(last,Math.round(outEarliest*FPS));
 function needed(index,scale=1){
  const actor=projectHeroActor(frames[index],projection,0,scale);
  let result=0;
  for(const rect of rects){
   if(rect.bottom<=actor.top||rect.top>=actor.bottom)continue;
   result=Math.max(result,rect.right+GAP-actor.left);
  }
  return Math.max(0,result);
 }
 let L=1,R=0;
 for(let i=firstSide;i<=lastSide;i++){L=Math.min(L,frames[i].l);R=Math.max(R,Math.min(frames[i].r,.78));}
 const room=viewportWidth-EDGE-(copyRight+GAP);
 const S=Math.max(.55,Math.min(1,room/Math.max(1,(R-L)*filmWidth)));
 let need=0;
 for(let i=firstSide;i<=lastSide;i++)need=Math.max(need,needed(i,S));
 const rig=Math.max(0,copyRight+(viewportWidth-copyRight)/2-(cx+S*((L+R)/2-.5)*filmWidth),need);
 // A centered endpoint is preferred. Keep only clearance required by actual
 // vertically intersecting text; a wide headline above the trailer adds none.
 let trailer=0;
 for(let i=Math.round(9*FPS);i<=last;i++)trailer=Math.max(trailer,needed(i,1));
 const weight=(t,a,o)=>t<a?0:t<o?heroEase((t-a)/SLIDE_IN):1-heroEase((t-o)/SLIDE_OUT);
 const scaleAt=(t,a,o)=>1+(S-1)*weight(t,a,o);
 const shiftAt=(t,a,o)=>t<a?0:t<o?rig*heroEase((t-a)/SLIDE_IN):rig+(trailer-rig)*heroEase((t-o)/SLIDE_OUT);
 const holds=(a,o,from,to)=>{
  for(let i=Math.round(from*FPS);i<=Math.min(last,Math.round(to*FPS));i++){
   const t=i/FPS;
   if(shiftAt(t,a,o)<needed(i,scaleAt(t,a,o))-1)return false;
  }
  return true;
 };
 let inStart=inLatest;
 while(inStart>inEarliest+1e-8&&!holds(inStart,99,clearFrom,inStart+SLIDE_IN))inStart=Math.max(inEarliest,Math.round((inStart-.05)*100)/100);
 let outStart=outEarliest;
 const lastOutStart=10-SLIDE_OUT;
 while(outStart<lastOutStart-1e-8&&!holds(inStart,outStart,outStart,10))outStart=Math.min(lastOutStart,Math.round((outStart+.05)*100)/100);
 return {rig,trailer,S,inStart,outStart,ch,projection,rects,
  at:t=>shiftAt(Math.max(0,Math.min(10,t)),inStart,outStart),
  sc:t=>scaleAt(Math.max(0,Math.min(10,t)),inStart,outStart),needed,
  clearsSide:holds(inStart,outStart,clearFrom,outStart),clearsReturn:holds(inStart,outStart,outStart,10)};
}

export function visibleHeroTextRects(story){
 const rects=[],seen=new Set();
 const append=rect=>{
  if(!(rect.width>0&&rect.height>0))return;
  const key=[rect.left,rect.top,rect.right,rect.bottom].map(v=>v.toFixed(3)).join();
  if(seen.has(key))return;seen.add(key);
  rects.push({left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom});
 };
 const visible=el=>{const s=getComputedStyle(el);return !el.closest('[hidden]')&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0;};
 for(const el of story.querySelectorAll('#platform-tag,#hero-title,#hero-description,small')){
  if(!visible(el))continue;
  const range=document.createRange();range.selectNodeContents(el);
  for(const rect of range.getClientRects())append(rect);
  range.detach?.();
 }
 for(const el of story.querySelectorAll('.offer-actions a'))if(visible(el))append(el.getBoundingClientRect());
 return rects;
}

// Match the old CSS handoff easing, with the same curve for the edge blend.
export function heroReleaseEase(progress){
 const p=clamp(progress);if(p===0||p===1)return p;
 let low=0,high=1,t=p;
 for(let i=0;i<18;i++){const x=3*(1-t)*(1-t)*t*.2+3*(1-t)*t*t*.2+t*t*t;if(x<p)low=t;else high=t;t=(low+high)/2;}
 return 3*(1-t)*(1-t)*t*.7+3*(1-t)*t*t+t*t*t;
}

export async function installHeroFrame(){
 const root=document.documentElement,host=document.getElementById('hero-visual'),story=document.getElementById('platform-story'),track=document.getElementById('top');
 if(!host||!story||!track)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let data=null;
 try{const response=await fetch(new URL('hero-framing-fuller-graphite-v1/desktop-frame.json?v=fuller-graphite-intro-v1',import.meta.url));if(response.ok)data=await response.json();}catch{}
 let plan=null,pendingBuild=true,lastTranslate='',lastScale='';
 let visual={shift:0,scale:1},wasComparing=false,release=null,releaseStart=0,releaseFrom=null,phoneZoom=1,lastPhone='';
 let anim=null,animFrom=0,animRate=1,animPlan=null,checkedAt=0,est=null,estWall=0,lastDecodedTime=0;
 const comparing=()=>!!host.closest('.pin')?.classList.contains('is-comparing');
 function edges(shift,scale){
  const moved=Math.abs(visual.shift-shift)>1e-8||Math.abs(visual.scale-scale)>1e-8;
  visual={shift,scale};
  if(wasComparing&&moved)host.dispatchEvent(new Event('hero-frame-change'));
 }
 function set(shift=0,scale=1){
  const x=Math.max(0,Math.round(shift*100)/100),s=Math.round(scale*10000)/10000;
  const translate=x?x+'px 0':'',scaleValue=Math.abs(s-1)<.00005?'':String(s);
  if(translate!==lastTranslate){lastTranslate=translate;host.style.translate=translate;}
  if(scaleValue!==lastScale){lastScale=scaleValue;host.style.scale=scaleValue;}
  edges(x,s);
 }
 function stopGlide(){if(anim){anim.cancel();anim=null;}animPlan=null;}
 function stopRelease(){if(release?.cancel)release.cancel();release=null;releaseFrom=null;}
 function build(){
  if(introFilmKind()==='mobile'){plan=null;pendingBuild=true;return;}
  if(!data||reduced.matches){plan=null;pendingBuild=false;return;}
  // The same nodes carry delivery copy. Never measure that copy for the intro.
  if(comparing()||parseFloat(track.dataset.sceneProgress||'0')>=.25-1e-4||document.getElementById('platform-tag')?.textContent.trim()!==INTRO_TAG){pendingBuild=true;return;}
  const rects=visibleHeroTextRects(story);if(!rects.length){pendingBuild=true;return;}
  const pin=host.parentElement.getBoundingClientRect(),cw=host.offsetWidth||innerWidth,ch=host.offsetHeight||innerHeight;
  const cx=pin.left+(host.offsetLeft||0)+cw/2,cy=pin.top+(host.offsetTop||0)+ch/2;
  plan=createHeroGlidePlan({frames:data.frames,timing:data.timing,viewportWidth:innerWidth,cw,ch,cx,cy,
   copyRight:Math.max(...rects.map(rect=>rect.right)),rects});
  pendingBuild=false;
  if(plan)root.dataset.heroFrame=`HQ contain rig ${Math.round(plan.rig)} trailer ${Math.round(plan.trailer)} scale ${plan.S.toFixed(3)} right ${plan.inStart.toFixed(2)}-${(plan.inStart+SLIDE_IN).toFixed(2)}s back ${plan.outStart.toFixed(2)}-${(plan.outStart+SLIDE_OUT).toFixed(2)}s`;
 }
 function filmTime(video,p){
  if(!video||video.readyState<1){est=null;return Math.min(10,p*40);}
  if(video.seeking)return lastDecodedTime;
  const now=performance.now(),ct=heroMediaTime(video);lastDecodedTime=ct;
  if(video.paused||video.ended||est===null){est=ct;estWall=now;return ct;}
  est+=(rewinding(video)?-1:1)*(now-estWall)/1000*(video.playbackRate||1)*heroMediaScale(video);estWall=now;
  const off=ct-est;if(Math.abs(off)>.25)est=ct;else est+=off*.08;
  return est;
 }
 function glide(video){
  const now=performance.now(),rate=(video.playbackRate||1)*heroMediaScale(video);
  if(anim&&animPlan===plan){
   const want=rate/animRate;if(Math.abs((anim.playbackRate||1)-want)>.005)anim.updatePlaybackRate(want);
   if(now-checkedAt<500)return;
   checkedAt=now;
   const expected=animFrom+(anim.currentTime||0)/1000*animRate;
   if(Math.abs(expected-heroMediaTime(video))<.12)return;
  }
  const from=heroMediaTime(video),span=10-from;
  if(span<=.02){stopGlide();set(plan.at(10),plan.sc(10));return;}
  const steps=Math.max(2,Math.min(400,Math.ceil(span*40))),frames=[];
  for(let i=0;i<=steps;i++){const t=from+span*i/steps;frames.push({translate:Math.max(0,Math.round(plan.at(t)*100)/100)+'px 0',scale:String(Math.round(plan.sc(t)*10000)/10000),offset:i/steps});}
  stopGlide();set(plan.at(from),plan.sc(from));
  const next=host.animate(frames,{duration:span/rate*1000,easing:'linear',fill:'none'});anim=next;
  next.onfinish=()=>{if(anim===next){anim=null;set(plan.at(10),plan.sc(10));}};
  animFrom=from;animRate=rate;animPlan=plan;checkedAt=now;
 }
 function beginRelease(){
  // Read the composited transform once at the decoded-film handoff, so an
  // in-flight WAAPI glide is carried exactly into delivery before it relaxes.
  const computed=getComputedStyle(host);
  const shift=parseFloat(computed.translate),scale=parseFloat(computed.scale);
  const from={shift:Number.isFinite(shift)?shift:visual.shift,scale:Number.isFinite(scale)?scale:visual.scale};
  stopGlide();stopRelease();
  if(reduced.matches||(Math.abs(from.shift)<.01&&Math.abs(from.scale-1)<.0001)){set();return;}
  releaseFrom=from;releaseStart=performance.now();
  if(typeof host.animate==='function'){
   release=host.animate([{translate:from.shift+'px 0',scale:String(from.scale)},{translate:'0px 0',scale:'1'}],
    {duration:RELEASE_MS,easing:'cubic-bezier(.2,.7,.2,1)',fill:'none'});
   // The animation owns the transition; its underlying value is already home.
   const captured=releaseFrom;set();releaseFrom=captured;edges(from.shift,from.scale);
  }else{release={};set(from.shift,from.scale);}
 }
 function update(){
  if(introFilmKind()==='mobile'){
   stopGlide();stopRelease();set();
   const isComparing=comparing();
   if(pendingBuild||isComparing!==wasComparing){
    // The close approach can fill a portrait frame. Keep that movie below
    // the actual copy, including its reservation note, throughout the shot.
    const bottom=Math.max(0,...visibleHeroTextRects(story).map(rect=>rect.bottom));
    const start=Math.max(0,bottom+2-host.getBoundingClientRect().top);
    host.style.setProperty('--mobile-clear-start',`${start}px`);
    host.style.setProperty('--mobile-clear-end',`${start+14}px`);
    // How far this screen enlarges the trailer shots (1 = not at all), from the stylesheet.
    phoneZoom=parseFloat(getComputedStyle(host).getPropertyValue('--phone-trailer-zoom'))||1;
    pendingBuild=false;
   }
   wasComparing=isComparing;
   // Centre and enlarge the trailer once the truck has passed; the delivery film carries it on from there.
   const p=parseFloat(track.dataset.sceneProgress||'0'),video=document.querySelector('video.opening-film');
   const weight=phoneZoom>1&&!reduced.matches?phoneTrailerWeight(p>=.25-1e-4?10:Math.max(0,Math.min(10,filmTime(video,p)))):0;
   const key=weight.toFixed(4);
   if(key!==lastPhone){
    lastPhone=key;
    host.style.setProperty('--phone-film-x',`${(50*(1-weight)).toFixed(3)}%`);
    host.style.setProperty('--phone-film-zoom',(1+(phoneZoom-1)*weight).toFixed(5));
    root.dataset.heroFrame=`phone trailer centring ${Math.round(weight*100)}% zoom ${(1+(phoneZoom-1)*weight).toFixed(3)}`;
   }
   return;
  }
  if(reduced.matches){stopGlide();stopRelease();set();wasComparing=comparing();return;}
  const isComparing=comparing();
  if(isComparing){
   if(!wasComparing){wasComparing=true;beginRelease();}
   if(releaseFrom){
    const p=clamp((performance.now()-releaseStart)/RELEASE_MS),weight=1-heroReleaseEase(p);
    if(p>=1){stopRelease();set();}
    else if(release?.cancel)edges(releaseFrom.shift*weight,1+(releaseFrom.scale-1)*weight);
    else set(releaseFrom.shift*weight,1+(releaseFrom.scale-1)*weight);
   }
   return;
  }
  if(wasComparing){wasComparing=false;stopRelease();pendingBuild=true;est=null;}
  if(pendingBuild)build();
  if(!plan){stopGlide();set();return;}
  const p=parseFloat(track.dataset.sceneProgress||'0'),video=document.querySelector('video.opening-film');
  // Keep the intro's final place while the requested delivery frame is loading.
  const t=p>=.25-1e-4?10:Math.max(0,Math.min(10,filmTime(video,p)));
  // The compositor glide assumes the film runs forward; a rewinding film is followed frame by frame.
  if(p<.25-1e-4&&video&&!video.paused&&!video.ended&&!video.seeking&&!rewinding(video)&&video.readyState>=2&&typeof host.animate==='function'){
   glide(video);
   const displayTime=anim?animFrom+(anim.currentTime||0)/1000*animRate:t;
   edges(plan.at(displayTime),plan.sc(displayTime));return;
  }
  stopGlide();set(plan.at(t),plan.sc(t));
 }
 build();
 (function loop(){if(document.body.dataset.activeScene==='top'&&!document.hidden)update();requestAnimationFrame(loop);})();
 let resizeTimer=0;
 addEventListener('resize',()=>{pendingBuild=true;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{build();update();},120);});
 document.fonts?.ready?.then(()=>{pendingBuild=true;build();update();});
 new ResizeObserver(()=>{pendingBuild=true;build();update();}).observe(story);
 reduced.addEventListener('change',()=>{pendingBuild=true;build();update();});
}
