import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff8f0",
          borderRadius: 112,
        }}
      >
        <svg width="340" height="340" viewBox="0 0 48 48" fill="none">
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
      </div>
    ),
    { ...size },
  );
}
