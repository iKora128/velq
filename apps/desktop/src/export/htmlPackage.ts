import { packageHtmlFile } from "@/ipc/bundle";
import { pickHtmlFile } from "@/ipc/dialog";
import { openVelqViewer } from "@/ipc/velq";
import { useToast } from "@/store/toast";

const baseName = (p: string) => p.split(/[/\\]/).pop() ?? p;

/** Open-and-package an HTML file: trace its dependencies and stage a self-contained
 * `.velq` in Documents/Velq, then offer to open it. (plan §6; user workflow.) */
export async function packageAndStage(htmlPath: string): Promise<void> {
  const name = baseName(htmlPath);
  useToast.getState().push(`Packaging ${name}…`);
  try {
    const r = await packageHtmlFile(htmlPath);
    const skipped = r.failed ? ` · ${r.failed} link${r.failed === 1 ? "" : "s"} skipped` : "";
    useToast.getState().push(`Saved to Documents/Velq · ${r.collected} files${skipped}`, {
      label: "Open",
      run: () => void openVelqViewer(r.outPath),
    });
  } catch (e) {
    console.error("package_html_file failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    useToast.getState().push(`Couldn't package ${name}: ${msg}`);
  }
}

export const isHtmlPath = (name: string) => /\.html?$/i.test(name);

/** Pick an HTML file from disk and package it straight to Documents/Velq. */
export async function openHtmlAndPackage(): Promise<void> {
  const path = await pickHtmlFile();
  if (path) await packageAndStage(path);
}
