"use client";

import { Button } from "@brillianda/ui/Button";
import { PasswordField } from "@brillianda/ui/PasswordField";
import { TextField } from "@brillianda/ui/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { FormError, useFocusOnFailure } from "@/components/auth/FormError";
import { checkLater, firstErrors, type Errors } from "@/lib/form";
import type { ActionResult } from "@/data/types";

/** Email and password at one school. A wrong password and an unknown email read the same. */
export function SignInForm({
  school,
  action,
  samples,
}: {
  school: string;
  action: (input: unknown) => Promise<ActionResult<null>>;
  /** FAKE ONLY: one-tap sample accounts. */
  samples: { label: string; email: string; password: string }[] | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();
  useFocusOnFailure(formRef, attempt);

  const send = (input: { email: string; password: string }) =>
    startTransition(async () => {
      const result = await action(input);
      if (result.ok) {
        router.replace(`/s/${school}`);
        return;
      }
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
      setAttempt((n) => n + 1);
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const problems = await checkLater(() => import("@brillianda/core/auth").then((m) => m.signInSchema), values);
    if (problems) {
      setErrors(problems);
      setAttempt((n) => n + 1);
      return;
    }
    send(values);
  };

  const set = (field: keyof typeof values) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <div className="space-y-5">
        <TextField label="Email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={values.email} onChange={(e) => set("email")(e.target.value)} error={errors.email} />
        <div>
          <PasswordField label="Password" name="password" autoComplete="current-password" data-focus-on-failure value={values.password} onChange={(e) => set("password")(e.target.value)} error={errors.password} />
          <div className="mt-2 text-right">
            <Link
              href={`/s/${school}/forgot-password`}
              className="rounded text-sm text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <FormError message={failure} />
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </div>
      {samples && (
        <div className="mt-8 rounded-2xl bg-sunken p-4">
          <p className="text-sm font-semibold">Sample accounts</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            For looking around while the backend is being built. Password: <code>{samples[0]?.password}</code>
          </p>
          <div className="mt-3 grid gap-2">
            {samples.map((account) => (
              <Button key={account.email} variant="secondary" size="sm" disabled={pending} onClick={() => send({ email: account.email, password: account.password })}>
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
