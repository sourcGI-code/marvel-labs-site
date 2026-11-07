export const CHOICES = ['16-buy', '16-lease', '20-buy', '20-lease'];
export const TERMS_VERSION = 'reservation-2026-11-07';

export function validatePaymentConfig(config) {
  if (!config || !['stripe-test', 'stripe-live'].includes(config.mode)) throw new Error('Checkout is not configured.');
  if (config.deposit !== 100 || config.currency !== 'USD' || config.termsVersion !== TERMS_VERSION) {
    throw new Error('The reservation configuration needs to be updated.');
  }
  const links = CHOICES.map(choice => {
    let url;
    try { url = new URL(config.stripePaymentLinks?.[choice]); } catch { throw new Error('Checkout is not available yet.'); }
    if (url.origin !== 'https://buy.stripe.com' || url.username || url.password || url.search || url.hash
      || !/^\/(?:test_)?[a-zA-Z0-9]+$/.test(url.pathname)
      || url.pathname.startsWith('/test_') !== (config.mode === 'stripe-test')) {
      throw new Error('The payment links do not match the checkout mode.');
    }
    return url.href;
  });
  if (new Set(links).size !== CHOICES.length) throw new Error('Each trailer and plan needs its own payment link.');
  return config;
}

export function checkoutURL(config, choice) {
  validatePaymentConfig(config);
  const key = `${choice.size}-${choice.plan}`;
  if (!CHOICES.includes(key)) throw new Error('Choose a trailer and plan before continuing.');
  return config.stripePaymentLinks[key];
}
