import { revalidatePath } from 'next/cache';

import { assertAdminAccess, getAdminUserFromRequest } from '../../../../../lib/import/adminAuth';
import { getMovieOverrideData, getPublicBaseMovieBySlug, saveMovieOverride, type MovieOverrideData } from '../../../../../lib/movies/movieOverrides';
import { extractRendexVideoId } from '../../../../../lib/players';

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

function cleanRendexVideoId(value: unknown) {
  const id = extractRendexVideoId(value);
  return id ? Number(id) : undefined;
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
  const payload: Record<string, unknown> = {};

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
  if (year !== undefined) payload.year = String(year);

  const rating = cleanNumber(body.rating);
  if (rating !== undefined) payload.rating = rating;

  const kinopoiskId = cleanNumber(body.kinopoiskId);
  if (kinopoiskId !== undefined) payload.kinopoiskId = kinopoiskId;

  const tmdbId = cleanNumber(body.tmdbId);
  if (tmdbId !== undefined) payload.tmdbId = tmdbId;

  const rendexVideoId = cleanRendexVideoId(body.rendexVideoId);
  if (rendexVideoId !== undefined) payload.rendexVideoId = rendexVideoId;

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

  return payload as MovieOverrideData;
}


function revalidateMoviePage(slug: string) {
  revalidatePath(`/movie/${slug}`);
}

function revalidateMovieUpdateSurfaces(slug: string) {
  revalidateMoviePage(slug);
  revalidatePath('/');
  revalidatePath('/profile');
  revalidatePath('/expected');
  revalidatePath('/sitemap.xml');
  revalidatePath('/catalog/[category]', 'page');
  revalidatePath('/catalog/[category]/[genre]', 'page');
}

function revalidateMovieRemovalSurfaces(slug: string) {
  revalidateMovieUpdateSurfaces(slug);

  ['films', 'series', 'anime', 'cartoons', 'documentaries'].forEach((catalogSlug) => {
    revalidatePath(`/catalog/${catalogSlug}`);
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const authError = await assertAdminAccess(request);
  if (authError) return authError;

  const adminUser = await getAdminUserFromRequest(request);
  const params = await context.params;
  const slug = params.slug;

  const baseMovie = await getPublicBaseMovieBySlug(slug);

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

    revalidateMovieUpdateSurfaces(slug);

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

export async function DELETE(request: Request, context: RouteContext) {
  const authError = await assertAdminAccess(request);
  if (authError) return authError;

  const adminUser = await getAdminUserFromRequest(request);
  const params = await context.params;
  const slug = params.slug;

  const baseMovie = await getPublicBaseMovieBySlug(slug);

  if (!baseMovie) {
    return Response.json(
      { ok: false, error: 'Movie not found' },
      { status: 404 },
    );
  }

  try {
    const currentOverride = await getMovieOverrideData(slug);
    const hiddenPayload: MovieOverrideData = {
      ...(currentOverride ?? {}),
      hidden: true,
      deletedAt: new Date().toISOString(),
      deletedBy: adminUser?.email || 'admin',
    };

    await saveMovieOverride(slug, hiddenPayload, adminUser?.email || 'admin');
    revalidateMovieRemovalSurfaces(slug);

    return Response.json({
      ok: true,
      slug,
      message: 'Фильм скрыт с публичного сайта через movie_overrides.',
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown movie delete override error',
      },
      { status: 500 },
    );
  }
}
