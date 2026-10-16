// Where schools' addresses live: brillianda.com, or staging.brillianda.com on the staging site
// (ROOT_DOMAIN). Server code reads it here; client components get it as a prop.
import "server-only";

export const ROOT_DOMAIN = (process.env.ROOT_DOMAIN ?? "brillianda.com").split(",")[0]!.trim().toLowerCase();

/** A school's address as people read it: greenfield.brillianda.com. */
export const schoolAddress = (subdomain: string) => `${subdomain}.${ROOT_DOMAIN}`;
