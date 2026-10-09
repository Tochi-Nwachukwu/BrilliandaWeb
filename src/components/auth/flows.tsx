"use client";

import { Button } from "@brillianda/ui/Button";
import { PasswordField } from "@brillianda/ui/PasswordField";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { firstErrors, type Errors } from "@/lib/form";
import type { ActionResult } from "@/data/types";
import { FormError, useFocusOnFailure } from "./FormError";
import { NewPasswordForm } from "./forms";

/** Choose a new password from a reset link; then say it worked and offer sign in. */
export function ResetPasswordFlow({ action, signInHref }: { action: (input: unknown) => Promise<ActionResult<null>>; signInHref: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <div role="status" className="grid gap-6">
        <p className="text-sm leading-relaxed text-text-secondary">Your password is changed and you’ve been signed out everywhere else. Sign in with the new one.</p>
        <Button size="lg" className="w-full" onClick={() => router.replace(signInHref)}>
          Sign in
        </Button>
      </div>
    );
  }
  return <NewPasswordForm action={action} submitLabel="Change password" pendingLabel="Changing…" onDone={() => setDone(true)} />;
}

/** A sign-in link is used by pressing this button, not by opening the page. */
export function LinkSignIn({ action, homeHref }: { action: () => Promise<ActionResult<null>>; homeHref: string }) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <FormError message={failure} />
      <Button
        size="lg"
        className="w-full"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await action();
            if (result.ok) router.replace(homeHref);
            else setFailure(result.error);
          })
        }
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </div>
  );
}

/** Joining a school: a new password, or the existing Brillianda password for someone already in another school. */
export function AcceptInviteFlow({ action, homeHref, hasAccount }: { action: (input: unknown) => Promise<ActionResult<null>>; homeHref: string; hasAccount: boolean }) {
  const router = useRouter();
  const done = () => router.replace(homeHref);
  if (!hasAccount) return <NewPasswordForm action={action} submitLabel="Join the school" pendingLabel="Setting up…" onDone={done} />;
  return <ExistingAccountForm action={action} onDone={done} />;
}

function ExistingAccountForm({ action, onDone }: { action: (input: unknown) => Promise<ActionResult<null>>; onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();
  useFocusOnFailure(formRef, attempt);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await action({ password, hasAccount: true });
      if (result.ok) return onDone();
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
      setAttempt((n) => n + 1);
    });
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <PasswordField
        label="Your Brillianda password"
        name="password"
        autoComplete="current-password"
        hint="You already use Brillianda at another school. Same password."
        data-focus-on-failure
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (errors.password) setErrors({});
        }}
        error={errors.password}
      />
      <div className="mt-6">
        <FormError message={failure} />
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {pending ? "Joining…" : "Join the school"}
        </Button>
      </div>
    </form>
  );
}
