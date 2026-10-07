import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { renderWithProviders, sessionFor } from "../../test/render";
import { server } from "../../test/server";
// The app loads each portal on demand; loading it here first keeps the tests from timing out on that.
import "./AdminPortal";
import "../parent/ParentPortal";

const card = async (heading: string | RegExp) => (await screen.findByRole("heading", { name: heading })).closest("section")!;

describe("the school year", () => {
  it("closes the first term only once the admin accepts unpublished classes, then starts the second", { timeout: 25_000 }, async () => {
    server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SCHOOL_ADMIN"))));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/admin/settings?tab=term" });

    const timeline = await card("2026/2027 session");
    expect(within(timeline).getByText("Now").closest("li")).toHaveTextContent("First Term");
    const closing = await card("Close First Term and start Second Term");
    expect(within(closing).getByText(/classes haven't been published/)).toBeInTheDocument();

    await user.click(within(closing).getByRole("button", { name: "Close First Term" }));
    const dialog = await screen.findByRole("dialog", { name: "Close First Term" });
    const confirm = within(dialog).getByRole("button", { name: "Close First Term" });
    expect(confirm).toBeDisabled();
    await user.click(within(dialog).getByRole("checkbox", { name: /Close anyway/ }));
    await user.click(confirm);

    expect(await screen.findByText("First Term is closed. Second Term has started")).toBeInTheDocument();
    const after = await card("2026/2027 session");
    expect(await within(after).findByText("Closed")).toBeInTheDocument();
    expect(within(after).getByText("Now").closest("li")).toHaveTextContent("Second Term");

    // The new term starts with empty sheets, and the closed term is on each student's record.
    await user.click(screen.getAllByRole("link", { name: /Home/ })[0]!);
    expect(await screen.findByText(/^0 of 108 subjects are in/)).toBeInTheDocument();
  });

  it("marks a term that closed before its class was finished, instead of a misleading average", { timeout: 25_000 }, async () => {
    const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    await fetch(new URL("/api/v1/admin/session/close-term", window.location.origin), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ next: { startsOn: iso(20), endsOn: iso(100), scoresDueOn: iso(90), nextTermBegins: null }, closeUnpublished: true }),
    });
    server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SCHOOL_ADMIN"))));
    renderWithProviders(<AppRoutes />, { route: "/admin/students/student-chiamaka?tab=results" });

    const session = await card("2026/2027");
    expect(within(session).getByRole("button", { name: /First Term/ })).toHaveTextContent("Unfinished");
    expect(await card("Average by term")).toHaveTextContent("3 terms");
  });

  it("keeps a published term's results for the parent after it closes", { timeout: 25_000 }, async () => {
    // The school publishes Obinna's class, then closes the term.
    await fetch(new URL("/api/v1/admin/publish", window.location.origin), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ armIds: ["arm-ss3a"] }) });
    const today = new Date();
    const iso = (days: number) => new Date(today.getTime() + days * 86_400_000).toISOString().slice(0, 10);
    const closed = await fetch(new URL("/api/v1/admin/session/close-term", window.location.origin), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ next: { startsOn: iso(20), endsOn: iso(100), scoresDueOn: iso(90), nextTermBegins: null }, closeUnpublished: true }),
    });
    expect(closed.status).toBe(200);

    server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("PARENT"))));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/portal/results?child=student-obinna" });
    const terms = await screen.findByRole("group", { name: "Term" });
    await user.click(within(terms).getByRole("button", { name: /First Term, 2026\/2027/ }));
    expect(await screen.findByText(/^\d+(st|nd|rd|th) of \d+$/)).toBeInTheDocument();
    expect(screen.getByText(/Published \d/)).toBeInTheDocument();
  });

  it("refuses dates that don't make sense", async () => {
    server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SCHOOL_ADMIN"))));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/admin/settings?tab=term" });

    await user.click(within(await card(/Close First Term/)).getByRole("button", { name: "Close First Term" }));
    const dialog = await screen.findByRole("dialog", { name: "Close First Term" });
    const ends = within(dialog).getByLabelText("Ends");
    await user.clear(ends);
    await user.type(ends, "2020-01-01");
    await user.click(within(dialog).getByRole("checkbox", { name: /Close anyway/ }));
    await user.click(within(dialog).getByRole("button", { name: "Close First Term" }));
    expect(await within(dialog).findByText("The term has to end after it starts.")).toBeInTheDocument();
  });
});
