import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

// The sign-in screens' rules from design/patterns/auth.md that are behaviour, not styling.

describe("sign in", () => {
  it("gives a wrong password and an unknown email the same message", async () => {
    const seen: string[] = [];
    for (const serverMessage of ["No such user.", "Wrong password."]) {
      server.use(http.post("/api/v1/auth/login", () => HttpResponse.json({ error: serverMessage }, { status: 401 })));
      const { user, unmount } = renderWithProviders(<AppRoutes />, { route: "/login" });
      await user.type(await screen.findByLabelText("Email"), "someone@school.test");
      await user.type(screen.getByLabelText("Password"), "whatever-it-is");
      await user.click(screen.getByRole("button", { name: "Sign in" }));
      seen.push((await screen.findByRole("alert")).textContent ?? "");
      unmount();
    }
    expect(seen[0]).toBe(seen[1]);
    expect(seen[0]).toBe("That email and password don't match.");
  });

  it("moves focus to the password field after a failed attempt", async () => {
    server.use(http.post("/api/v1/auth/login", () => HttpResponse.json({ error: "no" }, { status: 401 })));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/login" });
    await user.type(await screen.findByLabelText("Email"), "someone@school.test");
    await user.type(screen.getByLabelText("Password"), "nope");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByRole("alert");
    await waitFor(() => expect(screen.getByLabelText("Password")).toHaveFocus());
  });

  it("disables the button and says so while the request is in flight", async () => {
    server.use(
      http.post("/api/v1/auth/login", async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return HttpResponse.json({ error: "no" }, { status: 401 });
      }),
    );
    const { user } = renderWithProviders(<AppRoutes />, { route: "/login" });
    await user.type(await screen.findByLabelText("Email"), "someone@school.test");
    await user.type(screen.getByLabelText("Password"), "nope");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const working = await screen.findByRole("button", { name: "Signing in…" });
    expect(working).toBeDisabled();
    await screen.findByRole("alert");
  });

  it("lets the password be shown and hidden by a labelled button", async () => {
    const { user } = renderWithProviders(<AppRoutes />, { route: "/login" });
    const password = await screen.findByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("offers no way to create an account", async () => {
    renderWithProviders(<AppRoutes />, { route: "/login" });
    await screen.findByRole("heading", { name: "Sign in" });
    expect(screen.queryByText(/create (an )?account|register|sign up/i)).not.toBeInTheDocument();
  });
});

describe("parent access", () => {
  it("sends the code without spaces or dashes, in capitals", async () => {
    let sent: unknown;
    server.use(
      http.post("/api/v1/auth/access-code", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ error: "That access code isn't valid. Check it and try again." }, { status: 401 });
      }),
    );
    const { user } = renderWithProviders(<AppRoutes />, { route: "/login" });

    await user.click(await screen.findByRole("button", { name: "Use your code" }));
    await user.type(screen.getByLabelText("Access code"), "k7qm-2xpa 9rtd");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText(/isn't valid/)).toBeInTheDocument();
    expect(sent).toEqual({ code: "K7QM2XPA9RTD" });
  });
});

describe("forgot password", () => {
  it("says the same reassuring thing whatever the server answered", async () => {
    server.use(http.post("/api/v1/auth/forgot-password", () => HttpResponse.json({ message: "sent" }, { status: 202 })));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/forgot-password" });

    await user.type(await screen.findByLabelText("Email"), "nobody@school.test");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText("If that email is on file, a reset link is on its way.")).toBeInTheDocument();
    // The address the person typed is not echoed back either.
    expect(screen.queryByText(/nobody@school\.test/)).not.toBeInTheDocument();
  });
});

describe("setting a password", () => {
  it("catches two passwords that differ before anything is sent", async () => {
    let requests = 0;
    server.use(
      http.post("/api/v1/auth/reset-password", () => {
        requests += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderWithProviders(<AppRoutes />, { route: "/reset-password/abc" });

    await user.type(await screen.findByLabelText("New password"), "first-password");
    await user.type(screen.getByLabelText("Type it again"), "second-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("The two passwords don't match.")).toBeInTheDocument();
    expect(screen.getByLabelText("Type it again")).toHaveFocus();
    expect(requests).toBe(0);
  });

  it("confirms a changed password and points back to sign in", async () => {
    server.use(http.post("/api/v1/auth/reset-password", () => new HttpResponse(null, { status: 204 })));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/reset-password/abc" });

    await user.type(await screen.findByLabelText("New password"), "a-long-password");
    await user.type(screen.getByLabelText("Type it again"), "a-long-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("heading", { name: "Password changed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("tells someone with a dead invite to ask their school, with no way to self-serve", async () => {
    server.use(
      http.get("/api/v1/auth/invite/old", () =>
        HttpResponse.json(
          { error: "This invite link is invalid or has expired. Ask your school admin to send a new one." },
          { status: 404 },
        ),
      ),
    );
    renderWithProviders(<AppRoutes />, { route: "/invite/old" });

    expect(await screen.findByRole("heading", { name: "This invite can't be used" })).toBeInTheDocument();
    expect(screen.getByText(/Ask your school admin/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("greets an invited teacher and asks for a password", async () => {
    server.use(
      http.get("/api/v1/auth/invite/good", () =>
        HttpResponse.json({ email: "ada@school.test", fullName: "Ada Obi", role: "TEACHER", schoolName: "Demo Academy" }),
      ),
    );
    renderWithProviders(<AppRoutes />, { route: "/invite/good" });

    expect(await screen.findByRole("heading", { name: "Set your password" })).toBeInTheDocument();
    expect(screen.getByText(/Hi Ada, you're joining Demo Academy/)).toBeInTheDocument();
  });
});
