import {checkoutURL, validatePaymentConfig, EXTERIOR_PREVIEWS} from './payment-links.js?v=checkout-preview-20261108';
import {readCampaign} from './campaign-attribution.js?v=launch-20261108';

// The payment provider hosts checkout and confirmation. This page never marks a
// reservation paid, stores card/contact details, or issues simulated refunds.
export function installReservationPayments({sec, form, selection, navigate = url => window.location.assign(url)}, config = window.MARVEL_RESERVE) {
  let step = 'configure';
  const submit = form.querySelector('[type="submit"]');
  const back = form.querySelector('[data-action="back"]');
  const error = form.querySelector('.rd-error');
  const note = form.querySelector('.rv-pay-note');
  const review = form.querySelector('[data-panel="review"]');
  const test = config?.mode === 'stripe-test';
  const shopify = config?.provider === 'shopify' || config?.mode === 'shopify-live';
  const provider = shopify ? 'Shopify' : 'Stripe';
  const checkoutChoice = () => ({...selection(), exteriorPreview: sec.classList.contains('jetblack-stage') ? 'jet-black' : 'mirror-graphite'});
  const showError = message => { error.textContent = message; error.hidden = false; };
  // Old demo receipts are not payments and must never be restored in production.
  try { window.sessionStorage.removeItem('marvel-reservation-demo-v1'); } catch { /* Storage may be disabled. */ }
  form.addEventListener('submit', event => event.preventDefault());
  form.setAttribute('aria-label', test ? 'Test trailer checkout' : 'Trailer reservation');
  let banner = form.querySelector('.rd-demo');
  if (!banner) { banner = document.createElement('p'); banner.className = 'rd-demo'; form.prepend(banner); }
  banner.textContent = test ? 'STRIPE TEST CHECKOUT · NO REAL CHARGE' : 'REFUNDABLE RESERVATION · $100 USD';

  for (const panel of form.querySelectorAll('[data-panel="details"], [data-panel="complete"], [data-panel="manage"]')) panel.remove();
  sec.querySelector('.rd-dialog')?.remove();
  sec.querySelector('.rd-email-dialog')?.remove();
  review.querySelector('[data-contact]')?.remove();
  review.querySelector('[data-action="edit-details"]')?.closest('.rd-panel-head')?.remove();
  const payment = review.querySelector('.rd-payment');
  payment.replaceChildren();
  const legend = document.createElement('legend'); legend.textContent = 'Secure checkout';
  const description = document.createElement('p'); description.className = 'rd-small';
  description.textContent = test
    ? 'Continue to Stripe’s test checkout to enter example contact details and a test payment method. No real money moves.'
    : `Enter your contact details and pay on ${provider}. The reservation deposit is $100 USD, plus applicable tax, if any. Review the final total before paying. Any installment option shown applies to this deposit checkout, not the trailer lease.`;
  payment.append(legend, description);
  const consent = review.querySelector('.rd-consent span');
  consent.replaceChildren(document.createTextNode('I’ve read the '));
  const policyLink = document.createElement('a');
  policyLink.href = shopify ? 'https://cr1bpi-qf.myshopify.com/policies/terms-of-service' : 'payments/reservation.html'; policyLink.target = '_blank'; policyLink.rel = 'noopener';
  policyLink.textContent = shopify ? 'reservation terms' : 'reservation terms, refund policy and privacy notice';
  consent.append(policyLink);
  if (shopify) {
    for (const [label, path] of [['refund policy', 'refund-policy'], ['privacy notice', 'privacy-policy']]) {
      const a = document.createElement('a'); a.textContent = label; a.href = `https://cr1bpi-qf.myshopify.com/policies/${path}`;
      a.target = '_blank'; a.rel = 'noopener'; consent.append(document.createTextNode(', '), a);
    }
  }
  consent.append(document.createTextNode(test ? '. I understand this is a test checkout.' : '. I understand that the deposit is $100 USD plus applicable tax, if any, and will review the final total on checkout. No automatic trailer balance or lease payment is authorized.'));
  review.querySelector(':scope > .rd-small').textContent = 'Final pricing, specifications and the Buy or Lease agreement are confirmed separately.';
  const policies = form.querySelector('.rd-policies'); policies.replaceChildren();
  const policyTargets = shopify
    ? [['Agreement', 'https://cr1bpi-qf.myshopify.com/policies/terms-of-service'], ['Refunds', 'https://cr1bpi-qf.myshopify.com/policies/refund-policy'], ['Privacy', 'https://cr1bpi-qf.myshopify.com/policies/privacy-policy']]
    : [['Agreement', 'payments/reservation.html#agreement'], ['Refunds', 'payments/reservation.html#refunds'], ['Privacy', 'payments/reservation.html#privacy'], ['Help', 'payments/reservation.html#help']];
  for (const [label, href] of policyTargets) {
    const a = document.createElement('a'); a.href = href; a.textContent = label;
    a.target = '_blank'; a.rel = 'noopener'; policies.append(a);
  }
  const steps = form.querySelector('.rd-steps'); steps.replaceChildren();
  for (const [i, [key, label]] of [['configure', 'Trailer'], ['review', 'Review'], ['payment', 'Payment']].entries()) {
    const li = document.createElement('li'), number = document.createElement('span');
    li.dataset.step = key; number.textContent = `0${i + 1}`; li.append(number, ` ${label}`); steps.append(li);
  }
  function renderOrder() {
    const {size, plan, exteriorPreview} = checkoutChoice();
    const entries = [['Trailer', `${size} ft`], ['Exterior preview', EXTERIOR_PREVIEWS[exteriorPreview]], ['Plan', plan === 'buy' ? 'Buy · 75% profit share' : 'Lease · $0 monthly lease fee · 25% profit share'],
      ['Reservation deposit', '$100 USD · fully refundable'], ['Tax', 'Applicable tax, if any, calculated at checkout'], ['Payment', test ? 'Stripe test checkout · no real charge' : 'One-time deposit · no automatic balance charge']];
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
    submit.textContent = next === 'configure' ? 'Review reservation ↗' : test ? 'Continue to Stripe test checkout ↗' : `Continue to ${provider} checkout ↗`;
    note.textContent = test ? 'Test mode. Use Stripe test payment details only.' : `${provider} confirms your order after checkout. Returning here does not confirm or cancel a reservation.`;
    if (next === 'review') renderOrder();
    if (focus) { form.querySelector('#rv-title').focus({preventScroll: true}); form.scrollTop = 0; }
  }
  go('configure', false);
  try { validatePaymentConfig(config); } catch {
    submit.disabled = true;
    submit.textContent = 'Checkout not available yet';
    banner.textContent = 'RESERVATIONS · CHECKOUT NOT OPEN';
    note.textContent = 'No payment has been collected and no reservation has been created.';
    policies.hidden = true;
    showError('Secure payment checkout is not available yet. Please check back soon.');
    return;
  }
  policies.hidden = false;
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (step === 'configure') { go('review'); return; }
    const consentInput = review.querySelector('[name="consent"]');
    if (!consentInput.reportValidity()) return;
    try {
      const url = checkoutURL(config, checkoutChoice(), readCampaign(window.location.search));
      submit.disabled = true; submit.textContent = `Opening ${provider}…`;
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
