import claudeSvg from "@/assets/agent-icons/brand-claude.svg?raw";
import copilotSvg from "@/assets/agent-icons/brand-copilot.svg?raw";
import kimiSvg from "@/assets/agent-icons/brand-kimi.svg?raw";
import opencodeSvg from "@/assets/agent-icons/brand-opencode.svg?raw";
import qwenSvg from "@/assets/agent-icons/brand-qwen.svg?raw";
import "./agent.css";

/**
 * Per-agent brand mark, mirroring shirushi. Five are Simple Icons SVGs (CC0, see
 * assets/agent-icons/LICENSE.md); Codex and Grok have no Simple Icons mark, so they
 * render as a brand-colored chip with a text monogram. SVGs use `currentColor`, so a
 * neutral-gray brand (Copilot/OpenCode/Kimi) inherits the theme text color and stays
 * legible in light and dark; the truly colored marks keep their brand hue.
 */
interface Brand {
  svg?: string;
  monogram: string;
  /** Brand hue for the SVG tint / chip fill; omitted → follow the theme text color. */
  color?: string;
}

const BRAND: Record<string, Brand> = {
  claude: { svg: claudeSvg, monogram: "C", color: "#d97757" },
  codex: { monogram: ">_", color: "#10a37f" },
  copilot: { svg: copilotSvg, monogram: "Co" },
  qwen: { svg: qwenSvg, monogram: "Q", color: "#6950ef" },
  opencode: { svg: opencodeSvg, monogram: "OC" },
  kimi: { svg: kimiSvg, monogram: "K" },
  grok: { monogram: "G", color: "#4b5563" },
};

export function AgentIcon({ id, size = 20 }: { id: string; size?: number }) {
  const b = BRAND[id] ?? { monogram: (id[0] ?? "?").toUpperCase() };
  if (b.svg) {
    return (
      <span
        className="agent-icon"
        style={{ width: size, height: size, color: b.color ?? "var(--text-secondary)" }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: bundled, trusted CC0 vendor marks.
        dangerouslySetInnerHTML={{ __html: b.svg }}
      />
    );
  }
  // No vendor mark (Codex, Grok): a brand-colored chip with a white monogram.
  return (
    <span
      className="agent-icon agent-icon--mono"
      style={{ width: size, height: size, background: b.color ?? "var(--text-muted)" }}
    >
      {b.monogram}
    </span>
  );
}
