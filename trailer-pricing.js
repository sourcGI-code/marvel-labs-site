const menu = document.querySelector('#mobile-menu');
const toggle = document.querySelector('.menu-button');
function closeMenu() {
  menu.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
}
toggle.addEventListener('click', () => {
  menu.hidden = !menu.hidden;
  toggle.setAttribute('aria-expanded', String(!menu.hidden));
});
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !menu.hidden) { closeMenu(); toggle.focus(); }
});

const form = document.querySelector('#inquiry-form');
const selection = form.elements.interest;
const allowed = [...selection.options].map(option => option.value);
const requested = new URLSearchParams(location.search).get('plan');
if (allowed.includes(requested)) selection.value = requested;
document.querySelectorAll('[data-plan]').forEach(link => {
  link.addEventListener('click', () => {
    selection.value = link.dataset.plan;
    const url = new URL(location.href);
    url.searchParams.set('plan', selection.value);
    history.replaceState(null, '', url);
  });
});
// A prepared draft is the existing contact path; this does not send a message.
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const name = form.elements.name.value.trim();
  const message = form.elements.message.value.trim();
  if (!name || !message) {
    document.querySelector('#form-status').textContent = 'Please add your name and equipment needs.';
    return;
  }
  const size = document.body.dataset.trailerSize;
  const buyPrice = size === '16' ? '$44,999' : '$49,999.99';
  const plan = selection.value === 'buy' ? `Buy — ${buyPrice} / 75% operator profit share` : 'Free — $0 upfront / 25% operator profit share';
  const business = form.elements.business.value.trim();
  const subject = `${size} ft Autonomous Microfactory — ${selection.value === 'buy' ? 'Buy' : 'Free'}`;
  const body = `Hello,\n\nI’m interested in the ${size} ft Autonomous Microfactory trailer.\nPlan: ${plan}\nBusiness / service area: ${business || 'Not provided'}\n\n${message}\n\nPlease send the configuration, profit-share calculation, plan terms and availability.\n\n${name}`;
  const fallback = document.querySelector('#email-fallback');
  fallback.href = `mailto:hello@marvellabs.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  fallback.hidden = false;
  document.querySelector('#form-status').textContent = 'Your request is prepared. Open the email draft to review and send it.';
  fallback.focus();
});
