// The live mark sheet on the page. It calls the same score maths as the product
// (`@brillanda/shared-types`), so what a visitor sees here is what a teacher gets: the same
// totals, the same grade bands, the same 1, 2, 2, 4 positions (DECISIONS.md D-2, F-32).

import {
  computeSubjectTotal,
  formatScore,
  ordinal,
  parseScoreInput,
  rankScores,
  resolveGrade,
  UngradedScoreError,
  type CellValue,
  type GradeBand,
  type WeightedComponent,
} from "@brillanda/shared-types";

/** The 40/60 CA/Exam split a new school starts with. */
const COMPONENTS: WeightedComponent[] = [
  { id: "ca1", weight: 20, maxScore: 20 },
  { id: "ca2", weight: 20, maxScore: 20 },
  { id: "exam", weight: 60, maxScore: 60 },
];

const SCALE: GradeBand[] = [
  { minScore: 70, grade: "A", remark: "Excellent", isPass: true },
  { minScore: 60, grade: "B", remark: "Very Good", isPass: true },
  { minScore: 50, grade: "C", remark: "Good", isPass: true },
  { minScore: 45, grade: "D", remark: "Fair", isPass: true },
  { minScore: 40, grade: "E", remark: "Pass", isPass: true },
  { minScore: 0, grade: "F", remark: "Fail", isPass: false },
];

type Row = {
  id: string;
  name: string;
  admission: string;
  cells: Record<string, CellValue | null>;
};

const score = (value: number): CellValue => ({ value, isAbsent: false });
const absent = (): CellValue => ({ value: 0, isAbsent: true });

/** Six students, one of them absent for an exam, one sheet still short a score. */
function seedRows(): Row[] {
  return [
    { id: "s1", name: "Adaeze Nwosu", admission: "RHC/2231", cells: { ca1: score(17), ca2: score(17), exam: score(48) } },
    { id: "s2", name: "Chidi Okonkwo", admission: "RHC/2244", cells: { ca1: score(15), ca2: score(14), exam: score(41) } },
    { id: "s3", name: "Fatima Yusuf", admission: "RHC/2250", cells: { ca1: score(18), ca2: score(18), exam: score(50) } },
    { id: "s4", name: "Tunde Bakare", admission: "RHC/2262", cells: { ca1: score(15), ca2: score(14), exam: score(41) } },
    { id: "s5", name: "Ngozi Eze", admission: "RHC/2277", cells: { ca1: score(12), ca2: score(11), exam: absent() } },
    { id: "s6", name: "Samuel Obi", admission: "RHC/2288", cells: { ca1: score(14), ca2: score(16), exam: null } },
  ];
}

function gradeOf(total: number): GradeBand | null {
  try {
    return resolveGrade(total, SCALE);
  } catch (error) {
    // A scale with a hole in it is a setup problem, not something to hide (F-1).
    if (error instanceof UngradedScoreError) return null;
    throw error;
  }
}

function badgeColours(band: GradeBand): string {
  if (!band.isPass) return "color:var(--danger);border-color:var(--danger-border);background:var(--danger-bg)";
  if (band.minScore >= 60) return "color:var(--success);border-color:var(--success-border);background:var(--success-bg)";
  return "color:var(--warning);border-color:var(--warning-border);background:var(--warning-bg)";
}

export function initGrid(): void {
  const body = document.querySelector<HTMLTableSectionElement>("[data-grid-body]");
  if (!body) return;
  const status = document.querySelector<HTMLElement>("[data-grid-status]");
  const rows = seedRows();

  // --- build the rows once ---
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.dataset.row = row.id;

    const name = document.createElement("td");
    name.className = "name";
    name.innerHTML = `<b></b><span></span>`;
    name.querySelector("b")!.textContent = row.name;
    name.querySelector("span")!.textContent = row.admission;
    tr.append(name);

    for (const component of COMPONENTS) {
      const td = document.createElement("td");
      td.className = "cell";

      const input = document.createElement("input");
      // A text input, not a number one: teachers type ABS, and phone keypads behave (F-31).
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.value = formatScore(row.cells[component.id]);
      input.dataset.component = component.id;
      input.setAttribute("aria-label", `${component.id.toUpperCase()} for ${row.name}, maximum ${component.maxScore}`);

      input.addEventListener("input", () => {
        const parsed = parseScoreInput(input.value, component.maxScore);
        const existing = td.querySelector(".cell-error");

        if (!parsed.ok) {
          input.setAttribute("aria-invalid", "true");
          if (existing) {
            existing.textContent = parsed.error;
          } else {
            const note = document.createElement("span");
            note.className = "cell-error";
            note.textContent = parsed.error;
            td.append(note);
          }
          if (status) status.textContent = "Fix the highlighted score";
          return;
        }

        input.removeAttribute("aria-invalid");
        existing?.remove();
        row.cells[component.id] = parsed.cell;
        render();
        if (status) status.textContent = "Positions update as you type";
      });

      td.append(input);
      tr.append(td);
    }

    for (const cls of ["total", "grade", "pos"]) {
      const td = document.createElement("td");
      td.className = cls;
      td.dataset.out = cls;
      tr.append(td);
    }

    body.append(tr);
  }

  // --- recompute totals, grades and positions ---
  let lastPositions = new Map<string, number>();

  function render(): void {
    const totals = rows.map((row) => ({ row, ...computeSubjectTotal(COMPONENTS, row.cells) }));

    // Only finished rows take a position; a half-entered sheet must not invent a ranking.
    const ranks = rankScores(
      totals.filter((t) => t.complete).map((t) => ({ id: t.row.id, total: t.total })),
    );

    for (const { row, total, complete } of totals) {
      const tr = body!.querySelector<HTMLTableRowElement>(`[data-row="${row.id}"]`);
      if (!tr) continue;

      const totalCell = tr.querySelector<HTMLElement>('[data-out="total"]')!;
      const gradeCell = tr.querySelector<HTMLElement>('[data-out="grade"]')!;
      const posCell = tr.querySelector<HTMLElement>('[data-out="pos"]')!;

      if (!complete) {
        totalCell.textContent = "—";
        gradeCell.textContent = "";
        posCell.textContent = "—";
        posCell.title = "Waiting on a score";
        continue;
      }

      totalCell.textContent = total.toFixed(2).replace(/\.00$/, "");

      const band = gradeOf(total);
      gradeCell.innerHTML = "";
      if (band) {
        const badge = document.createElement("span");
        badge.className = "grade-badge";
        badge.setAttribute("style", badgeColours(band));
        badge.textContent = band.grade;
        badge.title = band.remark;
        gradeCell.append(badge);
      } else {
        gradeCell.textContent = "?";
        gradeCell.title = "No grade band covers this total";
      }

      const position = ranks.get(row.id);
      posCell.textContent = position ? ordinal(position) : "—";
      posCell.title = "";

      if (position && lastPositions.get(row.id) !== undefined && lastPositions.get(row.id) !== position) {
        posCell.classList.remove("flash");
        void posCell.offsetWidth; // restart the highlight
        posCell.classList.add("flash");
        window.setTimeout(() => posCell.classList.remove("flash"), 700);
      }
    }

    lastPositions = ranks;
  }

  render();
}
