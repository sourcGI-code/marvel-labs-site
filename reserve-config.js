// Public configuration only. Never put Stripe secret keys in website files.
// tools/payments prepares and verifies links before enabling test or live checkout.
window.MARVEL_RESERVE = {
  mode: 'demo', deposit: 100, currency: 'USD', termsVersion: 'demo-2026-11-01',
  stripePaymentLinks: {'16-buy': '', '16-lease': '', '20-buy': '', '20-lease': ''}
};
