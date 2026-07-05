"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import type { Voxel } from "../core/types";
import { computeBounds } from "../core/coords";
import { colorHex } from "../core/palette";
import { voxelWorldPos } from "./worldPos";

/**
 * An auto-orbiting 3D preview of a character for the gallery: an "aerial drone"
 * camera framed to the whole build, tilted ~30° down, circling once every
 * ~4 seconds. Unlike the editor's Scene3D there are no controls or grid — it's a
 * self-contained, non-interactive loop meant to sit inside a small card.
 *
 * Kept deliberately cheap (small render area, no shadows) because several of
 * these can be on screen at once; the gallery only mounts one while its card is
 * actually visible.
 */

const FOV = 40;
const ELEVATION = Math.PI / 6; // 30° drone tilt, looking down at the build
const MARGIN = 1.35; // >1 backs the camera off so the build sits "slightly zoomed out"
const SECONDS_PER_REV = 4;
const SPEED = (Math.PI * 2) / SECONDS_PER_REV; // rad/s

type Frame = {
  /** World-space point the camera looks at (center of the build). */
  center: [number, number, number];
  /** Straight-line camera distance from that center. */
  dist: number;
};

/** Center + framing distance so the whole build fits, from its voxel bounds. */
function frameFor(voxels: Voxel[]): Frame {
  const b = computeBounds(voxels);
  if (!b) return { center: [0.5, 0.5, -0.5], dist: 6 };
  // Match the editor's grid→world mapping (Z is negated; cubes are unit-centered).
  const cx = (b.min[0] + b.max[0]) / 2 + 0.5;
  const cy = (b.min[1] + b.max[1]) / 2 + 0.5;
  const cz = -((b.min[2] + b.max[2]) / 2 + 0.5);
  const w = b.max[0] - b.min[0] + 1;
  const h = b.max[1] - b.min[1] + 1;
  const depth = b.max[2] - b.min[2] + 1;
  // Distance at which the build's bounding sphere fills the vertical FOV, backed
  // off by MARGIN. Card is square, so the vertical fit covers both axes.
  const radius = 0.5 * Math.hypot(w, h, depth);
  const dist = Math.max(4, (radius / Math.sin((FOV * Math.PI) / 180 / 2)) * MARGIN);
  return { center: [cx, cy, cz], dist };
}

/** Camera position on the orbit at a given angle, for a frame + tilt. */
function orbitPos(frame: Frame, angle: number): [number, number, number] {
  const [cx, cy, cz] = frame.center;
  const horiz = frame.dist * Math.cos(ELEVATION);
  const height = frame.dist * Math.sin(ELEVATION);
  return [cx + horiz * Math.cos(angle), cy + height, cz + horiz * Math.sin(angle)];
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduce;
}

/** Drives the default camera around the orbit each frame. */
function OrbitRig({
  frame,
  phase,
  speed,
  onReady,
}: {
  frame: Frame;
  phase: number;
  speed: number;
  onReady?: () => void;
}) {
  const angle = useRef(phase);
  const started = useRef(false);
  useFrame((state, delta) => {
    angle.current += delta * speed;
    state.camera.position.set(...orbitPos(frame, angle.current));
    state.camera.lookAt(...frame.center);
    if (!started.current) {
      started.current = true;
      onReady?.();
    }
  });
  return null;
}

export default function CharacterPreview({
  voxels,
  /** Stable per-character phase offset so cards don't all spin in lockstep. */
  phase = 0,
  onReady,
}: {
  voxels: Voxel[];
  phase?: number;
  onReady?: () => void;
}) {
  const reduceMotion = usePrefersReducedMotion();

  const frame = useMemo(() => frameFor(voxels), [voxels]);
  const instances = useMemo(
    () =>
      voxels.map((v) => ({
        key: `${v.x},${v.y},${v.z}`,
        pos: voxelWorldPos(v.x, v.y, v.z),
        color: colorHex(v.c),
      })),
    [voxels],
  );

  if (instances.length === 0) return null;

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: orbitPos(frame, phase), fov: FOV, near: 0.1, far: 2000 }}
      gl={{ antialias: true }}
      resize={{ debounce: 0, scroll: false }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={["#2e2f32"]} />
      <hemisphereLight args={["#ffffff", "#3a3f45", 1.0]} />
      <directionalLight position={[10, 18, 12]} intensity={1.4} />
      <ambientLight intensity={0.35} />

      <Instances limit={instances.length} range={instances.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.65} metalness={0.05} />
        {instances.map((v) => (
          <Instance key={v.key} position={v.pos} color={v.color} />
        ))}
      </Instances>

      <OrbitRig
        frame={frame}
        phase={phase}
        speed={reduceMotion ? 0 : SPEED}
        onReady={onReady}
      />
    </Canvas>
  );
}
