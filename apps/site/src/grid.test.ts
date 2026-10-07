// The demo grid is a sales claim: "this is the real calculation". These tests hold it to that.

import { beforeEach, describe, expect, it } from "vitest";
import { initGrid } from "./grid";

function mount(): void {
  document.body.innerHTML = `
    <table><tbody data-grid-body></tbody></table>
    <span data-grid-status></span>
  `;
  initGrid();
}

const rows = (): HTMLTableRowElement[] => Array.from(document.querySelectorAll("tr[data-row]"));
const cellOf = (row: Element, out: string): string => row.querySelector(`[data-out="${out}"]`)!.textContent!.trim();
const inputs = (row: Element): HTMLInputElement[] => Array.from(row.querySelectorAll("input"));

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(mount);

describe("the demo mark sheet", () => {
  it("shows a row for every student, with three score boxes", () => {
    expect(rows()).toHaveLength(6);
    expect(inputs(rows()[0])).toHaveLength(3);
  });

  it("totals the weighted components", () => {
    // 17 + 17 + 48, on a 20/20/60 split, is 82.
    expect(cellOf(rows()[0], "total")).toBe("82");
  });

  it("grades from the school's bands", () => {
    expect(rows()[0].querySelector('[data-out="grade"] .grade-badge')!.textContent).toBe("A");
    expect(rows()[4].querySelector('[data-out="grade"] .grade-badge')!.textContent).toBe("F");
  });

  it("gives tied students the same position and skips the next one (D-2)", () => {
    const positions = rows().map((row) => cellOf(row, "pos"));
    // 86, 82, 70, 70, 23, and one row still incomplete.
    expect(positions).toEqual(["2nd", "3rd", "1st", "3rd", "5th", "—"]);
  });

  it("counts an absent student as zero rather than skipping them", () => {
    expect(cellOf(rows()[4], "total")).toBe("23");
    expect(inputs(rows()[4])[2].value).toBe("ABS");
  });

  it("leaves a row without a grade or position until every score is in (D-3)", () => {
    const pending = rows()[5];
    expect(cellOf(pending, "total")).toBe("—");
    expect(cellOf(pending, "pos")).toBe("—");

    type(inputs(pending)[2], "60");
    expect(cellOf(pending, "total")).toBe("90");
    expect(cellOf(pending, "pos")).toBe("1st");
  });

  it("refuses a score above the component maximum", () => {
    const row = rows()[0];
    type(inputs(row)[0], "25");

    expect(inputs(row)[0].getAttribute("aria-invalid")).toBe("true");
    expect(row.querySelector(".cell-error")!.textContent).toBe("Must be 20 or less");
    expect(cellOf(row, "total")).toBe("82"); // the bad value is not counted
  });

  it("explains a value that is not a score at all", () => {
    const row = rows()[0];
    type(inputs(row)[0], "n/a");
    expect(row.querySelector(".cell-error")!.textContent).toBe("Enter a number, or ABS if absent");
  });

  it("clears the error once the score is corrected", () => {
    const row = rows()[0];
    type(inputs(row)[0], "25");
    type(inputs(row)[0], "19");

    expect(row.querySelector(".cell-error")).toBeNull();
    expect(inputs(row)[0].hasAttribute("aria-invalid")).toBe(false);
    expect(cellOf(row, "total")).toBe("84");
  });

  it("accepts ABS typed by hand, in any case", () => {
    const row = rows()[1];
    type(inputs(row)[2], "abs");
    expect(cellOf(row, "total")).toBe("29");
    expect(row.querySelector(".cell-error")).toBeNull();
  });

  it("re-ranks the class as scores change", () => {
    type(inputs(rows()[1])[2], "60"); // Chidi: 15 + 14 + 60 = 89
    expect(cellOf(rows()[1], "pos")).toBe("1st");
    expect(cellOf(rows()[2], "pos")).toBe("2nd");
  });

  it("empties a cell when the score is deleted", () => {
    const row = rows()[0];
    type(inputs(row)[0], "");
    expect(cellOf(row, "total")).toBe("—");
    expect(cellOf(row, "pos")).toBe("—");
  });
});
