"use client";

import { Canvas } from "@react-three/fiber";
import { Grid, Instance, Instances, OrbitControls } from "@react-three/drei";

// A tiny placeholder "little guy" so Phase 0 shows instanced, colored voxels
// standing on the ground. The real voxel store replaces this in later phases.
const DEMO_VOXELS: { pos: [number, number, number]; color: string }[] = [
  // legs
  { pos: [-1, 0, 0], color: "#2b3f87" },
  { pos: [1, 0, 0], color: "#2b3f87" },
  { pos: [-1, 1, 0], color: "#2b3f87" },
  { pos: [1, 1, 0], color: "#2b3f87" },
  // torso
  { pos: [-1, 2, 0], color: "#ed6120" },
  { pos: [0, 2, 0], color: "#ed6120" },
  { pos: [1, 2, 0], color: "#ed6120" },
  { pos: [-1, 3, 0], color: "#ed6120" },
  { pos: [0, 3, 0], color: "#ed6120" },
  { pos: [1, 3, 0], color: "#ed6120" },
  // head
  { pos: [0, 4, 0], color: "#eebab2" },
];

export default function Scene3D() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [8, 7, 10], fov: 45, near: 0.1, far: 1000 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#2e2f32"]} />
      <hemisphereLight args={["#ffffff", "#3a3f45", 1.0]} />
      <directionalLight position={[6, 12, 8]} intensity={1.4} />
      <ambientLight intensity={0.35} />

      <Instances limit={1000} range={DEMO_VOXELS.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.65} metalness={0.05} />
        {DEMO_VOXELS.map((v, i) => (
          <Instance key={i} position={v.pos} color={v.color} />
        ))}
      </Instances>

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
        target={[0, 2, 0]}
      />
    </Canvas>
  );
}
