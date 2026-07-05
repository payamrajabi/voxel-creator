/**
 * Grid → world mapping. A voxel (x,y,z) becomes a unit cube centered at
 * (x+0.5, y+0.5, -(z+0.5)): feet (y=0) sit on the ground plane at Y=0, and the
 * front slice (z=0) is nearest the default camera with +X to the character's
 * right — so the 3D view matches how it was drawn in 2D. World Z is negated vs
 * grid Z (why face normals / ground taps map back through `facePick`).
 *
 * Shared by the renderer (`Scene3D`) and the glass-box tool (`BoxPlacer`).
 */
export function voxelWorldPos(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [x + 0.5, y + 0.5, -(z + 0.5)];
}
