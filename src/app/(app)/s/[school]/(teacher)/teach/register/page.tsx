import { EmptyState } from "@brillianda/ui/EmptyState";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { RegisterView } from "@/components/register/RegisterView";
import { saveRegister } from "@/data/actions/teaching";
import { getRegister, getTeacherHome } from "@/data/teaching";

export const metadata: Metadata = { title: "Register" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The form teacher's register. Most teachers have one form class; a teacher with more picks one. */
export default async function TeacherRegister({ params, searchParams }: PageProps<"/s/[school]/teach/register">) {
  const { school } = await params;
  const query = await searchParams;
  await connection();
  const home = await getTeacherHome(school);
  if (!home) return null;
  const base = `/s/${school}/teach/register`;

  if (!home.formArms.length) {
    return (
      <>
        <PageHeader title="Register" />
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No form class yet">When your school makes you a class’s form teacher, its daily register is here.</EmptyState>
        </div>
      </>
    );
  }

  const asked = one(query.arm);
  const armId = home.formArms.some((a) => a.armId === asked) ? asked! : home.formArms[0]!.armId;
  const register = await getRegister(school, armId, one(query.date));
  if (!register) return null;

  return (
    <>
      <PageHeader title={`Register: ${register.armLabel}`}>Mark each student present, late or absent. Late counts as present on the report card.</PageHeader>
      {home.formArms.length > 1 && (
        <nav aria-label="Your form classes" className="mb-4 flex flex-wrap gap-2">
          {home.formArms.map((a) => (
            <Link
              key={a.armId}
              href={`${base}?arm=${a.armId}`}
              aria-current={a.armId === armId ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent ${a.armId === armId ? "bg-primary text-primary-text" : "bg-raise shadow-raised hover:bg-hover"}`}
            >
              {a.label}
            </Link>
          ))}
        </nav>
      )}
      <RegisterView key={`${register.armId}-${register.date}`} register={register} save={saveRegister.bind(null, school, armId)} dayHref={`${base}?arm=${armId}`} />
    </>
  );
}
