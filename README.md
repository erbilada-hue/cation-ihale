# CATION İhale Maliyet Sistemi

İş kıyafeti ihaleleri için maliyet hesaplama ve teklif hazırlama sistemi.

Kurulum adımları için [KURULUM.md](KURULUM.md), proje kuralları için [CLAUDE.md](CLAUDE.md) dosyasına bakın.

## Faz 1 (Temel MVP) içeriği

- Giriş (Supabase Auth, sadece davetli kullanıcılar)
- İhale formu: teknik şartname var/yok, yoksa zorunlu segment seçimi
- Ürün ve kalem yönetimi: ürün grubu seçilince zorunlu kalemler otomatik gelir
- Maliyet motoru: ham → fire → kâr → KDV, birim fiyat öncelikli, kâr marjı anında güncellenir
- Kalem şablon kütüphanesi: Excel'den yükleme
- Ayarlar: firma bilgileri, IBAN, logo, segment şablonları
- PDF: Müşteri Teklifi ve İç Maliyet Raporu

## Yazı tipleri

`src/assets/fonts` altındaki IBM Plex dosyaları SIL Open Font License 1.1 ile dağıtılır.
