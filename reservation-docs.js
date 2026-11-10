document.querySelector('#print-document')?.addEventListener('click', () => window.print());
const query = new URLSearchParams(location.search), size = query.get('size'), plan = query.get('plan');
const title = document.querySelector('#agreement-selection'), spec = document.querySelector('#agreement-spec');
if (title && ['16', '20'].includes(size) && ['buy', 'lease'].includes(plan)) {
  title.textContent = `${size} ft · ${plan === 'buy' ? 'Buy' : 'Lease'} · Mirror Graphite`;
  spec.textContent = size === '16' ? '16 ft × 8.5 ft · 6 ft 2½ in enclosed factory · 9 ft 9½ in cargo' : '20 ft × 8.5 ft · 6 ft 2½ in enclosed factory · 13 ft 9½ in cargo';
}
