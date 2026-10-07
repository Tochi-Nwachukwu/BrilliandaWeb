"use client";

import { Kbd } from "./EmptyState";
import { Icon, type IconName } from "./Icon";
import { Backdrop, useModalFocus } from "./Overlay";
import { Command as Cmdk } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type Command = {
  id: string;
  label: string;
  icon?: IconName;
  group: string;
  /** Extra words to match, e.g. a student's admission number. */
  keywords?: string[];
  href?: string;
  run?: () => void;
};

const OPEN_EVENT = "brillianda:open-palette";

/** Opens the palette from a button, e.g. the search button on phones (no keyboard shortcut there). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Ctrl/Cmd+K: jump to a page or start a task without leaving the keyboard (plan, Phase 0). */
export function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useModalFocus(open, () => setOpen(false));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  if (!open) return null;

  const groups = [...new Set(commands.map((c) => c.group))];
  const choose = (command: Command) => {
    setOpen(false);
    if (command.href) router.push(command.href);
    command.run?.();
  };

  return createPortal(
    <>
      <Backdrop onClose={() => setOpen(false)} />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center p-3 pt-[12dvh]">
        <div ref={ref} role="dialog" aria-modal="true" aria-label="Go to or do" className="pointer-events-auto w-full max-w-[560px] animate-pop overflow-hidden rounded-[26px] bg-bg shadow-float">
          <Cmdk label="Go to or do" loop>
            <div className="flex items-center gap-3 border-b border-divider px-5">
              <Icon name="search" className="h-[18px] w-[18px] shrink-0 text-text-muted" />
              <Cmdk.Input
                autoFocus
                data-autofocus
                placeholder="Go to a page or find something"
                className="min-h-[56px] w-full border-0 bg-transparent text-base outline-hidden placeholder:text-text-muted"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Cmdk.List className="max-h-[min(60dvh,420px)] overflow-y-auto p-2">
              <Cmdk.Empty className="px-3 py-8 text-center text-sm text-text-secondary">Nothing matches that.</Cmdk.Empty>
              {groups.map((group) => (
                <Cmdk.Group
                  key={group}
                  heading={group}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-secondary"
                >
                  {commands
                    .filter((c) => c.group === group)
                    .map((command) => (
                      <Cmdk.Item
                        key={command.id}
                        value={`${command.group} ${command.label}`}
                        keywords={command.keywords}
                        onSelect={() => choose(command)}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl px-3 text-[15px] data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
                      >
                        {command.icon && <Icon name={command.icon} className="h-[18px] w-[18px] shrink-0" />}
                        {command.label}
                      </Cmdk.Item>
                    ))}
                </Cmdk.Group>
              ))}
            </Cmdk.List>
          </Cmdk>
        </div>
      </div>
    </>,
    document.body,
  );
}
