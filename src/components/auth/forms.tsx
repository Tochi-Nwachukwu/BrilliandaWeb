"use client";

import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { PasswordField } from "@brillianda/ui/PasswordField";
import { TextField } from "@brillianda/ui/TextField";
import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { checkLater, firstErrors, type Errors } from "@/lib/form";
import type { ActionResult, SampleEmail } from "@/data/types";
import { FormError, useFocusOnFailure } from "./FormError";

/** FAKE ONLY: the links an email would have carried, so the flow can be clicked through. */
export function SampleLinks({ links }: { links?: { label: string; href: string }[] }) {
  if (!links?.length) return null;
  return (
    <div className="mt-6 rounded-2xl bg-sunken p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Badge tone="warning">Sample data</Badge> No email is sent yet
      </p>
      <p className="mt-1 text-xs text-text-secondary">The email would contain:</p>
      <ul className="mt-3 grid gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-[40px] items-center justify-center rounded-full bg-raise px-4 text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One email field and a button; afterwards the same "check your email" answer whatever happened,
 * so nobody can use it to find out who has an account.
 */
export function EmailRequestForm({
  action,
  submitLabel,
  pendingLabel,
  sent,
}: {
  action: (input: unknown) => Promise<ActionResult<SampleEmail>>;
  submitLabel: string;
  pendingLabel: string;
  /** What to say once it has gone. */
  sent: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<SampleEmail | null>(null);
  const [pending, startTransition] = useTransition();
  useFocusOnFailure(formRef, attempt);

  if (done) {
    return (
      <div role="status">
        <div className="space-y-2 text-sm leading-relaxed text-text-secondary">{sent}</div>
        <SampleLinks links={done.sampleLinks} />
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const problems = await checkLater(() => import("@brillianda/core/auth").then((m) => m.emailOnlySchema), { email });
    if (problems) {
      setErrors(problems);
      setAttempt((n) => n + 1);
      return;
    }
    startTransition(async () => {
      const result = await action({ email });
      if (result.ok) return setDone(result.data);
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
      setAttempt((n) => n + 1);
    });
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        data-focus-on-failure
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (errors.email) setErrors({});
        }}
        error={errors.email}
      />
      <div className="mt-6">
        <FormError message={failure} />
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** A new password typed twice, checked for a match before anything is sent. */
export function NewPasswordForm({
  action,
  submitLabel,
  pendingLabel,
  onDone,
}: {
  action: (input: unknown) => Promise<ActionResult<null>>;
  submitLabel: string;
  pendingLabel: string;
  onDone: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ password: "", confirmation: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();
  useFocusOnFailure(formRef, attempt);

  const set = (field: keyof typeof values) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const problems = await checkLater(() => import("@brillianda/core/auth").then((m) => m.newPasswordSchema), values);
    if (problems) {
      setErrors(problems);
      setAttempt((n) => n + 1);
      return;
    }
    startTransition(async () => {
      const result = await action(values);
      if (result.ok) return onDone();
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
      setAttempt((n) => n + 1);
    });
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <div className="space-y-5">
        <PasswordField label="New password" name="password" autoComplete="new-password" hint="At least 8 characters" value={values.password} onChange={(e) => set("password")(e.target.value)} error={errors.password} />
        <PasswordField label="Type it again" name="confirmation" autoComplete="new-password" value={values.confirmation} onChange={(e) => set("confirmation")(e.target.value)} error={errors.confirmation} />
      </div>
      <div className="mt-6">
        <FormError message={failure} />
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
