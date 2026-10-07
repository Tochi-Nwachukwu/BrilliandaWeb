// FAKE: the sample accounts at a school, for one-tap sign-in while there is no backend.
import "server-only";
import { ROLE_LABEL } from "@brillianda/core";
import { store } from "./store";

export async function getSampleAccounts(subdomain: string) {
  const accounts = store.users
    .map((u) => ({ user: u, role: u.schools.find((s) => s.subdomain === subdomain)?.role }))
    .filter((a) => a.role)
    .map(({ user, role }) => ({ label: `${ROLE_LABEL[role!]}: ${user.fullName.split(" ")[0]}`, email: user.email, password: user.password }));
  return accounts.length ? accounts : null;
}
