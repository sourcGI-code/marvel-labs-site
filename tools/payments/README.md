# Marvel $100 reservation checkout

The website remains on GitHub Pages. Stripe Payment Links collect one $100 USD
deposit for each of four choices: 16 ft / Buy, 16 ft / Lease, 20 ft / Buy and
20 ft / Lease. Checkout, contact collection, payment confirmation and payment
records are hosted by Stripe. Marvel reviews paid reservations and processes
refunds in the Stripe Dashboard. There is no automatic production allocation,
website refund button, backend or webhook fulfillment in this integration.

**Current state: checkout unavailable.** No connected Stripe account, secret key
or real payment link was available during implementation. Production no longer
loads the demo reservation flow or restores old DEMO receipts. Checkout remains
disabled until real links are connected. Never describe this as accepting live
payments before account setup and checkout verification are complete.

## Account and customer settings

1. The owner creates and activates the Marvel Stripe account, enters the legal
   business and bank details directly in Stripe, and resolves its requirements.
   Live setup requires both charges and payouts to be enabled.
2. Add a monitored customer support email in Stripe's public business details.
   Review the actual reservation terms in `policy.mjs` before publication. They
   preserve the existing $100 fully refundable deposit and separate final
   Buy/Lease agreement. No email address is invented.
3. Publish the generated `payments/reservation.html` before opening paid
   checkout. In Stripe, set the Terms of Service URL to
   `https://sourcgi-code.github.io/marvel-labs-site/payments/reservation.html#agreement`
   and the privacy URL to the same page with `#privacy`. Stripe requires a terms
   URL for the required terms checkbox. Generate the policy independently with
   `node prepare-policy.mjs --mode test --support-email OWNER_CONFIRMED_ADDRESS`
   while checkout remains unavailable.
4. Enable customer emails for successful payments and refunds, and enable
   merchant notifications for successful payments. Complete receipt branding,
   customer support and statement descriptor settings in Stripe. Do not enable
   recurring charges or additional fees for these deposit links.

## Prepare test links

No production server needs a Stripe key. A key is used temporarily on the
owner's computer to create/inspect Stripe products, prices and payment links.
Use a suitably restricted test key if available (account read, products/prices
read/write, payment links read/write). Never put it in Git, chat, command
arguments, a browser console or any file under the publicly served website.

From this directory in a private terminal:

```sh
read -rsp 'Stripe test secret key: ' STRIPE_SECRET_KEY
export STRIPE_SECRET_KEY
node setup.mjs --mode test --output /tmp/marvel-links-test.json
unset STRIPE_SECRET_KEY
node enable.mjs --config /tmp/marvel-links-test.json
```

The script checks existing links before creating any, uses stable price lookup
keys and Stripe idempotency keys for retries, and verifies that every active
link charges exactly one one-time $100 USD deposit. Existing links with
unexpected settings fail validation rather than being silently changed.
The output file contains public URLs and the support email only. It is created
exclusively, so existing configuration is never overwritten accidentally.

`enable.mjs` writes local configuration and the customer terms page; it does not
publish. For an unpublished local test, host the files with a static server.

## Verify before live activation

- Exercise all four size/plan combinations and verify the matching product and
  $100 USD amount on Stripe. Use Stripe's test card `4242 4242 4242 4242`, a future
  expiry and any valid test CVC. Do not use real card details in test mode.
- Exercise declined payment, payment authentication, checkout cancellation and
  browser Back. Confirm no payment success or refund is fabricated by the site.
- Check Stripe's payment record, selected configuration, required terms consent,
  contact details and hosted success page. Test a refund in the sandbox.
- Test mobile checkout and wallet availability on supported devices. Wallets
  are shown by Stripe when eligible; the website does not promise a wallet.
- Review the generated customer terms, support email and Stripe public details.
  Confirm customer receipt/refund email settings and merchant notifications.

Repeat setup with `--mode live` and a live key, using a different output path.
Run `enable.mjs` with that verified live config, review the diff, then publish
the branch based on the latest `main`. Do not process an actual charge or refund
without the owner's explicit authorization. Account/API and browser verification
cannot be replaced by the local unit tests.

## Tests and rollback

`npm ci && npm test` runs validation, Stripe API-contract mocks and DOM tests.
These tests never contact Stripe or send email. Browser QA uses a connected
browser when available; no browser was connected during preparation.

To stop new checkout, set `reserve-config.js` to `mode: 'unavailable'`,
bump the reservation page/config cache versions and publish. To also disable
previously shared payment links, deactivate them in Stripe. Existing payments
and refund obligations remain in Stripe; changing website mode does not erase
or refund them.

References: [Payment Links API](https://docs.stripe.com/api/payment-link/create),
[after payment](https://docs.stripe.com/payment-links/post-payment),
[manual and automatic fulfillment](https://docs.stripe.com/checkout/fulfillment).
