import { describe, expect, it } from "vitest";
import {
  buildPreviewDoc,
  htmlDocument,
  PREVIEW_TEMPLATE_IDS,
  type PreviewTemplate,
} from "./previewStyles";

const BODY = `<h1>Title</h1><p><strong>bold</strong></p>`;

describe("buildPreviewDoc templates", () => {
  it("embeds the body and prose container for every template, light and dark", () => {
    for (const template of PREVIEW_TEMPLATE_IDS) {
      for (const dark of [false, true]) {
        const doc = buildPreviewDoc(BODY, { dark, template });
        expect(doc).toContain(`<div class="velq-prose">${BODY}</div>`);
        expect(doc).toContain(`color-scheme: ${dark ? "dark" : "light"}`);
        expect(doc).toContain(`content="${dark ? "dark" : "light"}"`);
      }
    }
  });

  it("each template produces a distinct stylesheet", () => {
    const docs = PREVIEW_TEMPLATE_IDS.map((template) =>
      buildPreviewDoc(BODY, { dark: false, template }),
    );
    expect(new Set(docs).size).toBe(PREVIEW_TEMPLATE_IDS.length);
  });

  it("defaults to paper, and falls back to paper for an unknown persisted value", () => {
    const paper = buildPreviewDoc(BODY, { dark: false, template: "paper" });
    expect(buildPreviewDoc(BODY, { dark: false })).toBe(paper);
    expect(buildPreviewDoc(BODY, { dark: false, template: "vaporwave" as PreviewTemplate })).toBe(
      paper,
    );
  });
});

describe("htmlDocument", () => {
  it("wraps fragments and passes full documents through", () => {
    expect(htmlDocument("<p>hi</p>")).toContain("<body><p>hi</p></body>");
    const full = `<html><head></head><body>x</body></html>`;
    expect(htmlDocument(full)).toBe(full);
  });
});
