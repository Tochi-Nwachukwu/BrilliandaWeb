import { validateTrialRequest as validate, type TrialErrors, type TrialRequest } from "@brillianda/core";
import { requestTrial } from "@/data/actions/trial";

// The "request a trial" form, kept from the old site so the page looks and works the same. v1
// adds self-serve signup (/signup); whether this form stays is decided with the site's new copy.

type Errors = TrialErrors;

function readForm(form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form);
  const values: Record<string, unknown> = {};
  for (const [key, value] of data.entries()) {
    if (key === "interests") continue;
    values[key] = value;
  }
  values.interests = data.getAll("interests").map(String);
  return values;
}

function showErrors(form: HTMLFormElement, errors: Errors): void {
  for (const slot of form.querySelectorAll<HTMLElement>("[data-err]")) {
    const field = slot.dataset.err as keyof TrialRequest;
    const message = errors[field] ?? "";
    slot.textContent = message;
    const input = form.elements.namedItem(field as string);
    if (input instanceof HTMLElement) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }
}

export function initTrialForm(): void {
  const form = document.querySelector<HTMLFormElement>("#trial-form");
  const done = document.querySelector<HTMLElement>("#trial-done");
  if (!form) return;

  const button = form.querySelector<HTMLButtonElement>("[data-submit]");
  const banner = form.querySelector<HTMLElement>("[data-form-message]");

  const setBanner = (text: string): void => {
    if (!banner) return;
    banner.textContent = text;
    banner.hidden = !text;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBanner("");

    const values = readForm(form);
    const errors = validate(values);
    showErrors(form, errors);

    const firstBad = Object.keys(errors)[0];
    if (firstBad) {
      const input = form.elements.namedItem(firstBad);
      if (input instanceof HTMLElement) input.focus();
      setBanner("Please check the highlighted fields.");
      return;
    }

    const payload = {
      ...values,
      phone: String(values.phone ?? "").replace(/[\s-]/g, ""),
      studentCount: Number(String(values.studentCount ?? "").replace(/,/g, "")),
    };

    if (button) {
      button.disabled = true;
      const label = button.querySelector("span:not(.fill)");
      if (label) label.textContent = "Sending…";
    }

    try {
      const result = await requestTrial(payload);
      if (!result.ok) {
        setBanner(result.error);
        return;
      }

      form.hidden = true;
      if (done) {
        done.hidden = false;
        done.setAttribute("tabindex", "-1");
        done.focus();
      }
    } catch {
      setBanner("No connection. Please try again, or email hello@brillianda.com.");
    } finally {
      if (button) {
        button.disabled = false;
        const label = button.querySelector("span:not(.fill)");
        if (label) label.textContent = "Send the request";
      }
    }
  });

  // Clear a field's error as soon as it is corrected.
  form.addEventListener("input", (event) => {
    const target = event.target as HTMLElement & { name?: string };
    if (!target?.name) return;
    const slot = form.querySelector<HTMLElement>(`[data-err="${target.name}"]`);
    if (slot?.textContent) {
      slot.textContent = "";
      target.removeAttribute("aria-invalid");
    }
  });
}
