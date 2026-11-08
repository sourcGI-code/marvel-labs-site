// A visible opening starts without an input gesture. Preserve deep links and
// restored reading positions; only an unfinished, playing opening resumes.
export function installOpeningAutoplay({state,playback,readProgress,reduced}) {
  const params=new URLSearchParams(location.search);
  if(params.has('edit')||params.has('display')||params.has('review')||params.has('snapshot')||
    (location.hash&&location.hash!=='#top'))return;
  const end=.25;
  let pending=true,resume=false;
  const eligible=()=>!reduced.matches&&document.body.dataset.activeScene==='top'&&readProgress(state)<end-1e-4;
  function start(){
    if(document.hidden||(!pending&&!resume))return;
    pending=false;resume=false;
    if(eligible())playback.autoplay(state,{end,resume:true});
  }
  function remember(){
    const status=playback.inspect();
    if(eligible()&&status.section==='top'&&['playing','loading'].includes(status.mode))resume=true;
  }
  // Capture the running state before the scroll/player visibility handlers pause it.
  document.addEventListener('visibilitychange',()=>{if(document.hidden)remember();else start();},true);
  addEventListener('pagehide',()=>{remember();playback.pause();},true);
  addEventListener('pageshow',start);
  document.addEventListener('stage:navigate',()=>{pending=false;resume=false;});
  start();
}
