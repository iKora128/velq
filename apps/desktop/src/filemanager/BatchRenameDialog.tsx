import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MsgKey } from "@/i18n";
import { useT } from "@/i18n/useT";
import { useBatchRename } from "@/store/batchRename";
import { useFiles } from "@/store/files";
import { cn } from "@/util/cn";
import "./batchRename.css";

type Mode = "replace" | "add" | "number";
const MODES: { value: Mode; key: MsgKey }[] = [
  { value: "replace", key: "batch.mode.replace" },
  { value: "add", key: "batch.mode.add" },
  { value: "number", key: "batch.mode.number" },
];

function splitName(name: string): [string, string] {
  const i = name.lastIndexOf(".");
  return i > 0 ? [name.slice(0, i), name.slice(i + 1)] : [name, ""];
}
function parentOf(p: string): string {
  return p.slice(0, p.lastIndexOf("/"));
}

/** Rename many files at once with a live preview. Operates on the name stem and
 * keeps each file's extension; blocks applying while any result would collide. */
export function BatchRenameDialog() {
  const t = useT();
  const targets = useBatchRename((s) => s.targets);
  const close = useBatchRename((s) => s.close);
  const [mode, setMode] = useState<Mode>("replace");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [base, setBase] = useState("");
  const [start, setStart] = useState(1);
  const [name, setName] = useState(""); // direct name for a single-file rename

  const open = targets.length > 0;
  const single = targets.length === 1;
  const controlsRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: seed from the fresh targets on open.
  useEffect(() => {
    if (open) {
      setMode("replace");
      setFind("");
      setReplace("");
      setPrefix("");
      setSuffix("");
      setBase("");
      setStart(1);
      setName(targets.length === 1 ? splitName(targets[0].name)[0] : "");
    }
  }, [open]);

  // Focus the first input when the dialog opens or the mode changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-focus when the mode's fields swap in.
  useEffect(() => {
    if (open) controlsRef.current?.querySelector("input")?.focus();
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const rows = useMemo(() => {
    if (single) {
      const node = targets[0];
      const [stem, ext] = splitName(node.name);
      const newStem = name.trim() || stem;
      return [{ node, newName: ext ? `${newStem}.${ext}` : newStem }];
    }
    return targets.map((node, i) => {
      const [stem, ext] = splitName(node.name);
      let newStem = stem;
      if (mode === "replace") newStem = find ? stem.split(find).join(replace) : stem;
      else if (mode === "add") newStem = `${prefix}${stem}${suffix}`;
      else newStem = `${(base.trim() || stem).trim()} ${start + i}`;
      newStem = newStem.trim() || stem;
      const newName = ext ? `${newStem}.${ext}` : newStem;
      return { node, newName };
    });
  }, [targets, single, name, mode, find, replace, prefix, suffix, base, start]);

  const { collisions, changed } = useMemo(() => {
    const files = useFiles.getState();
    const targetPaths = new Set(targets.map((n) => n.path));
    const seen = new Map<string, Set<string>>();
    let bad = 0;
    let anyChanged = false;
    for (const { node, newName } of rows) {
      if (newName !== node.name) anyChanged = true;
      const parent = parentOf(node.path);
      const siblings = (files.childrenByPath[parent] ?? [])
        .filter((s) => !targetPaths.has(s.path))
        .map((s) => s.name);
      const taken = seen.get(parent) ?? new Set<string>();
      if (!newName.trim() || taken.has(newName) || siblings.includes(newName)) bad++;
      taken.add(newName);
      seen.set(parent, taken);
    }
    return { collisions: bad, changed: anyChanged };
  }, [rows, targets]);

  if (!open) return null;
  const canApply = changed && collisions === 0;

  const apply = () => {
    const renames = rows
      .filter((r) => r.newName !== r.node.name)
      .map((r) => ({ node: r.node, newName: r.newName }));
    void useFiles.getState().renameMany(renames);
    close();
  };

  return createPortal(
    <div className="batch-backdrop anim-fade" onClick={close} role="presentation">
      <div
        className="batch anim-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t("batch.aria")}
        aria-modal="true"
      >
        <h2 className="batch__title">
          {single ? t("contextmenu.rename") : t("batch.title", { count: targets.length })}
        </h2>

        {!single && (
          <div className="batch__modes segmented" role="group">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                className={cn("segmented__opt", mode === m.value && "is-active")}
                aria-pressed={mode === m.value}
                onClick={() => setMode(m.value)}
              >
                {t(m.key)}
              </button>
            ))}
          </div>
        )}

        <div className="batch__controls" ref={controlsRef}>
          {single && (
            <Field label={t("batch.baseName")}>
              <input
                className="batch__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          )}
          {!single && mode === "replace" && (
            <>
              <Field label={t("batch.find")}>
                <input
                  className="batch__input"
                  value={find}
                  onChange={(e) => setFind(e.target.value)}
                />
              </Field>
              <Field label={t("batch.replace")}>
                <input
                  className="batch__input"
                  value={replace}
                  onChange={(e) => setReplace(e.target.value)}
                />
              </Field>
            </>
          )}
          {mode === "add" && (
            <>
              <Field label={t("batch.prefix")}>
                <input
                  className="batch__input"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </Field>
              <Field label={t("batch.suffix")}>
                <input
                  className="batch__input"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                />
              </Field>
            </>
          )}
          {mode === "number" && (
            <>
              <Field label={t("batch.baseName")}>
                <input
                  className="batch__input"
                  value={base}
                  placeholder={targets[0] ? splitName(targets[0].name)[0] : ""}
                  onChange={(e) => setBase(e.target.value)}
                />
              </Field>
              <Field label={t("batch.startAt")}>
                <input
                  className="batch__input batch__input--num"
                  type="number"
                  value={start}
                  onChange={(e) => setStart(Number.parseInt(e.target.value, 10) || 0)}
                />
              </Field>
            </>
          )}
        </div>

        <div className="batch__preview-head">{t("batch.preview")}</div>
        <div className="batch__preview">
          {rows.map((r) => {
            const changedRow = r.newName !== r.node.name;
            return (
              <div className="batch__row" key={r.node.path}>
                <span className="batch__old">{r.node.name}</span>
                <span className="batch__arrow">→</span>
                <span className={cn("batch__new", changedRow && "is-changed")}>{r.newName}</span>
              </div>
            );
          })}
        </div>

        <div className="batch__foot">
          <span className="batch__status">
            {collisions > 0
              ? t("batch.collision", { count: collisions })
              : !changed
                ? t("batch.unchanged")
                : ""}
          </span>
          <div className="batch__spacer" />
          <button type="button" className="btn btn--sm" onClick={close}>
            {t("batch.cancel")}
          </button>
          <button
            type="button"
            className="btn btn--sm btn--primary"
            disabled={!canApply}
            onClick={apply}
          >
            {t("batch.apply")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="batch__field">
      <span className="batch__label">{label}</span>
      {children}
    </div>
  );
}
