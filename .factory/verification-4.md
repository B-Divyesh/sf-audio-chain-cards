# Independent product verification — fourth pass

Verdict: **PASS**

- Candidate: `c3f525ca325ba19fc75009e3b8c64b732364a564`
- Deployment: <https://audio-chain-cards.sociobot.in>
- Verification date: 2026-08-28 UTC
- Work order: `audio-chain-cards-verify-4`

This was a fresh, independent verification. The earlier deployment-only concern is not reproducible: the live product is the exact fresh production artifact from this candidate, and the real creator workflow, PWA behavior, privacy boundary, accessibility baseline, and performance gates pass.

## Clean checkout and repository gates

- Started with a clean worktree at the requested SHA; `git status --short` was empty.
- `npm ci` passed: 59 packages installed, 0 audit vulnerabilities.
- `npm test` passed with exit code 0: Vitest **9/9**, then the exact production build, then Playwright **20/20** (Desktop Chromium and Pixel 5/390px class) in 1.1 minutes.
- A separate `npm run build` passed: `tsc --noEmit && vite build && node scripts/build-sw.mjs`; `dist/` contains the deployable static PWA.
- No lint script or lint configuration exists, so there was no separate lint command to run.
- This is a static PWA, not a library, CLI, backend, or sign-in product. Consumer-package, CLI/API, server concurrency/persistence/health, sign-in tenant, and API rate-limit checks are not applicable. `/api/health` returns the SPA's static HTML fallback, not an API endpoint.

| Production resource | Uncompressed | Gzip |
| --- | ---: | ---: |
| JavaScript `assets/app-B8a0j5OV.js` | 34.18 kB | 11.40 kB |
| CSS `assets/style-BR470E3e.css` | 22.46 kB | 5.66 kB |
| Mobile hero WebP | 35.87 kB | n/a |
| Desktop hero WebP | 89.51 kB | n/a |

All static bundle, CSS, font (none shipped), and mobile-image budgets pass.

## Live deployment identity and response policies

Every served product file in the fresh local build matched its fresh live HTTPS download by SHA-256 (15/15). `staticwebapp.config.json` is hosting configuration and is deliberately not public.

| File | SHA-256 (local = live) |
| --- | --- |
| `index.html` | `02ef2319afbd7c6a43a7cacafe691c4e8ca29026737e02b95d5044650f6aecbe` |
| `assets/app-B8a0j5OV.js` | `8ad7b4bbaf4af9b8b5ecf123235827e0dc586fe5bfa2b6bcad23c5d6171abfd0` |
| `assets/style-BR470E3e.css` | `c1875c508b99de6dbd77230ba3b0b5a802dfc3db84063efeffd40362de8ec538` |
| `sw.js` | `355208a94fa2ed9b64f7a17272e17d03943002a4a0621af0f104349a1f58dba7` |
| `privacy/index.html` | `14ae1c628321ba8e92c4fe29044e92cdce1dcb27e5ecc3b5ca0291049e4a4be2` |
| `terms/index.html` | `be418285762d36febcba6819b52272d8a25d219910d51da6a214d58ec7ffec8a` |

Live sampled responses were HTTPS/HTTP2 200 and supplied HSTS, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. HTML uses short revalidation (`max-age=30`), fingerprinted JS/CSS use `public, max-age=31536000, immutable`, and `sw.js` is `no-cache, no-store, must-revalidate`, as required for reliable updates.

`verify-url.sh` passed on `/`, `/privacy/`, and `/terms/`: one title/h1/main landmark, `lang="en"`, no missing alt text or unlabeled buttons, and no console/page errors.

## End-to-end product evidence

Against the live deployment in clean, isolated Chromium contexts:

- Opened the cautious three-step roomy-voice recipe, marked a step complete, added a valid `1:00:00` review label, and confirmed completion persisted after reload.
- Invalid `1:60` was rejected without changing the entered value; normal and boundary valid timestamps work. The full suite also rejects blank, malformed, negative, unsafe-integer, and bad-component inputs.
- Same input/output paths are refused with an explicit source-protection message. A path containing apostrophe and semicolon characters is safely shell-quoted in the displayed FFmpeg command; the app never executes it.
- Full desktop/mobile E2E coverage independently exercised card creation/editing, ordered steps, schema validation/import recovery, and legal pages. Corrupt nested portable-card data is rejected before IndexedDB storage.
- Attached a generated WAV as `private-source.wav`; the player used a `blob:` URL, detach cleared it, automatic requests stayed same-origin, and the browser had zero cookies. No analytics, trackers, third-party fonts/scripts, account calls, uploads, or remote audio processing were observed.
- Imported/exported cards are local-first IndexedDB/JSON behavior; the product language, Privacy page, and Terms page correctly state that audio is not processed/uploaded, originals must be kept, a new output path is required, and no repair is guaranteed.

## PWA, accessibility, responsive behavior, and performance

- Chrome's manifest inspection returned the live manifest URL with **0 manifest errors** and **0 installability errors**. It declares standalone display, versioned start URL, and 192/512/maskable icons.
- The live worker was active and controlled the document. With the saved workbench loaded, `context.setOffline(true)` followed by reload retained `Roomy voice: repair & review`, saved state, and the explicit offline banner with no errors.
- In an isolated server based on the exact built `dist/`, changing only the generated worker cache version made `A fresh version is ready.` visible. `Update now` activated the waiting worker, left no waiting worker, and replaced `chain-cards-update-test-1-{shell,runtime}` with `chain-cards-update-test-2-{shell,runtime}`. No console/page errors occurred.
- Axe scans of live home, workbench, Privacy, and Terms, plus the repository's desktop/mobile Axe coverage, found **0 serious** and **0 critical** violations (the workbench scan had no violations of any impact).
- Keyboard-only smoke: first Tab exposes the skip link; Enter moves focus to `main`; the next Tab reaches the primary action. Dialog/native form flows are keyboard operable. At 390x844 home and workbench have one h1 and no horizontal overflow; the brand target measured 165.6x44 CSS px.
- With `prefers-reduced-motion: reduce`, the live hero had `transform: none` and `transition-duration: 0.00001s`.
- Lighthouse 13.4.1, live URL, mobile/default profile: **Performance 94, Accessibility 100, Best Practices 100, SEO 100**; FCP 1.1 s, LCP 1.3 s, TBT 290 ms, CLS 0. Lab INP was not reported by this Lighthouse run. The required score, LCP, and CLS gates pass.

## Defects by severity

| Severity | Result |
| --- | --- |
| Critical | None |
| High | None |
| Medium | None |
| Low | None |

## Non-blocking hardening observations

- Live responses do not currently send a Content-Security-Policy or Permissions-Policy header. No exploit, unsafe external request, or acceptance failure was found; adding a restrictive static CSP and permissions policy would be defense-in-depth work.
- The manifest is served as `application/octet-stream`, although Chromium parses it successfully with no manifest/installability errors. A manifest-specific MIME type would be a small hosting polish item.

## Final assessment

**PASS.** The candidate is the deployed artifact and meets the researched brief's smallest useful job: a beginning creator can follow, audition, label, save, and share a careful three-step repair/finishing recipe locally, without a DAW template system or cloud audio processing.
