// A deliberate gesture plays, accelerates, then skips one chapter. Wheel packet
// size never triggers a skip, and the tail of a gesture belongs to its origin.
import {DELIVERY_END} from './intro-timing.js?v=1';

export function installBeatScroll({stage,playback,getActive,readProgress}) {
  const params=new URLSearchParams(location.search);
  if(params.has('freescroll')||params.has('edit'))return null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body;
  const QUIET_MS=350,SWIPE_PX=28;
  let owner='',step=0,rate=1,wheel=null,touch=null,pending=0,epoch=0;
  body.dataset.beatScroll='1';
  const sections=()=>[...document.querySelectorAll('main > section, body > .site-footer')];
  function chapters() {
    return sections().flatMap(section=>{
      let spans;
      if(section.id==='top')spans=[[0,DELIVERY_END,'film']];
      else if(section.id==='inside')spans=[[0,1,'film']];
      else if(section.id==='app'){
        const n=section.querySelectorAll('.crew-beats li').length||1;
        spans=Array.from({length:n},(_,i)=>[.15+i*.85/n,i+1<n?.15+(i+1)*.85/n:1,'phone']);
      }else spans=[[.15,1,'reading']];
      return spans.map(([start,end,kind],index)=>({section,start,end,kind,index,key:`${section.id||'footer'}:${index}`}));
    });
  }
  function current() {
    const list=chapters(),local=list.filter(c=>(c.section.id||'footer')===body.dataset.activeScene);
    const p=local.length?stage.progress(local[0].section):0;
    return local.filter(c=>p>=c.start-.002).at(-1)||local[0]||list[0];
  }
  function mark() {body.dataset.scrollStep=String(step);body.dataset.scrollChapter=owner;}
  function clear() {
    epoch++;clearTimeout(pending);pending=0;owner='';step=0;rate=1;
    playback.setRate(1);
    const phone=document.querySelector('#app .crew-film video');if(phone)phone.playbackRate=1;
    delete body.dataset.beatStep;mark();
  }
  function halt() {playback.pause({capture:true});clear();}
  function play(chapter) {
    if(chapter.kind==='phone'){
      const video=chapter.section.querySelector('.crew-film video');
      if(video){video.playbackRate=rate;if(video.paused)chapter.section.querySelectorAll('.crew-beats button')[chapter.index]?.click();}
      return;
    }
    if(chapter.kind!=='film')return;
    // A scroll can arrive before a lazily loaded scene has prepared its video.
    // Retain that request without advancing the timeline through missing frames.
    const mine=++epoch,until=performance.now()+15000;
    clearTimeout(pending);
    const begin=()=>{
      pending=0;
      if(mine!==epoch||current()?.key!==chapter.key||reduced.matches)return;
      const active=getActive();
      if(active?.track===chapter.section&&active.view?.preparePlayback){
        playback.setRate(rate);
        if(readProgress(active)<chapter.end-.0001)playback.playTo(chapter.end);
      }else if(performance.now()<until)pending=setTimeout(begin,100);
    };
    begin();
  }
  function move(target) {
    if(!target)return false;
    halt();
    document.dispatchEvent(new CustomEvent('stage:navigate',{detail:{hash:'#'+(target.section.id||'footer'),beat:true}}));
    stage.seekProgress(target.section,target.start);
    // Arrive at one destination. Never spend the same gesture again there.
    return true;
  }
  function nextFrom(chapter,direction) {
    const list=chapters(),index=list.findIndex(c=>c.key===chapter.key);
    return list[index+direction];
  }
  function gesture(direction) {
    const chapter=current();if(!chapter)return;
    if(direction<0){
      // One upward gesture returns to one preceding stop, without inertia
      // crossing multiple sections or rewinding ten seconds per wheel packet.
      move(nextFrom(chapter,-1)||{...chapter,start:0});return;
    }
    if(chapter.kind==='reading'){move(nextFrom(chapter,1));return;}
    if(owner!==chapter.key){clear();owner=chapter.key;}
    step=Math.min(3,step+1);mark();
    if(step===3){move(nextFrom(chapter,1));return;}
    rate=step===2?2:1;playback.setRate(rate);
    // The first gesture resumes at the current frame, including load-time
    // autoplay. The second changes speed without seeking or restarting.
    if(step===1||!['playing','loading'].includes(playback.inspect().mode)||chapter.kind==='phone')play(chapter);
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
    const fresh=!wheel||now-wheel.at>=QUIET_MS;
    if(fresh)wheel={at:now,native:!!scroller(event.target,Math.sign(px)),distance:0,used:false};
    wheel.at=now;
    // A gesture that starts within reading content stays there even if it
    // reaches the bottom; overscroll cannot become a chapter skip.
    if(wheel.native){if(!scroller(event.target,Math.sign(px)))event.preventDefault();return;}
    event.preventDefault();
    if(wheel.used)return;
    wheel.distance+=px;
    if(Math.abs(wheel.distance)<4)return;
    wheel.used=true;gesture(Math.sign(wheel.distance));
  },{passive:false});
  addEventListener('touchstart',event=>{
    if(event.touches.length!==1){touch=null;return;}
    const t=event.touches[0];touch={x:t.clientX,y:t.clientY,used:false,native:null};
  },{passive:true});
  addEventListener('touchmove',event=>{
    if(!touch||event.touches.length!==1||reduced.matches||inField(event.target))return;
    const t=event.touches[0],dy=touch.y-t.clientY,dx=touch.x-t.clientX;
    if(Math.abs(dx)>Math.abs(dy))return;
    if(touch.native===null&&Math.abs(dy)>=6)touch.native=!!scroller(event.target,Math.sign(dy));
    if(touch.native){if(!scroller(event.target,Math.sign(dy)))event.preventDefault();return;}
    event.preventDefault();
    if(!touch.used&&Math.abs(dy)>=SWIPE_PX){touch.used=true;gesture(Math.sign(dy));}
  },{passive:false});
  addEventListener('touchend',()=>{touch=null;},{passive:true});
  addEventListener('touchcancel',()=>{touch=null;},{passive:true});
  addEventListener('keydown',event=>{
    if(reduced.matches||inField(event.target)||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.target.closest?.('button,a')&&['Space','Enter'].includes(event.code))return;
    const direction=['ArrowUp','PageUp'].includes(event.code)||(event.code==='Space'&&event.shiftKey)?-1:['ArrowDown','PageDown','Space'].includes(event.code)?1:0;
    if(!direction){if(['Home','End'].includes(event.code))halt();return;}
    event.preventDefault();if(event.repeat)return;
    const reading=scroller(event.target,direction)||scroller(current()?.section,direction);
    if(reading){reading.scrollBy({top:direction*(event.code.startsWith('Arrow')?60:reading.clientHeight*.8),behavior:'smooth'});return;}
    gesture(direction);
  });
  document.addEventListener('stage:navigate',event=>{if(!event.detail?.beat)halt();});
  // A second gesture may arrive while the video is still buffering. Apply
  // the selected rate when it starts, without spending another gesture.
  document.addEventListener('motion:playback',event=>{
    if(event.detail?.mode==='playing'&&owner===current()?.key)playback.setRate(rate);
  });
  reduced.addEventListener('change',halt);
  addEventListener('resize',halt);
  const api={request:()=>gesture(1),back:()=>gesture(-1),chapters,current,next:()=>nextFrom(current(),1),get step(){return step;},get rate(){return rate;}};
  window.__beats=api;mark();return api;
}
