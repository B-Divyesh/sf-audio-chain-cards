# Chain Cards repair handoff

## Result

**PASS — all strict-review findings repaired and live-verified.**

- Work order: `audio-chain-cards-repair-4`
- Review base: `9cf26f0da127822c116ee4776b3437d949798b59`
- Implementation and deployed artifact: `6792d472cba791ef0ae98ceae6a32a578f8431e2`
- Handoff documentation: the report-only commit containing this file, after the implementation SHA above
- Deployment: `409b02c8-67f3-4d74-b898-7dc747ddce56`
- Live URL: <https://audio-chain-cards.sociobot.in>
- Verified: 5 September 2026 UTC

## What changed

1. `/demo` now opens a realistic three-step voice card in one click. Demo changes use `demo:` session-storage keys and never open or write the real IndexedDB card store.
2. A persistent demo banner provides **Reset demo** and **Start for real**. Reset restores one completed step and three review labels. Exit removes all demo keys.
3. `.factory/claims.json` lists 11 public promises. Each has one `@claim:<id>` browser test and its own command.
4. The first screen now names the audio-sequence job, beginning creators, the sample action, its result, price, offline behavior, and storage behavior.
5. Both first actions and all three facts fit a fresh 393×727 phone screen. The actions are not covered and hit-test correctly.
6. Hash routes were replaced with `/cards`, `/cards/new`, card workbench/edit routes, `/demo`, and demo subroutes. Titles, canonical metadata, History API behavior, h1 focus, and polite route announcements update on navigation.
7. Unknown live URLs return a designed HTTP 404 with a route home. Stable routes are listed in `sitemap.xml`.
8. Root, legal pages, and 404 now have route titles, descriptions, canonical URLs, Open Graph and Twitter fields, a 1200×630 social image, and an Apple touch icon.
9. The app, legal pages, and 404 use the shared header and footer. The footer names Param Factory, version 1.1.0, legal links, the external source link, and generated-art provenance.
10. Static hosting now sends CSP, Permissions-Policy, X-Frame-Options, nosniff, and Referrer-Policy headers. The manifest uses `application/manifest+json`.
11. Plain copy replaced metaphor headings and the decorative signal badge. `.factory/copy-audit.md` records every landing sentence and terminology.
12. The existing original hero art was reused. The social image is a local crop of that source; no new model output or third-party asset was added.

AI was not added. This deterministic, local recipe workflow has no model-dependent step, and the researched brief does not imply one.

## Finding disposition

| Finding | Disposition | Evidence |
| --- | --- | --- |
| R1-01 isolated demo | Fixed | `/demo`, persistent banner, reset/exit, separate session storage, `@claim:demo-isolation` |
| R1-02 claims manifest | Fixed | 11 manifest entries; all 11 commands passed separately from a clean clone |
| R1-03 covered phone actions | Fixed | Fresh 393×727 context; action bottoms 440 px and 500 px; center hit targets match |
| R1-04 plain-language copy | Fixed | Job headline, audience, next result, three facts, and `.factory/copy-audit.md` |
| R1-05 routing and 404 | Fixed | Real routes, route titles/focus/announcement, history checks, live styled HTTP 404 |
| R1-06 metadata and structure | Fixed | Social metadata, canonical links, touch icon, sitemap, shared header/footer |
| R1-07 browser policies | Fixed | Live CSP, Permissions-Policy, X-Frame-Options, nosniff, and Referrer-Policy |
| R1-08 manifest MIME | Fixed | Live `content-type: application/manifest+json` |

Earlier V-01 timestamp validation, V-02 nested import validation, V-03 touch targets, V-04 landmarks, V-05 immutable assets, V2-01 legal styling, and V2-02 skip-link focus all remain fixed. Automated checks also re-prove offline reload and service-worker update activation.

## Clean-checkout verification

A clean clone at the implementation SHA used the documented setup:

```sh
npm ci
# every `test` command in .factory/claims.json, run separately
npm test
npm run build
```

Results:

- `npm ci`: 59 packages, 0 vulnerabilities.
- Claims: 11 of 11 commands passed individually.
- `npm test`: 9 unit/config checks and 54 desktop/phone browser checks passed.
- `npm run build`: passed and produced `dist/index.html`.
- Generated app JavaScript: 39.36 kB, 12.90 kB gzip.
- Generated CSS: 23.87 kB, 5.91 kB gzip.
- Mobile hero WebP: 35.87 kB.
- Exact-build service-worker update test: update notice appeared, the waiting worker activated, and its new cache appeared.
- The clean checkout remained unchanged after testing.

Local production preview:

- `/opt/fleet/lib/verify-url.sh`: root, demo, Privacy, Terms, and 404 document passed with no console errors.
- Axe CLI 4.13.0: zero violations on root, demo, Privacy, and Terms.
- Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100.
- Local FCP 0.9 s, LCP 1.7 s, total blocking time 0 ms, CLS 0.

## Live verification

- Root, demo, Privacy, and Terms return HTTP 200 and pass the URL verifier with no console errors.
- An unknown path returns HTTP 404 with `Page not found — Chain Cards`, one h1, shared navigation, and a return-home action.
- All 21 public files match the production build byte for byte. Hosting configuration is consumed by Azure and is not public.
- Root, app deep links, demo routes, legal pages, skip links, and the external source link all resolve successfully.
- Fresh desktop demo flow: three steps and three labels loaded; a fourth label appeared; reset restored three labels and one completed step.
- Leaving demo removed every `demo:` key. The real IndexedDB card array was unchanged.
- Fresh phone 393×727: job, audience, both actions, and three facts appear before scrolling. No action is covered.
- Fresh offline context: `/demo` reloaded with the sample, demo label, and offline status.
- Browser request log stayed same-origin. Cookies: 0. Console errors: 0.
- Axe CLI 4.13.0: zero violations on root, demo, Privacy, Terms, and the HTTP 404 page.
- Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100.
- Live FCP 1.0 s, LCP 1.1 s, total blocking time 0 ms, CLS 0.
- Fingerprinted JS and CSS use one-year immutable caching. `sw.js` uses `no-cache, no-store, must-revalidate`.

Evidence is under `/work/.evidence/`, including browser screenshots, URL-verifier reports, Axe JSON, Lighthouse JSON, response headers, and the copied catalog description.

## Run, test, and deploy

```sh
npm ci
npm test
npm run test:claim
npm run build
/opt/fleet/lib/deploy-static.sh audio-chain-cards dist
```

## Known gaps and boundaries

No acceptance gaps remain.

- Chain Cards records procedures and displays commands. It does not process audio or provide a restoration model.
- Browsers do not retain permission to a selected local audio file after reload. The card and labels still persist.
- Verification used desktop Chromium and the Playwright Pixel 5 profile, not physical devices.
- The product is free under MIT. Billing registration and `billing-offer.json` do not apply.
- This is a static PWA. Backend tenant, SQLite service, health, restart, rate-limit, CLI, and package-consumer checks do not apply.
