# KinoLuma design system

KinoLuma uses dark cinematic minimalism with restrained premium and glass accents. Posters and content lead; decoration supports hierarchy rather than competing with it.

## UI 2.0 tokens and primitives

UI 2.0 adds a central layer that new and reworked screens must use instead of local values:

- `src/app/styles/tokens.css` — `--kl-*` custom properties: graphite surfaces (`--kl-bg` … `--kl-surface-3`), text steps, lines, the white primary and the amber "luma" accent (rating, selection, focus), radii, spacing, control sizes, shadows and motion. Motion tokens drop to 0 under reduced motion.
- `src/app/styles/ui.css` — `kl-*` primitives: `kl-btn` (primary, ghost, danger, icon, sm/lg, `aria-pressed`), `kl-chip`, `kl-tag`, `kl-header`, `kl-section`, `kl-card` (poster-first media card), `kl-grid`, `kl-rail`, `kl-empty`, `kl-skeleton`, `kl-message`, `kl-field`, `kl-select`, `kl-dialog` (bottom sheet under 640px), `kl-info` (movie details) and `kl-toast`.
- `src/app/components/ui/` — `SiteHeader`, `MediaCard`, `Dialog` (focus trap, Escape, scroll lock, focus restore, one overlay layer), `MovieInfoDialog` (single poster, trailer loaded on demand in a 16:9 frame), `EmptyState` and `getPosterFallback`.
- `globals.css` sets the system font stack, graphite page background, one `:focus-visible` ring and a global reduced-motion rule.

Legacy page styles (home, movie, catalog, collections) still live in their components; they were normalized to the tokenized background and to weights/tracking that suit the system font. Move them onto `kl-*` primitives when those areas are next reworked.

The sections below describe the wider visual language and the legacy code.

## Principles

- Use near-black surfaces and high-contrast white or gray type.
- Put artwork, title, primary action, and viewing context ahead of metadata.
- Use glass, blur, glow, and gradients sparingly to separate layers.
- Keep primary actions obvious and secondary actions quiet.
- Favor horizontal movie rails for discovery and focused grids for browsing.
- Compose mobile layouts deliberately instead of shrinking desktop screens.
- Preserve consistency before adding a new visual treatment.

## Color

The current code repeatedly uses black and near-black values such as #000, #050505, #080808, #0a0a0a, and #111111. Text and controls use white plus neutral gray steps, often through Tailwind opacity utilities. Borders and glass surfaces commonly use low-opacity white. Radial and linear gradients, deep black overlays, and shadows provide cinematic depth.

Use these as observed families, not as permission to add more near-duplicate values. Prefer an existing local value when working in a component. A future token pass should consolidate background, surface, text, border, focus, overlay, and feedback colors.

- Primary CTA: white surface with black text where appropriate.
- Secondary CTA: dark or translucent surface with a subtle light border.
- Destructive and error states: visually distinct, legible, and used only for destructive/error meaning.

## Typography

The global font is the `--kl-font` system stack (Inter if installed, then Segoe UI, system-ui, SF, Roboto, Arial); Tailwind's `font-sans` points at the same variable, and no network font is loaded. Titles use 750–800 weights with at most −0.035em tracking; the old 1000 weights and −0.08em tracking were tuned for synthetic Arial bold and crush letters in real heavy faces.

Keep body copy readable and calm. Use compact uppercase labels for navigation or metadata and neutral gray for supporting text. Avoid adding a new font treatment in a single component.

## Spacing and layout

Use the existing Tailwind spacing scale and established component spacing. Maintain a clear rhythm between page sections, headings, rails, cards, and controls. Dense metadata belongs inside a deliberate detail view, not every card.

Current layouts commonly use:

- Full-width cinematic hero areas.
- Centered content containers with responsive side padding.
- Horizontal rails with predictable card gaps.
- Responsive grids for catalog and profile content.
- Pills for filters and compact state controls.
- Fixed or dedicated mobile navigation where already established.

Avoid one-off spacing values unless required by artwork or an existing layout contract.

## Radii, borders, and depth

Rounded cards and controls are a core visual trait. Existing code uses small rounded controls through large rounded-2xl and rounded-3xl surfaces, plus rounded-full pills. Match the surrounding component rather than selecting a radius in isolation.

Use translucent white borders to define dark surfaces. Deep shadows can lift modals, hero layers, and major cards. Backdrop blur belongs on overlays and selected glass surfaces; stacking blur, glow, gradient, and shadow on every layer creates visual noise and hurts performance.

## Cards and posters

Movie cards are poster-first:

- Preserve poster aspect ratio and image quality.
- Keep titles, year, rating, type, and actions scannable.
- Use image fallbacks and stable dimensions to prevent layout shift.
- Keep the entire card or its clear primary affordance usable by keyboard and touch.
- On mobile, reduce secondary metadata and actions before reducing readability.
- Do not overload a card with every available state.

Horizontal rails should have clear scroll behavior, consistent card widths, and discoverable navigation without trapping keyboard or touch users.

## Buttons, pills, and states

Buttons need clear primary, secondary, icon-only, and destructive roles. Keep touch targets comfortable, labels concise, and icon-only controls accessible through aria-label. Pills suit filters, categories, and compact state selection.

Every interactive control should define default, hover, active or pressed, focus-visible, disabled, and loading behavior where applicable. Do not rely on hover alone; mobile and keyboard users need equivalent feedback.

Selected states should remain visible without motion. Disabled controls must look disabled and prevent interaction. Error styling must include useful text instead of color alone.

## Motion

Use short, smooth transitions for hover, card emphasis, modal entry, rail controls, and state changes. Motion should explain hierarchy or response, not delay access. Avoid multiple simultaneous transforms on content-heavy screens.

The home experience already checks prefers-reduced-motion. Preserve and extend that behavior: remove autoplay-like movement, large transforms, and nonessential animation when reduced motion is requested. The interface must remain understandable when all animation is absent.

## Mobile behavior

Design from the narrow layout first:

- Keep the main action and essential title/poster context above secondary information.
- Prevent horizontal page overflow while allowing intentional rail scrolling.
- Use dedicated mobile navigation and modal composition where the current interface does.
- Keep tap targets separated and reachable.
- Collapse or omit secondary descriptions and actions before shrinking text excessively.
- Test long Russian titles, multiple badges, authentication messages, keyboard opening, and safe bottom spacing.
- Ensure movie cards remain readable and do not become a dense control panel.

Mobile is a separate composition of the same product hierarchy, not a scaled desktop screenshot.

## Accessibility

- Use semantic landmarks, headings, links, and buttons.
- Give icon-only controls accessible names and decorative icons aria-hidden.
- Keep visible focus indicators with sufficient contrast.
- Support keyboard navigation and predictable modal focus behavior.
- Provide useful image alt text and resilient image fallbacks.
- Do not convey rating, selection, success, or error through color alone.
- Maintain readable contrast over poster and backdrop artwork.
- Respect reduced motion and avoid unexpected focus or scroll changes.

The code already contains many ARIA labels and reduced-motion checks, but accessibility is not proven by their presence. Verify affected flows with keyboard and responsive inspection.

## Loading, skeleton, error, and empty states

Loading states should reserve approximate final space to reduce layout shift. Prefer skeletons for poster grids and stable content blocks; use a compact progress state for short actions. Avoid indefinite spinners without context.

Error states should explain what failed, preserve safe user input where possible, and offer a retry or recovery path. External image, metadata, search, trailer, and player failures need graceful fallback behavior.

Empty states should distinguish between no catalog results, no search matches, no saved items, and unavailable provider content. Give a useful next action without presenting the condition as an application failure.

## Known design-system gaps

- Tokens and primitives exist (UI 2.0), but home, movie, catalog and collections still carry most of their CSS inside large page components; only the header, typography, page background and focus treatment are shared there.
- Home keeps its own desktop header (search and account controls live in HomeClient); other pages use `SiteHeader`.
- Movie cards outside the profile still use page-specific markup and can become overloaded on mobile.
- Too many blur, glow, gradient, and shadow layers in legacy pages can create visual noise and rendering cost.
- Visual regression tests are absent; UI 2.0 relies on behavior tests (`scripts/profile-ui2.test.mjs`) plus manual screenshot QA.

Move legacy page styles onto `kl-*` primitives area by area, without redesigning and refactoring logic in the same change.
