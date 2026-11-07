export const CHOICES = ['16-buy', '16-lease', '20-buy', '20-lease'];
export const TERMS_VERSION = 'reservation-2026-11-07';

export function validatePaymentConfig(config) {
  if (config?.mode === 'shopify-live') {
    if (config.deposit !== 100 || config.currency !== 'USD' || config.termsVersion !== TERMS_VERSION) {
      throw new Error('The reservation configuration needs to be updated.');
    }
    if (config.shopify?.storeDomain !== 'cr1bpi-qf.myshopify.com') throw new Error('Checkout must use the Marvel Shopify store.');
    const variants = CHOICES.map(choice => config.shopify?.variants?.[choice]);
    if (variants.some(id => typeof id !== 'string' || !/^\d{6,20}$/.test(id))) throw new Error('Shopify reservation products are not connected yet.');
    if (new Set(variants).size !== CHOICES.length) throw new Error('Each trailer and plan needs its own Shopify variant.');
    return config;
  }
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
  if (config.mode === 'shopify-live') {
    // Cart attributes retain the chosen configuration in the Shopify order.
    // Shopify's product variant controls the price; no amount is sent by the browser.
    const url = new URL(`https://${config.shopify.storeDomain}/cart/${config.shopify.variants[key]}:1`);
    url.searchParams.set('attributes[Trailer]', `${choice.size} ft · Mirror Graphite`);
    url.searchParams.set('attributes[Plan]', choice.plan === 'buy' ? 'Buy' : 'Lease');
    url.searchParams.set('attributes[Reservation terms]', config.termsVersion);
    return url.href;
  }
  return config.stripePaymentLinks[key];
}
