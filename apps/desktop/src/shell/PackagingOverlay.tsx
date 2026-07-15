import { Package } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePackaging } from "@/store/packaging";

/** Where the simulated curve stalls if the job never reports a real count — high
 * enough to read as "nearly there", short of 100 so it never lies about finishing. */
const CEILING = 92;

/** A bar that always moves. Steps that can count their work (N link previews) drive
 * it for real; the rest — a zip, a fetch of unknown size — get a curve that eases
 * toward `CEILING`, fast at first and slower as it climbs. It never runs backwards,
 * and always lands on 100% before the overlay leaves. */
function useSimulatedProgress(active: boolean, current: number, total: number) {
  const [pct, setPct] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (!active) return;
    shown.current = 0;
    setPct(0);
    const id = window.setInterval(() => {
      const step = Math.max(0.45, (CEILING - shown.current) * 0.075);
      shown.current = Math.min(CEILING, shown.current + step);
      setPct(shown.current);
    }, 130);
    return () => window.clearInterval(id);
  }, [active]);

  // A real count outranks the guess, but only ever pulls the bar forward.
  useEffect(() => {
    if (!active || total <= 0) return;
    const real = Math.min(99, (current / total) * 100);
    if (real > shown.current) {
      shown.current = real;
      setPct(real);
    }
  }, [active, current, total]);

  return { pct, finish: () => setPct(100) };
}

/** Full-window overlay shown while a document is packaged into a `.velq` — the job
 * fetches link previews and downloads images, so it must never look frozen. */
export function PackagingOverlay() {
  const active = usePackaging((s) => s.active);
  const label = usePackaging((s) => s.label);
  const current = usePackaging((s) => s.current);
  const total = usePackaging((s) => s.total);

  const [visible, setVisible] = useState(false);
  const { pct, finish } = useSimulatedProgress(active, current, total);
  // `end()` clears the label, so hold the last one through the outro.
  const lastLabel = useRef("");
  if (label) lastLabel.current = label;

  useEffect(() => {
    if (active) setVisible(true);
  }, [active]);

  // Land on 100% and let it read for a beat rather than yanking the card away.
  useEffect(() => {
    if (active || !visible) return;
    finish();
    const id = window.setTimeout(() => setVisible(false), 340);
    return () => window.clearTimeout(id);
  }, [active, visible, finish]);

  if (!visible) return null;
  const done = !active;

  return (
    <div className="packaging" role="status" aria-live="polite" data-done={done || undefined}>
      <div className="packaging__card">
        <div className="packaging__spinner" data-done={done || undefined} aria-hidden>
          <Package size={22} />
        </div>
        <div className="packaging__label">{lastLabel.current}</div>
        <div
          className="packaging__bar"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="packaging__fill"
            data-done={done || undefined}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="packaging__count">
          {total > 0 ? `${current} / ${total}` : `${Math.round(pct)}%`}
        </div>
      </div>
    </div>
  );
}
