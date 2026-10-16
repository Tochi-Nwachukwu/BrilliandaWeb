// FAKE: the AI question generator (batch 24). The backend replaces this with a model call, as
// docs/ai-integration.md describes. Here: a few real questions for common topics, and plainly marked
// sample questions for anything else, so every screen can be built and tested.
import "server-only";
import type { Difficulty, GenerateRequest, Question } from "@brillianda/core/questions";

type Bank = { objective: [string, string[], number][]; trueFalse: [string, boolean][]; fillGap: [string, string[]][]; theory: [string, string][] };

const BANKS: { match: RegExp; bank: Bank }[] = [
  {
    match: /photosynth|plant/i,
    bank: {
      objective: [
        ["Green plants make their food by a process called", ["respiration", "photosynthesis", "transpiration", "digestion"], 1],
        ["Which gas do plants take in during photosynthesis?", ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], 2],
        ["The green pigment that traps sunlight in leaves is", ["chlorophyll", "haemoglobin", "melanin", "keratin"], 0],
        ["Photosynthesis mainly takes place in the", ["roots", "stem", "flowers", "leaves"], 3],
      ],
      trueFalse: [
        ["Plants give out oxygen during photosynthesis.", true],
        ["Photosynthesis can take place in complete darkness.", false],
      ],
      fillGap: [
        ["The sugar made by plants during photosynthesis is called ____.", ["glucose"]],
        ["Plants take in water through their ____.", ["roots"]],
      ],
      theory: [
        ["Explain how green plants make their food. Write the word equation for photosynthesis.", "Sunlight, chlorophyll; water + carbon dioxide → glucose + oxygen; 2 marks for the equation."],
        ["List three things a plant needs for photosynthesis, and say why each is needed.", "Light (energy), water, carbon dioxide; chlorophyll to trap light."],
      ],
    },
  },
  {
    match: /fraction/i,
    bank: {
      objective: [
        ["Simplify 6/8.", ["3/4", "2/3", "4/6", "1/2"], 0],
        ["What is 1/2 + 1/4?", ["2/6", "3/4", "1/6", "2/4"], 1],
        ["Which fraction is the largest?", ["2/5", "1/3", "3/4", "1/2"], 2],
        ["What is 3/5 of 20?", ["8", "15", "10", "12"], 3],
      ],
      trueFalse: [
        ["2/4 is equal to 1/2.", true],
        ["7/3 is a proper fraction.", false],
      ],
      fillGap: [
        ["The top number of a fraction is called the ____.", ["numerator"]],
        ["2/3 written with a denominator of 9 is ____/9.", ["6"]],
      ],
      theory: [
        ["Ada spent 1/3 of her money on books and 1/4 on food. What fraction did she have left? Show your working.", "1/3 + 1/4 = 7/12 spent; 1 − 7/12 = 5/12 left."],
      ],
    },
  },
  {
    match: /noun|verb|part.? of speech|adjective/i,
    bank: {
      objective: [
        ["In “The boy ran quickly”, the word “quickly” is", ["a noun", "an adverb", "a verb", "an adjective"], 1],
        ["Which of these is a proper noun?", ["city", "Lagos", "river", "teacher"], 1],
        ["Choose the verb: “Chiamaka sings every morning.”", ["Chiamaka", "every", "sings", "morning"], 2],
      ],
      trueFalse: [["An adjective describes a noun.", true]],
      fillGap: [["A word that names a person, place or thing is a ____.", ["noun"]]],
      theory: [["Write five sentences, each using a different part of speech, and underline it.", "One mark each for a correct sentence with the part of speech named."]],
    },
  },
];

const difficultyAt = (wanted: GenerateRequest["difficulty"], i: number): Difficulty => (wanted === "mixed" ? (["easy", "medium", "hard"] as const)[i % 3]! : wanted);

/** Draft questions for a request: from a bank when the topic is known, else plain samples. */
export function fakeQuestions(req: GenerateRequest, subjectName: string, levelName: string, seed = 0): Question[] {
  const out: Question[] = [];
  let n = seed;
  const pick = <T,>(list: T[]) => list[n++ % list.length]!;
  for (const type of ["objective", "trueFalse", "fillGap", "theory"] as const) {
    for (let i = 0; i < req.counts[type]; i++) {
      const topic = req.topics[i % req.topics.length]!;
      const bank = BANKS.find((b) => b.match.test(topic) || b.match.test(subjectName))?.bank;
      const difficulty = difficultyAt(req.difficulty, i);
      const marks = type === "theory" ? 10 : type === "fillGap" ? 2 : 1;
      if (type === "objective") {
        const [text, options, answer] = bank ? pick(bank.objective) : [`Sample question ${i + 1} on ${topic} for ${levelName} ${subjectName}: which is correct?`, ["The first choice", "The second choice", "The third choice", "The fourth choice"], i % 4];
        out.push({ type, text, options, answer, marks, topic, difficulty });
      } else if (type === "trueFalse") {
        const [text, answer] = bank ? pick(bank.trueFalse) : [`Sample statement ${i + 1} about ${topic}.`, i % 2 === 0];
        out.push({ type, text, answer, marks, topic, difficulty });
      } else if (type === "fillGap") {
        const [text, answers] = bank ? pick(bank.fillGap) : [`Sample sentence ${i + 1} about ${topic}, with a ____.`, ["gap"]];
        out.push({ type, text, answers, marks, topic, difficulty });
      } else {
        const [text, guide] = bank ? pick(bank.theory) : [`Sample question ${i + 1}: explain ${topic} in your own words.`, `The main points of ${topic}.`];
        out.push({ type, text, guide, marks, topic, difficulty });
      }
    }
  }
  return out;
}
