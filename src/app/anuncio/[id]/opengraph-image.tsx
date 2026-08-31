import { ImageResponse } from "next/og";

import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_NAME } from "@/lib/site";
import { formatCOP, listingModeLabel } from "@/lib/listings";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Anuncio";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let cardName = "Carta de Pokémon TCG";
  let sub = SITE_NAME;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("listings")
      .select("card_name, set_name, kind, for_sale, for_trade, price_cop, city, status")
      .eq("id", id)
      .maybeSingle();
    if (data && data.status !== "removed") {
      cardName = data.card_name;
      const mode = listingModeLabel(data);
      const price =
        data.for_sale && data.price_cop != null
          ? ` · ${formatCOP(data.price_cop)}`
          : "";
      sub = `${mode}${price} · ${data.set_name ?? data.city}`;
    }
  } catch {
    // usa los valores por defecto
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#111827",
          color: "#fafaf9",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 30, color: "#f87171", fontWeight: 700 }}>
          {SITE_NAME.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: 78,
            fontWeight: 800,
            lineHeight: 1.05,
            marginTop: 28,
            maxWidth: 1000,
            overflow: "hidden",
          }}
        >
          {cardName}
        </div>
        <div style={{ fontSize: 34, color: "#9ca3af", marginTop: 28 }}>
          {sub}
        </div>
      </div>
    ),
    { ...size },
  );
}
