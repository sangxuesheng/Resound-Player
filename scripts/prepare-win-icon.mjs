import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const root = process.cwd();
const buildDir = path.join(root, 'build');
const sourceIcon = path.join(buildDir, 'icon.png');
const outputIcon = path.join(buildDir, 'icon.ico');
const sizes = [16, 32, 48, 64, 128, 256];

function resizeNearest(source, width, height) {
  const target = new PNG({ width, height });

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor((y * source.height) / height));

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x * source.width) / width));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;

      target.data[targetIndex] = source.data[sourceIndex];
      target.data[targetIndex + 1] = source.data[sourceIndex + 1];
      target.data[targetIndex + 2] = source.data[sourceIndex + 2];
      target.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }

  return PNG.sync.write(target);
}

if (!fs.existsSync(sourceIcon)) {
  console.error('Missing build/icon.png. Please copy the app PNG icon to build/icon.png first.');
  process.exit(1);
}

const source = PNG.sync.read(fs.readFileSync(sourceIcon));
const images = sizes.map((size) => ({
  size,
  data: resizeNearest(source, size, size),
}));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

const directorySize = images.length * 16;
let offset = header.length + directorySize;

const directories = images.map(({ size, data }) => {
  const directory = Buffer.alloc(16);
  directory.writeUInt8(size === 256 ? 0 : size, 0);
  directory.writeUInt8(size === 256 ? 0 : size, 1);
  directory.writeUInt8(0, 2);
  directory.writeUInt8(0, 3);
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(data.length, 8);
  directory.writeUInt32LE(offset, 12);
  offset += data.length;
  return directory;
});

fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(outputIcon, Buffer.concat([header, ...directories, ...images.map((image) => image.data)]));

console.log(`Generated ${path.relative(root, outputIcon)} with ${sizes.join(', ')}px PNG layers.`);
