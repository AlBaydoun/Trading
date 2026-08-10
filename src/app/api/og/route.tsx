import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { siteConfig } from "@/lib/site-config";

export const runtime = "edge";

/**
 * Social preview card generator.
 *
 * Renders on demand and is cached at the edge, so every page gets a bespoke
 * 1200×630 image without anyone opening a design tool. Uses the platform's own
 * palette and geometry rather than a screenshot, which stays legible when the
 * card is scaled down in a timeline.
 *
 *   /api/og?title=Some%20Title&eyebrow=Insights&badge=8%20min%20read
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const title = (searchParams.get("title") ?? siteConfig.seo.defaultTitle).slice(0, 120);
  const eyebrow = (searchParams.get("eyebrow") ?? siteConfig.tagline).slice(0, 60);
  const badge = searchParams.get("badge")?.slice(0, 40) ?? null;

  // Long headlines need a smaller size or they wrap into five cramped lines.
  const titleSize = title.length > 78 ? 54 : title.length > 48 ? 64 : 76;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#04060c",
          backgroundImage:
            "radial-gradient(ellipse 90% 70% at 78% 8%, rgba(91,140,255,0.30) 0%, transparent 60%), radial-gradient(ellipse 70% 60% at 12% 100%, rgba(0,229,176,0.16) 0%, transparent 58%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* Grid lines, drawn as two thin absolute strips rather than a real
            grid — satori has no background-size support. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(91,140,255,0.6), transparent)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 14,
              border: "2px solid rgba(91,140,255,0.55)",
              color: "#5b8cff",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#eef2fb", fontSize: 26, fontWeight: 600 }}>
              {siteConfig.name}
            </span>
            <span style={{ color: "#5c6a86", fontSize: 16, letterSpacing: 1.6 }}>
              {eyebrow.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          {badge && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                marginBottom: 22,
                padding: "8px 16px",
                borderRadius: 999,
                border: "1px solid rgba(0,229,176,0.4)",
                backgroundColor: "rgba(0,229,176,0.10)",
                color: "#00e5b0",
                fontSize: 19,
                letterSpacing: 1.2,
              }}
            >
              {badge}
            </div>
          )}
          <div
            style={{
              color: "#eef2fb",
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.8,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #1c2740",
            paddingTop: 26,
          }}
        >
          <span style={{ color: "#94a1bb", fontSize: 21 }}>
            {siteConfig.url.replace(/^https?:\/\//, "")}
          </span>
          <span style={{ color: "#5c6a86", fontSize: 18 }}>
            Capital at risk
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
