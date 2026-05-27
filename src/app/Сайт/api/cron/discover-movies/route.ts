import { assertCronSecret } from '../../../lib/import/adminAuth';
import { discoverMovies } from '../../../lib/import/discoverMovies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatRouteError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;

    return {
      message: String(
        record.message ??
          record.error_description ??
          record.error ??
          'Unknown object error',
      ),
      code: record.code,
      details: record.details,
      hint: record.hint,
    };
  }

  return {
    message: String(error),
  };
}

export async function GET(request: Request) {
  const authError = assertCronSecret(request);
  if (authError) return authError;

  try {
    const result = await discoverMovies();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const formattedError = formatRouteError(error);

    console.error('[KinoLuma discover-movies error]', error);

    return Response.json(
      {
        ok: false,
        error: formattedError.message,
        code: formattedError.code,
        details: formattedError.details,
        hint: formattedError.hint,
        stack: formattedError.stack,
      },
      { status: 500 },
    );
  }
}