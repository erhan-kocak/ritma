# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Özeti

Ritma; danışman, koç, eğitmen, diyetisyen gibi serbest çalışan hizmet sağlayıcılar için bir randevu ve müşteri takip sistemi. Ürün henüz yayında değil.

Üç parçadan oluşur:

- **Landing page** (`public/index.html`): tek sayfa. Bölümler sırasıyla: hero, nasıl çalışır (müşterinin gözünden 3 adım), erken erişim formu, alt bilgi. Sayfa bilerek kısa tutuldu; fiyatlandırma ve SSS bölümleri konuşuldu ve şimdilik çıkarıldı. Ana amacı ziyaretçileri erken erişim listesine kaydetmek ("Erken erişim için kaydol").
- **Randevu akışı** (backend + iki sayfa): müşteri hizmet verenin boş saatlerini görüp randevu alır (`public/book.html`), hizmet veren randevularını takviminde görür (`public/calendar.html`). Veriler bellekte; sunucu yeniden başlayınca örnek veriye döner. Giriş, iptal, hatırlatma ve kalıcı veritabanı henüz yok. Tasarım: `docs/superpowers/specs/2026-10-27-backend-booking-design.md`.
- **API deneme arayüzü** (`/api-docs/`): uç noktaları hazır örneklerle denemek için Swagger UI. Geliştirme aracı, ürünün parçası değil. Tasarım: `docs/superpowers/specs/2026-11-06-api-docs-design.md`.

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
- Tarih/saat hesapları `server/src/domain/time.ts` yardımcılarıyla yapılır; `Date.parse`'a saat dilimi olmayan değer verilmez.

## Dosyalar

- `public/index.html`: landing sayfasının tamamı. Hero'daki takvim görseli resim değil, HTML ve CSS ile çizilmiş bir örnek.
- `public/script.js`: erken erişim formunun kontrolü ve teşekkür mesajı. Form verisi şimdilik hiçbir yere gönderilmiyor; gerçek bir servis bağlanınca yalnızca `submitSignup` fonksiyonu değişecek.
- `public/styles.css`: tüm sayfaların ortak stilleri. Renk, köşe yuvarlaklığı ve gölge gibi değerler `:root` altında değişken olarak tanımlı. Landing 960px altında tek sütuna geçer, 520px altında bazı öğeler gizlenir.
- `public/app.css`, `public/api.js`, `public/book.*`, `public/calendar.*`: randevu ve takvim sayfaları.
- `server/src/domain/`: saf fonksiyonlar (zaman, slot hesabı, doğrulama). `server/src/store/`: bellekteki depo ve örnek veri. `server/src/routes/`: API. `server/src/app.ts`: Express uygulaması (dinlemez); `server/src/server.ts`: 3000 portunda başlatır.
- `server/src/openapi.ts`: `/api/openapi.json`'da sunulan OpenAPI belgesi. Örnek tarih her istekte "bugünden sonraki ilk iş günü" olarak hesaplanır; POST örnekleri beklenen durum ve hata kodunu `x-expected-status` / `x-expected-code` alanlarında taşır.
- `public/api-docs/index.html`: Swagger UI sayfası.
- `server/test/`: testler. `fixtures.ts`'teki `testData()` (hizmet `s45`) gerçek örnek veriden (`createSeedData(now)`, hizmet `nutrition-45`) farklı; `openapi.ts` örneklerini denerken `createSeedData` kullan.
- `.claude/skills/clarify-prompt/`: belirsiz, tasarım dışı istekleri (hata ayıklama, araştırma, küçük değişiklik, doküman) en fazla 3 soruyla net bir prompta çeviren skill. Tasarım: `docs/superpowers/specs/2026-11-07-clarify-prompt-design.md`; testler: `docs/superpowers/skill-tests/2026-11-07-clarify-prompt.md`. Skill değişirse senaryolar alt ajanlarla yeniden çalıştırılır.

Express yalnızca `public/` klasörünü sunar; kök klasördeki dosyalar tarayıcıdan erişilemez.

## Komutlar

- `npm install`: ilk kurulum.
- `npm start`: sunucuyu başlatır, sayfalar `http://localhost:3000` adresinde (landing `/`, randevu `/book.html?p=ayse-yilmaz`, takvim `/calendar.html?p=ayse-yilmaz`, API deneme `/api-docs/`).
- `npm run dev`: aynısı, dosya değişince yeniden başlar.
- `npm test`: tüm testler.
- `node --test server/test/slots.test.ts`: tek test dosyası.
- `TZ=UTC npm test`: testleri UTC'de de çalıştır; saat dilimi hatalarını yakalar (sunucular genelde UTC'de çalışır).
- `npm run typecheck`: TypeScript tip kontrolü.

Landing `public/index.html` tarayıcıda doğrudan da açılabilir.

## Kurallar

- Dosya ve klasör adları İngilizce olur (ör. `signup-form.js`, `pricing.css`).
- Sayfada görünen metinler Türkçe olur.
- Renk ve benzeri değerler için `:root` altındaki CSS değişkenlerini kullanın. Yeni bir değer gerekiyorsa önce oraya ekleyin.
- Her değişiklik mobilde de düzgün görünmeli.
- Tüm "Erken erişim" butonları `#early-access` formuna gider. "Giriş Yap" bağlantısı şimdilik `#` adresine gidiyor. Alt bilgideki `merhaba@ritma.app` yer tutucu bir adres.
- Backend kodu test önce yazılır (TDD); değişiklikten sonra `npm test` ve `npm run typecheck` geçmeli.
- Uç nokta eklenince ya da değişince `server/src/openapi.ts` de güncellenir; `server/test/openapi.test.ts` yolların router'la eşleştiğini ve örneklerin belgelenen kodları döndüğünü denetler. Yeni bir router eklenirse o teste de eklenir.
- Tasarım ve içerik kararları kullanıcıyla birlikte, tek tek soru sorarak alınır. Kullanıcı onay vermeden uygulamaya geçilmez.
- Alınan kararlar ve planlar `docs/` altında tutulur (ör. `docs/landing-page-plan.md`, `docs/superpowers/specs/`). Sayfayı değiştirmeden önce ilgili dosyayı oku, değişiklikten sonra güncelle.

## Yayından önce

- Erken erişim formu gerçek bir servise bağlanmalı (`submitSignup`); yoksa kayıtlar kaybolur.
- `/api-docs/` ve `/api/openapi.json` kapatılmalı ya da korunmalı (şu an herkese açık).
- Takvim uç noktası (`GET …/appointments`) herkese açık; giriş eklenince korunmalı.

## Doğrulama

- Değişiklikten sonra sayfayı headless Edge ile kontrol et. Chrome ve Playwright kurulu değil.
- Randevu ve takvim sayfaları API'ye ihtiyaç duyar; bunları `npm start` ile açılan `http://localhost:3000` üzerinden kontrol et.
- Edge'in `--window-size` ayarı 500px'in altına inmez. 375px mobil görünümü test etmek için Edge'i `--remote-debugging-port` ile aç ve CDP `Emulation.setDeviceMetricsOverride` kullan. Node 24'te `fetch` ve `WebSocket` hazır geldiği için ek paket gerekmez.
- Kontrol et: 375, 768 ve 1280px'te yan kaydırma olmaması, menü bağlantılarının doğru bölüme gitmesi, formların boş, hatalı ve doğru bilgilerle davranışı, konsolda hata olmaması.
- Saat dilimi: CDP `Emulation.setTimezoneOverride` (ör. `America/New_York`) ile sayfaların yine İstanbul saatini gösterdiğini kontrol et.
- Sunucu kodunu değiştirdiysen tarayıcı kontrolünden önce sunucuyu yeniden başlat (`npm start` değişiklikleri izlemez) ya da `npm run dev` kullan.
- `styles.css`'teki `scroll-behavior: smooth` yüzünden `scrollIntoView` sonrası ekran görüntüsü kaydırma bitmeden alınır; `{ behavior: "instant" }` kullan ya da biraz bekle.
- Swagger'da bir işlemi açtıktan hemen sonra (yaklaşık yarım saniye içinde) gelen "Execute" tıklaması yok sayılır; otomatik testlerde açtıktan sonra kısa bir süre bekle.
- Bilerek tetiklenen 4xx yanıtları için "Failed to load resource" satırları ve `/favicon.ico` 404'ü beklenen durumlar; JavaScript hatası sayılmaz.

## Yasaklar

- Frontend'e React, Vue, Tailwind, jQuery gibi framework veya kütüphane eklemeyin; frontend'de build aracı kullanmayın. Tek istisna: `public/api-docs/` içindeki Swagger UI (CDN'den, sabit sürüm `swagger-ui-dist@5.17.14` ve SRI karmasıyla). Sürüm değişirse karmalar da yeniden hesaplanır.
- Backend'e kullanıcı onayı olmadan yeni `npm` paketi eklemeyin. Mevcut bağımlılıklar: `express`; geliştirme için `typescript`, `@types/express`, `@types/node`.
- TypeScript için derleme/bundle adımı eklemeyin; kod Node ile doğrudan çalışmalı.
- Türkçe dosya veya klasör adı kullanmayın.
- Sayfa metinlerini İngilizce yazmayın.
