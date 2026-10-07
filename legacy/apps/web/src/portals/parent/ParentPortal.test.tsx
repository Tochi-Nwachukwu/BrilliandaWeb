import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { renderWithProviders, sessionFor } from "../../test/render";
import { server } from "../../test/server";
// The app loads each portal on demand; loading it here first keeps the tests from timing out on that.
import "./ParentPortal";
import { forgetChosenChild } from "./parts";

function signInAsParent(route = "/portal") {
  server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("PARENT"))));
  return renderWithProviders(<AppRoutes />, { route });
}

describe("parent portal", () => {
  beforeEach(forgetChosenChild);

  it("leads with the latest result, and switches between children", async () => {
    const { user } = signInAsParent();

    expect(await screen.findByRole("heading", { name: "Chiamaka came 4th of 32." })).toBeInTheDocument();
    expect(screen.getByText(/First Term results aren't out yet/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Obinna/ }));
    expect(await screen.findByRole("heading", { name: "Obinna came 11th of 29." })).toBeInTheDocument();
  });

  it("breaks a subject down and opens the report card", async () => {
    const { user } = signInAsParent();

    await user.click(await screen.findByRole("button", { name: /^Mathematics/ }));
    const panel = screen.getByRole("dialog", { name: "Mathematics" });
    expect(within(panel).getByText("CA1")).toBeInTheDocument();
    expect(within(panel).getByText(/82 \/ 100/)).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "See the whole report card" }));
    const card = await screen.findByRole("dialog", { name: "Report card" });
    expect(await within(card).findByText("4th of 32")).toBeInTheDocument();
  });

  it("shows a newly published result as new until it is opened", async () => {
    // The school admin publishes Obinna's class.
    await fetch(new URL("/api/v1/admin/publish", window.location.origin), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ armIds: ["arm-jss1a", "arm-ss3a"] }),
    });
    const { user } = signInAsParent("/portal?child=student-obinna");

    expect(await screen.findByText(/report card is ready/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Obinna came .* of \d+\./ })).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: /Results/ })[0]!);
    expect(await screen.findByRole("heading", { name: "Obinna's results" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /First Term, 2026\/2027/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getAllByRole("link", { name: /Home/ })[0]!);
    expect(await screen.findByRole("heading", { name: /Obinna came/ })).toBeInTheDocument();
    expect(screen.queryByText(/report card is ready/)).not.toBeInTheDocument();
  });

  it("lists every published term on the results page", async () => {
    const { user } = signInAsParent("/portal/results");

    const terms = await screen.findByRole("group", { name: "Term" });
    expect(within(terms).getAllByRole("button")).toHaveLength(3);
    await user.click(within(terms).getByRole("button", { name: /First Term, 2025\/2026/ }));
    expect(await screen.findByText("7th of 32")).toBeInTheDocument();
  });
});
