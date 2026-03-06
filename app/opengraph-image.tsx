import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "FPL Vntrip - Fantasy Premier League Leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #f97316 0%, #fab516 50%, #f97316 100%)",
          }}
        />

        {/* Football emoji */}
        <div style={{ fontSize: "72px", marginBottom: "20px" }}>⚽</div>

        {/* Title */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "12px",
            letterSpacing: "-1px",
          }}
        >
          FPL Vntrip
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "28px",
            color: "#fab516",
            fontWeight: 600,
            marginBottom: "24px",
          }}
        >
          Fantasy Premier League Leaderboard
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "20px",
            color: "rgba(255, 255, 255, 0.7)",
            maxWidth: "700px",
            textAlign: "center",
          }}
        >
          Bảng xếp hạng · Điểm số · Đội hình · Thống kê
        </div>

      </div>
    ),
    { ...size }
  );
}
