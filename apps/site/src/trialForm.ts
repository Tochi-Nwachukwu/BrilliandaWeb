// The "request a trial" form. There is no self sign-up: a school is created by us after this
// request (BRD FR-6.1, DECISIONS.md D-10), so this form is the only way in from the site.

export type TrialRequest = {
  schoolName: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  studentCount: number;
  state?: string;
  interests: string[];
  message?: string;
  website: string; // honeypot: must stay empty
};

export type Errors = Partial<Record<keyof TrialRequest, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** 11 digits starting 0, or the same number written +234… / 234… */
const PHONE = /^(?:\+?234|0)\d{10}$/;

export function validate(values: Record<string, unknown>): Errors {
  const errors: Errors = {};
  const text = (key: string): string => String(values[key] ?? "").trim();

  if (text("schoolName").length < 2) errors.schoolName = "Tell us the school’s name";
  if (text("contactName").length < 2) errors.contactName = "Tell us your name";
  if (!text("role")) errors.role = "Choose your role";

  const email = text("email");
  if (!email) errors.email = "We need an email to reply to";
  else if (!EMAIL.test(email)) errors.email = "Check this email address";

  const phone = text("phone").replace(/[\s-]/g, "");
  if (!phone) errors.phone = "A phone number, in case email fails";
  else if (!PHONE.test(phone)) errors.phone = "Enter a Nigerian number, e.g. 08012345678";

  const count = text("studentCount").replace(/,/g, "");
  if (!count) errors.studentCount = "Roughly how many students?";
  else if (!/^\d{1,6}$/.test(count) || Number(count) < 1) errors.studentCount = "Enter a number, e.g. 420";

  if (text("message").length > 1000) errors.message = "Please keep this under 1,000 characters";

  return errors;
}

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

function apiBase(): string {
  return (import.meta.env?.VITE_API_URL ?? "").replace(/\/$/, "");
}

/**
 * Stand-in for the API while we are building the front end first (DECISIONS.md D-7, D-12).
 * With no VITE_API_URL set there is nowhere to post, so the request is kept in this browser and
 * the thank-you shown, which lets the whole page be demonstrated. The release build refuses to
 * run without a real endpoint, so a live visitor's request can never land here.
 */
async function holdLocally(payload: unknown): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  try {
    const kept = JSON.parse(localStorage.getItem("brillanda-trial-requests") ?? "[]") as unknown[];
    kept.push({ ...(payload as object), at: new Date().toISOString() });
    localStorage.setItem("brillanda-trial-requests", JSON.stringify(kept));
  } catch {
    // Nothing to keep it in; the demo still completes.
  }
  console.info("[brillanda] trial request held locally — no API configured", payload);
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
      const base = apiBase();
      if (!base) {
        await holdLocally(payload);
        form.hidden = true;
        if (done) {
          done.hidden = false;
          done.setAttribute("tabindex", "-1");
          done.focus();
        }
        return;
      }

      const response = await fetch(`${base}/api/v1/trial-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setBanner(
          response.status === 429
            ? "That is a lot of requests from this connection. Please try again in a few minutes."
            : "We could not send that. Please try again, or email hello@brillanda.com.",
        );
        return;
      }

      form.hidden = true;
      if (done) {
        done.hidden = false;
        done.setAttribute("tabindex", "-1");
        done.focus();
      }
    } catch {
      setBanner("No connection. Please try again, or email hello@brillanda.com.");
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
