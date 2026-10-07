// All the page's movement. Everything here is decoration: with reduced motion, a small screen or
// no JavaScript, the page still reads top to bottom.

const reduced = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reveals `.lm` and `.fu` elements the first time they come into view. */
export function initReveals(): void {
  const targets = document.querySelectorAll<HTMLElement>(".lm, .fu");

  if (reduced() || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
  );

  targets.forEach((el) => {
    // Anything already on the first screen is revealed outright. The observer's bottom margin
    // would otherwise hold back the hero's buttons until a scroll that never comes.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add("is-in");
      return;
    }
    observer.observe(el);
  });
}

/** The header: hidden at the very top of the hero, solid once you scroll past it. */
export function initNav(): void {
  const nav = document.getElementById("nav");
  const hero = document.getElementById("hero");
  if (!nav) return;

  nav.classList.add("up");

  const darkSections = Array.from(document.querySelectorAll<HTMLElement>(".hero, .bleed, .soon, .start"));

  const update = (): void => {
    const y = window.scrollY;
    const stuck = y > (hero?.offsetHeight ?? 600) * 0.6;
    nav.classList.toggle("stuck", stuck);

    // Pale logo and links while the header sits over a dark band — but not once the header has
    // its own pale background, or the two would cancel each other out.
    const line = y + nav.offsetHeight / 2;
    const overDark = darkSections.some((s) => {
      const top = s.offsetTop;
      return line >= top && line <= top + s.offsetHeight;
    });
    nav.classList.toggle("over-dark", overDark && !stuck);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

/**
 * Counts one number up. Reads its target from `data-count`, and optionally
 * `data-suffix` ("%"), `data-decimals` ("1" for 78.4), `data-delay` (ms) and `data-zero`
 * (a word to print instead of the number, e.g. "One").
 */
export function runCounter(el: HTMLElement): void {
  const target = Number(el.dataset.count ?? "0");
  const suffix = el.dataset.suffix ?? "";
  const decimals = Number(el.dataset.decimals ?? "0");
  const zero = el.dataset.zero;
  const show = (value: number): void => {
    el.textContent = `${value.toFixed(decimals)}${suffix}`;
  };

  if (zero && target === 0) {
    el.textContent = zero;
    return;
  }
  if (reduced()) {
    show(target);
    return;
  }

  const begin = (): void => {
    const started = performance.now();
    const step = (now: number): void => {
      const p = Math.min((now - started) / 1400, 1);
      show(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const delay = Number(el.dataset.delay ?? "0");
  if (delay > 0) window.setTimeout(begin, delay);
  else begin();
}

/** Counts each standalone number up once, when its row is reached. */
export function initCounters(): void {
  // Numbers inside a stats panel are started by that panel, so they stay in step with its bars.
  const nums = [...document.querySelectorAll<HTMLElement>("[data-count]")].filter(
    (el) => !el.closest("[data-stats]"),
  );
  if (!nums.length) return;

  if (!("IntersectionObserver" in window)) {
    nums.forEach(runCounter);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        runCounter(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.6 },
  );
  nums.forEach((el) => observer.observe(el));
}

/**
 * Panels of figures — the entry-status bars and the report card. When one comes into view it
 * gets `.stats-in`, which the stylesheet uses to fill the bars, land the pills and draw the
 * tick, and its numbers start counting at the same moment. Once only: these are a first
 * impression, not a loop.
 */
export function initStats(): void {
  const panels = document.querySelectorAll<HTMLElement>("[data-stats]");
  if (!panels.length) return;

  const start = (panel: HTMLElement): void => {
    panel.classList.add("stats-in");
    panel.querySelectorAll<HTMLElement>("[data-count]").forEach(runCounter);
  };

  if (!("IntersectionObserver" in window)) {
    panels.forEach(start);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        start(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.35 },
  );
  panels.forEach((el) => observer.observe(el));
}

/** The photo in the full-bleed band drifts a little slower than the page. */
export function initParallax(): void {
  const layers = document.querySelectorAll<HTMLElement>("[data-parallax]");
  if (!layers.length || reduced()) return;

  let ticking = false;
  const update = (): void => {
    ticking = false;
    for (const layer of layers) {
      const box = layer.parentElement?.getBoundingClientRect();
      if (!box || box.bottom < 0 || box.top > window.innerHeight) continue;
      const progress = (box.top + box.height / 2 - window.innerHeight / 2) / window.innerHeight;
      layer.style.transform = `translate3d(0, ${(progress * -7).toFixed(2)}%, 0)`;
    }
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

/**
 * "A look inside": on a wide screen the section holds still while its three cards travel
 * sideways. On phones, or with reduced motion, the CSS turns the track into a plain stack and
 * this does nothing (DECISIONS.md D-11).
 */
export function initPinnedTour(): void {
  const section = document.querySelector<HTMLElement>("[data-pin]");
  const track = document.querySelector<HTMLElement>("[data-track]");
  const indexLabel = document.querySelector<HTMLElement>("[data-tour-index]");
  if (!section || !track) return;

  const stacked = (): boolean => matchMedia("(max-width: 900px)").matches || reduced();

  let distance = 0;

  const measure = (): void => {
    if (stacked()) {
      section.style.height = "";
      track.style.transform = "";
      distance = 0;
      return;
    }
    distance = Math.max(track.scrollWidth - window.innerWidth + 80, 0);
    section.style.height = `${window.innerHeight + distance}px`;
  };

  const update = (): void => {
    if (!distance) return;
    const box = section.getBoundingClientRect();
    const progress = Math.min(Math.max(-box.top / distance, 0), 1);
    track.style.transform = `translate3d(${-(progress * distance).toFixed(2)}px, 0, 0)`;

    if (indexLabel) {
      const card = 1 + Math.round(progress * (track.children.length - 1));
      indexLabel.textContent = String(card).padStart(2, "0");
    }
  };

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    },
    { passive: true },
  );
  window.addEventListener("resize", () => {
    measure();
    update();
  });

  measure();
  update();
}

/**
 * The round cursor. It appears only over a button or link, so ordinary scrolling and reading are
 * untouched, and the buttons lean slightly towards the pointer while it is over them.
 */
export function initCursor(): void {
  const dot = document.getElementById("cursor");
  if (!dot || reduced() || matchMedia("(hover: none)").matches) return;

  let x = 0;
  let y = 0;
  let cx = 0;
  let cy = 0;
  let visible = false;
  let frame = 0;

  const loop = (): void => {
    cx += (x - cx) * 0.22;
    cy += (y - cy) * 0.22;
    dot.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
    frame = visible ? requestAnimationFrame(loop) : 0;
  };

  const show = (): void => {
    if (visible) return;
    visible = true;
    cx = x;
    cy = y;
    dot.classList.add("on");
    frame = requestAnimationFrame(loop);
  };

  const hide = (): void => {
    visible = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    dot.classList.remove("on");
  };

  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;

      const target = (event.target as Element | null)?.closest<HTMLElement>("a, button");
      if (target) {
        show();
        magnetise(target, event);
      } else {
        hide();
      }
    },
    { passive: true },
  );

  document.addEventListener("pointerleave", hide);
}

const magnetised = new WeakSet<HTMLElement>();

/** A button nudges towards the pointer, and settles back when it leaves. */
function magnetise(el: HTMLElement, event: PointerEvent): void {
  if (!el.classList.contains("btn") && !el.classList.contains("v-btn") && !el.classList.contains("tbtn")) return;

  const box = el.getBoundingClientRect();
  const dx = (event.clientX - (box.left + box.width / 2)) * 0.22;
  const dy = (event.clientY - (box.top + box.height / 2)) * 0.34;
  el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
  el.style.willChange = "transform";

  if (magnetised.has(el)) return;
  magnetised.add(el);
  el.addEventListener("pointerleave", () => {
    el.style.transition = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
    el.style.transform = "";
    window.setTimeout(() => {
      el.style.transition = "";
      el.style.willChange = "";
    }, 520);
  });
  el.addEventListener("pointerenter", () => {
    el.style.transition = "";
  });
}

/** The three sample quotes. */
export function initVoices(): void {
  const root = document.querySelector<HTMLElement>("[data-voices]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll<HTMLElement>(".v-slide"));
  const now = document.querySelector<HTMLElement>("[data-v-now]");
  let index = 0;

  const show = (next: number): void => {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== index;
    });
    if (now) now.textContent = String(index + 1).padStart(2, "0");
  };

  root.querySelector("[data-v-prev]")?.addEventListener("click", () => show(index - 1));
  root.querySelector("[data-v-next]")?.addEventListener("click", () => show(index + 1));
  show(0);
}
