# CATION İhale Maliyet Sistemi

Bu dosya projenin kalıcı kurallarını içerir. Her oturumun başında okunur.

---

## PROJE NEDİR

Türkiye merkezli iş kıyafeti tekstil firması için web tabanlı ihale maliyet yönetim sistemi.

**Çözdüğü problem:** Müşteriden şartname geliyor, maliyet hesaplamak günler sürüyor, teklif geç gidiyor, ihale kaybediliyor.

**Hedef:** Şartname yüklendiğinde 15-25 dakikada teklif çıkarmak.

**Kullanıcı:** Şirket sahibi ve satın alma ekibi, 5-10 kişi. Yazılımcı değiller.

---

## TEKNOLOJİ

```
Frontend   : Next.js 14 (App Router) + Tailwind CSS
Backend    : Next.js API Routes
Veritabanı : Supabase (PostgreSQL)
AI         : Anthropic Claude API
Auth       : Supabase Auth
PDF        : react-pdf
Excel      : SheetJS (xlsx)
Deploy     : Vercel
```

---

## MALİYET HESAP ZİNCİRİ — EN KRİTİK KURAL

Sıralama her zaman şu şekilde olmalı, değiştirilemez:

```
1. Ham birim maliyet    = Σ (kullanım × birim fiyat)
2. Fire dahil maliyet   = ham × (1 + fire%)
3. Teklif fiyatı        = fire dahil × (1 + kâr marjı%)
4. KDV dahil fiyat      = teklif × (1 + KDV%)
```

**KDV KURALI:** KDV fiyatın içinde değildir, fiyatın üzerine eklenir. Tekstil sektöründe böyle çalışır. Tüm teklif ve hesaplamalarda "KDV hariç" fiyat esastır, KDV ayrı satırda gösterilir.

**Birim maliyet önceliklidir.** Kullanıcı 1 adet ürünün maliyetini görmek ister, toplam ikincil bilgidir.

**Kâr marjı sabit değildir.** Her ihalede kullanıcı farklı girer. Varsayılan değer atanmaz, slider veya input ile anlık değiştirilebilir olmalı; değişince net kâr ve birim fiyat anında güncellenmeli.

---

## MÜŞTERİ SEGMENTASYONU

Teknik şartnamesi olmayan brief/lookbook dosyaları için kullanılır.

| Segment | Kumaş | Gramaj | Boya | Baskı | Fire |
|---------|-------|--------|------|-------|------|
| Premium | Combed 40/1-30/1 | 180gr+ | Reaktif | DTF/Nakış | %4 |
| Standart | Ring 30/1-20/1 | 160-180gr | Pigment | Serigrafi | %5 |
| Ekonomik | OE iplik | 140-160gr | Standart | Tek renk | %6 |

**MUTLAK KURAL:** Segment seçimini her zaman kullanıcı yapar. Sistem müşteri adına, sektörüne veya marka büyüklüğüne bakarak otomatik segment ataması YAPMAZ. Her otel zinciri premium değildir, bazı belediye ihaleleri çok kaliteli olabilir.

Segment alanı zorunludur, varsayılan değeri yoktur. Bu tablo Ayarlar → Segment Şablonları sayfasından düzenlenebilir olmalı.

---

## DOSYA ANALİZİ — İKİ SENARYO

Kullanıcı PDF/Word/Excel yükler, AI okur ve ikiye ayırır:

**Senaryo A — Teknik şartname tespit edildi**
Dosyada kumaş gramajı, içerik yüzdesi, EN ISO standardı veya adet bilgisi varsa:
- Segment sorulmaz
- Kumaş ve detaylar şartnameden alınır
- Yeşil banner: "Teknik şartname tespit edildi"

**Senaryo B — Brief/Lookbook tespit edildi**
Dosyada sadece görsel ve pazarlama dili varsa ("durable fabric", "premium feel"):
- Mavi banner: "Teknik şartname bulunamadı — kalite segmenti seçin"
- 3 segment kartı gösterilir
- Kullanıcı seçer, o segmentin şablonu kullanılır

Her iki senaryoda da maliyet tablosu oluşmadan önce kullanıcıya özet gösterilir (tespit edilen ürünler, adetler, seçilen kumaşlar) ve "Onayla ve Maliyet Oluştur" butonuyla onay alınır.

Maliyet tablosunun üstünde kaynak göstergesi olur: "Şartnameye göre oluşturuldu · dosya.pdf" veya "Premium segment şablonuna göre oluşturuldu · brief.pdf"

---

## KALEM ŞABLON KÜTÜPHANESİ

Excel dosyası olarak sisteme yüklenir (`CATION_Kalem_Sablon_Kutuphanesi.xlsx`).

**Yapı:** Her ürün grubu için ZORUNLU ve OPSİYONEL kalemler ayrı tutulur.

- Ürün tipi seçilince zorunlu kalemler otomatik açılır
- AI şartnamede geçen anahtar kelimeleri arar, eşleşen opsiyonelleri ekler
- Kalem sayısı sabit değildir — basit mont 8 kalem, karmaşık mont 18 kalem olabilir

**Ürün grupları:** Mont-Kaban, Pantolon-Şort, Tişört-Polo, Gömlek, Tulum-Önlük, Polar-Yelek-Yağmurluk, Şapka-Bere-Çorap

**Nakliye payı** her üründe opsiyonel kalem olarak bulunur — teslim yeri uzaksa mutlaka eklenmeli, sık unutulan kalemdir.

---

## TEDARİKÇİ FİYAT AKIŞI

**Otomatik gönderim YOK.** Sistem tedarikçiye kendi başına mesaj atmaz.

Doğru akış:
1. Sistem 14 günden eski fiyatları işaretler
2. "Toplu İste" butonuna basılınca tedarikçi bazında WhatsApp mesaj şablonu üretir
3. Kullanıcı kopyalar, WhatsApp'tan kendi gönderir
4. Cevap gelince mesajı sisteme yapıştırır
5. AI okur: birim fiyat, KDV durumu, KDV hariç normalize fiyat, termin, minimum sipariş, ödeme vadesi
6. Kullanıcı "Düzelt" veya "Onayla & Kaydet" der, fiyat listesine işlenir, tarih güncellenir

**AI sonuç kartında güven skoru GÖSTERİLMEZ.** Kullanıcıyı ilgilendiren teknik detay değil.

KDV dahil fiyat gelirse otomatik normalize edilir (÷ 1.20) ve bu durum kullanıcıya belirtilir.
KDV durumu belirsizse sarı uyarı gösterilir.
Fiyat aralık olarak gelirse (160-165) ortalama alınır ve uyarı verilir.

---

## İŞ AKIŞI

```
İhale → Maliyet → Teklif → Sipariş → Üretim → Termin
```

**"Kazandı/Kaybetti" statüsü YOKTUR.** İhale kazanılınca direkt üretime geçilir. Müşteri onay/red takibi tutulmaz.

**Beden dağılımı ihale aşamasında girilmez.** Müşteri "4000 adet tişört" der, beden dağılımını ihaleyi kazandıktan sonra verir. Beden dağılımı Sipariş Onayı aşamasında girilir.

---

## İKİ AYRI PDF ÇIKTISI

**1. Müşteri Teklifi**
- Sadece birim fiyat, adet, toplam, KDV, termin, teslimat
- Maliyet dökümü YOK, kâr marjı YOK
- Şirket logosu, iletişim, IBAN bilgisi var
- Teklif tarihi ve geçerlilik süresi otomatik hesaplanır, sabit yazılmaz

**2. İç Maliyet Raporu**
- "Gizli — Sadece iç kullanım" etiketi
- Her kalemin birim ve toplam maliyeti
- Fire etkisi, kâr tutarı, net kâr
- Müşteriyle paylaşılmaz

---

## GENEL BAKIŞ SAYFASI

4 kart, hepsi tıklanabilir ve ilgili sayfaya yönlendirir:

1. **Aktif İhaleler** → ihale listesi. Alt not: teklif tarihi bu hafta olanlar
2. **Tedarikçiden Bekleyen Fiyat** → cevaplar sekmesi. Alt not: en uzun bekleyen kaç gün (3 gün+ turuncu, 7 gün+ kırmızı)
3. **Bekleyen Müşteri Onayı** → gönderilmiş teklifler
4. **Yaklaşan Termin** → siparişler. 7 günden az kaldıysa kırmızı border, 14 günden az turuncu

Alt kısım 2 sütun:
- **Sol — Yapılacaklar:** öncelik sırasına göre, her satır tıklanabilir
- **Sağ — Son Aktiviteler:** zaman damgalı akış, üretim odaklı bildirimler

---

## GELİŞTİRME SIRASI — ATLANMAZ

**Faz 1 — Temel MVP**
Veritabanı, auth, ihale formu, kalem yönetimi, maliyet motoru, PDF çıktı

**Faz 2 — Tedarikçi Yönetimi**
Tedarikçi CRUD, fiyat listesi, mesaj şablonları, fiyat karşılaştırma

**Faz 3 — AI Entegrasyonu**
Claude API, mesaj okuyucu, şartname analizi, marj tavsiyesi

**Faz 4 — İhracat Modülü**
Döviz kuru (TCMB ücretsiz API), Incoterms (EXW/FOB/CIF/DAP), çok dilli teklif (TR/EN/DE), proforma fatura

**KURAL:** Bir faz tamamlanıp gerçek bir ihaleyle test edilmeden sonrakine geçilmez.

---

## TASARIM

Design mockup'ı referans alınır (`Cation Ihale Sistemi.dc.html`).

- Font: IBM Plex Sans (başlık ve metin), IBM Plex Mono (rakamlar)
- Ana renk: #2b59e0 (mavi)
- Koyu lacivert: #0f1f44
- Arka plan: #f6f7f9
- Kart: beyaz, 1px #e9ebef border, 12px radius
- Para birimi: ₺ sembolü, Türkçe binlik ayracı (1.234,56)
- Tüm butonlar gerçekten çalışır olmalı, placeholder buton bırakılmaz

---

## ÇALIŞMA ŞEKLİ

- Türkçe konuş, gereksiz teknik terim kullanma
- Kullanıcı yazılımcı değil, adımları sade anlat
- Her değişiklikten sonra ne yaptığını kısaca söyle
- Hata alırsan önce kendin çözmeyi dene, çözemezsen sade dille açıkla
- Geri alınamayacak bir şey yapmadan önce sor
- Aynı anda birden fazla faza girme
