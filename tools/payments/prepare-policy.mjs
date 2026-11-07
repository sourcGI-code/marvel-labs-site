import {mkdir, writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {TERMS_VERSION} from '../../payment-links.js';
import {reservationPolicy} from './policy.mjs';

try {
  const {values} = parseArgs({options: {mode: {type: 'string', default: 'test'}, 'support-email': {type: 'string'}}});
  if (!['test', 'live'].includes(values.mode)) throw new Error('Use --mode test or --mode live.');
  const html = reservationPolicy({mode: `stripe-${values.mode}`, termsVersion: TERMS_VERSION, supportEmail: values['support-email']});
  const directory = new URL('../../payments/', import.meta.url);
  await mkdir(directory, {recursive: true});
  await writeFile(new URL('reservation.html', directory), html);
  console.log('Prepared payments/reservation.html for review. Checkout configuration and deployment are unchanged.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
