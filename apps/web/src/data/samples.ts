// FAKE ONLY: sample accounts shown on a school's sign-in page while every screen runs on stand-in
// data. Not part of the contract; delete it with the fakes.
import "server-only";
import * as impl from "./fake/samples";

export function getSampleAccounts(subdomain: string): Promise<{ label: string; email: string; password: string }[] | null> {
  return impl.getSampleAccounts(subdomain);
}
