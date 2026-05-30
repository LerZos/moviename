import { assertAdminSecret } from '../../../../lib/import/adminAuth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CandidateRow = {
  id: string;
  title: string | null;
  original_title: string | null;
  source: string | null;
  source_id: string | null;
  status: string | null;
};

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const candidateId =
      typeof body.candidateId === 'string' ? body.candidateId.trim() : '';

    if (!candidateId) {
      return Response.json(
        { ok: false, error: 'candidateId is required' },
        { status: 400 },
      );
    }

    const { data: candidate, error: readError } = await supabaseAdmin
      .from('import_candidates')
      .select('id, title, original_title, source, source_id, status')
      .eq('id', candidateId)
      .maybeSingle();

    if (readError) throw readError;

    if (!candidate) {
      return Response.json({ ok: true, message: 'Кандидат уже удалён.' });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('import_candidates')
      .delete()
      .eq('id', candidateId);

    if (deleteError) throw deleteError;

    const title =
      (candidate as CandidateRow).title ||
      (candidate as CandidateRow).original_title ||
      'Кандидат';

    return Response.json({
      ok: true,
      message: `«${title}» удалён из кандидатов и не попадёт в ошибки.`,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown candidate delete error',
      },
      { status: 500 },
    );
  }
}
