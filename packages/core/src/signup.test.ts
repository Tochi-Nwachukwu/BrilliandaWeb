import { describe, expect, it } from "vitest";
import { normaliseNigerianPhone } from "./nigeria";
import { defaultSessionStart, ownerAccountSchema, schoolAddressSchema, schoolDetailsSchema, sessionName, verifyCodeSchema } from "./signup";

const school = { schoolName: "Surebloom School", levels: ["SECONDARY"], state: "Lagos", phone: "0803 000 0001", sessionStartMonth: "9", sessionStartYear: "2026" };

describe("schoolDetailsSchema", () => {
  it("accepts a complete screen and stores the phone as +234", () => {
    const parsed = schoolDetailsSchema.parse(school);
    expect(parsed.phone).toBe("+2348030000001");
    expect(parsed.sessionStartMonth).toBe(9);
  });

  it("needs at least one level and a real state", () => {
    expect(schoolDetailsSchema.safeParse({ ...school, levels: [] }).success).toBe(false);
    expect(schoolDetailsSchema.safeParse({ ...school, state: "Atlantis" }).success).toBe(false);
  });
});

describe("ownerAccountSchema", () => {
  const owner = { fullName: "Amaka Obi", email: " Amaka@Surebloom.NG ", password: "longenough" };

  it("tidies the email and allows no phone", () => {
    const parsed = ownerAccountSchema.parse({ ...owner, phone: "" });
    expect(parsed.email).toBe("amaka@surebloom.ng");
    expect(parsed.phone).toBeUndefined();
  });

  it("checks the password length and an optional phone", () => {
    expect(ownerAccountSchema.safeParse({ ...owner, password: "short" }).success).toBe(false);
    expect(ownerAccountSchema.safeParse({ ...owner, phone: "12345" }).success).toBe(false);
    expect(ownerAccountSchema.parse({ ...owner, phone: "+234 803 000 0001" }).phone).toBe("+2348030000001");
  });
});

describe("verifyCodeSchema", () => {
  it("takes exactly six digits", () => {
    expect(verifyCodeSchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(verifyCodeSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(verifyCodeSchema.safeParse({ code: "12345a" }).success).toBe(false);
  });
});

describe("schoolAddressSchema", () => {
  it("normalises and checks the rules", () => {
    expect(schoolAddressSchema.parse({ subdomain: " SureBloom " }).subdomain).toBe("surebloom");
    expect(schoolAddressSchema.safeParse({ subdomain: "waec" }).success).toBe(false);
  });
});

describe("sessions", () => {
  it("defaults to this September from August on, else last September", () => {
    expect(defaultSessionStart(new Date(2026, 9, 7))).toEqual({ month: 9, year: 2026 });
    expect(defaultSessionStart(new Date(2027, 2, 1))).toEqual({ month: 9, year: 2026 });
    expect(sessionName(2026)).toBe("2026/2027");
  });
});

describe("normaliseNigerianPhone", () => {
  it("reads every common way of writing a number", () => {
    for (const input of ["08030000001", "0803 000 0001", "2348030000001", "+234 803 000 0001", "0803-000-0001"]) {
      expect(normaliseNigerianPhone(input), input).toBe("+2348030000001");
    }
    expect(normaliseNigerianPhone("080300000")).toBeNull();
  });
});
