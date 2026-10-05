# KinoLuma development rules

These instructions apply to the entire repository. Detailed context lives in docs/ARCHITECTURE.md, docs/PRODUCTION.md, and docs/DESIGN_SYSTEM.md.

## Working rules

- Inspect relevant code and Git state before editing. Preserve user changes.
- Make the smallest change that fully solves the task. Avoid unrelated cleanup, broad rewrites, and new dependencies without a clear need.
- Keep source, configuration, documentation, and generated data in their existing roles. Do not hand-edit generated files unless the task explicitly requires it.
- Never add .env files, credentials, tokens, private keys, logs, build output, archives, or runtime state to Git.
- Keep TypeScript strict and follow existing App Router conventions.

## Stack

KinoLuma is a Next.js 16 and React 19 TypeScript application using the App Router, Tailwind CSS 4, Route Handlers, and Supabase/PostgreSQL. It is a frontend/backend monolith; the Telegram bot is a separate production component outside this repository.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in node_modules/next/dist/docs/ before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UI and UX

- Preserve KinoLuma's dark cinematic minimalism, poster-first hierarchy, restrained glass accents, and clear primary actions.
- Work mobile-first. Verify narrow, medium, and desktop layouts; avoid horizontal overflow, clipped controls, tiny targets, and overloaded movie cards.
- Reuse established card, rail, pill, button, modal, loading, empty, and error patterns before introducing variants.
- Keep interactions subtle and honor reduced-motion preferences. Maintain semantic HTML, keyboard access, visible focus, labels, contrast, and useful alt text.
- Consult docs/DESIGN_SYSTEM.md for the current visual language and known inconsistencies.

## Performance and security

- Prefer Server Components and server-side data access unless client state or browser APIs require a Client Component.
- Limit client payloads, repeated network requests, unbounded lists, expensive effects, and unnecessary image eager-loading. Treat the large TypeScript catalog files as a known cost.
- Validate and normalize external input. Keep privileged Supabase work server-only and preserve RLS assumptions.
- Protect admin and cron Route Handlers with established authorization helpers. Never expose service-role keys or secret values to client code, logs, docs, or responses.
- Treat third-party API and player data as untrusted and handle timeouts, failures, and missing data.

## Verification

Match checks to risk:

- Documentation or copy: inspect the diff and Markdown structure.
- Small UI change: lint/type-check the affected area and inspect responsive and accessibility behavior.
- Data/API/auth change: add targeted validation and exercise success, failure, and authorization paths.
- Cross-cutting or release-sensitive change: run relevant lint, type, build, and focused runtime checks.

Do not run a full build for documentation-only work. Report checks that actually ran; never claim unperformed validation.

## Model efficiency (S0-S3)

Choose the lowest sufficient effort level and raise it when evidence demands it:

- **S0:** factual lookup, status check, or tiny documentation correction.
- **S1:** localized code or UI change with clear boundaries.
- **S2:** multi-file feature, data-flow change, migration, auth, import, or player work.
- **S3:** production incident, deployment, destructive operation, security-sensitive change, or broad architectural migration.

At S2-S3, inspect dependent paths and failure modes before editing. At S3, stop before any production mutation unless the user has explicitly authorized the exact action.

## Production awareness

Production runs separately on the VPS described in docs/PRODUCTION.md. Local code changes do not prove production state. Without explicit authorization, do not deploy, restart services, edit VPS files, change Nginx/systemd/firewall/environment settings, run migrations, alter production data, or delete backups. Prefer read-only inspection and reversible Git work.

## Final report

Keep the final report short:

- **Changed:** files and resulting behavior.
- **Checked:** commands or inspections actually completed.
- **Risks:** only material limitations or unverified assumptions.
- **Next:** the next useful action, when one remains.
