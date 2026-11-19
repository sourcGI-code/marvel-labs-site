# Website visitor tracking

The integration uses Microsoft Clarity for consented visits to the public
`marvellabs.shop` marketing pages. `marketing-config.js` contains the public
project ID. An empty ID leaves the recorder and consent interface disabled.
There is no secret API key in the browser. Localhost and other preview domains,
embedded views, `/crew/` and `crew-chat.html` never start this recorder.

## Activation and verification

1. Create/select the Clarity project for `https://marvellabs.shop`. Use the
   Business & Industrial / Manufacturing category if offered.
2. Copy the project ID from Settings → Setup and set `clarity.projectId` in
   `marketing-config.js`. Do not paste an API export token into that file.
3. Keep consent required in the project. The website loads Clarity only after
   the visitor allows analytics and sends `consentv2` with analytics granted
   and ad storage denied. GPC and Do Not Track override saved consent.
4. Keep sensitive data masking on. Inputs, embedded previews and the chat widget
   are also masked in the source. Do not add user identifiers, chat text or
   checkout contact information to custom tags/events.
5. Run the analytics and reservation tests, build the production artifact,
   and deploy only the tracking branch. Bump the marketing-config URL on all
   included pages when changing the project ID after an earlier deployment.
6. Verify a real consented visit: the tag loads, a POST to
   `https://www.clarity.ms/collect` succeeds, and that session appears in the
   intended Clarity project. A successful local mock or tag download is not
   evidence that the account is receiving sessions. Also check a declined visit
   makes no Clarity requests. Do not submit a real payment as an analytics test.

## Dashboard configuration

After the first consented events arrive, create these funnels in Clarity
(Settings → Funnels). API events appear automatically after collection, but
the saved funnel definitions must be created in the project dashboard.

| Funnel | Ordered event steps |
| --- | --- |
| Homepage reach | `section_top`, `section_story`, `section_inside`, `section_sizes`, `section_app` |
| Reservations | `reserve_page`, `reservation_review`, `checkout_handoff` |
| 16 ft pricing CTA | `price_16_click`, `reserve_page`, `reservation_review`, `checkout_handoff` |
| 20 ft pricing CTA | `price_20_click`, `reserve_page`, `reservation_review`, `checkout_handoff` |

Use separate mobile and desktop filters. Inspect scroll maps and replays, then
compare traffic sources and campaigns using Clarity's page/referrer filters.
Campaign parameters already follow internal links and the Shopify handoff.

## Event meaning and limits

- `section_*`: the section became active in the presentation, or entered the
  central viewport in the static page. Sent once per page visit, after consent.
  This means reached, not read. A visitor who uses navigation to skip sections
  need not complete the ordered homepage funnel.
- `scene_arrival`, `scene_delivery`, `scene_operator`, `scene_dropoff`,
  `scene_route`, `scene_equipment`, `scene_vision`, `scene_rtk`, `scene_quote`,
  `scene_work`: the active scene, only when its corresponding section is active.
  Canvas contents cannot be replayed by Clarity; these events identify progress.
- `price_16_click` and `price_20_click`: the two homepage pricing buttons.
  Both retain their `/reserve.html` destinations.
- `reserve_click`: any internal link to reservations. `reserve_cta_section`
  records its known section when applicable. Tags may accumulate multiple values.
- `reserve_page`: a reservation page opened with analytics consent.
- `reservation_selection`: a size or plan input changed. `trailer_size` and
  `reservation_plan` are predefined values, never personal data. Tags describe
  choices made in a session and must not be read as a final paid order.
- `reservation_review`: a review step became visible, once per page.
- `checkout_handoff`: a valid checkout URL was built and the visitor's terms
  checkbox passed validation, just before navigation to Shopify. It is neither
  proof that checkout loaded nor a completed purchase.

Clarity's `.shop` installation does not measure completed Shopify deposits.
Use the store's successful orders as the authoritative payment record; a
cross-domain purchase funnel requires separately verified Shopify analytics.
Do not infer payment from a return visit or a checkout button click.

Data starts after activation and visitor consent. No previous visits can be
reconstructed. Ad blockers, declined consent and privacy signals limit coverage.
The local copy-review branch is not a live A/B test and must not be published
without the owner's instruction.

## Validation

`tools/check-analytics.mjs` uses Node's test runner and jsdom. It checks consent,
opt-outs, local exclusions, scene reach, CTA destinations and the real payment
module's validated handoff. Reuse the installed jsdom module via the environment's
loader, then run the existing `tools/payments/` regression tests as appropriate.

Official references:
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/funnels
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup
