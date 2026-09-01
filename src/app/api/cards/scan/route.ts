import { NextResponse, type NextRequest } from "next/server";

import { matchScannedCard } from "@/lib/tcgdex";

/**
 * Empareja lo que el navegador leyó por OCR (nombre / número / total de set /
 * sigla) con el catálogo de TCGdex. El OCR ocurre en el cliente; aquí sólo se
 * cruza contra la lista ya cacheada en memoria.
 */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const name = p.get("name")?.trim() || null;
  const number = p.get("number")?.trim() || null;
  const code = p.get("code")?.trim() || null;
  const totalRaw = p.get("total")?.trim() ?? "";
  const setTotal = /^\d{1,4}$/.test(totalRaw) ? Number(totalRaw) : null;

  if (!name && !number) {
    return NextResponse.json({ candidates: [] });
  }

  try {
    const candidates = await matchScannedCard(
      { name, number, setTotal, setCode: code },
      8,
    );
    return NextResponse.json(
      { candidates },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/cards/scan] error:", message);
    return NextResponse.json(
      {
        candidates: [],
        error: "No se pudo consultar el catálogo de cartas.",
        ...(process.env.NODE_ENV === "development" ? { detail: message } : {}),
      },
      { status: 502 },
    );
  }
}
