// The device enters once. Navigation belongs to the app, never to its pose.
const section = document.querySelector('#app[data-phone-mode="interactive"]');
if (section) {
  const phone = section.querySelector('.crew-phone');
  const stage = section.querySelector('.crew-phone-stage');
  const frame = section.querySelector('iframe');
  const status = section.querySelector('.crew-phone-status');
  const buttons = [...section.querySelectorAll('[data-app-route]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let entered = false, entrance, loaded = false, loadTimer;

  function sizePhone() {
    const available = stage.getBoundingClientRect();
    const height = Math.max(380, Math.min(790, available.height - 30, (available.width - 28) * 2.04));
    phone.style.setProperty('--phone-height', `${height}px`);
  }
  new ResizeObserver(sizePhone).observe(stage);

  function selectRoute(route) {
    loaded = false;
    section.dataset.appLoaded = 'false';
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
    loadTimer = setTimeout(() => {
      if (!loaded) status.textContent = 'Still loading. You can also use “Open the app” below.';
    }, 15000);
  }

  // Same-origin app content is rendered at the screen's actual resolution.
  // Wait for its React root, not just the empty exported HTML document.
  frame.addEventListener('load', () => {
    const doc = frame.contentDocument;
    if (!doc || frame.src === 'about:blank') return;
    let lastPath;
    function highlightRoute() {
      const path = doc.location.pathname;
      if (path === lastPath) return;
      lastPath = path;
      const route = path.split('/trailer-app/')[1]?.split('/')[0] || '';
      const group = ['trailer', 'production', 'diagnostics'].includes(route) ? 'trailer'
        : route === 'camera' ? 'camera'
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

  function settle() {
    entrance?.cancel();
    phone.style.opacity = '1';
    phone.style.transform = 'none';
    phone.inert = false;
    section.dataset.phoneState = 'ready';
  }
  function enter() {
    if (entered) return;
    entered = true;
    sizePhone();
    selectRoute('trailer');
    section.dataset.phoneState = 'entering';
    if (reduced.matches) { settle(); return; }
    entrance = phone.animate([
      { opacity: 0, transform: 'translateY(120px) rotateY(-34deg) rotateX(9deg) rotateZ(-9deg)', offset: 0 },
      { opacity: 1, offset: .25 },
      { opacity: 1, transform: 'translateY(0) rotateY(0) rotateX(0) rotateZ(0)', offset: 1 }
    ], { duration: 1500, easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'forwards' });
    entrance.onfinish = settle;
  }
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
  reduced.addEventListener('change', () => { if (reduced.matches && entered) settle(); });
  active();
}
