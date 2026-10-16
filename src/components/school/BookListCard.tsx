import { byCategory, formatNaira, listTotal } from "@brillianda/core/booklists";
import { Card } from "@brillianda/ui/Cards";
import type { BookList } from "@/data/types";

/** One shared book list (batch 20), as parents and students read it. */
export function BookListCard({ label, list }: { label: string; list: BookList }) {
  const total = listTotal(list.items);
  return (
    <Card title="Books and things needed" description={label}>
      <div className="grid gap-4">
        {byCategory(list.items).map((group) => (
          <div key={group.category}>
            <h3 className="mb-1.5 text-[13px] font-semibold text-text-secondary">{group.label}</h3>
            <ul className="grid gap-1">
              {group.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <b className="font-medium">{item.name}</b>
                    {item.quantity > 1 && <span className="text-text-secondary"> × {item.quantity}</span>}
                    {item.detail && <span className="block text-[12.5px] text-text-secondary">{item.detail}</span>}
                  </span>
                  {item.price !== null && <span className="shrink-0 tabular-nums">{formatNaira(item.price * item.quantity)}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {total.total > 0 && (
          <p className="flex justify-between gap-3 border-t border-border pt-3 text-sm font-semibold">
            <span>Total{total.unpriced > 0 ? ` (${total.unpriced === 1 ? "1 item has" : `${total.unpriced} items have`} no price)` : ""}</span>
            <span className="tabular-nums">{formatNaira(total.total)}</span>
          </p>
        )}
      </div>
    </Card>
  );
}
