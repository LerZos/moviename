import { assertAdminSecret } from '../../../../lib/import/adminAuth';
import { importVibixCandidates } from '../../../../lib/import/vibixImport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readType(value: unknown) {
  return value === 'serial' || value === 'series' ? 'serial' : 'movie';
}

function readPositiveInt(value: unknown, fallback: number, max: number) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), max);
}

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const type = readType((body as Record<string, unknown>).type);
    const page = readPositiveInt((body as Record<string, unknown>).page, 1, 5000);
    const limit = readPositiveInt((body as Record<string, unknown>).limit, 30, 100);

    const result = await importVibixCandidates({ type, page, limit });

    return Response.json({
      ok: true,
      result,
      message: `Vibix: добавлено кандидатов ${result.insertedCandidatesCount}, дублей ${result.duplicateCount}, просмотрено ${result.scannedCount}`,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown Vibix import error',
      },
      { status: 500 },
    );
  }
}
