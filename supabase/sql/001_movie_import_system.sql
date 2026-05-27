-- KinoLuma stage 1: import candidates + movie drafts
-- Run this in Supabase SQL Editor before deploying the new routes.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.import_candidates (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text not null,
  title text not null,
  original_title text,
  year integer,
  type text check (type in ('film', 'series', 'anime', 'cartoon', 'documentary')),
  status text not null default 'new',
  raw_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_candidates_source_source_id_unique unique (source, source_id)
);

create table if not exists public.movie_drafts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  original_title text,
  slug text not null unique,
  year integer,
  type text check (type in ('film', 'series', 'anime', 'cartoon', 'documentary')),
  genres jsonb not null default '[]'::jsonb,
  poster_url text,
  backdrop_url text,
  tmdb_id bigint,
  kinopoisk_id bigint,
  imdb_id text,
  actors jsonb not null default '[]'::jsonb,
  directors jsonb not null default '[]'::jsonb,
  description text,
  long_description text,
  seo_title text,
  seo_description text,
  faq jsonb not null default '[]'::jsonb,
  trailer_provider text,
  trailer_key text,
  trailer_url text,
  trailer_embed_url text,
  trailer_source text,
  trailer_confidence integer not null default 0 check (trailer_confidence >= 0 and trailer_confidence <= 100),
  trailer_status text not null default 'missing',
  similar_movie_ids jsonb not null default '[]'::jsonb,
  source text,
  raw_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'needs_ai_seo', 'needs_moderation', 'needs_review', 'ready', 'published', 'rejected')),
  quality_score integer check (quality_score is null or (quality_score >= 0 and quality_score <= 100)),
  moderation_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movie_drafts_tmdb_unique unique (tmdb_id),
  constraint movie_drafts_kinopoisk_unique unique (kinopoisk_id),
  constraint movie_drafts_imdb_unique unique (imdb_id)
);

create table if not exists public.movie_import_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  found_count integer not null default 0,
  created_drafts_count integer not null default 0,
  failed_count integer not null default 0,
  log jsonb not null default '[]'::jsonb
);

create table if not exists public.agent_feedback (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references public.movie_drafts(id) on delete cascade,
  agent_name text not null,
  decision text not null,
  reason text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_rules (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  rule text not null,
  priority integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists import_candidates_status_created_idx on public.import_candidates (status, created_at);
create index if not exists import_candidates_title_idx on public.import_candidates using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(original_title, '')));
create index if not exists movie_drafts_status_created_idx on public.movie_drafts (status, created_at desc);
create index if not exists movie_drafts_slug_idx on public.movie_drafts (slug);
create index if not exists movie_drafts_tmdb_idx on public.movie_drafts (tmdb_id);
create index if not exists movie_drafts_kinopoisk_idx on public.movie_drafts (kinopoisk_id);
create index if not exists movie_drafts_imdb_idx on public.movie_drafts (imdb_id);
create index if not exists agent_feedback_draft_idx on public.agent_feedback (draft_id, created_at desc);

drop trigger if exists import_candidates_set_updated_at on public.import_candidates;
create trigger import_candidates_set_updated_at
before update on public.import_candidates
for each row execute function public.set_updated_at();

drop trigger if exists movie_drafts_set_updated_at on public.movie_drafts;
create trigger movie_drafts_set_updated_at
before update on public.movie_drafts
for each row execute function public.set_updated_at();

alter table public.import_candidates enable row level security;
alter table public.movie_drafts enable row level security;
alter table public.movie_import_runs enable row level security;
alter table public.agent_feedback enable row level security;
alter table public.agent_rules enable row level security;

-- No public policies on purpose.
-- Access should go through server Route Handlers using SUPABASE_SERVICE_ROLE_KEY only.
