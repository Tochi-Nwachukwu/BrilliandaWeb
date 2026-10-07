import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { renderWithProviders, sessionFor } from "../../test/render";
import { server } from "../../test/server";
// The app loads each portal on demand; loading it here first keeps the tests from timing out on that.
import "./AdminPortal";

function signInAsAdmin(route = "/admin") {
  server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SCHOOL_ADMIN"))));
  return renderWithProviders(<AppRoutes />, { route });
}

describe("school admin portal", () => {
  it("shows the term on the home page and lets a reopen request be approved", async () => {
    const { user } = signInAsAdmin();

    expect(await screen.findByText(/of 108 subjects are in/)).toBeInTheDocument();
    const needs = screen.getByRole("region", { name: "Needs you" });
    expect(await within(needs).findByText(/Chinedu Eze wants to reopen JSS 3A Agricultural Science/)).toBeInTheDocument();

    await user.click(within(needs).getAllByRole("button", { name: "Reopen" })[0]!);
    expect(await screen.findByText(/Reopened\. .* can edit/)).toBeInTheDocument();
  });

  it("groups the classes into junior and senior secondary, with the classes inside", async () => {
    const { user } = signInAsAdmin("/admin/classes");

    const junior = await screen.findByRole("button", { name: /Junior secondary/ });
    expect(screen.getByRole("button", { name: /Senior secondary/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^JSS 1A/ })).not.toBeInTheDocument();

    await user.click(junior);
    const region = screen.getByRole("region", { name: "Junior secondary classes" });
    expect(within(region).getByRole("link", { name: /^JSS 1A, 9 of 9 subjects, Ready/ })).toBeInTheDocument();
    expect(within(region).getAllByRole("link")).toHaveLength(6);
  });

  it("publishes a ready class after showing what will happen", async () => {
    const { user } = signInAsAdmin("/admin/publishing");

    const row = (await screen.findByRole("checkbox", { name: "Select SS 3A" })).closest("li")!;
    await user.click(within(row).getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Publish" }));

    const dialog = screen.getByRole("dialog", { name: /Publish 1 class/ });
    expect(within(dialog).getByText("JSS 1A")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /Publish now/ }));

    expect(await screen.findByText(/Published JSS 1A\. .* being emailed/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Published/ }));
    expect(await screen.findByText("JSS 1A")).toBeInTheDocument();
  });

  it("groups students by class and opens only the classes that match a filter", async () => {
    const { user } = signInAsAdmin("/admin/students");

    const group = await screen.findByRole("button", { name: /^JSS 1A/ });
    expect(group).toHaveAttribute("aria-expanded", "false");
    await user.click(group);
    expect(group).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("checkbox", { name: "No parent linked" }));
    for (const badge of await screen.findAllByText(/Not linked|Invite sent/)) expect(badge).toBeInTheDocument();
    expect(screen.queryByText("Linked")).not.toBeInTheDocument();
  });

  it("invites a member of staff, checking the email first", async () => {
    const { user } = signInAsAdmin("/admin/staff");

    await user.click(await screen.findByRole("button", { name: "Invite staff" }));
    const dialog = screen.getByRole("dialog", { name: "Invite a member of staff" });
    await user.type(within(dialog).getByLabelText("Full name"), "Ruth Ekanem");
    await user.type(within(dialog).getByLabelText("Email"), "ruth@");
    await user.click(within(dialog).getByRole("button", { name: "Send invite" }));
    expect(await within(dialog).findByText(/Check this email address/)).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText("Email"));
    await user.type(within(dialog).getByLabelText("Email"), "ruth@greenfield.sch.ng");
    await user.click(within(dialog).getByRole("button", { name: "Send invite" }));
    expect(await screen.findByText("Invite sent to ruth@greenfield.sch.ng")).toBeInTheDocument();
    expect(await screen.findByText("Ruth Ekanem")).toBeInTheDocument();
  });

  it("won't save a grading scale without a grade that starts at 0", async () => {
    const { user } = signInAsAdmin("/admin/settings");

    await user.click(await screen.findByRole("button", { name: "Grading scale" }));
    await user.click(await screen.findByRole("button", { name: "Remove F" }));

    expect(screen.getByText("Add a grade that starts at 0, so every total gets a grade.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save scale" })).toBeDisabled();
  });

  it("shows a teacher's sheet read-only", async () => {
    signInAsAdmin("/admin/classes/arm-jss1a/sheets/subject-maths");
    expect(await screen.findByText(/Only the subject teacher can change scores/)).toBeInTheDocument();
    const cells = screen.getAllByRole("textbox");
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) expect(cell).toHaveAttribute("readonly");
  });
});
