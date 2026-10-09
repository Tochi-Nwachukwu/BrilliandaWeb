"use client";

import { CODE_LIFETIME_SECONDS, RESEND_AFTER_SECONDS, verifyCodeSchema } from "@brillianda/core";
import { Button, TextField, toast } from "@brillianda/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { authLinkClass } from "@/components/auth/styles";
import { FormError, useFocusOnFailure } from "@/components/auth/FormError";
import { resendSignupCode, verifySignupEmail } from "@/data/actions/signup";
import { errorsFor, firstErrors, type Errors } from "@/lib/form";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Ticks once a second. Null until the page is running, so server and browser render the same. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Screen 3: the 6-digit code from the email. */
export function VerifyForm({ email, codeSentAt }: { email: string; codeSentAt: number }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const [sentAt, setSentAt] = useState(codeSentAt);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();
  const now = useNow();
  useFocusOnFailure(formRef, attempt);

  const elapsed = now === null ? 0 : Math.max(0, Math.floor((now - sentAt) / 1000));
  const expiresIn = Math.max(0, CODE_LIFETIME_SECONDS - elapsed);
  const resendIn = Math.max(0, RESEND_AFTER_SECONDS - elapsed);
  const expired = now !== null && expiresIn === 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const problems = errorsFor(verifyCodeSchema, { code });
    if (problems) {
      setErrors(problems);
      setAttempt((n) => n + 1);
      return;
    }
    startTransition(async () => {
      const result = await verifySignupEmail({ code });
      if (result.ok) return router.push("/signup/address");
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
      setAttempt((n) => n + 1);
    });
  };

  const resend = () =>
    startResend(async () => {
      const result = await resendSignupCode();
      if (result.ok && result.data.codeSentAt) {
        setSentAt(result.data.codeSentAt);
        setCode("");
        setErrors({});
        toast(`New code sent to ${email}`);
      } else if (!result.ok) {
        setFailure(result.error);
      }
    });

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <TextField
        label="6-digit code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        data-focus-on-failure
        className="[&_input]:text-center [&_input]:text-2xl [&_input]:font-medium [&_input]:tracking-[0.5em]"
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
          if (errors.code) setErrors({});
        }}
        error={errors.code}
        hint={now === null ? undefined : expired ? "This code has expired. Ask for a new one below." : `The code expires in ${clock(expiresIn)}.`}
      />

      <div className="mt-8">
        <FormError message={failure} />
        <Button type="submit" size="lg" className="w-full" loading={pending} disabled={expired}>
          {pending ? "Checking…" : "Confirm email"}
        </Button>
      </div>

      <div className="mt-5 grid gap-2 text-center text-sm text-text-secondary">
        <p>
          No email? Check spam, or{" "}
          {resendIn > 0 ? (
            <span>ask for a new code in {clock(resendIn)}</span>
          ) : (
            <button type="button" onClick={resend} disabled={resending} className={authLinkClass}>
              {resending ? "sending…" : "send a new code"}
            </button>
          )}
          .
        </p>
        <p>
          Wrong address?{" "}
          <Link href="/signup/account" className={authLinkClass}>
            Change your email
          </Link>
        </p>
      </div>
    </form>
  );
}
