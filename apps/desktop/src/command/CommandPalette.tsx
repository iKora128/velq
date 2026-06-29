import { FileText, Hash, Search } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { editorBus } from "@/editor/editorBus";
import { searchFilenames } from "@/ipc/search";
import { useDoc } from "@/store/doc";
import { usePalette } from "@/store/palette";
import { useVault } from "@/store/vault";
import { cn } from "@/util/cn";
import { fmtShortcut } from "@/util/platform";
import { ACTIONS } from "./actions";
import "./palette.css";

interface Item {
  id: string;
  label: string;
  sub?: string;
  icon?: ReactNode;
  hint?: string;
  run: () => void;
}

type Mode = "file" | "cmd" | "head" | "line";

function modeOf(query: string): Mode {
  if (query.startsWith(">")) return "cmd";
  if (query.startsWith("@")) return "head";
  if (query.startsWith(":")) return "line";
  return "file";
}

const PLACEHOLDER: Record<Mode, string> = {
  file: "Search files…  ( > commands · @ headings · : line )",
  cmd: "Run a command…",
  head: "Jump to a heading…",
  line: "Go to line…",
};
const MODE_LABEL: Record<Mode, string> = {
  file: "Files",
  cmd: "Commands",
  head: "Headings",
  line: "Line",
};

export function CommandPalette() {
  const open = usePalette((s) => s.open);
  const initial = usePalette((s) => s.initial);
  const close = usePalette((s) => s.close);
  const [query, setQuery] = useState(initial);
  const [sel, setSel] = useState(0);
  const [fileItems, setFileItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery(initial);
      setSel(0);
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open, initial]);

  const mode = modeOf(query);
  const term = (mode === "file" ? query : query.slice(1)).trim();

  // File search (debounced); empty term shows recently-open tabs.
  useEffect(() => {
    if (!open || mode !== "file") return;
    if (!term) {
      setFileItems(
        useDoc.getState().tabs.map((t) => ({
          id: t.doc.id,
          label: t.doc.name,
          sub: t.doc.path ?? "Unsaved",
          icon: <FileText size={16} />,
          run: () => useDoc.getState().activate(t.doc.id),
        })),
      );
      return;
    }
    const root = useVault.getState().root?.path;
    if (!root) {
      setFileItems([]);
      return;
    }
    const h = setTimeout(async () => {
      const nodes = await searchFilenames(term, root);
      setFileItems(
        nodes
          .filter((n) => n.kind === "file")
          .map((n) => ({
            id: n.path,
            label: n.name,
            sub: n.path,
            icon: <FileText size={16} />,
            run: () => void useDoc.getState().openFile(n, { preview: false }),
          })),
      );
    }, 120);
    return () => clearTimeout(h);
  }, [open, mode, term]);

  const items: Item[] = useMemo(() => {
    if (mode === "cmd") {
      const t = term.toLowerCase();
      return ACTIONS.filter((a) => a.title.toLowerCase().includes(t)).map((a) => ({
        id: a.id,
        label: a.title,
        icon: a.icon ? <a.icon size={16} /> : undefined,
        hint: a.hint ? fmtShortcut(a.hint) : undefined,
        run: a.run,
      }));
    }
    if (mode === "head") {
      const t = term.toLowerCase();
      return editorBus
        .headings()
        .filter((hd) => hd.text.toLowerCase().includes(t))
        .map((hd) => ({
          id: `h${hd.line}`,
          label: hd.text,
          sub: `H${hd.level}`,
          icon: <Hash size={16} />,
          run: () => editorBus.goToLine(hd.line),
        }));
    }
    if (mode === "line") {
      const n = Number.parseInt(term, 10);
      if (!Number.isFinite(n)) return [];
      return [
        {
          id: "goto",
          label: `Go to line ${n}`,
          icon: <Hash size={16} />,
          run: () => editorBus.goToLine(n),
        },
      ];
    }
    return fileItems;
  }, [mode, term, fileItems]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset highlight when the result set changes.
  useEffect(() => setSel(0), [items]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll the new highlight into view.
  useEffect(() => {
    listRef.current?.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;

  const choose = (i: number) => {
    const it = items[i];
    if (it) {
      it.run();
      close();
    }
  };

  return createPortal(
    <div className="palette-backdrop anim-fade" onClick={close} role="presentation">
      <div
        className="palette anim-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="palette__input-row">
          <Search size={16} className="palette__icon" />
          <input
            ref={inputRef}
            className="palette__input"
            value={query}
            placeholder={PLACEHOLDER[mode]}
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(sel);
              } else if (e.key === "Escape") {
                e.preventDefault();
                close();
              }
            }}
          />
          <span className="palette__mode">{MODE_LABEL[mode]}</span>
        </div>
        <div className="palette__list" ref={listRef}>
          {items.length === 0 ? (
            <div className="palette__empty">No results</div>
          ) : (
            items.map((it, i) => (
              <button
                type="button"
                key={it.id}
                className={cn("palette__item", i === sel && "is-active")}
                onMouseMove={() => setSel(i)}
                onClick={() => choose(i)}
              >
                {it.icon && <span className="palette__item-icon">{it.icon}</span>}
                <span className="palette__item-label">{it.label}</span>
                {it.sub && <span className="palette__item-sub">{it.sub}</span>}
                {it.hint && <span className="kbd palette__item-hint">{it.hint}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
