// Snapshot captures get the same page content in ordinary document flow.
// Keep the interactive entry points out of that mode: no hidden scenes,
// huge scroll spacers, video autoplay or blank embedded-app loading state.
if (!document.documentElement.hasAttribute('data-snapshot')) {
  import('./atlas-hqworld4.js?v=remove-16ft-caption-v1').catch(error => {
    console.warn('Showing the static website because the presentation did not load.', error);
    document.documentElement.classList.remove('immersive', 'enhanced', 'arrival-quiet');
    document.documentElement.dataset.snapshot = 'true';
    document.querySelectorAll('.scene-slot,.scene-tail').forEach(el => el.remove());
    document.querySelectorAll('.stage-scene').forEach(el => {
      el.inert = false;
      el.removeAttribute('aria-hidden');
      el.removeAttribute('data-stage-active');
      for (const key of ['visibility', 'opacity', 'transform']) el.style[key] = '';
    });
  });
  import('./crew-app-interactive.js?v=lazy-phone-v1').catch(console.warn);
  import('./crew-page-chat.js?v=page-chat-v2').catch(console.warn);
  import('./editor-runtime.js?v=owner-package-v2').catch(console.warn);
} else {
  document.querySelectorAll('img').forEach(img => img.loading = 'eager');
  const menu = document.querySelector('#mobile-menu');
  const menuButton = document.querySelector('.menu-button');
  menuButton?.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    menuButton.setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }));
  // These are feature descriptions in a snapshot, rather than app controls.
  document.querySelectorAll('.crew-beats button').forEach(button => button.tabIndex = -1);
  document.querySelector('.crew-phone-caption').textContent = 'Marvel Crew · Trailer, crew and earnings in one app';
}
