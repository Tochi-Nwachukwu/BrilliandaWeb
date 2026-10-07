// Light or dark. The page follows the device until someone presses the toggle, and that choice
// is then remembered.

const KEY = "brillanda-theme";

type Theme = "light" | "dark";

function prefersDark(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
}

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // private browsing, or site data blocked
  }
}

function apply(theme: Theme, label: HTMLElement | null): void {
  document.documentElement.setAttribute("data-theme", theme);
  if (label) label.textContent = theme === "dark" ? "Light" : "Dark";
}

export function initTheme(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
  const label = document.querySelector<HTMLElement>("[data-theme-label]");
  const saved = stored();

  apply(saved ?? (prefersDark() ? "dark" : "light"), label);

  button?.addEventListener("click", () => {
    const next: Theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(next, label);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // nothing to do: the page still looks right for this visit
    }
  });
}
