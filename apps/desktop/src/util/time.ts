/** Relative time for recent versions ("2m ago"), absolute date for older. */
export function relativeTime(epochSec: number): string {
  const delta = Date.now() / 1000 - epochSec;
  if (delta < 45) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86_400) return `${Math.floor(delta / 3600)}h ago`;
  return new Date(epochSec * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Group label: Today / Yesterday / "Mon D". */
export function dayGroup(epochSec: number): string {
  const date = new Date(epochSec * 1000);
  const startOf = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  const today = startOf(new Date());
  const day = startOf(date);
  if (day === today) return "Today";
  if (day === today - 86_400_000) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function clockTime(epochSec: number): string {
  return new Date(epochSec * 1000).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
