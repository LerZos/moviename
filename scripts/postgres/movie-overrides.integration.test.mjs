import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import pg from 'pg';

const databaseUrl = process.env.KINOLUMA_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('KINOLUMA_TEST_DATABASE_URL is required and must identify a disposable PostgreSQL database');
}

const parsedUrl = new URL(databaseUrl);
const databaseName = parsedUrl.pathname.replace(/^\//, '');
if (!/(?:test|audit|local)/i.test(databaseName) && process.env.KINOLUMA_ALLOW_NONSTANDARD_TEST_DB !== 'YES') {
  throw new Error(`Refusing database ${databaseName || '(empty)'}; use a disposable database named with test/audit/local`);
}

const migration = await fs.readFile(
  new URL('../../supabase/migrations/20261111160000_atomic_movie_override_patch.sql', import.meta.url),
  'utf8',
);
const prefix = `audit_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: databaseUrl });

async function connect() {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  return client;
}

async function patch(client, { slug, set = {}, remove = [], expected = {}, absent = [] }) {
  const result = await client.query(
    'select * from public.patch_movie_override($1,$2::jsonb,$3::text[],$4::jsonb,$5::text[],$6)',
    [slug, JSON.stringify(set), remove, JSON.stringify(expected), absent, 'integration-test@example.invalid'],
  );
  assert.equal(result.rows.length, 1);
  return result.rows[0];
}

before(async () => {
  await admin.connect();
  await admin.query(`
    do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
    do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
    do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
  `);
  await admin.query(migration);
});

after(async () => {
  await admin.end();
});

test('migration is repeatable and produces the secured contract', async () => {
  await admin.query(migration);
  const row = (await admin.query(`
    select p.prosecdef, p.proconfig, c.relrowsecurity
    from pg_proc p join pg_class c on c.oid = 'public.movie_overrides'::regclass
    where p.oid = 'public.patch_movie_override(text,jsonb,text[],jsonb,text[],text)'::regprocedure
  `)).rows[0];
  assert.equal(row.prosecdef, false);
  assert.ok(row.proconfig.some(value => value.startsWith('search_path=')));
  assert.equal(row.relrowsecurity, true);
});

test('rating and poster commit atomically and rollback together', async () => {
  const slug = `${prefix}_atomic`;
  await admin.query('begin');
  const result = await patch(admin, {
    slug,
    set: { rating: 8.4, poster: '/poster.svg' },
    absent: ['rating', 'poster'],
  });
  assert.equal(result.applied, true);
  await admin.query('rollback');
  assert.equal((await admin.query('select count(*)::int as count from movie_overrides where slug=$1', [slug])).rows[0].count, 0);
});

test('concurrent independent fields both survive', async () => {
  const slug = `${prefix}_independent`;
  await patch(admin, { slug, set: { poster: '/a.svg', rating: 8, custom: { keep: true } }, absent: ['poster', 'rating', 'custom'] });
  const left = await connect();
  const right = await connect();
  try {
    const results = await Promise.all([
      patch(left, { slug, set: { poster: '/b.svg' }, expected: { poster: '/a.svg' } }),
      patch(right, { slug, set: { rating: 9.1 }, expected: { rating: 8 } }),
    ]);
    assert.ok(results.every(result => result.applied));
    assert.deepEqual((await admin.query('select data from movie_overrides where slug=$1', [slug])).rows[0].data, {
      poster: '/b.svg', rating: 9.1, custom: { keep: true },
    });
  } finally {
    await left.end();
    await right.end();
  }
});

test('concurrent same-field edits surface one conflict', async () => {
  const slug = `${prefix}_conflict`;
  await patch(admin, { slug, set: { rating: 8 }, absent: ['rating'] });
  const left = await connect();
  const right = await connect();
  try {
    const results = await Promise.all([
      patch(left, { slug, set: { rating: 9.1 }, expected: { rating: 8 } }),
      patch(right, { slug, set: { rating: 9.2 }, expected: { rating: 8 } }),
    ]);
    assert.deepEqual(results.map(result => result.applied).sort(), [false, true]);
    assert.deepEqual(results.find(result => !result.applied).conflict_keys, ['rating']);
  } finally {
    await left.end();
    await right.end();
  }
});

test('retry after a lost response is idempotent', async () => {
  const slug = `${prefix}_retry`;
  await patch(admin, { slug, set: { poster: '/a.svg' }, absent: ['poster'] });
  const first = await patch(admin, { slug, set: { poster: '/b.svg' }, expected: { poster: '/a.svg' } });
  const retry = await patch(admin, { slug, set: { poster: '/b.svg' }, expected: { poster: '/a.svg' } });
  assert.equal(first.applied, true);
  assert.equal(retry.applied, true);
  assert.equal(retry.result_data.poster, '/b.svg');
});

test('database error cannot leave a partial JSON update', async () => {
  const slug = `${prefix}_failure`;
  await patch(admin, { slug, set: { poster: '/a.svg', rating: 8 }, absent: ['poster', 'rating'] });
  await admin.query(`
    create or replace function pg_temp.reject_audit_update() returns trigger language plpgsql as $$
    begin raise exception 'injected failure'; end $$;
    create trigger reject_audit_update before update on public.movie_overrides
    for each row when (new.slug = '${slug}') execute function pg_temp.reject_audit_update();
  `);
  await assert.rejects(() => patch(admin, { slug, set: { poster: '/b.svg', rating: 9 }, expected: { poster: '/a.svg', rating: 8 } }));
  assert.deepEqual((await admin.query('select data from movie_overrides where slug=$1', [slug])).rows[0].data, { poster: '/a.svg', rating: 8 });
  await admin.query('drop trigger reject_audit_update on public.movie_overrides');
});

test('public roles cannot execute the RPC', async () => {
  for (const role of ['anon', 'authenticated']) {
    await admin.query(`set role ${role}`);
    await assert.rejects(
      () => patch(admin, { slug: `${prefix}_${role}`, set: { rating: 1 }, absent: ['rating'] }),
      error => error.code === '42501',
    );
    await admin.query('reset role');
  }
});

test('updated_at is timezone-safe timestamptz', async () => {
  await admin.query("set timezone to 'Europe/Athens'");
  const result = await patch(admin, { slug: `${prefix}_timezone`, set: { rating: 6.5 }, absent: ['rating'] });
  assert.ok(result.result_updated_at instanceof Date);
  assert.equal((await admin.query('select pg_typeof(updated_at)::text as type from movie_overrides where slug=$1', [`${prefix}_timezone`])).rows[0].type, 'timestamp with time zone');
});
