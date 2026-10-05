# Kurulum Rehberi

Sistemi çalıştırmak için iki ücretsiz hesap gerekir: **Supabase** (veritabanı ve giriş) ve **Vercel** (sitenin yayınlandığı yer).
Şifre veya anahtarları kimseyle sohbet üzerinden paylaşmayın; sadece aşağıda söylenen yerlere yapıştırın.

## 1. Supabase

1. https://supabase.com adresinde hesap açın, **New project** ile yeni proje oluşturun.
   Bölge olarak **Central EU (Frankfurt)** seçin. Veritabanı şifresini güvenli bir yere not edin.
2. Proje açılınca soldaki menüden **SQL Editor**'a girin, **New query** deyin.
3. Bu depodaki `supabase/migrations/20261005000000_faz1_temel.sql` dosyasının tamamını kopyalayıp yapıştırın ve **Run**'a basın.
   "Success" görünmeli. Bu adım tabloları ve segment şablonlarını oluşturur.
4. **Authentication → Sign In / Providers** sayfasında **Allow new users to sign up** ayarını kapatın.
   Böylece sadece sizin davet ettiğiniz kişiler girebilir.
5. **Authentication → Users → Add user → Send invitation** ile ekip arkadaşlarınızı e-postalarıyla davet edin
   (ya da **Create new user** ile şifreyi kendiniz belirleyin).
6. **Project Settings → API** sayfasından iki değeri alacaksınız:
   - **Project URL**
   - **anon public** anahtarı

## 2. Vercel

1. https://vercel.com adresinde GitHub hesabınızla giriş yapın.
2. **Add New → Project** ile `cation-ihale` deposunu seçin.
3. **Environment Variables** bölümüne şu ikisini ekleyin:
   - `NEXT_PUBLIC_SUPABASE_URL` → Supabase'deki Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase'deki anon public anahtarı
4. **Deploy**'a basın. Birkaç dakika sonra size bir site adresi verilir.

## 3. İlk kullanım

1. Site adresine girip Supabase'de oluşturduğunuz kullanıcıyla giriş yapın.
2. **Ayarlar** sayfasında firma bilgilerini, IBAN'ı ve logoyu girin. Teklif PDF'inde bunlar görünür.
3. **Kalem Kütüphanesi** sayfasında `CATION_Kalem_Sablon_Kutuphanesi.xlsx` dosyanızı yükleyin.
   Sütun düzeni için sayfadaki **Örnek dosyayı indir** butonunu kullanabilirsiniz.
4. **İhaleler → Yeni İhale** ile ilk ihaleyi oluşturun.

## Geliştirici notu

```bash
cp .env.example .env.local   # değerleri doldurun
npm install
npm run dev                  # http://localhost:3000
npm test                     # maliyet motoru testleri
```
