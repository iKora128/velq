import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { useT } from "@/i18n/useT";

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
}

const STEP = 16;

/** A 1px draggable column separator with a generous invisible hit area.
 * Keyboard-operable: focus it and use arrow keys to resize. */
export function PaneDivider({ value, min, max, onChange, label }: Props) {
  const t = useT();
  const resolvedLabel = label ?? t("panedivider.label");
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, v: 0 });

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, v: value };
    setDragging(true);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onChange(clamp(start.current.v + (e.clientX - start.current.x)));
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") onChange(clamp(value - STEP));
    else if (e.key === "ArrowRight") onChange(clamp(value + STEP));
    else return;
    e.preventDefault();
  };

  return (
    <div
      className="pane-divider"
      data-dragging={dragging}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={resolvedLabel}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onKeyDown={onKeyDown}
    />
  );
}
