"use client";

import { ownerAccountSchema } from "@brillianda/core";
import { Button, PasswordField, TextField } from "@brillianda/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { authLinkClass } from "@/components/auth/styles";
import { FormError, useFocusOnFailure } from "@/components/auth/FormError";
import { saveOwnerAccount } from "@/data/actions/signup";
import { errorsFor, firstErrors, type Errors } from "../form";

/** Screen 2: the owner's account. The email becomes the school's primary email. */
export function OwnerForm({ saved }: { saved: { fullName: string; email: string; phone?: string } | null }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({
    fullName: saved?.fullName ?? "",
    email: saved?.email ?? "",
    password: "",
    phone: saved?.phone ? `0${saved.phone.slice(4)}` : "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();
  useFocusOnFailure(formRef, attempt);

  const set = (field: keyof typeof values) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const problems = errorsFor(ownerAccountSchema, values);
    if (problems) {
      setErrors(problems);
      setAttempt((n) => n + 1);
      return;
    }
    startTransition(async () => {
      const result = await saveOwnerAccount(values);
      if (result.ok) return router.push("/signup/verify");
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
      setAttempt((n) => n + 1);
    });
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <div className="space-y-5">
        <TextField label="Your full name" name="fullName" autoComplete="name" value={values.fullName} onChange={(e) => set("fullName")(e.target.value)} error={errors.fullName} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          hint="We’ll send a code here. It becomes your school’s main email."
          value={values.email}
          onChange={(e) => set("email")(e.target.value)}
          error={errors.email}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          hint={saved ? "Enter it again to continue. At least 8 characters." : "At least 8 characters."}
          value={values.password}
          onChange={(e) => set("password")(e.target.value)}
          error={errors.password}
        />
        <TextField
          label="Your phone (optional)"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0803 000 0001"
          value={values.phone}
          onChange={(e) => set("phone")(e.target.value)}
          error={errors.phone}
        />
      </div>
      <div className="mt-8">
        <FormError message={failure} />
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {pending ? "Sending your code…" : "Continue"}
        </Button>
        <p className="mt-4 text-center text-sm text-text-secondary">
          <Link href="/signup" className={authLinkClass}>
            Back to your school
          </Link>
        </p>
      </div>
    </form>
  );
}
