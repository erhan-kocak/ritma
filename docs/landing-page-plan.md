# Tanıtım Sayfası Planı

Tarih: 22 Ekim 2026
Durum: Uygulandı

## Amaç

Ritma henüz yayında değil. Tanıtım sayfasının tek amacı, ziyaretçileri (danışman, koç, eğitmen, diyetisyen gibi serbest çalışan hizmet sağlayıcıları) erken erişim listesine kaydetmek.

## Alınan kararlar

| Konu | Karar | Neden |
|------|-------|-------|
| Bölümler | Hero → Nasıl çalışır → Erken erişim formu → Alt bilgi | Kısa ve odaklı bir sayfa, kayıt amacına daha uygun. |
| Çıkarılan bölümler | Fiyatlandırma, SSS, Sorun ve çözüm | Ürün yayında değil; sayfa bilerek kısa tutuldu. Sonra eklenebilir. |
| Nasıl çalışır | Müşterinin gözünden 3 adım | Hizmet verene, müşterilerinin ne kadar kolay randevu alacağını gösterir. |
| Form alanları | Ad Soyad, E-posta, Meslek | Kimlerin ilgilendiğini görmeyi sağlar. |
| Form gönderimi | Sadece tarayıcıda kontrol + teşekkür mesajı | Sunucu yok. Gerçek servis sonra bağlanacak. |
| Alt bilgi | Logo, kısa açıklama, iletişim e-postası, telif yazısı | Kayıt olmayı düşünen biri soru sormak isterse ulaşabilmeli. Sosyal medya hesapları henüz yok. |

## Bölümler

### Üst menü
- "Nasıl Çalışır" bağlantısı (`#how-it-works`) ve "Erken Erişim" butonu (`#early-access`).
- "Giriş Yap" bağlantısı şimdilik `#` adresine gidiyor.

### Hero
- Slogan: "Randevular sizde, ritim Ritma'da."
- Buton: "Erken erişim için kaydol →" (`#early-access`).

### Nasıl çalışır (`#how-it-works`)
- Başlık: "Müşterileriniz için randevu almak hiç bu kadar kolay olmamıştı."
- Açıklama: "Telefon trafiği yok, mesajlaşma yok. Üç adımda randevu hazır."
- Adımlar:
  1. **Bağlantıyı açar.** Müşteriniz size özel randevu sayfanıza girer. Üye olması ya da uygulama indirmesi gerekmez.
  2. **Uygun saati seçer.** Yalnızca sizin boş olduğunuz saatleri görür, hizmeti ve saati seçip adını yazar.
  3. **Onay ve hatırlatma alır.** Randevu anında onaylanır, seanstan önce otomatik hatırlatma gider. Randevu sizin takviminize de kendiliğinden düşer.
- Masaüstünde 3 sütun, mobilde alt alta.

### Erken erişim formu (`#early-access`)
- Mor zemin üzerinde beyaz form kartı.
- Başlık: "Ritma'yı herkesten önce kullanın."
- Alanlar (hepsi zorunlu):
  - Ad Soyad
  - E-posta (biçimi kontrol edilir)
  - Meslek: Danışman, Koç, Eğitmen, Diyetisyen, Psikolog, Diğer
- Hatalı ya da boş alanın altında Türkçe uyarı çıkar, imleç ilk hatalı alana gider. Kullanıcı alanı düzeltirken uyarı güncellenir.
- Bilgiler doğruysa form kaybolur, "Teşekkürler {ad}!" mesajı görünür.
- Veri hiçbir yere gönderilmez. Gerçek servis bağlanınca yalnızca `script.js` içindeki `submitSignup` fonksiyonu değişecek.

### Alt bilgi
- Ritma logosu, tek cümlelik açıklama, `merhaba@ritma.app` (yer tutucu), "© 2026 Ritma".

## Dosyalar

- `index.html`: tüm bölümler
- `styles.css`: stiller; mevcut renk değişkenleri ve `.card`, `.btn`, `.eyebrow` sınıfları kullanıldı
- `script.js`: form kontrolü ve teşekkür mesajı

## Doğrulama

Edge'de (headless) yapılan kontroller, hepsi geçti:
- 375px, 768px ve 1280px genişliklerde yan kaydırma yok.
- Menü bağlantıları doğru bölüme kayıyor, başlıklar sabit menünün altında kalmıyor.
- Boş form, hatalı e-posta ve doğru bilgilerle gönderim beklendiği gibi çalışıyor.
- Konsolda JavaScript hatası yok.

## Yayından önce yapılacaklar

- [ ] Forma gerçek bir servis bağla (Formspree, Google Forms vb.). Aksi halde kayıtlar kaybolur.
- [ ] `merhaba@ritma.app` yer tutucusunu gerçek adresle değiştir.
- [ ] "Giriş Yap" bağlantısını kaldır ya da gerçek bir sayfaya bağla.
