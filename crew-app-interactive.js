// The device enters once. Navigation belongs to the app, never to its pose.
const section = document.querySelector('#app[data-phone-mode="interactive"]');
if (section) {
  const phone = section.querySelector('.crew-phone');
  const stage = section.querySelector('.crew-phone-stage');
  const entrance = section.querySelector('.crew-phone-entrance');
  const frame = section.querySelector('iframe');
  const status = section.querySelector('.crew-phone-status');
  const buttons = [...section.querySelectorAll('[data-app-route]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const loading = section.querySelector('.crew-phone-loading');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'crew-app-retry';
  retry.textContent = 'Try again';
  loading.append(retry);
  let entered = false, loaded = false, loadTimer, entranceTimer, currentRoute = 'trailer';

  function loadError() {
    if (loaded) return;
    section.dataset.appError = 'true';
    loading.querySelector('strong').textContent = 'App preview unavailable';
    loading.querySelector('span').textContent = 'Check your connection, then try again.';
    status.textContent = 'The app preview could not load. Try again or use Open the app.';
  }

  function sizePhone() {
    const available = stage.getBoundingClientRect();
    const height = Math.max(180, Math.min(790, (available.height - 18) * 1828 / 1920, (available.width - 20) * 1828 / 960));
    phone.style.setProperty('--phone-height', `${height}px`);
    stage.style.setProperty('--phone-height', `${height}px`);
  }
  new ResizeObserver(sizePhone).observe(stage);
  // Keep the app at a real phone viewport as the showcase handset scales.
  // Otherwise narrow showcases reflow its navigation into 100-pixel columns.
  const screen = section.querySelector('.crew-phone-screen');
  new ResizeObserver(() => {
    const width = screen.clientWidth, height = screen.clientHeight;
    if (!width || !height) return;
    const scale = width / 390;
    Object.assign(frame.style, {
      width: '390px', height: `${height / scale}px`,
      transformOrigin: '0 0', transform: `scale(${scale})`
    });
  }).observe(screen);

  function selectRoute(route) {
    currentRoute = route;
    loaded = false;
    section.dataset.appLoaded = 'false';
    section.dataset.appError = 'false';
    loading.querySelector('strong').textContent = 'MARVEL CREW';
    loading.querySelector('span').textContent = 'Opening your trailer…';
    status.textContent = 'Opening Marvel Crew…';
    const url = new URL(`crew/trailer-app/${route}/`, document.baseURI);
    url.searchParams.set('view', 'phone');
    frame.src = url.href;
    buttons.forEach(button => {
      const selected = button.dataset.appRoute === route;
      button.closest('li').classList.toggle('is-current', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    clearTimeout(loadTimer);
    loadTimer = setTimeout(loadError, 15000);
  }
  retry.addEventListener('click', () => selectRoute(currentRoute));
  frame.addEventListener('error', loadError);

  // Same-origin app content is rendered at the screen's actual resolution.
  // Wait for its React root, not just the empty exported HTML document.
  frame.addEventListener('load', () => {
    const doc = frame.contentDocument;
    if (!doc || frame.src === 'about:blank') return;
    // A gesture that reaches the app's edge must not scroll the host timeline.
    const scrollContainment = doc.createElement('style');
    scrollContainment.textContent = 'html,body,#root,#root *{overscroll-behavior:contain}';
    doc.head.append(scrollContainment);
    let lastPath;
    function highlightRoute() {
      const path = doc.location.pathname;
      if (path === lastPath) return;
      lastPath = path;
      const route = path.split('/trailer-app/')[1]?.split('/')[0] || '';
      const group = ['trailer', 'production', 'diagnostics'].includes(route) ? 'trailer'
        : route === 'camera' ? 'camera'
        : route === 'assistant' ? 'assistant'
        : ['quotes', 'pricing', 'create'].includes(route) ? 'quotes'
        : ['trailers', 'schedule', 'earnings', 'impact', 'invoices'].includes(route) ? 'trailers' : '';
      buttons.forEach(button => {
        const selected = button.dataset.appRoute === group;
        button.closest('li').classList.toggle('is-current', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    }
    function ready() {
      if (!doc.querySelector('#root')?.textContent.trim()) return false;
      loaded = true;
      clearTimeout(loadTimer);
      section.dataset.appLoaded = 'true';
      section.dataset.appError = 'false';
      status.textContent = 'Try the app on the phone. Example data.';
      return true;
    }
    ready();
    highlightRoute();
    const observer = new MutationObserver(() => {
      if (!loaded) ready();
      highlightRoute();
    });
    observer.observe(doc.body, { childList: true, subtree: true });
    frame.contentWindow.addEventListener('pagehide', () => observer.disconnect(), { once: true });
    // Let keyboard users leave the embedded demo without losing their place.
    doc.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        section.querySelector('.crew-open-app').focus({ preventScroll: true });
      }
    });
  });

  function settle(still = false) {
    clearTimeout(entranceTimer);
    entrance.pause();
    if (still === true) section.dataset.phoneStill = 'true';
    phone.inert = false;
    section.dataset.phoneState = 'ready';
  }
  function enter() {
    if (entered) return;
    entered = true;
    sizePhone();
    selectRoute('trailer');
    section.dataset.phoneState = 'entering';
    if (reduced.matches) { settle(true); return; }
    // Original 3D handset: the unchanged entrance, then a short turn to zero
    // yaw/pitch/roll. Hold that exact final frame beneath the interactive screen.
    entrance.src = entrance.dataset.src;
    entrance.muted = true;
    entrance.play().catch(() => settle(true));
    entranceTimer = setTimeout(() => settle(true), 12000);
  }
  entrance.addEventListener('ended', () => settle());
  entrance.addEventListener('error', () => settle(true));
  entrance.addEventListener('playing', () => {
    clearTimeout(entranceTimer);
    // A failed/stalled stream must still leave the app reachable.
    entranceTimer = setTimeout(() => settle(true), 8000);
  });
  buttons.forEach(button => button.addEventListener('click', () => {
    enter();
    selectRoute(button.dataset.appRoute);
  }));
  const active = () => {
    if (document.body.dataset.activeScene === 'app') enter();
  };
  new MutationObserver(active).observe(document.body, { attributes: true, attributeFilter: ['data-active-scene'] });
  // Also works if the stage controller is unavailable or the page is embedded.
  new IntersectionObserver(entries => {
    if (!document.documentElement.classList.contains('immersive') && entries.some(entry => entry.isIntersecting)) enter();
  }, { threshold: .25 }).observe(section);
  reduced.addEventListener('change', () => { if (reduced.matches && entered) settle(true); });
  active();
}
