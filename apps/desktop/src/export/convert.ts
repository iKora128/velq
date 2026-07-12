import { isHtmlPath, isMdPath, packageAndStage, packageMdAndStage } from "./htmlPackage";

const baseName = (p: string) => p.split(/[/\\]/).pop() ?? p;

/** Whether a file can be made into a `.velq` (a plain Markdown or HTML file). */
export const canConvertToVelq = (name: string) => isMdPath(name) || isHtmlPath(name);

/**
 * Make a `.velq` from a plain `.md`/`.html` file — a COPY in `Documents/Velq`. The
 * original is never touched or removed (that folder is exactly what it's for). The
 * user triggers this (right-click / the "make a .velq" banner); it is NEVER a side
 * effect of opening. Heavy steps (link previews, image downloads) run behind the
 * progress overlay, then the fresh package opens carrying its source path.
 */
export async function convertToVelq(path: string): Promise<void> {
  const name = baseName(path);
  if (isMdPath(name)) await packageMdAndStage(path);
  else if (isHtmlPath(name)) await packageAndStage(path);
}
