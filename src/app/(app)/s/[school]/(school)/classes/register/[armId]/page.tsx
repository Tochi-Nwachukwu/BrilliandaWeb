import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RegisterView } from "@/components/register/RegisterView";
import { saveRegister } from "@/data/actions/teaching";
import { getRegister } from "@/data/teaching";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Register" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Any class's register, for owners and admins: to take it when the form teacher can't, or to correct it. */
export default async function AdminRegister({ params, searchParams }: PageProps<"/s/[school]/classes/register/[armId]">) {
  const { school, armId } = await params;
  const sb = await schoolBase(school);
  const date = one((await searchParams).date);
  await connection();
  const register = await getRegister(school, armId, date);
  if (!register) notFound();
  const base = `${sb}/classes/register/${armId}`;

  return (
    <>
      <Link href={`${sb}/classes`} className="mb-3 inline-block rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        ← Classes
      </Link>
      <PageHeader title={`Register: ${register.armLabel}`}>Usually the form teacher takes it. You can take it for them, or correct a day this term.</PageHeader>
      <RegisterView key={`${armId}-${register.date}`} register={register} save={saveRegister.bind(null, school, armId)} dayHref={base} />
    </>
  );
}
