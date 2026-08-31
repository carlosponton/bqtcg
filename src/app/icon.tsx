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
          background: "#111827",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 300,
            background: "#fafaf9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "28px solid #ef4444",
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 96,
              background: "#111827",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
