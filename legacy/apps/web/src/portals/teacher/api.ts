import { useQuery } from "@tanstack/react-query";
import type {
  MarkCompleteResponse,
  SaveScoreRequest,
  SaveScoreResponse,
  ScoreSheet,
  TeacherAssignmentsResponse,
} from "@brillanda/shared-types";
import { api } from "../../shared/api/client";

export const teacherKeys = {
  assignments: ["teacher", "assignments"] as const,
  sheet: (armId: string, subjectId: string, termId: string) => ["teacher", "score-sheet", armId, subjectId, termId] as const,
};

export function useTeacherAssignments() {
  return useQuery({
    queryKey: teacherKeys.assignments,
    queryFn: () => api<TeacherAssignmentsResponse>("/teacher/assignments"),
  });
}

export function useScoreSheet(armId: string, subjectId: string, termId: string) {
  return useQuery({
    queryKey: teacherKeys.sheet(armId, subjectId, termId),
    queryFn: () => api<ScoreSheet>(`/scores?${new URLSearchParams({ armId, subjectId, termId })}`),
    // The grid keeps its own copy while a teacher types; a background refetch would change nothing on screen.
    refetchOnReconnect: false,
  });
}

export function saveScore(studentId: string, componentId: string, body: SaveScoreRequest) {
  return api<SaveScoreResponse>(`/scores/${encodeURIComponent(studentId)}/${encodeURIComponent(componentId)}`, {
    method: "PUT",
    body,
  });
}

export function markSheetComplete(armId: string, subjectId: string, termId: string) {
  const path = [armId, subjectId, termId].map(encodeURIComponent);
  return api<MarkCompleteResponse>(`/scores/arm/${path[0]}/subject/${path[1]}/term/${path[2]}/mark-complete`, {
    method: "POST",
  });
}
