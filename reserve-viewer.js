// The reservation page presents the trailer photograph; no WebGL viewer is loaded.
const section = document.querySelector('section.reserve-stage');
if (section) {
  const caption = section.querySelector('.rv-preview figcaption');
  function showSize(size) {
    if (!['16', '20'].includes(size) || !caption) return;
    caption.textContent = `Jet black · ${size} ft selected`;
  }
  showSize(section.dataset.open || section.dataset.size || '20');
  section.addEventListener('rs:enter', event => showSize(event.detail));
  section.addEventListener('rs:size', event => showSize(event.detail));
  section.classList.remove('rs-live');
  section.dataset.viewer = 'image';
}
