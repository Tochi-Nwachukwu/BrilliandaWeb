import { brandPalette, schoolInitials } from "@brillianda/core/brand";
import { cx } from "@brillianda/ui/cx";

/**
 * The school's colour on buttons and highlights, everything else in our look (both Pastel and
 * Neutral). Set on the page root so dialogs and toasts, which render outside the page, get it too.
 */
export function BrandStyle({ color }: { color: string }) {
  const p = brandPalette(color);
  const css =
    `:root,:root[data-theme="neutral"]{` +
    `--color-primary:${p.primary};--color-primary-hover:${p.primaryHover};--color-primary-text:${p.primaryText};` +
    `--color-accent:${p.accent};--color-accent-soft:${p.accentSoft};--color-chart:${p.accent}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/** The school's logo, or its initials on its colour when it has none. */
export function SchoolMark({ name, logoUrl, brandColor, className }: { name: string; logoUrl: string | null; brandColor: string; className?: string }) {
  const p = brandPalette(brandColor);
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- a school's own upload, any size; next/image needs known hosts
    return <img src={logoUrl} alt="" className={cx("shrink-0 rounded-xl object-contain", className)} />;
  }
  return (
    <span aria-hidden className={cx("grid shrink-0 place-items-center rounded-xl font-semibold", className)} style={{ background: p.primary, color: p.primaryText }}>
      {schoolInitials(name)}
    </span>
  );
}
