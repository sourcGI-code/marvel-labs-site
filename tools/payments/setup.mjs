import {writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {resolve} from 'node:path';
import {stripeClient, prepareLinks} from './stripe.mjs';
import {TERMS_VERSION, validatePaymentConfig} from '../../payment-links.js';

try {
  const {values} = parseArgs({options: {
    mode: {type: 'string'}, output: {type: 'string'}, 'support-email': {type: 'string'}
  }});
  if (!values.output) throw new Error('Pass --mode test|live and --output /absolute/path/links-test.json. This command does not enable checkout.');
  const request = stripeClient(process.env.STRIPE_SECRET_KEY, values.mode);
  const account = await request('account');
  if (values.mode === 'live' && (!account.charges_enabled || !account.payouts_enabled)) {
    throw new Error('Complete Stripe account activation: charges and payouts must both be enabled before preparing live checkout.');
  }
  const supportEmail = values['support-email'] || account.business_profile?.support_email;
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(supportEmail || '')) {
    throw new Error('Set the customer support email in Stripe, or pass --support-email with Marvel’s monitored address.');
  }
  const config = {
    mode: `stripe-${values.mode}`, deposit: 100, currency: 'USD', termsVersion: TERMS_VERSION,
    stripePaymentLinks: await prepareLinks(request, {mode: values.mode, termsVersion: TERMS_VERSION, supportEmail}),
    supportEmail
  };
  validatePaymentConfig(config);
  await writeFile(resolve(values.output), JSON.stringify(config, null, 2) + '\n', {mode: 0o600, flag: 'wx'});
  console.log(`Verified four ${values.mode} payment links for Stripe account ${account.id}. Public configuration written to ${resolve(values.output)}. Website configuration has not changed.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
