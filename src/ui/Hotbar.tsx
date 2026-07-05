"use client";

import { Eraser, PaintBrush } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { colorHex } from "../core/palette";
import { useEditorStore, type Tool } from "../store/editorStore";

/** Frosted, iOS-style circular button, matching the top chrome. */
const circle =
  "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full " +
  "border border-white/10 bg-zinc-900/60 text-white shadow-lg backdrop-blur-xl " +
  "transition active:scale-90";

const TOOLS: { id: Tool; label: string; Icon: Icon }[] = [
  { id: "paint", label: "Paint", Icon: PaintBrush },
  { id: "erase", label: "Erase", Icon: Eraser },
];

/** Bottom corners: color swatch (left, opens the picker) + paint/erase (right). */
export default function Hotbar({ onOpenPicker }: { onOpenPicker: () => void }) {
  const color = useEditorStore((s) => s.color);
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <button
        onClick={onOpenPicker}
        className="pointer-events-auto h-11 w-11 rounded-full border-2 border-white/70 shadow-lg transition active:scale-90"
        style={{ backgroundColor: colorHex(color) }}
        aria-label="Choose color"
      />

      <div className="flex items-center gap-2">
        {TOOLS.map(({ id, label, Icon }) => {
          const active = tool === id;
          return (
            <button
              key={id}
              onClick={() => setTool(id)}
              className={
                active
                  ? "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg transition active:scale-90"
                  : circle
              }
              aria-label={label}
              aria-pressed={active}
            >
              <Icon size={22} weight="bold" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
