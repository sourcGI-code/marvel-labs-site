const dock = document.querySelector('.dc-review');
const toggle = dock?.querySelector('.dc-review-toggle');
const menu = document.getElementById('dc-review-menu');
const close = () => { if (!menu) return; menu.hidden = true; toggle.setAttribute('aria-expanded','false'); };
toggle?.addEventListener('click', () => { menu.hidden = !menu.hidden; toggle.setAttribute('aria-expanded', String(!menu.hidden)); });
document.addEventListener('pointerdown', e => { if (!dock?.contains(e.target)) close(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu && !menu.hidden) {close();toggle.focus();} });
// A switch compares the same chapter in a different layout, when possible.
toggle?.addEventListener('click', () => {
  for (const a of menu.querySelectorAll('a[href^="design-"]')) {
    const url = new URL(a.href); const id = document.body.dataset.activeScene;
    url.hash = id && id !== 'top' && id !== 'footer' ? id : '';
    a.href = url.href;
  }
});

const calculator = document.querySelector('.dc-calculator');
if (calculator) {
  const units = calculator.elements.units, share = calculator.elements.share;
  const money = n => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  const update = () => {
    const n = Number(units.value), amount = Number(share.value), result = money(n * amount);
    document.getElementById('dc-units-value').value = n;
    document.getElementById('dc-share-value').value = money(amount);
    document.getElementById('dc-total').value = result;
    document.getElementById('dc-equation').textContent = `${n} sales × ${money(amount)} = ${result} before expenses.`;
  };
  calculator.addEventListener('input', update);
  calculator.addEventListener('reset', () => setTimeout(update, 0));
  update();
}

const studio = document.querySelector('.dc-studio');
if (studio) {
  let started = false;
  async function start() {
    if (started || document.body.dataset.activeScene !== 'sizes') return;
    started = true;
    try {
      await import('./design-studio.js?v=1');
    } catch (error) {
      studio.querySelector('.dc-studio-fallback p').textContent = 'The interactive view is unavailable. Explore either size using the links.';
      console.warn('3D studio unavailable.', error.message);
    }
  }
  new MutationObserver(start).observe(document.body,{attributes:true,attributeFilter:['data-active-scene']});
  start();
  // The viewer supports click/touch selection; add arrow-key radio navigation.
  studio.querySelector('.rs-switch').addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    const buttons = [...studio.querySelectorAll('.rs-switch button')];
    const next = buttons[(buttons.indexOf(document.activeElement)+1)%buttons.length];
    next.focus();next.click();
  });
}
