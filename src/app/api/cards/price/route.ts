import { NextResponse, type NextRequest } from "next/server";

import { getUsdToCop } from "@/lib/fx";
import { getCardPriceUsd } from "@/lib/tcgdex";

/**
 * Precio de referencia de una carta del catálogo (TCGplayer, convertido a COP)
 * para el formulario de publicar. `{ available: false }` si no hay datos.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id) return NextResponse.json({ available: false });

  try {
    const [price, rate] = await Promise.all([
      getCardPriceUsd(id),
      getUsdToCop(),
    ]);
    if (!price || !rate) return NextResponse.json({ available: false });

    const cop = (usd: number) => Math.round((usd * rate) / 500) * 500;

    return NextResponse.json(
      {
        available: true,
        finish: price.finish,
        updatedAt: price.updatedAt,
        cop: {
          market: cop(price.market),
          min: cop(price.min),
          max: cop(price.max),
        },
      },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600" } },
    );
  } catch (err) {
    console.error("[/api/cards/price] error:", err);
    return NextResponse.json({ available: false }, { status: 502 });
  }
}
