import { Icon, type IconName } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { countOpenCorrections } from "@/data/corrections";

export const metadata: Metadata = { title: "More" };

const ITEMS: { path: string; icon: IconName; title: string; detail: string }[] = [
  { path: "corrections", icon: "inbox", title: "Corrections", detail: "Parents asking to correct their child’s details" },
  { path: "branding", icon: "school", title: "Branding", detail: "Your school’s name, colour and logo" },
  { path: "promotion", icon: "classes", title: "Promotion", detail: "Who moves up at the end of the session" },
  { path: "timetable", icon: "calendar", title: "Timetable", detail: "Each class’s week, and the bell schedule" },
  { path: "book-lists", icon: "book", title: "Book lists", detail: "Books and things each class needs, for parents" },
  { path: "birthdays", icon: "cake", title: "Birthdays", detail: "A text to each student’s guardian on their birthday" },
  { path: "sessions", icon: "calendar", title: "Sessions and terms", detail: "Your school year, its terms and their dates" },
  { path: "admission-numbers", icon: "students", title: "Admission numbers", detail: "The format new students get, like GC/2026/0042" },
  { path: "history", icon: "activity", title: "Change history", detail: "Who changed what, and when" },
  { path: "../subjects", icon: "subjects", title: "Subjects", detail: "What each class level takes" },
  { path: "results", icon: "results", title: "Results settings", detail: "Score parts, grades and positions" },
  { path: "teachers", icon: "classes", title: "Teachers", detail: "Form classes, subjects, and who takes each register" },
  { path: "parents", icon: "students", title: "Parents", detail: "Invite guardians to follow their children’s attendance" },
  { path: "admins", icon: "staff", title: "Admins", detail: "Who helps run the school on Brillianda" },
];

/** Everything that isn't one of the four main tabs (plan: phone tab bar ends with More). */
export default async function MorePage({ params }: PageProps<"/s/[school]/more">) {
  const { school } = await params;
  await connection();
  const waiting = await countOpenCorrections(school);
  return (
    <>
      <PageHeader title="More" />
      <ul className="grid gap-0.5 rounded-3xl bg-surface p-2 shadow-raised">
        {ITEMS.map((item) => (
          <li key={item.path}>
            <Link
              href={item.path.startsWith("../") ? `/s/${school}/${item.path.slice(3)}` : `/s/${school}/more/${item.path}`}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl p-3 hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span aria-hidden className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <b className="block font-semibold">{item.title}</b>
                <span className="block truncate text-[13px] text-text-secondary">{item.detail}</span>
              </span>
              <span className="flex items-center gap-2">
                {item.path === "corrections" && waiting > 0 && (
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-danger px-2 text-[12px] font-semibold text-primary-text">
                    {waiting}
                    <span className="sr-only"> waiting</span>
                  </span>
                )}
                <Icon name="chevron" className="h-4 w-4 text-text-muted" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
