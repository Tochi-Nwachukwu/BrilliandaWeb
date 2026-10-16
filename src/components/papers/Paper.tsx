// A question paper is black on white, like the printed sheet, whatever the app's look.
import { optionLetter, seededOrder, totalMarks, type Question } from "@brillianda/core/questions";

export type PaperSetup = {
  schoolName: string;
  title: string;
  subjectName: string;
  levelName: string;
  timeAllowed: string;
  instructions: string;
  questions: Question[];
  /** 1 to 3: versions A, B and C have the questions and options in different orders. */
  versions: number;
  answerKey: boolean;
};

type Laid = { q: Question; options: number[] };

/** The paper's sections, in a version's order: A is everything marked by the key, B theory. */
function layout(setup: PaperSetup, version: number): { a: Laid[]; b: Laid[] } {
  const seed = `${setup.title}:${version}`;
  const order = (items: Question[], tag: string) => (version === 0 ? items.map((_, i) => i) : seededOrder(items.length, `${seed}:${tag}`)).map((i) => items[i]!);
  const lay = (q: Question, i: number): Laid => ({
    q,
    options: q.type === "objective" ? (version === 0 ? q.options.map((_, k) => k) : seededOrder(q.options.length, `${seed}:o${i}`)) : [],
  });
  return {
    a: order(setup.questions.filter((q) => q.type !== "theory"), "a").map(lay),
    b: order(setup.questions.filter((q) => q.type === "theory"), "b").map(lay),
  };
}

const VERSION = ["A", "B", "C"];
const marks = (n: number) => (n === 1 ? "1 mark" : `${n} marks`);

function Lines({ count }: { count: number }) {
  return (
    <div aria-hidden className="mt-2 grid gap-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="border-b border-[#999]" />
      ))}
    </div>
  );
}

function Header({ setup, version }: { setup: PaperSetup; version: number | null }) {
  return (
    <header className="border-b-2 border-[#111] pb-3 text-center">
      <p className="text-[20px] font-bold uppercase tracking-wide">{setup.schoolName}</p>
      <p className="mt-1 text-[16px] font-semibold">{setup.title}</p>
      <p className="mt-1 text-[13px]">
        {setup.levelName} · {setup.subjectName} · Time allowed: {setup.timeAllowed} · {totalMarks(setup.questions)} marks
        {version !== null && setup.versions > 1 ? ` · Version ${VERSION[version]}` : ""}
      </p>
    </header>
  );
}

/** A printable question paper (batch 26), with its versions and the answer key, each on new pages. */
export function Paper({ setup }: { setup: PaperSetup }) {
  const versions = Array.from({ length: Math.min(Math.max(setup.versions, 1), 3) }, (_, v) => (setup.versions > 1 ? v + 1 : 0));
  return (
    <div className="print-paper grid gap-8 text-[#111]">
      {versions.map((v, n) => {
        const { a, b } = layout(setup, v);
        return (
          <section key={v} aria-label={setup.versions > 1 ? `Version ${VERSION[n]}` : "The paper"} className="rounded-3xl bg-white p-6 shadow-raised print:break-after-page print:rounded-none print:p-0 print:shadow-none sm:p-10">
            <Header setup={setup} version={n} />
            <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
              <span>Name:</span>
              <span className="border-b border-[#111]" />
              <span>Class:</span>
              <span className="border-b border-[#111]" />
            </div>
            {setup.instructions && <p className="mt-4 whitespace-pre-line text-[13px] italic">{setup.instructions}</p>}

            {a.length > 0 && (
              <div className="mt-5">
                <h2 className="text-[15px] font-bold">Section A{b.length ? `: answer all questions (${totalMarks(a.map((x) => x.q))} marks)` : ""}</h2>
                <ol className="mt-3 grid gap-4">
                  {a.map(({ q, options }, i) => (
                    <li key={i} className="break-inside-avoid text-[14px] leading-relaxed">
                      <p>
                        <b>{i + 1}.</b> {q.text} <span className="text-[12px]">({marks(q.marks)})</span>
                      </p>
                      {q.type === "objective" && (
                        <ol className="mt-1 grid gap-0.5 pl-6 sm:grid-cols-2">
                          {options.map((k, i) => (
                            <li key={k}>
                              ({optionLetter(i).toLowerCase()}) {q.options[k]}
                            </li>
                          ))}
                        </ol>
                      )}
                      {q.type === "trueFalse" && <p className="mt-1 pl-6">True / False</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {b.length > 0 && (
              <div className="mt-6">
                <h2 className="text-[15px] font-bold">Section B{a.length ? `: theory (${totalMarks(b.map((x) => x.q))} marks)` : ""}</h2>
                <ol className="mt-3 grid gap-5">
                  {b.map(({ q }, i) => (
                    <li key={i} className="break-inside-avoid text-[14px] leading-relaxed">
                      <p>
                        <b>{a.length + i + 1}.</b> {q.text} <span className="text-[12px]">({marks(q.marks)})</span>
                      </p>
                      <Lines count={Math.min(12, Math.max(4, q.marks))} />
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        );
      })}

      {setup.answerKey && (
        <section aria-label="Answer key" className="rounded-3xl bg-white p-6 shadow-raised print:rounded-none print:p-0 print:shadow-none sm:p-10">
          <Header setup={setup} version={null} />
          <h2 className="mt-4 text-[15px] font-bold">Answer key and marking guide (for the teacher)</h2>
          {versions.map((v, n) => {
            const { a, b } = layout(setup, v);
            return (
              <div key={v} className="mt-4 break-inside-avoid">
                {setup.versions > 1 && <h3 className="text-[14px] font-semibold">Version {VERSION[n]}</h3>}
                <ol className="mt-2 grid gap-1 text-[13px]">
                  {[...a, ...b].map(({ q, options }, i) => (
                    <li key={i}>
                      <b>{i + 1}.</b>{" "}
                      {q.type === "objective"
                        ? `(${optionLetter(options.indexOf(q.answer)).toLowerCase()}) ${q.options[q.answer]}`
                        : q.type === "trueFalse"
                          ? q.answer
                            ? "True"
                            : "False"
                          : q.type === "fillGap"
                            ? q.answers.join(" / ")
                            : q.guide || "Teacher’s judgement"}{" "}
                      <span className="text-[#555]">({marks(q.marks)})</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
