"use client";

import { PageHeader } from "@brillianda/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActionResult, ArmOption, GuardianMatch, StudentDetail } from "@/data/types";
import { StudentForm } from "../../StudentForm";

export function EditStudent({
  school,
  student,
  arms,
  updateStudent,
  findGuardian,
}: {
  school: string;
  student: StudentDetail;
  arms: ArmOption[];
  updateStudent: (input: unknown) => Promise<ActionResult<null>>;
  findGuardian: (phone: string) => Promise<GuardianMatch | null>;
}) {
  const router = useRouter();
  const page = `/s/${school}/students/${student.id}`;
  const g = student.guardian;
  return (
    <div className="grid gap-4">
      <PageHeader
        title={`Edit ${student.firstName}`}
        actions={
          <Link href={page} className="text-sm font-medium text-accent hover:underline">
            Back to {student.firstName}
          </Link>
        }
      >
        Changing the class records the move in {student.firstName}’s class history.
      </PageHeader>
      <StudentForm
        arms={arms}
        mode="edit"
        initial={{
          firstName: student.firstName,
          lastName: student.lastName,
          otherNames: student.otherNames,
          gender: student.gender,
          armId: student.armId,
          dateOfBirth: student.dateOfBirth,
          admissionNo: student.admissionNo,
          admissionDate: student.admissionDate,
          address: student.address,
          stateOfOrigin: student.stateOfOrigin,
          // A guardian shared with siblings stays linked; one of their own is edited in place.
          guardianId: g && g.siblings.length ? g.id : "",
          guardianName: g && !g.siblings.length ? g.name : "",
          guardianPhone: g && !g.siblings.length ? `0${(g.phone ?? "").slice(4)}`.replace(/^0$/, "") : "",
          guardianEmail: g && !g.siblings.length ? (g.email ?? "") : "",
        }}
        linkedGuardian={g && g.siblings.length ? { name: g.name, siblings: g.siblings.length } : null}
        save={updateStudent}
        findGuardian={findGuardian}
        onSaved={() => router.push(page)}
      />
    </div>
  );
}
