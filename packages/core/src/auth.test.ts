import { describe, expect, it } from "vitest";
import { emailOnlySchema, inviteAdminSchema, newPasswordSchema, signInSchema } from "./auth";

describe("signInSchema", () => {
  it("tidies the email and needs a password", () => {
    expect(signInSchema.parse({ email: " Owner@Greenfield.NG ", password: "x" }).email).toBe("owner@greenfield.ng");
    expect(signInSchema.safeParse({ email: "owner@greenfield.ng", password: "" }).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("needs 8 characters typed the same twice", () => {
    expect(newPasswordSchema.safeParse({ password: "longenough", confirmation: "longenough" }).success).toBe(true);
    expect(newPasswordSchema.safeParse({ password: "short", confirmation: "short" }).success).toBe(false);
    const mismatch = newPasswordSchema.safeParse({ password: "longenough", confirmation: "longenougH" });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0]?.path).toEqual(["confirmation"]);
  });
});

describe("emailOnlySchema and inviteAdminSchema", () => {
  it("check the email and name", () => {
    expect(emailOnlySchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(inviteAdminSchema.safeParse({ fullName: "C", email: "c@school.ng" }).success).toBe(false);
    expect(inviteAdminSchema.parse({ fullName: " Chidi Okeke ", email: "C@School.ng" })).toEqual({ fullName: "Chidi Okeke", email: "c@school.ng" });
  });
});
