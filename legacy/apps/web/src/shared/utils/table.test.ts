import { describe, expect, it } from "vitest";
import { parseTable, toCsv } from "./table";

describe("reading a spreadsheet", () => {
  it("reads cells pasted from Excel", () => {
    expect(parseTable("Name\tClass\r\nChidera Okafor\tJSS 1A\r\nTunde Bello\tJSS 1B\r\n")).toEqual([
      ["Name", "Class"],
      ["Chidera Okafor", "JSS 1A"],
      ["Tunde Bello", "JSS 1B"],
    ]);
  });

  it("reads a CSV file with quoted cells and blank lines", () => {
    const csv = '﻿Name,Address\n"Okafor, Chidera","12 ""Palm"" Close\nLekki"\n\n,\nTunde Bello,Ikeja\n';
    expect(parseTable(csv)).toEqual([
      ["Name", "Address"],
      ["Okafor, Chidera", '12 "Palm" Close\nLekki'],
      ["Tunde Bello", "Ikeja"],
    ]);
  });

  it("reads semicolon-separated files", () => {
    expect(parseTable("Name;Class\nAmina Yusuf;SS 2B")).toEqual([["Name", "Class"], ["Amina Yusuf", "SS 2B"]]);
  });

  it("writes CSV that reads back the same", () => {
    const rows = [["Name", "Note"], ["Okafor, Chidera", 'Said "hi"'], ["Tunde", null]];
    expect(toCsv(rows)).toBe('Name,Note\r\n"Okafor, Chidera","Said ""hi"""\r\nTunde,');
    expect(parseTable(toCsv(rows))).toEqual([["Name", "Note"], ["Okafor, Chidera", 'Said "hi"'], ["Tunde", ""]]);
  });
});
