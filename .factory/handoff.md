# Chain Cards v1 handoff

Work order: `audio-chain-cards-build-1`

Product: `audio-chain-cards`

Artifact: static offline-first PWA

Build command: `npm run build`

Deploy directory: `dist/` (`dist/index.html` is present)

## What shipped

- A complete local card box backed by IndexedDB, with seeded roomy-voice starter, empty/error states, edit, reorder, duplicate, confirmed delete, completion state, and a compact visible history in the exported data.
- A workbench for ordered audio actions with settings notes and a mandatory listening checkpoint per step.
- Local-only audio auditioning through an object URL. Selected audio is not uploaded or persisted.
- Timestamp labels with verdicts, click-to-seek playback, persistence, and confirmed removal.
- Source-safe FFmpeg command generation. Input and output paths are explicit and must differ; the tool shows/copies commands but never executes them.
- Open, versioned `.chain-card.json` export/share and validated JSON import with collision-safe IDs.
- Installable PWA manifest, 192/512/maskable icons, versioned app-shell cache, cache-first assets, network-first navigation, offline fallback, online/offline status, client claim, and an update-ready flow using `SKIP_WAITING`.
- Dedicated `/privacy/` and `/terms/` pages, MIT license, and a full README.
- A night-market signal-desk visual system. Original hero artwork was generated with the Azure Foundry `factory-image` deployment using `/opt/fleet/lib/gen-image.sh`; source, exact prompt sidecars, and optimized WebP/JPEG derivatives are retained in the repository. Visual review found no people, brands, logos, meaningful stray text, or capability-misleading interface imagery.

## Verification completed

Final checks were run locally on 2026-08-28:

- `npm test`: passed — 4 Vitest unit tests and 10 Playwright tests across desktop Chromium and a Pixel 5/mobile profile.
- Browser coverage includes the starter flow, command source-path guard, persistent completion and labels, new/edit workflow, axe scan on home and workbench, 390 px horizontal-overflow check, and explicit offline reload after service-worker control.
- `npm run build`: passed with Vite 7.3.6; reproducible output is in `dist/`.
- `/opt/fleet/lib/verify-url.sh`: passed against the production preview. Result: HTTP 200, title present, `lang="en"`, exactly one h1, main landmark present, no image missing alt text, no unlabeled button, and no console/page errors.
- Lighthouse 12.8.2 mobile run against the production preview: Performance 100, Accessibility 100, Best Practices 100, SEO 100. FCP 1.0 s, LCP 1.6 s, total blocking time 60 ms, CLS 0. (Lab Lighthouse does not produce field INP.)
- Production payloads, uncompressed: JavaScript 31.1 KB (budget 200 KB), CSS 22.4 KB (budget 50 KB), mobile hero WebP 35.9 KB and desktop hero WebP 89.5 KB (budget 300 KB). No webfont payload and no third-party runtime request.
- `npm audit`: 0 vulnerabilities after updating Vite and Vitest to patched releases.

## Important behavior and constraints

- Chain Cards is a procedure and review tool, not an audio renderer. It deliberately does not include a de-reverb model, execute shell commands, invoke Audacity through a non-standard protocol, or promise that a setting repairs a recording. The first starter step is tool-neutral and asks the creator to use a de-reverb/de-echo effect they already trust, starting lightly and bypassing often.
- FFmpeg filter strings authored or imported in cards are visible and are only quoted into a displayed command. Users must inspect them before running anything externally.
- Cards are local to one browser profile. JSON export is the backup and cross-device transfer path; attached audio is intentionally not part of an export.
- There is no paid tier because the researched brief explicitly specifies free monetization.

## Suggested next steps

- Run the five-minute success test with beginning creators and adjust starter wording where they hesitate.
- Add curated cards only after testing each procedure across representative recordings and documenting tool/version assumptions.
- Bump the cache version in `public/sw.js` for releases that must invalidate existing app-shell files.
- After deployment, repeat Lighthouse and the URL verifier against `https://audio-chain-cards.sociobot.in` to capture network-hosted results.
