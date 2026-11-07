# Marvel reservation checkout

The selected provider is **Shopify**, store **cr1bpi-qf.myshopify.com**, owned by
jaxon@marvellabs.com. The owner explicitly selected **marvellabs.shop** for the
trailer website on November 7, 2026. The site stays hosted on GitHub Pages and
checkout uses **cr1bpi-qf.myshopify.com**. Do not change `marvellabs.com` or buy a
new domain. The earlier `.com` migration is superseded.

## Confirmed state

- Production no longer installs the local demo reservation module, displays a
  simulated success or email preview, or restores an old DEMO receipt.
- Checkout is disabled (`mode: 'unavailable'`) until the Shopify account and
  product variants can be verified. Empty IDs must never be replaced with
  guessed IDs, test fixtures or an arbitrary store URL.
- The owner confirmed Shopify access to `cr1bpi-qf`, contact email
  `jaxon@marvellabs.com`, and reports purchasing a plan on November 7, 2026.
  This supersedes the earlier no-subscription restriction. Independently verify
  plan and payment readiness; no further subscription purchase is authorized.
- The storefront was rechecked after the paid-plan report: it still redirects to
  `/password`, and unauthenticated product listing returns HTTP 401. The owner has verified
  their Shopify connection, but this running conversation currently exposes no
  Shopify admin tools or browser session. Do not ask them to reconnect the account;
  continue product creation in a conversation where Shopify is available.
- Shopify is the owner's correction to the earlier Stripe assumption. The legacy
  Stripe setup scripts in this directory are unused; do not run them for this store.

## Website domain

The `CNAME`, canonical/share URLs, sitemap, robots rules, 404 routing and embedded
Crew asset paths target `https://marvellabs.shop/`. Register that custom domain in
GitHub Pages before changing DNS, then publish this commit to `main`.

The domain uses GoDaddy nameservers `ns21.domaincontrol.com` and
`ns22.domaincontrol.com`. Before the switch, apex A records were `3.33.130.190`
and `15.197.148.33`; `www` was a CNAME to `marvellabs.shop`. Public queries returned
no apex AAAA, MX or TXT records. Preserve any additional records visible in the
account; do not change nameservers or the domain's renewal/security settings.

Replace the two old apex A records with these four A records:
`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
Set `www` CNAME to `sourcgi-code.github.io`. TTL 600 seconds or the provider default
is suitable. No checkout subdomain is required to use the existing Shopify store.

DNS changes require the owner's GoDaddy account; that admin access is not exposed
in this conversation. Verify public DNS, the GitHub Pages deployment, HTTPS and
the trailer homepage before reporting the domain live. Verify Crew assets and
deep links. Later Crew exports must use `/crew` as the base path.

The domain connection does not enable payments. Keep checkout disabled until the
Shopify products, payment settings and notifications below are verified.

## Finish when Shopify admin access is available

1. Inspect the existing store and products before creating anything. Confirm the
   store identity, USD currency, active payment provider, test-mode status and
   customer order-confirmation notifications. Never mark a preview/test transaction
   as paid, and do not make an actual charge or refund without explicit authorization.
2. Use or create a $100 USD one-time refundable reservation product with four
   variants: 16 ft / Buy, 16 ft / Lease, 20 ft / Buy, 20 ft / Lease. Only the deposit
   is sold at checkout. The trailer's remaining price and any lease agreement are
   separate. Verify each variant's price and online-store availability, and ensure
   no trailer shipping charge or recurring payment is added to this deposit.
3. Confirm the store's reservation/refund terms, privacy policy and monitored
   customer support contact. The website points to the Shopify policy pages.
   Make the checkout publicly reachable when ready; cart permalinks cannot bypass
   a storefront password. Preserve unrelated store settings and products.
4. Put the exact four numeric variant IDs into `reserve-config.js` under
   `shopify.variants`, keeping them as strings. Set `mode: 'shopify-live'` only
   after the real store is ready. The existing `checkoutURL()` creates a Shopify
   cart permalink for one selected variant and includes trailer, plan and terms
   version as order attributes. The variant determines the price on Shopify.
5. Verify each selection reaches the correct $100 product at Shopify checkout.
   Verify the actual Shopify order confirmation page and customer notification
   using the store's approved sandbox/test workflow. Check that declined/abandoned
   checkout never creates a website confirmation. Verify mobile checkout.
6. Publish the verified config and current frontend together, bumping reservation
   script URLs to avoid cached demo code. Check the GitHub Pages build's commit
   and live files. Do not describe the store as live based on local mocks alone.

## Verification and rollback

Run `npm ci && npm test` here. Sixteen tests cover price/link validation, no demo
fallback, all seven reservation pages, terms consent, Shopify destination and
variant selection, configuration propagation, and no fabricated on-site success.
Mocks do not verify real Shopify payment settings, products or email delivery.

Set `mode: 'unavailable'` and publish to stop new website checkouts. This does not
cancel or refund existing Shopify orders or disable links shared independently.

References: [Shopify cart permalinks](https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks)
and [checkout links](https://help.shopify.com/en/manual/checkout-settings/cart-permalink).
