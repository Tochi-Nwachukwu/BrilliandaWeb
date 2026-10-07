import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { renderWithProviders, sessionFor } from "../../test/render";
import { server } from "../../test/server";
// The app loads each portal on demand; loading it here first keeps the tests from timing out on that.
import "./AdminPortal";

const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/** Closes the current term through the stand-in API, as the admin would from Settings. */
async function closeTerm() {
  const res = await fetch(new URL("/api/v1/admin/session/close-term", window.location.origin), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ next: { startsOn: iso(1), endsOn: iso(80), scoresDueOn: iso(70), nextTermBegins: null }, closeUnpublished: true }),
  });
  expect(res.status).toBe(200);
}

function openPromotion() {
  server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SCHOOL_ADMIN"))));
  return renderWithProviders(<AppRoutes />, { route: "/admin/session/promotion" });
}

describe("promotion at the end of a session", () => {
  it("can be previewed earlier in the year, but not acted on", async () => {
    const { user } = openPromotion();

    expect(await screen.findByText(/This is a preview/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close the session" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /^JSS 1A/ }));
    const jss1a = screen.getByRole("region", { name: "JSS 1A" });
    expect(within(jss1a).getAllByRole("combobox")[0]).toHaveValue("PROMOTE");
    await user.click(screen.getByRole("button", { name: /^SS 3A/ }));
    expect(within(screen.getByRole("region", { name: "SS 3A" })).getAllByRole("combobox")[0]).toHaveValue("GRADUATE");
  });

  it("moves everyone as decided, with changes made by hand, and starts the next session", { timeout: 30_000 }, async () => {
    await closeTerm();
    await closeTerm();
    const { user } = openPromotion();

    await user.click(await screen.findByRole("button", { name: /^JSS 2B/ }, { timeout: 5000 }));
    const jss2b = screen.getByRole("region", { name: "JSS 2B" });
    const chiamaka = within(jss2b).getByRole("combobox", { name: "Decision for Chiamaka Okafor" });
    expect(chiamaka).toHaveValue("PROMOTE");
    await user.selectOptions(chiamaka, "REPEAT");
    const why = await within(jss2b).findByLabelText("Why, for Chiamaka Okafor", {}, { timeout: 6000 });
    await user.type(why, "Missed most of the year through illness");
    await user.tab();

    await user.click(screen.getByRole("button", { name: "Close the session" }));
    const dialog = await screen.findByRole("dialog", { name: "Close 2026/2027" });
    await user.click(within(dialog).getByRole("checkbox", { name: /Close anyway/ }));
    await user.click(within(dialog).getByRole("button", { name: "Close 2026/2027" }));
    expect(await screen.findByRole("heading", { name: "2027/2028 has started" }, { timeout: 8000 })).toBeInTheDocument();

    // Chiamaka repeats JSS 2B; Obinna, in SS 3, has graduated.
    await user.click(screen.getByRole("link", { name: "See your students" }));
    await user.type(await screen.findByRole("searchbox", { name: "Search students" }), "Chiamaka");
    await user.click(await screen.findByRole("link", { name: /^Chiamaka Okafor/ }));
    expect((await screen.findAllByText(/^GC\/2025\/\d{4}$/))[0]!.parentElement).toHaveTextContent(/^JSS 2B, /);
    await user.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByText("Repeating JSS 2B")).toBeInTheDocument();
  });

  it("suggests more repeats when the pass mark goes up", { timeout: 20_000 }, async () => {
    const { user } = openPromotion();
    const repeats = async () => Number((await screen.findByText("repeat", {}, { timeout: 5000 })).previousSibling!.textContent);
    const before = await repeats();

    const mark = screen.getByLabelText("Pass mark");
    await user.clear(mark);
    await user.type(mark, "75");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(async () => expect(await repeats()).toBeGreaterThan(before), { timeout: 6000 });
  });
});
