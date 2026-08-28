# Independent product verification

Verdict: **FAIL**

Tested candidate: `1af3486bab438b4203b472ebb8ab305008cceb24`

Tested deployment: <https://audio-chain-cards.sociobot.in>

Verification date: 2026-08-28 UTC

Work order: `audio-chain-cards-verify-1`

The deployment is healthy and byte-for-byte matches the candidate's production build. The earlier deployment-only concern is not present. The FAIL is caused by reproducible product-contract defects in timestamp validation and portable-card validation, plus lower-severity accessibility and caching defects.

## Clean checkout and repository gates

- Initial `git status --porcelain=v1` was empty and `git rev-parse HEAD` returned the requested candidate.
- `npm ci`: passed; 59 packages installed from the lockfile, 0 audit vulnerabilities.
- `npm test`: passed. Vitest: 4/4. Playwright: 10/10 across desktop Chromium and the Pixel 5/mobile project. The command also ran the exact TypeScript and production build.
- `npm run build` via the exact test pipeline: passed (`tsc --noEmit && vite build`) with Vite 7.3.6 and ES2022 output in `dist/`.
- No lint script or separate lint configuration exists in the repository; no lint check was available to run.
- This is a static PWA, not a library, CLI, or backend, so consumer-package, public CLI/API, server concurrency, database-server persistence, and health/build-identity checks are not applicable.

Production output:

| Resource | Uncompressed | Gzip from Vite |
| --- | ---: | ---: |
| `dist/assets/app.js` | 31,110 B | 10.49 kB |
| `dist/assets/style.css` | 22,429 B | 5.65 kB |
| Mobile hero WebP | 35,866 B | n/a |
| Desktop hero WebP | 89,512 B | n/a |

JavaScript, CSS, font (none shipped), and hero-image budgets pass.

## Live deployment identity and policies

Fresh HTTP downloads matched the locally built files exactly:

| File | SHA-256 (local and live) |
| --- | --- |
| `index.html` | `e1601bb3802bab2ed6b96336bae398e037d94514acd9665e566f637bcbf35af8` |
| `assets/app.js` | `5612c48dda6e8c1fdea275bbef67b81e6df46645d06f0721bbb0504f4a8bcefe` |
| `assets/style.css` | `0ea72234fe45b4f69e4887ff237a0437895fcb9ed810de6e66008b85dc9b32b5` |
| `sw.js` | `62754c51ba2daec59499baee81d5e3e9558da05b4df6e44c48aa75ab98c6083a` |
| `manifest.webmanifest` | `2f001fc024c30c7b7461d7972eb74b02f2135a7c176a41a5456eddf2719062ad` |

Live responses were HTTP/2 200 and included HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-DNS-Prefetch-Control: off`. They did not include CSP or Permissions Policy. All sampled HTML, JS, CSS, service-worker, and manifest responses used `Cache-Control: public, must-revalidate, max-age=30`; see defect V-05. The manifest was served as `application/octet-stream`, but Chromium parsed it without manifest or installability errors.

`/opt/fleet/lib/verify-url.sh` passed against both the production preview and the live URL. Live result: HTTP 200, load 677 ms, title present, `lang="en"`, one h1, main landmark, no missing image alt text, no unlabeled button, and no console/page error.

## End-to-end product checks

The following were independently exercised against the live deployment in isolated browser contexts, and representative flows were also covered by the repository's production-preview Playwright suite:

- Starter card: opened all three ordered steps and their audition checkpoints; completion changed to 1/3 and persisted across reload.
- Card authoring: created a two-step card, moved step 2 above step 1, saved it, and observed `Second action`, then `First action` in the workbench.
- Edit/empty recovery: required browser fields stopped incomplete submission; removing all steps produced the explicit `Add at least one step before saving this card` alert.
- Duplicate: after completing a step, duplication created `Boundary chain — copy` with 0/2 complete.
- Delete: Escape closed the specific-card confirmation without loss; confirming deletion showed the empty state; `Restore starter` recovered the starter.
- Source safety: identical input/output paths were refused with `Choose a different output path so the source stays untouched.` A path containing an apostrophe and a semicolon was shell-quoted in the visible FFmpeg command. The app did not execute it.
- Local audio: attached a generated valid two-second WAV. The player loaded it from a `blob:` URL, a `0:01` label sought to 1.15 seconds and started playback, detach cleared it, and no upload request occurred.
- Labels: normal `M:SS` labels persisted and jumped playback; removal used a specific confirmation. Invalid boundaries exposed defect V-01.
- Export/import: export produced a version-1 `.chain-card.json` with 3 steps and labels and no attached-audio filename/content. Importing the same card generated a collision-safe new UUID and restored all 3 steps. Invalid JSON, a wrong envelope, and a file over 1 MB produced recoverable error messages. Malformed nested data exposed defect V-02.
- Privacy: all automatic browser requests were same-origin except the local `blob:` media request. There were no analytics, trackers, third-party fonts/scripts, API calls, cookies, accounts, or audio uploads. Cards persisted in IndexedDB and the seed marker in localStorage, consistent with `/privacy/`.

## PWA, offline, and update behavior

- Chrome DevTools Protocol returned the expected manifest with no manifest parsing errors and no installability errors. It includes 192, 512, and maskable icons, standalone display, token-aligned colors, and versioned `start_url`.
- The live page was controlled by `https://audio-chain-cards.sociobot.in/sw.js`; `chain-cards-v1.0.0-shell` was populated.
- After switching the live browser context offline and reloading the saved workbench, the `Roomy voice: repair & review` route, saved state, and explicit offline banner remained available without console/page errors.
- The update lifecycle was checked with an isolated server serving the exact `dist/`, then changing only the service-worker cache version. `registration.update()` exposed `A fresh version is ready`, `Update now` activated it, control changed, and the updated shell cache appeared. No errors occurred.

## Accessibility, mobile, motion, and visuals

- Axe scans covered home, workbench, editor, malformed-import state, privacy, terms, and 390 px mobile workbench. Serious findings: 0. Critical findings: 0. Axe reported one moderate rule on the workbench (`landmark-complementary-is-top-level`, three nested `aside` nodes); see V-04.
- Keyboard smoke test: the skip link was first, visibly focused with a 3 px amber outline, activation advanced the next Tab stop to the first main-content action, native controls operated with keyboard semantics, and the delete dialog received focus and closed with Escape.
- Browser zoom was not disabled; Chromium reached scale 2 at the 390 px viewport and retained visible content.
- Reduced-motion emulation matched the media query, removed the hero transform, and reduced transitions to 0.01 ms.
- Home, workbench, editor, privacy, and terms each had one h1 and no horizontal overflow at 390×844.
- Manual review of full-page desktop and Pixel 5 screenshots found legible hierarchy, intentional responsive stacking, meaningful original artwork, and no clipping or content loss. One undersized mobile target remains; see V-03.

## Performance

Lighthouse 12.8.2 against the live URL using its mobile profile:

- Performance: 99
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- FCP: 0.93 s
- LCP: 1.242 s
- Total blocking time: 112 ms
- CLS: 0

Lighthouse does not report field INP in this lab run. The first attempt had an infrastructure-only headless-tab crash; an immediate rerun with `--disable-dev-shm-usage` completed with the results above. Browser interaction showed no material response delay.

## Defects

### Medium — V-01: invalid timestamps are silently normalized into valid-looking review anchors

Reproduction:

1. Open the starter workbench.
2. Enter two spaces in Time, a note, and add the label.
3. Enter `1:60`, a note, and add the label.

Actual: both inputs are accepted. Two spaces becomes `Jump to 0:00`; `1:60` becomes `Jump to 2:00`. Both persist and export. The UI says the accepted formats are `M:SS` or `H:MM:SS` and the error path claims to enforce that format.

Expected: reject blank/whitespace-only input and reject minute/second components outside their valid ranges, preserving the user's input so it can be corrected.

Impact: a beginning creator can silently place a review checkpoint at the wrong moment, undermining the core location-based review job.

### Medium — V-02: portable-card validation accepts corrupt nested card and label data

Reproduction: import a nominal v1 envelope whose card has a minimally shaped step but omits normal card/step fields and whose `labels` value is `[{}]`.

Actual: the app imports and opens `Malformed nested card`, renders the empty object as a phantom `Jump to 0:00` label, and cannot remove it because its ID is missing. Missing fields such as label ID/time/note/verdict and core card metadata are not validated.

Expected: validate the full version-1 schema before writing anything to IndexedDB and report which required data is invalid.

Impact: a corrupt or hand-authored shared card can enter durable local storage and create misleading, unrepairable review state. Portable sharing is a core product job.

### Low — V-03: the mobile home/brand link misses the 44 px touch-target minimum

At 390×844, the visible `Chain Cards home` link measured 166×25 CSS px. The contract requires every touch/click target to be at least 44×44 px. Other visible workbench controls met the minimum; the 1 px file input is visually hidden and has a large labeled proxy.

### Low — V-04: workbench complementary landmarks are nested below top-level content

Axe reported `landmark-complementary-is-top-level` on three workbench `aside` elements on desktop and mobile. There were no serious or critical Axe findings, so the requested serious/critical gate passes, but the landmark structure remains confusing for some screen-reader navigation modes.

### Low — V-05: live static assets do not use the requested immutable caching strategy

The build deliberately emits stable names (`assets/app.js`, `assets/style.css`) rather than content hashes, and the host returns `max-age=30, must-revalidate` for them and all media. The service worker provides a cache-first repeat/offline path, but direct HTTP cache behavior does not meet the attached performance contract's long-lived immutable policy for versioned/hashed assets.

## Non-blocking policy observation

The live site has a strong small baseline of response headers but no Content Security Policy or Permissions Policy. No exploit or privacy leak was observed, all dynamic imported text is HTML-escaped in tested surfaces, and automatic runtime requests stayed same-origin. Treat these headers as defense-in-depth work rather than a release blocker for this static local-first tool.

## Final assessment

The deployed candidate is installable, fast, private by default, usable offline, and end-to-end useful. Deployment verification passes. Acceptance remains **FAIL** until V-01 and V-02 are fixed and regression-tested; V-03 through V-05 should be addressed in the same quality pass if practical.
