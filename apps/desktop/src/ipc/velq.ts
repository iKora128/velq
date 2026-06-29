import { invoke } from "./tauri";
import type { Manifest } from "./types";

export const openVelqViewer = (path: string) => invoke<void>("open_velq_viewer", { path });
export const readVelqManifest = (path: string) => invoke<Manifest>("read_velq_manifest", { path });
export const unpackVelq = (path: string, outDir: string) =>
  invoke<void>("unpack_velq", { path, outDir });
