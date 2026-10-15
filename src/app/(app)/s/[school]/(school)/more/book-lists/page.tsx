import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { saveBookList, setBookListShared } from "@/data/actions/booklists";
import { getBookLists } from "@/data/booklists";
import { BookListsView } from "./BookListsView";

export const metadata: Metadata = { title: "Book lists" };

export default async function BookListsPage({ params, searchParams }: PageProps<"/s/[school]/more/book-lists">) {
  const { school } = await params;
  const query = await searchParams;
  await connection();
  const session = Number(query.session) || undefined;
  const page = await getBookLists(school, session);
  if (!page) return null;
  const level = typeof query.level === "string" ? query.level : null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Book lists">The books and things each class needs. Parents see a list once you share it: the class their child is in, and the one they move into next session.</PageHeader>
      <BookListsView
        key={page.startYear}
        page={page}
        base={`/s/${school}/more/book-lists`}
        initialLevel={level}
        save={saveBookList.bind(null, school)}
        share={setBookListShared.bind(null, school)}
      />
    </div>
  );
}
