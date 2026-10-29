// Reserve page rail (Claude, 2026-10-29). Owner 10-29: the 3D trailers on their own page, laid out like Tesla's
// Cybertruck reservation: the stage on the left with three numbers under it, on the right the size, the plan,
// "Due today $100", name / email / phone, the legal line and one button. Settings: reserve-config.js.
const sec = document.querySelector('section.rv');
if (sec) start(sec);

function start(sec) {
  const C = Object.assign({email: 'hello@marvellabs.com', checkout: {}, legal: {}, consent: 'implicit'}, window.MARVEL_RESERVE || {});
  const SPEC = {
    '20': {width: '8.5 ft', factory: '6 ft', cargo: '14 ft', buy: '$49,999.99'},
    '16': {width: '7 ft', factory: '6 ft', cargo: '10 ft', buy: '$44,999'}
  };
  const form = sec.querySelector('.rv-rail'), sizes = [...form.querySelectorAll('input[name="size"]')];
  const plans = [...form.querySelectorAll('input[name="plan"]')];
  const metric = k => sec.querySelector(`.rv-metrics [data-k="${k}"]`);
  const size = () => sizes.find(i => i.checked)?.value || '20', plan = () => plans.find(i => i.checked)?.value || 'buy';

  function show(s) {                                   // the numbers under the stage, the Buy price and the summary follow the size
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
    form.querySelector('.rv-summary').textContent = `${s} ft · ${buy ? 'Buy' : 'Lease'} · ${buy ? SPEC[s].buy : '$0 upfront'}`;
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

  // the legal line: a link for every document that has one, plain words until then
  for (const a of form.querySelectorAll('[data-legal]')) {
    const url = C.legal[a.dataset.legal];
    if (!url) continue;
    const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = a.textContent;
    a.replaceWith(link);
  }
  const box = form.querySelector('.rv-consent-box');
  if (C.consent === 'checkbox') { box.hidden = false; box.querySelector('input').required = true; form.querySelector('.rv-implicit').hidden = true; }
  const note = form.querySelector('.rv-pay-note');
  const paid = () => !!C.checkout[size()];
  const noteText = () => paid() ? 'You pay the $100 deposit on the next, secure step.'
    : `Sends your reservation to ${C.email}. We reply with a secure link to pay the $100 deposit.`;
  note.textContent = noteText();
  sec.addEventListener('rs:size', () => { note.textContent = noteText(); });
  for (const i of sizes) i.addEventListener('change', () => { note.textContent = noteText(); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = new FormData(form), s = size(), pl = plan() === 'buy' ? 'Buy' : 'Lease';
    if (paid()) {                                      // Stripe Payment Link: carry the email and the choice through
      const u = new URL(C.checkout[s], location.href);
      u.searchParams.set('prefilled_email', d.get('email'));
      u.searchParams.set('client_reference_id', `${s}ft-${pl.toLowerCase()}`);
      location.href = u.href; return;
    }
    const subject = `Reservation: ${s} ft Marvel Labs trailer (${pl}) · $100 refundable deposit`;
    const body = [`Hi Marvel Labs,`, ``, `I'd like to reserve a ${s} ft autonomous microfactory trailer with the $100 fully refundable deposit.`, ``,
      `Size: ${s} ft (${SPEC[s].width} wide · ${SPEC[s].factory} factory · ${SPEC[s].cargo} rear cargo)`,
      `Plan: ${pl} (${pl === 'Buy' ? SPEC[s].buy + ' · 75% profit share' : '$0 upfront · 25% profit share'})`, ``,
      `Name: ${d.get('name')}`, `Email: ${d.get('email')}`, `Phone: ${d.get('phone')}`, ``, `Please send my $100 deposit link.`].join('\n');
    location.href = `mailto:${C.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    form.classList.add('is-sent');
    form.querySelector('.rv-sent').hidden = false;
  });

  const open = new URLSearchParams(location.search).get('size') || sec.dataset.open;
  show(SPEC[open] ? open : size());
  if (SPEC[open]) {                                      // reserve-3d.js opens it once the models are in, whichever script ran first
    sec.dataset.open = open; sec.dispatchEvent(new CustomEvent('rs:enter', {detail: open}));
  }
}
