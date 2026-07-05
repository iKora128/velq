import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { searchFilenames } from "@/ipc/search";
import { useVault } from "@/store/vault";

/** Type `[[` and pick a document — it becomes a plain relative Markdown link,
 * `[Title](sub/dir/file.md)` (W2). Nothing wiki-flavored lands on disk: the file
 * stays portable Markdown that any other app follows. */

const dirOf = (p: string) => p.slice(0, Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\")));

/** POSIX-style relative path from `fromDir` to `to` (both absolute). */
export function relPath(fromDir: string, to: string): string {
  const a = fromDir.split(/[/\\]/).filter(Boolean);
  const b = to.split(/[/\\]/).filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const ups = a.length - i;
  const down = b.slice(i);
  return [...Array(ups).fill(".."), ...down].join("/") || ".";
}

/** Space → %20 etc., but keep `/` so the path reads naturally. */
const encodeRel = (p: string) => p.split("/").map(encodeURIComponent).join("/");

function completions(getDocPath: () => string | null) {
  return async (ctx: CompletionContext) => {
    const word = ctx.matchBefore(/\[\[([^\]\n]*)$/);
    if (!word) return null;
    const query = word.text.slice(2);
    if (!ctx.explicit && query.length === 0) return null;
    const root = useVault.getState().root?.path;
    if (!root) return null;
    const hits = await searchFilenames(query || "", root);
    const docPath = getDocPath();
    const fromDir = docPath ? dirOf(docPath) : root;
    return {
      from: word.from,
      options: hits
        .filter((h) => /\.(md|markdown|html?)$/i.test(h.name))
        .slice(0, 30)
        .map((h) => {
          const title = h.name.replace(/\.(md|markdown|html?)$/i, "");
          const rel = encodeRel(relPath(fromDir, h.path));
          const link = `[${title}](${rel})`;
          return {
            label: h.name,
            detail: rel,
            type: "text",
            // Replace the whole “[[query” AND the auto-closed “]]” closeBrackets
            // left behind the caret, so exactly one clean link remains.
            apply: (view: EditorView, _c: unknown, from: number, to: number) => {
              const after = view.state.sliceDoc(to, to + 2);
              const extra = after === "]]" ? 2 : after.startsWith("]") ? 1 : 0;
              view.dispatch({
                changes: { from, to: to + extra, insert: link },
                selection: { anchor: from + link.length },
              });
            },
          };
        }),
      // The search already filtered by the query; CM's own matcher would try to
      // match the literal “[[…” prefix against labels and blank the list.
      filter: false,
    };
  };
}

/** Autocomplete source for internal links; active in Markdown editors only. */
export function linkCompleteExtension(getDocPath: () => string | null): Extension {
  return autocompletion({
    override: [completions(getDocPath)],
    icons: false,
  });
}
