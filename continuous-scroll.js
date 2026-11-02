// First gesture plays, second boosts, third unlocks direct fast scrubbing.
// Once unlocked it stays unlocked across sections and pauses. Release always
// resumes the current film at its normal rate, from the selected position.
import {DELIVERY_END} from './intro-timing.js?v=1';

export function installBeatScroll({stage,playback,getActive,readProgress}) {
  const params=new URLSearchParams(location.search);
  if(params.has('freescroll')||params.has('edit'))return null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body;
  const QUIET_MS=350,RELEASE_MS=220,SWIPE_PX=28,SECONDS_PER_NOTCH=8;
  let step=0,rate=1,wheel=null,touch=null,heldKey=null;
  let pending=0,releaseTimer=0,epoch=0,scrubbing=false,scrollFrame=0,queued=0,burst=null;
  body.dataset.beatScroll='1';
  const sections=()=>[...document.querySelectorAll('main > section, body > .site-footer')];
  const chapters=()=>sections().map(section=>({section,start:section.id==='top'||section.id==='inside'?0:.15,
    end:section.id==='top'?DELIVERY_END:1,kind:['top','inside'].includes(section.id)?'film':'reading',key:section.id||'footer'}));
  const current=()=>chapters().find(c=>c.key===body.dataset.activeScene)||chapters()[0];
  function mark() {
    body.dataset.scrollStep=String(step);
    body.dataset.scrollFast=String(step>=3);
    body.dataset.scrollChapter=current()?.key||'';
  }
  function cancelPending() {epoch++;clearTimeout(pending);pending=0;}
  function halt({capture=true}={}) {
    cancelPending();clearTimeout(releaseTimer);releaseTimer=0;
    cancelAnimationFrame(scrollFrame);scrollFrame=0;queued=0;burst=null;scrubbing=false;
    playback.pause({capture});rate=1;playback.setRate(1);mark();
  }
  function play(chapter) {
    if(chapter?.kind!=='film'||document.hidden||reduced.matches)return;
    cancelPending();const mine=epoch,until=performance.now()+15000;
    const begin=()=>{
      pending=0;
      if(mine!==epoch||current()?.key!==chapter.key||scrubbing||document.hidden||reduced.matches)return;
      const active=getActive();
      if(active?.track===chapter.section&&active.view?.preparePlayback){
        playback.setRate(rate);
        if(readProgress(active)<chapter.end-.0001)playback.playTo(chapter.end);
      }else if(performance.now()<until)pending=setTimeout(begin,100);
    };
    begin();
  }
  function nextFrom(chapter,direction) {
    const list=chapters();return list[list.findIndex(c=>c.key===chapter.key)+direction];
  }
  function move(target,back=false) {
    if(!target)return false;
    halt();
    document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+target.key,beat:true}}));
    stage.seekProgress(target.section,back&&target.kind==='film'?target.end:target.start);
    mark();return true;
  }
  const duration=(video,fallback)=>Number.isFinite(video?.duration)&&video.duration>0?video.duration:fallback;
  function filmClock(chapter) {
    if(chapter.key==='top'){
      const opening=duration(document.querySelector('video.opening-film'),10)/(5/7);
      const delivery=duration(chapter.section.querySelector('video.recorded-scene'),18);
      return {
        total:opening+delivery,
        time:p=>p<.25?p/.25*opening:opening+(p-.25)/(DELIVERY_END-.25)*delivery,
        progress:t=>t<opening?t/opening*.25:.25+(t-opening)/delivery*(DELIVERY_END-.25)
      };
    }
    const total=duration(chapter.section.querySelector('video.recorded-scene'),103);
    return {total,time:p=>p*total,progress:t=>t/total};
  }
  function release() {
    releaseTimer=0;
    if(touch?.used||heldKey)return;
    flush();scrubbing=false;rate=1;playback.setRate(1);
    const chapter=current(),mode=playback.inspect().mode;
    if(chapter?.kind==='film'&&!['playing','loading'].includes(mode))play(chapter);
    mark();
  }
  function releaseSoon() {clearTimeout(releaseTimer);releaseTimer=setTimeout(release,RELEASE_MS);}
  function flush() {
    cancelAnimationFrame(scrollFrame);scrollFrame=0;
    const px=queued,gesture=burst;queued=0;burst=null;
    if(!px||gesture?.crossed)return;
    const chapter=current();if(!chapter)return;
    const direction=Math.sign(px),p=stage.progress(chapter.section);
    // Each gesture may enter one adjacent section. Its momentum cannot erase a
    // reading screen; the next gesture responds immediately, still in fast mode.
    if(chapter.kind==='reading'||(direction>0?p>=chapter.end-.0001:p<=chapter.start+.0001)){
      if(move(nextFrom(chapter,direction),direction<0)&&gesture)gesture.crossed=true;
      releaseSoon();return;
    }
    const clock=filmClock(chapter);
    const seconds=Math.max(-360,Math.min(360,px))/120*SECONDS_PER_NOTCH;
    const time=Math.max(0,Math.min(clock.total,clock.time(p)+seconds));
    stage.seekProgress(chapter.section,Math.max(chapter.start,Math.min(chapter.end,clock.progress(time))));
    mark();
  }
  function fastScroll(px,gesture) {
    if(gesture?.crossed){releaseSoon();return;}
    cancelPending();
    if(!scrubbing){playback.pause({capture:true});scrubbing=true;rate=1;playback.setRate(1);}
    queued+=px;burst=gesture;
    if(!scrollFrame)scrollFrame=requestAnimationFrame(flush);
    releaseSoon();
  }
  function gesture(direction,px=direction*120,source={}) {
    if(step>=3){fastScroll(px,source);return;}
    const chapter=current();if(!chapter)return;
    if(direction<0){move(nextFrom(chapter,-1)||{...chapter,start:0});return;}
    if(chapter.kind==='reading'){move(nextFrom(chapter,1));return;}
    step=Math.min(3,step+1);mark();
    if(step===3){fastScroll(px,source);return;}
    rate=step===2?2:1;playback.setRate(rate);
    if(step===1||!['playing','loading'].includes(playback.inspect().mode))play(chapter);
    releaseSoon();
  }
  const inField=target=>!!target.closest?.('input,textarea,select,[contenteditable="true"],dialog[open]');
  function scroller(target,direction) {
    const active=current()?.section;
    for(let node=target;node&&node!==body;node=node.parentElement){
      if(!node.contains||!active?.contains(node))continue;
      const max=node.scrollHeight-node.clientHeight;
      if(max>2&&/(auto|scroll)/.test(getComputedStyle(node).overflowY)&&
        (direction>0?node.scrollTop<max-2:node.scrollTop>2))return node;
    }
    return null;
  }
  addEventListener('wheel',event=>{
    if(reduced.matches||event.ctrlKey||inField(event.target)||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
    const now=performance.now(),px=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    if(!wheel||now-wheel.at>=QUIET_MS||Math.sign(px)!==wheel.direction)
      wheel={at:now,direction:Math.sign(px),native:!!scroller(event.target,Math.sign(px)),distance:0,used:false,crossed:false};
    wheel.at=now;
    if(wheel.native){if(!scroller(event.target,Math.sign(px)))event.preventDefault();return;}
    event.preventDefault();
    if(step>=3){fastScroll(px,wheel);return;}
    // The first two gestures each trigger once, but their full duration keeps
    // the temporary boost alive. After gesture three, every packet moves film.
    if(wheel.used){releaseSoon();return;}
    wheel.distance+=px;if(Math.abs(wheel.distance)<4)return;
    wheel.used=true;gesture(Math.sign(wheel.distance),wheel.distance,wheel);
  },{passive:false});
  addEventListener('touchstart',event=>{
    if(event.touches.length!==1){touch=null;return;}
    const t=event.touches[0];touch={x:t.clientX,y:t.clientY,lastY:t.clientY,used:false,native:null,crossed:false};
  },{passive:true});
  addEventListener('touchmove',event=>{
    if(!touch||event.touches.length!==1||reduced.matches||inField(event.target))return;
    const t=event.touches[0],dy=touch.y-t.clientY,dx=touch.x-t.clientX,delta=touch.lastY-t.clientY;
    touch.lastY=t.clientY;
    if(Math.abs(dx)>Math.abs(dy))return;
    if(touch.native===null&&Math.abs(dy)>=6)touch.native=!!scroller(event.target,Math.sign(dy));
    if(touch.native){if(!scroller(event.target,Math.sign(dy)))event.preventDefault();return;}
    event.preventDefault();
    if(!touch.used&&Math.abs(dy)>=SWIPE_PX){touch.used=true;gesture(Math.sign(dy),dy,touch);}
    else if(touch.used&&step>=3&&delta)fastScroll(delta,touch);
  },{passive:false});
  function touchEnd(){const used=touch?.used;touch=null;if(used)release();}
  addEventListener('touchend',touchEnd,{passive:true});
  addEventListener('touchcancel',touchEnd,{passive:true});
  const keyDirection=event=>['ArrowUp','PageUp'].includes(event.code)||(event.code==='Space'&&event.shiftKey)?-1:
    ['ArrowDown','PageDown','Space'].includes(event.code)?1:0;
  addEventListener('keydown',event=>{
    if(reduced.matches||inField(event.target)||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.target.closest?.('button,a')&&['Space','Enter'].includes(event.code))return;
    const direction=keyDirection(event);
    if(!direction){if(['Home','End'].includes(event.code))halt();return;}
    event.preventDefault();
    const reading=scroller(event.target,direction)||scroller(current()?.section,direction);
    if(reading){reading.scrollBy({top:direction*(event.code.startsWith('Arrow')?60:reading.clientHeight*.8),behavior:'smooth'});return;}
    if(event.repeat&&step<3)return;
    if(heldKey?.code!==event.code)heldKey={code:event.code,crossed:false};
    gesture(direction,direction*(event.code.startsWith('Arrow')?60:120),heldKey);
  });
  addEventListener('keyup',event=>{if(event.code===heldKey?.code){heldKey=null;release();}});
  document.addEventListener('stage:navigate',event=>{if(!event.detail?.beat)halt();});
  document.addEventListener('motion:playback',event=>{if(event.detail?.mode==='playing')playback.setRate(rate);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){touch=null;heldKey=null;halt();}});
  reduced.addEventListener('change',()=>{touch=null;heldKey=null;halt();});
  addEventListener('resize',()=>{touch=null;heldKey=null;halt();});
  const api={request:()=>gesture(1),back:()=>gesture(-1),chapters,current,next:()=>nextFrom(current(),1),
    get step(){return step;},get rate(){return rate;},get fast(){return step>=3;}};
  window.__beats=api;mark();return api;
}
