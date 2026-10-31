const storageKey = 'marvel-design-favorite-20261031';
let favorite = '';
try { favorite = localStorage.getItem(storageKey) || ''; } catch {}
const buttons = [...document.querySelectorAll('[data-save]')];
function render() {
  for (const b of buttons) {
    const selected = b.dataset.save === favorite;
    b.setAttribute('aria-pressed',String(selected));
    b.textContent = selected ? '★' : '☆';
  }
}
for (const b of buttons) b.addEventListener('click', () => {
  favorite = favorite === b.dataset.save ? '' : b.dataset.save;
  try { if (favorite) localStorage.setItem(storageKey,favorite); else localStorage.removeItem(storageKey); } catch {}
  render();
});
render();
