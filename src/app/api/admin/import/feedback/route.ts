import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { assertAdminSecret } from '../../../../lib/import/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    const draftId = typeof body.draftId === 'string' ? body.draftId : null;
    const agentName = typeof body.agentName === 'string' ? body.agentName : 'admin';
    const decision = typeof body.decision === 'string' ? body.decision : null;
    const reason = typeof body.reason === 'string' ? body.reason : null;

    if (!draftId || !decision) {
      return Response.json({ ok: false, error: 'draftId and decision are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('agent_feedback')
      .insert({
        draft_id: draftId,
        agent_name: agentName,
        decision,
        reason,
        before_value: body.beforeValue ?? null,
        after_value: body.afterValue ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;

    return Response.json({ ok: true, feedback: data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown feedback error',
      },
      { status: 500 },
    );
  }
}
