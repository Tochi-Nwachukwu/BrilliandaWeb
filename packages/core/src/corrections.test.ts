import { describe, expect, it } from "vitest";
import { checkCorrection, correctionRequestSchema, declineSchema } from "./corrections";

describe("correction requests", () => {
  it("checks each field with the student form's rules", () => {
    expect(checkCorrection("firstName", "  Ọlá  ")).toEqual({ ok: true, value: "Ọlá" });
    expect(checkCorrection("firstName", "4ever")).toMatchObject({ ok: false });
    expect(checkCorrection("dateOfBirth", "2999-01-01")).toEqual({ ok: false, error: "A birth date can’t be in the future" });
    expect(checkCorrection("guardianPhone", "0803 000 0001")).toEqual({ ok: true, value: "+2348030000001" });
    expect(checkCorrection("gender", "MALE")).toEqual({ ok: true, value: "MALE" });
  });

  it("cleans the values, and puts each problem under its change", () => {
    const ok = correctionRequestSchema.safeParse({ changes: [{ field: "guardianEmail", value: " Mum@Example.com " }], note: "" });
    expect(ok.success && ok.data.changes).toEqual([{ field: "guardianEmail", value: "mum@example.com" }]);

    const bad = correctionRequestSchema.safeParse({
      changes: [
        { field: "lastName", value: "" },
        { field: "lastName", value: "Okafor" },
      ],
      note: "",
    });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map((i) => i.path.join("."))).toEqual(["changes.0.value", "changes.1.field"]);
  });

  it("needs at least one change, and a reason to decline", () => {
    expect(correctionRequestSchema.safeParse({ changes: [], note: "" }).success).toBe(false);
    expect(declineSchema.safeParse({ reason: "" }).success).toBe(false);
  });
});
