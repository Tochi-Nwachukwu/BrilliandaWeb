import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { NEW_SCHOOL_TOKEN_MARK } from "../../mocks/schoolDb";
import { renderWithProviders, sessionFor } from "../../test/render";
import { server } from "../../test/server";
// The app loads each portal on demand; loading it here first keeps the tests from timing out on that.
import "./AdminPortal";

function signIn(token?: string) {
  const session = sessionFor("SCHOOL_ADMIN");
  if (token) session.accessToken = token;
  server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(session)));
}

// As copied out of Excel: tab-separated, with the school's own headings.
const LIST = [
  ["SURNAME", "First Name", "Class", "Sex", "D.O.B", "Parent's Phone", "Parent Email"],
  ["Okafor", "Chidera", "JSS1 A", "F", "14/03/2015", "08031234567", "bola.okafor@example.com"],
  ["Bello", "Tunde", "jss 1b", "M", "2/11/2014", "", ""],
  ["Yusuf", "Amina", "SSS 2B", "girl", "", "", ""],
  ["Obi", "Emeka", "JSS 7A", "M", "", "", ""],
  ["Adeyemi", "Folake", "JSS 1", "F", "31/02/2015", "", ""],
  ["Okafor", "Chidera", "JSS 1A", "F", "", "", ""],
].map((row) => row.join("\t")).join("\n");

describe("importing a student list", () => {
  it("matches the columns, reports each problem, and enrols the rows that are ready", { timeout: 25_000 }, async () => {
    signIn();
    const { user } = renderWithProviders(<AppRoutes />, { route: "/admin/students/import" });

    await user.click(await screen.findByLabelText(/Select the cells/));
    await user.paste(LIST);
    await user.click(screen.getByRole("button", { name: "Use these rows" }));

    expect(screen.getByRole("combobox", { name: /Column 1: SURNAME/ })).toHaveValue("surname");
    expect(screen.getByRole("combobox", { name: /Column 5: D.O.B/ })).toHaveValue("dob");
    expect(screen.getByRole("combobox", { name: /Column 6: Parent's Phone/ })).toHaveValue("guardianPhone");
    await user.click(screen.getByRole("button", { name: "Check 6 students" }));

    expect(await screen.findByText("students ready")).toBeInTheDocument();
    const problems = screen.getByRole("table");
    expect(within(problems).getByText(/No class called “JSS 7A”/)).toBeInTheDocument();
    expect(within(problems).getByText(/Which arm\? JSS 1A or JSS 1B/)).toBeInTheDocument();
    expect(within(problems).getByText(/Can't read “31\/02\/2015”/)).toBeInTheDocument();
    expect(within(problems).getByText("Same as row 1.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Import 3 students and invite 1 parent" }));
    expect(await screen.findByRole("heading", { name: "3 students enrolled" })).toBeInTheDocument();
    expect(screen.getByText(/1 parent will get an invite by email\. 3 rows were skipped/)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "See your students" }));
    await user.type(await screen.findByRole("searchbox", { name: "Search students" }), "Amina Yusuf");
    expect(await screen.findByRole("link", { name: /^Amina Yusuf/ })).toBeInTheDocument();
  });

  it("ticks off the new school's checklist", { timeout: 25_000 }, async () => {
    signIn(`token-for-school_admin-${NEW_SCHOOL_TOKEN_MARK}`);
    const { user } = renderWithProviders(<AppRoutes />, { route: "/admin/welcome" });
    await user.click(await screen.findByRole("button", { name: "I have a spreadsheet, skip ahead" }));
    const checklist = await screen.findByRole("region", { name: /Finish setting up/ });
    await user.click(within(checklist).getByRole("link", { name: /Import.*Import your full student list/ }));

    await user.click(await screen.findByLabelText(/Select the cells/));
    await user.paste("Name\tClass\nChidera Okafor\tJSS 1A\nTunde Bello\tSS 3B");
    await user.click(screen.getByRole("button", { name: "Use these rows" }));
    await user.click(screen.getByRole("button", { name: "Check 2 students" }));
    await user.click(await screen.findByRole("button", { name: "Import 2 students" }));
    expect(await screen.findByRole("heading", { name: "2 students enrolled" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: /Home/ })[0]!);
    const updated = await screen.findByRole("region", { name: /Finish setting up/ });
    expect(await within(updated).findByText(/1 of 5 done/)).toBeInTheDocument();
  });

  it("explains how to use an Excel file", async () => {
    signIn();
    const { user } = renderWithProviders(<AppRoutes />, { route: "/admin/students/import" });

    await user.upload(await screen.findByLabelText("Choose a CSV file"), new File(["x"], "students.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    expect(await screen.findByText(/That's an Excel file\. In Excel, choose File, then Save As, then CSV/)).toBeInTheDocument();
  });
});
