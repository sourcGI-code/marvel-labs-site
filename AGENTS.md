# Marvel website working rules

- Start from the current `origin/main` and current public site. Check `CNAME`,
  the film manifest and reservation configuration. Old chats and old worktrees
  are history, not proof of the current design or service status.
- Preserve the published desktop design, wording, trailer assets, cameras,
  pricing and payment flow unless the owner specifically requests a change.
  Keep the 1.6x workday experiment local-only. Netlify stays retired.
- Reproduce the reported failure before editing. Change its source rule rather
  than stacking unrelated CSS overrides or replacing approved scenes.
- CSS sources are ordered in `tools/site-styles.json`; rebuild `site-main.css`
  with `node tools/build-site-styles.mjs <installed-esbuild-module-path>`.
  Bump cache versions through each changed module's import chain to index.html.
- For responsive changes, inspect screenshots at 360x740, 390x844, tablet,
  desktop and sideways-phone sizes. Check full film subjects, yard overlays,
  readable app content, header clearance and navigation in both directions.
  A successful HTTP response or no console errors is not visual approval.
- Use `tools/check-mobile-presentation.cjs` for the film/app regression checks.
  Pass the actual preview URL, installed Playwright path, browser executables
  and output directory via its documented environment variables.
- Keep preview routes consistent with the current exported app base (`/crew`).
  Do not reuse old preview redirects without checking the app export.
- A real-AI claim requires a successful public model request. Scripted replies,
  local-only inference and mocked tests do not establish public AI readiness.
  Update the model's product facts from the current published offering.
- Verify publication against the deployed commit and public browser behavior.
  State remaining blockers precisely. WebKit on Linux is not a physical iPhone;
  distinguish missing test-machine codecs from an actual Safari playback bug.
- Do not erase histories, settings, credentials or browser data to repair code.
  For a fresh thread, provide a short current-state handoff and these rules.
