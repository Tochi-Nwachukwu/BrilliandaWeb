import { Icon, type IconName } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "More" };

const ITEMS: { path: string; icon: IconName; title: string; detail: string }[] = [
  { path: "branding", icon: "school", title: "Branding", detail: "Your school’s name, colour and logo" },
  { path: "sessions", icon: "calendar", title: "Sessions and terms", detail: "Your school year, its terms and their dates" },
  { path: "admission-numbers", icon: "students", title: "Admission numbers", detail: "The format new students get, like GC/2026/0042" },
  { path: "admins", icon: "staff", title: "Admins", detail: "Who helps run the school on Brillianda" },
];

/** Everything that isn't one of the four main tabs (plan: phone tab bar ends with More). */
export default async function MorePage({ params }: PageProps<"/s/[school]/more">) {
  const { school } = await params;
  return (
    <>
      <PageHeader title="More" />
      <ul className="grid gap-0.5 rounded-3xl bg-surface p-2 shadow-raised">
        {ITEMS.map((item) => (
          <li key={item.path}>
            <Link
              href={`/s/${school}/more/${item.path}`}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl p-3 hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span aria-hidden className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <b className="block font-semibold">{item.title}</b>
                <span className="block truncate text-[13px] text-text-secondary">{item.detail}</span>
              </span>
              <Icon name="chevron" className="h-4 w-4 text-text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
