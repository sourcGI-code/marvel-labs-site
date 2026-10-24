// Owner 10-24: "move it off to the right then have it centered". During the arrival the parked trailer is centred in
// the open space to the RIGHT of the hero copy, on every screen: the copy block's right edge is measured, and the film
// is shifted (CSS --hero-shift on #hero-visual) so the trailer's centre lands halfway between that edge and the right
// of the screen. The trailer sits 2% of the film's width left of the frame centre (measured on the hold frame), and
// the film is cover-fitted at 16:10. The delivery hold (.is-comparing) and phones keep the film centred (popout.css).
const TRAILER_OFFSET=-.02, FILM_ASPECT=1.6, MIN_GAP=28;
export function installHeroFrame(){
 const root=document.documentElement,host=document.getElementById('hero-visual'),story=document.getElementById('platform-story');
 if(!host||!story)return;
 function measure(){
  if(innerWidth<=760){root.style.setProperty('--hero-shift','0px');return;}
  const box=host.getBoundingClientRect(),w=box.width||innerWidth,h=box.height||innerHeight;
  const film=Math.max(w,h*FILM_ASPECT);
  const copyRight=story.getBoundingClientRect().right;
  const trailerCentre=box.left+w/2+TRAILER_OFFSET*film;
  const target=copyRight+(innerWidth-copyRight)/2;
  // never push the trailer's left end into the copy, nor its right end off the screen
  const half=.17*film,lo=copyRight+MIN_GAP+half,hi=innerWidth-MIN_GAP-half;
  const centre=Math.min(hi,Math.max(lo,target));
  root.style.setProperty('--hero-shift',Math.max(0,Math.round(centre-trailerCentre))+'px');
 }
 measure();
 document.fonts?.ready?.then(measure);
 addEventListener('resize',measure);
 new ResizeObserver(measure).observe(story);
}
