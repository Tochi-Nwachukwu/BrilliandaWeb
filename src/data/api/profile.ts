// My profile on the Brillianda API. Same functions and shapes as ../fake/profile.ts.
import "server-only";
import { joinName, splitName, type ProfileInput } from "@brillianda/core/profile";
import type { ActionResult, MyProfile } from "../types";
import { readMe } from "./auth";
import { api, fail } from "./client";
import { pictureOn } from "./school";

export async function getMyProfile(subdomain: string): Promise<MyProfile | null> {
  const me = await readMe(subdomain);
  if (!me) return null;
  return {
    ...splitName(me.user.fullName),
    email: me.user.email,
    phone: me.phone ?? null,
    photo: pictureOn(subdomain, me.photo ?? null),
    role: me.membership.role,
    editable: true,
  };
}

export async function updateProfile(subdomain: string, input: ProfileInput): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/me", { method: "PATCH", body: { fullName: joinName(input) } });
  // The API checks the name as one field; its message goes under the last name's box.
  return result.ok ? { ok: true, data: null } : fail(result, { fullName: "lastName" });
}

/** A new photo (a small data URL), or null to take it away. */
export async function setPhoto(subdomain: string, photo: string | null): Promise<ActionResult<null>> {
  const result = photo ? await api(subdomain, "/v1/me/photo", { method: "PUT", body: { photo } }) : await api(subdomain, "/v1/me/photo", { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}

/** Signs the person out on their other devices, in every school; this session stays. */
export async function changePassword(subdomain: string, current: string, password: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/me/password", { method: "POST", body: { current, password } });
  return result.ok ? { ok: true, data: null } : fail(result);
}
