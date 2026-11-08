// Public configuration only. Never put Shopify access tokens in website files.
// Enable Shopify only after verifying its products, payments and public checkout.
window.MARVEL_RESERVE = {
  mode: 'shopify-live',
  deposit: 100,
  currency: 'USD',
  termsVersion: 'reservation-2026-11-07',
  provider: 'shopify',
  shopify: {
    storeDomain: 'cr1bpi-qf.myshopify.com',
    variants: {
      '16-buy': '52332951634166',
      '16-lease': '52332951666934',
      '20-buy': '52332951699702',
      '20-lease': '52332951732470'
    }
  }
};
