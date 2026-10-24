const HANDOFF_VIEWPORTS=1.5;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// Scroll distance is a timeline. Every visible scene stays in viewport coordinates.
export function createStage() {
  const root = document.documentElement;
  const slide = document.body.dataset.experience === 'official';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const elements = [...document.querySelectorAll('main > section, body > .site-footer')];
  const durations = { top: 1100, story: 220, materials: 1000, inside: 1600, objects: 360, contact: 300 };
  const scenes = elements.map((element, index) => {
    const slot = document.createElement('div');
    slot.className = 'scene-slot'; slot.setAttribute('aria-hidden', 'true');
    const duration = Number(element.dataset.scrollLength) || durations[element.id] || (element.matches('.site-footer') ? 100 : 180);
    slot.style.height = `${duration}svh`;
    element.before(slot); element.classList.add('stage-scene');
    element.dataset.stageActive = 'false';
    return { element, slot, index, start: 0, length: 1, progress: 0, opacity: 0 };
  });
  const tail = document.createElement('div');
  tail.className = 'scene-tail'; tail.style.height = '100svh'; tail.setAttribute('aria-hidden', 'true');
  document.body.append(tail);
  root.classList.add('immersive');
  let viewport = innerHeight, active = null;
  function measure() {
    viewport = tail.getBoundingClientRect().height;
    for (const scene of scenes) { scene.start = scene.slot.offsetTop; scene.length = scene.slot.offsetHeight; }
  }
  function update() {
    // Scene hand-offs slide upward over 1.5 screens of scroll (owner: transitions must visibly move up, not switch).
    const y = scrollY, fade = viewport * HANDOFF_VIEWPORTS;
    let dominant = scenes[0];
    for (const scene of scenes) {
      const enter = scene.index === 0 ? 1 : smooth((y - scene.start + fade / 2) / fade);
      const leave = scene.index === scenes.length - 1 ? 1 : 1 - smooth((y - scene.start - scene.length + fade / 2) / fade);
      scene.opacity = enter * leave;
      const inset = scene.index === 0 ? 0 : fade / 2;
      scene.progress = clamp((y - scene.start - inset) / (scene.length - inset - fade / 2));
      scene.element.style.opacity = slide ? '1' : scene.opacity;
      // Scroll-driven slide follows the visitor's own scrolling, so only reduced-motion disables it (motion-paused is the film autoplay state).
      if (slide) scene.element.style.transform = reduced.matches ? 'none' : `translate3d(0,${((1-enter)-(1-leave))*viewport}px,0)`;
      scene.element.style.visibility = scene.opacity > .001 ? 'visible' : 'hidden';
      scene.element.dataset.stageActive = String(scene.opacity > .001);
      scene.element.dataset.sceneProgress = scene.progress.toFixed(4);
      if (scene.opacity > dominant.opacity) dominant = scene;
      const second = scene.progress >= .5;
      scene.element.classList.toggle('scene-detail', second);
      if (matchMedia('(max-width:760px)').matches) {
        const first = scene.element.querySelector('.object-photo, .contact-grid > div, .earnings-copy');
        const last = scene.element.querySelector('.object-copy, #inquiry-form, .earnings-calculator');
        if (first && last) { first.inert = second; last.inert = !second; }
      } else {
        scene.element.querySelectorAll('.object-photo,.object-copy,.contact-grid > div,#inquiry-form,.earnings-copy,.earnings-calculator').forEach(el => el.inert = false);
      }
    }
    for (const scene of scenes) {
      scene.element.inert = scene !== dominant;
      scene.element.setAttribute('aria-hidden', String(scene !== dominant));
    }
    if (dominant !== active) {
      // A focused link in a departing scene must not remain in an inert subtree.
      if (active?.element.contains(document.activeElement)) document.activeElement.blur();
      active = dominant;
      document.body.dataset.activeScene = active.element.id || (active.element.matches('footer') ? 'footer' : 'intro');
    }
  }
  function find(element) { return scenes.find(scene => scene.element === element || scene.element.contains(element)); }
  function liveProgress(element) {
    const scene = find(element); if (!scene) return 0;
    const inset = scene.index === 0 ? 0 : viewport * (HANDOFF_VIEWPORTS/2);
    return clamp((scrollY - scene.start - inset) / (scene.length - inset - viewport * (HANDOFF_VIEWPORTS/2)));
  }
  function navigate(hash, focus = false) {
    let target; try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return false; }
    const scene = target && find(target); if (!scene) return false;
    // Stop an autoplaying scene before it can write its old playhead back to scroll.
    document.dispatchEvent(new CustomEvent('stage:navigate', { detail: { hash } }));
    const form = target.matches('form');
    const requested=Number(target.dataset.stageProgress),inset=scene.index===0?0:viewport*(HANDOFF_VIEWPORTS/2);
    const position = target.hasAttribute('data-stage-progress')&&Number.isFinite(requested)
      ?scene.start+inset+clamp(requested)*(scene.length-inset-viewport*(HANDOFF_VIEWPORTS/2))
      :scene.start + (scene.index ? viewport * (HANDOFF_VIEWPORTS/2) : 0) + (form && innerWidth <= 760 ? scene.length * .58 : 0);
    scrollTo({ top: position, behavior: 'instant' }); update();
    if (focus) {
      const heading = form ? target.querySelector('select,input') : target.querySelector('h1,h2,a') || target;
      if (!heading.matches('a,button,input,select,textarea')) heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    return true;
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (navigate(link.hash, true)) {
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    }
  });
  addEventListener('hashchange', () => navigate(location.hash));
  addEventListener('resize', () => { measure(); update(); });
  measure(); update();
  if (location.hash) requestAnimationFrame(() => navigate(location.hash));
  addEventListener('pageshow', () => { measure(); update(); });
  return {
    update,
    progress: liveProgress,
    seekProgress(element,p,{refresh=false}={}){if(refresh)measure();const scene=find(element);if(!scene)return;const inset=scene.index===0?0:viewport*(HANDOFF_VIEWPORTS/2);scrollTo({top:scene.start+inset+clamp(p)*(scene.length-inset-viewport*(HANDOFF_VIEWPORTS/2)),behavior:'instant'});update();},
    visible: element => (find(element)?.opacity || 0) > .001,
    slot: element => find(element)?.slot || element
  };
}
