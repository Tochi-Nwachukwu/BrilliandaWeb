import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listConsoleSchools } from "@/data/console";
import { SchoolsList } from "./SchoolsList";

export const metadata: Metadata = { title: "Schools", robots: { index: false } };

export default async function ConsoleSchools() {
  await connection();
  const schools = await listConsoleSchools();
  if (!schools) return null;
  return (
    <>
      <PageHeader title="Schools">Every school on Brillianda. Open one for its summary; the school sees in its history that you looked.</PageHeader>
      <SchoolsList schools={schools} now={new Date().getTime()} />
    </>
  );
}
