/**
 * Derives the square app icons from `public/logo.png`.
 *
 * WHY THIS EXISTS. The supplied logo is 2365x794 - very nearly 3:1 - and its
 * artwork is a single colour, brand olive `#3F4123`, on full transparency. Neither
 * property survives being dropped straight into a favicon slot:
 *
 *   - a 3:1 mark cannot fill a square, and cropping it to fit would destroy the
 *     lockup, so it is letterboxed with padding instead
 *   - olive artwork on transparency disappears against a dark browser tab, so the
 *     derived icons are composited onto an opaque cream `#E7DDC8` backdrop, which
 *     is an official brand colour and gives the artwork 7.82:1
 *
 * `public/logo.png` is read and never written. The artwork itself is not recoloured,
 * cropped, or altered - it is scaled proportionally and placed on a backdrop. The
 * outputs are separate derived assets.
 *
 * No image library is used. Decode, area-average downscale, alpha composite, and
 * re-encode all run on Node's built-in `zlib`, so this adds no dependency.
 *
 * Usage: npm run icons
 * Rerun whenever `public/logo.png` changes.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

const SOURCE = "public/logo.png";

/** Brand cream. Opaque, so the icon reads on a light or dark browser chrome. */
const BACKDROP = { r: 0xe7, g: 0xdd, b: 0xc8 };

/**
 * Share of the square left empty on the inline edges. The mark is wide, so the
 * width is the constrained dimension and the vertical gap ends up far larger - which
 * is what keeps a 3:1 lockup from looking crammed against the edges.
 */
const INLINE_PADDING = 0.1;

const OUTPUTS = [
  // Favicon. Browsers downscale to 16/32px; a generous source keeps that readable.
  { path: "src/app/icon.png", size: 256 },
  // Apple touch icon. 180 is the size iOS asks for and it is never transparent.
  { path: "src/app/apple-icon.png", size: 180 },
];

// --- PNG decode ------------------------------------------------------------

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Returns `{ width, height, pixels }` with `pixels` as non-premultiplied RGBA. */
function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) {
    throw new Error(`${SOURCE} is not a PNG`);
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colourType = buffer[25];
  const interlace = buffer[28];

  if (bitDepth !== 8 || colourType !== 6 || interlace !== 0) {
    throw new Error(
      `Unsupported PNG: bitDepth=${bitDepth} colourType=${colourType} interlace=${interlace}. ` +
        `This script handles 8-bit non-interlaced RGBA, which is what the supplied logo is. ` +
        `If the source has been re-exported, widen the decoder rather than guessing.`,
    );
  }

  const parts = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") parts.push(buffer.subarray(offset + 8, offset + 8 + length));
    if (type === "IEND") break;
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(parts));
  const bpp = 4;
  const stride = width * bpp;
  const pixels = Buffer.alloc(height * stride);

  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;

    const cur = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);

    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let value = line[x];

      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) value += paeth(a, b, c);

      cur[x] = value & 0xff;
    }
  }

  return { width, height, pixels };
}

// --- PNG encode ------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

/** Encodes opaque RGB. The icons are composited, so there is no alpha to carry. */
function encodePngRgb(width, height, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  const stride = width * 3;
  const rawScanlines = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (stride + 1)] = 0; // filter: none
    rgb.copy(rawScanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(rawScanlines, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Resample and composite ------------------------------------------------

/**
 * Area-average downscale, performed in premultiplied alpha.
 *
 * Averaging straight RGBA would let fully transparent pixels - whose colour channels
 * are meaningless - drag the result towards black and leave a dark fringe around the
 * artwork. Premultiplying first weights each pixel's colour by its own coverage,
 * which is the only way to get a clean edge.
 */
function downscalePremultiplied(source, targetWidth, targetHeight) {
  const { width, height, pixels } = source;
  const out = new Float64Array(targetWidth * targetHeight * 4);

  for (let ty = 0; ty < targetHeight; ty++) {
    const y0 = Math.floor((ty * height) / targetHeight);
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * height) / targetHeight));

    for (let tx = 0; tx < targetWidth; tx++) {
      const x0 = Math.floor((tx * width) / targetWidth);
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * width) / targetWidth));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          const alpha = pixels[i + 3] / 255;
          r += (pixels[i] / 255) * alpha;
          g += (pixels[i + 1] / 255) * alpha;
          b += (pixels[i + 2] / 255) * alpha;
          a += alpha;
          n++;
        }
      }

      const o = (ty * targetWidth + tx) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = a / n;
    }
  }

  return out;
}

function buildIcon(source, size) {
  const artWidth = Math.round(size * (1 - 2 * INLINE_PADDING));
  const artHeight = Math.max(1, Math.round((artWidth * source.height) / source.width));

  if (artHeight > size) {
    throw new Error(`Scaled artwork is taller than the square at size ${size}`);
  }

  const scaled = downscalePremultiplied(source, artWidth, artHeight);

  const offsetX = Math.round((size - artWidth) / 2);
  const offsetY = Math.round((size - artHeight) / 2);

  // Start from a fully opaque backdrop, then composite the artwork over it.
  const rgb = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    rgb[i * 3] = BACKDROP.r;
    rgb[i * 3 + 1] = BACKDROP.g;
    rgb[i * 3 + 2] = BACKDROP.b;
  }

  for (let y = 0; y < artHeight; y++) {
    for (let x = 0; x < artWidth; x++) {
      const s = (y * artWidth + x) * 4;
      const alpha = scaled[s + 3];
      if (alpha <= 0) continue;

      const d = ((y + offsetY) * size + (x + offsetX)) * 3;
      // Source is premultiplied, so `src + dst * (1 - a)` is the correct blend.
      rgb[d] = Math.round(Math.min(1, scaled[s] + (BACKDROP.r / 255) * (1 - alpha)) * 255);
      rgb[d + 1] = Math.round(Math.min(1, scaled[s + 1] + (BACKDROP.g / 255) * (1 - alpha)) * 255);
      rgb[d + 2] = Math.round(Math.min(1, scaled[s + 2] + (BACKDROP.b / 255) * (1 - alpha)) * 255);
    }
  }

  return { png: encodePngRgb(size, size, rgb), artWidth, artHeight, offsetX, offsetY };
}

// --- Run -------------------------------------------------------------------

const source = decodePng(readFileSync(SOURCE));

console.log(`source ${SOURCE}`);
console.log(
  `  ${source.width} x ${source.height}  (${(source.width / source.height).toFixed(4)}:1)  RGBA, untouched`,
);
console.log(
  `  backdrop #${[BACKDROP.r, BACKDROP.g, BACKDROP.b].map((v) => v.toString(16).padStart(2, "0")).join("")} (brand cream), inline padding ${INLINE_PADDING * 100}%`,
);

for (const { path, size } of OUTPUTS) {
  const { png, artWidth, artHeight, offsetX, offsetY } = buildIcon(source, size);
  writeFileSync(path, png);
  console.log(
    `wrote ${path}  ${size}x${size}  artwork ${artWidth}x${artHeight} at ${offsetX},${offsetY}  ${png.length.toLocaleString()} B`,
  );
}
