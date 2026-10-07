import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSchoolRequest,
  PlanTier,
  PlatformActivity,
  PlatformSchool,
  PlatformUsage,
  TrialRequest,
} from "@brillanda/shared-types";
import { api } from "../../shared/api/client";

// Data for the Brillanda team portal (packages/shared-types/src/platform.ts, DECISIONS.md F-36).

export const platformKeys = {
  all: ["platform"] as const,
  schools: ["platform", "schools"] as const,
  trials: ["platform", "trial-requests"] as const,
  activity: ["platform", "activity"] as const,
  usage: ["platform", "usage"] as const,
};

export const useSchools = () => useQuery({ queryKey: platformKeys.schools, queryFn: () => api<PlatformSchool[]>("/platform/schools") });
export const useTrialRequests = () => useQuery({ queryKey: platformKeys.trials, queryFn: () => api<TrialRequest[]>("/platform/trial-requests") });
export const useActivity = () => useQuery({ queryKey: platformKeys.activity, queryFn: () => api<PlatformActivity[]>("/platform/activity") });
export const useUsage = () => useQuery({ queryKey: platformKeys.usage, queryFn: () => api<PlatformUsage>("/platform/usage") });

/** Requests still waiting for a decision: new ones and ones with a call booked. */
export const isOpen = (trial: TrialRequest) => trial.status === "NEW" || trial.status === "CALL_BOOKED";

/** Every change can touch schools, requests and the timeline, so all three are refreshed. */
function usePlatformMutation<T, R>(fn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.all }),
  });
}

const post = <T>(path: string, body?: unknown) => api<T>(path, { method: "POST", body });
const schoolPath = (id: string, action: string) => `/platform/schools/${encodeURIComponent(id)}/${action}`;
const trialPath = (id: string, action: string) => `/platform/trial-requests/${encodeURIComponent(id)}/${action}`;

export const useCreateSchool = () => usePlatformMutation((body: CreateSchoolRequest) => post<PlatformSchool>("/platform/schools", body));
export const useSuspendSchool = () => usePlatformMutation(({ id, reason }: { id: string; reason: string }) => post<PlatformSchool>(schoolPath(id, "suspend"), { reason }));
export const useRestoreSchool = () => usePlatformMutation((id: string) => post<PlatformSchool>(schoolPath(id, "restore")));
export const useExtendTrial = () => usePlatformMutation(({ id, days }: { id: string; days: number }) => post<PlatformSchool>(schoolPath(id, "extend-trial"), { days }));
export const useChangePlan = () => usePlatformMutation(({ id, planTier }: { id: string; planTier: PlanTier }) => post<PlatformSchool>(schoolPath(id, "plan"), { planTier }));
export const useBookCall = () => usePlatformMutation(({ id, callAt }: { id: string; callAt: string }) => post<TrialRequest>(trialPath(id, "book-call"), { callAt }));
export const useDeclineTrial = () => usePlatformMutation(({ id, reason }: { id: string; reason?: string }) => post<TrialRequest>(trialPath(id, "decline"), { reason }));
