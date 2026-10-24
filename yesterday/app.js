const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches;
let experience = null;
const motionButton = document.querySelector('#motion-toggle');
function applyMotion() {
  document.body.classList.toggle('motion-paused', paused);
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.innerHTML = paused ? 'Resume motion <span aria-hidden="true">▷</span>' : 'Pause motion <span aria-hidden="true">Ⅱ</span>';
  const stageMotion=document.querySelector('#stage-motion');stageMotion.setAttribute('aria-pressed',String(paused));stageMotion.setAttribute('aria-label',paused?'Resume animation':'Pause animation');stageMotion.textContent=paused?'▷':'Ⅱ';
  experience?.setPaused(paused);
}
motionButton.addEventListener('click', () => { paused = !paused; applyMotion(); });
reducedMotion.addEventListener('change', event => { paused = event.matches; applyMotion(); });
applyMotion();

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() {
  mobileNav.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); } });
matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

function setupTabs(selector, activate) {
  const tabs = [...document.querySelectorAll(selector)];
  const select = tab => {
    tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
    activate(tab);
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(tabs[next]); tabs[next].focus(); }
    });
  });
}
setupTabs('[data-factory]', tab => {
  document.querySelectorAll('.factory-panel').forEach(panel => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
});

const steps = [
  ['From variable to repeatable.', 'Condition and mill biomass into a consistent material for the next stage. Grass progresses from long fibers to a prepared, process-ready powder.', 'BIOMASS / PREPARATION'],
  ['A recipe for a new purpose.', 'Blend prepared material with binders and additives for the selected product. The formulation connects material properties with the requirements of the final object.', 'MATERIAL / FORMULATION'],
  ['Give possibility a shape.', 'Shape the part, then finish its surface for the intended use. The platform’s capabilities include binder jetting, molding, coating, and other finishing processes.', 'OBJECT / FORMING'],
  ['Close the loop with quality.', 'Inspect the output and use process measurements to inform control. Quality checks connect the material, the production recipe, and the finished part.', 'QUALITY / INSPECTION']
];
function selectProcess(step){
  const panel=document.querySelector('#process-detail');panel.setAttribute('aria-labelledby',`step-tab-${step}`);
  panel.querySelector('h3').textContent=steps[step][0];panel.querySelector('p').textContent=steps[step][1];
  document.querySelector('.process-art').dataset.process=step;
  document.querySelector('.process-art-label').textContent=steps[step][2];document.querySelector('.process-art-index').textContent=`0${step+1}`;
  document.querySelectorAll('[data-step]').forEach(el=>{if(Number(el.dataset.step)===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
}
selectProcess(0);window.addEventListener('process-step',event=>selectProcess(event.detail));

const imageDialog = document.querySelector('#image-dialog');
document.querySelectorAll('[data-expand]').forEach(button => button.addEventListener('click', () => {
  const source = button.closest('.factory-image').querySelector('img');
  imageDialog.querySelector('img').src = source.src;
  imageDialog.querySelector('img').alt = source.alt;
  imageDialog.showModal();
  document.body.classList.add('modal-open');
}));
imageDialog.querySelector('.dialog-close').addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
imageDialog.addEventListener('click', event => { if (event.target === imageDialog) { const rect = imageDialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) imageDialog.close(); } });

document.querySelectorAll('[data-interest]').forEach(link => link.addEventListener('click', () => { document.querySelector('#interest').value = link.dataset.interest; }));
document.querySelector('#inquiry-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const name = form.elements.name.value.trim();
  const message = form.elements.message.value.trim();
  const status = document.querySelector('#form-status');
  if (!name || !message) { status.textContent = 'Please add your name and a short message.'; return; }
  const interest = form.elements.interest.value;
  const body = `Hello Marvel Labs,\n\nI’m interested in ${interest.toLowerCase()}.\n\n${message}\n\nBest,\n${name}`;
  const href = `mailto:hello@marvellabs.com?subject=${encodeURIComponent(`Marvel Labs — ${interest}`)}&body=${encodeURIComponent(body)}`;
  const fallback = document.querySelector('#email-fallback');
  fallback.href = href;
  fallback.hidden = false;
  status.textContent = 'Your email draft is ready. Review and send it in your email app. If no app opens, email hello@marvellabs.com directly.';
  window.location.href = href;
});

if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('js-reveal');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); } });
  }, { threshold: .09 });
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
}

try {
  const { createExperience } = await import('./experience.js?v=biomass-2');
  experience = await createExperience({ paused });
  applyMotion();
} catch (error) {
  console.warn('The interactive models are showing their static alternatives.', error);
}
