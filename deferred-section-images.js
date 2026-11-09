// Fixed, overlapping scene containers look "nearby" to native image lazy
// loading. Request these images only when their chapter is actually visible.
export function installDeferredSectionImages(){
 const sections=[...document.querySelectorAll('main>section:has([data-deferred-src])')];
 const load=section=>section.querySelectorAll('[data-deferred-src]').forEach(image=>{image.src=image.dataset.deferredSrc;delete image.dataset.deferredSrc;});
 const active=()=>{
  if(document.documentElement.hasAttribute('data-snapshot')){sections.forEach(load);return;}
  const section=document.getElementById(document.body.dataset.activeScene);
  if(section)load(section);
 };
 const observer=new IntersectionObserver(entries=>{
  if(document.documentElement.classList.contains('immersive')){active();return;}
  entries.filter(entry=>entry.isIntersecting).forEach(entry=>load(entry.target));
 });
 sections.forEach(section=>observer.observe(section));
 new MutationObserver(active).observe(document.body,{attributes:true,attributeFilter:['data-active-scene']});
 new MutationObserver(active).observe(document.documentElement,{attributes:true,attributeFilter:['data-snapshot']});
 active();
}
