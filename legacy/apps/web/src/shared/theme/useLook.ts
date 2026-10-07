import { create } from "zustand";

/**
 * The app's look: Pastel (default) or Neutral. For now it is remembered on this device; it moves
 * to the school's settings once that endpoint exists (DECISIONS.md D-15). index.html applies the
 * saved choice before first paint.
 */
export type Look = "pastel" | "neutral";

const STORAGE_KEY = "brillanda:look";

function read(): Look {
  try {
    return localStorage.getItem(STORAGE_KEY) === "neutral" ? "neutral" : "pastel";
  } catch {
    return "pastel";
  }
}

function apply(look: Look) {
  if (look === "neutral") document.documentElement.dataset.theme = "neutral";
  else delete document.documentElement.dataset.theme;
}

export const useLook = create<{ look: Look; setLook: (look: Look) => void }>()((set) => ({
  look: read(),
  setLook: (look) => {
    try {
      localStorage.setItem(STORAGE_KEY, look);
    } catch {
      // Private browsing: the choice lasts until the tab closes.
    }
    apply(look);
    set({ look });
  },
}));
