"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import type { Voxel } from "../core/types";
import { colorHex } from "../core/palette";
import { voxelWorldPos } from "./worldPos";
import { FOV, frameFor, orbitPos, type Frame } from "./previewFraming";

/**
 * An auto-orbiting 3D preview of a character for the gallery: an "aerial drone"
 * camera framed to the whole build, tilted ~30° down, circling once every
 * ~8 seconds. Unlike the editor's Scene3D there are no controls or grid — it's a
 * self-contained, non-interactive loop meant to sit inside a card whose aspect
 * ratio is chosen (by GalleryCard) to match the build.
 *
 * Kept deliberately cheap (no shadows) because several of these can be on screen
 * at once; the gallery only mounts one while its card is actually visible.
 */

const SECONDS_PER_REV = 8;
const SPEED = (Math.PI * 2) / SECONDS_PER_REV; // rad/s

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
