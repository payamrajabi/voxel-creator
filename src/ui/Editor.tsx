"use client";

import { useState } from "react";
import Canvas2D from "../editor2d/Canvas2D";
import CanvasHost from "../editor3d/CanvasHost";
import { useEditorStore } from "../store/editorStore";
import ColorPicker from "./ColorPicker";
import Hotbar from "./Hotbar";
import LayerBar from "./LayerBar";
import TopBar from "./TopBar";

/**
 * The editor shell. 2D and 3D are two views over the same voxel store — the
 * mode toggle swaps which one is mounted; the data (and thus your work) lives in
 * the store, so switching never loses anything.
 */
export default function Editor() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const mode = useEditorStore((s) => s.mode);

  return (
    <main className="relative h-full w-full overflow-hidden">
      {mode === "2d" ? <Canvas2D /> : <CanvasHost />}
      <TopBar />
      {mode === "2d" && <LayerBar />}
      {/* The color + tool dock is shared: in 3D, Paint adds a cube, Erase
          removes one, Pick eyedrops — same tools, same active color as 2D. */}
      <Hotbar onOpenPicker={() => setPickerOpen(true)} />
      {pickerOpen && <ColorPicker onClose={() => setPickerOpen(false)} />}
    </main>
  );
}
