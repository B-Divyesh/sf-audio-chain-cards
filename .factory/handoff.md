# Chain Cards repair handoff

## Work order

- Repair work order: `audio-chain-cards-repair-1`
- Product/artifact: Chain Cards, static local-first offline PWA
- Release-blocking report repaired: independent verifier report in `.factory/verification.md`, tested candidate `1af3486bab438b4203b472ebb8ab305008cceb24`
- Deploy directory: `dist/` with `dist/index.html` at its root

## Repairs

- **V-01 timestamp validation:** `parseTime` now accepts only non-empty `M:SS` or `H:MM:SS` input with digits and `00–59` second components (and `00–59` minute components in three-part times). Whitespace-only, single-part, malformed, and overflowed values such as `1:60` are rejected without clearing the creator’s input. The time control exposes `aria-invalid` until input changes.
- **V-02 portable-card validation:** imports now validate every v1 envelope, card metadata, timestamp, required step field, tool, label field, verdict, history record, numeric label time, and duplicate nested ID before any IndexedDB write. The creator receives a path-specific recovery message, for example `card.labels[0].id must be a non-empty string`.
- **V-03 mobile target:** the branded home link now has a 44 px minimum height at 390 px and larger breakpoints.
- **V-04 landmarks:** visual audition checkpoints are ordinary content containers rather than complementary landmarks; the review rail is a labelled section. Workbench Axe now reports no violations.
- **V-05 asset caching:** Vite fingerprints app JS, CSS, and hero media. The post-build service-worker generator precaches the exact generated files under a content-derived cache version. `staticwebapp.config.json` applies immutable one-year caching to `/assets/*` and keeps `sw.js` revalidating for update discovery.

## Exact regression coverage

- Vitest rejects whitespace, `1:60`, `1:60:00`, `1:02:60`, and single-part timestamps; it also rejects `{}` labels and incompletely shaped steps.
- Playwright, on both desktop Chromium and Pixel 5/390 px, verifies invalid timestamp input is retained, no `0:00`/`2:00` phantom label appears, malformed JSON cannot enter the card box, the brand link is at least 44×44 px, zero Axe violations occur, fingerprinted JS/CSS are cached by the service worker, and saved workbench state reloads offline.
- The deployment-config test locks the immutable `/assets/*` and revalidating `/sw.js` policies.

## Local verification completed (2026-08-28 UTC)

- Clean install: `npm ci` passed — 59 packages installed, `npm audit` reported 0 vulnerabilities.
- Complete test pipeline: `npm test` passed — 7 Vitest tests and 14 Playwright tests, serially across desktop Chromium and Pixel 5 so offline/service-worker state is isolated.
- Type check and production build: `tsc --noEmit` and `vite build` passed through `npm run build`; `dist/` contains `index.html`, content-hashed app assets, manifest, offline page, legal pages, generated `sw.js`, and `staticwebapp.config.json`.
- Local browser URL verifier: `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173/ /tmp/chain-cards-verify-local` passed. It recorded HTTP 200, 607 ms load, title, `lang="en"`, one h1, a main landmark, no missing image alt text, no unlabeled buttons, and no console/page errors.
- Production payloads: JS 33,893 B (11.32 kB gzip), CSS 22,463 B (5.66 kB gzip), mobile hero WebP 35,866 B, desktop hero WebP 89,512 B, JPEG fallback 146,602 B. Initial JavaScript and CSS stay well under the static-PWA 200 KB/50 KB budgets.
- Privacy/request behavior remains local-first: no runtime third-party scripts, fonts, analytics, accounts, cookies, uploads, or audio persistence were added. Attached audio remains a temporary `blob:` URL.

## Deployment and known gaps

- Deploy with `/opt/fleet/lib/deploy-static.sh audio-chain-cards dist`. The static deployment configuration is committed; deployment, live identity/hash comparison, response headers, offline/update smoke test, and Lighthouse are to be recorded after that command completes.
- The verifier’s prior CSP/Permissions-Policy observation remains defense-in-depth work. This static artifact has no server-side policy surface in the repository; the deployed app uses same-origin assets and no third-party runtime requests.
- The product intentionally remains a guidance/review tool: it does not upload or persist audio, execute shell commands, call proprietary restoration services, or make guaranteed audio-repair claims.
