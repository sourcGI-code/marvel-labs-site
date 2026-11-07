import {mkdir, readFile, writeFile, readdir} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validatePaymentConfig} from '../../payment-links.js';
import {reservationPolicy} from './policy.mjs';

try {
  const {values} = parseArgs({options: {config: {type: 'string'}}});
  if (!values.config) throw new Error('Pass --config /absolute/path/links-test.json or links-live.json from setup.mjs.');
  const supplied = validatePaymentConfig(JSON.parse(await readFile(values.config, 'utf8')));
  // Allowlist public fields. Extra fields, including accidentally supplied keys,
  // can never be copied to the publicly hosted website configuration.
  const config = {mode: supplied.mode, deposit: 100, currency: 'USD', termsVersion: supplied.termsVersion,
    stripePaymentLinks: Object.fromEntries(Object.entries(supplied.stripePaymentLinks).filter(([key]) => ['16-buy', '16-lease', '20-buy', '20-lease'].includes(key))),
    supportEmail: supplied.supportEmail};
  const policy = reservationPolicy(config);
  const version = 'stripe-' + createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 12);
  const root = fileURLToPath(new URL('../../', import.meta.url));
  await mkdir(`${root}payments`, {recursive: true});
  await writeFile(`${root}payments/reservation.html`, policy);
  await writeFile(`${root}reserve-config.js`, '// Public Stripe payment links only. No secret keys.\nwindow.MARVEL_RESERVE = ' + JSON.stringify(config, null, 2) + ';\n');
  for (const name of await readdir(root)) {
    if (!name.endsWith('.html')) continue;
    const source = await readFile(root + name, 'utf8');
    if (!source.includes('reserve-page.js?')) continue;
    const updated = source.replace(/reserve-(config|page|studio-ui)\.js\?[^"']+/g, `reserve-$1.js?v=${version}`)
      .replace('Enable JavaScript to try the reservation demo. No payments are accepted on this page.', 'Enable JavaScript to select a trailer and continue to Stripe checkout.');
    await writeFile(root + name, updated);
  }
  console.log(`Local checkout configured for ${config.mode}. Review the generated terms and support address, verify every link in Stripe and test checkout before publishing. No deployment was performed.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
