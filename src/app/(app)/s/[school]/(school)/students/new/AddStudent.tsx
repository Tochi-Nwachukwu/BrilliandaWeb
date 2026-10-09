"use client";

import { PageHeader } from "@brillianda/ui/PageHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActionResult, ArmOption, GuardianMatch } from "@/data/types";
import { blankStudent, StudentForm } from "../StudentForm";

export function AddStudent({
  school,
  arms,
  armId,
  nextAdmissionNo,
  addStudent,
  findGuardian,
}: {
  school: string;
  arms: ArmOption[];
  armId: string;
  nextAdmissionNo: string;
  addStudent: (input: unknown) => Promise<ActionResult<{ id: string; admissionNo: string; fullName: string }>>;
  findGuardian: (phone: string) => Promise<GuardianMatch | null>;
}) {
  const router = useRouter();
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Add a student"
        actions={
          <Link href={`/s/${school}/students`} className="text-sm font-medium text-accent hover:underline">
            Back to students
          </Link>
        }
      >
        First name, last name, gender and class are all you need. The rest can come later.
      </PageHeader>
      <StudentForm
        arms={arms}
        initial={blankStudent(armId)}
        nextAdmissionNo={nextAdmissionNo}
        mode="add"
        save={addStudent}
        findGuardian={findGuardian}
        onSaved={({ id, another }) => {
          if (!another && id) router.push(`/s/${school}/students/${id}`);
        }}
      />
    </div>
  );
}
