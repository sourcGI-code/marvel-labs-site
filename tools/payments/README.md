# Marvel reservation checkout

The selected provider is **Shopify**, store **cr1bpi-qf.myshopify.com**, owned by
jaxon@marvellabs.com. The public website stays on GitHub Pages at
https://sourcgi-code.github.io/marvel-labs-site/.

## Confirmed state

- Production no longer installs the local demo reservation module, displays a
  simulated success or email preview, or restores an old DEMO receipt.
- Checkout is disabled (`mode: 'unavailable'`) until the Shopify account and
  product variants can be verified. Empty IDs must never be replaced with
  guessed IDs, test fixtures or an arbitrary store URL.
- The storefront currently shows an Opening soon password page, and unauthenticated
  product listing returns HTTP 401. No Shopify plugin or browser session was
  connected to the task when this was prepared.
- Shopify is the owner's correction to the earlier Stripe assumption. The legacy
  Stripe setup scripts in this directory are unused; do not run them for this store.

## Finish once Shopify is connected

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
