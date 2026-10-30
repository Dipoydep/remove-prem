const sharp = require('sharp');

/**
 * Hapus background tanpa AI — berbasis sampling warna di tepi gambar.
 *
 * Cara kerja:
 *  1. Sample piksel di keempat tepi gambar (top, bottom, left, right).
 *  2. Hitung warna rata-rata (background dominan).
 *  3. Piksel yang jarak warnanya <= tolerance dianggap background → alpha = 0.
 *
 * @param {Buffer} inputBuffer - buffer gambar asli (jpg/png/webp)
 * @param {Object} options
 * @param {number} [options.tolerance=30] - 0..255, jarak warna (semakin besar = makin agresif)
 * @param {number} [options.edgeSampleRatio=0.05] - proporsi piksel tepi yang di-sample
 * @returns {Promise<{buffer: Buffer, backgroundColor: {r,g,b}, sampled: number}>}
 */
async function removeBackground(inputBuffer, options = {}) {
  const {
    tolerance = 30,
    edgeSampleRatio = 0.05,
  } = options;

  // Decode ke raw RGBA
  const { data, info } = await sharp(inputBuffer)
    .rotate() // normalisasi orientasi EXIF
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) {
    throw new Error(`Format tak terduga: ${channels} channels (harus 4 / RGBA)`);
  }

  // ----- 1. Sampling piksel tepi -----
  const samples = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) * edgeSampleRatio));

  for (let x = 0; x < width; x += step) {
    // Baris atas
    const ti = (0 * width + x) * 4;
    samples.push([data[ti], data[ti + 1], data[ti + 2]]);
    // Baris bawah
    const bi = ((height - 1) * width + x) * 4;
    samples.push([data[bi], data[bi + 1], data[bi + 2]]);
  }
  for (let y = 0; y < height; y += step) {
    // Kolom kiri
    const li = (y * width + 0) * 4;
    samples.push([data[li], data[li + 1], data[li + 2]]);
    // Kolom kanan
    const ri = (y * width + (width - 1)) * 4;
    samples.push([data[ri], data[ri + 1], data[ri + 2]]);
  }

  // ----- 2. Warna background dominan (rata-rata) -----
  let sumR = 0, sumG = 0, sumB = 0;
  for (const [r, g, b] of samples) {
    sumR += r; sumG += g; sumB += b;
  }
  const n = samples.length || 1;
  const bg = {
    r: Math.round(sumR / n),
    g: Math.round(sumG / n),
    b: Math.round(sumB / n),
  };

  // ----- 3. Hapus piksel yang mirip background -----
  const out = Buffer.from(data); // copy, jangan ubah buffer asli
  const tolSq = tolerance * tolerance;

  for (let i = 0; i < out.length; i += 4) {
    const dr = out[i] - bg.r;
    const dg = out[i + 1] - bg.g;
    const db = out[i + 2] - bg.b;
    if (dr * dr + dg * dg + db * db <= tolSq) {
      out[i + 3] = 0; // jadi transparan
    }
  }

  // ----- 4. Encode kembali ke PNG -----
  const buffer = await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  return { buffer, backgroundColor: bg, sampled: n };
}

module.exports = { removeBackground };
