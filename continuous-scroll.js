// Scrolling builds speed; continued input can move through play, boost and fast
// travel without requiring artificial pauses between wheel gestures. Releasing
// drops the accumulated boost and resumes normal playback at the current frame.
// Touch (owner 11-20: "a little scroll like nudges the animation and that sucks for
// people who dont use the whole screen to scroll"): a swipe sets the speed from how
// FAST the finger moves, not how far, and the film or the text panel keeps coasting
// after the finger lifts, the way an ordinary page does after a flick.
// Distance (owner 11-25, laptop and phone: "if I want to scroll like even a little bit it jitters the animation, it seems
// to hold onto the distance of the scroll and so if I short scroll it doesnt work"): a scroll now moves a film by the
// scroll's own length, both ways, and the film stops on that frame. Before, any forward input started the film and it
// played on to the end of the chapter; the third gesture switched every later scroll to a fast mode for good; and the
// speed jumped 1x -> 1.9x -> 8x -> 1x as those modes changed. Now the film's speed follows the distance still to go
// (so it tracks a steady scroll without stopping between packets) and eases out when the scroll ends. A phone flick
// adds the momentum a normal page would get, so a quick short flick still carries the film (owner 11-20).
import {DELIVERY_END} from './intro-timing.js?v=1';

export function installBeatScroll({stage,playback,getActive,readProgress}) {
  const params=new URLSearchParams(location.search);
  if(params.has('freescroll')||params.has('edit'))return null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body;
  const touchFirst=matchMedia('(hover:none) and (pointer:coarse)');
  const QUIET_MS=350,RELEASE_MS=220,PHASE_MS=80;
  const MAX_RATE=8;
  // Wheel and trackpad scrolling back (owner 11-21: "scrolling up doesnt work that well"): each 100 px (one notch)
  // takes the film back REWIND_PER_NOTCH seconds, and the rewind runs until it reaches that frame, at the speed that
  // covers the distance in about FOLLOW_S seconds. Before, the rewind stopped 220 ms after the last notch, which
  // cancelled the reversed copy while it was still seeking into place (about 0.6 s): 1-3 notches did nothing and
  // 10 notches went back 4 s after a 0.65 s wait, while 3 notches forward moved 2.3 s at once.
  const REWIND_PER_NOTCH=1.5;
  // The same distance forward (11-25). Touch: film seconds per px of finger travel, and a flick's momentum = its
  // finger speed (px/ms) x MOMENTUM_MS more px, about what a phone page coasts after the same flick.
  const WHEEL_SECONDS_PER_PX=REWIND_PER_NOTCH/100,TOUCH_SECONDS_PER_PX=.01,MOMENTUM_MS=500;
  // How closely the film follows the scroll (owner 11-25, after the first distance version: "scrolling up is a problem"):
  // with .45 s and a .25x floor every scroll ended in about a second of choppy slow motion (a 30 fps film at .25x shows a
  // new picture every 133 ms) and the film went on moving well after the scroll stopped. Now it settles about 0.3 s
  // after the last packet and never drops below half speed.
  const FOLLOW_S=.15,MIN_RATE=.5;
  let drive=null,driveFrame=0;   // a film heading for the frame the scroll asked for: {key, target (film s), direction, free}
  // Speed = distance left / FOLLOW_S: a steady scroll keeps the film moving at the scroll's pace without reaching
  // its stop (no pause and restart between packets), and when the scroll ends it slows and stops on that frame.
  // free: the film was already playing on its own further than this scroll (the opening's autoplay): only speed it up.
  function steer() {
    driveFrame=0;
    if(!drive)return;
    const chapter=current(),state=playback.inspect();
    if(chapter?.key!==drive.key||state.mode==='paused'){endDrive();return;}
    const at=filmClock(chapter).time(stage.progress(chapter.section)),left=drive.direction*(drive.target-at);
    rate=Math.min(MAX_RATE,Math.max(drive.free?1:MIN_RATE,left/FOLLOW_S));playback.setRate(rate);mark();
    driveFrame=requestAnimationFrame(steer);
  }
  function endDrive() {drive=null;cancelAnimationFrame(driveFrame);driveFrame=0;rate=1;playback.setRate(1);mark();}
  // Move the film px of scroll (sign = direction). False when it cannot play there (caller falls back to seeking).
  function travel(px,source) {
    const chapter=current(),direction=Math.sign(px),clock=filmClock(chapter);
    const at=clock.time(stage.progress(chapter.section)),state=playback.inspect();
    const moving=state.mode!=='paused'&&!!state.reverse===(direction<0);
    const same=moving&&drive?.key===chapter.key&&drive.direction===direction;
    const per=source?.touch?TOUCH_SECONDS_PER_PX:WHEEL_SECONDS_PER_PX;
    const target=Math.max(clock.time(chapter.start),Math.min(clock.time(chapter.end),(same?drive.target:at)+px*per));
    const stop=clock.progress(target);
    let free=false;
    if(moving){
      // Already going this way: move its stop on (a restart would seek and wait for the decoder again).
      if(direction>0)free=!playback.extendTo(stop)&&(same?drive.free:true);
      else playback.retarget?.(stop);
    }else if(!(direction>0?playback.playTo(stop):playback.rewindTo(stop)))return Math.abs(target-at)<1e-3;
    drive={key:chapter.key,target,direction,free};
    // The starting speed now (steer refines it every frame): a film that is still starting picks it up as it plays.
    rate=Math.min(MAX_RATE,Math.max(free?1:MIN_RATE,Math.abs(target-at)/FOLLOW_S));playback.setRate(rate);
    if(!driveFrame)driveFrame=requestAnimationFrame(steer);
    mark();return true;
  }
  // Touch: speed of the finger in px/ms below which a lift is not a flick; a finger resting on a moving film stops it.
  const FLICK_MIN=.12,FLICK_IDLE_MS=90,PANEL_COAST_MS=420;
  let rate=1,wheel=null,touch=null,heldKey=null,handoff=null;
  let pending=0,releaseTimer=0,epoch=0,scrubbing=false,scrollFrame=0,follow=null;
  let lastDirection=0,coast=null,coastFrame=0,holdTimer=0;
  body.dataset.beatScroll='1';
  const sections=()=>[...document.querySelectorAll('main > section, body > .site-footer')];
  const chapters=()=>sections().map(section=>({section,start:section.id==='top'||section.id==='inside'?0:.15,
    end:section.id==='top'?DELIVERY_END:1,kind:['top','inside'].includes(section.id)?'film':'reading',key:section.id||'footer'}));
  const current=()=>chapters().find(c=>c.key===body.dataset.activeScene)||chapters()[0];
  function mark() {
    body.dataset.scrollSpeed=rate.toFixed(2);
    body.dataset.scrollChapter=current()?.key||'';
  }
  function cancelPending() {epoch++;clearTimeout(pending);pending=0;}
  function halt({capture=true}={}) {
    stage.cancelTransition?.();handoff=null;delete body.dataset.sectionTransition;
    cancelPending();clearTimeout(releaseTimer);releaseTimer=0;
    cancelCoast();
    cancelAnimationFrame(scrollFrame);scrollFrame=0;follow=null;scrubbing=false;lastDirection=0;drive=null;cancelAnimationFrame(driveFrame);driveFrame=0;
    playback.pause({capture});rate=1;playback.setRate(1);mark();
  }
  function cancelCoast() {cancelAnimationFrame(coastFrame);coastFrame=0;coast=null;clearTimeout(holdTimer);holdTimer=0;}
  // Text panels (the numbers, sizes, founding) get the same momentum. It stops at
  // the panel's edge: only a new swipe moves on to the next section.
  function coastPanel(target,velocity) {
    let speed=velocity,last=performance.now();
    coast={kind:'panel',direction:Math.sign(velocity),rate:1};
    const tick=now=>{
      coastFrame=0;
      if(!coast)return;
      const dt=Math.min(34,now-last);last=now;
      const direction=Math.sign(speed),chapter=current();
      const panel=!handoff&&readingChapter()&&(scroller(target,direction)||scroller(chapter.section,direction));
      if(!panel){cancelCoast();return;}
      const max=panel.scrollHeight-panel.clientHeight;
      panel.scrollTop=Math.max(0,Math.min(max,panel.scrollTop+speed*dt));speed*=Math.exp(-dt/PANEL_COAST_MS);
      if(Math.abs(speed)<.03){cancelCoast();return;}
      coastFrame=requestAnimationFrame(tick);
    };
    coastFrame=requestAnimationFrame(tick);
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
  // A film with a reversed copy is twice as long as the film itself; its own length is stated on the element.
  const duration=(video,fallback)=>{const own=Number(video?.dataset?.filmDuration);return own>0?own:Number.isFinite(video?.duration)&&video.duration>0?video.duration:fallback;};
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
    clearTimeout(releaseTimer);releaseTimer=0;
    if(handoff){releaseTimer=setTimeout(release,100);return;}
    // A film still heading for the frame the scroll asked for gets there by itself and stops (11-25: nothing plays
    // on after the scroll ends).
    if(drive||scrubbing&&follow){mark();return;}
    // A finger resting on the screen keeps a seeking fallback where it is.
    if(touch?.used||heldKey){if(!scrubbing){rate=1;playback.setRate(1);mark();}return;}
    cancelAnimationFrame(scrollFrame);scrollFrame=0;follow=null;scrubbing=false;rate=1;playback.setRate(1);mark();
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
    const dt=Math.min(.25,Math.max(.001,(now-follow.at)/1000));
    const delta=follow.target-follow.position;
    if(Math.abs(delta)<.015){
      follow.position=follow.target;
      const end=clock.progress(follow.position);
      stage.seekProgress(chapter.section,end);getActive()?.view?.setPlaybackProgress?.(end);
      // There: the scrub is over (the next scroll starts from this frame).
      follow=null;scrubbing=false;rate=1;mark();
      return;
    }
    // Wait for the requested frame before issuing another seek. Scroll input
    // can add a bounded target, but it cannot send captions far ahead of video.
    const p=stage.progress(chapter.section);
    const video=chapter.key==='top'&&p<.25?document.querySelector('video.opening-film'):
      chapter.section.querySelector('video.recorded-scene');
    if(video?.seeking){scrollFrame=requestAnimationFrame(flush);return;}
    // Each seek takes the picture part of the way (the same FOLLOW_S as playback), however long the last seek took:
    // 11-25 the old 1/30 s step at 1x covered a third of the distance at the speed seeks allow.
    follow.at=now;
    const distance=Math.sign(delta)*Math.min(Math.abs(delta)*(1-Math.exp(-dt/FOLLOW_S)),MAX_RATE*dt);
    follow.position=Math.max(0,Math.min(clock.total,follow.position+distance));
    const next=Math.max(chapter.start,Math.min(chapter.end,clock.progress(follow.position)));
    stage.seekProgress(chapter.section,next);
    getActive()?.view?.setPlaybackProgress?.(next);
    mark();scrollFrame=requestAnimationFrame(flush);
  }
  function fastScroll(px,source) {
    // One touch gesture may enter one new section; its trailing motion must
    // not immediately skip the section that just came into view.
    if(source?.touch&&source.crossed){releaseSoon();return;}
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
    lastDirection=direction;cancelCoast();
    const state=playback.inspect();
    // Played by the decoder both ways (forward the film itself, back its reversed copy): smooth, no seek per picture.
    // A left-over error (a film paused from outside, a slow start) gets one new attempt per gesture: starting the
    // film clears it. Only a refused autoplay, or a second failure in the same gesture, falls back to seeking.
    const retry=!!state.error&&!source?.retried;if(retry&&source)source.retried=true;
    const playable=(!state.error||retry)&&!state.blocked&&!document.hidden&&(direction>0||!reduced.matches&&playback.canRewind?.());
    if(playable&&travel(px,source)){
      cancelAnimationFrame(scrollFrame);scrollFrame=0;follow=null;scrubbing=false;
      mark();releaseSoon();return;
    }
    {
      // Fallback: a film that will not play (refused autoplay, no reversed copy) is moved by seeking, the same
      // distance a played film would move.
      if(!scrubbing){
        cancelPending();drive=null;playback.pause();scrubbing=true;
        const clock=filmClock(chapter),position=clock.time(stage.progress(chapter.section));
        follow={chapter,clock,position,target:position,at:performance.now()};
      }
      const per=source?.touch?TOUCH_SECONDS_PER_PX:WHEEL_SECONDS_PER_PX,clock=follow.clock;
      follow.target=Math.max(clock.time(chapter.start),Math.min(clock.time(chapter.end),follow.target+px*per));
      if(!scrollFrame){follow.at=performance.now();scrollFrame=requestAnimationFrame(flush);}
    }
    mark();releaseSoon();
  }
  function gesture(direction,px=direction*120,source={}) {
    if(handoff)return;
    fastScroll(px,source);
  }
  const inField=target=>!!target?.closest?.('input,textarea,select,[contenteditable="true"],dialog[open],#mobile-menu,.menu-button')||!!document.querySelector('#mobile-menu:not([hidden])');
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
  const readingChapter=()=>['story','sizes','founding'].includes(current()?.key);
  function scrollReading(target,px,source){
    if(!readingChapter())return false;
    if(handoff||source?.touch&&source.crossed)return true;
    const chapter=current(),direction=Math.sign(px);
    const panel=scroller(target,direction)||scroller(chapter.section,direction);
    let remaining=Math.abs(px);
    if(panel){
      const max=panel.scrollHeight-panel.clientHeight;
      const available=direction>0?max-panel.scrollTop:panel.scrollTop;
      const used=Math.min(remaining,Math.max(0,available));
      panel.scrollTop=Math.max(0,Math.min(max,panel.scrollTop+direction*used));
      remaining-=used;
      // Reading real content consumes the previous scene's gesture tail.
      if(used>0&&source)source.crossed=false;
    }
    if(remaining>2&&!crossing(source,direction*remaining)){
      if(move(nextFrom(chapter,direction),direction<0))crossed(source,direction);
    }
    return true;
  }
  addEventListener('wheel',event=>{
    if(reduced.matches||event.ctrlKey||inField(event.target)||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
    const now=performance.now(),px=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    if(!wheel||now-wheel.at>=QUIET_MS||Math.sign(px)!==wheel.direction)
      wheel={at:now,direction:Math.sign(px),native:!!scroller(event.target,Math.sign(px)),crossed:false};
    wheel.at=now;
    // Re-check each packet: a reading panel owns input only while it can move.
    // At either edge, the same continuing gesture must reach the next scene.
    if(!readingChapter()&&scroller(event.target,Math.sign(px))){wheel.native=true;return;}
    if(wheel.native)wheel.native=false;
    event.preventDefault();
    // Every packet counts, including a trackpad's own momentum tail: that is the page's ordinary coast.
    if(scrollReading(event.target,px,wheel))return;
    fastScroll(px,wheel);
  },{passive:false});
  addEventListener('touchstart',event=>{
    if(event.touches.length!==1){touch=null;return;}
    const t=event.touches[0];touch={x:t.clientX,y:t.clientY,lastY:t.clientY,used:false,native:null,axis:null,crossed:false,touch:true,
      at:performance.now(),movedAt:0,velocity:0,reading:false,target:event.target};
    // A finger resting on a coasting film or panel stops it, like catching a
    // moving page. A new swipe replaces the coast as soon as it moves.
    clearTimeout(holdTimer);holdTimer=0;
    if(coast||drive||scrubbing)holdTimer=setTimeout(()=>{holdTimer=0;if(touch?.used)return;if(coast)cancelCoast();if(drive||scrubbing)halt();},160);
  },{passive:true});
  addEventListener('touchmove',event=>{
    if(!touch||event.touches.length!==1||reduced.matches||inField(event.target))return;
    const t=event.touches[0],dy=touch.y-t.clientY,dx=touch.x-t.clientX,delta=touch.lastY-t.clientY;
    touch.lastY=t.clientY;
    if(!touch.axis){
      if(Math.max(Math.abs(dx),Math.abs(dy))<6)return;
      touch.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
    }
    if(touch.axis==='x')return;
    const direction=Math.sign(delta||dy);
    // Safari commits a gesture to a native scrolling panel. Never steal it
    // halfway through: reaching its edge is followed by a new page swipe.
    if(touch.native===null)touch.native=!readingChapter()&&!!scroller(event.target,direction);
    if(touch.native||!event.cancelable)return;
    event.preventDefault();
    // Touch controls the film immediately; the three-step wheel behavior is
    // only for a mouse/trackpad. A long swipe covers more of the film.
    const travel=touch.used?delta:dy;
    // Finger speed in px/ms, positive forward. Averaged over the last moves
    // so one late or early event does not decide the flick.
    const now=performance.now(),instant=travel/Math.max(8,now-(touch.movedAt||touch.at));
    touch.velocity=touch.used?touch.velocity*.55+instant*.45:instant;touch.movedAt=now;
    touch.used=true;
    if(scrollReading(event.target,travel,touch)){
      // The panel follows the finger itself; an older coast must not fight it.
      if(coast?.kind==='panel')cancelCoast();
      touch.reading=true;return;
    }
    touch.reading=false;
    if(travel)fastScroll(travel,touch);
  },{passive:false});
  function touchEnd(){
    const ended=touch;touch=null;
    if(!ended?.used){
      // A tap on a coasting film or panel stops it.
      if(ended&&coast)cancelCoast();
      return;
    }
    const flick=performance.now()-ended.movedAt<FLICK_IDLE_MS&&Math.abs(ended.velocity)>=FLICK_MIN;
    if(ended.reading){if(flick&&!ended.crossed)coastPanel(ended.target,ended.velocity);return;}
    // A finger that stopped before lifting leaves the film where it is; a flick carries it on by the momentum a page
    // would have, then it stops there.
    if(flick&&!ended.crossed&&!reduced.matches&&(drive||scrubbing)&&lastDirection===Math.sign(ended.velocity))fastScroll(ended.velocity*MOMENTUM_MS,{touch:true});
    else release();
  }
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
  // Text selection must not race a moving film or an outstanding section slide.
  // Stop only the motion; the next scroll remains immediately usable.
  const pageText=target=>target?.nodeType===1?target.closest('main,.site-footer,.masthead'):target?.parentElement?.closest('main,.site-footer,.masthead');
  function stopForSelection(){wheel=null;touch=null;heldKey=null;halt({capture:false});}
  document.addEventListener('selectstart',event=>{if(pageText(event.target)&&!inField(event.target))stopForSelection();});
  document.addEventListener('copy',event=>{
    const selection=document.getSelection();
    if(!event.clipboardData||!selection||selection.isCollapsed||!pageText(selection.anchorNode)||!pageText(selection.focusNode))return;
    if(inField(selection.anchorNode?.parentElement))return;
    const text=selection.toString();if(!text)return;
    stopForSelection();
    // Avoid serializing the animated page, video layers and computed styling
    // into a rich clipboard fragment. The selected wording stays unchanged.
    event.clipboardData.setData('text/plain',text);event.preventDefault();
  });
  document.addEventListener('keydown',event=>{
    if(!(event.ctrlKey||event.metaKey)||event.altKey||event.code!=='KeyA'||inField(event.target))return;
    if(!pageText(event.target)&&event.target!==body&&event.target!==document.documentElement)return;
    const section=current()?.section;if(!section)return;
    stopForSelection();const range=document.createRange();range.selectNodeContents(section);
    const selection=document.getSelection();selection.removeAllRanges();selection.addRange(range);event.preventDefault();
  });
  document.addEventListener('stage:navigate',event=>{if(!event.detail?.beat)halt();});
  document.addEventListener('motion:playback',event=>{
    if(event.detail?.mode==='playing')playback.setRate(rate);
    // The wheel rewind reached its frame (or was stopped): later input starts from the frame on screen.
    if(event.detail?.mode==='paused'&&drive)endDrive();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){touch=null;heldKey=null;halt();}});
  reduced.addEventListener('change',()=>{touch=null;heldKey=null;halt();});
  let viewportWidth=innerWidth;
  addEventListener('resize',()=>{
    const widthChanged=Math.abs(innerWidth-viewportWidth)>1;viewportWidth=innerWidth;
    // Safari's address bar changes height during a swipe. It is not a new
    // screen orientation and must not cancel touch input or stop the film.
    if(touchFirst.matches&&!widthChanged)return;
    touch=null;heldKey=null;halt();
  });
  const api={request:()=>gesture(1),back:()=>gesture(-1),chapters,current,next:()=>nextFrom(current(),1),
    get rate(){return rate;},get driving(){return drive?{...drive}:null;},
    get scrollSpeed(){return rate;},get coasting(){return coast?.kind||'';},
    // For checks: what the film player is doing and whether this film can rewind by playback.
    get playback(){return {...playback.inspect(),canRewind:!!playback.canRewind?.()};}};
  window.__beats=api;mark();return api;
}
