import { useEffect } from "react";
import { create } from "zustand";
import { Icon } from "./Icon";

/**
 * A short confirmation after an action ("Suspended", "Invite sent"). One at a time; each new one
 * replaces the last. Announced politely to screen readers.
 */
const useToastStore = create<{ message: string | null; id: number; show: (message: string) => void; clear: () => void }>()((set) => ({
  message: null,
  id: 0,
  show: (message) => set((state) => ({ message, id: state.id + 1 })),
  clear: () => set({ message: null }),
}));

export const toast = (message: string) => useToastStore.getState().show(message);

export function Toaster() {
  const { message, id, clear } = useToastStore();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clear, 3600);
    return () => clearTimeout(timer);
  }, [message, id, clear]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
      {message && (
        <div key={id} className="flex animate-pop items-center gap-2.5 rounded-full bg-primary py-2 pl-2 pr-5 text-sm font-medium text-primary-text shadow-float">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-success-bg text-success">
            <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
          </span>
          {message}
        </div>
      )}
    </div>
  );
}
