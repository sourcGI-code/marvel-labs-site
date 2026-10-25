// Owner direction: keep the headline visible throughout the introduction.
// The final camera framing still settles only after the pickup clears the view.
export const arrivalRevealTime=0;
const framingSettleTime=9.1;
export function createArrivalReveal({reduced}){
 const root=document.documentElement;
 const host=document.getElementById('hero-visual');
 const editing=new URLSearchParams(location.search).has('edit');
 const overlays=[...document.querySelectorAll('.masthead,#mobile-menu,#platform-story,.hero-base,#capacity-labels,#capacity-summary,#platform-status')];
 let quiet=null,lastScale='';
 function show(value){
  if(value===quiet)return;
  quiet=value;root.classList.toggle('arrival-quiet',value);
  for(const el of overlays){
   if(value&&el.contains(document.activeElement))document.activeElement.blur();
   el.inert=value;
  }
 }
 return {
  update({active,progress,time=0,failed=false,ready=false,deliveryVisible=false,live=false,blocked=false}){
   const seconds=Math.max(0,Math.min(10,progress*40));
   // A phone that refused autoplay shows the poster with the headline and the tap-to-play pill, not a bare poster.
   // Owner 10-24: the headline never hides while the film loads. Hiding it until the film was ready made it flicker on a
   // first visit (painted by the HTML, hidden by the script, faded back); the poster under it is the film's first frame.
   const waiting=!blocked&&arrivalRevealTime>0&&(seconds<arrivalRevealTime||(!live&&!deliveryVisible&&(!ready||time<arrivalRevealTime)));
   show(active&&!editing&&!reduced.matches&&!failed&&waiting);
   // Fill the screen during the approach, then ease into the exact cargo-film
   // framing. At the handoff both films still use the identical projection.
   const aspect=(host?.clientWidth||innerWidth)/(host?.clientHeight||innerHeight),filmAspect=innerWidth<=760?.5:1.6;
   const fill=Math.max(aspect/filmAspect,filmAspect/aspect);
   const t=Math.max(0,Math.min(1,(seconds-framingSettleTime)/(10-framingSettleTime)));
   const settle=t*t*(3-2*t);
   // On the film's own container and only when it changes: a page-wide variable restyled the whole page every frame.
   const scale=String(editing||reduced.matches?1:Math.round((1+(fill-1)*(1-settle))*10000)/10000);
   if(scale!==lastScale){lastScale=scale;(host||root).style.setProperty('--arrival-film-scale',scale);}
  },
  clear(){show(false);},
  get quiet(){return quiet;}
 };
}
