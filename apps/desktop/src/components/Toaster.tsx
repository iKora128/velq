import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/useT";
import { useToast } from "@/store/toast";
import "./toast.css";

export function Toaster() {
  const t = useT();
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toaster">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast anim-slide-up" role="status">
          <span className="toast__msg">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.action?.run();
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            className="toast__close"
            aria-label={t("toast.dismiss")}
            onClick={() => dismiss(toast.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
