# remove-prem

Non-AI Background Remover REST API.

## Endpoint

### `POST /remove-background`

Upload gambar dengan field `image`, hasilnya PNG dengan background transparan.

**Query param (opsional):**
- `tolerance` (angka, default `30`): seberapa agresif penghapusan. Naikkan jika background tidak terhapus penuh, turunkan jika objek ikut terhapus.

**Contoh:**

```bash
curl -X POST "https://remove-prem.onrender.com/remove-background?tolerance=30" \
  -F "image=@foto.jpg" \
  -o hasil.png
```

### `GET /health`

Health check, mengembalikan `{ "status": "ok" }`.

## Batasan

Metode ini **non-AI**, berbasis deteksi warna di tepi gambar. Cocok untuk:
- Produk dengan background polos (putih, hijau, biru)
- Logo / ikon
- Foto dengan latar kontras tinggi

Tidak cocok untuk background kompleks (foto orang di taman, rambut detail).
