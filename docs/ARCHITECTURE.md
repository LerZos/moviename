# KinoLuma architecture

This document describes the architecture visible in the current main branch. Production infrastructure details are kept in PRODUCTION.md.

## System shape

KinoLuma is a frontend/backend monolith built with Next.js App Router. Public pages, authenticated client experiences, server rendering, metadata, API endpoints, catalog orchestration, and administrative import tools live in one repository and one Next.js runtime.

~~~text
Browser
  |
  +-- Public and authenticated UI
  |     home, catalog, collections, movie, expected, profile, admin
  |
  +-- Next.js App Router
        |
        +-- Server and Client Components
        +-- Route Handlers under src/app/api
        +-- Catalog and generated TypeScript data
        +-- Supabase Auth and PostgreSQL
        +-- External metadata, image, trailer, and player providers

Separate production component:
Telegram bot -> its own systemd service and runtime state outside this repository
~~~

## Stack

- Next.js 16.2.6 with the App Router and standalone output.
- React and React DOM 19.2.4.
- TypeScript 5 in strict mode.
- Tailwind CSS 4 through PostCSS, plus substantial component-local CSS.
- Supabase JavaScript client with Supabase Auth and PostgreSQL.
- Next.js Route Handlers for public, admin, import, cron, image, search, and player APIs.
- Lucide React for icons.

The same Next.js application owns the frontend and backend HTTP layer. There is no separate web API service in this repository.

## Repository layout

- **src/app/layout.tsx:** root metadata, JSON-LD, dark viewport configuration, and shared footer.
- **src/app/page.tsx and HomeClient.tsx:** server-prepared home data and the main interactive home experience.
- **src/app/movie/[slug]:** movie detail, SEO, trailer, and player UI.
- **src/app/catalog/[category] and [genre]:** category and genre browsing.
- **src/app/collections and collections/[slug]:** collection index and detail pages.
- **src/app/expected:** expected releases.
- **src/app/profile:** Supabase-backed sign-in, profile, reactions, and saved lists.
- **src/app/admin:** protected import dashboard and movie override editor.
- **src/app/api:** Route Handlers.
- **src/app/lib:** Supabase clients, SEO, imports, players, trailers, image links, and movie overrides.
- **src/app/data:** catalog composition, curated lists, indexes, and generated data.
- **scripts:** offline generation and audit utilities.
- **supabase/sql:** tracked database schema.
- **public:** static images and public assets.

## User-facing pages

The home page combines featured content, search, horizontal movie rails, filters, details and trailer modals, authentication entry points, and responsive navigation. Movie pages resolve a catalog entry by slug and combine metadata, SEO, trailer information, user actions, and available players. Catalog and collection routes provide browse-oriented views. The profile page handles Supabase email/password authentication and personal watch, reaction, and recommendation states.

Loading routes exist for the home, movie, and profile experiences. The application also publishes robots.ts and sitemap.ts.

## API and server responsibilities

Public Route Handlers include:

- Search and daily featured content.
- TMDB trailer, poster, and backdrop resolution.
- Kinopoisk poster resolution.
- Player lookup and normalization.
- Cron-triggered discovery and daily import.

Admin Route Handlers cover candidate discovery, draft creation and editing, duplicate cleanup, moderation, SEO generation, publishing, player synchronization, feedback, and per-movie overrides.

Route Handlers are part of the Next.js process. External responses must be treated as untrusted, and public endpoints should keep validation, timeout, caching, and failure behavior explicit.

## Catalog and data layer

The catalog is assembled primarily from TypeScript modules in src/app/data, then enriched by helpers and Supabase-backed overrides. It mixes manually curated lists with generated files and lookup indexes. Several generated modules are roughly 1-1.7 MB each, including movie collections, card indexes, profile data, and Kinopoisk-requested data.

This approach makes the catalog reviewable in Git and available at build/runtime without a separate content service. It also creates large modules, duplicated representations, expensive builds and client payload risk, and a need for disciplined generators. Generated files should normally be changed through their scripts rather than manual edits.

Supabase provides persistent relational state. The tracked SQL defines import candidates, movie drafts, import runs, agent feedback, and agent rules. RLS is enabled, with no public policies in the tracked schema; privileged access is intended to pass through server Route Handlers using the service role.

## Authentication and authorization

Public user authentication uses Supabase Auth and client sessions. The admin UI gets a Supabase access token and sends it to admin APIs. The current preferred server check validates the Supabase user and an ADMIN_EMAILS allowlist.

A legacy shared-secret authorization path remains in a number of import routes, and cron routes use a separate cron secret. Secret names may be documented; their values must never enter source, output, logs, or documentation. Migration of remaining admin routes to the user-based guard is incomplete and is an architectural security risk.

## Import and CMS pipeline

The administrative pipeline is implemented inside the monolith:

~~~text
External discovery/metadata
  -> import_candidates
  -> movie_drafts
  -> enrichment, duplicate checks, SEO, player data, moderation
  -> ready/published state and catalog integration
  -> public pages and APIs
~~~

The code includes discovery, draft generation, trailer and image lookup, quality/moderation helpers, feedback, curated publishing, and bulk player synchronization. TMDB and Kinopoisk identifiers are used throughout the metadata layer. The dashboard in src/app/admin/import orchestrates these server routes rather than acting as a separate CMS.

## Player orchestration

Movie playback is assembled from normalized player records and generated fallbacks. Current code recognizes Exiim/Vibix-compatible iframe data, Rendex identifiers, and Collapse fallbacks. The movie page merges resolved provider data with configured movie players and limits the presented choices. Trailers are normalized separately, primarily as YouTube embeds with lookup support through the TMDB trailer route.

Provider availability, identifiers, embed contracts, and upstream response shapes are external dependencies. Player work must preserve safe URL handling, graceful fallback behavior, and clear separation between public configuration and server-only credentials.

## Supabase boundaries

Browser code uses the public Supabase client for sessions and user-facing state. Server code uses the admin client for privileged queries and writes. Build paths can skip privileged reads when real credentials are unavailable. Do not move service-role operations into Client Components or weaken the RLS/server boundary to solve local setup issues.

## Production component outside this repository

The Telegram bot is deployed separately from the Next.js web repository. Its executable, systemd unit, long-polling lifecycle, and state directory are documented in PRODUCTION.md. Changes here should not assume the bot is versioned, built, or deployed with the web application.

## Current architectural risks

- Large generated TypeScript catalog modules increase build time, memory use, bundle risk, and merge conflicts.
- HomeClient.tsx and other page components combine substantial UI, state, and component-local CSS, making focused changes harder.
- Catalog truth is split across generated files, manual additions, indexes, and Supabase overrides.
- Some admin import routes still use the legacy shared-secret guard.
- Third-party metadata, images, trailers, and video providers create availability and contract risk.
- Import, CMS, public API, and UI workloads share one Next.js process.
- Automated coverage for architecture-critical flows and visual regressions is limited.
- The Telegram bot and its state live outside the web repository, so web Git history is not a complete production inventory.
