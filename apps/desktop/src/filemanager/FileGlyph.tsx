import type { CSSProperties } from "react";
import { fileVisual } from "./fileVisual";

interface Props {
  ext: string | null;
  kind?: "file" | "dir";
  /** Show the open-folder variant (tree expansion). */
  open?: boolean;
  size?: number;
  /** Wash the glyph with a translucent fill of its own color — looks great at the
   * large sizes used in the icon grid; leave off for crisp 15–16px list rows. */
  duotone?: boolean;
  strokeWidth?: number;
  className?: string;
}

/** One source of truth for "what a file looks like": every file view renders its
 * icons through here, so a folder is always the same blue folder and a Markdown
 * document the same teal page — no matter which view you're in. */
export function FileGlyph({
  ext,
  kind = "file",
  open = false,
  size = 16,
  duotone = false,
  strokeWidth = 1.8,
  className,
}: Props) {
  const { Icon, color } = fileVisual(ext, kind, open);
  // `color` drives the stroke (via currentColor); `fill` paints a soft wash.
  const style: CSSProperties = { color };
  if (duotone) style.fill = `color-mix(in srgb, ${color} 16%, transparent)`;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} />;
}
