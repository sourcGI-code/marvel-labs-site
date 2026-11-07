import {CHOICES} from '../../payment-links.js';
export const INTEGRATION = 'marvel-reservation-v1';

export function stripeClient(key, mode, transport = fetch) {
  if (!['test', 'live'].includes(mode) || !new RegExp(`^(sk|rk)_${mode}_`).test(key || '')) {
    throw new Error('Set STRIPE_SECRET_KEY privately to a key matching --mode test or --mode live.');
  }
  return async function request(path, params, idempotencyKey) {
    const response = await transport(`https://api.stripe.com/v1/${path}`, {
      method: params ? 'POST' : 'GET',
      headers: {Authorization: `Bearer ${key}`, 'Stripe-Version': '2026-10-28.endive',
        ...(params ? {'Content-Type': 'application/x-www-form-urlencoded'} : {}),
        ...(idempotencyKey ? {'Idempotency-Key': idempotencyKey} : {})},
      ...(params ? {body: new URLSearchParams(params)} : {}),
      signal: AbortSignal.timeout(30000)
    });
    // Do not echo Stripe errors: authentication errors can contain key fragments.
    if (!response.ok) throw new Error(`Stripe request failed (HTTP ${response.status}). Check the key permissions and account settings; no key has been logged.`);
    return response.json();
  };
}

async function listAll(request, resource) {
  const data = []; let after;
  for (let page = 0; page < 100; page++) {
    const query = new URLSearchParams({limit: '100', ...(after ? {starting_after: after} : {})});
    const result = await request(`${resource}?${query}`);
    data.push(...result.data);
    if (!result.has_more) return data;
    after = result.data.at(-1)?.id;
    if (!after) break;
  }
  throw new Error('Stripe pagination did not complete. No duplicate links will be created.');
}

export async function verifyLink(request, link, choice, mode) {
  const valid = link.active === true && link.livemode === (mode === 'live')
    && link.metadata?.integration === INTEGRATION && link.metadata?.choice === choice
    && link.after_completion?.type === 'hosted_confirmation'
    && link.consent_collection?.terms_of_service === 'required'
    && link.phone_number_collection?.enabled === true
    && link.name_collection?.individual?.enabled === true && link.name_collection.individual.optional === false
    && link.billing_address_collection === 'required'
    && link.payment_method_types?.length === 1 && link.payment_method_types[0] === 'card'
    && !link.allow_promotion_codes && !link.automatic_tax?.enabled
    && !link.optional_items?.length && !link.shipping_options?.length
    && !link.payment_intent_data?.setup_future_usage && link.payment_intent_data?.capture_method !== 'manual';
  if (!valid) throw new Error(`Stripe settings for ${choice} need review before activation.`);
  const items = await request(`payment_links/${encodeURIComponent(link.id)}/line_items?limit=100`);
  if (items.has_more || items.data.length !== 1 || items.data[0].quantity !== 1
    || items.data[0].adjustable_quantity?.enabled || items.data[0].price?.currency !== 'usd'
    || items.data[0].price?.unit_amount !== 10000 || items.data[0].price?.type !== 'one_time'
    || items.data[0].price?.recurring || !items.data[0].price?.active) {
    throw new Error(`${choice} must charge exactly one $100 USD deposit with no recurring charge or adjustable quantity.`);
  }
  return link.url;
}

export async function prepareLinks(request, {mode, termsVersion, supportEmail}) {
  const existing = await listAll(request, 'payment_links');
  const links = {};
  for (const choice of CHOICES) {
    const [size, plan] = choice.split('-');
    const matches = existing.filter(link => link.active && link.metadata?.integration === INTEGRATION && link.metadata?.choice === choice);
    if (matches.length > 1) throw new Error(`Multiple active links exist for ${choice}; review them in Stripe before continuing.`);
    let link = matches[0];
    if (!link) {
      const lookup = `${INTEGRATION}-${choice}`;
      const prices = await request(`prices?lookup_keys[]=${encodeURIComponent(lookup)}&limit=100`);
      if (prices.data.length > 1) throw new Error(`Multiple prices exist for ${choice}.`);
      let price = prices.data[0];
      if (!price) price = await request('prices', {
        currency: 'usd', unit_amount: '10000', lookup_key: lookup,
        'product_data[name]': `Marvel Labs ${size} ft trailer — ${plan === 'buy' ? 'Buy' : 'Lease'} reservation deposit`,
        'product_data[metadata][integration]': INTEGRATION,
        'product_data[metadata][choice]': choice
      }, `${INTEGRATION}-price-${choice}`);
      if (!price.active || price.unit_amount !== 10000 || price.currency !== 'usd' || price.type !== 'one_time') {
        throw new Error(`Existing price for ${choice} is not an active one-time $100 USD deposit.`);
      }
      link = await request('payment_links', {
        'line_items[0][price]': price.id, 'line_items[0][quantity]': '1',
        'line_items[0][adjustable_quantity][enabled]': 'false',
        'payment_method_types[0]': 'card', billing_address_collection: 'required',
        'name_collection[individual][enabled]': 'true', 'name_collection[individual][optional]': 'false',
        'name_collection[business][enabled]': 'true', 'name_collection[business][optional]': 'true',
        'phone_number_collection[enabled]': 'true',
        'consent_collection[terms_of_service]': 'required',
        'metadata[integration]': INTEGRATION, 'metadata[choice]': choice, 'metadata[terms_version]': termsVersion,
        'payment_intent_data[metadata][integration]': INTEGRATION,
        'payment_intent_data[metadata][choice]': choice,
        'payment_intent_data[metadata][terms_version]': termsVersion,
        'payment_intent_data[description]': `Refundable $100 reservation deposit: ${size} ft trailer, ${plan === 'buy' ? 'Buy' : 'Lease'} plan`,
        'custom_text[submit][message]': 'Fully refundable $100 USD reservation deposit. Final specifications, delivery, pricing and plan terms are confirmed separately. No automatic balance payment.',
        'after_completion[type]': 'hosted_confirmation',
        'after_completion[hosted_confirmation][custom_message]': `Thank you. Your $100 Marvel Labs reservation deposit is paid. Keep your Stripe receipt. For changes or a full deposit refund, contact ${supportEmail}.`,
        'custom_fields[0][key]': 'servicearea', 'custom_fields[0][label][type]': 'custom',
        'custom_fields[0][label][custom]': 'Service area (city and state)', 'custom_fields[0][type]': 'text', 'custom_fields[0][optional]': 'true'
      }, `${INTEGRATION}-link-${choice}`);
    }
    if (link.metadata?.terms_version !== termsVersion) throw new Error(`The ${choice} link uses an older reservation agreement.`);
    links[choice] = await verifyLink(request, link, choice, mode);
  }
  return links;
}
