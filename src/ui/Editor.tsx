"use client";

import { useState } from "react";
import CanvasHost from "../editor3d/CanvasHost";
import ColorPicker from "./ColorPicker";
import Hotbar from "./Hotbar";
import TopBar from "./TopBar";

/**
 * The editor shell. The 3D scene is the one and only view over the voxel store —
 * the data (and thus your work) lives in the store. Paint adds a cube, Erase
 * removes one, all in the active color.
 */
export default function Editor() {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <main className="relative h-full w-full overflow-hidden">
      <CanvasHost />
      <TopBar />
      <Hotbar onOpenPicker={() => setPickerOpen(true)} />
      {pickerOpen && <ColorPicker onClose={() => setPickerOpen(false)} />}
    </main>
  );
}
