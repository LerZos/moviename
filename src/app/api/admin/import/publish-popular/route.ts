import { NextResponse } from "next/server";
import { publishPopularMovies } from "../../../../lib/import/publicPopularImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  limit?: number;
  startPage?: number;
  includeCartoons?: boolean;
  includeDocumentaries?: boolean;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isAuthorized(request: Request) {
  const expected = cleanString(process.env.KINOLUMA_ADMIN_SECRET);
  if (!expected) return false;
  const actual = cleanString(request.headers.get("x-kinoluma-admin-secret"));
  return actual === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

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
