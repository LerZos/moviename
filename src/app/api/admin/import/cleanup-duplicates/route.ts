import { assertAdminSecret } from '../../../../lib/import/adminAuth';
import {
  buildCandidateDuplicateInput,
  findDuplicateMovie,
  serializeDuplicateMatch,
} from '../../../../lib/import/duplicateGuard';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CandidateRow = {
  id: string;
  source_id: string | null;
  title: string | null;
  original_title: string | null;
  year: number | null;
  status: string | null;
  raw_json: unknown;
};

type DraftRow = {
  id: string;
  title: string | null;
  original_title: string | null;
  slug: string | null;
  year: number | null;
  tmdb_id: number | null;
  kinopoisk_id: number | null;
  imdb_id: string | null;
  status: string | null;
  raw_json: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function nowIso() {
  return new Date().toISOString();
}

function readBoolean(value: unknown) {
  return value === true || value === 'true' || value === '1';
}

async function markCandidateDuplicate(candidate: CandidateRow, duplicate: unknown) {
  const rawJson = asRecord(candidate.raw_json);

  const { error } = await supabaseAdmin
    .from('import_candidates')
    .update({
      status: 'duplicate',
      raw_json: {
        ...rawJson,
        kinoluma_duplicate: duplicate,
        kinoluma_duplicate_hidden_at: nowIso(),
      },
      updated_at: nowIso(),
    })
    .eq('id', candidate.id);

  if (error) throw error;
}

async function softDeleteDraft(draft: DraftRow, reason: unknown) {
  const rawJson = asRecord(draft.raw_json);

  const { error } = await supabaseAdmin
    .from('movie_drafts')
    .update({
      status: 'deleted',
      raw_json: {
        ...rawJson,
        kinoluma_deleted_reason: reason,
        kinoluma_deleted_at: nowIso(),
      },
      moderation_notes: 'Скрыто автоматически: дубль уже существующего фильма',
      updated_at: nowIso(),
    })
    .eq('id', draft.id);

  if (error) throw error;
}

async function cleanupCandidateDuplicates(options: { includeAllCandidateStatuses: boolean }) {
  let query = supabaseAdmin
    .from('import_candidates')
    .select('id, source_id, title, original_title, year, status, raw_json')
    .order('created_at', { ascending: true })
    .limit(5000);

  if (!options.includeAllCandidateStatuses) {
    query = query.in('status', ['new', 'failed']);
  }

  const { data, error } = await query;
  if (error) throw error;

  const candidates = (data ?? []) as CandidateRow[];
  let scanned = 0;
  let markedDuplicate = 0;
  const examples: unknown[] = [];

  for (const candidate of candidates) {
    if (candidate.status === 'duplicate') continue;
    if (candidate.status === 'deleted') continue;

    scanned += 1;

    const duplicate = await findDuplicateMovie(buildCandidateDuplicateInput(candidate));
    if (!duplicate.isDuplicate) continue;

    markedDuplicate += 1;
    const serialized = serializeDuplicateMatch(duplicate);
    await markCandidateDuplicate(candidate, serialized);

    if (examples.length < 30) {
      examples.push({
        candidateId: candidate.id,
        title: candidate.title,
        originalTitle: candidate.original_title,
        year: candidate.year,
        oldStatus: candidate.status,
        duplicate: serialized,
      });
    }
  }

  return { scanned, markedDuplicate, examples };
}

async function cleanupDraftDuplicatesAgainstStaticMovies() {
  const { data, error } = await supabaseAdmin
    .from('movie_drafts')
    .select('id, title, original_title, slug, year, tmdb_id, kinopoisk_id, imdb_id, status, raw_json')
    .neq('status', 'deleted')
    .order('created_at', { ascending: true })
    .limit(5000);

  if (error) throw error;

  const drafts = (data ?? []) as DraftRow[];
  let scanned = 0;
  let softDeleted = 0;
  const examples: unknown[] = [];

  for (const draft of drafts) {
    scanned += 1;
    const duplicate = await findDuplicateMovie(
      {
        tmdbId: draft.tmdb_id,
        kinopoiskId: draft.kinopoisk_id,
        imdbId: draft.imdb_id,
        slug: draft.slug,
        title: draft.title,
        originalTitle: draft.original_title,
        year: draft.year,
        rawJson: draft.raw_json,
        excludeDraftId: draft.id,
      },
      { includeDrafts: false },
    );

    if (!duplicate.isDuplicate) continue;

    softDeleted += 1;
    const serialized = serializeDuplicateMatch(duplicate);
    await softDeleteDraft(draft, serialized);

    if (examples.length < 30) {
      examples.push({
        draftId: draft.id,
        title: draft.title,
        originalTitle: draft.original_title,
        year: draft.year,
        oldStatus: draft.status,
        duplicate: serialized,
      });
    }
  }

  return { scanned, softDeleted, examples };
}

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const payload = body as Record<string, unknown>;
    const includeDrafts = readBoolean(payload.includeDrafts);
    const includeAllCandidateStatuses = readBoolean(payload.includeAllCandidateStatuses);

    const candidateCleanup = await cleanupCandidateDuplicates({ includeAllCandidateStatuses });
    const draftCleanup = includeDrafts
      ? await cleanupDraftDuplicatesAgainstStaticMovies()
      : { scanned: 0, softDeleted: 0, examples: [] as unknown[] };

    return Response.json({
      ok: true,
      message: includeDrafts
        ? 'Жёсткая очистка дублей выполнена: кандидаты скрыты, импортные дубли существующих фильмов удалены из публикации.'
        : 'Жёсткая очистка дублей кандидатов выполнена.',
      candidates: candidateCleanup,
      drafts: draftCleanup,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown duplicate cleanup error',
      },
      { status: 500 },
    );
  }
}
