import { describe, expect, it } from "vitest";
import { validate } from "./trialForm";

const good = {
  schoolName: "Royal Heights College",
  contactName: "Amara Bello",
  role: "PROPRIETOR",
  email: "amara@royalheights.ng",
  phone: "08012345678",
  studentCount: "420",
};

describe("validate", () => {
  it("accepts a complete request", () => {
    expect(validate(good)).toEqual({});
  });

  it("asks for the fields a reply depends on", () => {
    const errors = validate({});
    expect(Object.keys(errors).sort()).toEqual(
      ["contactName", "email", "phone", "role", "schoolName", "studentCount"].sort(),
    );
  });

  it("checks the email looks like an address", () => {
    expect(validate({ ...good, email: "amara@royalheights" }).email).toBeTruthy();
    expect(validate({ ...good, email: "amara at royalheights.ng" }).email).toBeTruthy();
  });

  it("accepts Nigerian numbers however they are written", () => {
    for (const phone of ["08012345678", "0801 234 5678", "+2348012345678", "2348012345678"]) {
      expect(validate({ ...good, phone }).phone, phone).toBeUndefined();
    }
  });

  it("rejects a number that is not one", () => {
    expect(validate({ ...good, phone: "12345" }).phone).toBeTruthy();
    expect(validate({ ...good, phone: "080123456789" }).phone).toBeTruthy();
  });

  it("reads a student count with a comma in it", () => {
    expect(validate({ ...good, studentCount: "1,200" }).studentCount).toBeUndefined();
    expect(validate({ ...good, studentCount: "about 400" }).studentCount).toBeTruthy();
    expect(validate({ ...good, studentCount: "0" }).studentCount).toBeTruthy();
  });

  it("does not require the optional fields", () => {
    expect(validate({ ...good, state: "", message: "" })).toEqual({});
  });

  it("caps a very long message", () => {
    expect(validate({ ...good, message: "x".repeat(1001) }).message).toBeTruthy();
  });
});
