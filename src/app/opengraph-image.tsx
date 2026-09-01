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
          padding: 84,
          background: "#fff8f0",
          color: "#2a1f17",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: -1,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 48 48" fill="none">
            <rect
              x="12.5"
              y="16"
              width="21"
              height="27"
              rx="3.5"
              stroke="#2a1f17"
              strokeWidth="2.6"
            />
            <path
              d="M30 19.5C30 24 24 24 22.6 16.4"
              stroke="#2a1f17"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <ellipse cx="30" cy="9.5" rx="7.2" ry="8.6" fill="#e63946" />
            <path d="M28.4 17.3h3.2L30 20z" fill="#f4a935" />
          </svg>
          {SITE_NAME}
        </div>
        <div
          style={{
            fontSize: 66,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            marginTop: 28,
            maxWidth: 940,
          }}
        >
          Cambia, vende y encuentra tus cartas de Pokémon TCG
        </div>
        <div style={{ fontSize: 30, color: "#6f5d48", marginTop: 26 }}>
          Marketplace de la comunidad en Colombia · sin listas de WhatsApp
          perdidas
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            height: 14,
            background: "#e63946",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
