import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdmissionNumberSettings,
  CloseTermRequest,
  CloseTermResponse,
  CompletePromotionRequest,
  CompletePromotionResponse,
  PromotionChangeRequest,
  PromotionPlan,
  SessionInfo,
  EnrolStudentRequest,
  EnrolStudentResponse,
  ImportStudentsRequest,
  ImportStudentsResponse,
  LeaveSchoolRequest,
  StudentNote,
  StudentPhotoResponse,
  StudentRecord,
  StudentResults,
  UpdateStudentRequest,
  AdminOverview,
  AdminSheet,
  AdminStudent,
  ArmDetail,
  ArmSummary,
  GradingScaleBody,
  InviteParentRequest,
  InviteStaffRequest,
  PendingUnlockRequest,
  PublishResponse,
  ReportCard,
  SchoolLogoResponse,
  SchoolProfile,
  SetupStatus,
  StaffMember,
  TermDates,
  TryClassRequest,
  TryClassResponse,
} from "@brillanda/shared-types";
import { api } from "../../shared/api/client";

// Data for the school admin portal (packages/shared-types/src/admin.ts, DECISIONS.md F-37).

const KEY = ["admin"] as const;
export const adminKeys = {
  all: KEY,
  overview: [...KEY, "overview"] as const,
  arms: [...KEY, "arms"] as const,
  arm: (id: string) => [...KEY, "arms", id] as const,
  sheet: (armId: string, subjectId: string) => [...KEY, "sheet", armId, subjectId] as const,
  unlocks: [...KEY, "unlock-requests"] as const,
  students: [...KEY, "students"] as const,
  staff: [...KEY, "staff"] as const,
  reportCard: (studentId: string) => [...KEY, "report-card", studentId] as const,
  school: [...KEY, "school"] as const,
  term: [...KEY, "term"] as const,
  scale: [...KEY, "grading-scale"] as const,
  setup: [...KEY, "setup"] as const,
  student: (id: string) => [...KEY, "students", id] as const,
  admissionNumbers: [...KEY, "admission-numbers"] as const,
};

export const useOverview = () => useQuery({ queryKey: adminKeys.overview, queryFn: () => api<AdminOverview>("/admin/overview") });
export const useArms = () => useQuery({ queryKey: adminKeys.arms, queryFn: () => api<ArmSummary[]>("/admin/arms") });
export const useArm = (id: string) => useQuery({ queryKey: adminKeys.arm(id), queryFn: () => api<ArmDetail>(`/admin/arms/${encodeURIComponent(id)}`) });
export const useAdminSheet = (armId: string, subjectId: string) =>
  useQuery({ queryKey: adminKeys.sheet(armId, subjectId), queryFn: () => api<AdminSheet>(`/admin/sheets?${new URLSearchParams({ armId, subjectId })}`) });
export const useUnlockRequests = () => useQuery({ queryKey: adminKeys.unlocks, queryFn: () => api<PendingUnlockRequest[]>("/admin/unlock-requests") });
export const useStudents = () => useQuery({ queryKey: adminKeys.students, queryFn: () => api<AdminStudent[]>("/admin/students") });
export const useStaff = () => useQuery({ queryKey: adminKeys.staff, queryFn: () => api<StaffMember[]>("/admin/staff") });
export const useReportCard = (studentId: string | null) =>
  useQuery({ queryKey: adminKeys.reportCard(studentId ?? ""), queryFn: () => api<ReportCard>(`/admin/report-cards/${encodeURIComponent(studentId!)}`), enabled: !!studentId });
export const useSchoolProfile = () => useQuery({ queryKey: adminKeys.school, queryFn: () => api<SchoolProfile>("/admin/school") });
export const useTermDates = () => useQuery({ queryKey: adminKeys.term, queryFn: () => api<TermDates>("/admin/term") });
export const useGradingScale = () => useQuery({ queryKey: adminKeys.scale, queryFn: () => api<GradingScaleBody>("/admin/grading-scale") });
export const useSetup = () => useQuery({ queryKey: adminKeys.setup, queryFn: () => api<SetupStatus>("/admin/setup") });
export const useStudent = (id: string | null) =>
  useQuery({ queryKey: adminKeys.student(id ?? ""), queryFn: () => api<StudentRecord>(`/admin/students/${encodeURIComponent(id!)}`), enabled: !!id });
export const useStudentResults = (id: string) =>
  useQuery({ queryKey: [...adminKeys.student(id), "results"], queryFn: () => api<StudentResults>(`/admin/students/${encodeURIComponent(id)}/results`) });
export const usePastReportCard = (studentId: string, termId: string | null) =>
  useQuery({
    queryKey: [...adminKeys.student(studentId), "report-card", termId],
    queryFn: () => api<ReportCard>(`/admin/students/${encodeURIComponent(studentId)}/report-cards/${encodeURIComponent(termId!)}`),
    enabled: !!termId,
  });
export const useSession = () => useQuery({ queryKey: [...KEY, "session"], queryFn: () => api<SessionInfo>("/admin/session") });
export const useAdmissionNumbers = () => useQuery({ queryKey: adminKeys.admissionNumbers, queryFn: () => api<AdmissionNumberSettings>("/admin/admission-numbers") });

/** A change can move any figure on any admin page, so everything admin is refreshed. */
function useAdminMutation<T, R>(fn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }) });
}

const send = <T>(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown) => api<T>(path, { method, body });

export const useDecideUnlock = () =>
  useAdminMutation(({ id, decision }: { id: string; decision: "approve" | "decline" }) => send<void>(`/admin/unlock-requests/${encodeURIComponent(id)}/${decision}`, "POST"));
export const useSendReminders = () =>
  useAdminMutation((body: { teacherIds: string[]; note?: string }) => send<{ sent: number }>("/admin/reminders", "POST", body));
export const usePublish = () => useAdminMutation((armIds: string[]) => send<PublishResponse>("/admin/publish", "POST", { armIds }));
export const useInviteParent = () =>
  useAdminMutation(({ studentId, ...body }: InviteParentRequest & { studentId: string }) => send<void>(`/admin/students/${encodeURIComponent(studentId)}/invite-parent`, "POST", body));
export const useInviteStaff = () => useAdminMutation((body: InviteStaffRequest) => send<{ resent: boolean }>("/users/invite", "POST", body));
export const useSaveSchool = () => useAdminMutation((body: SchoolProfile) => send<SchoolProfile>("/admin/school", "PUT", body));
export const useSaveTerm = () => useAdminMutation((body: TermDates) => send<TermDates>("/admin/term", "PUT", body));
export const useSaveScale = () => useAdminMutation((body: GradingScaleBody) => send<GradingScaleBody>("/admin/grading-scale", "PUT", body));
export const useUploadLogo = () =>
  useAdminMutation((file: File) => {
    const form = new FormData();
    form.append("logo", file);
    return send<SchoolLogoResponse>("/admin/school/logo", "POST", form);
  });
export const useRemoveLogo = () => useAdminMutation(() => send<SchoolLogoResponse>("/admin/school/logo", "DELETE"));

// Enrolment (F-40).
export const useEnrolStudent = () => useAdminMutation((body: EnrolStudentRequest) => send<EnrolStudentResponse>("/admin/students", "POST", body));
export const useUpdateStudent = () =>
  useAdminMutation(({ id, ...body }: UpdateStudentRequest & { id: string }) => send<StudentRecord>(`/admin/students/${encodeURIComponent(id)}`, "PUT", body));
export const useLeaveSchool = () =>
  useAdminMutation(({ id, ...body }: LeaveSchoolRequest & { id: string }) => send<StudentRecord>(`/admin/students/${encodeURIComponent(id)}/leave`, "POST", body));
/** Checking a list saves nothing, so nothing else needs refreshing. */
export const useCheckImport = () => useMutation({ mutationFn: (body: Omit<ImportStudentsRequest, "check">) => send<ImportStudentsResponse>("/admin/students/import", "POST", { ...body, check: true }) });
export const useImportStudents = () =>
  useAdminMutation((body: Omit<ImportStudentsRequest, "check">) => send<ImportStudentsResponse>("/admin/students/import", "POST", { ...body, check: false }));
export const useReadmit = () => useAdminMutation((id: string) => send<StudentRecord>(`/admin/students/${encodeURIComponent(id)}/readmit`, "POST"));
// The school year (F-43) and promotion at its end (F-44).
export const useCloseTerm = () => useAdminMutation((body: CloseTermRequest) => send<CloseTermResponse>("/admin/session/close-term", "POST", body));
export const usePromotion = () => useQuery({ queryKey: [...KEY, "promotion"], queryFn: () => api<PromotionPlan>("/admin/promotion") });
export const useSetPassMark = () => useAdminMutation((passMark: number) => send<PromotionPlan>("/admin/promotion/pass-mark", "PUT", { passMark }));
export const useChangePromotion = () =>
  useAdminMutation(({ id, ...body }: PromotionChangeRequest & { id: string }) => send<PromotionPlan>(`/admin/promotion/students/${encodeURIComponent(id)}`, "PUT", body));
export const useCompletePromotion = () =>
  useAdminMutation((body: CompletePromotionRequest) => send<CompletePromotionResponse>("/admin/promotion/complete", "POST", body));

// A student's own page (F-42).
export const useAddNote = () =>
  useAdminMutation(({ id, text }: { id: string; text: string }) => send<StudentNote>(`/admin/students/${encodeURIComponent(id)}/notes`, "POST", { text }));
export const useDeleteNote = () =>
  useAdminMutation(({ id, noteId }: { id: string; noteId: string }) => send<void>(`/admin/students/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`, "DELETE"));
export const useUploadStudentPhoto = () =>
  useAdminMutation(({ id, file }: { id: string; file: File }) => {
    const form = new FormData();
    form.append("photo", file);
    return send<StudentPhotoResponse>(`/admin/students/${encodeURIComponent(id)}/photo`, "POST", form);
  });
export const useRemoveStudentPhoto = () => useAdminMutation((id: string) => send<StudentPhotoResponse>(`/admin/students/${encodeURIComponent(id)}/photo`, "DELETE"));
export const useSaveAdmissionNumbers = () =>
  useAdminMutation((body: AdmissionNumberSettings) => send<AdmissionNumberSettings>("/admin/admission-numbers", "PUT", body));

// Getting a new school set up (F-39).
export const useTryClass = () => useAdminMutation((body: TryClassRequest) => send<TryClassResponse>("/admin/setup/try-class", "POST", body));
export const useFinishFirstRun = () => useAdminMutation(() => send<void>("/admin/setup/first-run", "POST"));
export const useHideChecklist = () => useAdminMutation((hidden: boolean) => send<void>(`/admin/setup/checklist/${hidden ? "hide" : "show"}`, "POST"));

/** JSS 1 to JSS 3, then SS 1 to SS 3: how the school groups its classes. */
export const SECTIONS = [
  { id: "junior", name: "Junior secondary", range: "JSS 1 to JSS 3", orders: [0, 1, 2], tintLevel: 0 },
  { id: "senior", name: "Senior secondary", range: "SS 1 to SS 3", orders: [3, 4, 5], tintLevel: 3 },
] as const;

export const isDone = (status: string) => status === "COMPLETE" || status === "LOCKED";
