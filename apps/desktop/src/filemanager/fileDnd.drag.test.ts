import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FileNode } from "@/ipc/types";
import { useFiles } from "@/store/files";
import { startPress } from "./useFileDnd";

const node = (path: string, kind: "file" | "dir" = "file"): FileNode =>
  ({ path, name: path.split("/").pop() ?? path, kind }) as FileNode;

const A = node("/v/a.md");

/** A row the hit-test can land on, exactly as `dropProps` renders it. */
function dropRow(dir: string): HTMLElement {
  const el = document.createElement("button");
  el.dataset.dropDir = dir;
  el.append(document.createElement("span")); // hit-test lands on a child, like a real row
  document.body.append(el);
  return el;
}

/** Aim the hit-test at `el` (jsdom has no layout, so elementFromPoint is a stub). */
function pointAt(el: HTMLElement | null) {
  document.elementFromPoint = () => el?.firstElementChild ?? el;
}

// jsdom has no PointerEvent; MouseEvent carries every field the handlers read
// (clientX/clientY/altKey/button) and dispatches under the same type name.
const move = (x: number, y: number, altKey = false) =>
  window.dispatchEvent(new MouseEvent("pointermove", { clientX: x, clientY: y, altKey }));
const up = (altKey = false) => window.dispatchEvent(new MouseEvent("pointerup", { altKey }));

let moveMany: ReturnType<typeof vi.fn>;
let copyMany: ReturnType<typeof vi.fn>;

beforeEach(() => {
  moveMany = vi.fn().mockResolvedValue(undefined);
  copyMany = vi.fn().mockResolvedValue(undefined);
  useFiles.setState({
    moveMany,
    copyMany,
    select: vi.fn(),
    selection: new Set<string>(),
  } as unknown as Partial<ReturnType<typeof useFiles.getState>>);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("dragging a file onto a folder", () => {
  it("moves it once the pointer has travelled past the click threshold", () => {
    pointAt(dropRow("/v/docs"));
    startPress(0, 0, A);

    move(40, 40);
    up();

    expect(moveMany).toHaveBeenCalledWith(["/v/a.md"], "/v/docs");
    expect(copyMany).not.toHaveBeenCalled();
  });

  /** A press that never travels is a click — selecting or opening, never a move. */
  it("does nothing for a press that never moves", () => {
    pointAt(dropRow("/v/docs"));
    startPress(0, 0, A);

    move(1, 1); // under the 4px threshold
    up();

    expect(moveMany).not.toHaveBeenCalled();
  });

  it("copies instead of moving when Alt is held at the drop", () => {
    pointAt(dropRow("/v/docs"));
    startPress(0, 0, A);

    move(40, 40, true);
    up(true);

    expect(copyMany).toHaveBeenCalledWith(["/v/a.md"], "/v/docs");
    expect(moveMany).not.toHaveBeenCalled();
  });

  it("drops nothing when released over open space", () => {
    dropRow("/v/docs");
    pointAt(null); // released over no row at all
    startPress(0, 0, A);

    move(40, 40);
    up();

    expect(moveMany).not.toHaveBeenCalled();
  });

  it("refuses a no-op drop back into the folder the file already lives in", () => {
    pointAt(dropRow("/v"));
    startPress(0, 0, A); // /v/a.md already lives in /v

    move(40, 40);
    up();

    expect(moveMany).not.toHaveBeenCalled();
  });

  it("Escape cancels the drag and releasing then does nothing", () => {
    pointAt(dropRow("/v/docs"));
    startPress(0, 0, A);
    move(40, 40);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    up();

    expect(moveMany).not.toHaveBeenCalled();
  });

  it("drags the whole selection when the grabbed item is part of it", () => {
    useFiles.setState({ selection: new Set(["/v/a.md", "/v/b.md"]) } as never);
    pointAt(dropRow("/v/docs"));
    startPress(0, 0, A);

    move(40, 40);
    up();

    expect(moveMany).toHaveBeenCalledWith(
      expect.arrayContaining(["/v/a.md", "/v/b.md"]),
      "/v/docs",
    );
  });

  it("cleans up the ghost and listeners after the drop", () => {
    pointAt(dropRow("/v/docs"));
    startPress(0, 0, A);
    move(40, 40);
    expect(document.querySelector(".drag-ghost")).not.toBeNull();

    up();

    expect(document.querySelector(".drag-ghost")).toBeNull();
    expect(document.body.classList.contains("is-dragging-files")).toBe(false);
    // A stray move after the drop must not resurrect anything.
    move(80, 80);
    expect(document.querySelector(".drag-ghost")).toBeNull();
  });

  it("leaves nothing behind when the pointer is cancelled mid-drag", () => {
    pointAt(dropRow("/v/docs"));
    startPress(0, 0, A);
    move(40, 40);

    window.dispatchEvent(new Event("pointercancel"));

    expect(document.querySelector(".drag-ghost")).toBeNull();
    expect(moveMany).not.toHaveBeenCalled();
  });
});
