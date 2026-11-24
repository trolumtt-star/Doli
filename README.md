# Doli

Kısa video uygulaması. Android APK'sı GitHub Actions ile otomatik derlenir.

## APK'yı indirme
**Releases** bölümünden en son `doli-*.apk` dosyasını telefona indir ve kur.
Telefon "bilinmeyen kaynaklardan yükleme" izni isteyebilir.

## Yapı
- `www/` uygulamanın kendisi (HTML, CSS, JS)
- `native/` APK'ya özel katman: Supabase bağlantısı ve giriş ekranı
- `supabase/migration.sql` veritabanı kurulumu (Supabase SQL Editor'da bir kez çalıştırılır)
- `.github/workflows/android.yml` her `main` gönderiminde APK derler ve sürüm olarak yayınlar

## İlk kurulum
1. Supabase'de `supabase/migration.sql` dosyasını çalıştır.
2. Supabase › Authentication › Sign In / Providers › Email bölümünde
   **Confirm email** seçeneğini kapatırsan kullanıcılar e-posta doğrulamadan girebilir.
3. Uygulamaya **ilk kayıt olan hesap yönetici olur**. İlk kaydı sen yap.
