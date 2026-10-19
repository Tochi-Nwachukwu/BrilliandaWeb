"use server";

// My profile: anyone signed in at the school changes their own name, photo and password. About
// `school`: see actions/auth.ts — the real actions take it from the request's host.
import { changePasswordSchema, photoSchema, profileSchema } from "@brillianda/core/profile";
import { fieldErrorsOf } from "@brillianda/core/signup";
import { revalidatePath } from "next/cache";
import { LIVE } from "../api/client";
import * as live from "../api/profile";
import * as fake from "../fake/profile";
import type { ActionResult } from "../types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

const CHECK = "Please check the highlighted fields.";
// The name and photo show in the sidebar of every page.
const done = <T,>(school: string, result: ActionResult<T>) => {
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
};

export async function updateProfile(school: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.updateProfile(school, parsed.data));
}

export async function setPhoto(school: string, photo: string | null): Promise<ActionResult<null>> {
  if (photo !== null && !photoSchema.safeParse(photo).success) return { ok: false, error: "That picture couldn’t be used. Try a JPG or PNG." };
  return done(school, await impl.setPhoto(school, photo));
}

export async function changePassword(school: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.changePassword(school, parsed.data.current, parsed.data.password);
}
