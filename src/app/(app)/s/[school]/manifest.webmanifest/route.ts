import { brandPalette } from "@brillianda/core/brand";
import { getSchoolBySubdomain } from "@/data/school";

// Each school's own web app manifest (plan: "Add to Home Screen gives an icon called Surebloom
// School"). Served at /s/<school>/manifest.webmanifest; on a school's address that is its root.
export async function GET(_request: Request, { params }: RouteContext<"/s/[school]/manifest.webmanifest">) {
  const { school } = await params;
  const found = await getSchoolBySubdomain(school);
  if (!found || found.status !== "active") return new Response("Not found", { status: 404 });
  const p = brandPalette(found.brandColor);
  const base = `/s/${found.subdomain}`;
  const manifest = {
    name: found.name,
    // Home screens show about 12 characters under an icon.
    short_name: found.name.length <= 12 ? found.name : found.name.split(" ")[0]!.slice(0, 12),
    description: `${found.name} on Brillianda`,
    id: `${base}/`,
    start_url: `${base}`,
    scope: `${base}/`,
    display: "standalone",
    background_color: "#F4F2FA",
    theme_color: p.primary,
    icons: [192, 512].flatMap((size) => [
      { src: `${base}/app-icon/${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" },
      { src: `${base}/app-icon/${size}?maskable=1`, sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" },
    ]),
  };
  return new Response(JSON.stringify(manifest), { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } });
}
