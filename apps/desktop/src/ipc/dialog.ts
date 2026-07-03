import { t } from "@/i18n";
import { isTauri } from "./tauri";

/** Native "Save As" dialog (browser mode returns a stub path). When `dir` is
 * given, the dialog opens there with the filename pre-filled. */
export async function pickSaveFile(
  defaultName: string,
  ext: string,
  dir?: string | null,
): Promise<string | null> {
  if (!isTauri()) return `${dir ?? "/Users/you/Downloads"}/${defaultName}`;
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({
    defaultPath: dir ? `${dir}/${defaultName}` : defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });
  return path ?? null;
}

/** The directory portion of an absolute file path. */
export function dirOf(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i > 0 ? path.slice(0, i) : path;
}

/** Native "Open file" dialog filtered to HTML. */
export async function pickHtmlFile(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const picked = await open({
    multiple: false,
    directory: false,
    title: t("dialog.chooseHtml"),
    filters: [{ name: "HTML", extensions: ["html", "htm"] }],
  });
  return typeof picked === "string" ? picked : null;
}
