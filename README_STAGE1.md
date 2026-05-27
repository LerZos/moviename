# KinoLuma Stage 1 Import Base

This package adds the first safe backend layer for automatic movie import:

- Supabase tables for candidates, drafts, import runs, feedback, and rules.
- Server-only Supabase admin client.
- TMDB discovery route for Vercel Cron.
- Candidate -> draft processing route.
- Basic duplicate checks.
- Trailer selection from TMDB videos only, with confidence scoring.
- Basic moderation scoring.

It does not migrate `src/app/data/movies.ts` and does not publish drafts automatically.

## Install

```powershell
git add .
git commit -m "backup before auto movie import system"
npm i @supabase/supabase-js
```

Run `supabase/sql/001_movie_import_system.sql` in Supabase SQL Editor.

Copy `.env.local.example` values into `.env.local` and Vercel Environment Variables.

## Local checks

```powershell
npm run lint
npm run build
npm run dev
```

Trigger discovery locally, if CRON_SECRET is set:

```powershell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Uri "http://localhost:3000/api/cron/discover-movies" -Headers $headers
```

Process one candidate into a draft:

```powershell
$headers = @{ "x-kinoluma-admin-secret" = $env:KINOLUMA_ADMIN_SECRET }
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/admin/import/process-next" -Headers $headers -Body "{}" -ContentType "application/json"
```
