// The reservation form and product image must work independently of WebGL.
const section = document.querySelector('section.reserve-stage');
if (section) {
  const image = section.querySelector('.rv-preview img');
  const caption = section.querySelector('.rv-preview figcaption');
  function showSize(size) {
    if (!['16', '20'].includes(size) || !image) return;
    image.src = `assets/owner-approved-trailer-v1/thumb-${size}.png`;
    image.alt = `${size} ft Marvel Labs trailer in Mirror Graphite`;
    caption.textContent = `${size} ft · Mirror Graphite`;
  }
  showSize(section.dataset.open || section.dataset.size || '20');
  section.addEventListener('rs:enter', event => showSize(event.detail));
  section.addEventListener('rs:size', event => showSize(event.detail));

  const controller = new AbortController();
  section.dataset.viewer = 'loading';
  function fallback() {
    clearTimeout(timeout);
    section.classList.remove('rs-live');
    section.dataset.viewer = 'image';
    controller.abort();
  }
  const timeout = setTimeout(fallback, 12000);
  import('./reserve-3d.js?v=checkout-clarity-20261108')
    .then(({startReservationViewer}) => {
      if (controller.signal.aborted) return;
      return startReservationViewer(section, {
        signal: controller.signal,
        onReady() {
          if (controller.signal.aborted) return;
          clearTimeout(timeout);
          section.dataset.viewer = 'interactive';
          section.classList.add('rs-live');
        },
        onError: fallback,
      });
    })
    .catch(fallback);
}
