"use client";

import { normaliseSubdomain, subdomainProblem, SUBDOMAIN_MAX } from "@brillianda/core/subdomain";
import { Button } from "@brillianda/ui/Button";
import { cx } from "@brillianda/ui/cx";
import { Spinner } from "@brillianda/ui/Spinner";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { FormError } from "@/components/auth/FormError";
import { checkSubdomain, createSchool } from "@/data/actions/signup";
import type { SubdomainCheck } from "@/data/types";

const DEBOUNCE_MS = 400;

/** Screen 4: the school's address, checked as it is typed. */
export function AddressForm({ suggestions, state }: { suggestions: string[]; state: string }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(suggestions[0] ?? "");
  const [result, setResult] = useState<SubdomainCheck | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subdomain = normaliseSubdomain(name);
  // The rules are checked at once, in the browser; only "is it taken?" needs the server.
  const local = subdomain ? subdomainProblem(subdomain) : null;
  const current = result?.subdomain === subdomain ? result : null;
  const needsServer = !!subdomain && local?.reason !== "invalid";
  // Waiting on the server for the name that is in the box now.
  const checking = needsServer && !current;

  useEffect(() => {
    if (!needsServer) return;
    let live = true;
    const timer = window.setTimeout(async () => {
      const answer = await checkSubdomain(subdomain, state);
      if (live) setResult(answer);
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [subdomain, needsServer, state]);

  const status: { tone: "ok" | "bad" | "quiet"; text: string } = !subdomain
    ? { tone: "quiet", text: "Lowercase letters, numbers and hyphens. 3 to 30 characters." }
    : local?.reason === "invalid"
      ? { tone: "bad", text: local.message }
      : !current
        ? { tone: "quiet", text: "Checking…" }
        : current.available
          ? { tone: "ok", text: `${current.subdomain}.brillianda.com is yours to take` }
          : { tone: "bad", text: current.message };
  const offers = current && !current.available ? current.suggestions : [];
  const canCreate = !!current?.available && !checking;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    if (!canCreate) {
      inputRef.current?.focus();
      return;
    }
    startTransition(async () => {
      const created = await createSchool({ subdomain });
      // A full page load: the school's pages are a different part of the app.
      if (created.ok) window.location.assign(created.data.url);
      else setFailure(created.error);
    });
  };

  const statusId = `${id}-status`;
  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        School address
      </label>
      <div
        className={cx(
          "flex min-h-[46px] items-center rounded-[14px] transition-colors focus-within:ring-2",
          status.tone === "bad" ? "bg-danger-bg ring-2 ring-danger focus-within:ring-danger" : "bg-sunken hover:bg-hover focus-within:bg-surface focus-within:ring-accent",
        )}
      >
        <input
          ref={inputRef}
          id={id}
          name="subdomain"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={SUBDOMAIN_MAX + 5}
          aria-invalid={status.tone === "bad" ? true : undefined}
          aria-describedby={statusId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent py-3 pl-4 text-base outline-hidden"
        />
        <span aria-hidden className="shrink-0 pr-4 text-base text-text-secondary">
          .brillianda.com
        </span>
      </div>
      <p id={statusId} aria-live="polite" className={cx("mt-1.5 flex items-center gap-1.5 text-sm", status.tone === "ok" ? "font-medium text-success" : status.tone === "bad" ? "text-danger" : "text-text-secondary")}>
        {checking && subdomain && <Spinner className="h-3.5 w-3.5" />}
        {status.tone === "ok" && (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
        {status.text}
      </p>

      {offers.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">Try one of these</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {offers.map((offer) => (
              <button
                key={offer}
                type="button"
                onClick={() => setName(offer)}
                className="min-h-[40px] rounded-full bg-raise px-4 text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
              >
                {offer}
              </button>
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 1 && !offers.length && (
        <p className="mt-4 text-sm text-text-secondary">
          Or:{" "}
          {suggestions
            .filter((s) => s !== subdomain)
            .slice(0, 3)
            .map((s, i) => (
              <span key={s}>
                {i > 0 && ", "}
                <button type="button" onClick={() => setName(s)} className="rounded font-medium text-text-primary underline-offset-4 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
                  {s}
                </button>
              </span>
            ))}
        </p>
      )}

      <div className="mt-8">
        <FormError message={failure} />
        <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!canCreate && !pending}>
          {pending ? "Creating your school…" : "Create my school"}
        </Button>
        <p className="mt-3 text-center text-xs leading-relaxed text-text-secondary">
          By creating the school you accept Brillianda’s Terms, including how we handle your school’s data on its behalf.
        </p>
      </div>
    </form>
  );
}
