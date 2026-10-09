import { brandPalette, schoolInitials } from "@brillianda/core/brand";
import { ImageResponse } from "next/og";
import { getSchoolBySubdomain } from "@/data/school";

const SIZES = new Set([180, 192, 512]);

// The school's app icon: its initials on its colour. `?maskable=1` keeps the letters inside the
// safe circle Android crops to. With a logo, the logo sits on white instead.
export async function GET(request: Request, { params }: RouteContext<"/s/[school]/app-icon/[size]">) {
  const { school, size: sizeText } = await params;
  const size = Number(sizeText);
  const found = await getSchoolBySubdomain(school);
  if (!found || !SIZES.has(size)) return new Response("Not found", { status: 404 });
  const p = brandPalette(found.brandColor);
  const maskable = new URL(request.url).searchParams.has("maskable");
  if (found.logoUrl) {
    const inner = Math.round(size * (maskable ? 0.6 : 0.78));
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFFFF", borderRadius: maskable ? 0 : size * 0.22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- drawn into a PNG, not a page */}
          <img src={found.logoUrl} alt="" width={inner} height={inner} style={{ objectFit: "contain" }} />
        </div>
      ),
      { width: size, height: size, headers: { "cache-control": "public, max-age=3600" } },
    );
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: p.primary, color: p.primaryText, borderRadius: maskable ? 0 : size * 0.22 }}>
        <span style={{ fontSize: size * (maskable ? 0.32 : 0.42), fontWeight: 700, letterSpacing: -size * 0.01 }}>{schoolInitials(found.name)}</span>
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=3600" } },
  );
}
