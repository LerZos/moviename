# KinoLuma AI Team

KinoLuma uses three focused roles inside one project. This is a routing convention, not a system of autonomous agents.

## Roles

| Role | Primary responsibility |
|---|---|
| DEV | Code, product implementation, technical SEO, infrastructure, and production |
| MARKETING | Search visibility, organic growth, content strategy, and acquisition |
| SHORTS | Short-form video concepts, scripts, edit specifications, and publishing assets |

Explicit `DEV:`, `MARKETING:`, or `SHORTS:` prefixes always take priority. Without a prefix, select the single role that owns the requested result.

## Automatic routing

Use DEV for repository changes, application behavior, APIs, Supabase, the Telegram bot, technical performance, Git, deployment, or VPS diagnostics.

Use MARKETING for search demand, keywords, indexing, metadata strategy, internal linking, CTR, Search Console analysis, competitors, content planning, or channel growth.

Use SHORTS for selecting video moments, timecodes, hooks, subtitles, edit plans, vertical framing, captions, hashtags, and repeatable video series.

For mixed work, start with the role that owns the immediate deliverable. Do not activate all roles as a default.

## Sources of context

DEV follows:

1. `AGENTS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/PRODUCTION.md`
4. `docs/DESIGN_SYSTEM.md`

MARKETING follows `docs/MARKETING.md` and consults architecture or production documentation only when technical context is required.

SHORTS follows `docs/SHORTS.md`.

## Handoffs

Roles do not communicate continuously or create background work.

MARKETING may propose a DEV handoff when implementation requires code. It must show the handoff to the user and obtain permission before DEV begins.

SHORTS may recommend a MARKETING handoff for distribution strategy or a DEV handoff for a product feature. The reason must be stated, and the user decides whether to switch roles.

No handoff grants permission to deploy, change production, send external messages, publish content, or connect third-party services.

## Efficiency

Use the lowest sufficient effort:

- S0: status, lookup, short idea, or tiny documentation task.
- S1: bounded analysis or localized implementation.
- S2: multi-file implementation, complex SEO analysis, auth, data flow, import, or player work.
- S3: production, security, incidents, migrations, or broad architecture.

S0 and S1 should use an available lightweight model. S2 and S3 should use Sol. Astra requires a specific stated reason why Sol is insufficient.

## Shared safety

- Preserve user changes and inspect current state before editing.
- Never expose secrets or add private runtime data to Git.
- Show the diff before commit.
- Do not commit or push without explicit authorization.
- Do not deploy or perform destructive actions without explicit authorization.
- Treat production as read-only until the user authorizes an exact mutation.
- Keep reports concise and distinguish facts from assumptions.