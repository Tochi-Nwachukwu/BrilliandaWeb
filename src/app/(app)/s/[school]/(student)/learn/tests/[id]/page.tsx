import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { noteLeftPage, saveAnswer, startTest, submitTest } from "@/data/actions/cbt";
import { getTakingTest } from "@/data/cbt";
import { TakeTest } from "./TakeTest";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Test" };

export default async function TestPage({ params }: PageProps<"/s/[school]/learn/tests/[id]">) {
  const { school, id } = await params;
  const sb = await schoolBase(school);
  await connection();
  const test = await getTakingTest(school, id);
  if (!test) notFound();
  const back = `${sb}/learn/tests`;
  return (
    <div className="grid gap-4">
      <Link href={back} className="w-fit rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        ← Tests
      </Link>
      <TakeTest
        test={test}
        serverNow={new Date().getTime()}
        back={back}
        actions={{
          start: startTest.bind(null, school, id),
          save: saveAnswer.bind(null, school, id),
          left: noteLeftPage.bind(null, school, id),
          submit: submitTest.bind(null, school, id),
        }}
      />
    </div>
  );
}
