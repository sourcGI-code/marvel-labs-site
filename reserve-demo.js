import {createReservationEmail, emailDraft} from './reservation-email.js?v=resend-demo-v1';
import {installEmailDelivery} from './reservation-email-delivery.js?v=resend-demo-v1';
const STORAGE = 'marvel-reservation-demo-v1';
const money = value => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: value % 1 ? 2 : 0}).format(value);
const price = size => size === '16' ? 44999 : 49999.99;
const planName = plan => plan === 'buy' ? 'Buy · 75% profit share' : 'Lease · 25% profit share';

// Payment remains simulated. Optional email delivery uses the configured server endpoint.
export function installReservationDemo({sec, form, selection, restore}) {
  let step = 'configure', record = null, busy = false;
  const panels = [...form.querySelectorAll('[data-panel]')];
  const submit = form.querySelector('[type="submit"]');
  const back = form.querySelector('[data-action="back"]');
  const note = form.querySelector('.rv-pay-note');
  const error = form.querySelector('.rd-error');
  const title = form.querySelector('#rv-title');
  const dialog = sec.querySelector('.rd-dialog');
  const emailDialog = sec.querySelector('.rd-email-dialog');
  let message = null;
  const value = name => form.querySelector(`[name="${name}"]`)?.value.trim() || '';
  const delivery = installEmailDelivery({form,getRecord:()=>record,getContact:()=>({name:value('name'),email:value('email')})});
  const method = () => form.querySelector('[name="payment"]:checked')?.value || 'card';
  const methodNames = {card: 'Demo Visa ···· 4242', apple: 'Apple Pay · demo wallet', google: 'Google Pay · demo wallet'};

  function rows(target, entries) {
    target.replaceChildren(...entries.map(([label, text]) => {
      const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = text; row.append(dt, dd); return row;
    }));
  }
  function orderRows(choice, receipt = false) {
    const cancelled = receipt && record?.status === 'cancelled';
    return [
      ['Trailer', `${choice.size} ft · Mirror Graphite`],
      ['Plan', planName(choice.plan)],
      ['Footprint', choice.size === '16' ? '16 ft × 7 ft' : '20 ft × 8.5 ft'],
      ['Factory / cargo', choice.size === '16' ? '6 ft / 10 ft' : '6 ft / 14 ft'],
      ...(choice.plan === 'buy' ? [
        ['Trailer price', money(price(choice.size))],
        ['After deposit*', money(price(choice.size) - (cancelled ? 0 : 100))]
      ] : [['Lease terms', 'Confirmed in a separate agreement']]),
      [receipt ? (cancelled ? 'Refund preview' : 'Deposit preview') : 'Reservation deposit', '$100 · fully refundable'],
      ...(receipt ? [['Status', cancelled ? 'Cancelled · demo' : 'Reserved · demo'], ['Payment', methodNames[record.payment]]] : [])
    ];
  }
  function renderReview() {
    rows(form.querySelector('[data-order]'), orderRows(selection()));
    form.querySelector('[data-contact]').textContent = [value('name'), value('company'), value('email'), value('phone'), value('area')].filter(Boolean).join('\n');
  }
  function renderConfirmation() {
    if (!record) return;
    const cancelled = record.status === 'cancelled';
    for (const el of form.querySelectorAll('.rd-reference')) el.textContent = `Reservation number · ${record.id}`;
    form.querySelector('[data-action="email-preview"]').textContent = cancelled ? 'View cancellation email' : 'View confirmation email';
    delivery.update();
    form.querySelector('.rd-confirm-title').textContent = cancelled ? 'Cancelled. Fully refunded.' : 'You’re on the list.';
    form.querySelector('.rd-confirm-copy').textContent = cancelled
      ? 'Your demo reservation is cancelled and the $100 refund is simulated. No money was charged or refunded.'
      : 'Your demo reservation is complete. No payment was taken and no real reservation was created.';
    form.querySelector('.rd-check').textContent = cancelled ? '↩' : '✓';
    for (const target of form.querySelectorAll('[data-receipt], [data-manage]')) rows(target, orderRows(record, true));
    form.querySelector('[data-action="cancel"]').hidden = cancelled;
    form.querySelector('.rd-next').hidden = cancelled;
    form.querySelector('[data-action="edit-trailer"]').textContent = 'Edit trailer';
    form.querySelector('[data-panel="manage"] [data-action="edit-trailer"]').textContent = cancelled ? 'Start another preview' : 'Change configuration';
  }
  function save() {
    // Only configuration, method labels and the demo reference persist. No name/email/phone.
    try { sessionStorage.setItem(STORAGE, JSON.stringify(record)); } catch { /* still usable in memory */ }
  }
  function go(next, focus = true) {
    if (busy) return;
    step = next; sec.dataset.orderStep = next; error.hidden = true;
    if (step === 'details') {
      sec.dataset.open = selection().size;
      sec.dispatchEvent(new CustomEvent('rs:enter', {detail: selection().size}));
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.panel !== step;
      for (const input of panel.querySelectorAll('input')) input.disabled = panel.hidden;
    }
    const index = ['configure', 'details', 'review'].indexOf(step);
    for (const [i, item] of [...form.querySelectorAll('[data-step]')].entries()) {
      item.toggleAttribute('data-done', index < 0 || i < index);
      if (i === index) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    }
    submit.hidden = index < 0;
    back.hidden = index <= 0;
    const labels = {configure: 'Continue', details: 'Review reservation', review: 'Reserve for $100'};
    if (labels[step]) {
      const arrow = document.createElement('span'); arrow.textContent = '↗';
      submit.replaceChildren(document.createTextNode(labels[step] + ' '), arrow);
    }
    note.hidden = index < 0;
    note.textContent = step === 'review' ? 'Demo payment only. No charge and no real reservation.' : 'Preview the complete reservation. No charge.';
    form.querySelector('.rv-when').hidden = index < 0;
    form.querySelector('.rd-steps').hidden = index < 0;
    if (step === 'review') renderReview();
    if (index < 0) renderConfirmation();
    if (focus) {
      title.focus({preventScroll: true});
      const rail = getComputedStyle(form).overflowY;
      if (rail === 'auto' || rail === 'scroll') form.scrollTop = 0;
      title.scrollIntoView({block: 'start', behavior: 'instant'});
    }
  }
  function validate(panel) {
    for (const input of form.querySelector(`[data-panel="${panel}"]`).querySelectorAll('input')) {
      if (input.required && input.type !== 'checkbox' && !input.value.trim()) input.value = '';
      if (!input.reportValidity()) return false;
    }
    return true;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (step === 'configure') { go('details'); return; }
    if (step === 'details') { if (validate('details')) go('review'); return; }
    if (step !== 'review' || !validate('review')) return;
    busy = true; submit.disabled = true; submit.textContent = 'Preparing your demo reservation…';
    await new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : 550));
    const choice = selection();
    record = {id: record?.status === 'reserved' ? record.id : `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      size: choice.size, plan: choice.plan, payment: method(), status: 'reserved',
      createdAt: record?.createdAt || new Date().toISOString(), termsVersion: 'demo-2026-11-01'};
    save(); busy = false; submit.disabled = false; go('complete'); void delivery.send();
  });
  form.addEventListener('change', event => {
    if (event.target.name === 'payment') form.querySelector('.rd-payment-detail').textContent = methodNames[method()];
    if (['size', 'plan'].includes(event.target.name)) form.querySelector('[name="consent"]').checked = false;
  });
  form.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action || busy) return;
    if (action === 'fill-demo') {
      const demo = {name: 'Alex Morgan', email: 'alex@example.com', phone: '202-555-0142', company: 'Greenline Landscaping', area: 'Richmond, VA'};
      for (const [name, text] of Object.entries(demo)) form.querySelector(`[name="${name}"]`).value = text;
      form.querySelector('[name="name"]').focus();
    }
    if (action === 'back') go(step === 'review' ? 'details' : 'configure');
    if (action === 'edit-trailer') {
      if (record?.status === 'cancelled') { record = null; try { sessionStorage.removeItem(STORAGE); } catch {} }
      form.querySelector('[name="consent"]').checked = false; go('configure');
    }
    if (action === 'edit-details') go('details');
    if (action === 'manage') go('manage');
    if (action === 'confirmation') go('complete');
    if (action === 'print') window.print();
    if (action === 'email-preview') {
      message = createReservationEmail(record, {name: value('name'), email: value('email')});
      emailDialog.querySelector('#email-preview-title').textContent = record.status === 'cancelled' ? 'Your cancellation email.' : 'Your confirmation email.';
      emailDialog.querySelector('[data-email-to]').textContent = message.recipient || 'Your email address (not saved after refresh)';
      emailDialog.querySelector('[data-email-subject]').textContent = message.subject;
      emailDialog.showModal();
      // Build the frame after the dialog is visible; reused hidden frames can
      // keep a zero-sized document when the preview is opened again.
      const frame = document.createElement('iframe');
      frame.title = record.status === 'cancelled' ? 'Marvel Labs cancellation email' : 'Marvel Labs confirmation email';
      frame.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
      emailDialog.querySelector('iframe').replaceWith(frame);
      frame.srcdoc = message.html;
      emailDialog.scrollTop = 0;
    }
    if (action === 'cancel' && record?.status === 'reserved') dialog.showModal();
  });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'refund' || !record || record.status === 'cancelled') return;
    record.status = 'cancelled'; save(); go('complete'); void delivery.send();
  });
  emailDialog.querySelector('[data-email-close]').addEventListener('click', () => emailDialog.close());
  emailDialog.querySelector('[data-email-download]').addEventListener('click', () => {
    if (!message) return;
    const url = URL.createObjectURL(new Blob([emailDraft(message)], {type: 'message/rfc822'}));
    const a = document.createElement('a'); a.href = url; a.download = `${record.id}-${record.status === 'cancelled' ? 'cancellation' : 'confirmation'}.eml`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  let stored;
  try { stored = JSON.parse(sessionStorage.getItem(STORAGE)); } catch {}
  if (stored && (!sec.dataset.open || sec.dataset.open === stored.size) && /^DEMO-[A-F0-9]{8}$/.test(stored.id) && ['16', '20'].includes(stored.size) && ['buy', 'lease'].includes(stored.plan)
    && ['reserved', 'cancelled'].includes(stored.status) && Object.hasOwn(methodNames, stored.payment) && stored.termsVersion === 'demo-2026-11-01') {
    record = {id: stored.id, size: stored.size, plan: stored.plan, status: stored.status, payment: stored.payment, termsVersion: stored.termsVersion,
      createdAt: typeof stored.createdAt === 'string' ? stored.createdAt : new Date().toISOString()};
    restore(record); go('complete', false);
  } else go('configure', false);
}
