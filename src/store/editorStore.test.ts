import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./editorStore";
import { HALF_EXTENT } from "../core/coords";

const s = () => useEditorStore.getState();

beforeEach(() => {
  s().setLayer(0);
});

describe("editorStore layers", () => {
  it("setLayer clamps to the centered [-HALF, HALF] range", () => {
    s().setLayer(5);
    expect(s().layer).toBe(5);
    s().setLayer(HALF_EXTENT + 100);
    expect(s().layer).toBe(HALF_EXTENT);
    s().setLayer(-HALF_EXTENT - 100);
    expect(s().layer).toBe(-HALF_EXTENT);
  });

  it("nextLayer / prevLayer step through depth and can go negative", () => {
    s().setLayer(0);
    s().nextLayer();
    expect(s().layer).toBe(1);
    s().prevLayer();
    s().prevLayer();
    expect(s().layer).toBe(-1);
  });

  it("toggleOnionSkin flips the flag", () => {
    const before = s().onionSkin;
    s().toggleOnionSkin();
    expect(s().onionSkin).toBe(!before);
    s().toggleOnionSkin();
    expect(s().onionSkin).toBe(before);
  });
});
