import { schoolBase } from "@/lib/schoolBase";
import { BackToMore } from "./BackToMore";

// Every page under More: a way back to the More list.
export default async function MoreLayout({ children, params }: LayoutProps<"/s/[school]/more">) {
  const { school } = await params;
  const base = await schoolBase(school);
  return (
    <>
      <BackToMore moreHref={`${base}/more`} />
      {children}
    </>
  );
}
