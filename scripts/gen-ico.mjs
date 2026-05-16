// Minimal ICO generator — converts a PNG to multi-size .ico
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const srcPng = '/Users/sangxuesheng/Downloads/gemini音乐/build/icon.png';
const outIco = '/Users/sangxuesheng/Downloads/gemini音乐/build/icon.ico';

// Generate PNGs at various sizes
const sizes = [16, 24, 32, 48, 64, 128, 256];
const tmpDir = '/tmp/ico-gen';

execSync(`mkdir -p ${tmpDir}`, { stdio: 'pipe' });

for (const s of sizes) {
  execSync(`sips -z ${s} ${s} "${srcPng}" --out "${tmpDir}/icon_${s}x${s}.png"`, { stdio: 'pipe' });
}

// Read all PNGs
const pngData = sizes.map(s => readFileSync(`${tmpDir}/icon_${s}x${s}.png`));

// Build ICO
const numImages = pngData.length;
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);      // reserved
header.writeUInt16LE(1, 2);      // type: ICO
header.writeUInt16LE(numImages, 4); // count

const dirEntrySize = 16;
const dirOffset = 6 + numImages * dirEntrySize;

const dirEntries = [];
let dataOffset = dirOffset;

for (let i = 0; i < numImages; i++) {
  const data = pngData[i];
  const s = sizes[i];
  const entry = Buffer.alloc(dirEntrySize);
  entry.writeUInt8(s >= 256 ? 0 : s, 0);  // width
  entry.writeUInt8(s >= 256 ? 0 : s, 1);  // height
  entry.writeUInt8(0, 2);  // colors
  entry.writeUInt8(0, 3);  // reserved
  entry.writeUInt16LE(1, 4);  // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(data.length, 8);  // size
  entry.writeUInt32LE(dataOffset, 12);  // offset
  dirEntries.push(entry);
  dataOffset += data.length;
}

const ico = Buffer.concat([header, ...dirEntries, ...pngData]);
writeFileSync(outIco, ico);
console.log(`Wrote ${outIco} (${ico.length} bytes, ${numImages} sizes)`);

// Cleanup
execSync(`rm -rf ${tmpDir}`);