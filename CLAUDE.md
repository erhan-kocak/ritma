# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Özeti

Ritma; danışman, koç, eğitmen, diyetisyen gibi serbest çalışan hizmet sağlayıcılar için bir randevu ve müşteri takip sistemi. Ürün henüz yayında değil. Şu an sadece tek sayfalık bir landing page var. Bölümler sırasıyla: hero, nasıl çalışır (müşterinin gözünden 3 adım), erken erişim formu, alt bilgi. Sayfa bilerek kısa tutuldu; fiyatlandırma ve SSS bölümleri konuşuldu ve şimdilik çıkarıldı. Sayfanın ana amacı ziyaretçileri erken erişim listesine kaydetmek ("Erken erişim için kaydol").

Sayfadaki tüm metinler Türkçe.

## Teknoloji

- Sadece HTML, CSS ve düz JavaScript.
- Framework, kütüphane, paket yöneticisi ya da build adımı yok.
- Yazı tipi: Google Fonts'tan Plus Jakarta Sans (Türkçe karakterleri düzgün gösterdiği için seçildi).

Dosyalar:

- `index.html`: sayfanın tamamı. Hero'daki takvim görseli resim değil, HTML ve CSS ile çizilmiş bir örnek.
- `script.js`: erken erişim formunun kontrolü ve teşekkür mesajı. Form verisi şimdilik hiçbir yere gönderilmiyor; gerçek bir servis (Formspree, Google Forms vb.) bağlanınca yalnızca `submitSignup` fonksiyonu değişecek. Sayfa yayına çıkmadan önce bu yapılmalı, yoksa kayıtlar kaybolur.
- `styles.css`: tüm stiller. Renk, köşe yuvarlaklığı ve gölge gibi değerler `:root` altında değişken olarak tanımlı. Sayfa 960px altında tek sütuna geçer, 520px altında bazı öğeler gizlenir.

## Komutlar

Kurulum gerekmez. Sayfayı görmek için:

- `index.html` dosyasını tarayıcıda doğrudan açın, ya da
- klasörü basit bir sunucuyla yayınlayın: `npx serve .` veya `python -m http.server`

Test, lint veya build komutu yok.

## Kurallar

- Dosya ve klasör adları İngilizce olur (ör. `signup-form.js`, `pricing.css`).
- Sayfada görünen metinler Türkçe olur.
- Renk ve benzeri değerler için `:root` altındaki CSS değişkenlerini kullanın. Yeni bir değer gerekiyorsa önce oraya ekleyin.
- Her değişiklik mobilde de düzgün görünmeli.
- Tüm "Erken erişim" butonları `#early-access` formuna gider. "Giriş Yap" bağlantısı şimdilik `#` adresine gidiyor. Alt bilgideki `merhaba@ritma.app` yer tutucu bir adres.
- Tasarım ve içerik kararları kullanıcıyla birlikte, tek tek soru sorarak alınır. Kullanıcı onay vermeden uygulamaya geçilmez.
- Alınan kararlar ve planlar `docs/` altında tutulur (ör. `docs/landing-page-plan.md`). Sayfayı değiştirmeden önce bu dosyayı oku, değişiklikten sonra güncelle.

## Doğrulama

- Değişiklikten sonra sayfayı headless Edge ile kontrol et. Chrome ve Playwright kurulu değil.
- Edge'in `--window-size` ayarı 500px'in altına inmez. 375px mobil görünümü test etmek için Edge'i `--remote-debugging-port` ile aç ve CDP `Emulation.setDeviceMetricsOverride` kullan. Node 24'te `fetch` ve `WebSocket` hazır geldiği için ek paket gerekmez.
- Kontrol et: 375, 768 ve 1280px'te yan kaydırma olmaması, menü bağlantılarının doğru bölüme gitmesi, formun boş, hatalı ve doğru bilgilerle davranışı, konsolda hata olmaması.

## Yasaklar

- React, Vue, Tailwind, jQuery gibi framework veya kütüphane eklemeyin.
- `npm` paketi, `package.json` ya da build aracı eklemeyin.
- Türkçe dosya veya klasör adı kullanmayın.
- Sayfa metinlerini İngilizce yazmayın.
