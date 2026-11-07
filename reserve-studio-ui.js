const sec=document.querySelector('.reserve-stage'),title=sec.querySelector('#rv-title');
function refresh(){
 const step=sec.dataset.orderStep||'configure';
 const labels={configure:'Make it yours.',details:'Your details.',review:'Review your trailer.',complete:'Your reservation.',manage:'Your reservation.'};
 title.textContent=labels[step]||'Your trailer.';
 sec.querySelector('[data-studio-size]').textContent=`${sec.dataset.size||'20'} ft`;
 if(step==='configure'){
  const button=sec.querySelector('.rv-submit');button.firstChild.textContent=`Continue with ${sec.dataset.size||'20'} ft `;
  if(window.MARVEL_RESERVE?.mode==='demo') sec.querySelector('.rv-pay-note').textContent='Demo checkout · no payment taken';
 }
}
new MutationObserver(refresh).observe(sec,{attributes:true,attributeFilter:['data-size','data-order-step']});
refresh();
