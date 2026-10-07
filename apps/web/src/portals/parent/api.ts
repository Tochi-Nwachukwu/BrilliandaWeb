import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChildResults, ChildSummary, ParentReportCard, SchoolNotice } from "@brillanda/shared-types";
import { api } from "../../shared/api/client";

// Data for the parent portal (packages/shared-types/src/parent.ts, DECISIONS.md F-38).

const KEY = ["parent"] as const;
export const parentKeys = {
  all: KEY,
  children: [...KEY, "children"] as const,
  results: (childId: string) => [...KEY, "results", childId] as const,
  card: (childId: string, termId: string) => [...KEY, "report-card", childId, termId] as const,
  notices: [...KEY, "notices"] as const,
};

export const useChildren = () => useQuery({ queryKey: parentKeys.children, queryFn: () => api<ChildSummary[]>("/parent/children") });
export const useChildResults = (childId: string | undefined) =>
  useQuery({ queryKey: parentKeys.results(childId ?? ""), queryFn: () => api<ChildResults>(`/parent/children/${encodeURIComponent(childId!)}/results`), enabled: !!childId });
export const useParentReportCard = (childId: string, termId: string | null) =>
  useQuery({
    queryKey: parentKeys.card(childId, termId ?? ""),
    queryFn: () => api<ParentReportCard>(`/parent/children/${encodeURIComponent(childId)}/report-cards/${encodeURIComponent(termId!)}`),
    enabled: !!termId,
  });
export const useNotices = () => useQuery({ queryKey: parentKeys.notices, queryFn: () => api<SchoolNotice[]>("/parent/notices") });

/** Opening a new result clears its "New" marker. */
export function useMarkSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, termId }: { childId: string; termId: string }) =>
      api<void>(`/parent/children/${encodeURIComponent(childId)}/terms/${encodeURIComponent(termId)}/seen`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parentKeys.all }),
  });
}
