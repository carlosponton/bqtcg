import { NextResponse, type NextRequest } from "next/server";

import { searchCards } from "@/lib/tcgdex";

/** Autocompletar de cartas para el formulario de publicar / agregar a colección. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchCards(q, 20);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=600" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/cards/search] error:", message);
    return NextResponse.json(
      {
        results: [],
        error: "No se pudo consultar el catálogo de cartas.",
        ...(process.env.NODE_ENV === "development" ? { detail: message } : {}),
      },
      { status: 502 },
    );
  }
}
