import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./editorStore";

const s = () => useEditorStore.getState();

beforeEach(() => {
  s().setLayerCount(1);
  s().setLayer(0);
});

describe("editorStore layers", () => {
  it("setLayer clamps to [0,63] and grows layerCount", () => {
    s().setLayer(5);
    expect(s().layer).toBe(5);
    expect(s().layerCount).toBe(6);
    s().setLayer(100);
    expect(s().layer).toBe(63);
    s().setLayer(-3);
    expect(s().layer).toBe(0);
  });

  it("nextLayer extends depth; prevLayer stops at 0", () => {
    s().nextLayer();
    expect(s().layer).toBe(1);
    expect(s().layerCount).toBe(2);
    s().prevLayer();
    s().prevLayer();
    expect(s().layer).toBe(0);
  });

  it("toggleOnionSkin flips the flag", () => {
    const before = s().onionSkin;
    s().toggleOnionSkin();
    expect(s().onionSkin).toBe(!before);
    s().toggleOnionSkin();
    expect(s().onionSkin).toBe(before);
  });
});
