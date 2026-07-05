"use client";

import { useState } from "react";
import CanvasHost from "../editor3d/CanvasHost";
import { useAppStore } from "../store/appStore";
import ColorPicker from "./ColorPicker";
import Hotbar from "./Hotbar";
import TopBar from "./TopBar";

/**
 * The editor shell. The 3D scene is the one and only view over the voxel store —
 * the data (and thus your work) lives in the store. When you open one of your
 * own characters it's fully editable; when you open someone else's from "All
 * Characters" the scene is read-only, so the tool dock is hidden and you just
 * orbit to look.
 */
export default function Editor() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const readOnly = useAppStore((s) => s.readOnly);

  return (
    <main className="relative h-full w-full overflow-hidden">
      <CanvasHost />
      <TopBar />
      {!readOnly && (
        <>
          {/* Color + tool dock: Paint adds a cube, Erase removes one, Pick
              eyedrops — same active color throughout. */}
          <Hotbar onOpenPicker={() => setPickerOpen(true)} />
          {pickerOpen && <ColorPicker onClose={() => setPickerOpen(false)} />}
        </>
      )}
    </main>
  );
}
