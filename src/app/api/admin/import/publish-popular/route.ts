import { NextResponse } from "next/server";
import { assertAdminSecret } from "../../../../lib/import/adminAuth";
import { publishPopularMovies } from "../../../../lib/import/publicPopularImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  limit?: number;
  startPage?: number;
  includeCartoons?: boolean;
  includeDocumentaries?: boolean;
};

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const result = await publishPopularMovies({
      limit: body.limit,
      startPage: body.startPage,
      includeCartoons: body.includeCartoons,
      includeDocumentaries: body.includeDocumentaries,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[KinoLuma publish-popular] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 },
    );
  }
}
