import { Code, File, FileImage, FileText, type LucideIcon } from "lucide-react";

export function fileIcon(ext: string | null): LucideIcon {
  switch ((ext ?? "").toLowerCase()) {
    case "md":
    case "markdown":
    case "txt":
      return FileText;
    case "html":
    case "htm":
    case "velq":
      return Code;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return FileImage;
    default:
      return File;
  }
}
