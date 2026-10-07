import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { renderWithProviders, sessionFor } from "../../test/render";
import { server } from "../../test/server";
// The app loads each portal on demand; loading it here first keeps the tests from timing out on that.
import "./SuperAdminPortal";

function signInAsTeam(route = "/super-admin") {
  server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SUPER_ADMIN"))));
  return renderWithProviders(<AppRoutes />, { route });
}

describe("Brillanda team portal", () => {
  it("summarises the platform on the overview", async () => {
    signInAsTeam();

    expect(await screen.findByText(/8 schools and 3,074 students on Brillanda/)).toBeInTheDocument();
    expect(screen.getByText(/3 schools have asked for a trial/)).toBeInTheDocument();
    const nav = screen.getAllByRole("navigation", { name: "Main" })[0]!;
    expect(within(nav).getByRole("link", { name: /Trial requests/ })).toHaveTextContent("3");
  });

  it("filters and searches the schools", async () => {
    const { user } = signInAsTeam("/super-admin/schools");

    expect(await screen.findByRole("button", { name: /Greenfield College/ })).toBeInTheDocument();
    const filters = screen.getByRole("group", { name: "Show" });
    await user.click(within(filters).getByRole("button", { name: /On trial/ }));
    expect(screen.getAllByRole("button", { name: /students\./ })).toHaveLength(2);

    await user.click(within(filters).getByRole("button", { name: /^All/ }));
    await user.type(screen.getByLabelText("Search schools"), "jos");
    expect(screen.getByRole("button", { name: /Hilltop Secondary/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Greenfield College/ })).not.toBeInTheDocument();
  });

  it("creates a school from a trial request, checking the email first", async () => {
    const { user } = signInAsTeam("/super-admin/trials");

    const request = (await screen.findByRole("heading", { name: "Unity Heights School" })).closest("article")!;
    await user.click(within(request).getByRole("button", { name: "Create school" }));

    const dialog = screen.getByRole("dialog", { name: "Create a school" });
    expect(within(dialog).getByLabelText("School name")).toHaveValue("Unity Heights School");
    const email = within(dialog).getByLabelText("Admin's email");
    await user.clear(email);
    await user.type(email, "not-an-email");
    await user.click(within(dialog).getByRole("button", { name: /Create school and send invite/ }));
    expect(await within(dialog).findByText("Check this email address. The invite goes here.")).toBeInTheDocument();

    await user.clear(email);
    await user.type(email, "efe@unityheights.ng");
    await user.click(within(dialog).getByRole("button", { name: /Create school and send invite/ }));

    expect(await screen.findByText("Unity Heights School created. Invite sent to efe@unityheights.ng")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Unity Heights School" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Done/ }));
    expect(await screen.findByText("School created")).toBeInTheDocument();
  });

  it("only suspends a school once its name is typed", async () => {
    const { user } = signInAsTeam("/super-admin/schools");

    await user.click(await screen.findByRole("button", { name: /Al-Ameen Academy/ }));
    await user.click(screen.getByRole("button", { name: "Suspend this school" }));

    const dialog = screen.getByRole("dialog", { name: "Suspend Al-Ameen Academy?" });
    const confirm = within(dialog).getByRole("button", { name: "Suspend school" });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText("Type the school's name to confirm"), "al-ameen academy");
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(await screen.findByText("Al-Ameen Academy is suspended. Everyone there has been signed out")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Restore access" })).toBeInTheDocument();
  });

  it("books a call, which moves the request to its own tab", async () => {
    const { user } = signInAsTeam("/super-admin/trials");

    const request = (await screen.findByRole("heading", { name: "Starlight Academy" })).closest("article")!;
    await user.click(within(request).getByRole("button", { name: "Book a call" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Book the call" }));

    expect(await screen.findByText("Call booked with Idris Sule")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Call booked/ }));
    expect(await screen.findByRole("heading", { name: "Starlight Academy" })).toBeInTheDocument();
  });

  it("shows what happened across schools, including the team's own changes", async () => {
    signInAsTeam("/super-admin/activity");
    expect(await screen.findByText(/Crestview Academy published JSS 3 results/)).toBeInTheDocument();
    expect(screen.getByText(/Unity Heights School asked for a trial/)).toBeInTheDocument();
  });
});
