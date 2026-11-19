import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { after, before, test } from 'node:test';
import pg from 'pg';

// Upgrade path: the migration runs over an already populated movie_overrides
// table, like production. Needs its own disposable database because it drops
// and recreates public.movie_overrides.
const databaseUrl = process.env.KINOLUMA_TEST_UPGRADE_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('KINOLUMA_TEST_UPGRADE_DATABASE_URL is required and must identify a disposable PostgreSQL database');
}
const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '');
if (!/(?:test|audit|local)/i.test(databaseName)) {
  throw new Error(`Refusing database ${databaseName || '(empty)'}; use a disposable database named with test/audit/local`);
}

const migration = await fs.readFile(
  new URL('../../supabase/migrations/20261111160000_atomic_movie_override_patch.sql', import.meta.url),
  'utf8',
);
const admin = new pg.Client({ connectionString: databaseUrl });

// Shape of a table created before migrations existed (dashboard-created).
const LEGACY_TABLE = `
  create table public.movie_overrides (
    slug text primary key,
    data jsonb,
    updated_by text,
    updated_at timestamptz default now()
  );
  grant all on table public.movie_overrides to anon, authenticated;
`;
const LEGACY_ROWS = [
  ['legacy-rating-only', { rating: 7.7 }],
  ['legacy-poster-only', { poster: '/posters/legacy.webp', posterFallbacks: ['https://cdn.example.invalid/p.jpg'] }],
  ['legacy-players', { players: [{ id: 'player-1', name: 'Основной', provider: 'collapse', embedUrl: '' }], rating: 6.1 }],
  ['legacy-hidden', { hidden: true, deletedAt: '2026-10-01T00:00:00.000Z', deletedBy: 'admin@example.invalid' }],
  ['legacy-unicode', { title: 'Айда!', description: 'Сериал «Айда!» — 2026', nested: { deep: [1, 2, { x: null }] } }],
];

async function connect() {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  return client;
}

async function resetLegacy(rows = LEGACY_ROWS) {
  await admin.query('drop function if exists public.patch_movie_override(text,jsonb,text[],jsonb,text[],text)');
  await admin.query('drop table if exists public.movie_overrides');
  await admin.query(LEGACY_TABLE);
  for (const [slug, data] of rows) {
    await admin.query(
      "insert into public.movie_overrides (slug, data, updated_by, updated_at) values ($1, $2::jsonb, 'legacy@example.invalid', '2026-10-01T00:00:00Z')",
      [slug, JSON.stringify(data)],
    );
  }
}

async function snapshot() {
  return (await admin.query('select slug, data, updated_by, updated_at from public.movie_overrides order by slug')).rows;
}

function patch(client, { slug, set = {}, remove = [], expected = {}, absent = [] }) {
  return client.query(
    'select * from public.patch_movie_override($1,$2::jsonb,$3::text[],$4::jsonb,$5::text[],$6)',
    [slug, JSON.stringify(set), remove, JSON.stringify(expected), absent, 'upgrade-test@example.invalid'],
  ).then(result => result.rows[0]);
}

before(async () => {
  await admin.connect();
  const version = (await admin.query('show server_version_num')).rows[0].server_version_num;
  console.log(`POSTGRES_SERVER_VERSION_NUM=${version}`);
  if (process.env.KINOLUMA_EXPECT_PG_MAJOR) {
    assert.equal(String(Math.floor(Number(version) / 10000)), process.env.KINOLUMA_EXPECT_PG_MAJOR);
  }
  // The owner is not a superuser (like Supabase's migration role), so the
  // roles must already exist: CREATE ROLE ... BYPASSRLS is superuser-only.
  const roles = (await admin.query(
    "select rolname from pg_roles where rolname = any($1) order by rolname",
    [['anon', 'authenticated', 'service_role']],
  )).rows.map(row => row.rolname);
  assert.deepEqual(roles, ['anon', 'authenticated', 'service_role']);
  assert.equal((await admin.query('select rolsuper from pg_roles where rolname = current_user')).rows[0].rolsuper, false);
});

after(async () => {
  await admin.end();
});

test('upgrade over a populated legacy table preserves every existing override byte-for-byte', async () => {
  await resetLegacy();
  const beforeRows = await snapshot();
  await admin.query(migration);
  assert.deepEqual(await snapshot(), beforeRows);
  // Re-applying is a no-op for data.
  await admin.query(migration);
  assert.deepEqual(await snapshot(), beforeRows);
});

test('incompatible legacy data aborts the whole migration and leaves the table untouched', async () => {
  await resetLegacy();
  await admin.query("insert into public.movie_overrides (slug, data) values ('legacy-array', '[1,2]'::jsonb)");
  const beforeRows = await snapshot();
  await assert.rejects(() => admin.query(migration), /non-object data/);
  await admin.query('rollback').catch(() => {});
  assert.deepEqual(await snapshot(), beforeRows);
  const fn = await admin.query("select to_regprocedure('public.patch_movie_override(text,jsonb,text[],jsonb,text[],text)') as oid");
  assert.equal(fn.rows[0].oid, null);
  const rls = await admin.query("select relrowsecurity from pg_class where oid = 'public.movie_overrides'::regclass");
  assert.equal(rls.rows[0].relrowsecurity, false);
});

test('wrong column type aborts the migration without changes', async () => {
  await admin.query('drop function if exists public.patch_movie_override(text,jsonb,text[],jsonb,text[],text)');
  await admin.query('drop table if exists public.movie_overrides');
  await admin.query("create table public.movie_overrides (slug text primary key, data json, updated_by text, updated_at timestamptz default now())");
  await admin.query(`insert into public.movie_overrides (slug, data) values ('legacy-json', '{"rating": 5}')`);
  await assert.rejects(() => admin.query(migration), /data must be jsonb/);
  await admin.query('rollback').catch(() => {});
  assert.equal((await admin.query("select data::text as data from public.movie_overrides where slug = 'legacy-json'")).rows[0].data, '{"rating": 5}');
});

test('after upgrade anon and authenticated lose direct table and RPC access', async () => {
  await resetLegacy();
  await admin.query(migration);
  for (const role of ['anon', 'authenticated']) {
    await admin.query(`set role ${role}`);
    try {
      for (const sql of [
        'select * from public.movie_overrides',
        "update public.movie_overrides set data = '{}'::jsonb",
        "insert into public.movie_overrides (slug, data) values ('x', '{}'::jsonb)",
        'delete from public.movie_overrides',
      ]) {
        await assert.rejects(() => admin.query(sql), error => error.code === '42501', `${role}: ${sql}`);
      }
      await assert.rejects(
        () => patch(admin, { slug: 'legacy-rating-only', set: { rating: 1 }, expected: { rating: 7.7 } }),
        error => error.code === '42501',
      );
    } finally {
      await admin.query('reset role');
    }
  }
  await admin.query('set role service_role');
  try {
    assert.equal((await admin.query('select count(*)::int as n from public.movie_overrides')).rows[0].n, LEGACY_ROWS.length);
    const result = await patch(admin, { slug: 'legacy-rating-only', set: { rating: 8.2 }, expected: { rating: 7.7 } });
    assert.equal(result.applied, true);
  } finally {
    await admin.query('reset role');
  }
});

test('admin A rating and admin B poster overlap under a held row lock: both survive', async () => {
  await resetLegacy();
  await admin.query(migration);
  const slug = 'legacy-players';
  await patch(admin, { slug, set: { poster: '/old.webp' }, absent: ['poster'] });
  const a = await connect();
  const b = await connect();
  try {
    // A is mid-save (row locked, not committed) when B submits.
    await a.query('begin');
    const aResult = await patch(a, { slug, set: { rating: 9.3 }, expected: { rating: 6.1 } });
    assert.equal(aResult.applied, true);
    const bPending = patch(b, { slug, set: { poster: '/new.webp' }, expected: { poster: '/old.webp' } });
    await new Promise(resolve => setTimeout(resolve, 300));
    const waiting = await admin.query(
      "select count(*)::int as n from pg_stat_activity where wait_event_type = 'Lock' and query like '%patch_movie_override%'",
    );
    assert.equal(waiting.rows[0].n, 1, 'B must be blocked on A, proving real overlap');
    await a.query('commit');
    const bResult = await bPending;
    assert.equal(bResult.applied, true);
    const { data } = (await admin.query('select data from public.movie_overrides where slug = $1', [slug])).rows[0];
    assert.equal(data.rating, 9.3);
    assert.equal(data.poster, '/new.webp');
    assert.deepEqual(data.players, LEGACY_ROWS[2][1].players);
  } finally {
    await a.end();
    await b.end();
  }
});

test('stale same-field save after a committed change is a reported conflict, not a silent overwrite', async () => {
  await resetLegacy();
  await admin.query(migration);
  const slug = 'legacy-rating-only';
  const a = await connect();
  const b = await connect();
  try {
    await a.query('begin');
    await patch(a, { slug, set: { rating: 8.8 }, expected: { rating: 7.7 } });
    const bPending = patch(b, { slug, set: { rating: 5.5 }, expected: { rating: 7.7 } });
    await new Promise(resolve => setTimeout(resolve, 200));
    await a.query('commit');
    const bResult = await bPending;
    assert.equal(bResult.applied, false);
    assert.deepEqual(bResult.conflict_keys, ['rating']);
    assert.equal(bResult.result_data.rating, 8.8);
    assert.equal((await admin.query('select data from public.movie_overrides where slug = $1', [slug])).rows[0].data.rating, 8.8);
  } finally {
    await a.end();
    await b.end();
  }
});

test('bulk player sync patch and admin rating/poster patch interleave without loss', async () => {
  await resetLegacy();
  await admin.query(migration);
  const slug = 'legacy-poster-only';
  const sync = await connect();
  const editor = await connect();
  try {
    // Both sides read, then send only their own key with the value they read as
    // the expected state — the same contract patchMovieOverride uses for
    // players/sync-all, vibix/sync-site and the admin PUT route.
    const expectedFor = (data, key) => (Object.hasOwn(data, key) ? { expected: { [key]: data[key] } } : { absent: [key] });
    let lastRating;
    let lastPlayers;
    for (let index = 0; index < 20; index++) {
      const current = (await admin.query('select data from public.movie_overrides where slug = $1', [slug])).rows[0].data;
      lastPlayers = [{ id: 'player-1', name: 'Vibix', provider: 'rendex', embedUrl: '', round: index }];
      lastRating = Math.round((5 + index / 10) * 10) / 10;
      const [syncResult, editorResult] = await Promise.all([
        patch(sync, { slug, set: { players: lastPlayers }, ...expectedFor(current, 'players') }),
        patch(editor, { slug, set: { rating: lastRating }, ...expectedFor(current, 'rating') }),
      ]);
      assert.equal(syncResult.applied, true, `sync round ${index}`);
      assert.equal(editorResult.applied, true, `editor round ${index}`);
    }
    const { data } = (await admin.query('select data from public.movie_overrides where slug = $1', [slug])).rows[0];
    assert.equal(data.poster, '/posters/legacy.webp');
    assert.deepEqual(data.posterFallbacks, ['https://cdn.example.invalid/p.jpg']);
    assert.equal(data.rating, lastRating);
    assert.deepEqual(data.players, lastPlayers);
  } finally {
    await sync.end();
    await editor.end();
  }
});

test('100 concurrent disjoint-field patches from separate connections keep every field', async () => {
  await resetLegacy([['stress', {}]]);
  await admin.query(migration);
  const clients = await Promise.all(Array.from({ length: 10 }, connect));
  try {
    await Promise.all(Array.from({ length: 100 }, (_, index) =>
      patch(clients[index % clients.length], { slug: 'stress', set: { [`k${index}`]: index }, absent: [`k${index}`] })
        .then(result => assert.equal(result.applied, true))));
    const { data } = (await admin.query("select data from public.movie_overrides where slug = 'stress'")).rows[0];
    assert.equal(Object.keys(data).length, 100);
    for (let index = 0; index < 100; index++) assert.equal(data[`k${index}`], index);
  } finally {
    await Promise.all(clients.map(client => client.end()));
  }
});
