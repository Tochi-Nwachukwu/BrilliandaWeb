"use client";

import { BOOK_CATEGORIES, BOOK_CATEGORY_LABEL, bookItemSchema, byCategory, formatNaira, listTotal, type BookItem } from "@brillianda/core/booklists";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { cx } from "@brillianda/ui/cx";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { SelectField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, BookList, BookListsPage } from "@/data/types";
import { firstErrors, type Errors } from "@/lib/form";

type Item = BookItem & { id?: string };

const pill = (active: boolean) =>
  cx(
    "inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
    active ? "bg-primary text-primary-text" : "bg-raise shadow-raised hover:bg-hover",
  );

/** More › Book lists (batch 20): a list per class level, for this session or the next. */
export function BookListsView({
  page,
  base,
  initialLevel,
  save,
  share,
}: {
  page: BookListsPage;
  base: string;
  initialLevel: string | null;
  save: (levelId: string, startYear: number, input: unknown) => Promise<ActionResult<null>>;
  share: (levelId: string, startYear: number, shared: boolean) => Promise<ActionResult<null>>;
}) {
  const [levelId, setLevelId] = useState(initialLevel ?? page.lists.find((l) => l.items.length)?.levelId ?? page.lists[0]?.levelId ?? null);
  const list = page.lists.find((l) => l.levelId === levelId);

  return (
    <div className="grid gap-4">
      <nav aria-label="Session" className="flex flex-wrap gap-2">
        {page.sessions.map((s) => (
          <Link
            key={s.startYear}
            href={`${base}?session=${s.startYear}`}
            aria-current={s.startYear === page.startYear ? "page" : undefined}
            className={pill(s.startYear === page.startYear)}
          >
            {s.label} · {s.name}
          </Link>
        ))}
      </nav>

      {page.lists.length === 0 ? (
        <EmptyState title="No classes yet">Add your classes first: each class level gets its own list.</EmptyState>
      ) : (
        <>
          <div role="group" aria-label="Class" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {page.lists.map((l) => (
              <button key={l.levelId} type="button" aria-pressed={l.levelId === levelId} onClick={() => setLevelId(l.levelId)} className={pill(l.levelId === levelId)}>
                {l.levelName}
                {l.items.length > 0 && (
                  <span className={cx("text-[12px]", l.levelId === levelId ? "opacity-80" : "text-text-secondary")}>
                    {l.items.length}
                    <span className="sr-only"> items</span>
                  </span>
                )}
              </button>
            ))}
          </div>
          {list && (
            <ListEditor
              key={`${list.levelId}-${list.startYear}`}
              list={list}
              others={page.lists.filter((l) => l.levelId !== list.levelId && l.items.length)}
              save={save}
              share={share}
            />
          )}
        </>
      )}
    </div>
  );
}

function ListEditor({
  list,
  others,
  save,
  share,
}: {
  list: BookList;
  others: BookList[];
  save: (levelId: string, startYear: number, input: unknown) => Promise<ActionResult<null>>;
  share: (levelId: string, startYear: number, shared: boolean) => Promise<ActionResult<null>>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(list.items);
  const [editing, setEditing] = useState<{ index: number | null } | null>(null);
  const [pending, startTransition] = useTransition();
  const total = listTotal(items);

  const store = (next: Item[], message: string) => {
    const before = items;
    setItems(next);
    startTransition(async () => {
      const result = await save(list.levelId, list.startYear, { items: next });
      if (!result.ok) {
        setItems(before);
        return toast(result.error);
      }
      toast(message);
      router.refresh();
    });
  };

  const toggleShare = () =>
    startTransition(async () => {
      const result = await share(list.levelId, list.startYear, !list.shared);
      toast(result.ok ? (list.shared ? "Parents no longer see this list" : `Parents of ${list.levelName} students can see this list`) : result.error);
      if (result.ok) router.refresh();
    });

  return (
    <section aria-labelledby="list-title" className="rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="list-title" className="flex flex-wrap items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
            {list.levelName}, {list.session}
            {list.shared ? <Badge tone="success">Shared with parents</Badge> : <Badge tone="neutral">Not shared</Badge>}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {items.length ? (
              <>
                {items.length === 1 ? "1 item" : `${items.length} items`}
                {total.total > 0 && ` · ${formatNaira(total.total)}`}
                {total.unpriced > 0 && total.total > 0 && ` (${total.unpriced} without a price)`}
              </>
            ) : (
              "Nothing on this list yet."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditing({ index: null })}>
            Add an item
          </Button>
          <Button variant={list.shared ? "ghost" : "primary"} onClick={toggleShare} loading={pending} disabled={!items.length && !list.shared}>
            {list.shared ? "Stop sharing" : "Share with parents"}
          </Button>
        </div>
      </div>

      {items.length === 0 && others.length > 0 && (
        <div className="mt-4 max-w-sm">
          <SelectField
            label="Start from another class’s list"
            value=""
            onChange={(e) => {
              const from = others.find((o) => o.levelId === e.target.value);
              // Copies get their own ids when saved.
              if (from)
                store(
                  from.items.map((i) => ({ ...i, id: undefined })),
                  `Copied ${from.levelName}’s list`,
                );
            }}
          >
            <option value="">Choose a class</option>
            {others.map((o) => (
              <option key={o.levelId} value={o.levelId}>
                {o.levelName} ({o.items.length} items)
              </option>
            ))}
          </SelectField>
        </div>
      )}

      <div className="mt-5 grid gap-5">
        {byCategory(items.map((item, index) => ({ ...item, index }))).map((group) => (
          <div key={group.category}>
            <h3 className="mb-2 text-[13px] font-semibold text-text-secondary">{group.label}</h3>
            <ul className="grid gap-1.5">
              {group.items.map((item) => (
                <li key={item.id ?? item.index} className="grid gap-1 rounded-2xl bg-sunken p-3 sm:flex sm:items-center sm:gap-3">
                  <span className="min-w-0 flex-1">
                    <b className="block font-semibold">{item.name}</b>
                    <span className="text-[12.5px] text-text-secondary">
                      {[
                        item.detail,
                        item.quantity > 1 && `${item.quantity} of these`,
                        item.price !== null && `${formatNaira(item.price)}${item.quantity > 1 ? " each" : ""}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="-mb-1 -mr-1 flex justify-end gap-1 sm:m-0">
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ index: item.index })} aria-label={`Change ${item.name}`}>
                      Change
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-quiet"
                      onClick={() =>
                        store(
                          items.filter((_, i) => i !== item.index),
                          `Removed ${item.name}`,
                        )
                      }
                      aria-label={`Remove ${item.name}`}
                    >
                      Remove
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {editing && (
        <ItemDialog
          item={editing.index === null ? null : items[editing.index]!}
          onClose={() => setEditing(null)}
          onSave={(item) => {
            const next = editing.index === null ? [...items, item] : items.map((x, i) => (i === editing.index ? { ...item, id: x.id } : x));
            setEditing(null);
            store(next, editing.index === null ? `Added ${item.name}` : `Saved ${item.name}`);
          }}
        />
      )}
    </section>
  );
}

function ItemDialog({ item, onClose, onSave }: { item: Item | null; onClose: () => void; onSave: (item: Item) => void }) {
  const [values, setValues] = useState({
    category: item?.category ?? "textbook",
    name: item?.name ?? "",
    detail: item?.detail ?? "",
    quantity: String(item?.quantity ?? 1),
    price: item?.price === null || item?.price === undefined ? "" : String(item.price),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const set = (field: keyof typeof values) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = () => {
    const parsed = bookItemSchema.safeParse({ ...values, price: values.price.replace(/[₦,\s]/g, "") === "" ? null : values.price.replace(/[₦,\s]/g, "") });
    if (!parsed.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) (fields[String(issue.path[0])] ??= []).push(issue.message);
      setErrors(firstErrors(fields));
      return setFailure("Please check the highlighted fields.");
    }
    onSave(parsed.data);
  };

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={item ? `Change ${item.name}` : "Add an item"}
      footer={
        <Button className="w-full" onClick={submit}>
          {item ? "Save" : "Add to the list"}
        </Button>
      }
    >
      <div className="grid gap-4">
        <SelectField label="Kind" value={values.category} onChange={(e) => set("category")(e.target.value)}>
          {BOOK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {BOOK_CATEGORY_LABEL[c]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Item"
          placeholder="e.g. New General Mathematics for JSS 2"
          value={values.name}
          onChange={(e) => set("name")(e.target.value)}
          error={errors.name}
        />
        <TextField
          label="Details (optional)"
          placeholder="Author, publisher, size or a note"
          value={values.detail}
          onChange={(e) => set("detail")(e.target.value)}
          error={errors.detail}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="How many" inputMode="numeric" value={values.quantity} onChange={(e) => set("quantity")(e.target.value)} error={errors.quantity} />
          <TextField label="Price for one, ₦ (optional)" inputMode="numeric" value={values.price} onChange={(e) => set("price")(e.target.value)} error={errors.price} />
        </div>
        <FormError message={failure} />
      </div>
    </ResponsiveDialog>
  );
}
