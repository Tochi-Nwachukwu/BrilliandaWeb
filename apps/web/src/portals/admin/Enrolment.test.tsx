import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { NEW_SCHOOL_TOKEN_MARK } from "../../mocks/schoolDb";
import { renderWithProviders, sessionFor } from "../../test/render";
import { server } from "../../test/server";
// The app loads each portal on demand; loading it here first keeps the tests from timing out on that.
import "./AdminPortal";

function signInAsAdmin(route = "/admin/students") {
  server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SCHOOL_ADMIN"))));
  return renderWithProviders(<AppRoutes />, { route });
}

describe("enrolment", () => {
  it("enrols a student with the next admission number and opens their record", { timeout: 20_000 }, async () => {
    const { user } = signInAsAdmin();

    await user.click(await screen.findByRole("button", { name: "Enrol a student" }));
    const dialog = await screen.findByRole("dialog", { name: "Enrol a student" });
    const hint = await within(dialog).findByText(/Leave it blank to give them/);
    const next = hint.textContent!.match(/give them (\S+)\./)![1]!;
    expect(next).toMatch(/^GC\/2026\/\d{4}$/);

    await user.type(within(dialog).getByLabelText("Full name"), "Chidera Okafor");
    await user.selectOptions(within(dialog).getByLabelText("Class"), "JSS 1A");
    await user.selectOptions(within(dialog).getByLabelText("Gender"), "Female");
    await user.type(within(dialog).getByLabelText("Email"), "bola.okafor@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Enrol student" }));

    expect(await screen.findByText(`Chidera is enrolled in JSS 1A as ${next}. Invite sent`)).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Search students" }), "Chidera Okafor");
    await user.click(await screen.findByRole("link", { name: new RegExp(`Chidera Okafor ${next.replace(/\//g, "\\/")}`) }));
    expect(await screen.findByRole("heading", { name: "Chidera Okafor", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/^Female\./)).toBeInTheDocument();
    expect(await screen.findByText("Invite sent")).toBeInTheDocument();
  });

  it("refuses an admission number another student already has", { timeout: 20_000 }, async () => {
    const { user } = signInAsAdmin();
    const enrol = async (name: string) => {
      await user.click(await screen.findByRole("button", { name: "Enrol a student" }));
      const dialog = await screen.findByRole("dialog", { name: "Enrol a student" });
      await user.type(await within(dialog).findByLabelText("Full name"), name);
      await user.selectOptions(within(dialog).getByLabelText("Class"), "JSS 2B");
      await user.type(within(dialog).getByLabelText("Admission number"), "GC/OLD/77");
      await user.click(within(dialog).getByRole("button", { name: "Enrol student" }));
      return dialog;
    };

    await enrol("Tunde Bello");
    expect(await screen.findByText("Tunde is enrolled in JSS 2B as GC/OLD/77")).toBeInTheDocument();
    const second = await enrol("Amina Yusuf");
    expect(await within(second).findByText("Tunde Bello already has this number.")).toBeInTheDocument();
  });

  it("keeps a student who leaves on record, and can readmit them", { timeout: 20_000 }, async () => {
    const { user } = signInAsAdmin();

    const leftTab = async () => within(await screen.findByRole("group", { name: "Show" })).getByRole("button", { name: /Left the school/ });
    expect(await leftTab()).toHaveTextContent("2");
    await user.type(screen.getByRole("searchbox", { name: "Search students" }), "Chiamaka");
    await user.click(await screen.findByRole("link", { name: /^Chiamaka Okafor/ }));
    await user.click(await screen.findByRole("button", { name: "Mark as left" }));

    const leave = await screen.findByRole("dialog", { name: "Chiamaka is leaving" });
    await user.click(within(leave).getByRole("radio", { name: /Transferred/ }));
    await user.type(within(leave).getByLabelText("Note (optional)"), "Moved to Abuja");
    await user.click(within(leave).getByRole("button", { name: "Mark as transferred" }));
    expect(await screen.findByText("Chiamaka is marked as transferred")).toBeInTheDocument();
    expect(await screen.findByText(/^Transferred \d/)).toBeInTheDocument();
    expect(screen.getByText("Moved to Abuja")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Readmit to JSS 2B" }));
    expect(await screen.findByText("Chiamaka is back in JSS 2B")).toBeInTheDocument();
    await user.click(screen.getAllByRole("link", { name: "Students" })[0]!);
    await waitFor(async () => expect(await leftTab()).toHaveTextContent("2"));
  });

  it("starts a new school with an invitation to enrol", async () => {
    const session = sessionFor("SCHOOL_ADMIN");
    session.accessToken = `token-for-school_admin-${NEW_SCHOOL_TOKEN_MARK}`;
    server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(session)));
    const { user } = renderWithProviders(<AppRoutes />, { route: "/admin/welcome" });

    await user.click(await screen.findByRole("button", { name: "I have a spreadsheet, skip ahead" }));
    await user.click((await screen.findAllByRole("link", { name: /Students/ }))[0]!);
    expect(await screen.findByText("Enrol your first students")).toBeInTheDocument();
  });

  it("previews the admission number format as it is typed", async () => {
    const { user } = signInAsAdmin("/admin/settings?tab=numbers");

    const format = await screen.findByLabelText("Format");
    await user.clear(format);
    await user.type(format, "GFC-{{YEAR}-{{NUMBER}");
    expect(screen.getByText(/The next student gets/)).toHaveTextContent(/GFC-2026-\d{4}/);
    await user.clear(format);
    await user.type(format, "GFC-{{YEAR}");
    expect(screen.getByText("Include {NUMBER}, so every student gets a different number.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save format" })).toBeDisabled();
  });
});
