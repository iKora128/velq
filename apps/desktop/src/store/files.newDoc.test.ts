import { beforeEach, describe, expect, it } from "vitest";
import { useFiles } from "./files";

/** A new document is a PLAIN file whose format the user picks — never a `.velq`
 * (packaging stays an explicit share step). Exercised against the in-memory mock. */
describe("new document = plain .md / .html, not .velq", () => {
  beforeEach(() => {
    useFiles.setState({ rootPath: "/Users/you/Notes", selected: null });
  });

  it("Markdown creates a plain .md", async () => {
    await useFiles.getState().newFile("/Users/you/Notes", "md");
    const created = useFiles.getState().selected;
    expect(created?.name).toMatch(/\.md$/);
    expect(created?.name).not.toMatch(/\.velq$/);
  });

  it("HTML creates a plain .html", async () => {
    await useFiles.getState().newFile("/Users/you/Notes", "html");
    const created = useFiles.getState().selected;
    expect(created?.name).toMatch(/\.html$/);
    expect(created?.name).not.toMatch(/\.velq$/);
  });
});
