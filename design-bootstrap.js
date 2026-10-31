// Each concept follows the production entry points and the atomic film manifest.
// New published renders require no edits to these review pages.
const revision = 'designs-1031a';
let live;
try {
  const response = await fetch('index.html?design-source=' + revision, {cache: 'no-store', signal: AbortSignal.timeout(3000)});
  if (!response.ok) throw Error('Homepage source unavailable');
  live = new DOMParser().parseFromString(await response.text(), 'text/html');
  for (const current of document.querySelectorAll('link[rel=stylesheet]')) {
    const file = current.getAttribute('href').split('?')[0];
    const updated = [...live.querySelectorAll('link[rel=stylesheet]')].find(el => el.getAttribute('href')?.split('?')[0] === file);
    if (updated) current.setAttribute('href', updated.getAttribute('href'));
  }
} catch (error) { console.warn('Using the saved design shell.', error.message); }

// Keep non-video fallbacks on the same trailer as the chosen film.
try {
  const {loadFilmSources, sceneFilmSource, introFilmKind} = await import('./film-sources-hqworld4.js?v=sleek20-review-v1');
  const sources = await loadFilmSources();
  const kind = introFilmKind();
  const opening = sceneFilmSource('opening', kind), cargo = sceneFilmSource('cargo', kind);
  const poster = (entry, k) => `${entry.base}/${k}-poster.webp?v=${entry.revision}`;
  const arrival = document.querySelector('.arrival-poster');
  arrival.querySelectorAll('source').forEach(el => el.remove());
  arrival.querySelector('img').src = poster(matchMedia('(prefers-reduced-motion:reduce)').matches ? cargo : opening, kind);
  const fallback = document.querySelector('#hero-visual .scene-fallback');
  fallback.querySelectorAll('source').forEach(el => el.remove());
  fallback.querySelector('img').src = poster(cargo, kind);
  const fieldKind = sources.field.kind || (innerWidth <= 760 ? 'mobile' : 'desktop');
  document.querySelector('#tour-visual .scene-fallback img').src = poster(sources.field, fieldKind);
} catch (error) { console.warn('Film poster selection unavailable.', error.message); }

const entry = live?.querySelector('script[src^="atlas-hqworld4.js"]')?.getAttribute('src') || 'atlas-hqworld4.js?v=intro-skip-1030a';
await import('./' + entry);
const crew = live?.querySelector('script[src^="crew-app.js"]')?.getAttribute('src') || 'crew-app.js?v=v4-1030c';
await import('./' + crew);
document.body.dataset.conceptReady = 'true';
