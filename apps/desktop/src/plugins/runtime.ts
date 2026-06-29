import type { Extension } from "@codemirror/state";
import { Compartment } from "@codemirror/state";
import { create } from "zustand";
import type { VelqPlugin } from "./api";

/** Each plugin's extension lives behind this compartment so it can be toggled at
 * runtime without recreating the editor view (plan §8.3 / §11). */
export const pluginsCompartment = new Compartment();

interface PluginsState {
  registry: VelqPlugin[];
  enabled: Record<string, boolean>;
  /** Combined extensions of enabled plugins — a stable reference that changes only
   * when the enabled set changes, so the editor reconfigures only on toggle. */
  extensions: Extension[];
  register: (plugin: VelqPlugin) => void;
  setEnabled: (id: string, on: boolean) => void;
  toggle: (id: string) => void;
}

function recompute(registry: VelqPlugin[], enabled: Record<string, boolean>): Extension[] {
  return registry.filter((p) => enabled[p.id] && p.extension).map((p) => p.extension as Extension);
}

export const usePlugins = create<PluginsState>((set, get) => ({
  registry: [],
  enabled: {},
  extensions: [],

  register: (plugin) =>
    set((s) => {
      if (s.registry.some((p) => p.id === plugin.id)) return {};
      const registry = [...s.registry, plugin];
      const enabled = { ...s.enabled, [plugin.id]: s.enabled[plugin.id] ?? true };
      return { registry, enabled, extensions: recompute(registry, enabled) };
    }),

  setEnabled: (id, on) =>
    set((s) => {
      const enabled = { ...s.enabled, [id]: on };
      return { enabled, extensions: recompute(s.registry, enabled) };
    }),

  toggle: (id) => get().setEnabled(id, !get().enabled[id]),
}));
