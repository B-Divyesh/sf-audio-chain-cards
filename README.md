# Chain Cards

Build, review, and share ordered audio repair steps.

Chain Cards is for beginning audio creators who do not want a full DAW template. Each card keeps actions, settings, listening checks, and timestamp labels together. It shows FFmpeg commands for inspection. It does not run them or process audio.

Live product: <https://audio-chain-cards.sociobot.in>

One-click demo: <https://audio-chain-cards.sociobot.in/demo>

## What it does

- Creates, reorders, completes, duplicates, and deletes audio repair cards.
- Opens selected audio in the current tab without uploading or storing it.
- Opens selected audio at each saved timestamp label.
- Requires different input and output paths before showing FFmpeg command text.
- Imports and exports a validated version 1 Chain Cards JSON file.
- Keeps real cards after refresh and tab close.
- Keeps the demo and opened cards available offline after the first visit.
- Keeps demo changes separate from saved cards.
- Records instructions without processing audio or promising an improvement.

Chain Cards is free to use under the MIT License.

## Run locally

Node.js 20 or newer is required.

```sh
npm ci
npm run dev
```

Vite prints the local URL. The app needs no environment variables, cloud service, API key, or runtime CDN.

## Test and build

```sh
npm test
npm run build
npm run test:claim
```

`npm test` runs unit checks and desktop and phone browser checks against a production build. `npm run test:claim` runs every public product claim in Chromium. Each claim also has its own command in [.factory/claims.json](.factory/claims.json).

`npm run build` writes the static product to `dist/`. Playwright 1.58.2 is pinned in `package.json`.

If Chromium is missing, run this command once:

```sh
npx playwright install chromium
```

## Demo data

The demo opens a three-step spoken-voice repair card. It has one completed step and three review labels.

Demo changes use `demo:` session-storage keys. They never enter the real IndexedDB card store. Resetting or leaving the demo removes them.

See [.factory/demo.md](.factory/demo.md) for the sample and storage details.

## Data and safety

Real cards, labels, completion state, and history live in this browser’s IndexedDB. Selected audio uses a temporary browser address and is not saved. JSON export is the backup and transfer method.

The app has no accounts, analytics, ads, trackers, cookies, or third-party runtime scripts.

Keep the original recording. Inspect each command and use a different output path. Listen after every step.

See the [privacy policy](privacy/index.html) and [terms](terms/index.html).

## Product and design records

- [Researched brief](.factory/brief.json)
- [Visual system and asset provenance](.factory/design.md)
- [Claims manifest](.factory/claims.json)

The existing original hero artwork is also used for the social preview. Its source and prompt stay under `assets/src/`.

## Deploy

Deploy the contents of `dist/` as a static site. The factory manages DNS and infrastructure.

`staticwebapp.config.json` provides real app routes, security headers, caching, manifest MIME handling, and the HTTP 404 response.

## License

MIT. See [LICENSE](LICENSE).
