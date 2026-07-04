"use client";

import { useState } from "react";
import Canvas2D from "../editor2d/Canvas2D";
import ColorPicker from "./ColorPicker";
import Hotbar from "./Hotbar";
import LayerBar from "./LayerBar";
import ProjectMenu from "./ProjectMenu";
import TopBar from "./TopBar";

/**
 * The editor shell. For now it hosts the 2D depth-slice canvas; Phase 4 adds the
 * 3D view here behind the mode toggle, sharing the same voxel store.
 */
export default function Editor() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="relative h-full w-full overflow-hidden">
      <Canvas2D />
      <TopBar onOpenMenu={() => setMenuOpen(true)} />
      <LayerBar />
      <Hotbar onOpenPicker={() => setPickerOpen(true)} />
      {pickerOpen && <ColorPicker onClose={() => setPickerOpen(false)} />}
      {menuOpen && <ProjectMenu onClose={() => setMenuOpen(false)} />}
    </main>
  );
}
