import { Puzzle, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { usePalette } from "@/store/palette";
import { cn } from "@/util/cn";
import { usePlugins } from "./runtime";
import "./pluginsPanel.css";

export function PluginsPanel() {
  const open = usePalette((s) => s.plugins);
  const toggle = usePalette((s) => s.togglePlugins);
  const registry = usePlugins((s) => s.registry);
  const enabled = usePlugins((s) => s.enabled);
  const setEnabled = usePlugins((s) => s.setEnabled);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle]);

  if (!open) return null;

  return createPortal(
    <div className="plugins-backdrop anim-fade" onClick={toggle} role="presentation">
      <div
        className="plugins anim-pop"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Plugins"
      >
        <div className="plugins__head">
          <span className="plugins__title">
            <Puzzle size={16} /> Plugins
          </span>
          <button type="button" className="icon-btn" aria-label="Close" onClick={toggle}>
            <X size={16} />
          </button>
        </div>
        <div className="plugins__list">
          {registry.map((p) => (
            <label className="plugin-row" key={p.id}>
              <div className="plugin-row__text">
                <div className="plugin-row__name">{p.name}</div>
                {p.description && <div className="plugin-row__desc">{p.description}</div>}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!enabled[p.id]}
                className={cn("toggle", enabled[p.id] && "toggle--on")}
                onClick={() => setEnabled(p.id, !enabled[p.id])}
              >
                <span className="toggle__knob" />
              </button>
            </label>
          ))}
        </div>
        <p className="plugins__foot">
          Plugins are CodeMirror extensions. They render in <b>Live</b> mode.
        </p>
      </div>
    </div>,
    document.body,
  );
}
