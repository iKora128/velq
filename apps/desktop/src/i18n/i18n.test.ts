import { describe, expect, it } from "vitest";
import { en } from "./en";
import { resolveLocale, translate } from "./index";
import { ja } from "./ja";

/** The `{placeholder}` tokens in a message. */
const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n catalogs", () => {
  it("ja mirrors en's keys exactly", () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
  });

  it("has no empty values", () => {
    for (const [k, v] of Object.entries({ ...en, ...ja })) expect(v, k).not.toBe("");
  });

  it("keeps interpolation placeholders consistent across locales", () => {
    // A dropped/renamed {param} in a translation is a real bug — catch it here.
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(ph(ja[key]), key).toEqual(ph(en[key]));
    }
  });
});

describe("translate", () => {
  it("interpolates params in each locale", () => {
    expect(translate("en", "tab.close", { name: "Notes.md" })).toBe("Close Notes.md");
    expect(translate("ja", "tab.close", { name: "メモ.md" })).toBe("メモ.md を閉じる");
  });
});

describe("resolveLocale", () => {
  it("passes explicit locales through", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("ja")).toBe("ja");
  });
  it("resolves system to a concrete locale", () => {
    expect(["en", "ja"]).toContain(resolveLocale("system"));
  });
});
