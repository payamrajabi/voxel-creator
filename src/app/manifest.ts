import type { MetadataRoute } from "next";

// Web App Manifest (Next 16 file convention). Next auto-injects the
// <link rel="manifest"> tag and serves this at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VoxelOS — Voxel Character Builder",
    short_name: "VoxelOS",
    description:
      "Build low-resolution voxel characters by painting flat layers in 2D and assembling them in 3D.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#2e2f32",
    theme_color: "#2e2f32",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
