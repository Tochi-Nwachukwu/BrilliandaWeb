import { screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { loadSchool, NEW_SCHOOL_TOKEN_MARK, saveSchool } from "../../mocks/schoolDb";
import { renderWithProviders, sessionFor } from "../../test/render";
import { server } from "../../test/server";
// The app loads each portal on demand; loading it here first keeps the tests from timing out on that.
import "./AdminPortal";

/** The admin of a school the Brillanda team has just created (the stand-in's Sunrise Academy). */
function signInToNewSchool(route = "/admin") {
  const session = sessionFor("SCHOOL_ADMIN");
  session.accessToken = `token-for-school_admin-${NEW_SCHOOL_TOKEN_MARK}`;
  session.user.fullName = "Adaobi Nwankwo";
  session.user.school = { id: "school-sunrise", name: "Sunrise Academy", slug: "sunrise", logoUrl: null };
  server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(session)));
  return renderWithProviders(<AppRoutes />, { route });
}

async function type(user: ReturnType<typeof renderWithProviders>["user"], label: string, value: string) {
  const cell = screen.getByLabelText(label);
  await user.clear(cell);
  await user.type(cell, `${value}{Tab}`);
}

describe("a new school's first run", () => {
  it("shows what was set up, then works out a class from five names", { timeout: 20_000 }, async () => {
    const { user } = signInToNewSchool();

    expect(await screen.findByRole("heading", { name: "Sunrise Academy is ready to use." })).toBeInTheDocument();
    expect(screen.getByText("12 classes")).toBeInTheDocument();
    expect(screen.getByText("CA 40%, exam 60%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try it with one class" }));
    await user.selectOptions(await screen.findByLabelText("Class"), "JSS 2A");
    await user.type(screen.getByLabelText("Five student names"), "Chidera Okafor{Enter}Tunde Bello{Enter}Amina Yusuf");
    expect(screen.getByText(/^3 names\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show me" }));

    expect(await screen.findByRole("heading", { name: "Type their Mathematics scores." })).toBeInTheDocument();
    for (const [name, scores] of [["Chidera Okafor", ["15", "16", "50"]], ["Tunde Bello", ["18", "19", "55"]], ["Amina Yusuf", ["10", "9", "30"]]] as const) {
      await type(user, `CA1 for ${name}`, scores[0]);
      await type(user, `CA2 for ${name}`, scores[1]);
      await type(user, `Exam for ${name}`, scores[2]);
    }

    // The exam is out of 60, so 95 is refused and the saved score stays.
    await type(user, "Exam for Amina Yusuf", "95");
    expect(await screen.findByText(/60 or less/i)).toBeInTheDocument();

    const ranking = screen.getByRole("region", { name: "Position in JSS 2A" });
    const places = within(ranking).getAllByRole("listitem").map((li) => li.textContent);
    expect(places[0]).toMatch(/^1stTunde Bello92/);
    expect(places[1]).toMatch(/^2ndChidera Okafor81/);
    expect(places[2]).toMatch(/^3rdAmina Yusuf49/);
  });

  it("can be skipped, and leaves the rest as a checklist on the home screen", async () => {
    const { user } = signInToNewSchool();

    await user.click(await screen.findByRole("button", { name: "I have a spreadsheet, skip ahead" }));

    const checklist = await screen.findByRole("region", { name: "Finish setting up Sunrise Academy" });
    expect(within(checklist).getByText(/0 of 5 done/)).toBeInTheDocument();
    expect(within(checklist).getByRole("link", { name: /Import.*Import your full student list/ })).toHaveAttribute("href", "/admin/students/import");

    await user.click(within(checklist).getByRole("button", { name: "Hide" }));
    await waitForElementToBeRemoved(checklist);
    expect(screen.getByText(/0 of 108 subjects are in/)).toBeInTheDocument();
  });

  it("ticks off the logo once one is uploaded", async () => {
    // jsdom's File can't be streamed into a multipart body, so this stand-in saves a logo without
    // reading the upload. The real parsing is checked in a browser.
    server.use(
      http.post("/api/v1/admin/school/logo", ({ request }) => {
        const db = loadSchool(request);
        db.profile.logoUrl = "data:image/svg+xml;base64,PHN2Zy8+";
        saveSchool(db);
        return HttpResponse.json({ logoUrl: db.profile.logoUrl });
      }),
    );
    const { user } = signInToNewSchool();
    await user.click(await screen.findByRole("button", { name: "I have a spreadsheet, skip ahead" }));
    const checklist = await screen.findByRole("region", { name: "Finish setting up Sunrise Academy" });
    await user.click(within(checklist).getByRole("link", { name: /Upload.*Upload your school logo/ }));

    await user.upload(await screen.findByLabelText("Choose a logo image"), new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }));
    expect(await screen.findByRole("img", { name: "Sunrise Academy logo" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: /Home/ })[0]!);
    const updated = await screen.findByRole("region", { name: "Finish setting up Sunrise Academy" });
    expect(await within(updated).findByText(/1 of 5 done/)).toBeInTheDocument();
  });

  it("is never shown to an established school", async () => {
    server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SCHOOL_ADMIN"))));
    renderWithProviders(<AppRoutes />, { route: "/admin/welcome" });

    expect(await screen.findByText(/of 108 subjects are in/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Finish setting up/ })).not.toBeInTheDocument();
  });
});
