import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../App";
import { loadSchool, saveSchool } from "../../mocks/schoolDb";
import { renderWithProviders, sessionFor } from "../../test/render";
import { server } from "../../test/server";
// The app loads each portal on demand; loading it here first keeps the tests from timing out on that.
import "./AdminPortal";

/** The card a heading belongs to. */
const cardOf = async (heading: string) => (await screen.findByRole("heading", { name: heading })).closest("section")!;

/** Chiamaka Okafor, JSS 2B: the sample parent's daughter, with last session's results. */
function openChiamaka(tab = "") {
  server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SCHOOL_ADMIN"))));
  return renderWithProviders(<AppRoutes />, { route: `/admin/students/student-chiamaka${tab}` });
}

describe("a student's page", () => {
  it("shows who they are and how this term is going", async () => {
    openChiamaka();

    expect(await screen.findByRole("heading", { name: "Chiamaka Okafor", level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(/^GC\/2025\/\d{4}$/)[0]!.parentElement).toHaveTextContent(/^JSS 2B, GC\/2025\//);
    expect(await screen.findByText("Mrs Ngozi Okafor")).toBeInTheDocument();
    expect(await screen.findByText("First Term, 2026/2027")).toBeInTheDocument();
    expect(screen.getByText("Mathematics")).toBeInTheDocument();
    expect(screen.getByText(/appear once every subject is complete/)).toBeInTheDocument();
  });

  it("lists past results, the same as her parent sees, with each report card", { timeout: 15_000 }, async () => {
    const { user } = openChiamaka("?tab=results");

    const session = await cardOf("2025/2026");
    const third = within(session).getByRole("button", { name: /Third Term/ });
    expect(third).toHaveTextContent("4th of 32");
    await user.click(third);
    const card = await screen.findByRole("dialog", { name: "Report card" });
    expect(await within(card).findByText("4th of 32")).toBeInTheDocument();
  });

  it("shows her class each year and what has happened on her record", async () => {
    openChiamaka("?tab=history");

    const classes = await cardOf("Classes");
    expect(within(classes).getByText("2025/2026").nextSibling).toHaveTextContent("JSS 1B");
    expect(within(classes).getByText("2026/2027").nextSibling).toHaveTextContent(/JSS 2B/);
    expect(screen.getByText(/^Joined JSS 1B as GC\/2025\//)).toBeInTheDocument();
  });

  it("keeps notes for staff, and removes them", { timeout: 15_000 }, async () => {
    const { user } = openChiamaka("?tab=notes");

    await user.type(await screen.findByLabelText("Note"), "Asthmatic. Keeps an inhaler in her bag.");
    await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(await screen.findByText("Asthmatic. Keeps an inhaler in her bag.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: /^Notes/ })).toHaveTextContent("1"));

    await user.click(screen.getByRole("button", { name: /^Remove/ }));
    await waitFor(() => expect(screen.queryByText("Asthmatic. Keeps an inhaler in her bag.")).not.toBeInTheDocument(), { timeout: 4000 });
    expect(screen.getByText("No notes yet")).toBeInTheDocument();
  });

  it("adds a photo", async () => {
    // jsdom's File can't be streamed into a multipart body, so this stand-in saves a photo without
    // reading the upload. The real parsing is checked in a browser.
    server.use(
      http.post("/api/v1/admin/students/:id/photo", ({ request, params }) => {
        const db = loadSchool(request);
        db.students.find((s) => s.id === params.id)!.photoUrl = "data:image/png;base64,iVBORw0KGgo=";
        saveSchool(db);
        return HttpResponse.json({ photoUrl: "data:image/png;base64,iVBORw0KGgo=" });
      }),
    );
    const { user } = openChiamaka();

    await user.upload(await screen.findByLabelText("Choose a photo of Chiamaka"), new File(["x"], "chiamaka.png", { type: "image/png" }));
    expect(await screen.findByRole("button", { name: "Change Chiamaka's photo" })).toBeInTheDocument();
  });

  it("explains when a student can't be found", async () => {
    server.use(http.post("/api/v1/auth/refresh", () => HttpResponse.json(sessionFor("SCHOOL_ADMIN"))));
    renderWithProviders(<AppRoutes />, { route: "/admin/students/nobody" });
    expect(await screen.findByText(/This student couldn't be found/)).toBeInTheDocument();
  });
});
