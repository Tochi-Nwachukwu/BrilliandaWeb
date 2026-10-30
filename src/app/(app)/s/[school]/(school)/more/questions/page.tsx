import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { QuestionBank } from "@/components/questions/QuestionBank";
import { deleteQuestion, generateQuestions, readNotes, saveQuestions, updateQuestion } from "@/data/actions/questions";
import { getQuestionBank } from "@/data/questions";

export const metadata: Metadata = { title: "Question bank" };

export default async function SchoolQuestions({ params }: PageProps<"/s/[school]/more/questions">) {
  const { school } = await params;
  await connection();
  const page = await getQuestionBank(school);
  if (!page) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Question bank">Every subject’s questions, for tests, assignments and exams, and the school’s AI use this month.</PageHeader>
      <QuestionBank
        page={page}
        actions={{
          generate: generateQuestions.bind(null, school),
          readNotes: readNotes.bind(null, school),
          save: saveQuestions.bind(null, school),
          update: updateQuestion.bind(null, school),
          remove: deleteQuestion.bind(null, school),
        }}
      />
    </div>
  );
}
