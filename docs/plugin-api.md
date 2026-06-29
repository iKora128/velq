# Velq Plugin API

Velq's rendering plugins are **CodeMirror 6 extensions** — the same machinery the
built-in live preview is made of. The core editor knows nothing about any specific
plugin: KaTeX and Mermaid ship as *reference* plugins built only on the public API
below, and turning them off leaves plain Markdown behind. If you can write a CM6
extension, you can write a Velq plugin.

> Plugins render in **Live** (and **Split**) preview. In **Source** mode the editor
> shows raw text, so plugin decorations are intentionally inactive.

## The interface

```ts
// src/plugins/api.ts
export interface VelqPlugin {
  id: string;            // stable, unique — used as the on/off key
  name: string;          // shown in the Plugins panel
  description?: string;  // one calm line, shown under the name
  extension?: Extension; // CM6 extension(s): decorations, view plugins, keymaps…
  commands?: PluginCommand[]; // optional command-palette entries
}

export interface PluginCommand {
  id: string;
  title: string;
  run: (view: EditorView | null) => void;
}
```

`extension` is a standard CodeMirror `Extension`, so it can be a single extension or
an array (`[fieldA, viewPluginB, keymap.of(...)]`).

## Registering a plugin

Call `usePlugins.register()` once at startup. Registration is idempotent by `id`, and
a freshly registered plugin defaults to **enabled**.

```ts
import { usePlugins } from "@/plugins/runtime";
import type { VelqPlugin } from "@/plugins/api";

const myPlugin: VelqPlugin = {
  id: "highlight-todo",
  name: "TODO highlighter",
  description: "Tint TODO and FIXME markers.",
  extension: todoHighlightExtension, // your CM6 extension
};

usePlugins.register(myPlugin);
```

The built-ins follow exactly this shape — see
[`src/plugins/builtin/index.ts`](../apps/desktop/src/plugins/builtin/index.ts),
which registers `katexPlugin` and `mermaidPluginDef` behind a once-guard.

## How toggling works

Every enabled plugin's `extension` is combined into one list and injected through a
single CodeMirror **compartment**:

```ts
export const pluginsCompartment = new Compartment();
```

The editor wires it up once (`pluginsCompartment.of(pluginExt)`), and a reconfigure
effect swaps the contents whenever the enabled set changes — **no editor teardown**,
so the cursor, selection, undo history and scroll position all survive a toggle. The
`usePlugins` store exposes a stable `extensions` reference that only changes when a
plugin is switched on or off, so the editor reconfigures on toggle and nothing else.

This is what makes the core/plugins split real: with KaTeX and Mermaid off, `$x$`
and ```` ```mermaid ```` blocks are just ordinary Markdown text.

## Writing the extension

Plugins are plain CM6, with two house rules worth knowing:

1. **Replacing line breaks needs a `StateField`, not a `ViewPlugin`.** Inline
   decorations (e.g. wrapping `$…$` on one line) are fine from a `ViewPlugin`. But a
   *block* widget that swallows whole lines — like a fenced-diagram → SVG swap —
   replaces the newlines between those lines, which CodeMirror only allows from a
   `StateField`. The Mermaid plugin uses a `StateField` with `block: true`; KaTeX
   stays a `ViewPlugin` and only matches single-line math.

2. **Reveal raw source on the active line.** Both reference plugins skip decorating
   any line that the selection touches, so putting the cursor on a rendered element
   shows its source for editing. This is the calm-editing convention; follow it.

3. **Be theme-aware if you bake colours.** Decorations that inherit `currentColor`
   (like KaTeX) need nothing. Anything that renders its own palette (like Mermaid,
   which compiles colours into the SVG) should read
   `document.documentElement.dataset.theme` and re-render on change — Mermaid watches
   that attribute with a `MutationObserver` and rebuilds via a state effect.

## Reference plugins

| Plugin | File | Renders | Mechanism |
| ------ | ---- | ------- | --------- |
| KaTeX  | [`builtin/katex.ts`](../apps/desktop/src/plugins/builtin/katex.ts)   | `$inline$` and `$$display$$` math | `ViewPlugin` + replace decoration |
| Mermaid| [`builtin/mermaid.ts`](../apps/desktop/src/plugins/builtin/mermaid.ts) | fenced `mermaid` blocks → diagrams | `StateField` block widget + theme watcher |

Open the bundled **Plugins.md** sample (Command Palette → it loads on
`#sample-plugins`) to see both live, and open the **Plugins…** command to toggle them.

## Licensing

The Velq app is Apache-2.0. Plugins are an extension point, not a derivative of the
core — **plugin authors license their own plugins however they choose.**
