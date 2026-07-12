import { Package } from "lucide-react";
import { usePackaging } from "@/store/packaging";

/** Full-window overlay shown while a document is packaged into a `.velq` — the
 * job fetches link previews and downloads images, so it must never look frozen. */
export function PackagingOverlay() {
  const active = usePackaging((s) => s.active);
  const label = usePackaging((s) => s.label);
  const current = usePackaging((s) => s.current);
  const total = usePackaging((s) => s.total);
  if (!active) return null;
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="packaging" role="status" aria-live="polite">
      <div className="packaging__card">
        <div className="packaging__spinner" aria-hidden>
          <Package size={22} />
        </div>
        <div className="packaging__label">{label}</div>
        {total > 0 ? (
          <>
            <div className="packaging__bar">
              <div className="packaging__fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="packaging__count">
              {current} / {total}
            </div>
          </>
        ) : (
          <div className="packaging__bar packaging__bar--indeterminate">
            <div className="packaging__fill" />
          </div>
        )}
      </div>
    </div>
  );
}
