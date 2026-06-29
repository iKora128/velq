import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useToast } from "@/store/toast";
import "./toast.css";

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toaster">
      {toasts.map((t) => (
        <div key={t.id} className="toast anim-slide-up" role="status">
          <span className="toast__msg">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                t.action?.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
