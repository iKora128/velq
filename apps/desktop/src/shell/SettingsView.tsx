import type { ReactNode } from "react";
import type { MsgKey } from "@/i18n";
import { useT } from "@/i18n/useT";
import type {
  Density,
  EditorMode,
  LocalePref,
  PreviewTemplate,
  SidebarView,
  ThemePref,
  VelqOpenIn,
} from "@/ipc/types";
import { useSettings } from "@/store/settings";
import { cn } from "@/util/cn";
import { AgentSettings } from "./AgentSettings";
import "./settings-view.css";

const THEMES: { value: ThemePref; labelKey: MsgKey }[] = [
  { value: "light", labelKey: "settings.theme.light" },
  { value: "dark", labelKey: "settings.theme.dark" },
  { value: "system", labelKey: "settings.theme.system" },
];

/** The full-page settings view (activity bar → gear). Everything writes straight
 * through to the persisted settings store. */
export function SettingsView() {
  const s = useSettings();
  const { update } = s;
  const t = useT();

  return (
    <div className="settings-view">
      <div className="settings-view__inner">
        <h1 className="settings-view__title">{t("settings.title")}</h1>

        <Section title={t("settings.general")} desc={t("settings.general.desc")}>
          <Field label={t("settings.language")} hint={t("settings.language.desc")}>
            <Segmented<LocalePref>
              value={s.locale}
              onChange={(locale) => update({ locale })}
              options={[
                { value: "system", label: t("settings.language.system") },
                { value: "en", label: t("settings.language.en") },
                { value: "ja", label: t("settings.language.ja") },
              ]}
            />
          </Field>
        </Section>

        <Section title={t("settings.appearance")} desc={t("settings.appearance.desc")}>
          <Field label={t("settings.theme")}>
            <div className="theme-cards">
              {THEMES.map((th) => (
                <button
                  key={th.value}
                  type="button"
                  className={cn("theme-card", s.theme === th.value && "is-active")}
                  aria-pressed={s.theme === th.value}
                  onClick={() => update({ theme: th.value })}
                >
                  <span className={`theme-card__swatch theme-card__swatch--${th.value}`} />
                  <span className="theme-card__label">{t(th.labelKey)}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label={t("settings.density")} hint={t("settings.density.hint")}>
            <Segmented<Density>
              value={s.density}
              onChange={(density) => update({ density })}
              options={[
                { value: "comfortable", label: t("settings.density.comfortable") },
                { value: "compact", label: t("settings.density.compact") },
              ]}
            />
          </Field>

          <Toggle
            label={t("settings.readingFont")}
            hint={t("settings.readingFont.hint")}
            checked={s.proseFont}
            onChange={(proseFont) => update({ proseFont })}
          />

          <Field label={t("settings.previewTemplate")} hint={t("settings.previewTemplate.hint")}>
            <Segmented<PreviewTemplate>
              value={s.previewTemplate}
              onChange={(previewTemplate) => update({ previewTemplate })}
              options={[
                { value: "paper", label: t("settings.previewTemplate.paper") },
                { value: "docs", label: t("settings.previewTemplate.docs") },
                { value: "note", label: t("settings.previewTemplate.note") },
                { value: "magazine", label: t("settings.previewTemplate.magazine") },
                { value: "tech", label: t("settings.previewTemplate.tech") },
                { value: "sky", label: t("settings.previewTemplate.sky") },
                { value: "glass", label: t("settings.previewTemplate.glass") },
              ]}
            />
          </Field>
        </Section>

        <Section title={t("settings.editor")} desc={t("settings.editor.desc")}>
          <Field label={t("settings.editor.defaultView")}>
            <Segmented<EditorMode>
              value={s.editorMode}
              onChange={(editorMode) => update({ editorMode })}
              options={[
                { value: "source", label: t("settings.editor.source") },
                { value: "split", label: t("settings.editor.split") },
                { value: "live", label: t("settings.editor.live") },
              ]}
            />
          </Field>

          <Toggle
            label={t("settings.lineNumbers")}
            checked={s.showLineNumbers}
            onChange={(showLineNumbers) => update({ showLineNumbers })}
          />
          <Toggle
            label={t("settings.vim")}
            hint={t("settings.vim.hint")}
            checked={s.vimMode}
            onChange={(vimMode) => update({ vimMode })}
          />
          <Toggle
            label={t("settings.spellcheck")}
            hint={t("settings.spellcheck.hint")}
            checked={s.spellcheck}
            onChange={(spellcheck) => update({ spellcheck })}
          />
        </Section>

        <Section title={t("settings.files")} desc={t("settings.files.desc")}>
          <Field
            label={t("settings.files.defaultView")}
            hint={t("settings.files.defaultView.hint")}
          >
            <Segmented<SidebarView>
              value={s.sidebarView}
              onChange={(sidebarView) => update({ sidebarView })}
              options={[
                { value: "list", label: t("settings.files.list") },
                { value: "tree", label: t("sidebar.view.tree") },
                { value: "columns", label: t("settings.files.columns") },
                { value: "icons", label: t("settings.files.icons") },
              ]}
            />
          </Field>
        </Section>

        <Section title={t("settings.packaging")} desc={t("settings.packaging.desc")}>
          <Toggle
            label={t("settings.autoPackage")}
            hint={t("settings.autoPackage.hint")}
            checked={s.autoPackageHtml}
            onChange={(autoPackageHtml) => update({ autoPackageHtml })}
          />
          <Field label={t("settings.velqOpenIn")} hint={t("settings.velqOpenIn.hint")}>
            <Segmented<VelqOpenIn>
              value={s.velqOpenIn}
              onChange={(velqOpenIn) => update({ velqOpenIn })}
              options={[
                { value: "tab", label: t("settings.velqOpenIn.tab") },
                { value: "window", label: t("settings.velqOpenIn.window") },
              ]}
            />
          </Field>
        </Section>

        <Section title={t("settings.agents")} desc={t("settings.agents.desc")}>
          <AgentSettings />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <div className="settings-section__head">
        <h2 className="settings-section__title">{title}</h2>
        {desc && <p className="settings-section__desc">{desc}</p>}
      </div>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="settings-field">
      <div className="settings-field__meta">
        <div className="settings-field__label">{label}</div>
        {hint && <div className="settings-field__hint">{hint}</div>}
      </div>
      <div className="settings-field__control">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cn("segmented__opt", value === o.value && "is-active")}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="settings-field">
      <div className="settings-field__meta">
        <div className="settings-field__label">{label}</div>
        {hint && <div className="settings-field__hint">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={cn("switch", checked && "switch--on")}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__knob" />
      </button>
    </div>
  );
}
