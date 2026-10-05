# KinoLuma design system

KinoLuma uses dark cinematic minimalism with restrained premium and glass accents. Posters and content lead; decoration supports hierarchy rather than competing with it. This describes the current code, not a complete centralized token specification.

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

The global stylesheet currently falls back to Arial, Helvetica, and sans-serif, while the Tailwind theme references Geist CSS variables that are not initialized in the root layout. Individual interfaces use varied weights, sizes, uppercase labels, and wide tracking.

Keep body copy readable and calm. Use bold or black display type for titles, compact uppercase labels for navigation or metadata, and neutral gray for supporting text. Avoid adding a new font treatment in a single component. Resolve the mismatch between global fallback and theme variables as a dedicated task with visual review.

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

- There is no complete centralized token system.
- Significant CSS lives inside large page components.
- Typography has been historically inconsistent, and global font configuration is not fully aligned.
- Movie cards can become overloaded on mobile.
- Too many blur, glow, gradient, and shadow layers can create visual noise and rendering cost.
- Repeated near-black and translucent values are not consolidated.
- Visual regression tests are absent.
- Some loading and state patterns are page-specific rather than shared.

A future design-system pass should inventory repeated values and components, introduce a small semantic token layer, extract stable primitives, and add representative visual regression coverage without redesigning the product at the same time.
