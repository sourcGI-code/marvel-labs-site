import {checkoutURL, validatePaymentConfig} from './payment-links.js?v=stripe-v1';

// Stripe hosts checkout and its payment confirmation. This page never marks a
// reservation paid, stores card/contact details, or issues simulated refunds.
export function installReservationPayments({sec, form, selection, navigate = url => window.location.assign(url)}, config = window.MARVEL_RESERVE) {
  let step = 'configure';
  const submit = form.querySelector('[type="submit"]');
  const back = form.querySelector('[data-action="back"]');
  const error = form.querySelector('.rd-error');
  const note = form.querySelector('.rv-pay-note');
  const review = form.querySelector('[data-panel="review"]');
  const test = config?.mode === 'stripe-test';
  const showError = message => { error.textContent = message; error.hidden = false; };
  form.addEventListener('submit', event => event.preventDefault());
  form.setAttribute('aria-label', test ? 'Test trailer checkout' : 'Trailer reservation');
  let banner = form.querySelector('.rd-demo');
  if (!banner) { banner = document.createElement('p'); banner.className = 'rd-demo'; form.prepend(banner); }
  banner.textContent = test ? 'STRIPE TEST CHECKOUT · NO REAL CHARGE' : 'REFUNDABLE RESERVATION · $100 USD';

  for (const panel of form.querySelectorAll('[data-panel="details"], [data-panel="complete"], [data-panel="manage"]')) panel.remove();
  sec.querySelector('.rd-dialog')?.remove();
  sec.querySelector('.rd-email-dialog')?.remove();
  review.querySelector('[data-contact]').remove();
  review.querySelector('[data-action="edit-details"]').closest('.rd-panel-head').remove();
  const payment = review.querySelector('.rd-payment');
  payment.replaceChildren();
  const legend = document.createElement('legend'); legend.textContent = 'Secure checkout';
  const description = document.createElement('p'); description.className = 'rd-small';
  description.textContent = test
    ? 'Continue to Stripe’s test checkout to enter example contact details and a test payment method. No real money moves.'
    : 'Enter your contact details and pay on Stripe. Available cards and wallets are shown at checkout. Only the $100 reservation deposit is due.';
  payment.append(legend, description);
  const consent = review.querySelector('.rd-consent span');
  consent.replaceChildren(document.createTextNode('I’ve read the '));
  const policyLink = document.createElement('a');
  policyLink.href = 'payments/reservation.html'; policyLink.target = '_blank'; policyLink.rel = 'noopener';
  policyLink.textContent = 'reservation terms, refund policy and privacy notice';
  consent.append(policyLink, document.createTextNode(test ? '. I understand this is a test checkout.' : '. I understand that $100 USD is due now and no further payment is authorized.'));
  review.querySelector(':scope > .rd-small').textContent = 'Final pricing, specifications and the Buy or Lease agreement are confirmed separately.';
  const policies = form.querySelector('.rd-policies'); policies.replaceChildren();
  for (const [label, hash] of [['Agreement', 'agreement'], ['Refunds', 'refunds'], ['Privacy', 'privacy'], ['Help', 'help']]) {
    const a = document.createElement('a'); a.href = `payments/reservation.html#${hash}`; a.textContent = label;
    a.target = '_blank'; a.rel = 'noopener'; policies.append(a);
  }
  const steps = form.querySelector('.rd-steps'); steps.replaceChildren();
  for (const [i, [key, label]] of [['configure', 'Trailer'], ['review', 'Review'], ['payment', 'Payment']].entries()) {
    const li = document.createElement('li'), number = document.createElement('span');
    li.dataset.step = key; number.textContent = `0${i + 1}`; li.append(number, ` ${label}`); steps.append(li);
  }
  function renderOrder() {
    const {size, plan} = selection();
    const entries = [['Trailer', `${size} ft · Mirror Graphite`], ['Plan', plan === 'buy' ? 'Buy · 75% profit share' : 'Lease · 25% profit share'],
      ['Reservation deposit', '$100 USD · fully refundable'], ['Payment', test ? 'Stripe test checkout · no real charge' : 'One-time deposit · no automatic balance charge']];
    form.querySelector('[data-order]').replaceChildren(...entries.map(([label, value]) => {
      const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = value; row.append(dt, dd); return row;
    }));
  }
  function go(next, focus = true) {
    step = next; sec.dataset.orderStep = next; error.hidden = true;
    for (const panel of form.querySelectorAll('[data-panel]')) {
      panel.hidden = panel.dataset.panel !== next;
      for (const input of panel.querySelectorAll('input')) input.disabled = panel.hidden;
    }
    for (const li of steps.children) {
      if (li.dataset.step === next) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.toggleAttribute('data-done', next === 'review' && li.dataset.step === 'configure');
    }
    back.hidden = next === 'configure';
    submit.disabled = false;
    submit.textContent = next === 'configure' ? 'Review reservation ↗' : test ? 'Continue to Stripe test checkout ↗' : 'Continue to pay $100 ↗';
    note.textContent = test ? 'Test mode. Use Stripe test payment details only.' : 'Stripe confirms payment after checkout. Returning here does not confirm or cancel a reservation.';
    if (next === 'review') renderOrder();
    if (focus) { form.querySelector('#rv-title').focus({preventScroll: true}); form.scrollTop = 0; }
  }
  go('configure', false);
  try { validatePaymentConfig(config); } catch (e) {
    submit.disabled = true;
    submit.textContent = 'Checkout unavailable';
    showError(`${e.message} Please try again later.`);
    return;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (step === 'configure') { go('review'); return; }
    const consentInput = review.querySelector('[name="consent"]');
    if (!consentInput.reportValidity()) return;
    try {
      const url = checkoutURL(config, selection());
      submit.disabled = true; submit.textContent = 'Opening Stripe…';
      navigate(url);
    } catch (e) { submit.disabled = false; showError(e.message); }
  });
  form.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'back' || action === 'edit-trailer') {
      review.querySelector('[name="consent"]').checked = false; go('configure');
    }
  });
  form.addEventListener('change', event => {
    if (['size', 'plan'].includes(event.target.name)) review.querySelector('[name="consent"]').checked = false;
  });
  window.addEventListener('pageshow', () => { go(step, false); });
}
