import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { QuestionBank } from "@/components/questions/QuestionBank";
import { deleteQuestion, generateQuestions, saveQuestions, updateQuestion } from "@/data/actions/questions";
import { getQuestionBank } from "@/data/questions";

export const metadata: Metadata = { title: "Questions" };

export default async function TeacherQuestions({ params }: PageProps<"/s/[school]/teach/questions">) {
  const { school } = await params;
  await connection();
  const page = await getQuestionBank(school);
  if (!page) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Questions">Your question bank, for tests, assignments and exams. Write questions, or generate a set with AI and check it.</PageHeader>
      <QuestionBank
        page={page}
        actions={{
          generate: generateQuestions.bind(null, school),
          save: saveQuestions.bind(null, school),
          update: updateQuestion.bind(null, school),
          remove: deleteQuestion.bind(null, school),
        }}
      />
    </div>
  );
}
