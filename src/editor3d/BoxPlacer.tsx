"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useVoxelStore } from "../store/voxelStore";
import { useEditorStore } from "../store/editorStore";
import { useAppStore } from "../store/appStore";
import { colorHex } from "../core/palette";
import { DEFAULT_GRID_SIZE } from "../core/coords";
import { groundCell } from "./facePick";
import { voxelWorldPos } from "./worldPos";

const LONG_PRESS_MS = 300;
const MOVE_SLOP = 8;

type Ghost = { x: number; y: number; z: number; color: string };

/** Where a cube dropped down column (x,z) would rest: on top of the highest
 * block there, or on the floor (y=0) if the column is empty. */
function topOfColumn(x: number, z: number): number {
  const has = useVoxelStore.getState().has;
  for (let y = DEFAULT_GRID_SIZE.y - 1; y >= 0; y--) {
    if (has(x, y, z)) return y + 1;
  }
  return 0;
}

/**
 * Long-press → drag → drop placement. Holding still on the 3D canvas summons a
 * translucent "glass" cube; dragging slides it across the ground plane and lets
 * it climb onto existing blocks; releasing drops a real cube there. OrbitControls
 * is disabled while positioning so the finger moves the box, not the camera.
 *
 * Pointer input is handled natively on the canvas (not via r3f object events) so
 * a hold works anywhere, even over empty space. `inBoxGesture` tells Scene3D's
 * tap-to-add handlers to stand down for the release this gesture owns.
 */
export default function BoxPlacer({
  inBoxGesture,
}: {
  inBoxGesture: RefObject<boolean>;
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as {
    enabled: boolean;
  } | null;

  const [ghost, setGhost] = useState<Ghost | null>(null);
  const ghostRef = useRef<Ghost | null>(null);
  const modeRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeId = useRef<number | null>(null);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );

  useEffect(() => {
    const el = gl.domElement;

    const cellUnder = (clientX: number, clientY: number): Ghost | null => {
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null; // aimed at sky
      // Clamp the ground hit into the grid: near the screen edges the finger
      // points past the buildable footprint, and snapping to the nearest column
      // beats having the box vanish.
      const [rawX, rawZ] = groundCell(hit.x, hit.z);
      const gx = Math.min(DEFAULT_GRID_SIZE.x - 1, Math.max(0, rawX));
      const gz = Math.min(DEFAULT_GRID_SIZE.z - 1, Math.max(0, rawZ));
      const gy = topOfColumn(gx, gz);
      if (gy >= DEFAULT_GRID_SIZE.y) return null; // column already full to the top
      const color = ghostRef.current?.color ?? colorHex(useEditorStore.getState().color);
      return { x: gx, y: gy, z: gz, color };
    };

    const setControls = (enabled: boolean) => {
      if (controls) controls.enabled = enabled;
    };
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    const exitMode = () => {
      modeRef.current = false;
      ghostRef.current = null;
      setGhost(null);
      setControls(true);
    };

    const onDown = (e: PointerEvent) => {
      // Viewing another maker's character — orbit only, no placement gesture.
      if (useAppStore.getState().readOnly) return;
      // A second finger means a pinch — hand it to OrbitControls, drop the box.
      if (activeId.current !== null) {
        clearTimer();
        if (modeRef.current) exitMode();
        inBoxGesture.current = false;
        return;
      }
      activeId.current = e.pointerId;
      inBoxGesture.current = false;
      modeRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      timerRef.current = setTimeout(() => {
        modeRef.current = true;
        inBoxGesture.current = true;
        setControls(false);
        const cell = cellUnder(e.clientX, e.clientY);
        ghostRef.current = cell;
        setGhost(cell);
      }, LONG_PRESS_MS);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== activeId.current) return;
      if (modeRef.current) {
        const cell = cellUnder(e.clientX, e.clientY);
        if (cell) {
          ghostRef.current = cell;
          setGhost(cell);
        }
        return;
      }
      // Moved before the hold fired → it's an orbit drag, not a placement.
      const s = startRef.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_SLOP) {
        clearTimer();
      }
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activeId.current) return;
      clearTimer();
      activeId.current = null;
      if (modeRef.current) {
        const cell = ghostRef.current;
        if (cell) {
          useVoxelStore.getState().setVoxel(cell.x, cell.y, cell.z, useEditorStore.getState().color);
        }
        exitMode();
        // Leave inBoxGesture true through this release so r3f's tap-to-add bails;
        // it resets on the next pointerdown.
      }
    };

    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== activeId.current) return;
      clearTimer();
      activeId.current = null;
      if (modeRef.current) exitMode();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    return () => {
      clearTimer();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
    };
  }, [gl, camera, controls, raycaster, groundPlane, inBoxGesture]);

  if (!ghost) return null;
  const pos = voxelWorldPos(ghost.x, ghost.y, ghost.z);
  return (
    <mesh position={pos} raycast={() => {}}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={ghost.color}
        transparent
        opacity={0.4}
        depthWrite={false}
        roughness={0.4}
      />
      <Edges color="#ffffff" />
    </mesh>
  );
}
