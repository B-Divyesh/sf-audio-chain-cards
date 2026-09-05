# Chain Cards visual thesis

## Direction: night-market signal desk

Chain Cards should feel like a small, trusted repair stall open after dark: a row of hand-labelled modules, warm task light, and bright signal cable connecting one action to the next. The night-market neon direction fits the product because an audio chain is sequential, practical, and meant to be passed between people. Decoration always explains either signal flow, audition state, or the local/offline nature of the tool.

This is intentionally a single dark treatment. It preserves the after-hours booth atmosphere and makes the cyan signal line, amber checkpoints, and coral warnings instantly legible. Surfaces are opaque, not generic glass panels, and there is no gradient hero.

## Tokens

- `--ink-950 #090d12`: painted-night background.
- `--ink-900 #101820`: primary work surface.
- `--ink-850 #16222c`: raised module.
- `--paper #f5f3e9`: main type, 17.2:1 on the background.
- `--paper-muted #b8c2c4`: secondary type, 9.5:1 on the background.
- `--cyan #4ee9df`: live signal/accent; dark ink is used on cyan buttons.
- `--amber #ffc857`: audition checkpoint; dark ink is used on amber controls.
- `--coral #ff6b62`: warnings and destructive affordances, paired with words/icons.
- `--green #77e09b`: success and saved/offline-ready state.
- Borders use `#3b525d`; focus uses a 3 px amber/cyan double-ring above 3:1.

All body text and controls meet 4.5:1; meaningful states always include a label or icon, never color alone.

## Type and spacing

- Display: self-hosted **Bricolage Grotesque** variable subset when available, with `Arial Narrow` and system sans fallbacks. Its condensed, practical sign-painter shapes belong on a market placard.
- Utility/body: system UI stack. It is familiar where creators need to scan settings and paths quickly. Numeric timestamps use tabular figures.
- Scale: 14 / 16 / 20 / 28 / clamp(38–64) px. Body never below 16 px.
- Spacing follows a 4/8 px rhythm: 4, 8, 12, 16, 24, 32, 48, 72. Main reading measure is 68 characters.
- Corners are clipped or modest (8–14 px), like powder-coated equipment rather than soft SaaS cards.

## Composition and interaction grammar

- The header is a compact painted sign: logo, local/offline status, and navigation.
- The landing stage pairs one generated neon signal illustration with a direct action. The illustration depicts three connected modules and a listening checkpoint, so it previews the workflow rather than filling space.
- The artwork badge says “3 ordered steps.” It explains the sequence instead of using decorative signal lore.
- A chain is a vertical cable. Numbered step modules sit directly on it; completed steps illuminate the segment below. Amber diamond markers identify checkpoints.
- Primary actions are cyan filled controls; secondary actions are bordered; destructive actions are coral text with explicit confirmation.
- Every action responds immediately through pressed depth, a live region message, or visible state change. Empty states show the exact next action.
- On 390 px screens the illustration is cropped away after the first viewport, actions stack full width, and the chain becomes a single-column workbench. Nothing essential is hidden.

## Motion policy

- 180 ms for press/hover feedback and 240 ms for panels appearing from their source.
- Reordering a step translates only the moved module; save confirmation fades in place. No decorative loops or flashing neon.
- With `prefers-reduced-motion: reduce`, scrolling is instant, transforms are removed, and state changes use immediate color/border changes.

## Original asset plan and provenance

### Hero illustration art direction

Subject: a compact tabletop audio repair chain with three distinct metal modules linked by one luminous cable, a small headphone checkpoint at the end, knobs and waveform-like indicators without readable lettering. World: an intimate night-market electronics stall. Materials: powder-coated navy metal, braided cable, translucent cyan and amber acrylic, worn paper tags without text. Light: practical overhead amber pool plus restrained cyan neon spill. Lens/composition: editorial still life, slightly elevated 35 mm view, clean negative space on the left, crisp module edges. Palette words: midnight ink, signal cyan, checkpoint amber, repair coral, paper cream. Negative list: no people, no hands, no brands, no logos, no readable text, no watermark, no DAW screen, no fantasy machinery, no gradients, no purple-blue cyberpunk haze, no excessive glow.

Asset prompt derives verbatim from this sheet. Generated with the Azure Foundry `factory-image` deployment via `/opt/fleet/lib/gen-image.sh` on 2026-08-28. Generated assets are original to Chain Cards and are disclosed in the footer. Source PNG and prompt sidecar are retained under `assets/src/`; optimized WebP and JPEG fallbacks ship in the PWA.

The 1200×630 social card is a local crop of the same generated source image. No new model output or third-party artwork was added for this repair.

### Hand-authored assets

The chain-link logo, status glyphs, manifest icons, Apple touch icon, and checkpoint diamonds are original SVG/CSS geometry authored for this product. They contain no third-party marks.
