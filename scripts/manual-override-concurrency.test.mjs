import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from './admin-poster.test.mjs';

test('concurrent poster-only and rating-only requests retain both acknowledged values', async () => {
  const f = fixture();
  const responses = await Promise.all([
    f.put({ poster: '/manual-new.svg' }),
    f.put({ rating: 9.1 }),
  ]);
  assert.deepEqual(responses.map(response => response.status), [200, 200]);
  const reloaded = await f.movies.getMovieWithOverrides('fixture');
  assert.equal(reloaded.poster, '/manual-new.svg');
  assert.equal(reloaded.rating, 9.1);
  assert.deepEqual(f.row().data.custom, { keep: true });
});

test('concurrent same-field edits return one explicit conflict', async () => {
  const f = fixture();
  const responses = await Promise.all([
    f.put({ rating: 9.1 }),
    f.put({ rating: 9.2 }),
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  const conflictResponse = responses.find(response => response.status === 409);
  assert.deepEqual((await conflictResponse.json()).conflictFields, ['rating']);
});

test('concurrent hide and poster edit preserve both independent intents', async () => {
  const f = fixture();
  const [putResponse, deleteResponse] = await Promise.all([
    f.put({ poster: '/manual-new.svg' }),
    f.remove(),
  ]);
  assert.equal(putResponse.status, 200);
  assert.equal(deleteResponse.status, 200);
  assert.equal(f.row().data.poster, '/manual-new.svg');
  assert.equal(f.row().data.hidden, true);
  assert.equal(f.row().data.rating, 8);
});

test('retry with the original expectation is idempotent', async () => {
  const f = fixture();
  const original = await f.movies.getMovieOverrideData('fixture');
  const first = await f.movies.patchMovieOverride('fixture', { poster: '/manual-new.svg' }, [], 'admin', original);
  const retry = await f.movies.patchMovieOverride('fixture', { poster: '/manual-new.svg' }, [], 'admin', original);
  assert.equal(first.data.poster, '/manual-new.svg');
  assert.equal(retry.data.poster, '/manual-new.svg');
  assert.equal(f.row().data.rating, 8);
});

for (const poster of [
  'javascript:alert(1)',
  'data:image/svg+xml,<svg onload=alert(1)>',
  'http://example.com/poster.jpg',
  '//example.com/poster.jpg',
  'https://user:password@example.com/poster.jpg',
  123,
]) {
  test(`invalid poster input is rejected without writes: ${JSON.stringify(poster)}`, async () => {
    const f = fixture();
    const response = await f.put({ poster });
    assert.equal(response.status, 400);
    assert.equal(f.writes(), 0);
  });
}

for (const poster of ['/images/poster.jpg', 'https://cdn.example.com/poster.jpg']) {
  test(`safe poster input remains accepted: ${poster}`, async () => {
    const f = fixture();
    const response = await f.put({ poster });
    assert.equal(response.status, 200);
    assert.equal(f.row().data.poster, poster);
  });
}
