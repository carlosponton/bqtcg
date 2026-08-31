import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
        }}
      >
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: 116,
            background: "#fafaf9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "12px solid #ef4444",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 36,
              background: "#111827",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
