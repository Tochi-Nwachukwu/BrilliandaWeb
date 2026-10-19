"use client";

import { PHOTO_SIZE } from "@brillianda/core/profile";
import { ROLE_LABEL } from "@brillianda/core/auth";
import { Button } from "@brillianda/ui/Button";
import { Icon } from "@brillianda/ui/Icon";
import { PasswordField } from "@brillianda/ui/PasswordField";
import { TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { FormError, useFocusOnFailure } from "@/components/auth/FormError";
import { Avatar } from "@/components/shell/AppShell";
import type { ActionResult, MyProfile } from "@/data/types";
import { checkLater, firstErrors, type Errors } from "@/lib/form";

type Act<T = unknown> = (input: T) => Promise<ActionResult<null>>;

/**
 * My profile, the same in every dashboard: photo, name, the email and phone the school holds (shown,
 * not edited), and the password. Where the API can't save yet, everything shows read-only.
 */
export function ProfileView({
  profile,
  schoolName,
  backHref,
  save,
  savePhoto,
  changePassword,
}: {
  profile: MyProfile;
  schoolName: string;
  backHref: string;
  save: Act;
  savePhoto: Act<string | null>;
  changePassword: Act;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={backHref}
        aria-label="Back"
        className="mb-5 grid h-11 w-11 place-items-center rounded-full bg-surface shadow-raised transition-colors hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Icon name="back" className="h-5 w-5" />
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {ROLE_LABEL[profile.role]} at {schoolName}
      </p>
      {!profile.editable && (
        <p className="mt-4 rounded-2xl bg-sunken px-4 py-3 text-sm text-text-secondary">Changing your profile isn’t connected yet. For now it shows what the school has.</p>
      )}

      <section aria-label="Your details" className="mt-6">
        <Photo profile={profile} save={savePhoto} />
        <DetailsForm profile={profile} save={save} />
      </section>

      {profile.editable && <PasswordForm save={changePassword} />}
    </div>
  );
}

/** Picks a picture, crops it to a centred square and shrinks it to a small JPEG in the browser. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PHOTO_SIZE;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

function Photo({ profile, save }: { profile: MyProfile; save: Act<string | null> }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const name = `${profile.firstName} ${profile.lastName}`;

  const send = (photo: string | null) =>
    startTransition(async () => {
      const result = await save(photo);
      if (result.ok) toast(photo ? "Photo updated" : "Photo removed");
      else setError(result.error);
    });

  const pick = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose a picture: a JPG or PNG.");
    try {
      send(await shrink(file));
    } catch {
      setError("That picture couldn’t be opened. Try a JPG or PNG.");
    }
  };

  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-medium text-text-secondary">Profile picture</p>
      <div className="flex items-end gap-4">
        <div className="relative">
          <Avatar name={name} photo={profile.photo} className="h-24 w-24 text-2xl" />
          {profile.editable && (
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={pending}
              aria-label={profile.photo ? "Change your photo" : "Add a photo"}
              className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-text shadow-raised ring-4 ring-bg transition-transform hover:scale-105 focus-visible:outline-hidden focus-visible:ring-accent disabled:opacity-60"
            >
              <Icon name="edit" className="h-4 w-4" />
            </button>
          )}
        </div>
        {profile.editable && profile.photo && (
          <button type="button" onClick={() => send(null)} disabled={pending} className="text-sm font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline">
            Remove photo
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

function DetailsForm({ profile, save }: { profile: MyProfile; save: Act }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ firstName: profile.firstName, lastName: profile.lastName });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();
  useFocusOnFailure(formRef, attempt);
  const changed = values.firstName !== profile.firstName || values.lastName !== profile.lastName;

  const set = (field: keyof typeof values) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const problems = await checkLater(() => import("@brillianda/core/profile").then((m) => m.profileSchema), values);
    if (problems) {
      setErrors(problems);
      setAttempt((n) => n + 1);
      return;
    }
    startTransition(async () => {
      const result = await save(values);
      if (result.ok) return toast("Profile saved");
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
      setAttempt((n) => n + 1);
    });
  };

  const readOnly = !profile.editable;
  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="First name"
          name="firstName"
          autoComplete="given-name"
          leading={<Icon name="user" className="h-[18px] w-[18px]" />}
          value={values.firstName}
          readOnly={readOnly}
          onChange={(e) => set("firstName")(e.target.value)}
          error={errors.firstName}
        />
        <TextField label="Last name" name="lastName" autoComplete="family-name" value={values.lastName} readOnly={readOnly} onChange={(e) => set("lastName")(e.target.value)} error={errors.lastName} />
      </div>
      <div className="mt-5 space-y-5">
        <TextField
          label="Phone number"
          name="phone"
          readOnly
          value={profile.phone ?? ""}
          placeholder="Not added"
          leading={<Icon name="phone" className="h-[18px] w-[18px]" />}
          trailing={<Icon name="lock" className="mr-3 h-[18px] w-[18px] text-text-muted" aria-label="Can’t be changed here" />}
        />
        <TextField
          label="Email address"
          name="email"
          readOnly
          value={profile.email}
          leading={<Icon name="mail" className="h-[18px] w-[18px]" />}
          trailing={<Icon name="lock" className="mr-3 h-[18px] w-[18px] text-text-muted" aria-label="Can’t be changed here" />}
          hint="Your email and phone number can’t be changed here. If they’re wrong, ask your school."
        />
      </div>
      {!readOnly && (
        <div className="mt-6">
          <FormError message={failure} />
          <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!changed && !pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      )}
    </form>
  );
}

const EMPTY = { current: "", password: "", confirmation: "" };

function PasswordForm({ save }: { save: Act }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(EMPTY);
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
    const problems = await checkLater(() => import("@brillianda/core/profile").then((m) => m.changePasswordSchema), values);
    if (problems) {
      setErrors(problems);
      setAttempt((n) => n + 1);
      return;
    }
    startTransition(async () => {
      const result = await save(values);
      if (result.ok) {
        setValues(EMPTY);
        return toast("Password changed");
      }
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
      setAttempt((n) => n + 1);
    });
  };

  return (
    <section aria-labelledby="password-heading" className="mt-10 rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
      <h2 id="password-heading" className="text-lg font-semibold">
        Password
      </h2>
      <p className="mt-1 text-sm text-text-secondary">Forgotten it? Sign out and choose “Forgot password?” on the sign-in page.</p>
      <form ref={formRef} onSubmit={submit} noValidate className="mt-5">
        <div className="space-y-5">
          <PasswordField label="Current password" name="current" autoComplete="current-password" value={values.current} onChange={(e) => set("current")(e.target.value)} error={errors.current} />
          <PasswordField label="New password" name="password" autoComplete="new-password" hint="At least 8 characters" value={values.password} onChange={(e) => set("password")(e.target.value)} error={errors.password} />
          <PasswordField label="Type it again" name="confirmation" autoComplete="new-password" value={values.confirmation} onChange={(e) => set("confirmation")(e.target.value)} error={errors.confirmation} />
        </div>
        <div className="mt-6">
          <FormError message={failure} />
          <Button type="submit" variant="secondary" size="lg" className="w-full" loading={pending}>
            {pending ? "Changing…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
