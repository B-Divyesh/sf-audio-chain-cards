# Independent product verification — second pass

Verdict: **FAIL**

- Candidate: `f45dd69342206fa8f843d53f1f5a9903b69fc335`
- Deployment: <https://audio-chain-cards.sociobot.in>
- Verification date: 2026-08-28 UTC
- Work order: `audio-chain-cards-verify-2`

The earlier deployment-only concern is not present: every deployable file in a fresh candidate build matches the live site byte for byte. The repaired timestamp and portable-card validation also pass. This candidate still fails the acceptance contract because the required Privacy and Terms pages reference a stylesheet that the production build does not emit, leaving both pages unstyled with live 404 console errors and undersized controls. A separate low-severity hash-router defect makes the skip link lose focus instead of entering main content.

## Clean checkout and repository gates

- Initial `git status --short --branch` was clean at the requested candidate; `git rev-parse HEAD` returned `f45dd69342206fa8f843d53f1f5a9903b69fc335`.
- `npm ci`: passed; 59 packages installed from the lockfile, 0 audit vulnerabilities.
- `npm test`: passed. Vitest: 8/8. The exact build passed. Playwright: 14/14, serially across desktop Chromium and Pixel 5.
- A separate `npm run build`: passed (`tsc --noEmit && vite build && node scripts/build-sw.mjs`) and produced `dist/`.
- No lint script or lint configuration exists, so no repository lint check was available.
- This is a static PWA, not a library, CLI, or backend. Consumer-package, CLI/API, server concurrency, server persistence, and health/build endpoint checks do not apply.

Production output:

| Resource | Uncompressed | Vite gzip |
| --- | ---: | ---: |
| JavaScript `assets/index-3qOUMilv.js` | 33,984 B | 11.34 kB |
| CSS `assets/index-BR470E3e.css` | 22,463 B | 5.66 kB |
| Mobile hero WebP | 35,866 B | n/a |
| Desktop hero WebP | 89,512 B | n/a |
| JPEG fallback | 146,602 B | n/a |

The JavaScript, CSS, font (none), and hero-image budgets pass. Total built output is 357,778 B.

## Deployment identity

Fresh HTTPS downloads of all 15 deployable files matched the fresh local build. `staticwebapp.config.json` is hosting configuration and is intentionally not served.

| File | Matching local/live SHA-256 |
| --- | --- |
| `index.html` | `c2145302d93cddc0e05f475bd26ac30c87961778804a7e124c622cf66652f8cf` |
| `assets/index-3qOUMilv.js` | `115d244197787d97fbed32982084b9c3a4ad79875341fc55161403bd581a9ed8` |
| `assets/index-BR470E3e.css` | `c1875c508b99de6dbd77230ba3b0b5a802dfc3db84063efeffd40362de8ec538` |
| `sw.js` | `338b3592fca28edc7c1b3e7341e40d46f558920111219b6086c6981a93569515` |
| `manifest.webmanifest` | `2f001fc024c30c7b7461d7972eb74b02f2135a7c176a41a5456eddf2719062ad` |
| `privacy/index.html` | `3338c0e69fc1ba072dde49443f5b3bdfeac767f30989ec79a4d5c01aba94a946` |
| `terms/index.html` | `3aacff9471382ec8b740e0604dbb1d76f4d9c61b14e0976de1f52d88b3539c37` |

This establishes that the live defect is in the candidate artifact, not stale deployment state.

## End-to-end product checks

Fresh, isolated Chromium contexts exercised the production deployment, with the repository suite also exercising the local production preview.

- Opened the three-step roomy-voice starter and found three ordered actions and three audition checkpoints.
- Marked a step complete and confirmed `1 of 3 complete` survived reload in IndexedDB.
- Confirmed missing input/output paths and identical paths are rejected. A valid path containing apostrophes and semicolons was shell-quoted in the visible FFmpeg command; nothing was executed.
- Rejected whitespace, single-part time, short seconds, overflowed minute/second components, a negative time, and a value beyond JavaScript's safe integer range without rewriting the input. Accepted the valid `1:00:00` boundary and persisted it as a review label.
- Attached a generated one-second WAV through a temporary `blob:` URL, confirmed the local filename/player state, detached it, and confirmed exported JSON did not contain its filename or audio.
- Created a two-step card, recovered from the explicit no-steps error, moved step 2 above step 1, saved it, and observed the requested order.
- Duplicated a partially completed card and confirmed the copy reset to 0/2 complete. Escape canceled deletion; explicit confirmation deleted only the copy.
- Exported a version-1 `.chain-card.json` with all three steps. Invalid JSON, a wrong version, malformed nested label data, and a file over 1 MB were rejected without creating the malformed card.
- The missing-card route provides a clear recovery link.

The prior V-01 and V-02 defects are repaired. Invalid timestamps no longer become phantom labels, and malformed nested card data no longer enters IndexedDB.

## Privacy and outbound behavior

- Every automatic network request on the tested app journey was same-origin; the selected audio used only a local `blob:` URL.
- Browser cookies remained empty.
- No analytics, trackers, third-party scripts/fonts, API calls, accounts, uploads, or remote audio processing were observed.
- Cards, labels, completion state, and history persisted only in IndexedDB; the seed marker used localStorage.
- Exported JSON did not contain attached-audio data or the local filename.
- Visible product language states that commands are not executed, processing changes audio, originals should be retained, and output paths must differ.

## PWA, offline, and update behavior

- Chrome DevTools Protocol parsed the manifest with zero manifest errors and zero installability errors. It declares standalone display, a versioned start URL, 192/512/maskable icons, and theme/background colors.
- The live service worker controlled the page and populated the content-versioned `chain-cards-7f9564eff503-shell` cache, including fingerprinted JS and CSS.
- After saving workbench state, `context.setOffline(true)` plus reload preserved the roomy-voice workbench and completion/label data, displayed the offline banner, and produced no console/page errors.
- In an isolated copy of the exact build, changing only the service-worker cache version exposed `A fresh version is ready`; `Update now` activated the waiting worker, reloaded the controlled page, removed the old cache, and created the new shell cache.

## Accessibility, keyboard, responsive layout, and motion

- Independent Axe scans covered home, workbench, new-card editor, missing-card recovery, Privacy, and Terms at a 390 px viewport. Serious findings: 0. Critical findings: 0. The four core app routes had no Axe violations of any impact.
- Every core-route visible link, button, input, select, textarea, and file-drop target measured at least 44×44 CSS px at 390 px.
- Home, workbench, editor, missing-card, Privacy, and Terms each had one h1, one main landmark, and no horizontal page overflow at 390×844.
- The first Tab focuses the skip link and exposes its designed amber outline. Activating it does not reliably move focus into main content; see V2-02.
- Native controls and dialogs were keyboard operable. Escape dismissed deletion without data loss.
- With `prefers-reduced-motion: reduce`, the hero transform was removed and transitions/animations were reduced to 0.01 ms.
- Manual review of fresh full-page desktop and 390 px screenshots found the core app legible, intentionally responsive, and free of clipping. The legal-page screenshots expose V2-01 immediately.

## Browser errors and response policies

`/opt/fleet/lib/verify-url.sh` passed on the local production-preview root and live root. The live root result was HTTPS 200, 865 ms load, correct title/lang/one h1/main/alt/button checks, and no console/page errors.

The same verifier failed on each live legal route:

- `/privacy/`: document HTTP 200; console error `Failed to load resource: the server responded with a status of 404 ()`.
- `/terms/`: document HTTP 200; the same console error.
- Direct cause: both documents request `/assets/style.css`; live responds HTTP 404 with HTML because only `assets/index-BR470E3e.css` exists.

Live response policy sample:

| Resource | Status/type | Cache-Control |
| --- | --- | --- |
| `/` | 200 `text/html` | `public, must-revalidate, max-age=30` |
| fingerprinted JS | 200 `text/javascript` | `public, max-age=31536000, immutable` |
| fingerprinted CSS | 200 `text/css` | `public, max-age=31536000, immutable` |
| `/sw.js` | 200 `text/javascript` | `no-cache, no-store, must-revalidate` |
| `/manifest.webmanifest` | 200 `application/octet-stream` | `public, max-age=300, must-revalidate` |
| `/assets/style.css` | 404 `text/html` | none |

Responses include HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-DNS-Prefetch-Control: off`, and legacy `X-XSS-Protection`. CSP and Permissions Policy are absent. The manifest MIME is generic, but Chromium reported no parsing or installability error.

## Performance

Three Lighthouse 13.4.1 live mobile runs were made to control for shared-runner CPU variance:

| Run | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 87 | 100 | 100 | 100 | 1.05 s | 1.29 s | 521 ms | 0 |
| 2 | 100 | 100 | 100 | 100 | 0.91 s | 1.21 s | 14 ms | 0 |
| 3 | 99 | 100 | 100 | 100 | 0.94 s | 1.11 s | 126 ms | 0 |

Median performance is 99, median LCP is 1.21 s, median TBT is 126 ms, CLS is 0, and transfer size is about 60 KiB. The median passes the attached Lighthouse and LCP budgets; Lighthouse did not supply lab INP. The first run's unattributable CPU/TBT spike was not reproduced in two immediate reruns.

## Defects

### Medium — V2-01: required Privacy and Terms pages ship without their stylesheet

Reproduction:

1. Build the candidate with `npm run build`.
2. Observe that `dist/privacy/index.html` and `dist/terms/index.html` reference `/assets/style.css`.
3. Observe that `dist/assets/` contains only fingerprinted `index-BR470E3e.css`.
4. Open either legal page on the live deployment in a fresh browser context.

Actual: the stylesheet request returns HTTP 404 and produces a console error. Both pages render in default browser styles; the logo becomes an oversized solid black SVG. At 390 px, the skip and return links are only 17 px high and the brand link is 35 px high, below the 44 px touch-target requirement.

Expected: required legal pages load the product stylesheet without errors and retain the documented visual system, focus treatment, responsive layout, and touch targets.

Impact: the two contract-required trust pages look broken, violate the no-console-errors and design-system gates, and expose undersized mobile controls. Core card workflows remain functional, so severity is Medium rather than High.

### Low — V2-02: skip-link activation conflicts with hash routing and loses focus

Reproduction:

1. Open the home route in a fresh context.
2. Press Tab; `Skip to main content` receives visible focus.
3. Press Enter, wait for hash routing to settle, then press Tab.

Actual: `href="#main"` changes the application hash. The SPA `hashchange` handler treats `main` as a route and rerenders the page. Focus settles on `<body>`; the next Tab focuses `Chain Cards home` in the header.

Expected: activation moves the keyboard sequence into `<main>`, with the next Tab reaching `Build a chain`.

Impact: keyboard users cannot use the offered bypass link and must traverse the header controls. All controls remain reachable and the route has a short header, so severity is Low.

## Non-blocking observations

- CSP and Permissions Policy remain defense-in-depth opportunities. No third-party runtime traffic or injection issue was observed.
- The manifest is served as `application/octet-stream`; Chromium nevertheless reports zero manifest/installability errors.
- The app is intentionally a recipe/audition tool, not a restoration model, renderer, command executor, or full DAW.

## Final assessment

**FAIL.** Deployment identity, core job-to-be-done, privacy, PWA offline/update behavior, validation repairs, bundle budgets, Axe serious/critical, and median performance all pass. Acceptance is blocked by V2-01. V2-02 should be fixed in the same pass and both defects should receive production-preview and live regressions.
