import { NextResponse } from "next/server";
import { assertAdminSecret } from "../../../../lib/import/adminAuth";
import { publishCuratedPack300 } from "../../../../lib/import/curatedPack300";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RequestBody = {
  limit?: number;
  dryRun?: boolean;
  quotas?: Partial<{
    film: number;
    series: number;
    anime: number;
    cartoon: number;
    documentary: number;
  }>;
};

export async function POST(request: Request) {
  const authError = assertAdminSecret(request);
  if (authError) return authError;

  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const result = await publishCuratedPack300({
      limit: body.limit,
      dryRun: body.dryRun,
      quotas: body.quotas,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[KinoLuma curated-pack-300] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 },
    );
  }
}
