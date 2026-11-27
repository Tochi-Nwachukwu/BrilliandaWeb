"use server";

// Invites sent right after a student is added: the student to the student portal, the guardian to
// the parent app. Each part is reported on its own, so one failing doesn't hide the other.
import { emailOnlySchema } from "@brillianda/core/auth";
import { revalidatePath } from "next/cache";
import { LIVE } from "../api/client";
import * as liveLearners from "../api/learners";
import * as liveParents from "../api/parents";
import * as fakeLearners from "../fake/learners";
import * as fakeParents from "../fake/parents";
import { getStudent } from "../students";

const learners = LIVE ? liveLearners : fakeLearners;
const parents = LIVE ? liveParents : fakeParents;

export type NewStudentInvites = { student: "none" | "sent" | string; guardian: "none" | "sent" | string };

/** `student` and `guardian` are "none" (not asked), "sent", or the reason it didn't go. */
export async function inviteNewStudent(school: string, studentId: string, input: { studentEmail?: string; guardian?: boolean }): Promise<NewStudentInvites> {
  const out: NewStudentInvites = { student: "none", guardian: "none" };
  const email = String(input.studentEmail ?? "").trim();
  if (email) {
    const parsed = emailOnlySchema.safeParse({ email });
    if (!parsed.success) out.student = "The student’s email doesn’t look right.";
    else {
      const result = await learners.inviteStudent(String(school), String(studentId), parsed.data.email);
      out.student = result.ok ? "sent" : result.error;
    }
  }
  if (input.guardian) {
    const detail = await getStudent(String(school), String(studentId));
    const guardian = detail?.guardian;
    if (!guardian) out.guardian = "There’s no guardian on this student.";
    else if (!guardian.email) out.guardian = "The guardian has no email, so there’s nowhere to send the invite.";
    else {
      const result = await parents.inviteParent(String(school), guardian.id);
      out.guardian = result.ok ? "sent" : result.error;
    }
  }
  revalidatePath(`/s/${school}`, "layout");
  return out;
}
