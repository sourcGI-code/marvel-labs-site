// Typography shares the scene timeline; entrances start immediately on a
// chapter change. No scroll-idle timers, cloned text, or layout measurements.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const titles = new WeakMap();
const running = new Map();
const ease = 'cubic-bezier(.16,1,.3,1)';
const enabled = () => !reduce.matches && !document.body.classList.contains('motion-paused');
const visible = el => el && !el.closest('[hidden], [aria-hidden="true"], [inert]');

function cancel(el) {
  for (const animation of running.get(el) || []) animation.cancel();
  running.delete(el);
}

function animate(el, frames, options = {}) {
  if (!enabled()) return;
  const animation = el.animate(frames, {duration:700, easing:ease, fill:'backwards', ...options});
  if (!running.has(el)) running.set(el, new Set());
  running.get(el).add(animation);
  const clean = () => {
    const set = running.get(el);
    set?.delete(animation);
    if (!set?.size) running.delete(el);
  };
  animation.onfinish = clean;
  animation.oncancel = clean;
}

function prepareTitle(el) {
  if (!el) return [];
  const record = titles.get(el);
  if (record && record.words.every(word => el.contains(word))) return record.words;
  const source = el.innerHTML;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const words = [];
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    // Preserve actual spaces and <br>/<em> so wrapping and accessible text
    // remain the same as the original heading.
    for (const part of node.textContent.split(/(\s+)/)) {
      if (!part || /^\s+$/.test(part)) { fragment.append(part); continue; }
      const mask = document.createElement('span'), word = document.createElement('span');
      mask.className = 'motion-word'; word.className = 'motion-word-inner';
      word.textContent = part; mask.append(word); fragment.append(mask); words.push(word);
    }
    node.replaceWith(fragment);
  }
  el.classList.add('motion-title');
  titles.set(el, {source, words});
  return words;
}

export function revealTitle(el, {direction = 1, delay = 0} = {}) {
  const words = prepareTitle(el);
  words.forEach(cancel);
  if (!visible(el) || !enabled()) return;
  words.forEach((word, index) => animate(word, [
    {transform:`translate3d(0,${direction * 120}%,0)`},
    {transform:'translate3d(0,0,0)'}
  ], {duration:850, delay:delay + Math.min(index * 42, 294)}));
}

export function setAnimatedTitle(el, html, options) {
  if (!el) return false;
  if ((titles.get(el)?.source || el.innerHTML) === html) { prepareTitle(el); return false; }
  (titles.get(el)?.words || []).forEach(cancel);
  el.innerHTML = html; titles.delete(el); revealTitle(el, options);
  return true;
}

export function revealDetails(elements, {delay = 80, direction = 1} = {}) {
  [...elements].filter(Boolean).forEach((el, index) => {
    cancel(el);
    if (!visible(el) || !enabled()) return;
    animate(el, [
      {clipPath:direction>0?'inset(100% -1em 0)':'inset(0 -1em 100%)',transform:`translate3d(0,${direction * 36}px,0)`},
      {clipPath:'inset(-.3em -1em -.3em)',transform:'translate3d(0,0,0)'}
    ], {delay:delay + Math.min(index * 65, 390)});
  });
}

const detailSelectors = {
  top:'#platform-tag,#hero-description,.offer-actions,.offer-stage-label,.hero-base',
  inside:'.section-top,#tour-count,#tour-kicker,#tour-copy,#tour-spec,.field-modes,.tour-chapters',
  story:'.offer-section-top,.offer-lead,.offer-text-link,.trailer-layout-study > .eyebrow,.trailer-plan,.plan-caption,.offer-benefits > div',
  sizes:'.offer-section-top,.offer-title-row > p,.trailer-price-option,.offer-inclusions,.offer-terms',
  founding:'.offer-section-top,.offer-lead,.offer-button,.founding-benefits > li',
  materials:'.section-top,.grass-heading > .eyebrow,#material-label,#material-copy,#material-output,.grass-chapters',
  objects:'.section-top,.earnings-copy > p,.value-drivers > div,.earnings-copy > .line-link,.earnings-calculator',
  contact:':scope > .eyebrow,.contact-grid > div > p,.inquiry-next > li,.email-link,#inquiry-form',
  footer:'.footer-wordmark,.footer-meta > *'
};

export function createEditorialMotion() {
  const sections = [...document.querySelectorAll('main > section, body > .site-footer')];
  sections.forEach(section => section.querySelectorAll('h1,h2,h3').forEach(prepareTitle));
  let active = null, detail = false, previousIndex = 0;

  function update() {
    const next = sections.find(section => !section.inert);
    if (!next) return;
    const index = sections.indexOf(next), direction = index < previousIndex ? -1 : 1;
    if (next !== active) {
      // A rapid scrub cannot leave stale animation layers behind a new scene.
      if (active) for (const el of [...running.keys()]) if (active.contains(el)) cancel(el);
      active = next; previousIndex = index; detail = next.classList.contains('scene-detail');
      next.querySelectorAll('h1,h2,h3').forEach(el => revealTitle(el, {direction}));
      const key = next.id || 'footer';
      revealDetails(next.querySelectorAll(detailSelectors[key] || '.eyebrow'), {direction});
    }
    const nextDetail = next.classList.contains('scene-detail');
    if (nextDetail !== detail && innerWidth <= 760) {
      detail = nextDetail;
      const selector = next.id === 'contact' ? (detail ? '#inquiry-form' : '.contact-grid > div')
        : next.id === 'objects' ? (detail ? '.earnings-calculator' : '.earnings-copy') : null;
      const region = selector && next.querySelector(selector);
      if (region) {
        region.querySelectorAll('h2').forEach(el => revealTitle(el, {direction:detail ? 1 : -1}));
        revealDetails(region.children, {delay:0});
      }
    }
    const p = Number(next.dataset.sceneProgress || 0);
    // Small depth offset while scrubbing, followed by a stable reading hold.
    const drift = enabled() ? (0.5 - p) * 8 : 0;
    next.querySelectorAll('.motion-title').forEach(el => el.style.setProperty('--title-drift', `${drift.toFixed(2)}px`));
  }

  function setPaused(value) {
    if (value || reduce.matches) {
      for (const el of [...running.keys()]) cancel(el);
      document.querySelectorAll('.motion-title').forEach(el => el.style.removeProperty('--title-drift'));
    }
  }
  document.addEventListener('focusin', event => {
    // Never animate a control away from a keyboard user.
    for (const el of [...running.keys()]) if (el.contains(event.target)) cancel(el);
  });
  revealDetails(document.querySelectorAll('.masthead > *'), {delay:0});
  return {update, setPaused};
}
