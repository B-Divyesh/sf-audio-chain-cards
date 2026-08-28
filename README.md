# Chain Cards

Chain Cards is a local-first PWA for beginning audio creators who want to repeat and share a known-good repair or finishing sequence without maintaining a full DAW template. A card keeps ordered actions, settings notes, audition checkpoints, and timestamp labels together. It can generate inspectable FFmpeg commands, but it never processes or uploads audio.

Live: <https://audio-chain-cards.sociobot.in>

## What it does

- Builds, reorders, completes, duplicates, and deletes reusable audio-treatment cards.
- Opens a recording in the current browser tab for local-only auditioning.
- Saves timestamped review labels that jump the local player to useful moments.
- Requires distinct input/output paths before producing a copyable FFmpeg command.
- Imports and exports an open, versioned `.chain-card.json` format.
- Persists cards in IndexedDB and works after refresh, install, or an offline reload.
- Includes a cautious three-step roomy-voice starter. It recommends listening checks and makes no guaranteed restoration claims.

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Vite serves the development app and prints the local URL. No environment variables, cloud services, API keys, or runtime CDNs are required.

## Test and build

```sh
npm test
npm run build
npm run preview
```

`npm test` runs unit coverage for card validation, timestamps, and command safety; creates a production build; then runs desktop and 390 px-class Playwright workflows including offline reload and axe checks. The exact deployment command is `npm run build`. Static output lands in `dist/` with `dist/index.html` at its root.

Playwright 1.58.2 is pinned. In an environment without the bundled Chromium binary, run `npx playwright install chromium` once.

## Data and safety

Cards, labels, completion state, and short change history live in this browser’s IndexedDB. Selected audio is represented by a temporary object URL and is never persisted. JSON export is the backup and transfer mechanism.

Chain Cards does not execute commands. Always keep the original recording, inspect a generated command, use a new output path, and audition the result. Imports are checked against the complete v1 card schema before they are stored, but still review another person’s instructions before using them.

See [the product brief](.factory/brief.json), [visual system and asset provenance](.factory/design.md), [privacy policy](privacy/index.html), and [terms](terms/index.html).

## Deployment

Deploy the contents of `dist/` as a static site with SPA fallback to `index.html`. The build fingerprints app code, styles, and hero media, and generates a matching service-worker precache. `staticwebapp.config.json` gives `/assets/*` immutable caching while keeping `sw.js` revalidating so browsers can discover updates. The factory handles DNS and infrastructure.

## License

MIT. See [LICENSE](LICENSE).
