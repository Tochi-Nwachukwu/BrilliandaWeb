"use client";

import { Button } from "@brillianda/ui/Button";
import { PasswordField } from "@brillianda/ui/PasswordField";
import { TextField } from "@brillianda/ui/TextField";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult } from "@/data/types";
import { firstErrors, type Errors } from "@/lib/form";

export function TeamSignInForm({ action }: { action: (input: unknown) => Promise<ActionResult<null>> }) {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setFailure(null);
        startTransition(async () => {
          const result = await action(values);
          if (result.ok) return router.replace("/console");
          setErrors(firstErrors(result.fieldErrors));
          setFailure(result.fieldErrors ? null : result.error);
        });
      }}
    >
      <TextField label="Email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} error={errors.email} />
      <PasswordField label="Password" autoComplete="current-password" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} error={errors.password} />
      <FormError message={failure} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
