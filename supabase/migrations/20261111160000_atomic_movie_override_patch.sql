-- Reproducible storage and atomic top-level patching for movie overrides.
--
-- The migration is deliberately transactional. Existing installations must
-- already be compatible with the four documented columns; invalid/null data
-- or duplicate slugs abort the migration instead of being rewritten silently.
begin;

create table if not exists public.movie_overrides (
  slug text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint movie_overrides_slug_not_blank check (btrim(slug) <> ''),
  constraint movie_overrides_data_object check (jsonb_typeof(data) = 'object')
);

do $$
declare
  actual_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
  into actual_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.movie_overrides'::regclass
    and attribute.attname = 'slug'
    and not attribute.attisdropped;
  if actual_type <> 'text' then
    raise exception 'public.movie_overrides.slug must be text, found %', actual_type;
  end if;

  select format_type(attribute.atttypid, attribute.atttypmod)
  into actual_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.movie_overrides'::regclass
    and attribute.attname = 'data'
    and not attribute.attisdropped;
  if actual_type <> 'jsonb' then
    raise exception 'public.movie_overrides.data must be jsonb, found %', actual_type;
  end if;

  select format_type(attribute.atttypid, attribute.atttypmod)
  into actual_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.movie_overrides'::regclass
    and attribute.attname = 'updated_by'
    and not attribute.attisdropped;
  if actual_type <> 'text' then
    raise exception 'public.movie_overrides.updated_by must be text, found %', actual_type;
  end if;

  select format_type(attribute.atttypid, attribute.atttypmod)
  into actual_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.movie_overrides'::regclass
    and attribute.attname = 'updated_at'
    and not attribute.attisdropped;
  if actual_type <> 'timestamp with time zone' then
    raise exception 'public.movie_overrides.updated_at must be timestamptz, found %', actual_type;
  end if;

  if exists (select 1 from public.movie_overrides where slug is null or btrim(slug) = '') then
    raise exception 'public.movie_overrides contains a null or blank slug';
  end if;
  if exists (select 1 from public.movie_overrides where data is null or jsonb_typeof(data) <> 'object') then
    raise exception 'public.movie_overrides contains non-object data';
  end if;
  if exists (select slug from public.movie_overrides group by slug having count(*) > 1) then
    raise exception 'public.movie_overrides contains duplicate slugs';
  end if;
end;
$$;

alter table public.movie_overrides
  alter column slug set not null,
  alter column data set default '{}'::jsonb,
  alter column data set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

create unique index if not exists movie_overrides_slug_uidx
  on public.movie_overrides (slug);

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.movie_overrides'::regclass
      and conname = 'movie_overrides_slug_not_blank'
  ) then
    alter table public.movie_overrides
      add constraint movie_overrides_slug_not_blank check (btrim(slug) <> '');
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.movie_overrides'::regclass
      and conname = 'movie_overrides_data_object'
  ) then
    alter table public.movie_overrides
      add constraint movie_overrides_data_object check (jsonb_typeof(data) = 'object');
  end if;
end;
$$;

alter table public.movie_overrides enable row level security;
revoke all on table public.movie_overrides from public, anon, authenticated;
grant select, insert, update, delete on table public.movie_overrides to service_role;

create or replace function public.patch_movie_override(
  p_slug text,
  p_set jsonb,
  p_remove text[],
  p_expected jsonb,
  p_expected_absent text[],
  p_updated_by text
)
returns table (
  applied boolean,
  result_slug text,
  result_data jsonb,
  result_updated_at timestamptz,
  conflict_keys text[]
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_data jsonb;
  current_updated_at timestamptz;
  next_data jsonb;
  touched_keys text[];
  expected_keys text[];
  found_conflicts text[];
begin
  if p_slug is null or btrim(p_slug) = '' then
    raise exception using errcode = '22023', message = 'p_slug must not be empty';
  end if;

  p_set := coalesce(p_set, '{}'::jsonb);
  p_remove := coalesce(p_remove, array[]::text[]);
  p_expected := coalesce(p_expected, '{}'::jsonb);
  p_expected_absent := coalesce(p_expected_absent, array[]::text[]);
  p_updated_by := nullif(btrim(coalesce(p_updated_by, '')), '');

  if jsonb_typeof(p_set) <> 'object' or jsonb_typeof(p_expected) <> 'object' then
    raise exception using errcode = '22023', message = 'p_set and p_expected must be JSON objects';
  end if;

  if exists (
    select 1 from unnest(p_remove || p_expected_absent) as key_name
    where key_name is null or btrim(key_name) = ''
  ) then
    raise exception using errcode = '22023', message = 'override keys must not be empty';
  end if;

  select coalesce(array_agg(key_name order by key_name), array[]::text[])
  into touched_keys
  from (
    select jsonb_object_keys(p_set) as key_name
    union
    select unnest(p_remove) as key_name
  ) as touched;

  select coalesce(array_agg(key_name order by key_name), array[]::text[])
  into expected_keys
  from (
    select jsonb_object_keys(p_expected) as key_name
    union
    select unnest(p_expected_absent) as key_name
  ) as expected;

  if cardinality(touched_keys) = 0 then
    raise exception using errcode = '22023', message = 'at least one override key must be touched';
  end if;
  if exists (select 1 from jsonb_object_keys(p_set) as item(key_name) where item.key_name = any(p_remove)) then
    raise exception using errcode = '22023', message = 'a key cannot be set and removed together';
  end if;
  if exists (select 1 from jsonb_object_keys(p_expected) as item(key_name) where item.key_name = any(p_expected_absent)) then
    raise exception using errcode = '22023', message = 'an expected key cannot be present and absent together';
  end if;
  if touched_keys <> expected_keys then
    raise exception using errcode = '22023', message = 'every touched key must have an expected state';
  end if;

  loop
    select movie_override.data, movie_override.updated_at
    into current_data, current_updated_at
    from public.movie_overrides as movie_override
    where movie_override.slug = p_slug
    for update;

    if found then
      select coalesce(array_agg(key_name order by key_name), array[]::text[])
      into found_conflicts
      from unnest(touched_keys) as touched(key_name)
      where (
        (p_expected ? touched.key_name and (
          not (current_data ? touched.key_name)
          or current_data -> touched.key_name is distinct from p_expected -> touched.key_name
        ))
        or (touched.key_name = any(p_expected_absent) and current_data ? touched.key_name)
      ) and not (
        (p_set ? touched.key_name and current_data ? touched.key_name
          and current_data -> touched.key_name is not distinct from p_set -> touched.key_name)
        or (touched.key_name = any(p_remove) and not (current_data ? touched.key_name))
      );

      if cardinality(found_conflicts) > 0 then
        return query select false, p_slug, current_data, current_updated_at, found_conflicts;
        return;
      end if;

      next_data := (current_data - p_remove) || p_set;
      update public.movie_overrides as movie_override
      set data = next_data, updated_by = p_updated_by, updated_at = now()
      where movie_override.slug = p_slug
      returning movie_override.data, movie_override.updated_at
      into current_data, current_updated_at;

      return query select true, p_slug, current_data, current_updated_at, array[]::text[];
      return;
    end if;

    select coalesce(array_agg(key_name order by key_name), array[]::text[])
    into found_conflicts
    from jsonb_object_keys(p_expected) as expected_key(key_name);
    if cardinality(found_conflicts) > 0 then
      return query select false, p_slug, '{}'::jsonb, null::timestamptz, found_conflicts;
      return;
    end if;

    next_data := ('{}'::jsonb - p_remove) || p_set;
    insert into public.movie_overrides (slug, data, updated_by, updated_at)
    values (p_slug, next_data, p_updated_by, now())
    on conflict (slug) do nothing
    returning movie_overrides.data, movie_overrides.updated_at
    into current_data, current_updated_at;

    if found then
      return query select true, p_slug, current_data, current_updated_at, array[]::text[];
      return;
    end if;
  end loop;
end;
$$;

revoke execute on function public.patch_movie_override(text, jsonb, text[], jsonb, text[], text)
  from public, anon, authenticated;
grant execute on function public.patch_movie_override(text, jsonb, text[], jsonb, text[], text)
  to service_role;

commit;

-- Rollback for the code release: deploy the previous application version first,
-- then DROP FUNCTION public.patch_movie_override(text,jsonb,text[],jsonb,text[],text).
-- Keep public.movie_overrides and its data; dropping that table is not a safe rollback.
