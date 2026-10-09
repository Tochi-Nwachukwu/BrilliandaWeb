import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { setAdmissionFormat } from "@/data/actions/students";
import { getSession } from "@/data/home";
import { getAdmissionSettings } from "@/data/students";
import { AdmissionForm } from "./AdmissionForm";

export const metadata: Metadata = { title: "Admission numbers" };

export default async function AdmissionNumbersPage({ params }: PageProps<"/s/[school]/more/admission-numbers">) {
  const { school } = await params;
  const [settings, session] = await Promise.all([getAdmissionSettings(school), getSession(school)]);
  if (!settings || !session) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Admission numbers">Every student gets one, in your school’s format. Two admins adding students at once never get the same number.</PageHeader>
      <AdmissionForm settings={settings} year={session.startYear} save={setAdmissionFormat.bind(null, school)} />
    </div>
  );
}
