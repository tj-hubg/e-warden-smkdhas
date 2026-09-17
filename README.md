# e-WARDEN SMKDHAS — GitHub Pages + Google Apps Script

Pakej ini memecahkan sistem asal tanpa menukar reka bentuk Canva atau aliran kerja utama.

## Struktur

- `index.html` — kerangka aplikasi.
- `pages/warden.html` — paparan warden, GPS dan Punch-In/Punch-Out.
- `pages/admin.html` — dashboard, tetapan dan pengurusan warden.
- `pages/report.html` — laporan, cetakan dan eksport Excel.
- `css/styles.css` — semua visual asal dan paparan mobile.
- `js/config.js` — satu-satunya tempat untuk URL Apps Script.
- `js/api.js` — sambungan GitHub Pages ke Apps Script.
- `js/app.js` — logik aplikasi.
- `backend/Code.gs` — backend Google Sheets dan API.

## Cara pemasangan

1. Gantikan `Code.gs` dalam projek Apps Script dengan `backend/Code.gs`.
2. Deploy sebagai **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
3. Salin URL deployment yang berakhir dengan `/exec`.
4. Tampal URL tersebut pada `API_URL` dalam `js/config.js`.
5. Upload kandungan folder ini ke repository GitHub.
6. Aktifkan GitHub Pages daripada branch yang mengandungi `index.html`.

## Nota penting

- Logo, nama aplikasi, nama sekolah dan geofence masih datang daripada sheet `SETTINGS`.
- PIN tidak dihantar kepada browser.
- Operasi pentadbir menggunakan token sementara.
- Backend mengesahkan semula koordinat, ketepatan GPS dan radius bagi setiap transaksi.
- Jangan simpan PIN atau maklumat rahsia dalam repository GitHub.
