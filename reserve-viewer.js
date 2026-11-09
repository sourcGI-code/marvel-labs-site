// The reservation form and product image must work independently of WebGL.
const section = document.querySelector('section.reserve-stage');
if (section) {
  const jetblack = section.classList.contains('jetblack-stage');
  const image = section.querySelector('.rv-preview img');
  const caption = section.querySelector('.rv-preview figcaption');
  function showSize(size) {
    if (!['16', '20'].includes(size) || !image) return;
    image.src = jetblack ? 'assets/trailer-realism-v2/yard-desktop.webp' : `assets/owner-approved-trailer-v1/thumb-${size}.png`;
    image.alt = jetblack ? '16 ft and 20 ft Jet black Marvel Labs trailer designs parked in an illustrated factory loading yard' : `${size} ft Marvel Labs trailer in Mirror Graphite`;
    caption.textContent = jetblack ? `Jet black · Design visualization · ${size} ft selected` : `${size} ft · Mirror Graphite`;
  }
  showSize(section.dataset.open || section.dataset.size || '20');
  section.addEventListener('rs:enter', event => showSize(event.detail));
  section.addEventListener('rs:size', event => showSize(event.detail));

  const controller = new AbortController();
  section.dataset.viewer = 'loading';
  const host = section.querySelector('.rs-3d');
  host.setAttribute('aria-busy', 'true');
  function fallback() {
    clearTimeout(timeout);
    section.classList.remove('rs-live');
    section.dataset.viewer = 'image';
    host.setAttribute('aria-busy', 'false');
    controller.abort();
  }
  const timeout = setTimeout(fallback, 20000);
  import(jetblack ? './reserve-3d-jetblack.js?v=factory-yard-20261108' : './reserve-3d.js?v=checkout-clarity-20261108')
    .then(({startReservationViewer}) => {
      if (controller.signal.aborted) return;
      return startReservationViewer(section, {
        signal: controller.signal,
        onReady() {
          if (controller.signal.aborted) return;
          clearTimeout(timeout);
          section.dataset.viewer = 'interactive';
          host.setAttribute('aria-busy', 'false');
          section.classList.add('rs-live');
        },
        onError: fallback,
      });
    })
    .catch(fallback);
}
