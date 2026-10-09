import { describe, expect, it } from "vitest";
import { csvCell, fullName, matchesSearch, searchKey, studentSchema, toCsv } from "./students";

const base = {
  firstName: "Chiamaka",
  lastName: "Okafor",
  otherNames: "",
  gender: "FEMALE",
  armId: "arm1",
  dateOfBirth: "2014-03-14",
  admissionNo: "",
  admissionDate: "",
  address: "",
  stateOfOrigin: "",
  guardianId: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
};

describe("studentSchema", () => {
  it("accepts the four required fields", () => {
    expect(studentSchema.safeParse(base).success).toBe(true);
  });

  it("keeps marks such as Ọ and ṣ, and tidies spaces", () => {
    const parsed = studentSchema.parse({ ...base, firstName: "  Ọlá ", lastName: "Adéṣínà", otherNames: "Mary-Jane  O’Neil" });
    expect(parsed.firstName).toBe("Ọlá");
    expect(parsed.otherNames).toBe("Mary-Jane O’Neil");
  });

  it("refuses digits in names and a missing gender or class", () => {
    const issues = (input: object) => (studentSchema.safeParse({ ...base, ...input }).error?.issues ?? []).map((i) => `${i.path.join(".")}: ${i.message}`);
    expect(issues({ firstName: "Chi4" })).toContain("firstName: Letters, spaces, hyphens and apostrophes only");
    expect(issues({ gender: "" })).toContain("gender: Choose Male or Female");
    expect(issues({ armId: "" })).toContain("armId: Choose a class");
  });

  it("checks the guardian phone and asks for a name with it", () => {
    const issues = (input: object) => (studentSchema.safeParse({ ...base, ...input }).error?.issues ?? []).map((i) => i.path.join("."));
    expect(issues({ guardianName: "Ngozi Okafor", guardianPhone: "12345" })).toEqual(["guardianPhone"]);
    expect(issues({ guardianPhone: "0803 000 0001" })).toEqual(["guardianName"]);
    expect(issues({ guardianId: "g1", guardianPhone: "0803 000 0001" })).toEqual([]);
  });

  it("refuses a birth date in the future", () => {
    expect(studentSchema.safeParse({ ...base, dateOfBirth: "2999-01-01" }).success).toBe(false);
  });
});

describe("names and search", () => {
  it("joins the full name", () => {
    expect(fullName({ firstName: "Chiamaka", otherNames: "Adaeze", lastName: "Okafor" })).toBe("Chiamaka Adaeze Okafor");
    expect(fullName({ firstName: "Tunde", otherNames: "", lastName: "Bello" })).toBe("Tunde Bello");
  });

  it("ignores accents: Ola finds Ọlá", () => {
    expect(searchKey("Ọlá Adéṣínà")).toBe("ola adesina");
    expect(matchesSearch({ fullName: "Ọlá Adéṣínà", admissionNo: "GFC/2026/0001" }, "ola")).toBe(true);
    expect(matchesSearch({ fullName: "Ọlá Adéṣínà", admissionNo: "GFC/2026/0001" }, "ade 0001")).toBe(true);
    expect(matchesSearch({ fullName: "Ọlá Adéṣínà", admissionNo: "GFC/2026/0001" }, "tunde")).toBe(false);
  });
});

describe("csv", () => {
  it("stops a spreadsheet running a cell as a formula", () => {
    expect(csvCell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(csvCell("+2348030000001")).toBe("'+2348030000001");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });

  it("quotes commas and quotes", () => {
    expect(csvCell("12, Aba Road")).toBe('"12, Aba Road"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it("writes rows with Excel line endings", () => {
    expect(toCsv(["Name", "Class"], [["Chiamaka Okafor", "JSS 1 Gold"]])).toBe("Name,Class\r\nChiamaka Okafor,JSS 1 Gold\r\n");
  });
});
