import type { ReactNode } from "react";

/**
 * The greeting at the top of a portal's home: a soft gradient field with slow-drifting colour
 * shapes, the one sentence that matters today, up to two actions, and an optional photo card.
 * Neutral turns it black through the --hero-* tokens.
 */
export function Hero({
  kicker,
  title,
  children,
  actions,
  photo,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  photo?: { src: string; alt: string; caption: ReactNode };
}) {
  return (
    <header
      className="relative isolate grid animate-pop items-center gap-6 overflow-hidden rounded-[28px] px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_330px]"
      style={{ background: "var(--hero-bg)", color: "var(--hero-text)" }}
    >
      <span aria-hidden className="absolute -top-24 right-[240px] -z-10 h-52 w-52 animate-drift rounded-full opacity-80" style={{ background: "var(--level-1-tint)" }} />
      <span aria-hidden className="absolute -bottom-10 right-[280px] -z-10 h-24 w-24 animate-drift rounded-full [animation-direction:reverse] [animation-duration:12s]" style={{ background: "var(--level-5-tint)" }} />
      <span aria-hidden className="absolute -bottom-16 left-[42%] -z-10 h-36 w-36 animate-drift rounded-full opacity-70 [animation-duration:19s]" style={{ background: "var(--level-2-tint)" }} />

      <div className="min-w-0">
        {kicker && <p className="text-sm" style={{ color: "var(--hero-muted)" }}>{kicker}</p>}
        <h1 className="mt-1.5 text-balance text-[34px] font-medium leading-[1.02] tracking-[-0.04em] sm:text-[44px] xl:text-[52px]">{title}</h1>
        {children && <div className="mt-3 max-w-[46ch] text-[17px] leading-relaxed" style={{ color: "var(--hero-muted)" }}>{children}</div>}
        {actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}
      </div>

      {photo && (
        <figure className="m-0 hidden rotate-[2.5deg] overflow-hidden rounded-[22px] bg-surface text-text-primary shadow-float transition-transform duration-500 hover:rotate-0 hover:scale-[1.02] lg:block">
          <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" className="h-[200px] w-full object-cover object-[center_35%] xl:h-[220px]" />
          <figcaption className="px-4 pb-4 pt-3 text-[13.5px] text-text-secondary">{photo.caption}</figcaption>
        </figure>
      )}
    </header>
  );
}
