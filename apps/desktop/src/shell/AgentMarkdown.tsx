import { marked } from "marked";
import { memo } from "react";
import { cn } from "@/util/cn";

/** Defense-in-depth: strip the few things `marked` passes through that we never want from
 *  the agent's output. It's a local, trusted agent, but the panel isn't sandboxed. */
function sanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "");
}

/** Render an agent message as Markdown — headings, lists (incl. task lists), code blocks,
 *  bold, inline code, links. `streaming` adds a blinking caret after the last line so a
 *  reply that's still arriving reads as live. Memoized so only the streaming last entry
 *  re-parses on each chunk. */
export const AgentMarkdown = memo(function AgentMarkdown({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) {
  const html = sanitize(marked.parse(text, { gfm: true, breaks: true, async: false }) as string);
  return (
    <div
      className={cn("agent-md", streaming && "is-streaming")}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized Markdown from the local agent.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
