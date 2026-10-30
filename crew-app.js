// Marvel Crew app section (owner 10-26: "replace this with another 3d animation of our mobile app we are launching
// for the trailer"; owner 10-30: "I want to be able to scroll through this section"). The section scrolls like the
// rest of the page. The phone film sits in a sticky column; the feature nearest the middle of the screen is the
// current beat, and the film plays that beat (from its data-at to the next beat's start) and holds its last frame.
// Tapping a feature scrolls it into view, which selects it. Reduced motion: poster only.
const section = document.getElementById('app');
if (section) {
  const video = section.querySelector('.crew-film video');
  const beats = [...section.querySelectorAll('.crew-beats li')];
  const starts = beats.map(li => Number(li.dataset.at));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const kind = () => innerWidth <= 760 || (innerWidth <= 1024 && innerHeight > innerWidth) ? 'mobile' : 'desktop';
  const base = section.dataset.film, rev = section.dataset.revision;
  let current = '', index = -1, stopAt = Infinity, frame = 0, ready = false;
  function source() {
    const k = kind(); if (k === current) return; current = k;
    video.poster = `${base}/${k}-${reduced.matches ? 'still' : 'poster'}.webp?v=${rev}`;   // poster = first frame; still = the status screen
    if (!reduced.matches) { video.src = `${base}/${k}.mp4?v=${rev}`; video.load(); ready = false; }
  }
  function mark() { beats.forEach((li, i) => li.classList.toggle('is-current', i === index)); }
  function loop() {
    if (!video.paused && video.currentTime >= stopAt - .04) { video.pause(); try { video.currentTime = stopAt; } catch {} }
    frame = video.paused ? 0 : requestAnimationFrame(loop);
  }
  function play(i) {
    if (reduced.matches) return;
    const from = starts[i]; stopAt = i + 1 < starts.length ? starts[i + 1] : (video.duration || Infinity);
    const begin = () => { try { video.currentTime = from; } catch {} video.play().then(() => { if (!frame) frame = requestAnimationFrame(loop); }).catch(() => {}); };
    if (video.readyState >= 1) begin(); else video.addEventListener('loadedmetadata', begin, {once: true});
  }
  function pick() {
    // the beat whose row is nearest the reading line: the middle of the screen, sliding towards the bottom as the
    // section reaches its end so the last feature is reached on a phone; above the list the first beat shows its poster
    const own = section.scrollHeight > section.clientHeight + 2;          // the stage scrolls the scene's own content
    const max = own ? section.scrollHeight - section.clientHeight : document.documentElement.scrollHeight - innerHeight;
    const at = max > 0 ? Math.min(1, Math.max(0, (own ? section.scrollTop : scrollY) / max)) : 0;
    const mid = innerHeight * (.5 + .4 * at);
    let best = -1, distance = Infinity;
    beats.forEach((li, i) => { const r = li.getBoundingClientRect(); const d = r.top > mid ? r.top - mid : r.bottom < mid ? mid - r.bottom : 0; if (d < distance) { distance = d; best = i; } });
    const first = beats[0].getBoundingClientRect();
    if (first.top > innerHeight) best = -1;                      // the list has not arrived yet: hold the poster
    if (best === index) return;
    index = best; mark(); section.classList.toggle('is-playing', index >= 0);
    if (index >= 0) play(index); else { video.pause(); try { video.currentTime = 0; } catch {} }
  }
  let queued = 0;
  const schedule = () => { if (!queued) queued = setTimeout(() => { queued = 0; pick(); }, 40); };   // a timer, not rAF: throttled tabs still select
  beats.forEach((li, i) => li.querySelector('button').addEventListener('click', () => {
    li.scrollIntoView({block: 'center', behavior: reduced.matches ? 'auto' : 'smooth'});
    if (index !== i) { index = i; mark(); section.classList.add('is-playing'); play(i); }
  }));
  video.addEventListener('ended', () => { frame = 0; });
  video.addEventListener('timeupdate', () => { if (!video.paused && video.currentTime >= stopAt - .05) { video.pause(); try { video.currentTime = stopAt; } catch {} } });   // holds the beat's last frame even when rAF is throttled
  addEventListener('scroll', schedule, {passive: true});
  section.addEventListener('scroll', schedule, {passive: true});          // the scene scrolls its own content inside the stage
  new MutationObserver(schedule).observe(document.body, {attributes: true, attributeFilter: ['data-active-scene']});
  addEventListener('resize', () => { const before = current; source(); schedule(); if (current !== before && index >= 0) play(index); });
  source(); pick();
}
