"use client";

import { normaliseSubdomain, subdomainProblem, SUBDOMAIN_MAX } from "@brillianda/core/subdomain";
import { Button } from "@brillianda/ui/Button";
import { cx } from "@brillianda/ui/cx";
import { PasswordField } from "@brillianda/ui/PasswordField";
import { TextField } from "@brillianda/ui/TextField";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";

/**
 * Sign in from the main site: the school's address, email and password. Sessions belong to each
 * school's own address, so the form posts there (…/auth/sign-in), which signs in and opens the
 * school. "Find your school" is a line underneath, for people who don't know the address.
 */
export function MainSignIn({ root, findSchool }: { root: string; findSchool: ReactNode }) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [school, setSchool] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ school?: string; email?: string; password?: string }>({});
  const [finding, setFinding] = useState(false);
  const [sending, setSending] = useState(false);

  // The school's own address on our domain (or *.localhost); its /s/<school> pages anywhere else.
  const schoolUrl = (name: string) => {
    const { protocol, hostname, port } = window.location;
    const ours = hostname === root || hostname.endsWith(`.${root}`) || hostname === "localhost";
    const base = hostname === "localhost" ? "localhost" : root;
    return ours ? `${protocol}//${name}.${base}${port ? `:${port}` : ""}` : `/s/${name}`;
  };
  const checkSchool = (): { ok: true; name: string } | { ok: false; problem: string } => {
    const name = normaliseSubdomain(school);
    const problem = name ? subdomainProblem(name) : { message: "Type your school’s address" };
    return problem || !name ? { ok: false, problem: problem?.message ?? "Type your school’s address" } : { ok: true, name };
  };

  const submit = (event: FormEvent) => {
    const found = checkSchool();
    const next = {
      school: found.ok ? undefined : found.problem,
      email: /^\S+@\S+\.\S+$/.test(email.trim()) ? undefined : "Enter an email address like name@school.com",
      password: password ? undefined : "Enter your password",
    };
    if (!found.ok || next.email || next.password) {
      event.preventDefault();
      setErrors(next);
      return;
    }
    // A plain form post to the school's address: the browser follows it there.
    formRef.current!.action = `${schoolUrl(found.name)}/auth/sign-in`;
    setSending(true);
  };

  const forgot = () => {
    const found = checkSchool();
    if (!found.ok) return setErrors((e) => ({ ...e, school: "Type your school’s address first" }));
    // A full page load: the school's address is another host.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${schoolUrl(found.name)}/forgot-password`;
  };

  return (
    <>
      <form ref={formRef} method="post" onSubmit={submit} noValidate>
        <div className="space-y-5">
          <div>
            <label htmlFor={`${id}-school`} className="mb-1.5 block text-sm font-medium">
              Your school’s address
            </label>
            <div
              className={cx(
                "flex min-h-[46px] min-w-0 items-center rounded-[14px] transition-colors focus-within:ring-2",
                errors.school ? "bg-danger-bg ring-2 ring-danger" : "bg-sunken hover:bg-hover focus-within:bg-surface focus-within:ring-accent",
              )}
            >
              <input
                id={`${id}-school`}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={SUBDOMAIN_MAX + 5}
                placeholder="greenfield"
                value={school}
                aria-invalid={errors.school ? true : undefined}
                aria-describedby={errors.school ? `${id}-school-error` : undefined}
                onChange={(e) => (setSchool(e.target.value), setErrors((x) => ({ ...x, school: undefined })))}
                className="min-w-0 flex-1 border-0 bg-transparent py-3 pl-4 text-base outline-hidden"
              />
              <span aria-hidden className="shrink-0 truncate pr-4 text-sm text-text-secondary">
                .{root}
              </span>
            </div>
            {errors.school && (
              <p id={`${id}-school-error`} className="mt-1.5 text-sm text-danger">
                {errors.school}
              </p>
            )}
          </div>
          <TextField label="Email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => (setEmail(e.target.value), setErrors((x) => ({ ...x, email: undefined })))} error={errors.email} />
          <div>
            <PasswordField label="Password" name="password" autoComplete="current-password" value={password} onChange={(e) => (setPassword(e.target.value), setErrors((x) => ({ ...x, password: undefined })))} error={errors.password} />
            <div className="mt-2 text-right">
              <button type="button" onClick={forgot} className="rounded text-sm text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
                Forgot your password?
              </button>
            </div>
          </div>
        </div>
        <Button type="submit" size="lg" className="mt-6 w-full" loading={sending}>
          {sending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 text-sm text-text-secondary">
        {finding ? (
          findSchool
        ) : (
          <p>
            Don’t know your school’s address?{" "}
            <button type="button" onClick={() => setFinding(true)} className="font-medium text-text-primary underline underline-offset-4 hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
              Find your school
            </button>
          </p>
        )}
      </div>
    </>
  );
}
