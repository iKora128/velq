import { describe, expect, it } from "vitest";
import type { Version } from "@/ipc/types";
import { groupIntoSessions } from "./sessions";

const MIN = 60;
// Newest-first, like `list_versions`. `t` is minutes-ago for readability.
function v(id: string, minutesAgo: number): Version {
  return { id, time: 1_000_000 - minutesAgo * MIN, label: null, summary: `${id} summary` };
}

describe("groupIntoSessions", () => {
  it("groups saves within the gap into one session", () => {
    const versions = [v("d", 1), v("c", 3), v("b", 6), v("a", 9)]; // all ≤3m apart
    const sessions = groupIntoSessions(versions, 20 * MIN);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].versions.map((x) => x.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("splits when the idle gap is exceeded", () => {
    // c→b straddles a 30-minute break with a 20-minute threshold.
    const versions = [v("d", 2), v("c", 5), v("b", 35), v("a", 38)];
    const sessions = groupIntoSessions(versions, 20 * MIN);
    expect(sessions.map((s) => s.versions.map((x) => x.id))).toEqual([
      ["d", "c"],
      ["b", "a"],
    ]);
  });

  it("keeps a lone save as its own single-version session", () => {
    expect(groupIntoSessions([v("a", 0)], 20 * MIN)).toEqual([{ versions: [v("a", 0)] }]);
  });

  it("is empty for no versions", () => {
    expect(groupIntoSessions([], 20 * MIN)).toEqual([]);
  });

  it("treats a gap exactly at the threshold as the same session", () => {
    const versions = [v("b", 0), v("a", 20)]; // exactly 20m apart
    expect(groupIntoSessions(versions, 20 * MIN)).toHaveLength(1);
  });
});
