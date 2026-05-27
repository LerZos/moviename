import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { assertAdminSecret } from '../../../../lib/import/adminAuth';
import { createMovieDraft } from '../../../../lib/import/createMovieDraft';
import type { ImportCandidate } from '../../../../lib/import/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const candidateId = typeof body.candidateId === 'string' ? body.candidateId : null;

    let query = supabaseAdmin
      .from('import_candidates')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);

    query = candidateId ? query.eq('id', candidateId) : query.eq('status', 'new');

    const { data: candidate, error } = await query.maybeSingle();

    if (error) throw error;

    if (!candidate) {
      return Response.json({ ok: true, message: 'No candidates to process' });
    }

    const result = await createMovieDraft(candidate as ImportCandidate);
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown process-next error',
      },
      { status: 500 },
    );
  }
}
