# Chain Cards repair handoff

Verdict: **PASS — deployed and live-verified**

- Work order: `audio-chain-cards-repair-3`
- Repair base: `ca36cc32034c696302594d98eafa0a6af24e0fd7`
- Product/deployment class: static local-first PWA (`dist/`)
- Verified: 2026-08-28 UTC

## Repair

The offline E2E test could depend on a server already running at port 4173 and
on the first document being claimed during service-worker activation. That made
the mobile check susceptible to exercising a development/stale server and then
waiting for a controller which would never arrive.

- `test:e2e` now runs the exact production build before Playwright, and `npm
  test` routes browser testing through that command.
- Playwright starts a fresh `vite preview --strictPort` and never reuses an
  existing server, so its service worker and precache come from `dist/`.
- The offline regression waits for an active registration, reloads once (the
  deterministic point at which the active worker controls the document), and
  asserts `navigator.serviceWorker.controller` before the offline reload.
  It runs in Desktop Chromium and Pixel 5 projects.

## Verification evidence

```sh
npm ci
npm run build
npm run test:e2e -- -g 'production-preview worker controls' --reporter=list
npm test
```

All commands passed.

- Clean install: 59 packages, 0 vulnerabilities.
- Exact build: `tsc --noEmit && vite build && node scripts/build-sw.mjs`;
  `dist/index.html` exists at the artifact root. App JavaScript is 34.18 kB
  (11.40 kB gzip), CSS is 22.46 kB (5.66 kB gzip), and the mobile WebP hero is
  35.87 kB.
- Focused service-worker regression: 2/2 passed (Desktop Chromium and Pixel
  5); each confirmed a production-preview controller, saved workbench, cached
  fingerprinted JS/CSS, and offline reload banner.
- Full suite: 9 Vitest checks and 20 Playwright checks passed. It covers core
  card workflows, validation, IndexedDB persistence/import, desktop/mobile,
  keyboard skip navigation, Axe accessibility, offline behavior, legal pages,
  and console-error checks.
- `/opt/fleet/lib/verify-url.sh` passed against a local fresh production preview
  at `/`, `/privacy/`, and `/terms/`: HTTP 200, zero console errors, titles,
  `lang="en"`, one h1, main landmark, image alt text, and labeled buttons.
- Privacy remains local-first: no analytics or third-party scripts/fonts are
  bundled; cards use IndexedDB and the browser only requests same-origin PWA
  assets during tested flows.

## Deploy and final live verification

```sh
npm run build
/opt/fleet/lib/deploy-static.sh audio-chain-cards dist
/opt/fleet/lib/verify-url.sh https://audio-chain-cards.sociobot.in/ <evidence-dir>
/opt/fleet/lib/verify-url.sh https://audio-chain-cards.sociobot.in/privacy/ <evidence-dir>
/opt/fleet/lib/verify-url.sh https://audio-chain-cards.sociobot.in/terms/ <evidence-dir>
```

## Deployment and live acceptance

- Deployed the fresh `dist/` with `/opt/fleet/lib/deploy-static.sh
  audio-chain-cards dist`. Azure deployment
  `49466573-7630-4263-88b7-f4fd6609fd56` succeeded; the custom domain was
  `Ready` and returned HTTPS 200.
- Live `/`, `/privacy/`, and `/terms/` each passed `verify-url.sh`: HTTP 200,
  no console errors, correct title and `lang="en"`, one h1, a main landmark,
  no missing image alt text, and no unlabeled buttons.
- Fresh-browser live PWA check: the worker activated and controlled the page;
  the saved `Roomy voice: repair & review` workbench reloaded while offline and
  showed the offline banner. `registration.update()` completed with an active
  `activated` worker and no console errors.
- Live privacy smoke: automatic requests used only
  `https://audio-chain-cards.sociobot.in`, with zero cookies and zero console
  errors.
- Live identity: all 15 served files from the fresh `dist/` matched byte for
  byte by SHA-256. Key hashes: `index.html`
  `02ef2319afbd7c6a43a7cacafe691c4e8ca29026737e02b95d5044650f6aecbe`, app
  JS `8ad7b4bbaf4af9b8b5ecf123235827e0dc586fe5bfa2b6bcad23c5d6171abfd0`, CSS
  `c1875c508b99de6dbd77230ba3b0b5a802dfc3db84063efeffd40362de8ec538`, and
  `sw.js` `355208a94fa2ed9b64f7a17272e17d03943002a4a0621af0f104349a1f58dba7`.

No known product gaps remain.
