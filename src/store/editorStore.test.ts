import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./editorStore";

const s = () => useEditorStore.getState();

beforeEach(() => {
  s().setTool("paint");
  s().setColor(11);
});

describe("editorStore", () => {
  it("setTool switches the active tool", () => {
    s().setTool("erase");
    expect(s().tool).toBe("erase");
    s().setTool("eyedropper");
    expect(s().tool).toBe("eyedropper");
  });

  it("setColor sets the active color", () => {
    s().setColor(3);
    expect(s().color).toBe(3);
  });
});
