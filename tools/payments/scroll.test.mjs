import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {DELIVERY_END} from '../../intro-timing.js';

const root=new URL('../../',import.meta.url);
const source=await readFile(new URL('continuous-scroll.js',root),'utf8');
const playerSource=await readFile(new URL('scene-playback.js',root),'utf8');

function fixture({reduced=false,realPlayer=false}={}){
  const dom=new JSDOM('<body data-active-scene="top"><main><section id="top"></section><section id="story"><div id="reading">Text</div></section><section id="inside"></section></main><footer class="site-footer"></footer></body>',{url:'https://marvellabs.shop/',pretendToBeVisual:true});
  const {window}=dom,{document}=window;
  let now=1000,id=0,progress=realPlayer?0:.05,mode='paused',starts=0,pauses=0,rate=1;
  const frames=new Map(),timers=new Map(),seeks=[],rates=[],prepared=[],videos=[];
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
    for(const duration of [10,18]){
      const video=document.createElement('video');
      for(const [key,value] of Object.entries({duration,currentTime:0,readyState:4,paused:true,ended:false,seeking:false}))Object.defineProperty(video,key,{value,writable:true});
      video.play=async()=>{starts++;video.paused=false;};video.pause=()=>{pauses++;video.paused=true;};videos.push(video);
    }
    active.view.preparePlayback=async({progress:p})=>{prepared.push(p);return p<.25?{video:videos[0],duration:10,start:0,end:.25}:{video:videos[1],duration:18,start:.25,end:DELIVERY_END,terminal:true};};
    active.view.setPlaybackProgress=()=>{};
    context.waitPlayable=async()=>{};
    vm.runInContext(playerSource.replace(/^import .*;\n/gm,'').replace('export function installScenePlayback','function installScenePlayback')+'\nthis.installPlayer=installScenePlayback;',context);
    playback=context.installPlayer({getActive:()=>active,readProgress:()=>progress,writeProgress:(_,p)=>{progress=p;},setPaused(){},reduced:context.matchMedia('(prefers-reduced-motion: reduce)')});
  }
  vm.runInContext(source.replace(/^import .*;\n/gm,'').replace('export function installBeatScroll','function installBeatScroll')+'\nthis.install=installBeatScroll;',context);
  const api=context.install({stage,playback,getActive:()=>active,readProgress:()=>progress});
  function advance(ms){const end=now+ms;while(now<end){now=Math.min(end,now+16);for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.fn();}const queued=[...frames];frames.clear();queued.forEach(([,fn])=>fn(now));}}
  function wheel(deltaY=120,options={}){const event=new window.WheelEvent('wheel',{deltaY,cancelable:true,bubbles:true,...options});(options.target||active.track).dispatchEvent(event);return event;}
  function touch(type,y){const event=new window.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'touches',{value:type==='touchend'?[]:[{clientX:100,clientY:y}]});active.track.dispatchEvent(event);return event;}
  const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
  return {api,playback,active,document,window,advance,wheel,touch,seeks,rates,prepared,videos,settle,progress:()=>progress,
    rate:()=>rate,starts:()=>starts,pauses:()=>pauses,close:()=>dom.window.close(),
    navigate(id){document.dispatchEvent(new window.CustomEvent('stage:navigate',{detail:{hash:'#'+id}}));active.track=document.getElementById(id);document.body.dataset.activeScene=id;progress=0;}};
}

test('a long first wheel gesture stays at normal speed; later gestures continue without seeking',()=>{
  const f=fixture();
  for(let i=0;i<50;i++){f.wheel(100);f.advance(20);}
  assert.equal(f.api.step,1);assert.equal(f.rate(),1);assert.equal(f.starts(),1);assert.deepEqual(f.seeks,[]);
  f.advance(300);f.wheel();f.advance(100);
  assert.ok(f.rate()>1&&f.rate()<1.5,'acceleration eases into the next speed');
  f.advance(1000);assert.equal(f.rate(),1.5);assert.equal(f.starts(),1);assert.deepEqual(f.seeks,[]);
  for(let i=0;i<8;i++){f.advance(300);f.wheel();f.advance(1000);}
  assert.equal(f.rate(),3);f.advance(5000);assert.equal(f.rate(),3,'release keeps the selected playback speed');f.close();
});

test('trackpad inertia does not boost, while a fresh push during its tail does',()=>{
  const f=fixture();
  for(const delta of [100,75,50,32,18,10,6,3,1]){f.wheel(delta);f.advance(20);}
  assert.equal(f.api.step,1);assert.equal(f.rate(),1);
  f.wheel(80);f.advance(1200);assert.equal(f.api.step,2);assert.equal(f.rate(),1.5);f.close();
});

test('one forward touch swipe or held key cannot produce multiple speed steps',()=>{
  const f=fixture();
  for(let swipe=0;swipe<2;swipe++){
    f.touch('touchstart',500);for(let y=490;y>100;y-=10){f.touch('touchmove',y);f.advance(16);}f.touch('touchend',100);f.advance(1200);
    assert.equal(f.rate(),swipe===0?1:1.5);
  }
  assert.equal(f.starts(),1);assert.deepEqual(f.seeks,[]);
  f.navigate('inside');
  for(let i=0;i<20;i++){f.active.track.dispatchEvent(new f.window.KeyboardEvent('keydown',{code:'ArrowDown',repeat:i>0,cancelable:true,bubbles:true}));f.advance(50);}
  assert.equal(f.api.step,1);assert.equal(f.rate(),1);
  f.active.track.dispatchEvent(new f.window.KeyboardEvent('keyup',{code:'ArrowDown',bubbles:true}));
  f.active.track.dispatchEvent(new f.window.KeyboardEvent('keydown',{code:'ArrowDown',cancelable:true,bubbles:true}));f.advance(1200);assert.equal(f.rate(),1.5);f.close();
});

test('navigation resets speed and reading panels, zoom, horizontal input and reduced motion retain native scrolling',()=>{
  const f=fixture();f.wheel();f.advance(300);f.wheel();f.advance(1000);assert.equal(f.rate(),1.5);
  f.navigate('inside');f.wheel();assert.equal(f.rate(),1);assert.equal(f.api.step,1);
  assert.equal(f.wheel(120,{ctrlKey:true}).defaultPrevented,false);
  assert.equal(f.wheel(20,{deltaX:120}).defaultPrevented,false);
  f.navigate('story');const reading=f.document.getElementById('reading');reading.style.overflowY='auto';
  Object.defineProperties(reading,{scrollHeight:{value:800},clientHeight:{value:200}});
  assert.equal(f.wheel(120,{target:reading}).defaultPrevented,false);assert.equal(f.document.body.dataset.activeScene,'story');f.close();
  const r=fixture({reduced:true});assert.equal(r.wheel().defaultPrevented,false);assert.equal(r.starts(),0);r.close();
});

test('reverse scrolling stops forward playback and the next forward gesture starts at normal speed',()=>{
  const f=fixture();f.wheel();f.advance(300);f.wheel();f.advance(1000);assert.equal(f.rate(),1.5);
  const before=f.progress();f.wheel(-10);f.advance(500);
  assert.ok(f.progress()<before);assert.equal(f.playback.inspect().mode,'paused');
  f.wheel();f.advance(1000);assert.equal(f.rate(),1);assert.equal(f.api.step,1);assert.equal(f.playback.inspect().mode,'playing');f.close();
});

test('scrolling during initial media loading reuses the pending playback request',async()=>{
  const f=fixture({realPlayer:true});f.playback.autoplay(f.active,{end:.25});
  assert.equal(f.playback.inspect().mode,'loading');f.wheel();f.advance(300);f.wheel();
  await f.settle();f.advance(1000);
  assert.equal(f.prepared.length,1);assert.equal(f.starts(),1);assert.equal(f.pauses(),0);assert.equal(f.playback.inspect().mode,'playing');
  assert.ok(Math.abs(f.videos[0].playbackRate-(5/7)*1.5)<.001);f.playback.pause();f.close();
});

test('forward wheel input adopts actual intro playback without restarting and continues into cargo',async()=>{
  const f=fixture({realPlayer:true});f.playback.autoplay(f.active,{end:.25});await f.settle();
  assert.equal(f.playback.inspect().mode,'playing');assert.equal(f.starts(),1);
  f.videos[0].currentTime=4;f.advance(16);const before=f.progress(),pauses=f.pauses();
  f.wheel();f.advance(300);f.wheel();f.advance(1200);await f.settle();
  assert.equal(f.prepared.length,1);assert.equal(f.starts(),1);assert.equal(f.pauses(),pauses);
  assert.equal(f.progress(),before);assert.deepEqual(f.seeks,[]);assert.ok(Math.abs(f.videos[0].playbackRate-(5/7)*1.5)<.001);
  f.videos[0].currentTime=10;f.videos[0].ended=true;f.advance(16);await f.settle();
  assert.equal(f.prepared.length,2);assert.equal(f.videos[1].paused,false);assert.equal(f.videos[1].playbackRate,1.5);
  f.playback.pause();f.close();
});
