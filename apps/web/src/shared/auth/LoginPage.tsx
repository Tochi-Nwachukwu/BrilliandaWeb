import { useMutation } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import type { SessionResponse } from "@brillanda/shared-types";
import { ApiError } from "../api/client";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { TextField } from "../components/TextField";
import { SAMPLE_ACCOUNTS, SAMPLE_PASSWORD } from "../api/sampleAccounts";
import { authApi } from "./authApi";
import { AuthLayout, FormError, TextButton } from "./AuthLayout";
import { useAuthStore } from "./authStore";
import { destinationAfterLogin } from "./session";
import { useFocusOnFailure } from "./useFocusOnFailure";

const startSession = (session: SessionResponse) => useAuthStore.getState().setSession(session.accessToken, session.user);

/** A general message only when the server didn't point at a specific field. */
export function generalError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return Object.keys(error.fields).length ? null : error.message;
  return "Something went wrong. Please try again.";
}

export const fieldError = (error: unknown, field: string) =>
  error instanceof ApiError ? error.fields[field]?.[0] : undefined;

/**
 * A wrong password and an unknown email must read identically: naming which one was wrong tells
 * a stranger which addresses exist at a school (design/patterns/auth.md §8). The API already
 * answers both with the same 401; this pins the wording so it can't drift.
 */
export const CREDENTIALS_DONT_MATCH = "That email and password don't match.";
const loginError = (error: unknown) =>
  error instanceof ApiError && error.status === 401 ? CREDENTIALS_DONT_MATCH : generalError(error);

export function LoginPage() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const [mode, setMode] = useState<"email" | "code">("email");

  if (user) return <Navigate to={destinationAfterLogin(user.role, location.state)} replace />;

  if (mode === "code") {
    return (
      <AuthLayout
        title="Parent access"
        description="Enter the access code your child's school gave you."
        footer={
          <>
            Have an email and password? <TextButton onClick={() => setMode("email")}>Sign in with email</TextButton>
          </>
        }
      >
        <AccessCodeForm />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Use the email your school added you with."
      footer={
        <>
          Parent with an access code? <TextButton onClick={() => setMode("code")}>Use your code</TextButton>
        </>
      }
    >
      <EmailLoginForm />
    </AuthLayout>
  );
}

function EmailLoginForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: (sample?: { email: string; password: string }) =>
      authApi.login(sample?.email ?? email, sample?.password ?? password),
    onSuccess: startSession,
  });
  useFocusOnFailure(formRef, login.error);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate(undefined);
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <div className="space-y-5">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldError(login.error, "email")}
        />
        <div>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            data-focus-on-failure
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldError(login.error, "password")}
          />
          <div className="mt-2 text-right">
            <Link
              to="/forgot-password"
              className="rounded text-sm text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <FormError message={loginError(login.error)} />
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </div>
      {/* Development and demo builds only (D-7a, D-17), written inline so other production builds drop it with the stand-in API. */}
      {((import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== "false") || import.meta.env.VITE_DEMO === "true") && (
        <div className="mt-8 rounded-2xl bg-sunken p-4">
          <p className="text-sm font-semibold">Sample accounts</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            For looking around while the backend is being built. Password: <code>{SAMPLE_PASSWORD}</code>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SAMPLE_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="secondary"
                size="sm"
                className={account.newSchool ? "col-span-2" : undefined}
                disabled={login.isPending}
                onClick={() => login.mutate({ email: account.email, password: SAMPLE_PASSWORD })}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

function AccessCodeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const login = useMutation({ mutationFn: () => authApi.loginWithCode(code), onSuccess: startSession });
  useFocusOnFailure(formRef, login.error);

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        login.mutate();
      }}
      noValidate
    >
      <TextField
        label="Access code"
        name="code"
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        placeholder="e.g. K7QM-2XPA-9RTD"
        data-focus-on-failure
        value={code}
        onChange={(event) => setCode(event.target.value)}
        error={fieldError(login.error, "code")}
      />
      <div className="mt-6">
        <FormError message={generalError(login.error)} />
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          {login.isPending ? "Checking…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
