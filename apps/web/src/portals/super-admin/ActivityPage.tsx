import { useState } from "react";
import type { PlatformActivityKind } from "@brillanda/shared-types";
import { Alert } from "../../shared/components/Alert";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon, type IconName } from "../../shared/components/Icon";
import { PageHeader } from "../../shared/components/PageHeader";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { levelStyle } from "../../shared/theme/levels";
import { timeAgo } from "../../shared/utils/time";
import { useActivity, useSchools } from "./api";
import { SchoolPanel } from "./schools";

type Filter = "ALL" | "PUBLISHING" | "SCHOOLS" | "PEOPLE" | "ACCESS";

const GROUP: Record<PlatformActivityKind, Exclude<Filter, "ALL">> = {
  PUBLISH: "PUBLISHING",
  TRIAL_REQUEST: "SCHOOLS",
  SCHOOL_CREATED: "SCHOOLS",
  SETTINGS: "SCHOOLS",
  INVITE: "PEOPLE",
  IMPORT: "PEOPLE",
  BILLING: "ACCESS",
  SUSPEND: "ACCESS",
  RESTORE: "ACCESS",
};

const ICON: Record<PlatformActivityKind, IconName> = {
  PUBLISH: "publish",
  TRIAL_REQUEST: "inbox",
  SCHOOL_CREATED: "school",
  SETTINGS: "settings",
  INVITE: "mail",
  IMPORT: "upload",
  BILLING: "clock",
  SUSPEND: "lock",
  RESTORE: "check",
};

export function ActivityPage() {
  const activity = useActivity();
  const schools = useSchools();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);

  if (activity.isPending) return <PageSpinner />;
  if (activity.error) return <Alert tone="danger">{activity.error.message}</Alert>;

  const shown = activity.data.filter((a) => filter === "ALL" || GROUP[a.kind] === filter);
  const count = (f: Filter) => activity.data.filter((a) => GROUP[a.kind] === f).length;

  return (
    <>
      <PageHeader title="Activity">What's happening across every school, newest first.</PageHeader>
      <div className="mb-5">
        <FilterTabs
          label="Show"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "ALL", label: "Everything" },
            { value: "PUBLISHING", label: "Publishing", count: count("PUBLISHING") },
            { value: "SCHOOLS", label: "Trials and schools", count: count("SCHOOLS") },
            { value: "PEOPLE", label: "Invites and imports", count: count("PEOPLE") },
            { value: "ACCESS", label: "Billing and access", count: count("ACCESS") },
          ]}
        />
      </div>

      {shown.length ? (
        <ol className="grid gap-0.5 rounded-3xl bg-surface p-3 shadow-raised sm:p-4">
          {shown.map((item, index) => (
            <li
              key={item.id}
              className="relative grid animate-pop grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 rounded-2xl p-2 hover:bg-hover sm:grid-cols-[40px_minmax(0,1fr)_auto]"
              style={{ ["--d" as string]: `${index * 0.04}s` }}
            >
              {index < shown.length - 1 && <span aria-hidden className="absolute bottom-[-10px] left-[27px] top-[50px] w-0.5 rounded bg-divider" />}
              <span aria-hidden className="relative z-10 grid h-10 w-10 place-items-center rounded-[13px]" style={{ ...levelStyle(index), background: "var(--tint)", color: "var(--deep)" }}>
                <Icon name={ICON[item.kind]} className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[14.5px]">{item.text}</p>
                <p className="text-[12.5px] text-text-muted">{timeAgo(item.at)}</p>
              </div>
              {item.schoolId && schools.data?.some((s) => s.id === item.schoolId) && (
                <button
                  type="button"
                  onClick={() => setOpenId(item.schoolId)}
                  className="col-start-2 justify-self-start rounded-full bg-raise px-3.5 py-1.5 text-[13px] font-medium shadow-raised hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:col-start-auto"
                >
                  Open school
                </button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="Nothing yet">Nothing of this kind has happened recently.</EmptyState>
      )}

      <SchoolPanel school={schools.data?.find((s) => s.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </>
  );
}
