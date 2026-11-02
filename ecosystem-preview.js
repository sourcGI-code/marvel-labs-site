document.documentElement.classList.add('js');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const menu=document.querySelector('.menu-toggle'),mobileNav=document.querySelector('#small-nav');
function closeMenu(){mobileNav.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');mobileNav.hidden=!open;});
mobileNav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
const reveals=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');reveals.unobserve(e.target);}}),{threshold:.08});
document.querySelectorAll('.reveal').forEach(el=>reveals.observe(el));

const arrival=document.querySelector('#arrival');let arrivalStarted=false,arrivalFinished=false;
arrival.addEventListener('loadedmetadata',()=>{arrival.playbackRate=5/7;});
arrival.addEventListener('ended',()=>{arrivalFinished=true;});
const mediaObserver=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
 if(!isIntersecting){target.pause();return;}
 if(reduced.matches)return;
 if(target.dataset.lazySrc&&!target.getAttribute('src')){target.src=target.dataset.lazySrc;target.load();}
 if(target===arrival){if(arrivalFinished)return;arrivalStarted=true;arrival.playbackRate=5/7;}
 target.play().catch(()=>{});
}),{threshold:.2});
[arrival,...document.querySelectorAll('video[data-lazy-src]')].forEach(el=>mediaObserver.observe(el));
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(v=>v.pause());});

const work=[
 {file:'equipment.mp4',poster:'equipment.webp',heading:'Bring the equipment you already own.',description:'Haul the mowers, trimmers, and tools you already use. The rear equipment bay keeps your landscaping work at the heart of the day.'},
 {file:'load.mp4',poster:'load.webp',heading:'Give collected grass a second purpose.',description:'Load suitable grass into the factory intake. Marvel supplies the production ingredients and coordinates the product orders. The app is designed to keep you informed as production progresses.'},
 {file:'pickup-draft.mp4',poster:null,heading:'See what’s ready. Collect the packages.',description:'Finished products are packaged for collection. Follow ready-to-ship quantities in the app, then retrieve the cartons through the updated package exit. This clip is a low-resolution motion proof of that new opening.'},
 {file:'dropoff.mp4',poster:'dropoff.webp',heading:'Drop off the package. Carry on with your day.',description:'Marvel supplies the shipping labels and coordinates the product business. The intended crew workflow is a UPS drop-off, with shipment status and the calculated profit share recorded in the platform.'}
];
const tabs=[...document.querySelectorAll('[data-work]')],workVideo=document.querySelector('#work-video');
function selectWork(index,focus=false){
 const step=work[index];tabs.forEach((t,i)=>{t.setAttribute('aria-selected',String(i===index));t.tabIndex=i===index?0:-1;});
 const panel=document.querySelector('#work-detail');panel.setAttribute('aria-labelledby',tabs[index].id);
 document.querySelector('#work-counter').textContent=`0${index+1} / 04`;
 document.querySelector('#work-heading').textContent=step.heading;document.querySelector('#work-description').textContent=step.description;
 workVideo.setAttribute('aria-label',step.heading);workVideo.pause();
 if(step.poster)workVideo.poster=`assets/ecosystem-v1/${step.poster}`;else workVideo.removeAttribute('poster');
 workVideo.dataset.lazySrc=`assets/ecosystem-v1/${step.file}`;workVideo.src=workVideo.dataset.lazySrc;workVideo.load();
 if(reduced.matches){workVideo.addEventListener('loadeddata',()=>{workVideo.currentTime=.1;},{once:true});}else workVideo.play().catch(()=>{});
 if(focus)tabs[index].focus();
}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectWork(index));tab.addEventListener('keydown',e=>{let i=index;if(e.key==='ArrowRight'||e.key==='ArrowDown')i=(index+1)%tabs.length;else if(e.key==='ArrowLeft'||e.key==='ArrowUp')i=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')i=0;else if(e.key==='End')i=tabs.length-1;else return;e.preventDefault();selectWork(i,true);});});

let share=75;const sales=document.querySelector('#sales-count');
function updateMoney(){const quantity=Number(sales.value),amount=quantity*(50-30)*share/100;
 document.querySelector('#earnings-total').textContent=amount.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
 for(const id of ['sold-count','slider-count'])document.getElementById(id).textContent=quantity;
 document.querySelector('#remaining-count').textContent=24-quantity;document.querySelector('#share-percent').textContent=share+'%';
 document.querySelector('#calculation').textContent=`${quantity} × ($50 − $30) × ${share}% = $${amount.toLocaleString('en-US')}`;
 sales.setAttribute('aria-valuetext',`${quantity} sinks sold; illustrative crew share ${amount} dollars`);
}
sales.addEventListener('input',updateMoney);document.querySelectorAll('[data-share]').forEach(button=>button.addEventListener('click',()=>{share=Number(button.dataset.share);document.querySelectorAll('[data-share]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));updateMoney();}));updateMoney();
document.querySelector('#approve-content').addEventListener('click',e=>{const button=e.currentTarget,approved=button.dataset.approved!=='true';button.dataset.approved=String(approved);button.closest('.marketing-demo').classList.toggle('is-approved',approved);button.innerHTML=approved?'Sample draft approved <span>✓</span>':'Approve sample draft <span>✓</span>';document.querySelector('#social-status').textContent=approved?'Approved in this preview. Nothing was published.':'Preview only. Nothing will be published.';});

const stage=document.querySelector('#product-stage');
const modelObserver=new IntersectionObserver(async entries=>{if(!entries.some(e=>e.isIntersecting))return;modelObserver.disconnect();try{const {createProductViewer}=await import('./ecosystem-trailer.js?v=ecosystem-v2');await createProductViewer(stage);}catch(e){console.error('Product viewer unavailable',e);document.querySelector('#model-status').textContent='3D unavailable on this device. Explore the model through the reservation preview.';}},{rootMargin:'400px'});modelObserver.observe(stage);
