// My profile on the Brillianda API. It only reads who you are (GET /v1/me) for now; saving a name,
// photo or password isn't on the API yet (docs/backend-requirements.md, C16).
import "server-only";
import { splitName, type ProfileInput } from "@brillianda/core/profile";
import type { ActionResult, MyProfile } from "../types";
import { getCurrentMember } from "./auth";

const NOT_YET: ActionResult<never> = { ok: false, error: "Changing your profile isn’t connected yet." };

export async function getMyProfile(subdomain: string): Promise<MyProfile | null> {
  const me = await getCurrentMember(subdomain);
  return me ? { ...splitName(me.fullName), email: me.email, phone: null, photo: null, role: me.role, editable: false } : null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateProfile(_subdomain: string, _input: ProfileInput): Promise<ActionResult<null>> {
  return NOT_YET;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function setPhoto(_subdomain: string, _photo: string | null): Promise<ActionResult<null>> {
  return NOT_YET;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function changePassword(_subdomain: string, _current: string, _password: string): Promise<ActionResult<null>> {
  return NOT_YET;
}
