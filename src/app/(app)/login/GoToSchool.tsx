"use client";

import { normaliseSubdomain, subdomainProblem, SUBDOMAIN_MAX } from "@brillianda/core/subdomain";
import { Button } from "@brillianda/ui/Button";
import { cx } from "@brillianda/ui/cx";
import { useId, useState, type FormEvent } from "react";

/**
 * For people who know their school's address: type it, go to its sign-in page. On the school
 * domain (or *.localhost) that's the school's own address; anywhere else (a vercel.app link) the
 * /s/<school> pages.
 */
export function GoToSchool({ root }: { root: string }) {
  const id = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const go = (event: FormEvent) => {
    event.preventDefault();
    const school = normaliseSubdomain(name);
    const problem = school ? subdomainProblem(school) : { message: "Type your school’s address" };
    if (problem) return setError(problem.message);
    const { protocol, hostname, port } = window.location;
    const onOurDomain = hostname === root || hostname.endsWith(`.${root}`) || hostname === "localhost";
    const base = hostname === "localhost" ? "localhost" : root;
    window.location.assign(onOurDomain ? `${protocol}//${school}.${base}${port ? `:${port}` : ""}/login` : `/s/${school}/login`);
  };

  return (
    <form onSubmit={go} noValidate className="mb-8">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        Your school’s address
      </label>
      <div className="flex gap-2">
        <div
          className={cx(
            "flex min-h-[46px] min-w-0 flex-1 items-center rounded-[14px] transition-colors focus-within:ring-2",
            error ? "bg-danger-bg ring-2 ring-danger" : "bg-sunken hover:bg-hover focus-within:bg-surface focus-within:ring-accent",
          )}
        >
          <input
            id={id}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={SUBDOMAIN_MAX + 5}
            placeholder="greenfield"
            value={name}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className="min-w-0 flex-1 border-0 bg-transparent py-3 pl-4 text-base outline-hidden"
          />
          <span aria-hidden className="shrink-0 truncate pr-4 text-sm text-text-secondary">
            .{root}
          </span>
        </div>
        <Button type="submit" size="lg">
          Go
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
      <p className="mt-6 text-sm text-text-secondary">Don’t know it? We’ll email you a link to each of your schools:</p>
    </form>
  );
}
