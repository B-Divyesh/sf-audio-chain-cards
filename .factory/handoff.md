# Chain Cards repair handoff

Verdict: **PASS locally — ready for static deployment**

- Work order: `audio-chain-cards-repair-2`
- Repair base: `f45dd69342206fa8f843d53f1f5a9903b69fc335`
- Independent report repaired: `adf86ca52e9a942aa939acc2a55d6767bedd6445` / `verification-2.md`
- Product/deployment class: static local-first PWA (`dist/`)
- Verified: 2026-08-28 UTC

## Repaired release blockers

1. **V2-01 legal-page stylesheet 404:** Privacy and Terms are now Vite multi-page entries (`privacy/index.html`, `terms/index.html`) that import the shared source stylesheet. Production rewrites both references to the emitted fingerprinted CSS asset rather than copying an invalid stable `/assets/style.css` URL. The source legal documents retain their single dark night-market treatment and their return links now use the same ≥44 px shared button system.
2. **V2-02 skip-link hash routing:** app-rendered main landmarks receive `tabindex="-1"`; `#main` is explicitly handled as a fragment target before hash-route parsing, so activating the skip link preserves the current screen and focuses main. Initial load intentionally leaves focus at the document boundary, keeping the skip link first in the normal tab order.

## Regression coverage

- Unit/build coverage verifies both legal pages are Vite inputs, import `/src/style.css`, and no longer contain the broken `/assets/style.css` URL.
- Production-preview Playwright coverage loads `/privacy/` and `/terms/` from `dist/`, captures every failed HTTP response and console error, verifies a fingerprinted CSS URL and the styled dark background, checks 390×844 return-link targets, and runs Axe serious/critical checks.
- Keyboard coverage presses Tab then Enter on the skip link, waits for hash handling to settle, asserts focus is the current main landmark, and verifies the next Tab reaches the first main-content action.
- The existing offline test accepts content-hashed app asset names and confirms the service worker cache supports an offline saved-workbench reload.

## Verification evidence

```sh
npm ci                 # passed: 59 packages, 0 vulnerabilities
npm test               # passed: 9 Vitest checks; production build; 20 Playwright checks
npm run build          # passed: tsc --noEmit, Vite, service-worker generation
```

- Playwright ran serially in desktop Chromium and Pixel 5 projects. It covers starter-card workflow, validation/error recovery, import/export, card editing, keyboard operation, 390 px layout, Axe, PWA offline reload, and the new legal/skip regressions.
- `/opt/fleet/lib/verify-url.sh` passed against local production preview root, `/privacy/`, and `/terms/`: each had HTTP 200, no console errors, title, `lang="en"`, one h1, a main landmark, no missing image alt, and no unlabeled buttons.
- Local privacy smoke test captured only `http://127.0.0.1:4173` automatic requests, zero cookies, and zero third-party origins.
- Lighthouse 13.4.1 mobile profile on local production preview: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; LCP **1.2 s**, TBT **0 ms**, CLS **0**.
- Final build: app JS 34.18 kB (11.40 kB gzip), CSS 22.46 kB (5.66 kB gzip), mobile hero WebP 35.87 kB. All static budgets pass. `dist/` contains `index.html` and the generated versioned service-worker shell including `/privacy/`, `/terms/`, and fingerprinted CSS.
- There is no repository lint script/configuration; TypeScript validation is part of the passed build. This static PWA has no package consumer, server/API, or database-service surface to test.

## Deploy and re-verify

```sh
npm run build
/opt/fleet/lib/deploy-static.sh audio-chain-cards dist
/opt/fleet/lib/verify-url.sh https://audio-chain-cards.sociobot.in/ /tmp/chain-cards-live-root
/opt/fleet/lib/verify-url.sh https://audio-chain-cards.sociobot.in/privacy/ /tmp/chain-cards-live-privacy
/opt/fleet/lib/verify-url.sh https://audio-chain-cards.sociobot.in/terms/ /tmp/chain-cards-live-terms
```

## Deployment and live acceptance

- Deployed `dist/` through `/opt/fleet/lib/deploy-static.sh audio-chain-cards dist`; Azure deployment `87959b10-908c-4c4d-9b7f-4f3d8a917705` succeeded and the custom domain is ready.
- Live identity byte match (local/live SHA-256): `index.html` `02ef2319afbd7c6a43a7cacafe691c4e8ca29026737e02b95d5044650f6aecbe`; app JS `8ad7b4bbaf4af9b8b5ecf123235827e0dc586fe5bfa2b6bcad23c5d6171abfd0`; CSS `c1875c508b99de6dbd77230ba3b0b5a802dfc3db84063efeffd40362de8ec538`; `sw.js` `355208a94fa2ed9b64f7a17272e17d03943002a4a0621af0f104349a1f58dba7`; Privacy `14ae1c628321ba8e92c4fe29044e92cdce1dcb27e5ecc3b5ca0291049e4a4be2`; Terms `be418285762d36febcba6819b52272d8a25d219910d51da6a214d58ec7ffec8a`.
- Live `verify-url.sh` passed root, Privacy, and Terms with no console errors. The legal pages each returned HTTP 200 with their fingerprinted `/assets/style-BR470E3e.css` sheet; their previous 404 is gone.
- Live response policy: fingerprinted JS is `public, max-age=31536000, immutable`; `sw.js` is `no-cache, no-store, must-revalidate`; HSTS, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` are present.
- Live Privacy-page browser smoke test observed only same-origin automatic requests, zero cookies, and zero console errors.

No known product gaps remain.
