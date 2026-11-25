# KinoLuma design system

KinoLuma uses dark cinematic minimalism with restrained premium and glass accents. Posters and content lead; decoration supports hierarchy rather than competing with it.

## UI 2.0 tokens and primitives

Production is the visual source of truth. UI 2.0 adds functionality (profile lists, details dialog, toasts) without a second visual language: its shared layer only names values that already exist in production styles.

- `src/app/styles/tokens.css` — `--kl-*` custom properties copied from production selectors: the home page (`main.kinoluma-home`, `.desktop-mock-home` and its line texture, `.desktop-mock-panel`, the 1194px `.desktop-mock-shell`) and the profile and details modal (`.profile-page`, `.section-card`, `.details-modal`): page backgrounds, graphite panel gradients, line opacities, text greys, radii (28 home panel, 30 modal, 16 button, 14 small button, pills) and Arial. Motion tokens drop to 0 under reduced motion.
- `src/app/styles/ui.css` — `kl-*` primitives, each mirroring one production component: `kl-btn` (`.primary-button`, `.secondary-button`, `.ghost-button`, `.modal-action`), `kl-eyebrow` and `kl-panel` (`.desktop-mock-eyebrow`, `.desktop-mock-panel`), `kl-card` (`.desktop-mock-rail-card`: 156px poster, 18px radius, title and "year · ★ rating" over the artwork, a small type pill; 22px radius on phones like `.mobile-v2-card`), `kl-empty` (compact row), `kl-field` (`.profile-auth-field`), `kl-dialog` and `kl-info` (`.details-overlay`, `.details-modal`, bottom sheet under 760px).
- `src/app/components/ui/` — `MediaCard`, `Dialog` (focus trap, Escape, scroll lock, focus restore, one overlay layer), `MovieInfoDialog` (trailer loaded on demand in a 16:9 frame), `EmptyState` and `getPosterFallback`.
- `globals.css` keeps the production Arial body font and adds one white `:focus-visible` ring and a global reduced-motion rule.

Home, catalog, collections and the movie page keep their production markup, headers and styles. UI 2.0 only adds functional fixes there (catalog genre de-duplication, the mobile bottom navigation on catalog and collections, the home mobile header row). When a component is extracted later, copy its production values instead of inventing new ones.

The profile (`profile/page.tsx`, `profile.css`) is one centred column built with the home page rules: compact identity panel with personal details only (avatar, "ПРОФИЛЬ", name, "Персональная кинотека · N в ваших списках") and one soft graphite curve on the right (hidden on phones), a single row of home filter pills with icons and small counters, then one panel per collection: heading with a counter and "Все ›" above a poster rail (overview; scroll arrows appear only when posters are hidden) or a grid with a secondary "Убрать" (full lists). Empty collections use one compact `EmptyState` row. It has no analytics widgets, levels or progress bars.

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

The global font is Arial, Helvetica, sans-serif (`--kl-font`); Tailwind's `font-sans` points at the same variable and no network font is loaded. Display titles use the 1000 weight with tight negative tracking (−0.04em to −0.08em); eyebrows are 12px, 1000 weight, 0.36em tracking, uppercase, `#858585`.

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

- Tokens and primitives (UI 2.0) are used by the profile and its dialog; home, movie, catalog and collections still carry their CSS inside large page components.
- Each page keeps its own production header variant (home search header, catalog pills, movie and profile topbars); there is no single shared header component yet.
- Movie cards outside the profile still use page-specific markup and can become overloaded on mobile.
- Too many blur, glow, gradient, and shadow layers in legacy pages can create visual noise and rendering cost.
- Visual regression tests are absent; UI 2.0 relies on behavior tests (`scripts/profile-ui2.test.mjs`) plus manual screenshot QA.

Move legacy page styles onto `kl-*` primitives area by area, without redesigning and refactoring logic in the same change.
