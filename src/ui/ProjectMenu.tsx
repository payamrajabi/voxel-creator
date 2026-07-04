"use client";

import { useRef, useState } from "react";
import { useVoxelStore } from "../store/voxelStore";
import { isProjectData, projectFileName, saveProject } from "../store/persist";

/**
 * Bottom-sheet project menu (mirrors ColorPicker). Autosave already keeps work
 * on this device; this adds the two things autosave can't:
 *   • Export — download a `.voxel.json` copy (back it up, move to another phone).
 *   • Import — load a character file back in (also how a recovered file returns).
 */
export default function ProjectMenu({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = useVoxelStore.getState().toProjectData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = projectFileName(data.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(`Saved a copy of “${data.name}”.`);
  };

  const handleImport = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isProjectData(parsed)) {
        setStatus("That file isn’t a VoxelOS character.");
        return;
      }
      useVoxelStore.getState().loadProjectData(parsed);
      saveProject(parsed); // persist the imported character right away
      setStatus(`Loaded “${parsed.name}”.`);
      onClose();
    } catch {
      setStatus("Couldn’t read that file.");
    }
  };

  return (
    <div className="absolute inset-0 z-30" onPointerDown={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-zinc-900/95 p-4 shadow-2xl backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex max-w-md flex-col gap-2">
          <p className="px-1 pb-1 text-xs text-zinc-400">
            Your work saves automatically on this device. Export a copy to keep
            it safe or move it to another phone.
          </p>
          <button
            onClick={handleExport}
            className="rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-white/20 active:scale-[0.99]"
          >
            Export character&nbsp;<span className="text-zinc-400">— save a copy</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-white/20 active:scale-[0.99]"
          >
            Import character&nbsp;<span className="text-zinc-400">— open a file</span>
          </button>
          {status && <p className="px-1 pt-1 text-xs text-emerald-300">{status}</p>}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImport(f);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
    </div>
  );
}
