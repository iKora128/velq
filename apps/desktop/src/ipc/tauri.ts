/**
 * The single choke point for talking to the Rust backend. Everything else in the
 * app calls the typed wrappers in this folder; nobody calls `invoke()` with a bare
 * string. When running outside Tauri (plain Vite for UI work / screenshots), calls
 * are served by the in-memory mock backend instead — so the whole UI is exercisable
 * in a browser.
 */
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen, type UnlistenFn } from "@tauri-apps/api/event";
import { mockInvoke } from "./mock";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) return mockInvoke<T>(cmd, args ?? {});
  return tauriInvoke<T>(cmd, args);
}

export async function listen<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
  if (!isTauri()) {
    // No backend events in browser mode; return a no-op unlisten.
    return () => {};
  }
  return tauriListen<T>(event, (e) => handler(e.payload));
}

export type { UnlistenFn };
