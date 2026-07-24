import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/useT";
import { cn } from "@/util/cn";
import "./contextmenu.css";

export type MenuEntry =
  | { separator: true }
  | {
      label: string;
      icon?: ReactNode;
      onClick: () => void;
      danger?: boolean;
      disabled?: boolean;
      /** Mark the currently-selected entry (shows a trailing check). */
      active?: boolean;
    };

interface Props {
  x: number;
  y: number;
  entries: MenuEntry[];
  onClose: () => void;
  /** Anchor the menu's bottom edge at `y` and grow upward — for menus opened from a
   *  control near the bottom of the screen (e.g. the assistant's selector pills). */
  openUp?: boolean;
}

export function ContextMenu({ x, y, entries, onClose, openUp }: Props) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Keep the menu inside the viewport.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let nx = x;
    let ny = openUp ? y - r.height : y;
    if (x + r.width > window.innerWidth - 8) nx = window.innerWidth - r.width - 8;
    if (ny + r.height > window.innerHeight - 8) ny = window.innerHeight - r.height - 8;
    setPos({ x: Math.max(8, nx), y: Math.max(8, ny) });
  }, [x, y, openUp]);

  useLayoutEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="ctx-menu anim-pop"
      style={{ left: pos.x, top: pos.y }}
      role="menu"
      aria-label={t("contextmenu.aria")}
    >
      {entries.map((e, i) =>
        "separator" in e ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static menu, index is stable.
          <div key={i} className="ctx-menu__sep" />
        ) : (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: static menu, index is stable.
            key={i}
            type="button"
            role="menuitem"
            className={cn("ctx-menu__item", e.danger && "ctx-menu__item--danger")}
            disabled={e.disabled}
            onClick={() => {
              e.onClick();
              onClose();
            }}
          >
            {e.icon && <span className="ctx-menu__icon">{e.icon}</span>}
            <span className="ctx-menu__label">{e.label}</span>
            {e.active && (
              <span className="ctx-menu__check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}
