// Books and things needed (user request, 15 Oct 2026): a list for each class level and session,
// which parents see for the class their child is in or moving into.
import { z } from "zod";

export const BOOK_CATEGORIES = ["textbook", "stationery", "uniform", "other"] as const;
export type BookCategory = (typeof BOOK_CATEGORIES)[number];
export const BOOK_CATEGORY_LABEL: Record<BookCategory, string> = {
  textbook: "Textbooks",
  stationery: "Exercise books and stationery",
  uniform: "Uniform",
  other: "Other things",
};

export const bookItemSchema = z.object({
  category: z.enum(BOOK_CATEGORIES, { error: "Choose a kind" }),
  name: z.string().trim().min(2, "Name the item").max(120, "Use at most 120 characters"),
  /** Author, publisher, edition, size, or a note. */
  detail: z.string().trim().max(160, "Use at most 160 characters"),
  quantity: z.coerce.number().int("A whole number").min(1, "At least 1").max(99, "At most 99"),
  /** Naira for one, whole numbers; null when the school doesn't give a price. */
  price: z.union([z.null(), z.coerce.number().int("Whole naira").min(0, "Can’t be below 0").max(10_000_000, "That’s too high")]),
});
export type BookItem = z.infer<typeof bookItemSchema>;

export const bookListSchema = z.object({ items: z.array(bookItemSchema).max(80, "Use at most 80 items") });

/** "₦12,500" */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

/** The cost of the priced items, and how many have no price (so the total can say it's partial). */
export function listTotal(items: Pick<BookItem, "quantity" | "price">[]): { total: number; unpriced: number } {
  let total = 0;
  let unpriced = 0;
  for (const item of items) {
    if (item.price === null) unpriced++;
    else total += item.price * item.quantity;
  }
  return { total, unpriced };
}

/** The items in category order, each category once, empty ones left out. */
export function byCategory<T extends { category: BookCategory }>(items: T[]): { category: BookCategory; label: string; items: T[] }[] {
  return BOOK_CATEGORIES.map((category) => ({ category, label: BOOK_CATEGORY_LABEL[category], items: items.filter((i) => i.category === category) })).filter(
    (g) => g.items.length > 0,
  );
}
