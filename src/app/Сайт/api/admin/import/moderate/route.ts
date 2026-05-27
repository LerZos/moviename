import { assertAdminSecret } from '../../../../lib/import/adminAuth';
import { moderateDraft } from '../../../../lib/import/moderateDraft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const draftId = typeof body.draftId === 'string' ? body.draftId : null;

    if (!draftId) {
      return Response.json({ ok: false, error: 'draftId is required' }, { status: 400 });
    }

    const draft = await moderateDraft(draftId);
    return Response.json({ ok: true, draft });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown moderation error',
      },
      { status: 500 },
    );
  }
}
