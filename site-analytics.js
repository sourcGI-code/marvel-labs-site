// Optional, consent-based analytics for the public marketing site only.
// Keep localhost, app/chat pages, personal data and payment results out of here.
const HOSTS = new Set(['marvellabs.shop', 'www.marvellabs.shop']);
const SECTIONS = new Set(['top', 'story', 'inside', 'sizes', 'app', 'footer']);
const SCENES = {arrival:'top', delivery:'top', operator:'inside', dropoff:'inside', route:'inside', equipment:'inside', vision:'inside', rtk:'inside', quote:'inside', work:'inside'};
const CONSENT_KEY = 'marvel-analytics-consent-v1';
const CONSENT_VERSION = 1;
const CONSENT_AGE = 180 * 24 * 60 * 60 * 1000;

export function installSiteAnalytics(win, config = win.MARVEL_MARKETING?.clarity) {
  const doc = win.document;
  const projectId = String(config?.projectId || '').trim();
  if (!HOSTS.has(win.location.hostname) || win.location.protocol !== 'https:') return {status:'preview-disabled'};
  if (win.top !== win.self) return {status:'embedded-disabled'};
  if (!/^[a-z0-9]{5,32}$/.test(projectId)) return {status:'not-configured'};
  if (/^\/(?:crew(?:\/|$)|crew-chat\.html|test\/|yesterday)/.test(win.location.pathname)) return {status:'excluded-page'};
  if (win.__marvelAnalytics) return win.__marvelAnalytics;

  const optedOut = () => win.navigator.globalPrivacyControl === true || win.navigator.doNotTrack === '1';
  let active = false, installed = false, frame = 0;
  const reached = new Set();
  const cleanups = [];
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    cleanups.push(() => target.removeEventListener(type, fn, options));
  };
  function savedChoice() {
    try {
      const value = JSON.parse(win.localStorage.getItem(CONSENT_KEY));
      if (value?.version === CONSENT_VERSION && value.expires > Date.now() && ['accepted','declined'].includes(value.choice)) return value.choice;
    } catch { /* A blocked store leaves the choice in memory for this page. */ }
    return null;
  }
  function call(...args) {
    try { win.clarity?.(...args); } catch { /* Analytics must never break the page or checkout. */ }
  }
  function event(name, once = false) {
    if (!active || optedOut() || (once && reached.has(name))) return;
    call('event', name);
    if (once) reached.add(name);
  }
  function selection() {
    const size = doc.querySelector('.rv-rail [name="size"]:checked')?.value;
    const plan = doc.querySelector('.rv-rail [name="plan"]:checked')?.value;
    if (['16','20'].includes(size)) call('set', 'trailer_size', size);
    if (['buy','free','lease'].includes(plan)) call('set', 'reservation_plan', plan === 'buy' ? 'buy' : 'lease');
  }
  function sample() {
    frame = 0;
    if (!active || doc.visibilityState === 'hidden' || doc.documentElement.hasAttribute('data-site-loading')) return;
    const section = doc.body.dataset.activeScene;
    if (section) {
      if (SECTIONS.has(section)) event('section_' + section, true);
      const scene = doc.body.dataset.activeDisplay;
      if (SCENES[scene] === section) event('scene_' + scene, true);
    } else {
      // Static/reduced-data view has normal document flow. Do not use an
      // intersection ratio for the tall spacers in the animated presentation.
      for (const id of SECTIONS) {
        const el = id === 'footer' ? doc.querySelector('.site-footer') : doc.getElementById(id);
        if (!el || el.hidden || el.getAttribute('aria-hidden') === 'true') continue;
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.top < win.innerHeight * .75 && r.bottom > win.innerHeight * .25) event('section_' + id, true);
      }
    }
    const reservation = doc.querySelector('[data-page="reserve"]');
    if (reservation?.dataset.orderStep === 'review') {
      selection(); event('reservation_review', true);
    }
  }
  function schedule() { if (active && !frame) frame = win.requestAnimationFrame(sample); }
  function installMeasurement() {
    if (installed) return;
    installed = true;
    const observer = new win.MutationObserver(schedule);
    observer.observe(doc.body, {attributes:true, attributeFilter:['data-active-scene','data-active-display']});
    observer.observe(doc.documentElement, {attributes:true, attributeFilter:['data-site-loading']});
    const reservation = doc.querySelector('[data-page="reserve"]');
    if (reservation) observer.observe(reservation, {attributes:true, attributeFilter:['data-order-step']});
    cleanups.push(() => observer.disconnect());
    listen(win, 'scroll', schedule, {passive:true});
    listen(win, 'resize', schedule);
    listen(doc, 'visibilitychange', schedule);
    listen(doc, 'display:change', schedule);
    listen(doc, 'click', e => {
      if (!active || optedOut()) return;
      const anchor = e.target.closest?.('a[href]');
      if (!anchor) return;
      const label = anchor.dataset.analyticsEvent;
      if (['price_16_click','price_20_click'].includes(label)) event(label);
      let url;
      try { url = new URL(anchor.href, win.location.href); } catch { return; }
      if (url.origin === win.location.origin && url.pathname === '/reserve.html') {
        const section = anchor.closest('section')?.id;
        if (SECTIONS.has(section)) call('set','reserve_cta_section',section);
        event('reserve_click');
      }
    }, true);
    listen(doc, 'change', e => {
      if (!active || optedOut() || !e.target.matches?.('.rv-rail input[name="size"],.rv-rail input[name="plan"]')) return;
      selection(); event('reservation_selection');
    });
    // Dispatched only after payment configuration and terms validation pass.
    // This is a checkout handoff, never a completed payment/reservation.
    listen(doc, 'marvel:checkout-handoff', () => {
      if (!active || optedOut()) return;
      selection(); event('checkout_handoff');
    });
    if (reservation) { selection(); event('reserve_page', true); }
    schedule();
  }
  function start() {
    if (active || optedOut()) return;
    // Mask inputs and embedded app previews before loading the recorder.
    doc.querySelectorAll('input,textarea,[contenteditable],iframe,[data-contact],.crew-page-chat').forEach(el => el.setAttribute('data-clarity-mask','true'));
    if (!win.clarity) {
      win.clarity = function(...args) { (win.clarity.q ||= []).push(args); };
    }
    // Advertising storage stays denied. Only analytics was requested.
    call('consentv2', {ad_Storage:'denied', analytics_Storage:'granted'});
    active = true;
    const script = doc.createElement('script');
    script.async = true; script.src = 'https://www.clarity.ms/tag/' + projectId;
    script.dataset.marvelAnalytics = 'clarity';
    doc.head.append(script);
    call('set','site_release','analytics-20261119');
    installMeasurement();
  }
  function stop() {
    if (!active) return;
    active = false;
    cleanups.forEach(fn => fn());
    if (frame) win.cancelAnimationFrame(frame);
    call('consentv2', {ad_Storage:'denied', analytics_Storage:'denied'});
    call('consent', false);
    // A reload removes the already-running recorder. The stored decline keeps
    // it off on the next page; no attempt to unload third-party code in place.
    win.location.reload();
  }

  const host = doc.createElement('div');
  host.id = 'marvel-analytics-consent';
  const ui = host.attachShadow({mode:'open'});
  ui.innerHTML = `<style>
    :host{position:fixed;inset:auto 16px 16px auto;z-index:2147483646;font:16px/1.45 system-ui,sans-serif;color:#eef3f4;max-width:calc(100vw - 32px)}
    [hidden]{display:none!important}.card{box-sizing:border-box;width:420px;max-width:100%;max-height:calc(100dvh - 32px);overflow:auto;background:#141b1f;border:1px solid #617078;border-radius:12px;padding:20px;box-shadow:0 8px 32px #0007}
    h2{font-size:18px;line-height:1.3;margin:0 0 10px}p{font-size:14px;margin:0 0 14px}a{color:#bde9ed;text-underline-offset:3px}.actions{display:flex;flex-wrap:wrap;gap:10px}
    button{font:inherit;font-size:14px;min-height:44px;padding:10px 14px;border:1px solid #93a5ad;border-radius:6px;background:transparent;color:inherit;cursor:pointer;flex:1}
    button:focus-visible,a:focus-visible{outline:3px solid #a6e5ec;outline-offset:3px}button:hover{background:#29373e}
    @media(max-width:480px){:host{inset:auto 12px 12px 12px;max-width:calc(100vw - 24px)}.card{width:100%;padding:16px}}
  </style><section class="card" role="dialog" aria-labelledby="analytics-title" hidden>
    <h2 id="analytics-title">Help improve this website?</h2>
    <p class="description">With your permission, Microsoft Clarity records clicks, scrolling and page visits to help us understand where visitors get stuck. Form entries are masked. Microsoft also uses this data to improve its products.</p>
    <p><a href="analytics-privacy.html" target="_blank" rel="noopener">About website analytics</a></p>
    <div class="actions"><button type="button" data-choice="declined">Decline analytics</button><button type="button" data-choice="accepted">Allow analytics</button><button type="button" data-close hidden>Close</button></div>
  </section>`;
  doc.body.append(host);
  const card = ui.querySelector('.card');
  const settingsHost = doc.createElement('span');
  settingsHost.id = 'marvel-analytics-settings';
  const settingsUI = settingsHost.attachShadow({mode:'open'});
  settingsUI.innerHTML = '<style>button{font:inherit;font-size:14px;color:inherit;background:transparent;border:0;padding:8px 0;cursor:pointer;text-decoration:underline;text-underline-offset:3px;min-height:44px}button:focus-visible{outline:2px solid currentColor;outline-offset:3px}</style><button type="button">Privacy choices</button>';
  (doc.querySelector('.footer-meta') || doc.querySelector('.site-footer') || doc.querySelector('header') || doc.body).append(settingsHost);
  function show(focus = false) {
    const out = optedOut();
    ui.querySelector('.description').textContent = out
      ? 'Your browser requests no tracking. Website analytics is off.'
      : 'With your permission, Microsoft Clarity records clicks, scrolling and page visits to help us understand where visitors get stuck. Form entries are masked. Microsoft also uses this data to improve its products.';
    ui.querySelectorAll('[data-choice]').forEach(button => button.hidden = out);
    ui.querySelector('[data-close]').hidden = !out;
    card.hidden = false;
    if (focus) ui.querySelector(out ? '[data-close]' : '[data-choice="declined"]').focus();
  }
  function choose(choice) {
    try { win.localStorage.setItem(CONSENT_KEY, JSON.stringify({version:CONSENT_VERSION, choice, expires:Date.now()+CONSENT_AGE})); } catch {}
    card.hidden = true;
    settingsUI.querySelector('button').focus({preventScroll:true});
    if (choice === 'accepted') start(); else stop();
  }
  settingsUI.querySelector('button').addEventListener('click', () => show(true));
  ui.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => choose(button.dataset.choice)));
  ui.querySelector('[data-close]').addEventListener('click', () => { card.hidden = true; settingsUI.querySelector('button').focus(); });
  // A decision made in another tab also applies to this tab.
  win.addEventListener('storage', e => {
    if (e.key !== CONSENT_KEY) return;
    const choice = savedChoice();
    card.hidden = true;
    if (choice === 'accepted') start(); else { stop(); if (!choice && !optedOut()) show(); }
  });
  const result = {status:'ready', get active() { return active; }};
  win.__marvelAnalytics = result;
  if (!optedOut()) {
    const choice = savedChoice();
    if (choice === 'accepted') start();
    else if (!choice) show();
  }
  return result;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  try { installSiteAnalytics(window); } catch (error) { console.warn('Optional website analytics could not start.', error); }
}
