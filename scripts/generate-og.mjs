import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const W = 1200
const H = 630
const px = new Uint8Array(W * H * 4)

const BG = [13, 15, 20, 255]
const RING = [129, 140, 248, 255]
const RING2 = [139, 144, 160, 60]
const INK = [236, 236, 241, 255]

for (let i = 0; i < W * H; i++) {
  px[i * 4] = BG[0]
  px[i * 4 + 1] = BG[1]
  px[i * 4 + 2] = BG[2]
  px[i * 4 + 3] = BG[3]
}

function setPixel(x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const i = (y * W + x) * 4
  px[i] = r
  px[i + 1] = g
  px[i + 2] = b
  px[i + 3] = a
}

function ring(cx, cy, radius, thickness, color) {
  const r0 = radius - thickness / 2
  const r1 = radius + thickness / 2
  for (let y = Math.floor(cy - r1); y <= cy + r1; y++) {
    for (let x = Math.floor(cx - r1); x <= cx + r1; x++) {
      const d = Math.hypot(x - cx, y - cy)
      if (d >= r0 && d <= r1) setPixel(x, y, color)
    }
  }
}

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
}

function text(str, cx, cy, scale, color) {
  const cw = 5 * scale
  const gap = scale
  const total = str.length * cw + (str.length - 1) * gap
  let x = Math.round(cx - total / 2)
  const y0 = Math.round(cy - (7 * scale) / 2)
  for (const ch of str) {
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (FONT[ch][row][col] === '1') {
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) setPixel(x + col * scale + dx, y0 + row * scale + dy, color)
        }
      }
    }
    x += cw + gap
  }
}

ring(W / 2, H / 2, 235, 16, RING)
ring(W / 2, H / 2, 285, 3, RING2)
ring(W / 2, H / 2, 185, 3, RING2)
text('ATS', W / 2, H / 2 + 2, 18, INK)

const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8
ihdr[9] = 6
const raw = Buffer.alloc(H * (1 + W * 4))
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0
  Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (1 + W * 4) + 1)
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync(new URL('../public/og.png', import.meta.url), png)
console.log(`public/og.png written (${png.length} bytes)`)