import type { ReactNode } from "react";
import type { Density, EditorMode, ThemePref } from "@/ipc/types";
import { useSettings } from "@/store/settings";
import { cn } from "@/util/cn";
import "./settings-view.css";

const THEMES: { value: ThemePref; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** The full-page settings view (activity bar → gear). Everything writes straight
 * through to the persisted settings store. */
export function SettingsView() {
  const s = useSettings();
  const { update } = s;

  return (
    <div className="settings-view">
      <div className="settings-view__inner">
        <h1 className="settings-view__title">Settings</h1>

        <Section title="Appearance" desc="How Velq looks while you write.">
          <Field label="Theme">
            <div className="theme-cards">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={cn("theme-card", s.theme === t.value && "is-active")}
                  aria-pressed={s.theme === t.value}
                  onClick={() => update({ theme: t.value })}
                >
                  <span className={`theme-card__swatch theme-card__swatch--${t.value}`} />
                  <span className="theme-card__label">{t.label}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Density" hint="Row spacing in the file lists and tree.">
            <Segmented<Density>
              value={s.density}
              onChange={(density) => update({ density })}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ]}
            />
          </Field>

          <Toggle
            label="Reading font"
            hint="Use a serif typeface for prose."
            checked={s.proseFont}
            onChange={(proseFont) => update({ proseFont })}
          />
        </Section>

        <Section title="Editor" desc="Defaults for the writing surface.">
          <Field label="Default view">
            <Segmented<EditorMode>
              value={s.editorMode}
              onChange={(editorMode) => update({ editorMode })}
              options={[
                { value: "source", label: "Source" },
                { value: "split", label: "Split" },
                { value: "live", label: "Live" },
              ]}
            />
          </Field>

          <Toggle
            label="Line numbers"
            checked={s.showLineNumbers}
            onChange={(showLineNumbers) => update({ showLineNumbers })}
          />
          <Toggle
            label="Vim mode"
            hint="Modal editing with a vim keymap."
            checked={s.vimMode}
            onChange={(vimMode) => update({ vimMode })}
          />
        </Section>

        <Section title="Packaging" desc="How HTML becomes a portable .velq.">
          <Toggle
            label="Auto-package HTML on open"
            hint="Opening an HTML file traces its dependencies and saves a .velq into Documents/Velq, instead of editing it."
            checked={s.autoPackageHtml}
            onChange={(autoPackageHtml) => update({ autoPackageHtml })}
          />
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
