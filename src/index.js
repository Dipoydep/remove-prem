const express = require('express');
const multer = require('multer');
const { removeBackground } = require('./remover');

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // maks 10 MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|bmp|tiff)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipe file tidak didukung: ${file.mimetype}`));
    }
  },
});

// Landing / dokumentasi singkat
app.get('/', (req, res) => {
  res.json({
    name: 'remove-prem',
    description: 'Non-AI background remover API',
    endpoints: {
      'POST /remove-background': 'multipart/form-data, field "image". Query: ?tolerance=30',
      'GET /health': 'Health check',
    },
  });
});

// Health check untuk Render
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Endpoint utama
app.post('/remove-background', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'File "image" tidak ditemukan di request.' });
    }

    const tolerance = req.query.tolerance
      ? Math.max(0, Math.min(255, parseInt(req.query.tolerance, 10) || 30))
      : 30;

    try {
      const { buffer, backgroundColor } = await removeBackground(req.file.buffer, {
        tolerance,
      });

      res.set({
        'Content-Type': 'image/png',
        'X-Background-Color': `rgb(${backgroundColor.r},${backgroundColor.g},${backgroundColor.b})`,
      });
      res.send(buffer);
    } catch (e) {
      console.error('removeBackground error:', e);
      res.status(500).json({ error: e.message || 'Gagal memproses gambar' });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`remove-prem API listening on port ${PORT}`);
});
