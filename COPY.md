# Copy pass v1 — Marvel Labs (reservation-preview-v2 base)

Built 2026-11-02 (America/New_York). Base: live build at commit 0ae6a41 (mirror of https://sourcgi-code.github.io/marvel-labs-site/).
Rule: **animations, films, layout and JS behaviour unchanged.** Only reader-facing text, colour variables, ids, `data-ga-*`
attributes, head/SEO tags, structured data, text equivalents for the films, and one new FAQ scene (requested for SEO) were changed or added.

Open locally: `cd /data/trailers/copy-pass-v1 && python3 -m http.server 8771` → http://localhost:8771/
(Use a server, not file://. The how-it-works film streams from the GitHub release, as it does on the live site, so you need internet access.)

## 1. The pitch, in order
| Beat | What the reader learns |
|---|---|
| Hero | Who it's for (landscaping crews), the offer (trailer with a factory inside → sinks → profit share), CTA **Reserve for $100** (fully refundable) |
| Fleet film | Two sizes, same 6 ft factory |
| 01 The numbers | The problem/opportunity: you already bag clippings → illustrative $300/day (legal disclaimer kept verbatim) |
| 02 How it works | Proof: hopper → boxed sink → The UPS Store → app confirmation → equipment bay → measure → quote → mow |
| 03 Specs & pricing | Two sizes. Buy or lease. Prices, profit shares, Reserve CTAs |
| 04 Marvel Crew | The app |
| 05 FAQ (new) | Self-contained answers for search/AI citation |

## 2. Copy: old vs new (word counts)
| Section | Element | Old | New | Words old→new |
|---|---|---|---|---|
| Meta | <title> | Autonomous Microfactory Trailers — Marvel Labs | Microfactory Trailer for Landscaping Crews — Marvel Labs | 5→7 |
| Meta | meta description | Explore the Marvel Labs autonomous microfactory trailer for landscaping crews. Compare 16 ft × 7 ft and 20 ft × 8.5 ft layouts. Buy the 16 ft for $44,999 or the 20 ft for $49,999.99 with 75% operator profit share, or lease it for $100 now with 25%. | A landscaping trailer with a factory inside that turns your clippings into sinks. 16 ft or 20 ft, buy or lease. $100 refundable deposit. | 46→24 |
| Meta | og/twitter title | Autonomous Microfactory Trailers — Marvel Labs | Your next trailer. A factory inside. — Marvel Labs | 5→8 |
| Meta | og/twitter description | Your next trailer. A factory inside. Explore two sizes. Spring 2027 delivery, limited availability. | A trailer for landscaping crews that turns clippings into sinks. 16 ft or 20 ft. Spring 2027 delivery. | 14→18 |
| Nav | links | Home · Specs & pricing · The numbers · See it work · App | Home · Specs & pricing · The numbers · How it works · App · FAQ | 9→10 |
| Nav | mobile menu CTA | Reserve your trailer ↗ | Reserve · $100 refundable ↗ | 3→3 |
| Hero | eyebrow | THE AUTONOMOUS MICROFACTORY TRAILER | FOR LANDSCAPING CREWS | 4→3 |
| Hero | H1 | Your next trailer. A factory inside. | Your next trailer. A factory inside. | 6→6 |
| Hero | lead | More than a place for your mowers and equipment. Your trailer turns grass, leaves, and food waste into products, creating a new source of income for your business with every product it produces. | Haul your mowers like any trailer. The factory inside turns your bagged clippings into sinks, and you share the profit. | 33→20 |
| Hero | primary CTA | Reserve your trailer ↗ | Reserve for $100 ↗ | 3→3 |
| Hero | secondary CTA | See the numbers ↓ | See the numbers ↓ | 3→3 |
| Hero | stage label | SPRING 2027 DELIVERY. LIMITED AVAILABILITY. | FULLY REFUNDABLE · SPRING 2027 DELIVERY · LIMITED AVAILABILITY | 5→7 |
| Fleet (hero film) | 16 ft beat kicker | THE 16 FT MODEL · 7 FT WIDE | THE 16 FT MODEL · 7 FT WIDE | 7→7 |
| Fleet (hero film) | 16 ft beat title | Same 6 ft factory. Smaller trailer. | Same 6 ft factory. Smaller trailer. | 6→6 |
| Fleet (hero film) | 16 ft beat copy | The 16 ft carries the same 6 ft factory with a 10 ft cargo bay for your mowers. A smaller rig to tow, the same sinks out the side. | Same factory, same sinks. A 10 ft cargo bay and a smaller rig to tow. | 29→15 |
| Fleet (hero film) | two-sizes beat | TWO SIZES · ONE 6 FT FACTORY — Choose by what you haul. | TWO SIZES · ONE 6 FT FACTORY — Choose by what you haul. | 11→11 |
| Fleet (hero film) | size labels | 20 ft 14 FT REAR CARGO · 16 ft 10 FT REAR CARGO | 20 ft 14 FT REAR CARGO · 16 ft 10 FT REAR CARGO | 12→12 |
| Workday | eyebrow | 01 / THE WORKDAY OPPORTUNITY | 01 / THE NUMBERS | 4→3 |
| Workday | H2 | Mow as usual. Earn on every sink. | Mow as usual. Earn on every sink. | 7→7 |
| Workday | lead | Bag clippings like you already do and tip them into the hopper. While you mow, the factory makes and boxes the sinks. You drop them at The UPS Store on your route. | You already bag the clippings. Tip them into the hopper. The factory makes and boxes sinks while you mow. | 32→19 |
| Workday | stat labels | sinks made and sold in one illustrative workday · illustrative gross operator earnings / day | sinks sold in one illustrative day · illustrative gross earnings per day | 13→11 |
| Workday | equation + disclaimer (legal, kept) | 20 sales × $15 gross operator earnings = $300 / day. Illustration only: all 20 sinks sell at $15 gross operator earnings each, before your expenses. It is not a projection for either plan. Actual earnings depend on sales, costs and the agreed profit calculation; production and earnings are not guaranteed. | (unchanged) | 48→48 |
| Workday | CTAs | See how it works ↓ · Price the 16 ft ↗ · Price the 20 ft ↗ | (unchanged) | 12→12 |
| How it works | 01 Grass in — copy | Off the mower. The chute folds out of the factory wall, takes the bagged clippings, and the factory starts on a sink. | The chute folds out. Tip in the bagged clippings and the factory starts a sink. | 22→15 |
| How it works | 01 Chute shut — copy | The chute folds away. The enclosed factory makes the sink on its own while you get on with the day. | The chute folds away. The factory makes the sink on its own while you work. | 20→15 |
| How it works | 01 Sink out — copy | Open the side hatch. A finished sink, boxed and ready to ship, rides out on the conveyor. | Open the side hatch. A boxed sink rides out, ready to ship. | 17→12 |
| How it works | 02 On your route — copy | Close up and drive. The boxed sink rides along to The UPS Store, on the way to the next job. | The boxed sink rides along to The UPS Store, on the way to your next job. | 20→16 |
| How it works | 02 At the store — title + copy | Hatch open. Sink out. — Parked at The UPS Store. The hatch opens and the boxed sink rolls out, packaged and ready to ship. | Park. Hatch open. — At The UPS Store, the hatch opens and the boxed sink rolls out. | 23→16 |
| How it works | 02 Hand it over — copy | Carry it in and hand it over. The clerk scans the box and it ships. You are back in the truck. | Carry it in. The clerk scans the box and it ships. | 21→11 |
| How it works | 02 App confirm — copy | Marvel Crew confirms the drop-off on your phone the moment the box is handed over. Nothing to write down. | Marvel Crew confirms the hand-off on your phone. Nothing to write down. | 19→12 |
| How it works | 02 Next yard — copy | The sink is on its way. You drive to the next job, where the next bag of clippings is waiting. | The sink ships. You drive on to the next yard and the next bag of clippings. | 20→16 |
| How it works | 03 Equipment — copy | The ramp drops. Zero-turn, push mower and trimmers ride in the rear bay, like any equipment trailer. The factory sits sealed up front. | The ramp drops. Zero-turn, push mower and trimmers ride in the rear bay. The factory stays sealed up front. | 23→19 |
| How it works | 04 Cameras — copy | The trailer’s cameras turn the lawn, edging, hedges, beds and tree rings into a measured scope, so the estimate starts from numbers, not a guess. | Trailer cameras measure lawn, edging, hedges, beds and tree rings. Your quote starts from numbers, not a guess. | 25→18 |
| How it works | 05 RTK — copy | Survey-grade GPS (RTK) ties each measurement to the property, so the scope still lines up the next time you pull up. | Survey-grade GPS (RTK) ties each measurement to the property, so it lines up next visit. | 21→15 |
| How it works | 06 Quote — copy | The measured scope becomes an estimate and an email that shows the customer their yard before and after. Nothing goes out until you approve the price. | The scope becomes a quote email with before-and-after views. Nothing is sent until you approve the price. | 26→17 |
| How it works | 07 Mow — copy | Nothing changes about the mowing. The clippings you bag go into the hopper and become the factory’s next sink. | Mow the way you always do. The clippings you bag become the next sink. | 19→14 |
| How it works | chapter titles + kickers (kept) | Grass in. · Chute shut. Back to the truck. · Sink out. · Grass goes in. Sinks come out. · On your route. No extra trip. · Into the store. Onto the counter. · Dropped off. Confirmed on your phone. · Shipped. Next yard. · Your mowers ride in the back. · Cameras measure. You set the price. · Every measurement pinned to the lot. · The survey becomes a quote draft. · Mow like always. Bag the clippings. | (unchanged) | 67→67 |
| How it works | tour CTA | Reserve your trailer ↘ | Reserve for $100 ↘ | 3→3 |
| Specs | eyebrow + label | 03 / START WITH THE SPECS · TWO SIZES · BUY OR LEASE | 03 / SPECS & PRICING · SAME 6 FT FACTORY IN BOTH | 10→9 |
| Specs | H2 | Two sizes. Same 6 ft factory. | Two sizes. Buy or lease. | 6→5 |
| Specs | 16 ft card line | Compact and 7 ft wide. Same factory, same sinks. | A smaller rig to tow. Same factory, same sinks. | 9→9 |
| Specs | 20 ft card line | 8.5 ft wide, 14 ft of cargo. Room for more mowers. | 4 ft more cargo. Room for more mowers. | 11→8 |
| Specs | plan lines (×2) | Lease $100 now · 25% profit share | Lease · $100 to reserve · 25% profit share | 6→7 |
| Specs | note (legal, kept) | Profit shares are the operator’s share of profit on sinks sold. Preview pricing; final specification, profit calculation and plan terms are confirmed before participation. | (unchanged) | 24→24 |
| App | lead | Marvel Crew is the app for your trailer and your crews, launching with the trailer. | One app for your trailer and your crews. It launches with the trailer. | 15→13 |
| App | feature lines | The trailer light, battery and the sink being made. · The finished cartons behind the side door, live. · Every quote shows the customer their yard before and after. · Every crew and yard, the work calendar and what you made. | Lights, battery and the sink in production. · See the finished cartons behind the side door. · Quotes show customers their yard before and after. · Crews, yards, your calendar and earnings. | 38→29 |
| App | CTA | Reserve your trailer ↘ | Reserve for $100 ↘ | 3→3 |
| FAQ (new) | H2 + 8 Q&As | (none) | FAQ block (§3) | 0→327 |
| Reserve pages | kicker | YOUR NEXT CHAPTER | $100 · FULLY REFUNDABLE | 3→3 |

**Section totals (words a visitor reads on the page; meta excluded):**

| Section | Before | After |
|---|---|---|
| Nav | 12 | 13 |
| Hero | 54 | 42 |
| Fleet (hero film) | 65 | 51 |
| Workday | 116 | 100 |
| How it works | 346 | 266 |
| Specs | 66 | 62 |
| App | 56 | 45 |
| FAQ (new) | 0 | 327 |
| Reserve pages | 3 | 3 |
| **Total** | **718** | **909** (of which FAQ 327; the answers stay collapsed by default) |

**Read time** at 238 wpm: before **718 words ≈ 3.0 min**. After, the main story is **582 words ≈ 2.4 min** (19% shorter). The FAQ questions add 41 words. All 8 answers together add 286 words (≈1.2 min) and are read only when a visitor opens them.
Not counted, and unchanged: the film HUD labels (measurements, "HOUSE 15 · LOCK 0.98", classification lists, "Did you know?" fact), the status lines, and the reserve/legal pages' body copy.
Headline rule check: every section title is ≤ 8 words, and every supporting line I rewrote is ≤ 20 words. The workday lead is 19 words and the hero lead is 20.

## 3. FAQ (new, `#faq`; also in FAQPage JSON-LD)

**What is the Marvel Labs microfactory trailer?** An equipment trailer for landscaping crews with a 6 ft enclosed factory at the front. Mowers ride in the rear cargo bay. The factory turns bagged grass clippings into boxed sinks. It is a concept with a Spring 2027 delivery target.

**Who is it for?** Landscaping crews and lawn-care operators who already mow and bag clippings on their routes.

**How does it work?** Tip bagged clippings into the hopper. The enclosed factory makes and boxes a sink while you work. The boxed sink comes out of the side hatch, you drop it at The UPS Store on your route, and the Marvel Crew app confirms the hand-off.

**What sizes are there?** Two sizes with the same 6 ft enclosed factory. The 16 ft is 7 ft wide with a 10 ft rear cargo bay. The 20 ft is 8.5 ft wide with a 14 ft rear cargo bay.

**How much does it cost?** Preview Buy pricing is $44,999 for the 16 ft and $49,999.99 for the 20 ft, with a 75% operator profit share. Lease comes with a 25% operator profit share; lease terms are set in a separate agreement. Taxes, delivery and registration are not included.

**What is the profit share?** The operator's share of profit on sinks sold, not a share of the selling price. The site's example of 20 sinks at $15 each ($300 a day) is an illustration, not a projection. Earnings are not guaranteed.

**Is the $100 deposit refundable?** Yes. The $100 reservation deposit is fully refundable with no cancellation fee, and it is credited toward the trailer's final price. It is not a monthly lease payment. The reservation on this site is currently a demo and takes no payment.

**When will trailers be delivered?** Spring 2027 is the delivery target. It is not a guaranteed date, and availability is limited. Final availability, service area and delivery are confirmed before the trailer agreement.

All answers use facts from the live homepage, reserve pages, Reservation Help, Refunds and the Agreement draft. "Concept" and "not guaranteed" wording comes from the Terms and Agreement drafts.

## 4. Colour scheme
The audit sampled every visible text node at 60 scroll stops on desktop 1440×900 and mobile 390×844. It composited each node's colour and opacity over its nearest opaque background and checked against WCAG 2.1 AA (4.5:1 body text, 3:1 large text).

| Token | Before | After | Contrast on #0a0e10 |
|---|---|---|---|
| --bg | #0a0c0d (atlas.css) **and** #0a0e10 (official, tour); theme-color #0a0c0d | **#0a0e10** everywhere, theme-color too | — |
| --surface | (none; mixes) | #11181b | — |
| --ink | #f2f3f2 | #f2f3f2 | 17.4:1 |
| --ink-2 | one-offs #b6bfc1 / #c8d3d6 / #c9e6e7 / #d0dcdc | **#c8d3d6** | 12.7:1 |
| --muted | #a4adb0 | #a4adb0 | 8.5:1 |
| --accent | #4dd8e8 | #4dd8e8 (brand teal kept) | 11.4:1. Dark text on a teal button: 11.4:1 |
| --accent-soft | (none) | #8fe9f3 for accent text in dimmed states | 4.8:1 at the 55% dim |
| --accent-ink | #dffbfd one-off | token | 17.9:1 |
| --success | #b5efbf one-off | token | 14.8:1 |
| --rule | #819093 one-off | token, used for lines only (not text) | 5.9:1 |

**AA failures before:** desktop 8 and mobile 1, all in the Marvel Crew section:
- Dimmed feature rows were #a4adb0 at 55% opacity, which is **3.3:1**.
- Dimmed numbers were teal at 55%, which is **4.1:1**.
- "App screens shown with example data." was ink at 45%, which is **4.2:1**.

**After: 0 failures** on desktop and mobile. I fixed these by changing colours only; opacities and animations are untouched.
- Dimmed rows now use --ink, which is 5.7:1 while dimmed.
- Dimmed numbers use --accent-soft, 4.8:1.
- The app note uses --muted, 8.5:1.

Text sitting over the films relies on the existing vignettes and scrims, which I left alone. I did not measure it pixel by pixel.

All colours live in `palette-tokens.css` (CSS variables plus colour-only rules). In Shopify they map 1:1 onto theme `settings_schema.json` colour settings, output as `:root{--accent:{{ settings.accent }}…}`.

## 5. Inconsistencies and gaps (flagged, not guessed)
1. **Hero claim vs the rest of the site.** The live hero says the trailer turns "grass, leaves, and food waste into products". Everywhere else it is grass clippings → sinks. The new copy says clippings → sinks. Please confirm whether leaves and food waste are real inputs.
2. **"Lease $100 now".** This reads like a lease price. Reservation Help says the $100 is the deposit, "not a monthly lease payment", and lease terms aren't set. The homepage cards now say "Lease · $100 to reserve". The reserve pages still show "or $100 now" under both prices, because reserve-page.js sets that text; please confirm the wording.
3. **Factory length is consistent.** Every source says 6 ft (6 + 10 = 16 ft, 6 + 14 = 20 ft), and there is no "8 ft factory" anywhere in this build. If an older deck or video says 8 ft, that is the outlier.
4. **No lease price, term, or what "profit" includes.** The site doesn't say, so the FAQ only says "set in a separate agreement".
5. **$15 per sink, 20 sinks a day.** This is labelled illustrative and isn't tied to either plan. There's no stated factory throughput (sinks per hour or day) to back it up.
6. **The UPS Store.** A named third-party brand is shown as the drop-off. Confirm there is an arrangement, or keep it clearly illustrative for trademark reasons.
7. **Drive-by auto quotes.** The film shows the trailer measuring neighbouring houses (House 15/16) and pricing them ($79, $73, $83). This is a privacy and claims risk. It's marked as a demonstration; consider a visible note.
8. **Brand name drift.** I found "Autonomous Microfactory Trailer(s)", "Autonomous Microfactories" (reserve footer link, canvas aria text) and "microfactory trailer". Pick one for Shopify product titles.
9. **CTA sprawl.** Nine reserve-type CTAs point to 3 URLs (reserve.html, trailer-16.html, trailer-20.html), with labels like "Price the 16 ft" and "Reserve the 16 ft" going to the same page. I unified the general ones to "Reserve for $100" but did not change hrefs. In Shopify, point them all at the product page with a size variant.
10. **Nav order doesn't match page order.** Nav: Specs → Numbers → How it works. Page: Numbers → How it works → Specs. I left the link order unchanged.
11. **Status wording at launch.** The site says reservations are a demo or preview with "no charge" (reserve pages, privacy, terms, agreement and help drafts marked "DRAFT FOR THE DEMO · NOT A LIVE CONTRACT"). A real Shopify deposit checkout makes those statements false, so they must be replaced with final legal copy before launch (see §8).
12. **Privacy page.** It says the site "does not add advertising trackers or analytics". Adding GA4 means updating it, plus consent handling.
13. **Delivery date.** Spring 2027 is a target with no month or date, so the Product JSON-LD has no `availabilityStarts`.
14. **Pre-existing console error on live:** a CORS error when the page fetches the mobile how-it-works film from GitHub releases. The film still plays. It isn't caused by this pass. Shopify hosting (files CDN) would remove it.

## 6. GA4 measurement plan (no tag installed)
`index.html` has a **commented-out** gtag placeholder (`G-XXXXXXX`, consent default denied). Nothing runs.

**Section ids, which are stable anchors and the `section` parameter:**
- `top`/hero
- `story`/workday
- `inside`/how_it_works
- `sizes`/specs
- `app`/app
- `faq`/faq
- `footer`/footer
- reserve pages: `reserve`

Every CTA carries `data-ga-event`, `data-ga-section`, `data-ga-cta`, and `data-ga-size` where relevant.

| Event | Trigger | Params | Notes |
|---|---|---|---|
| page_view | GA4 default (enhanced measurement) | page_location, UTMs | |
| section_view | each section first crosses mid-screen (IntersectionObserver, rootMargin −50%) | section | Use this as scroll depth; the default 90% scroll is meaningless on pinned film pages |
| cta_click | non-reserve CTAs (see the numbers, see how it works, use demo details, email preview) | section, cta | |
| nav_click | header and footer links | section=nav, cta | |
| reserve_click | every Reserve/Price CTA | section, cta, trailer_size | Funnel entry |
| reserve_start | reserve page load | trailer_size (from `data-ga-page-size`) | |
| reserve_step | the Continue button (`.rv-submit`) | step 1/2/3 | Send from reserve-page.js step change |
| generate_lead / purchase | deposit paid | value=100, currency=USD, trailer_size, plan | **Key event (conversion).** In Shopify this is the native checkout `purchase` event via the Google & YouTube app or Customer Events; mark it as the key event |
| faq_open | `<details>` toggle | cta=faq_01..08 | |
| outbound_click | Try the app, UMN Extension | cta | Enhanced measurement also covers this |
| video_progress | film milestones 25/50/75/100% | video (opening_and_fleet, how_it_works, crew_app), percent | Films are scroll-scrubbed, so send from each film's progress (data-ga-video on the canvas/video) |

**Conversions:** primary is the deposit paid (`purchase` with value 100). Secondary are `reserve_start` and `reserve_click`.

**Custom dimensions:** section, cta, trailer_size, plan.

**UTM notes:**
- Use lower-case `utm_source / utm_medium / utm_campaign`, for example `?utm_source=instagram&utm_medium=social&utm_campaign=launch_2026_11`.
- Keep the same tags on every link to reserve and product pages.
- Never put UTMs on internal links.
- Shopify keeps UTMs through to checkout.
- Add the shop domain to GA4 cross-domain or unwanted referrals if checkout runs on a different domain.

**Consent:** add Consent Mode v2 and a banner (Shopify's Customer Privacy API) before enabling the tag.

## 7. SEO and AI searchability (done in this build)
- **One H1 per page.** Home: "Your next trailer. A factory inside." H2s: section titles and the FAQ title. H3s: size cards and FAQ questions. The reserve and legal pages already had a single H1.
- **Titles under 60 and descriptions under 155 characters** on every page. Home is 56/136. trailer-16 is 49/117 and trailer-20 is 52/122, and both include the price.
- **Canonical, og:url, og:site_name, og:image** on every page. The new `assets/og-1200x630.jpg` replaces the 4608 px webp. **twitter:card summary_large_image** is on every page too.
- **JSON-LD:**
  - On home: Organization, Product 16 ft, Product 20 ft, and FAQPage.
  - On each trailer page: its own Product.
  - Each Product has a Buy offer (PreOrder) and a "$100 refundable reservation deposit" offer.
  - Rich results may show the $100 offer as the price. If you don't want that, remove the deposit Offer and keep the deposit in the description and FAQ.
- **Text equivalents for the films:** `#hero-film-summary` and `#tour-film-summary` are visually hidden HTML that mirror the on-screen captions, so the key facts exist as real text and not only in video or canvas. The visible FAQ repeats the core facts.
- **Alt text:** I made the poster fallbacks descriptive. Decorative posters stay `alt=""`, and the canvases keep their existing aria-labels.
- **`llms.txt`** is at the root: a factual summary plus page links.
- **Shopify notes (robots and sitemap):**
  - Shopify generates `/robots.txt` and `/sitemap.xml` automatically, so don't upload them.
  - To customise robots, add `templates/robots.txt.liquid`. Keep the defaults and add rules only if needed, for example to block internal search.
  - Set each page's and product's SEO title and description in admin from §2, or in theme `{{ page_title }}` and `{{ page_description }}`.
  - Theme `{{ canonical_url }}` handles canonicals.
  - Pick one primary domain and redirect GitHub Pages to it (or retire that site) to avoid duplicate content.
  - Mark the draft/demo legal pages noindex until they're final.
  - `llms.txt` isn't served natively. Host it as a page plus a URL redirect `/llms.txt`, or as an app proxy or file. Check the method before launch.
  - Submit the sitemap in Google Search Console and Bing Webmaster Tools.

## 8. Shopify portability
- **`copy.json`** holds every string grouped as section → settings/blocks (hero, workday, how_it_works, specs, app, faq, footer, plus seo). Each key maps to a section-schema setting (text, richtext, url) or a block (spec cards, app features, FAQ items, film captions).
- **Film captions** are currently JS literals in `platform-hqworld4.js` and `official-journey-hqworld4.js`. In the theme, render them from section blocks into `<script type="application/json" id="film-captions">` and have the JS read that.
- **Colours** are in `palette-tokens.css`, which maps to theme colour settings.
- **Before tomorrow's launch:**
  - Each "demo / preview / no charge / nothing is sent" string must be replaced when the Shopify deposit checkout goes live. These are on the reserve pages (kicker, "PREORDER PREVIEW · NO CHARGE", SIMULATED payment, "I understand this is a demo", confirmation text), in the FAQ deposit answer (last sentence), in `llms.txt`, and on the privacy, terms, agreement, help and refunds drafts.
  - The legal pages need final, reviewed terms. I did not rewrite any legal text.

## 9. Files changed vs the live build
Modified:
- `index.html`:
  - Text, meta and SEO tags, JSON-LD, the GA placeholder comment, and section ids and `data-ga-*` attributes.
  - Film text equivalents, the FAQ section, and FAQ links in nav and footer.
  - Two `<link>`s added (palette-tokens.css, copy-pass.css).
- `platform-hqworld4.js`: 2 caption strings (hero eyebrow and lead, 16 ft beat copy). Logic unchanged.
- `official-journey-hqworld4.js`: 13 caption strings, plus one title ("Hatch open. Sink out." → "Park. Hatch open."). Logic unchanged.
- `reserve.html`, `trailer-16.html`, `trailer-20.html`:
  - Kicker text, title and description, canonical and OG/Twitter tags, and `data-ga-*` attributes. The trailer pages also get Product JSON-LD.
  - One palette `<link>` and a GA comment.
- `privacy.html`, `terms.html`, `credits.html`, `reservation-agreement.html`, `reservation-help.html`, `reservation-refunds.html`: head tags only (title, description, canonical, OG, Twitter). Body text is unchanged.

Added:
- `palette-tokens.css`
- `copy-pass.css` (FAQ scene and `.sr-only`)
- `copy.json`
- `llms.txt`
- `assets/og-1200x630.jpg` (a frame from the live fleet film)
- `COPY.md`
- `screens/`

Not changed: every other JS, CSS, film, poster, JSON timeline, `reserve-config.js` (still `mode:'demo'`), and `editor-overrides.json`.

The mirror was missing 40+ live files: reserve-demo.js/css, three.js vendor files, GLB models, the legal pages, and the how-it-works step posters. I downloaded them unchanged from the live site so the copy runs locally.

## 10. Testing
- Headless Chrome, desktop 1440×900 and mobile 390×844, with before and after run under the same conditions. 16 stops per viewport, plus the reserve page.
  - **Console/page errors:** none introduced. The only error in both before and after is the pre-existing GitHub-release CORS fetch error for the mobile film.
  - **HTTP 4xx:** none.
  - **Text overflow/clipping check:** none on either viewport.
  - **Reserve flow:** a local click-through (Trailer → Details → Review) made **zero external requests**. Nothing was submitted anywhere.
- WCAG AA contrast re-run: 0 failures after (see §4).
- Screenshots: `screens/<viewport>-<NN>-<beat>-BEFORE|AFTER.png`, side-by-side pairs in `screens/pairs/`.

## 11. Limitations
- The FAQ is a new pinned scene (260 vh of scroll). Answers are collapsed so it fits one screen on phones; a very short phone with several answers open could clip.
- The visually hidden film summaries are a legitimate text equivalent, but they must be kept in sync with the captions in copy.json.
- The film HUD and data labels (measurements, drive-by quote panels) weren't rewritten; they're data in JSON timelines.
- The "Edit this page" pill appears only on localhost; it's the live editor runtime, not part of this pass.
- The how-it-works film streams from GitHub releases, so local viewing needs internet.
- The GA events for reserve_step and video_progress need small JS hooks when the tag is enabled; only attributes and the plan are in place.
