import { useEffect, useState } from "react";

/** The theme actually applied to the document (set by the settings store on <html>),
 * which is the real source of truth for what's on screen. */
function computeDark(): boolean {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches; // system
}

/** Resolved light/dark, tracking both the applied `data-theme` and the OS setting.
 * Used by the preview iframe, whose isolated styles can't read CSS variables. */
export function useResolvedDark(): boolean {
  const [dark, setDark] = useState(computeDark);

  useEffect(() => {
    const update = () => setDark(computeDark());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  return dark;
}
