"use client";

import { useSyncExternalStore } from "react";
import { LOOK_KEY } from "./look-script";

/**
 * The app's look: Pastel (default) or Neutral. Remembered on this device for now; it moves to the
 * school's settings once the backend has a place for it. The <head> script applies it before
 * first paint, and the <html> data-theme attribute is the one source of truth.
 */
export type Look = "pastel" | "neutral";

const listeners = new Set<() => void>();

function read(): Look {
  return document.documentElement.dataset.theme === "neutral" ? "neutral" : "pastel";
}

export function setLook(look: Look) {
  try {
    localStorage.setItem(LOOK_KEY, look);
  } catch {
    // Private browsing: the choice lasts until the tab closes.
  }
  if (look === "neutral") document.documentElement.dataset.theme = "neutral";
  else delete document.documentElement.dataset.theme;
  listeners.forEach((listener) => listener());
}

export function useLook(): Look {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => "pastel",
  );
}
