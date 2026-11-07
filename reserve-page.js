import {installReservationPayments} from './reserve-payments.js?v=production-checkout-v2';
const sec = document.querySelector('section.rv');
if (sec) start(sec);

function start(sec) {
  const SPEC = {
    '20': {width: '8.5 ft', factory: '6 ft 2½ in', cargo: '13 ft 9½ in', buy: '$49,999.99'},
    '16': {width: '7 ft', factory: '6 ft 2½ in', cargo: '9 ft 9½ in', buy: '$44,999'}
  };
  const form = sec.querySelector('.rv-rail'), sizes = [...form.querySelectorAll('input[name="size"]')];
  const plans = [...form.querySelectorAll('input[name="plan"]')];
  const metric = k => sec.querySelector(`.rv-metrics [data-k="${k}"]`);
  const size = () => sizes.find(i => i.checked)?.value || '20', plan = () => plans.find(i => i.checked)?.value || 'buy';

  function show(s) {
    if (sec.dataset.orderStep && sec.dataset.orderStep !== 'configure') return; // the numbers under the stage, the Buy price and the summary follow the size
    const p = SPEC[s]; if (!p) return;
    for (const i of sizes) i.checked = i.value === s;
    for (const k of ['width', 'factory', 'cargo']) {
      const el = metric(k); if (el.textContent === p[k]) continue;
      el.classList.remove('is-new'); void el.offsetWidth; el.textContent = p[k]; el.classList.add('is-new');
    }
    sec.querySelector('.rv-metrics-size').textContent = `${s} ft`;
    form.querySelector('[data-buy-price]').textContent = p.buy;
    summary();
  }
  function summary() {
    const s = size(), buy = plan() === 'buy';
    form.querySelector('.rv-summary').textContent = `${s} ft · ${buy ? 'Buy' : 'Lease'} · ${buy ? SPEC[s].buy : '$100 now'}`;
  }

  // a size card: hover (mouse) or choose it, and the stage goes to that trailer
  for (const i of sizes) {
    const card = i.closest('label');
    i.addEventListener('change', () => { show(i.value); sec.dispatchEvent(new CustomEvent('rs:enter', {detail: i.value})); });
    let t = 0;
    card.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse') return;
      t = setTimeout(() => { if (!i.checked || sec.dataset.mode !== 'viewer') { show(i.value); sec.dispatchEvent(new CustomEvent('rs:enter', {detail: i.value})); } }, 160);
    });
    card.addEventListener('pointerleave', () => clearTimeout(t));
  }
  for (const i of plans) i.addEventListener('change', summary);
  sec.addEventListener('rs:size', e => show(e.detail));   // hovering a trailer on the stage picks it here too

  const open = new URLSearchParams(location.search).get('size') || sec.dataset.open;
  show(SPEC[open] ? open : size());
  if (SPEC[open]) { sec.dataset.open = open; sec.dispatchEvent(new CustomEvent('rs:enter', {detail: open})); }
  installReservationPayments({sec, form, selection: () => ({size: size(), plan: plan() === 'buy' ? 'buy' : 'lease'})});
}
