// Scrolling builds speed; continued input can move through play, boost and fast
// travel without requiring artificial pauses between wheel gestures. Releasing
// drops the accumulated boost and resumes normal playback at the current frame.
import {DELIVERY_END} from './intro-timing.js?v=1';

export function installBeatScroll({stage,playback,getActive,readProgress}) {
  const params=new URLSearchParams(location.search);
  if(params.has('freescroll')||params.has('edit'))return null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body;
  const QUIET_MS=350,RELEASE_MS=220,SWIPE_PX=28,PHASE_DISTANCE=80,PHASE_MS=80;
  const SCROLL_SCALE=.95,SECONDS_PER_NOTCH=2*SCROLL_SCALE,BASE_TRAVEL_RATE=8*SCROLL_SCALE,MAX_INTENSITY=7;
  let step=0,rate=1,wheel=null,touch=null,heldKey=null,handoff=null;
  let pending=0,releaseTimer=0,epoch=0,scrubbing=false,scrollFrame=0,follow=null;
  let intensity=1,lastDirection=0;
  body.dataset.beatScroll='1';
  const sections=()=>[...document.querySelectorAll('main > section, body > .site-footer')];
  const chapters=()=>sections().map(section=>({section,start:section.id==='top'||section.id==='inside'?0:.15,
    end:section.id==='top'?DELIVERY_END:1,kind:['top','inside'].includes(section.id)?'film':'reading',key:section.id||'footer'}));
  const current=()=>chapters().find(c=>c.key===body.dataset.activeScene)||chapters()[0];
  function mark() {
    body.dataset.scrollStep=String(step);
    body.dataset.scrollFast=String(step>=3);
    body.dataset.scrollSpeed=(scrubbing?BASE_TRAVEL_RATE*intensity:rate).toFixed(2);
    body.dataset.scrollChapter=current()?.key||'';
  }
  function cancelPending() {epoch++;clearTimeout(pending);pending=0;}
  function halt({capture=true}={}) {
    stage.cancelTransition?.();handoff=null;delete body.dataset.sectionTransition;
    cancelPending();clearTimeout(releaseTimer);releaseTimer=0;
    cancelAnimationFrame(scrollFrame);scrollFrame=0;follow=null;scrubbing=false;intensity=1;lastDirection=0;
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
    const source=current();
    halt();
    document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+target.key,beat:true}}));
    const at=back&&target.kind==='film'?target.end:target.start;
    if(body.dataset.sectionTransitions==='slide'&&stage.transitionTo&&source?.key!==target.key){
      // Start at the finished scene's edge: its final film frame holds while
      // the next complete section travels upward, with no extra title drift.
      const reverse=sections().indexOf(target.section)<sections().indexOf(source.section);
      stage.seekProgress(source.section,reverse?0:1);
      const ticket={target};handoff=ticket;body.dataset.sectionTransition='true';
      stage.transitionTo(target.section,at).then(done=>{if(handoff!==ticket)return;handoff=null;delete body.dataset.sectionTransition;mark();if(done)releaseSoon();});
    }else stage.seekProgress(target.section,at);
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
    if(handoff){releaseTimer=setTimeout(release,100);return;}
    if(touch?.used||heldKey)return;
    cancelAnimationFrame(scrollFrame);scrollFrame=0;follow=null;scrubbing=false;intensity=1;lastDirection=0;rate=1;playback.setRate(1);
    const chapter=current(),mode=playback.inspect().mode;
    if(chapter?.kind==='film'&&!['playing','loading'].includes(mode))play(chapter);
    mark();
  }
  function releaseSoon() {clearTimeout(releaseTimer);releaseTimer=setTimeout(release,RELEASE_MS);}
  function crossed(source,direction) {
    if(source){source.crossed=true;source.crossedDirection=direction;source.crossedAt=performance.now();source.afterCross=0;}
  }
  function crossing(source,px) {
    if(!source?.crossed)return false;
    if(Math.sign(px)!==source.crossedDirection){source.crossed=false;return false;}
    source.afterCross=(source.afterCross||0)+Math.abs(px);
    // Consume a transition's immediate tail, but let sustained scrolling keep
    // going. A long wheel gesture must not lock the newly entered section.
    if(performance.now()-source.crossedAt<300||source.afterCross<160)return true;
    source.crossed=false;return false;
  }
  function flush(now=performance.now()) {
    scrollFrame=0;
    if(!scrubbing||!follow)return;
    const {chapter,clock}=follow;
    if(current()?.key!==chapter.key){halt({capture:false});return;}
    const dt=Math.min(.10,Math.max(.001,(now-follow.at)/1000));
    const delta=follow.target-follow.position;
    if(Math.abs(delta)<.015){
      follow.position=follow.target;
      const end=clock.progress(follow.position);
      stage.seekProgress(chapter.section,end);getActive()?.view?.setPlaybackProgress?.(end);
      return;
    }
    // Wait for the requested frame before issuing another seek. Scroll input
    // can add a bounded target, but it cannot send captions far ahead of video.
    const p=stage.progress(chapter.section);
    const video=chapter.key==='top'&&p<.25?document.querySelector('video.opening-film'):
      chapter.section.querySelector('video.recorded-scene');
    if(video?.seeking){scrollFrame=requestAnimationFrame(flush);return;}
    // Preserve elapsed time while decoding so slow seeks do not reduce scroll speed.
    follow.at=now;
    const distance=Math.sign(delta)*Math.min(Math.abs(delta)*(1-Math.exp(-dt/.07)),BASE_TRAVEL_RATE*intensity*dt);
    follow.position=Math.max(0,Math.min(clock.total,follow.position+distance));
    const next=Math.max(chapter.start,Math.min(chapter.end,clock.progress(follow.position)));
    stage.seekProgress(chapter.section,next);
    getActive()?.view?.setPlaybackProgress?.(next);
    mark();scrollFrame=requestAnimationFrame(flush);
  }
  function fastScroll(px,source) {
    // The section slide already absorbs its gesture tail. Count that input
    // while it is moving so the new section does not absorb the same tail again.
    if(handoff){crossing(source,px);releaseSoon();return;}
    if(crossing(source,px)){releaseSoon();return;}
    const chapter=current();if(!chapter)return;
    const direction=Math.sign(px),p=stage.progress(chapter.section);
    if(chapter.kind==='reading'||(direction>0?p>=chapter.end-.0001:p<=chapter.start+.0001)){
      if(move(nextFrom(chapter,direction),direction<0))crossed(source,direction);
      releaseSoon();return;
    }
    cancelPending();
    if(!scrubbing){
      playback.pause({capture:true});scrubbing=true;rate=1;playback.setRate(1);
      const clock=filmClock(chapter),position=clock.time(stage.progress(chapter.section));
      follow={chapter,clock,position,target:position,at:performance.now()};
    }
    if(!follow)return;
    if(lastDirection!==direction)intensity=1;
    lastDirection=direction;
    // Each new bit of scrolling adds speed. More input builds it faster, while
    // both travel speed and unconsumed distance remain bounded.
    const input=Math.max(-240,Math.min(240,px));
    intensity=Math.min(MAX_INTENSITY,intensity+Math.abs(input)/180);
    const seconds=input/120*SECONDS_PER_NOTCH*intensity;
    const lead=Math.max(2,intensity*1.25)*SCROLL_SCALE;
    // Reversing cancels any unconsumed movement immediately.
    if(Math.sign(follow.target-follow.position)!==direction)follow.target=follow.position;
    follow.target=Math.max(0,Math.min(follow.clock.total,
      Math.max(follow.position-lead,Math.min(follow.position+lead,follow.target+seconds))));
    if(!scrollFrame){follow.at=performance.now();scrollFrame=requestAnimationFrame(flush);}
    mark();releaseSoon();
  }
  function continueGesture(source,px) {
    if(crossing(source,px)){releaseSoon();return;}
    if(step>=3){fastScroll(px,source);return;}
    source.phaseDistance=(source.phaseDistance||0)+px;
    if(Math.abs(source.phaseDistance)>=PHASE_DISTANCE&&performance.now()-(source.phaseAt||0)>=PHASE_MS){
      const distance=source.phaseDistance;source.phaseDistance=0;source.phaseAt=performance.now();
      gesture(Math.sign(distance),distance,source);
    }
    releaseSoon();
  }
  function gesture(direction,px=direction*120,source={}) {
    if(handoff)return;
    if(step>=3){fastScroll(px,source);return;}
    const chapter=current();if(!chapter)return;
    if(direction<0){if(move(nextFrom(chapter,-1)||{...chapter,start:0}))crossed(source,direction);return;}
    if(chapter.kind==='reading'){if(move(nextFrom(chapter,1)))crossed(source,direction);return;}
    if(stage.progress(chapter.section)>=chapter.end-.0001){if(move(nextFrom(chapter,1)))crossed(source,direction);releaseSoon();return;}
    step=Math.min(3,step+1);mark();
    if(step===3){fastScroll(px,source);return;}
    rate=step===2?2*SCROLL_SCALE:1;playback.setRate(rate);
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
      wheel={at:now,direction:Math.sign(px),native:!!scroller(event.target,Math.sign(px)),distance:0,used:false,crossed:false,samples:[],inertia:false,lastMagnitude:0};
    wheel.at=now;
    // Re-check each packet: a reading panel owns input only while it can move.
    // At either edge, the same continuing gesture must reach the next scene.
    if(scroller(event.target,Math.sign(px))){wheel.native=true;return;}
    if(wheel.native){wheel.native=false;wheel.distance=0;wheel.used=false;}
    event.preventDefault();
    const magnitude=Math.abs(px),previous=wheel.lastMagnitude;wheel.lastMagnitude=magnitude;
    // Trackpads keep emitting a shrinking tail after the fingers lift. That
    // tail should release the film, not keep building acceleration.
    if(wheel.inertia){
      if(magnitude<=Math.max(6,previous*1.6))return;
      wheel.inertia=false;wheel.samples=[];
    }
    wheel.samples.push([now,magnitude]);wheel.samples=wheel.samples.slice(-6);
    const tail=wheel.samples;
    if(step>=3&&tail.length===6&&now-tail[0][0]<=350&&now-tail[0][0]>=70&&
      magnitude<tail[0][1]*.35&&tail.slice(1).every((s,i)=>s[1]<=tail[i][1]*1.05)){
      wheel.inertia=true;release();return;
    }
    if(step>=3){fastScroll(px,wheel);return;}
    // A held wheel/trackpad must accelerate too: do not discard every packet
    // after the first until the visitor waits 350 ms and starts another gesture.
    if(wheel.used){continueGesture(wheel,px);return;}
    wheel.distance+=px;if(Math.abs(wheel.distance)<4)return;
    wheel.used=true;wheel.phaseAt=now;gesture(Math.sign(wheel.distance),wheel.distance,wheel);
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
    if(Math.abs(dy)<6)return;
    const direction=Math.sign(delta||dy);
    if(scroller(event.target,direction)){touch.native=true;return;}
    if(touch.native){touch.native=false;touch.used=false;touch.y=t.clientY+delta;}
    event.preventDefault();
    const travel=touch.y-t.clientY;
    if(!touch.used&&Math.abs(travel)>=SWIPE_PX){touch.used=true;touch.phaseAt=performance.now();gesture(Math.sign(travel),travel,touch);}
    else if(touch.used&&delta)continueGesture(touch,delta);
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
    if(heldKey?.code!==event.code)heldKey={code:event.code,crossed:false};
    if(event.repeat&&performance.now()-(heldKey.phaseAt||0)<PHASE_MS)return;
    heldKey.phaseAt=performance.now();
    gesture(direction,direction*(event.code.startsWith('Arrow')?60:120),heldKey);
  });
  addEventListener('keyup',event=>{if(event.code===heldKey?.code){heldKey=null;release();}});
  document.addEventListener('stage:navigate',event=>{if(!event.detail?.beat)halt();});
  document.addEventListener('motion:playback',event=>{if(event.detail?.mode==='playing')playback.setRate(rate);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){touch=null;heldKey=null;halt();}});
  reduced.addEventListener('change',()=>{touch=null;heldKey=null;halt();});
  addEventListener('resize',()=>{touch=null;heldKey=null;halt();});
  const api={request:()=>gesture(1),back:()=>gesture(-1),chapters,current,next:()=>nextFrom(current(),1),
    get step(){return step;},get rate(){return rate;},get fast(){return step>=3;},
    get scrollSpeed(){return scrubbing?BASE_TRAVEL_RATE*intensity:rate;}};
  window.__beats=api;mark();return api;
}
