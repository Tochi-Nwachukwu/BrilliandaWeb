import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { saveBirthdaySettings } from "@/data/actions/birthdays";
import { getBirthdays } from "@/data/birthdays";
import { BirthdaysView } from "./BirthdaysView";

export const metadata: Metadata = { title: "Birthdays" };

export default async function BirthdaysPage({ params }: PageProps<"/s/[school]/more/birthdays">) {
  const { school } = await params;
  // Whose birthday is coming depends on today.
  await connection();
  const page = await getBirthdays(school);
  if (!page) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Birthdays">A text to each student’s guardian on their birthday, and a card on the parent app.</PageHeader>
      <BirthdaysView page={page} save={saveBirthdaySettings.bind(null, school)} />
    </div>
  );
}
