// Marvel Crew app section (owner 10-26: "replace this with another 3d animation of our mobile app we are launching
// for the trailer"). The phone film plays from the start whenever the section becomes the active scene and holds its
// last frame; the four feature lines follow the film; tapping one jumps the film to it. Reduced motion: poster only.
const section = document.getElementById('app');
if (section) {
  const video = section.querySelector('.crew-film video');
  const beats = [...section.querySelectorAll('.crew-beats li')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const kind = () => innerWidth <= 760 || (innerWidth <= 1024 && innerHeight > innerWidth) ? 'mobile' : 'desktop';
  const base = section.dataset.film, rev = section.dataset.revision;
  let current = '', active = false, frame = 0;
  function source() {
    const k = kind(); if (k === current) return; current = k;
    video.poster = `${base}/${k}-${reduced.matches ? 'still' : 'poster'}.webp?v=${rev}`;   // poster = first frame; still = the status screen
    if (!reduced.matches) { video.src = `${base}/${k}.mp4?v=${rev}`; video.load(); }
  }
  function mark() {
    const t = video.currentTime || 0;
    const index = beats.reduce((found, li, i) => t >= Number(li.dataset.at) - .05 ? i : found, 0);
    beats.forEach((li, i) => li.classList.toggle('is-current', active && i === index));
  }
  function loop() { mark(); frame = active && !video.paused ? requestAnimationFrame(loop) : 0; }
  function play(from = 0) {
    if (reduced.matches) return;
    try { video.currentTime = from; } catch {}
    video.play().then(() => { if (!frame) frame = requestAnimationFrame(loop); }).catch(() => {});
  }
  function update() {
    const now = document.body.dataset.activeScene === 'app' || !document.body.dataset.activeScene && section.getBoundingClientRect().top < innerHeight * .5;
    if (now === active) return;
    active = now; section.classList.toggle('is-playing', active);
    if (active) play(0); else { video.pause(); mark(); }
  }
  beats.forEach(li => li.querySelector('button').addEventListener('click', () => { active = true; section.classList.add('is-playing'); play(Number(li.dataset.at)); mark(); }));
  video.addEventListener('ended', mark);
  new MutationObserver(update).observe(document.body, {attributes: true, attributeFilter: ['data-active-scene']});
  addEventListener('scroll', update, {passive: true});
  addEventListener('resize', () => { const before = current; source(); if (current !== before && active) play(0); });
  source(); update();
}
