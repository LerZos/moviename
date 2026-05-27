import { revalidatePath } from 'next/cache';

import { assertAdminAccess, getAdminUserFromRequest } from '../../../../../lib/import/adminAuth';
import { getBaseMovieBySlug, saveMovieOverride, type MovieOverrideData } from '../../../../../lib/movies/movieOverrides';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }> | { slug: string };
};

function cleanString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const cleaned = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanObjectArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const cleaned = value.filter((item) => item && typeof item === 'object');
  return cleaned.length > 0 ? cleaned : undefined;
}

function buildOverridePayload(body: Record<string, unknown>): MovieOverrideData {
  const payload: MovieOverrideData = {};

  const stringFields = [
    'title',
    'originalTitle',
    'type',
    'description',
    'longDescription',
    'poster',
    'backdrop',
    'trailerUrl',
    'imdbId',
  ];

  for (const field of stringFields) {
    const value = cleanString(body[field]);

    if (value !== undefined) {
      payload[field] = value;
    }
  }

  const year = cleanNumber(body.year);
  if (year !== undefined) payload.year = year;

  const rating = cleanNumber(body.rating);
  if (rating !== undefined) payload.rating = rating;

  const kinopoiskId = cleanNumber(body.kinopoiskId);
  if (kinopoiskId !== undefined) payload.kinopoiskId = kinopoiskId;

  const tmdbId = cleanNumber(body.tmdbId);
  if (tmdbId !== undefined) payload.tmdbId = tmdbId;

  const genres = cleanStringArray(body.genres);
  if (genres) payload.genres = genres;

  const countries = cleanStringArray(body.countries);
  if (countries) payload.countries = countries;

  const players = cleanObjectArray(body.players);
  if (players) payload.players = players;

  const facts = cleanObjectArray(body.facts);
  if (facts) payload.facts = facts;

  const cast = cleanObjectArray(body.cast);
  if (cast) payload.cast = cast;

  const posterFallbacks = cleanStringArray(body.posterFallbacks);
  if (posterFallbacks) payload.posterFallbacks = posterFallbacks;

  return payload;
}

export async function PUT(request: Request, context: RouteContext) {
  const authError = await assertAdminAccess(request);
  if (authError) return authError;

  const adminUser = await getAdminUserFromRequest(request);
  const params = await context.params;
  const slug = params.slug;

  const baseMovie = getBaseMovieBySlug(slug);

  if (!baseMovie) {
    return Response.json(
      { ok: false, error: 'Movie not found' },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return Response.json(
        { ok: false, error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const overridePayload = buildOverridePayload(body as Record<string, unknown>);

    await saveMovieOverride(slug, overridePayload, adminUser?.email || 'admin');

    revalidatePath(`/movie/${slug}`);
    revalidatePath('/sitemap.xml');

    return Response.json({
      ok: true,
      slug,
      data: overridePayload,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown movie override error',
      },
      { status: 500 },
    );
  }
}
