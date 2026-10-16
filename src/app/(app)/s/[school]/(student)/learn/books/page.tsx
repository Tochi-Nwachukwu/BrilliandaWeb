import { EmptyState } from "@brillianda/ui/EmptyState";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { BookListCard } from "@/components/school/BookListCard";
import { getStudentHome } from "@/data/learners";

export const metadata: Metadata = { title: "Book list" };

export default async function StudentBooks({ params }: PageProps<"/s/[school]/learn/books">) {
  const { school } = await params;
  await connection();
  const home = await getStudentHome(school);
  if (!home) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Book list">What your class needs, and what to get for next session.</PageHeader>
      {home.bookLists.length ? (
        home.bookLists.map(({ label, list }) => <BookListCard key={`${list.levelId}-${list.startYear}`} label={label} list={list} />)
      ) : (
        <EmptyState title="No book list yet">It shows here once the school shares it.</EmptyState>
      )}
    </div>
  );
}
