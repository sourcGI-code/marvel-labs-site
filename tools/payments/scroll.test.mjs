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

test('the restored film controls accelerate through their old steps and settle to normal speed on release',()=>{
  const f=fixture();f.wheel();assert.equal(f.api.step,1);assert.equal(f.rate(),1);
  f.advance(400);f.wheel();assert.equal(f.api.step,2);assert.equal(f.rate(),1.9);
  f.advance(400);f.wheel();assert.equal(f.api.fast,true);f.advance(100);assert.ok(f.seeks.length>0,'the original fast scrubbing is restored');
  f.advance(500);assert.equal(f.rate(),1);f.close();
});

