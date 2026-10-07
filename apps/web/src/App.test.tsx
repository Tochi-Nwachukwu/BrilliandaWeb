import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "./App";
import { renderWithProviders, sessionFor } from "./test/render";
import { server } from "./test/server";

async function signIn(user: ReturnType<typeof renderWithProviders>["user"]) {
  await user.type(await screen.findByLabelText("Email"), "tunde.bakare@demo-academy.local");
  await user.type(screen.getByLabelText("Password"), "correct-horse-battery");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("signing in and portals", () => {
  it("sends a teacher to their classes after signing in", async () => {
    server.use(http.post("/api/v1/auth/login", () => HttpResponse.json(sessionFor("TEACHER"))));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/login" });

    await signIn(user);

    expect(await screen.findByRole("heading", { name: "Your classes" })).toBeInTheDocument();
  });

  it("says the email and password do not match when a sign-in fails", async () => {
    server.use(
      http.post("/api/v1/auth/login", () =>
        HttpResponse.json({ error: "Email or password is incorrect." }, { status: 401 }),
      ),
    );
    const { user } = renderWithProviders(<AppRoutes />, { route: "/login" });

    await signIn(user);

    expect(await screen.findByText("That email and password don't match.")).toBeInTheDocument();
  });

  it("lets a parent in with an access code", async () => {
    server.use(http.post("/api/v1/auth/access-code", () => HttpResponse.json(sessionFor("PARENT"))));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/login" });

    await user.click(await screen.findByRole("button", { name: "Use your code" }));
    await user.type(screen.getByLabelText("Access code"), "k7qm 2xpa 9rtd");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: /came .* of \d+\./ }, { timeout: 4000 })).toBeInTheDocument();
  });

  it("keeps a teacher out of the admin portal", async () => {
    server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("TEACHER"))));
    renderWithProviders(<AppRoutes />, { route: "/admin" });

    expect(await screen.findByRole("heading", { name: "Your classes" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Publishing" })).not.toBeInTheDocument();
  });

  it("asks visitors who aren't signed in to sign in", async () => {
    renderWithProviders(<AppRoutes />, { route: "/teacher" });
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
