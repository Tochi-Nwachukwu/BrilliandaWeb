"use client";

import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { PageHeader } from "@brillianda/ui/PageHeader";
import { toast } from "@brillianda/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SampleLinks } from "@/components/auth/forms";
import type { ActionResult, ParentAccess, ParentsPage, SampleEmail } from "@/data/types";

const STATUS: Record<ParentAccess, { label: string; tone: "success" | "warning" | "neutral" }> = {
  active: { label: "On the app", tone: "success" },
  invited: { label: "Invited", tone: "warning" },
  none: { label: "Not invited", tone: "neutral" },
};

/** More › Parents (batch 12): invite guardians to follow their children, one by one or all at once. */
export function ParentsView({
  school,
  page,
  invite,
  inviteAll,
  remove,
}: {
  school: string;
  page: ParentsPage;
  invite: (guardianId: string) => Promise<ActionResult<SampleEmail>>;
  inviteAll: () => Promise<ActionResult<SampleEmail & { invited: number; withoutEmail: number }>>;
  remove: (guardianId: string) => Promise<ActionResult<null>>;
}) {
  const router = useRouter();
  const [links, setLinks] = useState<SampleEmail["sampleLinks"]>();
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const notInvited = page.guardians.filter((g) => g.access === "none" && g.email).length;
  const noEmail = page.guardians.filter((g) => g.access === "none" && !g.email).length;
  const onApp = page.guardians.filter((g) => g.access === "active").length;

  const run = (id: string, action: () => Promise<ActionResult<unknown>>, done: (data: unknown) => void) => {
    setBusy(id);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if (!result.ok) return toast(result.error);
      done(result.data);
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title="Parents"
        actions={
          notInvited > 0 && (
            <Button
              loading={pending && busy === "all"}
              onClick={() =>
                run("all", inviteAll, (data) => {
                  const d = data as SampleEmail & { invited: number; withoutEmail: number };
                  setLinks(d.sampleLinks);
                  toast(`Invited ${d.invited} ${d.invited === 1 ? "parent" : "parents"}`);
                })
              }
            >
              Invite {notInvited} {notInvited === 1 ? "parent" : "parents"}
            </Button>
          )
        }
      >
        Parents see their own children’s class, form teacher and attendance, and nothing else. {onApp} of {page.guardians.length} use the app.
        {noEmail > 0 ? ` ${noEmail} have no email on file: add one from their child’s page to invite them.` : ""}
      </PageHeader>

      {links && links.length > 0 && (
        <div className="mb-4 rounded-3xl bg-surface p-5 shadow-raised">
          <SampleLinks links={links} />
        </div>
      )}

      {page.guardians.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No guardians yet">Guardians come from your students’ records. Add a guardian when you add or edit a student.</EmptyState>
        </div>
      ) : (
        <ul className="grid gap-0.5 rounded-3xl bg-surface p-2 shadow-raised">
          {page.guardians.map((g) => (
            <li key={g.id} className="grid gap-2 rounded-2xl p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <b className="font-semibold">{g.name}</b>
                  <Badge tone={STATUS[g.access].tone}>{STATUS[g.access].label}</Badge>
                </p>
                <p className="text-[13px] text-text-secondary">
                  {g.children.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ", "}
                      <Link href={`/s/${school}/students/${c.id}`} className="underline underline-offset-2 hover:text-text-primary">
                        {c.fullName}
                      </Link>{" "}
                      ({c.armLabel})
                    </span>
                  ))}
                </p>
                <p className="truncate text-[13px] text-text-secondary">{g.email ?? "No email on file"}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {g.access !== "active" && g.email && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending && busy === g.id}
                    onClick={() =>
                      run(g.id, () => invite(g.id), (data) => {
                        setLinks((data as SampleEmail).sampleLinks);
                        toast(`Invite sent to ${g.name}`);
                      })
                    }
                  >
                    {g.access === "invited" ? "Send again" : "Invite"}
                  </Button>
                )}
                {g.access !== "none" && (
                  <Button size="sm" variant="danger-quiet" disabled={pending} onClick={() => run(g.id, () => remove(g.id), () => toast(g.access === "invited" ? "Invite cancelled" : `${g.name} can’t sign in any more`))}>
                    {g.access === "invited" ? "Cancel invite" : "End access"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
