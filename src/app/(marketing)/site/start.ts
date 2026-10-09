// Wires the page together (from the old site's main.ts). Order matters only for the intro, which
// must clear before the hero starts moving.

import { initGrid } from "./grid";
import { initCounters, initCursor, initNav, initParallax, initPinnedTour, initReveals, initStats, initVoices } from "./motion";
import { initTheme } from "./theme";
import { initTrialForm } from "./trialForm";
import { INTRO_KEY } from "./head-script";

function markSeen(): void {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    // The intro simply plays again next time.
  }
}

/**
 * The intro plays on a first visit only, and never on a return. The <head> script has already
 * marked a return visit (`intro-skip` on <html>) so the intro never shows before this runs.
 */
function runIntro(onDone: () => void): void {
  const intro = document.getElementById("intro");
  const skip = document.documentElement.classList.contains("intro-skip") || matchMedia("(prefers-reduced-motion: reduce)").matches;

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

let started = false;

export function startSite(): void {
  // React runs effects twice in development; the page must only be wired once.
  if (started) return;
  started = true;

  initTheme();

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
