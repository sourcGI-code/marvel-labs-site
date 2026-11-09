const section=document.querySelector('[data-reservation-layout="viewport"]');
if(section){
 const form=section.querySelector('.rv-rail');
 let queued=false;
 function fit(){
  queued=false;
  const landscape=innerWidth>=600&&innerHeight<=580;
  const mobile=innerWidth<=860&&!landscape;
  const margin=mobile?0:landscape?8:14;
  const available=Math.max(1,section.clientHeight-2*margin);
  const targetWidth=mobile?section.clientWidth:landscape?Math.min(430,section.clientWidth*.54):380;
  let scale=1;
  for(let pass=0;pass<3;pass++){
   section.style.setProperty('--reserve-scale',String(scale));
   form.style.width=`${targetWidth/scale}px`;
   const natural=form.getBoundingClientRect().height/scale;
   // Both trailers need a usable stage, including on short phones.
   const stage=mobile&&section.dataset.orderStep!=='review'?Math.min(240,available*.32):0;
   scale=Math.min(1,(available-stage)/Math.max(1,natural));
  }
  section.style.setProperty('--reserve-scale',String(scale));
  form.style.width=`${targetWidth/scale}px`;
  section.style.setProperty('--reserve-form-height',`${form.getBoundingClientRect().height}px`);
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
