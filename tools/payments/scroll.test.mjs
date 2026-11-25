import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {DELIVERY_END} from '../../intro-timing.js';
import {heroMediaTime,heroMediaScale} from '../../hero-frame-hqworld4.js';

const root=new URL('../../',import.meta.url);
const source=await readFile(new URL('continuous-scroll.js',root),'utf8');
const playerSource=await readFile(new URL('scene-playback.js',root),'utf8');
const openingSource=await readFile(new URL('opening-autoplay.js',root),'utf8');

function fixture({reduced=false,realPlayer=false,hidden=false,opening=false,openingDuration=10,metadataOnly=false,playError=null,initialProgress=null,rewind=false,url='https://marvellabs.shop/'}={}){
  const dom=new JSDOM('<body data-active-scene="top"><main><section id="top"></section><section id="story"><div id="reading">Text</div></section><section id="inside"></section></main><footer class="site-footer"></footer></body>',{url,pretendToBeVisual:true});
  const {window}=dom,{document}=window;
  Object.defineProperty(document,'hidden',{value:hidden,writable:true});
  let loads=0;
  let now=1000,id=0,progress=initialProgress??(realPlayer?0:.05),mode='paused',starts=0,pauses=0,rate=1;
  const frames=new Map(),timers=new Map(),seeks=[],rates=[],prepared=[],reverses=[],videos=[];
  const active={track:document.querySelector('#top'),view:{preparePlayback(){}}};
  const context={window,document,location:window.location,URLSearchParams,CustomEvent:window.CustomEvent,AbortController,DOMException,console,DELIVERY_END,
    innerWidth:1280,innerHeight:800,performance:{now:()=>now},getComputedStyle:window.getComputedStyle.bind(window),
    addEventListener:window.addEventListener.bind(window),
    matchMedia:query=>Object.assign(new window.EventTarget(),{matches:query.includes('reduced-motion')&&reduced}),
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key),
    setTimeout:(fn,ms=0)=>{timers.set(++id,{fn,at:now+ms});return id;},clearTimeout:key=>timers.delete(key)
  };
  vm.createContext(context);
  const stage={progress:()=>progress,cancelTransition(){},seekProgress(section,p){seeks.push([section.id,p]);progress=p;active.track=section;document.body.dataset.activeScene=section.id||'footer';}};
  let playback={pause(){pauses++;mode='paused';},setRate(value){rate=value;rates.push(value);},inspect:()=>({mode}),
    playTo(){starts++;mode='playing';return true;},extendTo:()=>mode!=='paused'};
  if(realPlayer){
    for(const duration of [openingDuration,18]){
      const video=document.createElement('video');
      // rewind: the file carries the film's frames a second time in reverse order after its end.
      for(const [key,value] of Object.entries({duration:rewind?duration*2:duration,currentTime:0,readyState:metadataOnly?1:4,paused:true,ended:false,seeking:false}))Object.defineProperty(video,key,{value,writable:true});
      video.preload='metadata';video.load=()=>{loads++;};
      video.play=async()=>{starts++;if(playError)throw new DOMException('Autoplay blocked',playError);video.readyState=4;video.paused=false;};video.pause=()=>{pauses++;video.paused=true;};videos.push(video);
    }
    active.view.preparePlayback=async({progress:p,reverse=false})=>{
      prepared.push(p);reverses.push(reverse);
      if(reverse&&!rewind)return null;
      const part=(reverse?p<=.25+1e-6:p<.25)?{video:videos[0],duration:openingDuration,start:0,end:.25}:{video:videos[1],duration:18,start:.25,end:DELIVERY_END,terminal:true};
      return reverse?{...part,reverse:true,rewindStart:part.duration}:part;
    };
    if(rewind)active.view.canRewind=()=>true;
    active.view.setPlaybackProgress=()=>{};
    context.waitPlayable=async()=>{};
    vm.runInContext(playerSource.replace(/^import .*;\n/gm,'').replace('export function installScenePlayback','function installScenePlayback')+'\nthis.installPlayer=installScenePlayback;',context);
    playback=context.installPlayer({getActive:()=>active,readProgress:()=>progress,writeProgress:(_,p)=>{progress=p;},setPaused(){},reduced:context.matchMedia('(prefers-reduced-motion: reduce)')});
  }
  vm.runInContext(source.replace(/^import .*;\n/gm,'').replace('export function installBeatScroll','function installBeatScroll')+'\nthis.install=installBeatScroll;',context);
  const api=context.install({stage,playback,getActive:()=>active,readProgress:()=>progress});
  if(opening){
    vm.runInContext(openingSource.replace('export function installOpeningAutoplay','function installOpeningAutoplay')+'\nthis.installOpening=installOpeningAutoplay;',context);
    context.installOpening({state:active,playback,readProgress:()=>progress,reduced:context.matchMedia('(prefers-reduced-motion: reduce)')});
  }
  function advance(ms){const end=now+ms;while(now<end){now=Math.min(end,now+16);for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.fn();}const queued=[...frames];frames.clear();queued.forEach(([,fn])=>fn(now));}}
  function wheel(deltaY=120,options={}){const event=new window.WheelEvent('wheel',{deltaY,cancelable:true,bubbles:true,...options});(options.target||active.track).dispatchEvent(event);return event;}
  function touch(type,y){const event=new window.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'touches',{value:type==='touchend'?[]:[{clientX:100,clientY:y}]});active.track.dispatchEvent(event);return event;}
  const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
  return {api,playback,active,document,window,advance,wheel,touch,seeks,rates,prepared,reverses,videos,settle,progress:()=>progress,
    loads:()=>loads,rate:()=>rate,starts:()=>starts,pauses:()=>pauses,close:()=>dom.window.close(),
    navigate(id){document.dispatchEvent(new window.CustomEvent('stage:navigate',{detail:{hash:'#'+id}}));active.track=document.getElementById(id);document.body.dataset.activeScene=id;progress=0;}};
}

function readingPanel(f,{top=0,max=300}={}){
  const section=f.document.getElementById('story');section.style.overflowY='auto';
  Object.defineProperties(section,{scrollHeight:{value:600+max},clientHeight:{value:600}});section.scrollTop=top;
  return section;
}

test('a wheel event consumes the remaining reading content and immediately carries the excess into the next section',()=>{
  const f=fixture();f.navigate('story');const section=readingPanel(f,{top:290});
  f.wheel(120,{target:section});
  assert.equal(section.scrollTop,300);assert.equal(f.document.body.dataset.activeScene,'inside');
  assert.equal(f.seeks.length,1,'one handoff, without repeated wheel gestures');f.close();
});

test('reading content remains available and reversing at its top moves back immediately',()=>{
  const f=fixture();f.navigate('story');const section=readingPanel(f);
  f.wheel(120,{target:section});assert.equal(section.scrollTop,120);assert.equal(f.document.body.dataset.activeScene,'story');
  f.advance(400);f.wheel(-160,{target:section});assert.equal(section.scrollTop,0);assert.equal(f.document.body.dataset.activeScene,'top');f.close();
});

test('a touch swipe can leave a reading panel at its bottom without starting another swipe',()=>{
  const f=fixture();f.navigate('story');const section=readingPanel(f,{top:290});
  f.touch('touchstart',500);f.touch('touchmove',470);
  assert.equal(section.scrollTop,300);assert.equal(f.document.body.dataset.activeScene,'inside');
  const count=f.seeks.length;f.touch('touchmove',200);assert.equal(f.seeks.length,count,'the same swipe cannot skip the next section');
  f.touch('touchend',200);f.close();
});

test('a reading section that fits on screen leaves on the next wheel gesture',()=>{
  const f=fixture();f.navigate('story');readingPanel(f,{max:0});f.wheel();
  assert.equal(f.document.body.dataset.activeScene,'inside');f.close();
});

test('copying selected site text uses plain text, stops pending motion, and leaves scrolling usable',()=>{
  const f=fixture();f.navigate('story');readingPanel(f,{max:0});
  const section=f.document.getElementById('story'),p=f.document.createElement('p');p.textContent='Illustration only: 20 sales × $15 = $300 / day.';section.append(p);
  p.dispatchEvent(new f.window.Event('selectstart',{bubbles:true}));
  const range=f.document.createRange();range.selectNodeContents(p);const selection=f.document.getSelection();selection.addRange(range);
  const types=[],copy=new f.window.Event('copy',{bubbles:true,cancelable:true});
  Object.defineProperty(copy,'clipboardData',{value:{setData:(type,text)=>types.push([type,text])}});p.dispatchEvent(copy);
  assert.equal(copy.defaultPrevented,true);assert.deepEqual(types,[['text/plain',p.textContent]]);
  assert.equal(selection.toString(),p.textContent);assert.equal(f.playback.inspect().mode,'paused');
  f.wheel();assert.equal(f.document.body.dataset.activeScene,'inside');f.close();
});

test('select all is limited to the visible section and never selects the huge animation spacers',()=>{
  const f=fixture();f.navigate('story');const section=f.document.getElementById('story');section.innerHTML='<p>Workday opportunity</p>';
  f.document.getElementById('inside').textContent='Other section';
  const key=new f.window.KeyboardEvent('keydown',{code:'KeyA',ctrlKey:true,bubbles:true,cancelable:true});f.document.body.dispatchEvent(key);
  assert.equal(key.defaultPrevented,true);assert.equal(f.document.getSelection().toString(),'Workday opportunity');f.close();
});

test('native form editing, zoom, horizontal scrolling and reduced motion are not intercepted',()=>{
  const f=fixture();f.navigate('story');readingPanel(f);const input=f.document.createElement('input');f.active.track.append(input);
  const key=new f.window.KeyboardEvent('keydown',{code:'KeyA',ctrlKey:true,bubbles:true,cancelable:true});input.dispatchEvent(key);assert.equal(key.defaultPrevented,false);
  assert.equal(f.wheel(120,{ctrlKey:true}).defaultPrevented,false);assert.equal(f.wheel(20,{deltaX:120}).defaultPrevented,false);f.close();
  const r=fixture({reduced:true});assert.equal(r.wheel().defaultPrevented,false);r.close();
});

// Owner 2026-11-25 (laptop and phone): "if I want to scroll like even a little bit it jitters the animation, it seems to
// hold onto the distance of the scroll and so if I short scroll it doesnt work". A scroll moves the film by its own
// length (REWIND_PER_NOTCH s of the chapter's clock per 100 px, both ways) and the film stops there: nothing plays on,
// and there is no step-up into a fast mode. The opening's clock runs 14 s for its 10 s test file.
const clockAt=p=>p/.25*14;
test('a wheel notch moves the film forward by its own distance, then it stops there and nothing plays on',async()=>{
  const f=fixture({realPlayer:true,initialProgress:.1});
  f.wheel(120);await f.settle();
  assert.equal(f.playback.inspect().mode,'playing');assert.equal(f.playback.inspect().reverse,false);
  assert.ok(Math.abs(f.videos[0].currentTime-4)<1e-6,'it starts from the frame on screen');
  assert.ok(Math.abs(f.api.driving.target-(clockAt(.1)+1.8))<1e-6,'one 120 px notch = 1.8 s of film: '+f.api.driving.target);
  assert.ok(f.api.rate>1,'it covers the distance quickly');
  f.advance(400);assert.equal(f.playback.inspect().mode,'playing','releasing the wheel does not cut the move short');
  const stop=.1+1.8/14*.25;
  f.videos[0].currentTime=7.3;f.advance(16);                  // the decoder passes the stop between two frames
  assert.equal(f.playback.inspect().mode,'paused');assert.ok(Math.abs(f.progress()-stop)<1e-6,'stops on the frame the scroll asked for: '+f.progress());
  f.advance(3000);assert.equal(f.playback.inspect().mode,'paused','nothing plays on after the scroll');
  assert.equal(f.progress(),stop);assert.equal(f.starts(),1);assert.equal(f.seeks.length,0,'no picture-by-picture seeking');f.close();
});

test('a short scroll moves the film a short way, a long scroll further, and packets never restart the film',async()=>{
  const short=fixture({realPlayer:true,initialProgress:.1});
  short.wheel(20);await short.settle();
  assert.ok(Math.abs(short.api.driving.target-(clockAt(.1)+.3))<1e-6,'20 px = 0.3 s: '+short.api.driving.target);
  assert.ok(short.api.rate<=2.5,'a short scroll is a gentle move, not a jolt: '+short.api.rate);short.close();
  const long=fixture({realPlayer:true,initialProgress:.1});
  for(let i=0;i<10;i++){long.wheel(120);long.advance(16);}await long.settle();
  assert.ok(Math.abs(long.api.driving.target-(clockAt(.1)+18))<1e-6,'ten notches = 18 s: '+long.api.driving.target);
  assert.equal(long.api.rate,8,'a long scroll runs at the 8x ceiling');
  assert.equal(long.starts(),1,'later packets move the stop on without restarting the film');
  assert.equal(long.api.step,undefined,'no gesture counter: the first scroll and the tenth behave the same');long.close();
});

test('a short scroll during the opening autoplay speeds it up briefly and the autoplay carries on',async()=>{
  const f=fixture({realPlayer:true,opening:true});await f.settle();
  assert.equal(f.api.driving,null,'autoplay is not a scroll');
  f.videos[0].currentTime=2;f.advance(16);
  f.wheel(60);await f.settle();
  assert.equal(f.playback.inspect().mode,'playing');assert.equal(f.starts(),1,'the autoplay is not restarted');
  assert.ok(f.api.rate>=1,'never slower than the autoplay itself');
  f.videos[0].currentTime=5;f.advance(400);assert.equal(f.playback.inspect().mode,'playing','it plays on past the scroll');
  assert.equal(f.api.rate,1);f.close();
});

// Owner 2026-11-20: "a little scroll like nudges the animation and that sucks for people who dont use the whole screen to scroll".
function swipe(f,from,to,ms,{lift=true}={}){
  const steps=Math.max(2,Math.round(ms/16));
  f.touch('touchstart',from);
  for(let i=1;i<=steps;i++){f.advance(ms/steps);f.touch('touchmove',from+(to-from)*i/steps);}
  if(lift)f.touch('touchend',to);
}

test('touch: a slow drag moves the film by the finger distance, a quick flick carries it on like a page',async()=>{
  const slow=fixture({realPlayer:true,initialProgress:.1});swipe(slow,500,430,640);await slow.settle();
  assert.ok(Math.abs(slow.api.driving.target-(clockAt(.1)+.7))<.02,'70 px dragged slowly = 0.7 s: '+slow.api.driving.target);
  const quick=fixture({realPlayer:true,initialProgress:.1});swipe(quick,500,430,64);await quick.settle();
  assert.ok(quick.api.driving.target>slow.api.driving.target+3,'the same 70 px flicked quickly goes much further: '+quick.api.driving.target);
  assert.equal(quick.starts(),1,'one start for the whole swipe');assert.equal(quick.seeks.length,0,'forward travel never seeks');
  quick.videos[0].currentTime=10;quick.advance(16);await quick.settle();
  quick.advance(2000);assert.equal(quick.playback.inspect().mode,'paused','then it stops: nothing plays on');
  slow.close();quick.close();
});

test('a finger resting on a moving film stops it there',async()=>{
  const f=fixture({realPlayer:true,initialProgress:.1});swipe(f,500,430,64);await f.settle();
  assert.equal(f.playback.inspect().mode,'playing');
  f.videos[0].currentTime=5;f.advance(16);
  f.touch('touchstart',400);f.advance(300);
  assert.equal(f.playback.inspect().mode,'paused');assert.equal(f.api.driving,null);assert.equal(f.api.rate,1);
  assert.ok(Math.abs(f.progress()-.125)<1e-6,'held on the frame under the finger: '+f.progress());
  f.touch('touchend',400);f.close();
});

test('a flick back rewinds by the finger distance plus momentum, then holds the frame',async()=>{
  const f=fixture({realPlayer:true,rewind:true,initialProgress:.2});
  swipe(f,300,370,64);await f.settle();
  assert.equal(f.playback.inspect().reverse,true);assert.equal(f.api.driving.direction,-1);
  const target=f.api.driving.target;assert.ok(target<clockAt(.2)-3,'momentum takes it well back: '+target);
  assert.ok(target>0,'a single flick does not run to the start');
  f.videos[0].currentTime=10+(1-target/14)*10+.5;f.advance(16);   // the reversed copy passes the stop
  const rest=f.progress();assert.ok(Math.abs(rest-target/14*.25)<1e-6,'stops on the frame the flick asked for: '+rest);
  f.advance(1000);assert.equal(f.progress(),rest,'then it holds still');
  assert.equal(f.playback.inspect().mode,'paused');assert.equal(f.api.rate,1);f.close();
});

test('a flick in a text panel keeps scrolling after the finger lifts and stops at the panel edge',()=>{
  const f=fixture();f.navigate('story');const section=readingPanel(f,{max:2000});
  swipe(f,500,430,64);
  assert.ok(Math.abs(section.scrollTop-70)<1,'the panel follows the finger');assert.equal(f.api.coasting,'panel');
  f.advance(2500);
  assert.ok(section.scrollTop>250,'momentum carries the text on: '+section.scrollTop);
  assert.equal(f.api.coasting,'');assert.equal(f.document.body.dataset.activeScene,'story');f.close();
  const edge=fixture();edge.navigate('story');const panel=readingPanel(edge,{top:200,max:300});
  swipe(edge,500,460,48);edge.advance(2500);
  assert.equal(panel.scrollTop,300);
  assert.equal(edge.document.body.dataset.activeScene,'story','momentum alone never changes section');edge.close();
});



test('opening starts muted and inline without wheel input even when only metadata was preloaded',async()=>{
  const f=fixture({realPlayer:true,opening:true,metadataOnly:true});await f.settle();
  assert.equal(f.starts(),1);assert.equal(f.loads(),1);assert.equal(f.playback.inspect().mode,'playing');
  assert.equal(f.videos[0].muted,true);assert.equal(f.videos[0].defaultMuted,true);assert.equal(f.videos[0].playsInline,true);
  assert.equal(f.api.driving,null,'autoplay does not count as a scroll');
  f.videos[0].currentTime=2;f.advance(16);assert.equal(f.progress(),.05,'decoded time advances the opening');
  f.videos[0].currentTime=10;f.videos[0].ended=true;f.advance(16);await f.settle();
  assert.equal(f.playback.inspect().mode,'paused');assert.equal(f.starts(),1,'later film stays lazy until requested');f.close();
});

test('native 60 fps opening keeps the same 14-second presentation at normal playback speed',async()=>{
  const f=fixture({realPlayer:true,opening:true,openingDuration:14});await f.settle();
  assert.equal(f.videos[0].playbackRate,1);
  f.videos[0].currentTime=7;f.advance(16);assert.equal(f.progress(),.125);
  assert.equal(heroMediaTime(f.videos[0]),5);
  assert.equal(heroMediaScale(f.videos[0]),5/7);
  assert.equal(heroMediaTime({currentTime:5,duration:10}),5,'older exports keep their authored framing clock');
  f.videos[0].currentTime=14;f.videos[0].ended=true;f.advance(16);await f.settle();
  assert.equal(f.playback.inspect().mode,'paused');assert.equal(f.starts(),1);f.close();
});

test('background arrival waits for visibility and unfinished opening resumes after tab return and bfcache',async()=>{
  const f=fixture({realPlayer:true,opening:true,hidden:true});await f.settle();assert.equal(f.starts(),0);
  f.document.hidden=false;f.document.dispatchEvent(new f.window.Event('visibilitychange'));await f.settle();assert.equal(f.starts(),1);
  f.videos[0].currentTime=3;f.advance(16);
  f.document.hidden=true;f.document.dispatchEvent(new f.window.Event('visibilitychange'));await f.settle();assert.equal(f.playback.inspect().mode,'paused');
  f.document.hidden=false;f.document.dispatchEvent(new f.window.Event('visibilitychange'));await f.settle();assert.equal(f.starts(),2);assert.ok(Math.abs(f.progress()-.075)<.00001);
  f.window.dispatchEvent(new f.window.PageTransitionEvent('pagehide',{persisted:true}));assert.equal(f.playback.inspect().mode,'paused');
  f.window.dispatchEvent(new f.window.PageTransitionEvent('pageshow',{persisted:true}));await f.settle();assert.equal(f.starts(),3);
  f.window.dispatchEvent(new f.window.PageTransitionEvent('pageshow',{persisted:true}));await f.settle();assert.equal(f.starts(),3,'no duplicate playback');f.close();
});

test('opening respects user pause, reduced motion, deep links and completed restored positions',async()=>{
  const f=fixture({realPlayer:true,opening:true});await f.settle();f.playback.pause();
  f.window.dispatchEvent(new f.window.PageTransitionEvent('pagehide',{persisted:true}));f.window.dispatchEvent(new f.window.PageTransitionEvent('pageshow',{persisted:true}));await f.settle();assert.equal(f.starts(),1);f.close();
  for(const options of [{reduced:true},{url:'https://marvellabs.shop/#story'},{url:'https://marvellabs.shop/?display=delivery'},{initialProgress:.3}]){
    const r=fixture({realPlayer:true,opening:true,...options});await r.settle();assert.equal(r.starts(),0);r.close();
  }
  const restored=fixture({realPlayer:true,opening:true,initialProgress:.1});await restored.settle();assert.equal(restored.starts(),1);assert.equal(restored.videos[0].currentTime,4);restored.close();
});

test('browser autoplay refusal leaves a working play fallback and does not retry continuously',async()=>{
  const f=fixture({realPlayer:true,opening:true,playError:'NotAllowedError'});await f.settle();
  assert.equal(f.playback.inspect().mode,'paused');assert.equal(f.playback.inspect().blocked,true);
  f.window.dispatchEvent(new f.window.PageTransitionEvent('pageshow',{persisted:true}));await f.settle();assert.equal(f.starts(),1);f.close();
});

// Owner 2026-11-20: "scrolling up on the website on laptop isnt that great". A film that carries its frames a
// second time in reverse order is played, not sought picture by picture, when the visitor scrolls back.
// Owner 2026-11-21: "scrolling up doesnt work that well". A wheel notch takes the film back a set distance
// (REWIND_PER_NOTCH s of the chapter's clock per 100 px) and the rewind runs to that frame after the wheel stops:
// stopping it 220 ms after the last notch cancelled the reversed copy while it was still seeking into place.
test('scrolling back plays the reversed copy to the frame the wheel asked for',async()=>{
  const f=fixture({realPlayer:true,rewind:true,initialProgress:.2});
  f.wheel(-120);await f.settle();
  assert.equal(f.playback.inspect().mode,'playing');assert.equal(f.playback.inspect().reverse,true);
  assert.deepEqual(f.reverses,[true]);
  assert.ok(Math.abs(f.videos[0].currentTime-12)<1e-6,'film second 8 of 10 sits 2 s into the reversed copy: '+f.videos[0].currentTime);
  assert.ok(f.videos[0].playbackRate>1,'the rewind runs faster than normal speed');
  assert.equal(f.seeks.length,0,'no picture-by-picture seeking');
  f.videos[0].currentTime=13;f.advance(16);
  assert.ok(Math.abs(f.progress()-.175)<1e-6,'3 s into the reversed copy is film second 7: '+f.progress());
  f.advance(300);
  assert.equal(f.playback.inspect().reverse,true,'releasing the wheel does not cut the rewind short');
  // The opening's clock runs 14 s for its 10 s file: one 120 px notch = 1.8 s of clock = progress .2 -> .2 - 1.8/14*.25.
  const stop=.2-1.8/14*.25;
  f.videos[0].currentTime=14;f.advance(16);       // the decoder passes the stop between two frames
  assert.equal(f.playback.inspect().mode,'paused');assert.equal(f.playback.inspect().reverse,false);
  assert.ok(Math.abs(f.progress()-stop)<1e-6,'scrolling back stops on the frame the scroll asked for: '+f.progress());
  assert.equal(f.videos[0].paused,true);f.close();
});

test('a rewind runs on from the two-trailer film into the opening film, and forward input plays forward again',async()=>{
  const f=fixture({realPlayer:true,rewind:true,initialProgress:.5});
  f.wheel(-1200);await f.settle();                // ten notches: 18 s of clock, back past the hand-off
  assert.equal(f.playback.inspect().reverse,true);
  const share=(.5-.25)/(DELIVERY_END-.25);
  assert.ok(Math.abs(f.videos[1].currentTime-(18+(1-share)*18))<1e-6,'starts at the reversed twin of the current frame');
  f.videos[1].currentTime=36;f.wheel(-120);f.advance(16);await f.settle();
  assert.deepEqual(f.reverses,[true,true]);
  assert.ok(Math.abs(f.prepared[1]-.25)<1e-9,'the opening film takes over at the hand-off');
  assert.ok(Math.abs(f.videos[0].currentTime-10)<1e-6,'from its last frame');
  assert.equal(f.playback.inspect().mode,'playing');assert.equal(f.playback.inspect().reverse,true);
  f.videos[0].currentTime=12;f.advance(16);
  assert.ok(Math.abs(f.progress()-.2)<1e-6);
  f.advance(400);f.wheel(120);await f.settle();
  assert.equal(f.playback.inspect().mode,'playing');assert.equal(f.playback.inspect().reverse,false);
  assert.ok(Math.abs(f.videos[0].currentTime-8)<1e-6,'forward playback resumes from the film itself: '+f.videos[0].currentTime);
  assert.equal(f.seeks.length,0);f.close();
});

test('a film without a reversed copy is still scrolled back by seeking',async()=>{
  const f=fixture({realPlayer:true,initialProgress:.2});
  f.wheel(-120);await f.settle();f.advance(100);
  assert.equal(f.playback.inspect().reverse,false);assert.deepEqual(f.reverses,[]);
  assert.ok(f.seeks.length>0&&f.progress()<.2,'frame-by-frame fallback');
  // 11-25 (the live films carry no reversed copy): the seeking fallback covers the scroll's whole distance and then
  // stops, instead of a third of it and being cut off 220 ms after the wheel stopped.
  f.advance(2000);const stop=.2-1.8/14*.25;
  assert.ok(Math.abs(f.progress()-stop)<1e-6,'seeks all the way to the frame the scroll asked for: '+f.progress());
  const seeks=f.seeks.length;f.advance(1000);assert.equal(f.seeks.length,seeks,'then it holds still');f.close();
});

