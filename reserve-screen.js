const section=document.querySelector('[data-reservation-layout="viewport"]');
if(section){
 const form=section.querySelector('.rv-rail');
 let queued=false;
 function fit(){
  queued=false;
  const landscape=innerWidth>=600&&innerHeight<=580;
  const mobile=matchMedia('(max-width:860px), (max-aspect-ratio:4/5)').matches&&!landscape;
  const margin=mobile?0:Math.max(8,Math.min(section.clientWidth,section.clientHeight)*.018);
  const available=Math.max(1,section.clientHeight-2*margin);
  const targetWidth=mobile?section.clientWidth:landscape?section.clientWidth*.47:Math.min(section.clientWidth*.36,Math.max(section.clientWidth*.26,available*.48));
  // Use the full panel allocation on every screen, including large monitors.
  // The portrait layout preserves a separate stage above the form.
  const targetHeight=available*(mobile?(section.dataset.orderStep==='review'?.9:.68):1);
  section.dataset.reservationStacked=String(mobile);
  section.style.setProperty('--reserve-panel-inset',`${margin}px`);
  section.style.setProperty('--reserve-panel-right',`${margin+targetWidth}px`);
  function measure(scale){
   section.style.setProperty('--reserve-scale',String(scale));
   form.style.width=`${targetWidth/scale}px`;
   return form.getBoundingClientRect().height;
  }
  // Text reflows as it grows. Find the largest readable scale that fits rather
  // than capping it at 1 or oscillating between wrapped and unwrapped heights.
  let low=.1,high=Math.max(low,targetWidth/260);
  for(let pass=0;pass<12;pass++){
   const scale=(low+high)/2;
   if(measure(scale)<=targetHeight-1)low=scale;else high=scale;
  }
  section.style.setProperty('--reserve-form-height',`${measure(low)}px`);
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(fit);}}
 new ResizeObserver(schedule).observe(section);
 new MutationObserver(schedule).observe(form,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled']});
 new MutationObserver(schedule).observe(section,{attributes:true,attributeFilter:['data-order-step']});
 document.fonts?.ready.then(schedule);
 window.visualViewport?.addEventListener('resize',schedule);
 window.addEventListener('resize',schedule);
 fit();
}
