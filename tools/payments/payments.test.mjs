import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, mkdir, copyFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {CHOICES, TERMS_VERSION, validatePaymentConfig, checkoutURL} from '../../payment-links.js';
import {installReservationPayments} from '../../reserve-payments.js';
import {stripeClient, prepareLinks, verifyLink, INTEGRATION} from './stripe.mjs';
import {reservationPolicy} from './policy.mjs';

const config = (mode = 'test') => ({mode: `stripe-${mode}`, deposit: 100, currency: 'USD', termsVersion: TERMS_VERSION,
  supportEmail: 'support@example.com', stripePaymentLinks: Object.fromEntries(CHOICES.map((choice, i) => [choice, `https://buy.stripe.com/${mode === 'test' ? 'test_' : ''}Example${i}`]))});
const price = {id: 'price_example', active: true, currency: 'usd', unit_amount: 10000, type: 'one_time'};
const stripeLink = (choice = '16-buy') => ({id: `plink_${choice}`, active: true, livemode: false,
  url: config().stripePaymentLinks[choice], metadata: {integration: INTEGRATION, choice, terms_version: TERMS_VERSION},
  after_completion: {type: 'hosted_confirmation'}, consent_collection: {terms_of_service: 'required'},
  name_collection: {individual: {enabled: true, optional: false}},
  phone_number_collection: {enabled: true}, billing_address_collection: 'required', payment_method_types: ['card']});
const items = () => ({has_more: false, data: [{quantity: 1, price: {...price}}]});

test('all four configurations map to distinct Stripe-hosted links', () => {
  for (const mode of ['test', 'live']) for (const choice of CHOICES) {
    const [size, plan] = choice.split('-');
    assert.equal(checkoutURL(config(mode), {size, plan}), config(mode).stripePaymentLinks[choice]);
  }
  assert.throws(() => checkoutURL(config(), {size: '30', plan: 'buy'}));
});

test('invalid mode, amount, terms, missing link and reused links fail closed', () => {
  for (const changed of [{mode: 'unknown'}, {deposit: 1}, {currency: 'EUR'}, {termsVersion: 'old'}]) {
    assert.throws(() => validatePaymentConfig({...config(), ...changed}));
  }
  for (const url of ['', 'javascript:alert(1)', 'https://buy.stripe.com.evil.example/test_a',
    'https://user:pass@buy.stripe.com/test_a', 'http://buy.stripe.com/test_a',
    'https://buy.stripe.com/test_a?redirect=https://evil.example', 'https://buy.stripe.com/test_a#secret',
    'https://buy.stripe.com/LiveLink']) {
    const bad = config(); bad.stripePaymentLinks['16-buy'] = url;
    assert.throws(() => validatePaymentConfig(bad), url);
  }
  const duplicate = config(); duplicate.stripePaymentLinks['16-buy'] = duplicate.stripePaymentLinks['20-buy'];
  assert.throws(() => validatePaymentConfig(duplicate));
  const wrongMode = config(); wrongMode.mode = 'stripe-live';
  assert.throws(() => validatePaymentConfig(wrongMode));
});

test('Stripe verification rejects changed price, recurring fees, extra items and unsafe checkout settings', async () => {
  for (const patch of [{unit_amount: 10001}, {currency: 'eur'}, {type: 'recurring'}, {recurring: {interval: 'month'}}, {active: false}]) {
    await assert.rejects(verifyLink(async () => ({...items(), data: [{quantity: 1, price: {...price, ...patch}}]}), stripeLink(), '16-buy', 'test'));
  }
  for (const result of [{has_more: false, data: []}, {has_more: false, data: [...items().data, ...items().data]},
    {has_more: false, data: [{quantity: 2, price}]}, {has_more: true, data: items().data},
    {has_more: false, data: [{quantity: 1, price, adjustable_quantity: {enabled: true}}]}]) {
    await assert.rejects(verifyLink(async () => result, stripeLink(), '16-buy', 'test'));
  }
  for (const patch of [{active: false}, {livemode: true}, {allow_promotion_codes: true}, {automatic_tax: {enabled: true}},
    {payment_method_types: ['card', 'us_bank_account']}, {after_completion: {type: 'redirect'}},
    {consent_collection: null}, {name_collection: null}, {phone_number_collection: {enabled: false}},
    {payment_intent_data: {capture_method: 'manual'}}, {payment_intent_data: {setup_future_usage: 'off_session'}}]) {
    await assert.rejects(verifyLink(async () => items(), {...stripeLink(), ...patch}, '16-buy', 'test'));
  }
});

test('setup creates four fixed-price links, preserves configuration and consent, then reuses them on rerun', async () => {
  const stored = []; const createdPrices = new Map(); const posts = [];
  const request = async (path, params, idempotency) => {
    if (params) {
      posts.push({path, params, idempotency});
      if (path === 'prices') { const result = {...price, id: `price_${createdPrices.size}`}; createdPrices.set(params.lookup_key, result); return result; }
      if (path === 'payment_links') {
        const link = stripeLink(params['metadata[choice]']); stored.push(link); return link;
      }
      assert.fail(`Unexpected mutation: ${path}`);
    }
    if (path.startsWith('payment_links?')) return {data: stored, has_more: false};
    if (path.startsWith('prices?')) return {data: [], has_more: false};
    if (path.includes('/line_items?')) return items();
    assert.fail(`Unexpected request: ${path}`);
  };
  const options = {mode: 'test', termsVersion: TERMS_VERSION, supportEmail: 'support@example.com'};
  assert.deepEqual(await prepareLinks(request, options), config().stripePaymentLinks);
  assert.equal(posts.length, 8);
  for (const post of posts.filter(p => p.path === 'payment_links')) {
    assert.equal(post.params['line_items[0][quantity]'], '1');
    assert.equal(post.params['line_items[0][adjustable_quantity][enabled]'], 'false');
    assert.equal(post.params['payment_intent_data[metadata][choice]'], post.params['metadata[choice]']);
    assert.equal(post.params['consent_collection[terms_of_service]'], 'required');
    assert.equal(post.params['after_completion[type]'], 'hosted_confirmation');
    assert.ok(post.idempotency);
    assert.equal(post.params['payment_intent_data[setup_future_usage]'], undefined);
  }
  await prepareLinks(request, options);
  assert.equal(posts.length, 8, 'retry must not create additional products or payment links');
});

test('setup refuses duplicate active links and old terms rather than creating another checkout', async () => {
  await assert.rejects(prepareLinks(async () => ({data: [stripeLink(), stripeLink()], has_more: false}), {mode: 'test', termsVersion: TERMS_VERSION}), /Multiple active links/);
  const old = stripeLink(); old.metadata.terms_version = 'old';
  await assert.rejects(prepareLinks(async () => ({data: [old], has_more: false}), {mode: 'test', termsVersion: TERMS_VERSION}), /older reservation/);
});

test('API client rejects cross-mode keys and never includes Stripe error bodies in diagnostics', async () => {
  assert.throws(() => stripeClient('sk_test_EXAMPLE', 'live'));
  const request = stripeClient('sk_test_EXAMPLE', 'test', async (url, options) => {
    assert.equal(url, 'https://api.stripe.com/v1/payment_links');
    assert.equal(options.headers.Authorization, 'Bearer sk_test_EXAMPLE');
    assert.equal(options.headers['Idempotency-Key'], 'retry-example');
    return new Response(JSON.stringify({error: {message: 'Invalid key sk_test_DO_NOT_ECHO'}}), {status: 401});
  });
  await assert.rejects(request('payment_links', {example: 'value'}, 'retry-example'), error => /HTTP 401/.test(error.message) && !/sk_test/.test(error.message));
});

async function fixture(settings = config(), page = 'reserve.html') {
  const html = await readFile(new URL(`../../${page}`, import.meta.url), 'utf8');
  const dom = new JSDOM(html, {url: 'https://sourcgi-code.github.io/marvel-labs-site/reserve.html?payment=success'});
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  const sec = document.querySelector('section.rv'), form = sec.querySelector('form');
  let choice = {size: '20', plan: 'buy'};
  const destinations = [];
  window.sessionStorage.setItem('marvel-reservation-demo-v1', JSON.stringify({id: 'DEMO-AAAAAAAA', status: 'reserved'}));
  installReservationPayments({sec, form, selection: () => choice, navigate: url => destinations.push(url)}, settings);
  return {dom, sec, form, destinations, choose: value => { choice = value; },
    submit: () => form.dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}))};
}

test('real page selects each product, requires consent, and never fabricates payment or collects contact details', async () => {
  const f = await fixture();
  assert.equal(f.sec.dataset.orderStep, 'configure', 'success URL parameters and old demo records cannot establish payment');
  assert.equal(window.sessionStorage.getItem('marvel-reservation-demo-v1'), null, 'old demo receipts are cleared');
  assert.equal(f.form.querySelector('[name="email"]'), null);
  assert.equal(f.form.querySelector('[name="payment"]'), null);
  assert.equal(f.form.querySelector('[data-panel="complete"]'), null);
  assert.equal(f.form.querySelector('[data-action="cancel"]'), null);
  for (const choice of CHOICES) {
    const [size, plan] = choice.split('-'); f.choose({size, plan}); f.submit();
    assert.equal(f.sec.dataset.orderStep, 'review');
    assert.match(f.form.querySelector('[data-order]').textContent, new RegExp(`${size} ft`));
    const count = f.destinations.length;
    f.submit(); assert.equal(f.destinations.length, count, 'unchecked terms must prevent navigation');
    f.form.querySelector('[name="consent"]').checked = true; f.submit();
    assert.equal(f.destinations.at(-1), config().stripePaymentLinks[choice]);
    assert.equal(f.sec.dataset.orderStep, 'review');
    window.dispatchEvent(new window.Event('pageshow'));
    assert.equal(f.form.querySelector('[type="submit"]').disabled, false, 'browser Back must allow another attempt');
    f.form.querySelector('[data-action="back"]').click();
    assert.equal(f.form.querySelector('[name="consent"]').checked, false);
  }
  f.dom.window.close();
});

test('unconfigured checkout cannot submit or fall back to a demo success screen', async () => {
  const f = await fixture({...config(), stripePaymentLinks: {}});
  assert.equal(f.form.querySelector('[type="submit"]').disabled, true);
  assert.equal(f.form.querySelector('.rd-error').hidden, false);
  assert.equal(f.submit(), false, 'even an Enter submission is prevented');
  assert.equal(f.destinations.length, 0);
  assert.equal(f.form.querySelector('[data-panel="complete"]'), null);
  assert.equal(f.form.querySelector('.rd-policies').hidden, true, 'unavailable checkout must not link to an unpublished policy');
  assert.equal(f.form.querySelector('.rd-demo').textContent, 'RESERVATIONS · CHECKOUT NOT OPEN');
  f.dom.window.close();
});

test('a stale demo config cannot enable a simulated production reservation', async () => {
  const f = await fixture({mode: 'demo', deposit: 100, currency: 'USD'});
  assert.equal(f.form.querySelector('[type="submit"]').disabled, true);
  assert.equal(window.sessionStorage.getItem('marvel-reservation-demo-v1'), null);
  assert.equal(f.form.querySelector('[data-panel="complete"]'), null);
  assert.equal(f.submit(), false);
  f.dom.window.close();
  const script = await readFile(new URL('../../reserve-page.js', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /installReservationDemo|reserve-demo\.js/);
});

test('production HTML contains no demo success, simulated cards, email preview or cancellation controls', async () => {
  for (const page of ['reserve.html', 'reserve-studio.html', 'reserve-light-outdoor.html', 'reserve-light-white.html', 'reserve-light-reveal.html', 'trailer-16.html', 'trailer-20.html']) {
    const html = await readFile(new URL(`../../${page}`, import.meta.url), 'utf8');
    assert.doesNotMatch(html, /Your demo reservation|Demo Visa|SIMULATED|View confirmation email|Cancel &amp; preview refund/, page);
    assert.match(html, /class="rv-submit" disabled/, page);
    assert.match(html, /reserve-page\.js\?v=shopify-checkout-v3/, page);
  }
});

test('all seven reservation pages support the live checkout flow with no demo controls', async () => {
  for (const page of ['reserve.html', 'reserve-studio.html', 'reserve-light-outdoor.html', 'reserve-light-white.html', 'reserve-light-reveal.html', 'trailer-16.html', 'trailer-20.html']) {
    const f = await fixture(config('live'), page);
    assert.equal(f.form.querySelector('.rd-demo').textContent, 'REFUNDABLE RESERVATION · $100 USD', page);
    f.submit();
    assert.match(f.form.querySelector('[type="submit"]').textContent, /Continue to pay \$100/, page);
    assert.equal(f.form.querySelector('[data-action="email-preview"]'), null, page);
    assert.equal(f.form.querySelector('[data-action="fill-demo"]'), null, page);
    assert.match(f.form.querySelector('.rd-consent a').href, /payments\/reservation.html$/, page);
    f.dom.window.close();
  }
});

test('live customer policy shows the supplied support address and test policy explicitly disclaims a real charge', () => {
  assert.match(reservationPolicy(config()), /NO REAL PAYMENT OR RESERVATION/);
  const html = reservationPolicy(config('live'));
  assert.match(html, /mailto:support@example.com/);
  assert.match(html, /full refund of the \$100 reservation deposit/);
  assert.match(html, /no automatic|does not authorize an automatic/i);
  assert.throws(() => reservationPolicy({...config(), supportEmail: '<script>@example.com'}));
});

test('activation writes only public fields, generates the policy and refreshes every checkout script URL', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'marvel-checkout-activation-'));
  try {
    await mkdir(join(directory, 'tools/payments'), {recursive: true});
    for (const file of ['payment-links.js', 'reserve.html', 'reserve-studio.html', 'trailer-16.html', 'trailer-20.html',
      'reserve-light-outdoor.html', 'reserve-light-white.html', 'reserve-light-reveal.html',
      'tools/payments/enable.mjs', 'tools/payments/policy.mjs']) {
      await copyFile(new URL(`../../${file}`, import.meta.url), join(directory, file));
    }
    const input = join(directory, 'input.json');
    await writeFile(input, JSON.stringify({...config(), secretKey: 'EXAMPLE_MUST_NOT_BE_PUBLISHED'}));
    const result = spawnSync(process.execPath, [join(directory, 'tools/payments/enable.mjs'), '--config', input], {encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    const source = await readFile(join(directory, 'reserve-config.js'), 'utf8');
    assert.doesNotMatch(source, /secretKey|EXAMPLE_MUST_NOT_BE_PUBLISHED/);
    const context = {window: {}}; vm.runInNewContext(source, context);
    assert.equal(context.window.MARVEL_RESERVE.mode, 'stripe-test');
    const policy = await readFile(join(directory, 'payments/reservation.html'), 'utf8');
    assert.match(policy, /support@example.com/);
    for (const page of ['reserve.html', 'reserve-studio.html', 'trailer-16.html', 'trailer-20.html', 'reserve-light-outdoor.html', 'reserve-light-white.html', 'reserve-light-reveal.html']) {
      const html = await readFile(join(directory, page), 'utf8');
      assert.match(html, /reserve-config\.js\?v=stripe-[a-f0-9]{12}/, page);
      assert.match(html, /reserve-page\.js\?v=stripe-[a-f0-9]{12}/, page);
      if (page === 'reserve-studio.html') assert.match(html, /reserve-studio-ui\.js\?v=stripe-[a-f0-9]{12}/);
    }
  } finally { await rm(directory, {recursive: true, force: true}); }
});

const shopifyConfig = () => ({mode: 'shopify-live', provider: 'shopify', deposit: 100, currency: 'USD', termsVersion: TERMS_VERSION,
  shopify: {storeDomain: 'cr1bpi-qf.myshopify.com', variants: Object.fromEntries(CHOICES.map((key, i) => [key, `1234567890123${i}`]))}});

test('Shopify checkout selects one correct variant and carries the trailer and plan into the order', () => {
  for (const key of CHOICES) {
    const [size, plan] = key.split('-');
    const url = new URL(checkoutURL(shopifyConfig(), {size, plan}));
    assert.equal(url.origin, 'https://cr1bpi-qf.myshopify.com');
    assert.equal(url.pathname, `/cart/${shopifyConfig().shopify.variants[key]}:1`);
    assert.equal(url.searchParams.get('attributes[Trailer]'), `${size} ft · Mirror Graphite`);
    assert.equal(url.searchParams.get('attributes[Plan]'), plan === 'buy' ? 'Buy' : 'Lease');
    assert.equal(url.searchParams.get('attributes[Reservation terms]'), TERMS_VERSION);
    assert.equal(url.searchParams.has('amount'), false);
  }
});

test('Shopify checkout refuses an unconnected product or a different store', () => {
  for (const badDomain of ['evil.example', 'cr1bpi-qf.myshopify.com.evil.example', 'other-store.myshopify.com']) {
    const cfg = shopifyConfig(); cfg.shopify.storeDomain = badDomain;
    assert.throws(() => validatePaymentConfig(cfg));
  }
  for (const variant of ['', 'abc', '123456:9', 'gid://shopify/ProductVariant/123456']) {
    const cfg = shopifyConfig(); cfg.shopify.variants['16-buy'] = variant;
    assert.throws(() => validatePaymentConfig(cfg));
  }
});

test('Shopify flow opens the selected checkout and never creates an on-site success or email preview', async () => {
  const f = await fixture(shopifyConfig());
  f.choose({size: '16', plan: 'lease'}); f.submit();
  assert.match(f.form.querySelector('.rd-payment').textContent, /pay on Shopify/);
  assert.doesNotMatch(f.form.textContent, /Stripe/);
  assert.equal(f.form.querySelectorAll('.rd-consent a').length, 3);
  f.form.querySelector('[name="consent"]').checked = true; f.submit();
  assert.equal(f.destinations[0], checkoutURL(shopifyConfig(), {size: '16', plan: 'lease'}));
  assert.equal(f.form.querySelector('[data-panel="complete"]'), null);
  assert.match(f.form.querySelector('[type="submit"]').textContent, /Opening Shopify/);
  f.dom.window.close();
});
