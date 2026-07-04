"use client";

import { colorHex } from "../core/palette";
import { useEditorStore, type Tool } from "../store/editorStore";

const TOOLS: { id: Tool; label: string }[] = [
  { id: "paint", label: "Paint" },
  { id: "erase", label: "Erase" },
  { id: "eyedropper", label: "Pick" },
];

/** Bottom dock: active-color swatch (opens the picker) + tool buttons. */
export default function Hotbar({ onOpenPicker }: { onOpenPicker: () => void }) {
  const color = useEditorStore((s) => s.color);
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-zinc-900/80 p-2 shadow-xl backdrop-blur">
        <button
          onClick={onOpenPicker}
          className="h-11 w-11 rounded-xl border-2 border-white/70 transition-transform active:scale-95"
          style={{ backgroundColor: colorHex(color) }}
          aria-label="Choose color"
        />
        <div className="mx-1 h-8 w-px bg-white/15" />
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`h-11 rounded-xl px-3 text-sm font-medium transition-colors ${
              tool === t.id
                ? "bg-white text-black"
                : "bg-white/10 text-zinc-200 hover:bg-white/20"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
