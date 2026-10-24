(() => {
  const views = {
    a: {
      image: 'a-existing-setup.webp',
      caption: 'A · Existing setup — photographic concept based on the current website layout.',
      alt: 'Concept A: the existing ranch-house layout with realistic lawn, a charcoal wrapped trailer, black pickup and yellow zero-turn mower.'
    },
    b: {
      image: 'b-representative-setup.webp',
      caption: 'B · Representative setup — fuller planting, a lower viewpoint and more detailed equipment.',
      alt: 'Concept B: a representative farmhouse landscape with dense mature planting, detailed yellow zero-turn mower, open charcoal trailer and unbranded black pickup.'
    },
    current: {
      image: 'current-scene.webp',
      caption: 'Current 3D scene — source screenshot, before rebuilding the models.',
      alt: 'Current website 3D scene showing sparse vegetation, simplified mower geometry and the existing house and trailer layout.'
    }
  };
  const preview = document.querySelector('#preview');
  let revision = 0;
  async function show(key) {
    const view = views[key];
    if (!view) return;
    const token = ++revision;
    const source = `assets/realism-comparison/${view.image}`;
    const loaded = new Image();
    loaded.src = source;
    try { await loaded.decode(); } catch { return; }
    if (token !== revision) return;
    preview.src = source;
    preview.alt = view.alt;
    document.querySelector('#caption').textContent = view.caption;
    document.querySelector('#full-size').href = source;
    history.replaceState(null, '', `#${key}`);
  }
  for (const input of document.querySelectorAll('input[name="view"]')) {
    input.addEventListener('change', () => { if (input.checked) show(input.value); });
  }
  function selectHash() {
    const key = location.hash.slice(1);
    if (!views[key]) return;
    document.querySelector(`input[value="${key}"]`).checked = true;
    show(key);
  }
  window.addEventListener('hashchange', selectHash);
  selectHash();
})();
