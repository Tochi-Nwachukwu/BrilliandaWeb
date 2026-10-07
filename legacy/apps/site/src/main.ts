// Wires the page together. Order matters only for the intro, which must clear before the hero
// starts moving.

import { initGrid } from "./grid";
import {
  initCounters,
  initCursor,
  initNav,
  initParallax,
  initPinnedTour,
  initReveals,
  initStats,
  initVoices,
} from "./motion";
import { initTheme } from "./theme";
import { initTrialForm } from "./trialForm";

const INTRO_KEY = "brillanda-seen";

// In development the app runs beside the site on its own port, so "Sign in" works with no setup.
// A production build with no VITE_APP_URL keeps the plain /login path, for a single-domain deploy.
const DEV_APP_URL = "http://localhost:5173";

/** Where the app lives, for "Sign in". */
function wireAppLinks(): void {
  const appUrl = (import.meta.env?.VITE_APP_URL || (import.meta.env?.DEV ? DEV_APP_URL : "")).replace(/\/$/, "");
  if (!appUrl) return;
  for (const link of document.querySelectorAll<HTMLAnchorElement>('#signin, [data-app-link]')) {
    link.href = `${appUrl}/login`;
  }
}

function seenBefore(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    // The intro simply plays again next time.
  }
}

/** The intro plays on a first visit only, and never on a return (DECISIONS.md D-11). */
function runIntro(onDone: () => void): void {
  const intro = document.getElementById("intro");
  const skip = seenBefore() || matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!intro || skip) {
    intro?.remove();
    document.body.classList.remove("is-loading");
    onDone();
    return;
  }

  const bar = intro.querySelector<HTMLElement>(".intro-bar i");
  requestAnimationFrame(() => {
    intro.classList.add("ready");
    if (bar) {
      bar.style.transition = "transform 0.9s cubic-bezier(0.62, 0.05, 0.01, 0.99)";
      bar.style.transform = "scaleX(1)";
    }
  });

  window.setTimeout(() => {
    intro.classList.add("done");
    document.body.classList.remove("is-loading");
    markSeen();
    onDone();
    window.setTimeout(() => intro.remove(), 1100);
  }, 1050);
}

function start(): void {
  initTheme();
  wireAppLinks();

  const year = document.querySelector<HTMLElement>("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  initGrid();
  initTrialForm();
  initVoices();
  initNav();
  initParallax();
  initPinnedTour();
  initCursor();

  runIntro(() => {
    document.getElementById("hero")?.classList.add("go");
    initReveals();
    initCounters();
    initStats();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
