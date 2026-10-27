# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Özeti

Ritma; danışman, koç, eğitmen, diyetisyen gibi serbest çalışan hizmet sağlayıcılar için bir randevu ve müşteri takip sistemi. Ürün henüz yayında değil.

İki parçadan oluşur:

- **Landing page** (`public/index.html`): tek sayfa. Bölümler sırasıyla: hero, nasıl çalışır (müşterinin gözünden 3 adım), erken erişim formu, alt bilgi. Sayfa bilerek kısa tutuldu; fiyatlandırma ve SSS bölümleri konuşuldu ve şimdilik çıkarıldı. Ana amacı ziyaretçileri erken erişim listesine kaydetmek ("Erken erişim için kaydol").
- **Randevu akışı** (backend + iki sayfa): müşteri hizmet verenin boş saatlerini görüp randevu alır (`public/book.html`), hizmet veren randevularını takviminde görür (`public/calendar.html`). Veriler bellekte; sunucu yeniden başlayınca örnek veriye döner. Giriş, iptal, hatırlatma ve kalıcı veritabanı henüz yok. Tasarım: `docs/superpowers/specs/2026-10-27-backend-booking-design.md`.

Sayfadaki tüm metinler ve API hata mesajları Türkçe.

## Teknoloji

### Frontend (`public/`)

- Sadece HTML, CSS ve düz JavaScript (`<script type="module">`).
- Framework, kütüphane ya da build adımı yok.
- Yazı tipi: Google Fonts'tan Plus Jakarta Sans (Türkçe karakterleri düzgün gösterdiği için seçildi).

### Backend (`server/`)

- Node.js 24 + Express 5 + TypeScript 5.9.
- Build adımı yok: Node `.ts` dosyalarını doğrudan çalıştırır. TypeScript yalnızca tip kontrolü için (`npm run typecheck`).
- Yalnızca silinebilir TypeScript sözdizimi: `enum`, `namespace`, constructor parametre özellikleri yok (`erasableSyntaxOnly`). Göreli import'lar `.ts` uzantısıyla yazılır.
- Testler Node'un yerleşik `node:test` modülüyle.
- Saat dilimi sabit `Europe/Istanbul` (`+03:00`).

## Dosyalar

- `public/index.html`: landing sayfasının tamamı. Hero'daki takvim görseli resim değil, HTML ve CSS ile çizilmiş bir örnek.
- `public/script.js`: erken erişim formunun kontrolü ve teşekkür mesajı. Form verisi şimdilik hiçbir yere gönderilmiyor; gerçek bir servis bağlanınca yalnızca `submitSignup` fonksiyonu değişecek. Sayfa yayına çıkmadan önce bu yapılmalı, yoksa kayıtlar kaybolur.
- `public/styles.css`: tüm sayfaların ortak stilleri. Renk, köşe yuvarlaklığı ve gölge gibi değerler `:root` altında değişken olarak tanımlı. Landing 960px altında tek sütuna geçer, 520px altında bazı öğeler gizlenir.
- `public/app.css`, `public/api.js`, `public/book.*`, `public/calendar.*`: randevu ve takvim sayfaları.
- `server/src/domain/`: saf fonksiyonlar (zaman, slot hesabı, doğrulama). `server/src/store/`: bellekteki depo ve örnek veri. `server/src/routes/`: API. `server/src/app.ts`: Express uygulaması (dinlemez); `server/src/server.ts`: 3000 portunda başlatır.
- `server/test/`: testler.

Express yalnızca `public/` klasörünü sunar; kök klasördeki dosyalar tarayıcıdan erişilemez.

## Komutlar

- `npm install`: ilk kurulum.
- `npm start`: sunucuyu başlatır, sayfalar `http://localhost:3000` adresinde (landing `/`, randevu `/book.html?p=ayse-yilmaz`, takvim `/calendar.html?p=ayse-yilmaz`).
- `npm run dev`: aynısı, dosya değişince yeniden başlar.
- `npm test`: tüm testler.
- `npm run typecheck`: TypeScript tip kontrolü.

Landing `public/index.html` tarayıcıda doğrudan da açılabilir.

## Kurallar

- Dosya ve klasör adları İngilizce olur (ör. `signup-form.js`, `pricing.css`).
- Sayfada görünen metinler Türkçe olur.
- Renk ve benzeri değerler için `:root` altındaki CSS değişkenlerini kullanın. Yeni bir değer gerekiyorsa önce oraya ekleyin.
- Her değişiklik mobilde de düzgün görünmeli.
- Tüm "Erken erişim" butonları `#early-access` formuna gider. "Giriş Yap" bağlantısı şimdilik `#` adresine gidiyor. Alt bilgideki `merhaba@ritma.app` yer tutucu bir adres.
- Backend kodu test önce yazılır (TDD); değişiklikten sonra `npm test` ve `npm run typecheck` geçmeli.
- Tasarım ve içerik kararları kullanıcıyla birlikte, tek tek soru sorarak alınır. Kullanıcı onay vermeden uygulamaya geçilmez.
- Alınan kararlar ve planlar `docs/` altında tutulur (ör. `docs/landing-page-plan.md`, `docs/superpowers/specs/`). Sayfayı değiştirmeden önce ilgili dosyayı oku, değişiklikten sonra güncelle.

## Doğrulama

- Değişiklikten sonra sayfayı headless Edge ile kontrol et. Chrome ve Playwright kurulu değil.
- Randevu ve takvim sayfaları API'ye ihtiyaç duyar; bunları `npm start` ile açılan `http://localhost:3000` üzerinden kontrol et.
- Edge'in `--window-size` ayarı 500px'in altına inmez. 375px mobil görünümü test etmek için Edge'i `--remote-debugging-port` ile aç ve CDP `Emulation.setDeviceMetricsOverride` kullan. Node 24'te `fetch` ve `WebSocket` hazır geldiği için ek paket gerekmez.
- Kontrol et: 375, 768 ve 1280px'te yan kaydırma olmaması, menü bağlantılarının doğru bölüme gitmesi, formların boş, hatalı ve doğru bilgilerle davranışı, konsolda hata olmaması.

## Yasaklar

- Frontend'e React, Vue, Tailwind, jQuery gibi framework veya kütüphane eklemeyin; frontend'de build aracı kullanmayın.
- Backend'e kullanıcı onayı olmadan yeni `npm` paketi eklemeyin. Mevcut bağımlılıklar: `express`; geliştirme için `typescript`, `@types/express`, `@types/node`.
- TypeScript için derleme/bundle adımı eklemeyin; kod Node ile doğrudan çalışmalı.
- Türkçe dosya veya klasör adı kullanmayın.
- Sayfa metinlerini İngilizce yazmayın.
