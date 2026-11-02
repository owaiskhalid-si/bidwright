import { ImageResponse } from "next/og";

export const alt = "Bidwright: proposals that read like you studied the job";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f7f6f1", color: "#141824", padding: 72, fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#141824", display: "flex" }} />
          Bidwright
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 1.02, letterSpacing: -2 }}>
          <span>Proposals that read like you</span>
          <span style={{ display: "flex" }}>
            <span style={{ background: "#ffe14d", padding: "0 12px", fontStyle: "italic" }}>studied the job.</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 26, color: "#3c4253", fontFamily: "sans-serif" }}>
          <span>LangGraph agent</span>
          <span>·</span>
          <span>Gemini</span>
          <span>·</span>
          <span>critique → revise → human approval</span>
        </div>
      </div>
    ),
    size,
  );
}
