import type { Metadata } from "next";
import { StudentsDemo } from "./StudentsDemo";

export const metadata: Metadata = { title: "Students" };

export default function DevStudents() {
  return <StudentsDemo />;
}
