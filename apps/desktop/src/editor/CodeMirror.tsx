import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { type CSSProperties, useEffect, useRef } from "react";
import { pluginsCompartment } from "@/plugins/runtime";
import { editorBus } from "./editorBus";
import {
  coreExtensions,
  extraCompartment,
  keymapModeCompartment,
  type Lang,
  langCompartment,
  langExtension,
  liveCompartment,
  liveExtension,
  spellcheckCompartment,
  spellcheckExtension,
  vimExtension,
} from "./extensions";

interface Props {
  /** Read once at mount. Switch documents by changing the React `key`, not this. */
  initialDoc: string;
  language: Lang;
  vimMode: boolean;
  live: boolean;
  spellcheck?: boolean;
  font: "prose" | "mono";
  /** Enabled plugin extensions (live mode only) — reconfigured on toggle. */
  pluginExt?: Extension;
  /** Doc-scoped extras (image paste, [[ link completion) — reconfigured on change. */
  extraExt?: Extension;
  onChange?: (text: string) => void;
  onReady?: (view: EditorView) => void;
}

/**
 * The thin CodeMirror wrapper (plan §8.3). React owns the container + app state;
 * CM owns the editor internals. The view is created once on mount and destroyed on
 * cleanup (StrictMode-safe). Runtime-switchable things go through Compartments, never
 * a view recreation. `onChange` is kept fresh via a ref so the update listener never
 * goes stale and never forces a rebuild.
 */
export function CodeMirror({
  initialDoc,
  language,
  vimMode,
  live,
  spellcheck = false,
  font,
  pluginExt,
  extraExt,
  onChange,
  onReady,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-once by design; doc/lang/vim are handled by remount-key and the compartment effects below.
  useEffect(() => {
    const parent = host.current;
    if (!parent) return;

    const listener = EditorView.updateListener.of((u) => {
      if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
    });

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        keymapModeCompartment.of(vimExtension(vimMode)),
        spellcheckCompartment.of(spellcheckExtension(spellcheck)),
        langCompartment.of(langExtension(language)),
        liveCompartment.of(liveExtension(live, language)),
        pluginsCompartment.of(pluginExt ?? []),
        extraCompartment.of(extraExt ?? []),
        ...coreExtensions(),
        listener,
      ],
    });

    const view = new EditorView({ state, parent });
    viewRef.current = view;
    editorBus.setView(view);
    onReady?.(view);
    // Defer focus so it doesn't fight the initial paint.
    queueMicrotask(() => view.focus());

    return () => {
      editorBus.clear(view);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Language + vim + live switch via compartment reconfigure — no view recreation.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: [
        langCompartment.reconfigure(langExtension(language)),
        liveCompartment.reconfigure(liveExtension(live, language)),
      ],
    });
  }, [language, live]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: keymapModeCompartment.reconfigure(vimExtension(vimMode)),
    });
  }, [vimMode]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: spellcheckCompartment.reconfigure(spellcheckExtension(spellcheck)),
    });
  }, [spellcheck]);

  // Plugins toggled on/off → reconfigure, no view recreation.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: pluginsCompartment.reconfigure(pluginExt ?? []),
    });
  }, [pluginExt]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: extraCompartment.reconfigure(extraExt ?? []),
    });
  }, [extraExt]);

  const style = {
    height: "100%",
    "--editor-font": font === "mono" ? "var(--font-mono)" : "var(--font-prose)",
  } as CSSProperties;

  return <div ref={host} className="cm-host" style={style} />;
}
