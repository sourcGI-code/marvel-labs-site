// Keep loading and reduced-motion images on the same completed trailer films.
export function syncTrailerPosters(sources) {
  const portrait=innerHeight>=innerWidth;
  const entry=(name,kind)=>kind==='desktop'&&sources[name]?.desktop?sources[name].desktop:sources[name];
  const poster=(item,kind)=>`${item.base}/${kind}-poster.webp?v=${item.revision}`;
  const set=(selector,value,attribute='src')=>document.querySelector(selector)?.setAttribute(attribute,value);
  set('.arrival-poster img',poster(entry('opening','desktop'),'desktop'));
  set('.arrival-poster [data-opening-mobile]',poster(entry('opening','mobile'),'mobile'),'srcset');
  const reducedKind=portrait?'mobile':'desktop';
  const heroReference=document.body.dataset.trailerModel==='intro-trailer-master-v1'?'opening':'cargo';
  set('.arrival-poster source[media*="prefers-reduced-motion"]',poster(entry(heroReference,reducedKind),reducedKind),'srcset');
  set('#hero-visual .scene-fallback img',poster(entry(heroReference,'desktop'),'desktop'));
  set('#hero-visual .scene-fallback source',poster(entry(heroReference,'mobile'),'mobile'),'srcset');
  const field=sources.field;
  const fieldKind=field.kind||(innerWidth<=760||(innerWidth<=1024&&innerHeight>innerWidth)?'mobile':'desktop');
  // Workday releases publish chapter stills, not a separate *-poster.webp.
  set('#tour-visual .scene-fallback img',`${field.base}/${fieldKind}-step-0.webp?v=${field.revision}`);
}
