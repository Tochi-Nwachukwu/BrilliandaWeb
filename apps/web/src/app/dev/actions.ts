"use server";

import { redirect } from "next/navigation";

/** The dev playground's sign out: nothing to end, so it just leaves. */
export async function devSignOut() {
  redirect("/");
}
