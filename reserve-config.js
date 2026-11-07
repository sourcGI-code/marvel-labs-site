// Public configuration only. Never put Shopify access tokens in website files.
// Enable Shopify only after verifying its products, payments and notifications.
window.MARVEL_RESERVE = {
  mode: 'unavailable', deposit: 100, currency: 'USD', termsVersion: 'reservation-2026-11-07',
  provider: 'shopify',
  shopify: {storeDomain: 'cr1bpi-qf.myshopify.com', variants: {'16-buy': '', '16-lease': '', '20-buy': '', '20-lease': ''}}
};
