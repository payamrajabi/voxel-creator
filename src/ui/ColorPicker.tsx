"use client";

import { PALETTE } from "../core/palette";
import { useEditorStore } from "../store/editorStore";

/** The full 24-color picker (3 rows of 8). Tapping a swatch selects and closes. */
export default function ColorPicker({ onClose }: { onClose: () => void }) {
  const color = useEditorStore((s) => s.color);
  const setColor = useEditorStore((s) => s.setColor);

  return (
    <div className="absolute inset-0 z-30" onPointerDown={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-zinc-900/95 p-4 shadow-2xl backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mx-auto grid max-w-md grid-cols-8 gap-2">
          {PALETTE.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setColor(p.id);
                onClose();
              }}
              className={`aspect-square rounded-lg border-2 transition-transform active:scale-95 ${
                color === p.id ? "border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: p.hex }}
              aria-label={p.name}
              title={p.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
