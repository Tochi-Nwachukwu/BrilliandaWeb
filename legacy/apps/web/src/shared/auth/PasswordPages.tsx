import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { PageSpinner } from "../components/Spinner";
import { PasswordField } from "../components/PasswordField";
import { TextField } from "../components/TextField";
import { authApi } from "./authApi";
import { AuthLayout, authLinkClass, FormError } from "./AuthLayout";
import { useAuthStore } from "./authStore";
import { fieldError, generalError } from "./LoginPage";
import { homePathFor } from "./session";
import { useFocusOnFailure } from "./useFocusOnFailure";

const backToLogin = (
  <Link to="/login" className={authLinkClass}>
    Back to sign in
  </Link>
);

/**
 * Says the same thing whether or not the address is on file, so this screen can't be used to
 * find out who has an account at a school (design/patterns/auth.md §8).
 */
const RESET_REQUESTED = "If that email is on file, a reset link is on its way.";

export function ForgotPasswordPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const request = useMutation({ mutationFn: () => authApi.forgotPassword(email) });
  useFocusOnFailure(formRef, request.error);

  if (request.isSuccess) {
    return (
      <AuthLayout
        title="Check your email"
        description={
          <>
            <p>{RESET_REQUESTED}</p>
            <p>The link works for 1 hour. Nothing arrived? Check your spam folder, or ask your school admin.</p>
          </>
        }
        footer={backToLogin}
      />
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email you sign in with and we'll send you a link to choose a new password."
      footer={backToLogin}
    >
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          request.mutate();
        }}
        noValidate
      >
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          data-focus-on-failure
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldError(request.error, "email")}
        />
        <div className="mt-6">
          <FormError message={generalError(request.error)} />
          <Button type="submit" size="lg" className="w-full" loading={request.isPending}>
            {request.isPending ? "Sending…" : "Send reset link"}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

/** Password + confirmation, checked for a match before anything is sent. */
function NewPasswordForm({
  submitLabel,
  pendingLabel,
  pending,
  error,
  onSubmit,
}: {
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (password: string) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mismatch, setMismatch] = useState(false);
  useFocusOnFailure(formRef, error);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmation) {
      setMismatch(true);
      (event.currentTarget.elements.namedItem("confirmation") as HTMLInputElement | null)?.focus();
      return;
    }
    setMismatch(false);
    onSubmit(password);
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <div className="space-y-5">
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldError(error, "password")}
        />
        <PasswordField
          label="Type it again"
          name="confirmation"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          error={mismatch ? "The two passwords don't match." : undefined}
        />
      </div>
      <div className="mt-6">
        <FormError message={generalError(error)} />
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function ResetPasswordPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const reset = useMutation({ mutationFn: (password: string) => authApi.resetPassword(token, password) });

  if (reset.isSuccess) {
    return (
      <AuthLayout title="Password changed" description="You've been signed out everywhere else. Sign in with your new password.">
        <Button size="lg" className="w-full" onClick={() => navigate("/login", { replace: true })}>
          Sign in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" footer={backToLogin}>
      <NewPasswordForm
        submitLabel="Change password"
        pendingLabel="Changing…"
        pending={reset.isPending}
        error={reset.error}
        onSubmit={reset.mutate}
      />
    </AuthLayout>
  );
}

export function AcceptInvitePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const invite = useQuery({ queryKey: ["invite", token], queryFn: () => authApi.getInvite(token), retry: false });
  const accept = useMutation({
    mutationFn: (password: string) => authApi.acceptInvite(token, password),
    onSuccess: (session) => {
      useAuthStore.getState().setSession(session.accessToken, session.user);
      navigate(homePathFor(session.user.role), { replace: true });
    },
  });

  if (invite.isPending) return <PageSpinner fullScreen />;
  if (invite.isError) {
    // There is no way to fix this from here, and the screen doesn't pretend otherwise: only the
    // school can send a new invite.
    return (
      <AuthLayout
        title="This invite can't be used"
        description={
          <>
            <p>{invite.error.message}</p>
            <p>Invite links work once and expire after 3 days.</p>
          </>
        }
        footer={backToLogin}
      />
    );
  }

  const firstName = invite.data.fullName.split(" ")[0];
  const school = invite.data.schoolName ?? "Brillanda";
  return (
    <AuthLayout
      title="Set your password"
      description={`Hi ${firstName}, you're joining ${school}. Choose a password to finish setting up your account.`}
    >
      <NewPasswordForm
        submitLabel="Set password"
        pendingLabel="Setting up…"
        pending={accept.isPending}
        error={accept.error}
        onSubmit={accept.mutate}
      />
    </AuthLayout>
  );
}
