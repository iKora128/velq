import { usePlugins } from "../runtime";
import { katexPlugin } from "./katex";
import { mermaidPluginDef } from "./mermaid";

let done = false;

/** Register the reference plugins. Called once at startup; each is built solely on
 * the public plugin API, so the core editor stays unaware of math/diagrams. */
export function registerBuiltins() {
  if (done) return;
  done = true;
  const { register } = usePlugins.getState();
  register(katexPlugin);
  register(mermaidPluginDef);
}
