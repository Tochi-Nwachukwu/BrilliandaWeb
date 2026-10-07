import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { renderWithProviders, sessionFor } from "../../test/render";
import { server } from "../../test/server";
import { useLook } from "../theme/useLook";

describe("the shared shell", () => {
  afterEach(() => useLook.getState().setLook("pastel"));

  it("gives the school admin every menu item, each leading to a page", async () => {
    server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SCHOOL_ADMIN"))));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/admin" });

    const menu = (await screen.findAllByRole("navigation", { name: "Main" }))[0]!;
    for (const label of ["Home", "Classes", "Publishing", "Students", "Staff", "Settings"]) {
      // A count can follow the label once the portal's data loads, e.g. "Publishing 2".
      expect(within(menu).getByRole("link", { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }

    await user.click(within(menu).getByRole("link", { name: /^Publishing/ }));
    expect(await screen.findByRole("heading", { name: "Publishing" })).toBeInTheDocument();
  });

  it("switches to the Neutral look from the account menu, and remembers it", async () => {
    server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("TEACHER"))));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/teacher" });

    await user.click(await screen.findByRole("button", { name: "Your account" }));
    await user.click(screen.getByRole("button", { name: "Neutral" }));

    expect(document.documentElement.dataset.theme).toBe("neutral");
    expect(localStorage.getItem("brillanda:look")).toBe("neutral");
    expect(screen.getByRole("button", { name: "Neutral" })).toHaveAttribute("aria-pressed", "true");
  });
});
