import type { Metadata } from "next";
import {
  addArm,
  addLevel,
  removeArm,
  removeLevel,
  renameArmName,
  renameLevel,
  setArmArchived,
  setArmDepartment,
  setLevelArchived,
  setupClasses,
} from "@/data/actions/classes";
import { getClassStructure } from "@/data/classes";
import { ClassesView } from "./ClassesView";
import { QuickSetup } from "./QuickSetup";

export const metadata: Metadata = { title: "Classes" };

/** The quick setup until the school has classes, then the classes themselves. */
export default async function ClassesPage({ params }: PageProps<"/s/[school]/classes">) {
  const { school } = await params;
  const structure = await getClassStructure(school);
  if (!structure) return null;

  if (!structure.levels.length) return <QuickSetup levelsOffered={structure.levelsOffered} setup={setupClasses.bind(null, school)} />;

  return (
    <ClassesView
      structure={structure}
      actions={{
        renameLevel: renameLevel.bind(null, school),
        addLevel: addLevel.bind(null, school),
        removeLevel: removeLevel.bind(null, school),
        setLevelArchived: setLevelArchived.bind(null, school),
        addArm: addArm.bind(null, school),
        renameArmName: renameArmName.bind(null, school),
        setArmDepartment: setArmDepartment.bind(null, school),
        setArmArchived: setArmArchived.bind(null, school),
        removeArm: removeArm.bind(null, school),
      }}
    />
  );
}
