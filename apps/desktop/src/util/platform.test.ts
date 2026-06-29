import { describe, expect, it } from "vitest";
import { fmtShortcut, isMac } from "./platform";

describe("fmtShortcut", () => {
  it("renders Mod/Shift/Alt for the current platform", () => {
    const s = fmtShortcut("Mod+Shift+P");
    if (isMac) {
      expect(s).toBe("⌘⇧P");
    } else {
      expect(s).toBe("Ctrl+Shift+P");
    }
  });

  it("handles a bare Mod", () => {
    expect(fmtShortcut("Mod+K")).toBe(isMac ? "⌘K" : "Ctrl+K");
  });
});
