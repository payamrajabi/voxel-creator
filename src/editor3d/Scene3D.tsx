"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, Instance, Instances, OrbitControls } from "@react-three/drei";
import { useVoxelStore } from "../store/voxelStore";
import { colorHex } from "../core/palette";
import { fromKey } from "../core/voxelKey";
import type { Bounds } from "../core/types";

const INSTANCE_LIMIT = 32768;

/**
 * Grid → world mapping for rendering. A voxel (x,y,z) becomes a unit cube
 * centered at (x+0.5, y+0.5, -(z+0.5)): feet (y=0) sit on the ground plane at
 * Y=0, and the front slice (z=0) is nearest the default camera with +X to the
 * right — so the 3D front view matches how you drew it in 2D.
 */
function voxelWorldPos(x: number, y: number, z: number): [number, number, number] {
  return [x + 0.5, y + 0.5, -(z + 0.5)];
}

/** A pleasant 3/4 front framing computed from the character's bounds. */
function framing(bounds: Bounds | null): {
  position: [number, number, number];
  target: [number, number, number];
} {
  if (!bounds) {
    return { position: [46, 20, 24], target: [32.5, 4, -2] };
  }
  const cx = (bounds.min[0] + bounds.max[0]) / 2 + 0.5;
  const cy = (bounds.min[1] + bounds.max[1]) / 2 + 0.5;
  const cz = -((bounds.min[2] + bounds.max[2]) / 2 + 0.5);
  const w = bounds.max[0] - bounds.min[0] + 1;
  const h = bounds.max[1] - bounds.min[1] + 1;
  const depth = bounds.max[2] - bounds.min[2] + 1;
  const d = Math.max(6, Math.hypot(w, h, depth) * 1.6);
  return {
    position: [cx + d * 0.55, cy + d * 0.5, cz + d],
    target: [cx, cy, cz],
  };
}

export default function Scene3D() {
  // The scene remounts on each 2D→3D switch, so frame from the current content.
  const frame = useMemo(() => framing(useVoxelStore.getState().bounds()), []);

  const revision = useVoxelStore((s) => s.revision);
  const voxels = useMemo(() => {
    const arr: { key: string; pos: [number, number, number]; color: string }[] =
      [];
    for (const [key, c] of useVoxelStore.getState().voxels) {
      const [x, y, z] = fromKey(key);
      arr.push({ key, pos: voxelWorldPos(x, y, z), color: colorHex(c) });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: frame.position, fov: 45, near: 0.1, far: 2000 }}
      gl={{ antialias: true }}
      resize={{ debounce: 0, scroll: false }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={["#2e2f32"]} />
      <hemisphereLight args={["#ffffff", "#3a3f45", 1.0]} />
      <directionalLight position={[10, 18, 12]} intensity={1.4} />
      <ambientLight intensity={0.35} />

      {voxels.length > 0 && (
        <Instances limit={INSTANCE_LIMIT} range={voxels.length}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.65} metalness={0.05} />
          {voxels.map((v) => (
            <Instance key={v.key} position={v.pos} color={v.color} />
          ))}
        </Instances>
      )}

      <Grid
        cellSize={1}
        cellThickness={0.6}
        cellColor="#3f444b"
        sectionSize={8}
        sectionThickness={1}
        sectionColor="#565c64"
        position={[0, 0, 0]}
        infiniteGrid
        fadeDistance={80}
        fadeStrength={1.5}
      />

      <OrbitControls
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={200}
        target={frame.target}
      />
    </Canvas>
  );
}
