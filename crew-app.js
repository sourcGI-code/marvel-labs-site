// Marvel Crew app section (owner 10-26: "replace this with another 3d animation of our mobile app we are launching
// for the trailer"; owner 10-30: "I want it to the old version but when I scroll it shows me the 1 through 4 when I
// scroll instead of just playing it"). One pinned screen: the phone film full-bleed, the copy and the four features on
// the left. The section's scroll is cut into one stop per feature (beat-scroll-hqworld4.js chaptersFor: a forward
// scroll glides to the next stop, scrolling on runs through them); the stop the page is at is the current feature and
// the film plays that feature's part (its data-at to the next feature's data-at) and holds the last frame. Tapping a
// feature plays its part. Reduced motion: poster only.
const section = document.getElementById('app');
if (section) {
  const video = section.querySelector('.crew-film video');
  const beats = [...section.querySelectorAll('.crew-beats li')];
  const starts = beats.map(li => Number(li.dataset.at));
  const ENTER = .15;                                    // beat-scroll: a section's first stop is 15% into its scroll (after the hand-off)
  const stops = beats.map((_, i) => ENTER + i * (1 - ENTER) / beats.length);   // the stops beat-scroll glides to; keep both in step
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const kind = () => innerWidth <= 760 || (innerWidth <= 1024 && innerHeight > innerWidth) ? 'mobile' : 'desktop';
  const base = section.dataset.film, rev = section.dataset.revision;
  let current = '', index = -1, stopAt = Infinity, frame = 0;
  function source() {
    const k = kind(); if (k === current) return; current = k;
    video.poster = `${base}/${k}-${reduced.matches ? 'still' : 'poster'}.webp?v=${rev}`;   // poster = first frame; still = the status screen
    if (!reduced.matches) { video.src = `${base}/${k}.mp4?v=${rev}`; video.load(); }
  }
  function mark() { beats.forEach((li, i) => li.classList.toggle('is-current', i === index)); }
  function hold() { if (!video.paused && video.currentTime >= stopAt - .04) { video.pause(); try { video.currentTime = stopAt; } catch {} } }
  function loop() { hold(); frame = video.paused ? 0 : requestAnimationFrame(loop); }
  function play(i) {
    if (reduced.matches) return;
    const from = starts[i]; stopAt = i + 1 < starts.length ? starts[i + 1] : (video.duration || Infinity);
    const begin = () => { try { video.currentTime = from; } catch {} video.play().then(() => { if (!frame) frame = requestAnimationFrame(loop); }).catch(() => {}); };
    if (video.readyState >= 1) begin(); else video.addEventListener('loadedmetadata', begin, {once: true});
  }
  const beatAt = p => stops.reduce((found, s, i) => p >= s - .02 ? i : found, 0);
  function pick() {
    // Active: the stage says so (data-active-scene) or, without the stage, the section has reached mid-screen. The
    // stage writes the section's scroll progress to data-scene-progress; the stop reached is the current feature.
    const scene = document.body.dataset.activeScene;
    const active = scene ? scene === 'app' : section.getBoundingClientRect().top < innerHeight * .5;
    const want = active ? beatAt(Number(section.dataset.sceneProgress || 0)) : -1;
    if (want === index) return;
    index = want; mark(); section.classList.toggle('is-playing', index >= 0);
    if (index >= 0) play(index); else { video.pause(); try { video.currentTime = 0; } catch {} }
  }
  let queued = 0;
  const schedule = () => { if (!queued) queued = setTimeout(() => { queued = 0; pick(); }, 30); };   // a timer, not rAF: throttled tabs still select
  beats.forEach((li, i) => li.querySelector('button').addEventListener('click', () => { index = i; mark(); section.classList.add('is-playing'); play(i); }));
  video.addEventListener('ended', () => { frame = 0; });
  video.addEventListener('timeupdate', hold);                            // holds the part's last frame even when rAF is throttled
  addEventListener('scroll', schedule, {passive: true});
  new MutationObserver(schedule).observe(section, {attributes: true, attributeFilter: ['data-scene-progress']});
  new MutationObserver(schedule).observe(document.body, {attributes: true, attributeFilter: ['data-active-scene']});
  addEventListener('resize', () => { const before = current; source(); schedule(); if (current !== before && index >= 0) play(index); });
  source(); pick();
}
