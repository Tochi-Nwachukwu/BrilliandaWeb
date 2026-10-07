import { SITE_BODY } from "./site/body";
import { SiteScripts } from "./site/SiteScripts";

// The marketing home, exactly as the old site (docs/migration-plan.md, batch 3). The markup is
// static; SiteScripts brings in the motion, the live mark sheet and the trial form.
export default function MarketingHome() {
  return (
    <>
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: SITE_BODY }} />
      <SiteScripts />
    </>
  );
}
