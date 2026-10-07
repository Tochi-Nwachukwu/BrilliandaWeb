import { describe, expect, it } from "vitest";
import { classKey, guessImportField, joinName, readDate, readGender } from "./importing";

describe("reading a school's student list", () => {
  it("recognises common column headings", () => {
    expect(guessImportField("Student Name")).toBe("fullName");
    expect(guessImportField("SURNAME")).toBe("surname");
    expect(guessImportField("Other Names")).toBe("otherNames");
    expect(guessImportField("Adm. No")).toBe("admissionNo");
    expect(guessImportField("Sex")).toBe("gender");
    expect(guessImportField("D.O.B")).toBe("dob");
    expect(guessImportField("Father's Phone No")).toBe("guardianPhone");
    expect(guessImportField("Parent/Guardian")).toBe("guardianName");
    expect(guessImportField("Class")).toBe("className");
    expect(guessImportField("Favourite colour")).toBeNull();
  });

  it("reads genders the ways schools write them", () => {
    expect(readGender("M")).toBe("MALE");
    expect(readGender(" Female ")).toBe("FEMALE");
    expect(readGender("girl")).toBe("FEMALE");
    expect(readGender("")).toBeNull();
    expect(readGender("X")).toBeUndefined();
  });

  it("reads dates day first", () => {
    expect(readDate("14/03/2014")).toBe("2014-03-14");
    expect(readDate("4-3-2014")).toBe("2014-03-04");
    expect(readDate("14.03.14")).toBe("2014-03-14");
    expect(readDate("14 March 2014")).toBe("2014-03-14");
    expect(readDate("3rd Sept, 2013")).toBe("2013-09-03");
    expect(readDate("2014-03-14")).toBe("2014-03-14");
    expect(readDate("")).toBeNull();
    expect(readDate("31/02/2014")).toBeUndefined();
    expect(readDate("03/14/2014")).toBeUndefined();
    expect(readDate("soon")).toBeUndefined();
  });

  it("matches class names written loosely", () => {
    const jss1a = classKey("JSS 1A");
    for (const written of ["JSS1 A", "jss 1a", "J.S.S. 1A", "JS1A", "JSS-1-A"]) expect(classKey(written)).toBe(jss1a);
    const ss2b = classKey("SS 2B");
    for (const written of ["SSS 2B", "S.S. 2 B", "ss2b"]) expect(classKey(written)).toBe(ss2b);
    expect(classKey("JSS 1B")).not.toBe(jss1a);
  });

  it("puts a split name back together", () => {
    expect(joinName({ surname: "Okafor", firstName: "Chidera", otherNames: "Ngozi" })).toBe("Chidera Ngozi Okafor");
    expect(joinName({ fullName: "  Tunde   Bello " })).toBe("Tunde Bello");
    expect(joinName({ surname: "Okafor" })).toBe("Okafor");
  });
});
