import { invoke } from "./tauri";
import type { Manifest } from "./types";

export const openVelqViewer = (path: string) => invoke<void>("open_velq_viewer", { path });
/** Register a .velq for serving and get its velq:// URL (for the in-tab viewer). */
export const stageVelq = (path: string) => invoke<string>("stage_velq", { path });
export const readVelqManifest = (path: string) => invoke<Manifest>("read_velq_manifest", { path });
export const unpackVelq = (path: string, outDir: string) =>
  invoke<void>("unpack_velq", { path, outDir });
/** Read the HTML inside a .velq so it can be opened as an editable document. */
export const readVelqIndex = (path: string) => invoke<string>("read_velq_index", { path });
/** Write edited HTML back into a .velq, keeping its manifest and assets. */
export const saveVelqIndex = (path: string, content: string) =>
  invoke<void>("save_velq_index", { path, content });

/** A `.velq` opened for editing: `md` is the Markdown source when it IS a Markdown
 * doc (edit that), else null (edit the `html`). */
export interface VelqDoc {
  md: string | null;
  html: string;
}
/** Read a .velq for editing — Markdown source (if any) + rendered HTML. */
export const readVelqDoc = (path: string) => invoke<VelqDoc>("read_velq_doc", { path });
/** Write an edited Markdown .velq: its source AND freshly rendered HTML. */
export const saveVelqMd = (path: string, md: string, html: string) =>
  invoke<void>("save_velq_md", { path, md, html });
