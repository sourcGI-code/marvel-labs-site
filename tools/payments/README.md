# Marvel reservation checkout

The trailer website is **https://marvellabs.shop/**, hosted on GitHub Pages.
Payments and order confirmations use **cr1bpi-qf.myshopify.com** through Shopify
Payments. The store name is **Marvel Labs** and its contact is
**jaxon@marvellabs.com**. The owner selected this domain and purchased a Shopify
plan on November 7, 2026. Do not buy another domain or plan, change
`marvellabs.com`, or run the unused legacy Stripe setup scripts.

## Live configuration

`reserve-config.js` uses `mode: 'shopify-live'` with these real variants of product
`10419109396726` (Marvel Trailer Reservation Deposit):

| Choice | Shopify variant ID | Deposit |
| --- | --- | --- |
| 16 ft / Buy | 52332951634166 | $100 USD |
| 16 ft / Lease | 52332951666934 | $100 USD |
| 20 ft / Buy | 52332951699702 | $100 USD |
| 20 ft / Lease | 52332951732470 | $100 USD |

The product is Active and published to Online Store. Each variant has inventory
tracking and shipping disabled, with no subscription or selling plan. The
product's default taxable setting is preserved; no tax registration or tax-law
assumption was made during setup. Shopify determines the final checkout total.

`checkoutURL()` creates a cart permalink for exactly one selected variant and
carries trailer, plan and terms-version attributes into the order. Shopify sets
the price from the variant. The website never accepts card details, creates a
paid status, or fabricates an order number, email or refund. Old demo receipt
storage is cleared. The remaining trailer price and purchase/lease agreement are
separate; this checkout does not authorize an automatic balance charge.

## Verified Shopify settings

- Shopify Payments shows **Accepting payments** and **Receiving payouts**.
- Test mode is off. Payouts are configured to the owner's Shopify Balance account.
- The owner completed the required business-address form. Store private mode is
  off, and Shopify confirms that the online store is open to everyone.
- Refund, reservation terms, shipping and contact policies are published; the
  existing automated privacy policy remains published under Marvel Labs.
- The order-confirmation notification is configured, and its preview renders
  Marvel Labs branding. No test email or real charge was sent during setup.
- Sender email is `jaxon@marvellabs.com`. Shopify reports email-domain
  authentication still needs setup and provides its `shopifyemail.com` backup
  sender. Custom sender authentication is separate from the website's DNS setup.

The refundable deposit terms match the existing offer: full refund on cancellation,
contact the store with the Shopify order number, no physical return, and no
immediate trailer shipment or promised production/delivery date.

## Domain

GoDaddy DNS was saved and verified against authoritative and public resolvers:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | sourcgi-code.github.io |

Nameservers remain `ns21.domaincontrol.com` and `ns22.domaincontrol.com`.
Unrelated records and domain renewal/security settings were preserved.
GitHub Pages has an approved certificate covering apex and www, with HTTPS
forced. Strict HTTPS returns 200 for the trailer homepage and reservation page;
www redirects to `https://marvellabs.shop/`.

Canonical/share URLs, sitemap, robots rules, 404 routing and Crew asset paths use
this domain. Future Crew exports must use `/crew` as their base path. No checkout
subdomain is needed; checkout stays on the store's secure Shopify domain.

## Returning from Shopify checkout

The checkout logo links to the Shopify storefront's homepage. The active Shopify
theme, **Marvel Labs checkout return** (`168571207926`), redirects only that
homepage to `https://marvellabs.shop/`. The redirect includes a no-JavaScript
fallback and skips the theme editor. Cart, product, policy and checkout routes
retain their normal behavior.

The source block is in `shopify-storefront-return.liquid`; it is installed just
after `<head>` in Shopify's `layout/theme.liquid`. Preserve it when changing or
updating themes. The prior **Horizon** theme (`168561803510`) remains unpublished
as a rollback copy. Publishing that old theme would remove the return fix.
The live Reserve → Review → Shopify checkout → logo → trailer homepage path was
verified in desktop Chromium and mobile-size WebKit. The no-JavaScript homepage
fallback was also verified. No payment was submitted during these checks.

## Verification and limits

Run `npm ci && npm test` in this directory. The payment suite has sixteen tests
covering link validation, selection, consent, the five reservation forms, and no
demo fallback or fabricated on-site confirmation. Nine public-content tests cover
initial HTML, policy redirects, model pages, size/plan deep links, assistant answers,
connection-aware media selection, the failed-viewer image fallback, the confirmed
$0 monthly lease fee and historical-preview exclusions. These local
tests do not process payments. The model pages now lead to the separate reservation
form instead of duplicating it.

The public Shopify product JSON independently confirms the four IDs, $100 prices,
availability, no shipping, and no selling plans. Public policy pages return 200.
The hosted checkout was inspected with the reservation selections and displays
Marvel Labs, the selected deposit and a $100 total with live card/wallet payment
options. No customer billing data was entered and no transaction was submitted;
actual charge processing and receipt delivery have not been transaction-tested.

Checkout script cache versions are refreshed together with the real config.
After publication, verify the Pages build's commit and live configuration, then
follow a website reservation button through review and consent to Shopify.

## Rollback

Set `mode: 'unavailable'` and publish to stop new website checkouts. This does not
cancel or refund existing Shopify orders or disable independently shared Shopify
links. Never replace missing IDs with guesses or test fixtures.

When changing reservation availability, update the initial HTML banner, payment
note, metadata, overview, `llms.txt` and website assistant together with the config.
The initial button stays disabled until runtime configuration validation completes;
its disabled state is not a statement that reservations are closed.

## Public information and media update — November 8, 2026

`python3 scripts/build-public-content.py` (from the site root) generates the two
model pages, About/Contact, specifications, economics, development status, help,
legacy policy redirects and sitemap. It uses the current Shopify policies rather
than maintaining another copy of legal terms. Homepage, overview and reservation
copy are maintained alongside those pages. Keep the shared Organization identifier
`https://marvellabs.com/#organization` consistent. No trailer Offer is marked as
$100; that amount pays only the refundable reservation deposit.

The owner confirmed the $0 monthly lease fee on November 8, 2026. It is separate
from the $100 refundable reservation deposit, operating costs and other obligations.
Physical operating specifications, production measurements, service responsibilities
and final profit calculations remain explicitly pending.
The delivery wording is a Spring 2027 target, not a commitment. Dated physical
demonstrations and measured results require actual evidence from the team.

The active workday videos now use `assets/workday-stream-v1/` with MP4 fast-start,
30 fps and one-second keyframes. The timeline length remains 102.934 seconds.

| Video | Original bytes | Standard bytes | Slow-connection bytes |
| --- | ---: | ---: | ---: |
| Desktop | 128,026,034 | 26,975,043 | 10,856,684 |
| Mobile | 57,783,028 | 22,248,866 | 10,454,568 |

`video-delivery.js` selects the smaller version on slow connections. Data Saver
uses the static homepage; reduced-motion and video errors retain still images.
The active video players use metadata preload and browser byte-range seeking;
their whole-file Blob fetch fallback has been removed. The existing stylesheet
is already minified; another minification pass produced no meaningful saving.

Follow-up requiring separate access/evidence: the reciprocal corporate-site link
and matching corporate structured data, Search Console/Bing verification and URL
inspection, actual Core Web Vitals, and physical production/test documentation.
The current corporate site is hosted on the separate Shopify store
`marvellabs.myshopify.com`, with live theme `150427959389`
(`marvell-labs-website-redesign`), verified November 8, 2026. This is not the
trailer checkout store `cr1bpi-qf.myshopify.com`. Corporate editing requires access
to that separate store; the old local Sites project is not the live corporate
deployment and must not be published over it.

The retired `/marvel/` page redirects to `/about.html`. Historical pages under
`/test/`, `/yesterday/`, `/yesterday-rounded/` and `/yesterday-rounded-new-trailer/`
carry an archive notice and `noindex,follow`. Their old privacy notices redirect
to the current Shopify privacy policy. `/yesterday/` is no longer disallowed in
robots.txt so crawlers can read its noindex instructions. `/crew/` remains
disallowed; public app feature descriptions remain in the overview and homepage.

References: [Shopify cart permalinks](https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks)
and [checkout links](https://help.shopify.com/en/manual/checkout-settings/cart-permalink).

## Campaign launch update — November 8, 2026

The latest live Admin API check confirms all four $100 variants are active and
available for sale, with inventory tracking and shipping disabled. This connector
does not have `read_shopify_payments` / `read_shopify_payments_accounts`, so the
November 7 payment activation, test-mode and payout checks above were not
re-confirmed through the current API connection. No payment was submitted.

`campaign-attribution.js` carries only bounded campaign labels (`utm_source`,
`utm_medium`, `utm_campaign`, `utm_content`) through ordinary internal navigation.
It uses no cookies, browser storage, click IDs or third-party requests. Do not put
personal information in campaign labels. `checkoutURL()` adds these labels as
Shopify cart/order attributes and sends the source as `ref`, following
[Shopify’s cart-permalink conversion tracking documentation](https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks#step-6-optional-add-conversion-tracking-information).
The existing cart permalink is retained because reservation attributes are needed.
Nothing on the marketing site reports a paid order. Count provider-confirmed
orders once and subtract refunds in Shopify; referral labels are attribution
hints, not proof that a particular advertisement caused a sale.

Public `media.html` supplies current offer facts, concept imagery and a media
contact. `partners.html` routes sponsorship and partnership inquiries to the
existing trailer-team email. These are inquiry paths, not sold sponsorship
packages or automatic email delivery. Both pages are in the sitemap and llms.txt.

The November 8 scroll rollback restores the previous animation speed controls.
Reading-panel edge handoff now consumes leftover wheel/swipe input immediately.
Selecting text stops pending motion; copy uses a plain-text fragment without
serializing the animated DOM. The owner’s whole-computer freeze still needs
confirmation on their device; no connected browser/desktop was available for
manual UI testing in this task.
