# Review: Repeat and share an audio repair sequence

## Verdict

**FAIL — 8 findings and 10 untested public claims.**

The deployed product still performs its main card workflow. It does not meet the attached demo, claims, plain-words, routing, metadata, and hosting contracts. A successful test run is therefore not a product PASS.

- Implementation reviewed: `c3f525ca325ba19fc75009e3b8c64b732364a564`
- Documentation SHA reviewed: `35b61b7891bf56a4b9fda438091bf8ba6640e63e`
- Live URL: <https://audio-chain-cards.sociobot.in>
- Review date: 2026-09-05 UTC
- Work order: `audio-chain-cards-review-1`

The commits after the implementation candidate only change `.factory/handoff.md` and add `.factory/verification-4.md`. All 15 files served by the live product match a fresh build from the candidate byte for byte.

## Job, audience, and first action

- Job: record, follow, review, and share an ordered audio repair sequence.
- Audience: beginning audio creators who do not want to maintain a full DAW template.
- First action shown: `Build a chain`. The sample action is `Try the 3-step starter`.

The product does not state the audience on the first screen. On a fresh Pixel 5 viewport, the fixed navigation covers both actions before the user scrolls. Finding R1-03 records this failure.

## Clean checkout and declared commands

A new clone at documentation SHA `35b61b7` was used. The worktree was clean before the commands ran.

```sh
npm ci
npm test
npm run build
```

- `npm ci`: passed; 59 packages installed and 0 audit vulnerabilities reported.
- `npm test`: passed; 9 Vitest checks and 20 Playwright checks passed in desktop Chromium and the 390 px-class project.
- `npm run build`: passed and produced `dist/index.html`.
- Built JavaScript: 34.18 kB uncompressed, 11.40 kB gzip.
- Built CSS: 22.46 kB uncompressed, 5.66 kB gzip.
- Mobile hero WebP: 35.87 kB.

There is no `.factory/claims.json`, no `@claim:` tag, and no declared claim command. The repository's general tests pass, but they do not satisfy the required one-command-per-claim contract. This is finding R1-02.

## Live desktop and phone results

Fresh isolated Chromium contexts were used for a 1440×900 desktop and a Pixel 5 phone. Screenshots are in `/work/.evidence/screenshots/`.

- The starter opens with three ordered steps and three listening checkpoints.
- Completion state and a label persist after reload in `chain-cards-local` IndexedDB.
- `1:60` is rejected, its input remains unchanged, and a separate `1:00:00` boundary label is accepted.
- A malformed imported label is rejected before a card is stored.
- Equal input and output paths are rejected. Apostrophes and semicolons are shell-quoted in the displayed FFmpeg command.
- A selected WAV uses a `blob:` URL. Detaching it clears the player.
- All observed requests were same-origin or `blob:`. There were no cookies, analytics calls, uploads, or third-party runtime requests.
- Live saved work reloaded offline with the offline banner and no browser errors.
- An isolated exact-build update test showed the update notice, activated the waiting worker, and replaced the old shell/runtime caches with the new version.
- Home, workbench, Privacy, and Terms had no Axe violations. The supplied URL verifier passed on `/`, `/privacy/`, and `/terms/` with one h1, `lang="en"`, a main landmark, alt text, and no console errors.
- Keyboard review passed the skip link, main focus, next-action focus, native controls, and dialog escape path.
- Reduced motion removes the hero transform and reduces transitions and animations to 0.01 ms.
- All visible phone targets met 44×44 px, excluding the intentionally hidden file input with its large label. There was no horizontal overflow.
- Privacy, Terms, and the source link returned HTTP 200.

Lighthouse 13.4.1 against the live root reported Performance 100, Accessibility 100, Best Practices 100, and SEO 100. FCP was 1.0 s, LCP 1.1 s, total blocking time 0 ms, CLS 0, and transferred content 55 KiB.

This is a static PWA. Backend tenant isolation, restart persistence, health endpoints, and 429/`Retry-After` behavior do not apply. CLI, library, desktop installer, sign-in, and consumer-package checks also do not apply.

## Public claims without required tests

The following ten distinct public promises have no entry in `.factory/claims.json` and no test tagged `@claim:<id>`. Some were observed in the general suite or manual review, but all remain untested under the attached claims contract.

| # | Public promise | Where it appears | Review evidence |
| ---: | --- | --- | --- |
| 1 | Create, reorder, complete, duplicate, and delete cards | README and app | General E2E passes; no claim test |
| 2 | Play selected audio locally without upload or persistence | Landing, workbench, Privacy | Blob and request review passes; no claim test |
| 3 | Timestamp labels jump to selected moments | Landing and README | General E2E passes; no claim test |
| 4 | Distinct paths are required and displayed FFmpeg commands are not run | Workbench, README, Terms | Live invalid and quoted-path review passes; no claim test |
| 5 | Import and export a validated, versioned JSON card | Landing and README | General validation tests pass; no claim test |
| 6 | Saved cards persist after refresh, tab close, or install | README and Privacy | Reload passes; tab-close/install promise has no claim test |
| 7 | Saved cards and the workbench work offline | Header banner and README | Live offline reload passes; no claim test |
| 8 | There are no accounts, analytics, ads, trackers, or third-party runtime scripts | Privacy | Request review passes; no claim test |
| 9 | The product is free and MIT licensed | Terms and README | Files and copy agree; no claim test |
| 10 | The product does not process audio, provide a restoration model, or guarantee improvement | README and Terms | Code and copy agree; no claim test |

Untested claim count: **10**.

## Findings

### R1-01 — High — The sample is not an isolated demo

Reproduction:

1. Open `/demo` or a clean home page.
2. Choose `Try the 3-step starter`.
3. Complete a step or add a review label.
4. Reload the page.

Actual: `/demo` returns the ordinary home page. The starter uses the normal `chain-cards-local` database, and edits persist there. There is no `Demo — sample data, nothing is saved` label, `Reset demo`, or `Start for real`. `.factory/demo.md` is also absent.

Expected: one click must open realistic sample data in a separate demo namespace. The persistent demo label must explain that nothing is saved, and reset and exit actions must be available without reading or writing real cards.

The starter itself is realistic and populated, but it is not a safe demo sandbox.

### R1-02 — Medium — Public claims have no claims file or tagged commands

`.factory/claims.json` is absent and the repository contains no `@claim:` tests. Ten public promises are listed above. General unit and E2E coverage does not provide the required stable command for each promise, and install/tab-close persistence is not fully asserted even in the general suite.

Expected: list every public promise in `.factory/claims.json` and give it exactly one tagged observable test that starts from the demo entry point.

### R1-03 — Medium — Phone navigation covers the first actions

In a fresh Pixel 5 context, the viewport was 393×727 px. `Build a chain` occupied y=641–689 and `Try the 3-step starter` occupied y=701–749. The fixed phone navigation occupied y=666–727. `document.elementFromPoint()` at the center of both actions returned the navigation, not the action.

The first action is therefore partly hidden and the sample action is fully hidden before scrolling. This fails the required first-screen action and blocks direct touch use at landing.

Evidence: `/work/.evidence/screenshots/phone-first-viewport.png`.

### R1-04 — Medium — The first screen does not use the required plain words

The h1 is `A clear route through your next audio fix.` It uses a route metaphor instead of naming the job. The next sentence does not name beginning audio creators. The sample button is not `Try it with sample data`, and no nearby sentence says what happens after selection. The first screen has one combined local/audio statement, not separate privacy, offline, and price facts.

Other public headings use the same prohibited wording, including `The route`, `Do less menu hunting`, `Live repair route`, and `The stall is still here`. Several legal-page sentences exceed 22 words. The required `.factory/copy-audit.md` is absent.

Expected: name the audio-sequence job, audience, first action, next result, and three short facts without metaphor.

### R1-05 — Medium — Real routes, route titles, and the 404 page are missing

- `/this-route-does-not-exist-review-1` returns HTTP 200 and the home page.
- `/demo` returns HTTP 200 and the home page rather than a demo.
- App places use hash URLs such as `/#/card/starter-roomy-voice`.
- The title remains `Chain Cards — Repeatable audio repair recipes` after opening the starter or editor.
- Route changes focus the new main region but do not use the required polite route announcement.

Expected: real URLs, a route-specific title, a screen-reader route announcement, and a styled unknown-route response with HTTP 404 and a way home.

### R1-06 — Low — Required metadata and shared site structure are incomplete

The root has no canonical URL, Open Graph fields, Twitter card fields, 1200×630 social image, or 180 px Apple touch icon. `/sitemap.xml` returns 404. Privacy and Terms omit the normal navigation and footer. The app footer omits `Built by Param Factory` and the version/build ID. The external source link does not say that it is external.

Expected: the attached metadata and consistent header/footer structure on every route.

### R1-07 — Low — Required browser security policies are absent

Live responses include HSTS, `X-Content-Type-Options`, and `Referrer-Policy`, but no Content-Security-Policy or Permissions-Policy. No unsafe request or console error was observed, so this remains low severity. The site-structure contract still requires a CSP that matches the product's actual resources.

### R1-08 — Low — The web manifest has a generic MIME type

`/manifest.webmanifest` is served as `application/octet-stream` instead of `application/manifest+json`. Chromium parses it and reports no installability error, so this is a standards and interoperability defect rather than a failed install path.

## Earlier finding disposition

| Earlier item | Current disposition | Evidence |
| --- | --- | --- |
| V-01 timestamp normalization | Fixed | Live `1:60` rejection preserves input; `1:00:00` is accepted |
| V-02 incomplete portable-card validation | Fixed | Live malformed nested label rejected; no card stored |
| V-03 undersized phone brand target | Fixed | Visible-target scan passes; brand is at least 44 px high |
| V-04 nested complementary landmarks | Fixed | Workbench Axe scan reports no violations |
| V-05 non-immutable assets | Fixed | Fingerprinted JS/CSS return one-year immutable caching |
| V2-01 broken legal-page styles | Fixed | Privacy and Terms load styled with HTTP 200 and no browser errors |
| V2-02 skip-link route conflict | Fixed | Enter focuses `main`; next Tab focuses `Build a chain` |
| Later offline test/deployment concern | Fixed | Clean 20-test suite and live controlled offline reload pass |
| Missing CSP and Permissions-Policy observation | Open | Finding R1-07 |
| Generic manifest MIME observation | Open | Finding R1-08 |

## Useful product behavior that passed

The researched job is substantially implemented. A beginning creator can open a careful three-step card, follow ordered actions, inspect listening checkpoints, attach local audio, add review labels, generate source-safe command text, and move the card through JSON. Empty, invalid, boundary, import-recovery, delete-cancel, keyboard, phone, offline, and update paths are present. The product does not need an AI feature: import/export already addresses the obvious interoperability need, and automatic audio advice would conflict with the careful, source-safe scope.

## Final result

**FAIL.** There are **8 findings** and **10 untested public claims**. The exact deployed candidate is functional and fast, but PASS requires all findings to be resolved and every public promise to have a declared demo-based claim test.
