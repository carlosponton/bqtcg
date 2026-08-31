import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_NAME;

export default function OgImage() {
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
        <div style={{ fontSize: 34, color: "#f87171", fontWeight: 700 }}>
          {SITE_NAME.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.1,
            marginTop: 24,
            maxWidth: 900,
          }}
        >
          Compra, vende e intercambia cartas de Pokémon TCG en Barranquilla
        </div>
        <div style={{ fontSize: 30, color: "#9ca3af", marginTop: 28 }}>
          Marketplace de la comunidad · sin listas de WhatsApp perdidas
        </div>
      </div>
    ),
    { ...size },
  );
}
