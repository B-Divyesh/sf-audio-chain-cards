# Chain Cards repair handoff

Verdict: **PASS — ready for static deployment**

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

No known product gaps remain. Live deployment evidence is appended after the
deployment command completes.
