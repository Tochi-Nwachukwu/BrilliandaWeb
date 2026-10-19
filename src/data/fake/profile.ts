// My profile on sample data: the signed-in person's name, photo and password.
import "server-only";
import { joinName, splitName, type ProfileInput } from "@brillianda/core/profile";
import type { ActionResult, MyProfile } from "../types";
import { requireSignedIn } from "./auth";

export async function getMyProfile(subdomain: string): Promise<MyProfile | null> {
  const me = await requireSignedIn(subdomain);
  if (!me) return null;
  return { ...splitName(me.user.fullName), email: me.user.email, phone: me.user.phone ?? null, photo: me.user.photo ?? null, role: me.role, editable: true };
}

export async function updateProfile(subdomain: string, input: ProfileInput): Promise<ActionResult<null>> {
  const me = await requireSignedIn(subdomain);
  if (!me) return { ok: false, error: "Sign in again to change your profile." };
  me.user.fullName = joinName(input);
  return { ok: true, data: null };
}

/** A new photo (a small data URL), or null to take it away. */
export async function setPhoto(subdomain: string, photo: string | null): Promise<ActionResult<null>> {
  const me = await requireSignedIn(subdomain);
  if (!me) return { ok: false, error: "Sign in again to change your photo." };
  me.user.photo = photo ?? undefined;
  return { ok: true, data: null };
}

export async function changePassword(subdomain: string, current: string, password: string): Promise<ActionResult<null>> {
  const me = await requireSignedIn(subdomain);
  if (!me) return { ok: false, error: "Sign in again to change your password." };
  if (me.user.password !== current) return { ok: false, error: "That isn’t your current password.", fieldErrors: { current: ["That isn’t your current password"] } };
  me.user.password = password;
  return { ok: true, data: null };
}
