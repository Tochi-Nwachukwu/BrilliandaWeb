import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { completePromotion, setDecision, setPassMark } from "@/data/actions/schoolyear";
import { getPromotionPlan } from "@/data/schoolyear";
import { PromotionView } from "./PromotionView";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Promotion" };

/** Promotion at the end of the session (batch 18): suggested from the yearly average, changeable by hand. */
export default async function PromotionPage({ params }: PageProps<"/s/[school]/more/promotion">) {
  const { school } = await params;
  const sb = await schoolBase(school);
  await connection();
  const plan = await getPromotionPlan(school);
  if (!plan) return null;
  return (
    <>
      <Link href={`${sb}/more/sessions`} className="mb-3 inline-block rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        ← Sessions and terms
      </Link>
      <PageHeader title="Promotion">
        From {plan.sessionName} to {plan.nextSessionName}. Each student’s yearly average suggests a decision; change any of them before you complete it.
      </PageHeader>
      <PromotionView plan={plan} setPassMark={setPassMark.bind(null, school)} setDecision={setDecision.bind(null, school)} complete={completePromotion.bind(null, school)} />
    </>
  );
}
