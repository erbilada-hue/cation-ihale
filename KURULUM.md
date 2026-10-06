# Kurulum Rehberi

Sistemi çalıştırmak için iki ücretsiz hesap gerekir: **Supabase** (veritabanı ve giriş) ve **Vercel** (sitenin yayınlandığı yer).
Şifre veya anahtarları kimseyle sohbet üzerinden paylaşmayın; sadece aşağıda söylenen yerlere yapıştırın.

## 1. Supabase

1. https://supabase.com adresinde hesap açın, **New project** ile yeni proje oluşturun.
   Bölge olarak **Central EU (Frankfurt)** seçin. Veritabanı şifresini güvenli bir yere not edin.
2. Proje açılınca soldaki menüden **SQL Editor**'a girin, **New query** deyin.
3. Bu depodaki `supabase/migrations/20261005000000_faz1_temel.sql` dosyasının tamamını kopyalayıp yapıştırın ve **Run**'a basın.
   "Success" görünmeli. Bu adım tabloları ve segment şablonlarını oluşturur.
   Ardından `supabase/migrations` klasöründeki diğer dosyaları da tarih sırasıyla aynı şekilde çalıştırın
   (şu an: `20261006000000_faz1_doviz_sartname_fason.sql`: döviz, şartname dosyaları, fason ayrımı;
   `20261007000000_faz2_tedarikci.sql`: tedarikçiler, fiyat listesi, fiyat talepleri).
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

   Her ikisinde de **Type** olarak **Config** seçin, **Secret** seçmeyin. Bu iki değer gizli değildir;
   Secret seçilirse Vercel değeri siteye vermez ve site açılmaz. Secret olarak kaydedildiyse tür sonradan
   değiştirilemez: değişkeni silip Config olarak yeniden ekleyin.
4. **Deploy**'a basın. Birkaç dakika sonra size bir site adresi verilir.
5. Değişkenleri sonradan değiştirirseniz **Deployments** sekmesinde en üstteki yayının **⋯** menüsünden
   **Redeploy** ile siteyi yeniden yayınlayın; değişiklik ancak o zaman geçerli olur.

## 3. Yapay zekâ anahtarı

Tedarikçi cevabını okuma ve şartname analizi için gereklidir. Anahtarı kimseyle (sohbette de) paylaşmayın.

1. https://console.anthropic.com adresinde hesap açın. **Billing** sayfasından bakiye yükleyin
   (bir tedarikçi cevabını okumak birkaç kuruş tutar).
2. **API Keys → Create Key** ile anahtar oluşturun, ad olarak `cation-ihale` yazın ve anahtarı kopyalayın.
3. Vercel'de projenin **Settings → Environment Variables** sayfasında yeni değişken ekleyin:
   - Key: `ANTHROPIC_API_KEY`
   - Value: kopyaladığınız anahtar
   - **Sensitive** seçeneği açık kalabilir.
4. **Deployments** sekmesinde en üstteki yayının **⋯** menüsünden **Redeploy** deyin.

## 4. İlk kullanım

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
