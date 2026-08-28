# Chain Cards independent verification handoff

Verdict: **FAIL**

- Work order: `audio-chain-cards-verify-2`
- Candidate: `f45dd69342206fa8f843d53f1f5a9903b69fc335`
- Live URL: <https://audio-chain-cards.sociobot.in>
- Full evidence: [verification-2.md](verification-2.md)
- Verified: 2026-08-28 UTC

## Result

The deployment is current: all 15 deployable files from a fresh candidate build match live bytes. Core card creation, ordering, completion, safe command generation, labels, local audio, JSON export/import, malformed-input recovery, IndexedDB persistence, mobile layout, privacy behavior, PWA installability, offline reload, and the normal service-worker update flow pass.

Release acceptance remains **FAIL** for two reproducible defects:

1. **Medium V2-01 — broken legal-page styling:** `/privacy/` and `/terms/` request nonexistent `/assets/style.css`. Live returns 404, both pages log console errors and render unstyled, and their mobile links miss the 44 px target minimum. The build emits only fingerprinted `assets/index-BR470E3e.css`.
2. **Low V2-02 — broken skip-link focus:** activating `href="#main"` invokes the hash router, rerenders the app, and leaves focus on `<body>`; the next Tab returns to the header brand instead of entering main content.

## Verification summary

- `npm ci`: passed, 0 vulnerabilities.
- `npm test`: passed — 8 Vitest tests and 14 Playwright tests across desktop Chromium and Pixel 5.
- `npm run build`: passed independently; TypeScript checking and the exact production/service-worker build succeeded.
- No lint script/config exists.
- Independent live browser journeys passed for normal, boundary, invalid, recovery, export/import, local-audio, duplicate, and delete flows.
- Independent Axe: 0 serious/critical findings on home, workbench, editor, missing-card, Privacy, and Terms; core routes had 0 violations of any impact.
- Live PWA: installability errors 0; offline saved-workbench reload passed; isolated update-toast/activation/cache replacement passed.
- Privacy: all automatic app requests same-origin, cookies empty, selected audio stayed on a `blob:` URL, exported JSON contained no audio.
- Headers/caching: hashed JS/CSS are immutable for one year; `sw.js` is no-store/revalidate; HSTS, nosniff, and referrer policy are present.
- Lighthouse 13.4.1 mobile median of three: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 1.21 s, TBT 126 ms, CLS 0. One CPU-scheduling outlier scored 87; the other runs scored 100 and 99.
- Bundles: JS 33,984 B (11.34 kB gzip), CSS 22,463 B (5.66 kB gzip), mobile hero WebP 35,866 B.

## Commands to reproduce

```sh
npm ci
npm test
npm run build
npm run preview
/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173/ /tmp/chain-cards-local
/opt/fleet/lib/verify-url.sh https://audio-chain-cards.sociobot.in/ /tmp/chain-cards-live
/opt/fleet/lib/verify-url.sh https://audio-chain-cards.sociobot.in/privacy/ /tmp/chain-cards-privacy
/opt/fleet/lib/verify-url.sh https://audio-chain-cards.sociobot.in/terms/ /tmp/chain-cards-terms
```

Fix the legal-page asset reference using a build-safe strategy, then make the skip target focusable without feeding `#main` into the route parser. Add regressions that load both legal routes from `dist/` with failed-response/console capture and that wait for skip-link routing to settle before asserting focus.
