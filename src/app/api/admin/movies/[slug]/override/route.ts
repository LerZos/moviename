import { revalidatePath } from 'next/cache';

import { getAdminUserFromRequest } from '../../../../../lib/import/adminAuth';
import {
  getMovieOverrideData,
  getPublicBaseMovieBySlug,
  patchMovieOverride,
  MovieOverrideConflictError,
  MovieOverrideReadError,
  type MovieOverrideData,
} from '../../../../../lib/movies/movieOverrides';
import {
  parseManualRatingInput,
} from '../../../../../lib/movies/rating';
import { extractRendexVideoId } from '../../../../../lib/players';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

class PosterUrlValidationError extends Error {}

function cleanString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function cleanPosterUrl(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw new PosterUrlValidationError();
  const poster = value.trim();
  if (!poster) return undefined;
  if (poster.length > 2048 || /[\u0000-\u001f\\]/.test(poster)) {
    throw new PosterUrlValidationError();
  }
  if (poster.startsWith('/') && !poster.startsWith('//')) return poster;

  let parsed: URL;
  try {
    parsed = new URL(poster);
  } catch {
    throw new PosterUrlValidationError();
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
    throw new PosterUrlValidationError();
  }
  return poster;
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

  if (Object.prototype.hasOwnProperty.call(body, 'poster')) {
    const poster = cleanPosterUrl(body.poster);
    if (poster !== undefined) payload.poster = poster;
  }

  const year = cleanNumber(body.year);
  if (year !== undefined) payload.year = String(year);

  const rating = parseManualRatingInput(body.rating);
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

  const posterFallbacks = cleanStringArray(body.posterFallbacks)?.map(cleanPosterUrl);
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
  const adminUser = await getAdminUserFromRequest(request);
  if (!adminUser) return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
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

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json(
        { ok: false, error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const requestBody = body as Record<string, unknown>;
    const overridePayload = buildOverridePayload(requestBody);
    // The editor sends the override it was opened with; comparing against it (not a
    // fresh read) turns a stale same-field save into a 409 instead of an overwrite.
    const clientExpected = requestBody.expectedOverride;
    const currentOverride =
      clientExpected && typeof clientExpected === 'object' && !Array.isArray(clientExpected)
        ? (clientExpected as MovieOverrideData)
        : await getMovieOverrideData(slug);
    const shouldClearRating =
      Object.prototype.hasOwnProperty.call(requestBody, 'rating') &&
      (overridePayload.rating === 0 || requestBody.rating === null ||
        (typeof requestBody.rating === 'string' && !requestBody.rating.trim()));
    const shouldClearPoster =
      Object.prototype.hasOwnProperty.call(requestBody, 'poster') &&
      (requestBody.poster === null ||
        (typeof requestBody.poster === 'string' && !requestBody.poster.trim()));
    const shouldClearPosterFallbacks =
      Array.isArray(requestBody.posterFallbacks) &&
      requestBody.posterFallbacks.length === 0;
    const removeKeys = [
      ...(shouldClearRating ? ['rating'] : []),
      ...(shouldClearPoster ? ['poster'] : []),
      ...(shouldClearPosterFallbacks ? ['posterFallbacks'] : []),
    ];
    for (const key of removeKeys) delete overridePayload[key];

    const savedOverride = await patchMovieOverride(
      slug,
      overridePayload,
      removeKeys,
      adminUser.email,
      currentOverride,
    );

    revalidateMovieUpdateSurfaces(slug);

    return Response.json({
      ok: true,
      slug,
      data: savedOverride.data,
      version: savedOverride.updatedAt,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof MovieOverrideReadError || error instanceof MovieOverrideConflictError
          ? error.message
          : error instanceof PosterUrlValidationError
            ? 'Постер должен быть HTTPS URL или локальным путём /...'
          : error instanceof RangeError
            ? 'Рейтинг должен быть числом от 0 до 10'
            : 'Не удалось сохранить правки',
        ...(error instanceof MovieOverrideConflictError
          ? { conflictFields: error.conflictKeys, data: error.currentData }
          : {}),
      },
      {
        status: error instanceof MovieOverrideReadError
          ? 503
          : error instanceof MovieOverrideConflictError
            ? 409
            : error instanceof PosterUrlValidationError || error instanceof RangeError
              ? 400
              : 500,
      },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const adminUser = await getAdminUserFromRequest(request);
  if (!adminUser) return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
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
      hidden: true,
      deletedAt: new Date().toISOString(),
      deletedBy: adminUser.email,
    };

    await patchMovieOverride(slug, hiddenPayload, [], adminUser.email, currentOverride);
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
        error: error instanceof MovieOverrideReadError || error instanceof MovieOverrideConflictError
          ? error.message
          : 'Не удалось скрыть фильм',
        ...(error instanceof MovieOverrideConflictError
          ? { conflictFields: error.conflictKeys, data: error.currentData }
          : {}),
      },
      {
        status: error instanceof MovieOverrideReadError
          ? 503
          : error instanceof MovieOverrideConflictError
            ? 409
            : 500,
      },
    );
  }
}
