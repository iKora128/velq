import { marked } from "marked";
import { memo } from "react";

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

/** Render an agent message as Markdown — code blocks, lists, bold, inline code, links.
 *  Memoized so only the streaming last entry re-parses on each chunk. */
export const AgentMarkdown = memo(function AgentMarkdown({ text }: { text: string }) {
  const html = sanitize(marked.parse(text, { gfm: true, breaks: true, async: false }) as string);
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized Markdown from the local agent.
    <div className="agent-md" dangerouslySetInnerHTML={{ __html: html }} />
  );
});
