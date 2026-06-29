import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  type LucideIcon,
  Package,
} from "lucide-react";

/** A recognizable glyph + color for one file kind. Colors come from the
 * `--icon-*` design tokens (tokens.css) so a folder is always the same blue,
 * a Markdown document always the same teal, an image always green, and so on. */
export interface FileVisual {
  Icon: LucideIcon;
  color: string;
}

const DOC = "var(--icon-doc)";
const WEB = "var(--icon-web)";
const IMAGE = "var(--icon-image)";
const PDF = "var(--icon-pdf)";
const CODE = "var(--icon-code)";
const ARCHIVE = "var(--icon-archive)";
const AUDIO = "var(--icon-audio)";
const VIDEO = "var(--icon-video)";

const BY_EXT: Record<string, FileVisual> = {
  // Prose / text documents
  md: { Icon: FileText, color: DOC },
  markdown: { Icon: FileText, color: DOC },
  mdx: { Icon: FileText, color: DOC },
  txt: { Icon: FileText, color: DOC },
  text: { Icon: FileText, color: DOC },
  rtf: { Icon: FileText, color: DOC },
  // Web pages and the .velq package
  html: { Icon: FileCode, color: WEB },
  htm: { Icon: FileCode, color: WEB },
  velq: { Icon: Package, color: WEB },
  // PDF (a red document, the universal "PDF" look)
  pdf: { Icon: FileText, color: PDF },
  // Images
  png: { Icon: FileImage, color: IMAGE },
  jpg: { Icon: FileImage, color: IMAGE },
  jpeg: { Icon: FileImage, color: IMAGE },
  gif: { Icon: FileImage, color: IMAGE },
  svg: { Icon: FileImage, color: IMAGE },
  webp: { Icon: FileImage, color: IMAGE },
  avif: { Icon: FileImage, color: IMAGE },
  bmp: { Icon: FileImage, color: IMAGE },
  ico: { Icon: FileImage, color: IMAGE },
  // Code / config
  js: { Icon: FileCode, color: CODE },
  jsx: { Icon: FileCode, color: CODE },
  ts: { Icon: FileCode, color: CODE },
  tsx: { Icon: FileCode, color: CODE },
  json: { Icon: FileCode, color: CODE },
  css: { Icon: FileCode, color: CODE },
  scss: { Icon: FileCode, color: CODE },
  rs: { Icon: FileCode, color: CODE },
  py: { Icon: FileCode, color: CODE },
  go: { Icon: FileCode, color: CODE },
  rb: { Icon: FileCode, color: CODE },
  sh: { Icon: FileCode, color: CODE },
  yml: { Icon: FileCode, color: CODE },
  yaml: { Icon: FileCode, color: CODE },
  toml: { Icon: FileCode, color: CODE },
  xml: { Icon: FileCode, color: CODE },
  // Archives
  zip: { Icon: FileArchive, color: ARCHIVE },
  tar: { Icon: FileArchive, color: ARCHIVE },
  gz: { Icon: FileArchive, color: ARCHIVE },
  tgz: { Icon: FileArchive, color: ARCHIVE },
  rar: { Icon: FileArchive, color: ARCHIVE },
  "7z": { Icon: FileArchive, color: ARCHIVE },
  // Audio
  mp3: { Icon: FileAudio, color: AUDIO },
  wav: { Icon: FileAudio, color: AUDIO },
  flac: { Icon: FileAudio, color: AUDIO },
  aac: { Icon: FileAudio, color: AUDIO },
  ogg: { Icon: FileAudio, color: AUDIO },
  m4a: { Icon: FileAudio, color: AUDIO },
  // Video
  mp4: { Icon: FileVideo, color: VIDEO },
  mov: { Icon: FileVideo, color: VIDEO },
  webm: { Icon: FileVideo, color: VIDEO },
  mkv: { Icon: FileVideo, color: VIDEO },
  avi: { Icon: FileVideo, color: VIDEO },
};

const FOLDER: FileVisual = { Icon: Folder, color: "var(--icon-folder)" };
const FOLDER_OPEN: FileVisual = { Icon: FolderOpen, color: "var(--icon-folder)" };
const DEFAULT_FILE: FileVisual = { Icon: File, color: "var(--icon-default)" };

/** Pick the glyph + color for a node. Folders are always the folder-blue;
 * files map by extension, falling back to a neutral document. */
export function fileVisual(
  ext: string | null,
  kind: "file" | "dir" = "file",
  open = false,
): FileVisual {
  if (kind === "dir") return open ? FOLDER_OPEN : FOLDER;
  return BY_EXT[(ext ?? "").toLowerCase()] ?? DEFAULT_FILE;
}
