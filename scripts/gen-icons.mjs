/* Generates PWA icons from an inline SVG (isometric voxel cube on a dark
 * square). Full-bleed so it works as "any" and "maskable"; platforms apply
 * their own rounding. Run: `node scripts/gen-icons.mjs`
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2e2f32"/>
  <g stroke="#2e2f32" stroke-width="6" stroke-linejoin="round">
    <polygon points="256,150 362,211 256,272 150,211" fill="#f1aa0c"/>
    <polygon points="150,211 256,272 256,362 150,301" fill="#ed6120"/>
    <polygon points="256,272 362,211 362,301 256,362" fill="#8c372c"/>
  </g>
</svg>`;

const buf = Buffer.from(svg);
await mkdir("public", { recursive: true });

const targets = [
  { size: 192, file: "public/icon-192x192.png" },
  { size: 512, file: "public/icon-512x512.png" },
  { size: 180, file: "public/apple-touch-icon.png" },
];

for (const t of targets) {
  await sharp(buf).resize(t.size, t.size).png().toFile(t.file);
  console.log("wrote", t.file);
}
