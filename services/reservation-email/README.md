# Marvel Labs demo confirmation email

Prepared November 1, 2026. **Not deployed or connected to Resend yet.** GitHub Pages stays the website host. Payments, reservations, cancellation and refunds remain simulated.

## What is ready

- Cloudflare Worker `/confirmation` sends one fixed, escaped DEMO template through Resend; its reservation number matches the website.
- Confirmation and cancellation use separate message content and idempotency keys. Identical retries are deduplicated by Resend for 24 hours. Requests older than 24 hours are rejected.
- Origin checking, mandatory server-validated Turnstile hostname/action, bounded input, fixed recipient count, example-address blocking, rate limits and provider timeouts.
- No API credentials, contact database or application logging. Request bodies are never deliberately logged. Provider infrastructure has its own retention.
- Frontend sends after demo confirmation only when the public endpoint and Turnstile site key are configured. Honest pending/error/accepted states, retry, and downloadable email drafts remain available.
- No live payment integration. An accepted email response means Resend accepted the message, not proof of inbox delivery.

## Account setup still required

1. Create/sign into the Marvel Labs Resend account. Add `updates.marvellabs.com` in Domains. Add only the exact DNS records Resend provides at the domain's DNS host; do not replace the existing website or inbound-mail records. Wait for verified status.
2. Create a sending-only Resend API key scoped to that domain. Keep it outside Git and chat. `EMAIL_FROM` is prepared as `Marvel Labs Demo <reservations@updates.marvellabs.com>`.
3. Sign into Cloudflare with `npx wrangler login`. The website/DNS do not need to move to Cloudflare. Create a Managed Turnstile widget for `sourcgi-code.github.io`.
4. From this directory, enter the two keys at Wrangler's masked prompts:

   ```sh
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```

5. Leave `EMAIL_ENABLED` false for the first deploy. Run `npm test`, `npm run check`, then `npm run deploy` and retain the returned worker URL. Only then set `EMAIL_ENABLED` to `true` and deploy again after verifying the sender and Turnstile setup.
6. Set **public values only** in root `reserve-config.js`: `email.endpoint` to the actual Worker URL plus `/confirmation`, and `email.turnstileSiteKey` to the widget site key. Never put secrets in website files. Update the authoring overlay too, bump its cache version in all six reservation HTML pages, and update privacy/help from “being connected” to active.
7. Complete one demo using an owner-approved real test address. Verify the received number/configuration, DEMO subject/body, cancellation message, retry behavior and provider status. Do not test by emailing the sample address or an unapproved recipient.

## Local checks

Node 24; run `npm ci`, `npm test`, `npm run check`. The tests stub Resend/Turnstile and send no email. `wrangler deploy --dry-run` bundles but does not publish. No authentication bypass exists in the Worker.

Secrets belong only in Cloudflare secrets or ignored local `.dev.vars`, never the repo root (GitHub Pages serves root files). Rollback: set frontend endpoint/site key to empty strings and set Worker `EMAIL_ENABLED` false.

Authoring overlay: `/home/jaxon/marvel_site/marvel-labs-integration/work/claude-takeover-20261027/v3-overlay`.

References: [Resend + Workers](https://resend.com/docs/send-with-cloudflare-workers), [domain verification](https://resend.com/docs/dashboard/domains/introduction), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Turnstile verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [rate limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
