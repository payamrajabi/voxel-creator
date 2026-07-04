"use client";

import { useRef, useState } from "react";
import type { RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Grid, Instance, Instances, OrbitControls } from "@react-three/drei";
import Link from "next/link";

/**
 * Phase 0 spike — proves the hardest 3D interaction ahead of Phase 5:
 *   • raycast an instanced mesh, read the tapped voxel + face normal
 *   • add an adjacent cube on that face (or on the ground plane)
 *   • distinguish a *tap* (act) from a *drag* (orbit the camera)
 *
 * Throwaway UI. The real store, history, and gesture layer come in Phases 1–2.
 */

type Voxel = { x: number; y: number; z: number; c: string };
type Pt = { x: number; y: number };

const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;
const PALETTE = ["#ed6120", "#f1aa0c", "#6cbe13", "#2b89c6", "#e44892", "#f1f1f1"];

const INITIAL: Voxel[] = [
  { x: 0, y: 0, z: 0, c: "#ed6120" },
  { x: 1, y: 0, z: 0, c: "#ed6120" },
  { x: 0, y: 1, z: 0, c: "#f1aa0c" },
];

// A pointer is a "tap" only if it barely moved between down and up; anything
// more is treated as an orbit drag and performs no edit.
const TAP_SLOP = 6;

function movedBeyondSlop(down: Pt | null, e: ThreeEvent<PointerEvent>) {
  if (!down) return true;
  const dx = e.nativeEvent.clientX - down.x;
  const dy = e.nativeEvent.clientY - down.y;
  return Math.hypot(dx, dy) > TAP_SLOP;
}

function quantizeNormal(e: ThreeEvent<PointerEvent>): [number, number, number] {
  const n = e.face?.normal ?? { x: 0, y: 1, z: 0 };
  // Instances are un-rotated axis-aligned unit cubes, so the object-space face
  // normal already points along a world axis — snap to the dominant one.
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (ax >= ay && ax >= az) return [Math.sign(n.x), 0, 0];
  if (ay >= az) return [0, Math.sign(n.y), 0];
  return [0, 0, Math.sign(n.z)];
}

function VoxelField({
  voxels,
  mode,
  downRef,
  onAdd,
  onErase,
  onEyedrop,
}: {
  voxels: Voxel[];
  mode: "add" | "erase";
  downRef: RefObject<Pt | null>;
  onAdd: (v: Voxel, normal: [number, number, number]) => void;
  onErase: (v: Voxel) => void;
  onEyedrop: (v: Voxel) => void;
}) {
  return (
    <Instances limit={4096} range={voxels.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.6} metalness={0.05} />
      {voxels.map((v) => (
        <Instance
          key={keyOf(v.x, v.y, v.z)}
          position={[v.x, v.y, v.z]}
          color={v.c}
          onPointerUp={(e) => {
            e.stopPropagation();
            if (movedBeyondSlop(downRef.current, e)) return; // was an orbit
            if (e.nativeEvent.button === 2 || mode === "erase") onErase(v);
            else if (e.nativeEvent.altKey) onEyedrop(v);
            else onAdd(v, quantizeNormal(e));
          }}
          onContextMenu={(e) => {
            e.stopPropagation();
            onErase(v);
          }}
        />
      ))}
    </Instances>
  );
}

function GroundPlane({
  downRef,
  onAddCell,
}: {
  downRef: RefObject<Pt | null>;
  onAddCell: (x: number, z: number) => void;
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (movedBeyondSlop(downRef.current, e)) return;
        onAddCell(Math.round(e.point.x), Math.round(e.point.z));
      }}
    >
      <planeGeometry args={[64, 64]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function SpikePage() {
  const [voxels, setVoxels] = useState<Voxel[]>(INITIAL);
  const [mode, setMode] = useState<"add" | "erase">("add");
  const [color, setColor] = useState(PALETTE[0]);
  const [last, setLast] = useState("tap a face to add · drag to orbit");
  const downRef = useRef<Pt | null>(null);

  const addAt = (x: number, y: number, z: number, c: string) =>
    setVoxels((prev) =>
      prev.some((v) => v.x === x && v.y === y && v.z === z)
        ? prev
        : [...prev, { x, y, z, c }],
    );

  const handleAdd = (v: Voxel, [nx, ny, nz]: [number, number, number]) => {
    const x = v.x + nx;
    const y = v.y + ny;
    const z = v.z + nz;
    if (y < 0) {
      setLast("blocked: below ground");
      return;
    }
    addAt(x, y, z, color);
    setLast(`+ cube ${x},${y},${z}  (face ${nx},${ny},${nz})`);
  };

  const handleErase = (v: Voxel) => {
    setVoxels((prev) =>
      prev.filter((p) => !(p.x === v.x && p.y === v.y && p.z === v.z)),
    );
    setLast(`− cube ${v.x},${v.y},${v.z}`);
  };

  const handleEyedrop = (v: Voxel) => {
    setColor(v.c);
    setLast(`eyedropper → ${v.c}`);
  };

  return (
    <main className="relative h-full w-full">
      <div
        className="h-full w-full touch-none"
        onPointerDownCapture={(e) => {
          downRef.current = { x: e.clientX, y: e.clientY };
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [8, 7, 10], fov: 45, near: 0.1, far: 1000 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={["#2e2f32"]} />
          <hemisphereLight args={["#ffffff", "#3a3f45", 1.0]} />
          <directionalLight position={[6, 12, 8]} intensity={1.4} />
          <ambientLight intensity={0.35} />

          <VoxelField
            voxels={voxels}
            mode={mode}
            downRef={downRef}
            onAdd={handleAdd}
            onErase={handleErase}
            onEyedrop={handleEyedrop}
          />
          <GroundPlane
            downRef={downRef}
            onAddCell={(x, z) => {
              addAt(x, 0, z, color);
              setLast(`+ ground cube ${x},0,${z}`);
            }}
          />

          <Grid
            cellSize={1}
            cellThickness={0.6}
            cellColor="#3f444b"
            sectionSize={8}
            sectionThickness={1}
            sectionColor="#565c64"
            position={[0, -0.5, 0]}
            infiniteGrid
            fadeDistance={60}
            fadeStrength={1.5}
          />
          <OrbitControls
            makeDefault
            enablePan
            enableDamping
            dampingFactor={0.1}
            minDistance={3}
            maxDistance={80}
            target={[0, 1, 0]}
          />
        </Canvas>
      </div>

      {/* status */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="pointer-events-auto rounded-lg bg-black/40 px-3 py-2 text-xs backdrop-blur">
          <div className="font-semibold text-zinc-100">Face-pick spike</div>
          <div className="text-zinc-400">
            {voxels.length} voxels · {last}
          </div>
          <Link href="/" className="mt-1 inline-block text-zinc-300 underline">
            ← home
          </Link>
        </div>
      </div>

      {/* palette + mode */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="pointer-events-auto flex gap-1 rounded-full bg-black/40 p-1 backdrop-blur">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full border-2 ${
                color === c ? "border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
        <div className="pointer-events-auto flex gap-1 rounded-full bg-black/40 p-1 text-xs backdrop-blur">
          {(["add", "erase"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 capitalize ${
                mode === m ? "bg-white text-black" : "text-zinc-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
