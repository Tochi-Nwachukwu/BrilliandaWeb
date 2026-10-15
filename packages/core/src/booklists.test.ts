import { describe, expect, it } from "vitest";
import { bookItemSchema, byCategory, formatNaira, listTotal } from "./booklists";

describe("book lists", () => {
  it("adds up the priced items, and counts the ones without a price", () => {
    expect(
      listTotal([
        { quantity: 1, price: 4500 },
        { quantity: 12, price: 300 },
        { quantity: 2, price: null },
      ]),
    ).toEqual({ total: 8100, unpriced: 1 });
  });

  it("writes naira with thousands separated", () => {
    expect(formatNaira(12500)).toBe("₦12,500");
  });

  it("groups items in category order", () => {
    const groups = byCategory([
      { category: "uniform" as const, name: "Blazer" },
      { category: "textbook" as const, name: "New General Mathematics 2" },
      { category: "uniform" as const, name: "Socks" },
    ]);
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["Textbooks", 1],
      ["Uniform", 2],
    ]);
  });

  it("checks an item: a name, a whole quantity, whole naira or no price", () => {
    expect(bookItemSchema.safeParse({ category: "textbook", name: "B", detail: "", quantity: 1, price: null }).success).toBe(false);
    expect(bookItemSchema.safeParse({ category: "textbook", name: "Basic Science", detail: "", quantity: "2", price: "1500" }).success).toBe(true);
    expect(bookItemSchema.safeParse({ category: "textbook", name: "Basic Science", detail: "", quantity: 0, price: null }).success).toBe(false);
  });
});
