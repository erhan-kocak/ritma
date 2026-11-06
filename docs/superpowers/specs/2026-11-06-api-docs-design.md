# API Deneme Arayüzü (Swagger UI) Tasarımı

Tarih: 6 Kasım 2026
Durum: Tasarım onaylandı, uygulama bekliyor
Dal: `feat/api-docs`

## Amaç

Backend uç noktalarını tarayıcıdan, Swagger tarzı bir arayüzle denemek: sayfayı aç, 4 uç noktayı gör, parametreleri ve gövdeyi doldur, gönder, durum kodunu ve JSON yanıtı gör. Hata durumları (400, 404, 409) da aynı yerden denenebilmeli.

Bu bir geliştirme aracıdır; müşterinin ya da hizmet verenin göreceği bir ürün sayfası değildir.

## Alınan kararlar

| Konu | Karar | Neden |
|------|-------|-------|
| Yaklaşım | Gerçek Swagger UI, CDN'den; uç noktalar elle yazılmış OpenAPI belgesinde | Bilinen Swagger görünümü, yeni npm paketi gerekmez, OpenAPI belgesi ileride de işe yarar. |
| Kural istisnası | "Frontend'e kütüphane yok" kuralına yalnızca `public/api-docs/` için istisna | Ürün sayfaları değil, bir geliştirme aracı. Kullanıcı onayladı. |
| Dil | Başlık ve tüm açıklamalar Türkçe; Swagger'ın kendi butonları ("Try it out", "Execute") İngilizce kalır | Swagger UI'nin dil desteği yok; kullanıcı kabul etti. |
| Erişim | Her zaman açık, ortam koşulu yok | Ürün henüz yayında değil; daha basit. Yayından önce kapatılmalı (aşağıya bakın). |
| Uyum denetimi | Yollar ve örnekler testle denetlenir | Belge koddan saparsa `npm test` kırılır. |

## Yapı

```
GET /api-docs/          →  public/api-docs/index.html   Swagger UI (CDN)
GET /api/openapi.json   →  server/src/openapi.ts         OpenAPI belgesini üretir
```

### `server/src/openapi.ts`

OpenAPI 3.1 belgesini bir TypeScript nesnesi olarak üreten `createOpenApiDocument(now: Date)` fonksiyonu.

- Belge her istekte üretilir; örnek tarih "bugünden sonraki ilk iş günü" (İstanbul saatine göre, `time.ts` yardımcılarıyla). Durağan bir tarih birkaç gün sonra geçmişte kalır ve örnekler boş liste ya da 400 dönmeye başlar.
- "İlk iş günü" hesabı ayrı, dışa açık bir fonksiyondur (`nextWorkingDayAfter(date)`); test edilir.

### `server/src/app.ts`

`GET /api/openapi.json` rotası eklenir. Mevcut `/api` 404 yakalayıcısından **önce** tanımlanır. Belge, uygulamanın `now` bağımlılığıyla üretilir; testler sabit zaman verir.

### `public/api-docs/index.html`

- `swagger-ui-dist@5.17.14` CSS ve JS dosyalarını jsDelivr'dan sabit sürüm ve SRI (`integrity`) karmasıyla yükler.
- `url: "/api/openapi.json"` ile Swagger UI'yi başlatır.
- Türkçe `<title>` ve küçük bir Ritma başlık şeridi; renkler `styles.css`'teki `:root` değişkenlerinden.
- Express `public/` klasörünü zaten sunduğu için ek sunucu ayarı gerekmez. `/api-docs` adresi `/api-docs/`'a yönlendirilir.

## Belgenin içeriği

| Uç nokta | Açıklama | Belgelenen yanıtlar |
|---|---|---|
| `GET /api/providers/{slug}` | Hizmet veren ve hizmetleri | 200, 404 |
| `GET /api/providers/{slug}/slots?serviceId&date` | O günün boş başlangıç saatleri | 200, 400, 404 |
| `POST /api/providers/{slug}/appointments` | Randevu oluşturur | 201, 400, 404, 409 |
| `GET /api/providers/{slug}/appointments?date` | O günün randevuları | 200, 400, 404 |

Parametre varsayılanları: `slug=ayse-yilmaz`, `serviceId=nutrition-45`, `date=<bugünden sonraki ilk iş günü>`. "Try it out" → "Execute" hiçbir şey değiştirmeden anlamlı bir sonuç verir.

### POST gövdesi örnekleri

Swagger'daki açılır listede, bu sırayla:

| # | Örnek | Beklenen |
|---|---|---|
| 1 | Geçerli randevu (11:00, Beslenme danışmanlığı 45 dk) | 201 |
| 2 | Aynı isteği tekrar gönder (önce 1'i gönderin) | 409 `slot_taken` |
| 3 | Bozuk e-posta | 400 `invalid_request` |
| 4 | Boş ad | 400 `invalid_request` |
| 5 | Saat dilimi yok (`…T11:00:00`) | 400 `invalid_request` |
| 6 | 15 dakikalık adıma uymayan saat (11:07) | 400 `invalid_slot` |
| 7 | Çalışma saati dışı (19:00) | 400 `invalid_slot` |
| 8 | Olmayan hizmet | 404 `service_not_found` |

11:00 neden: örnek veri randevuları bugünden başlayan ilk iki iş gününe koyar (birinci gün 10:00–10:45, 14:00, 16:30; ikinci gün 09:30–10:15). "Bugünden sonraki ilk iş günü" bunlardan biri ya da ikisinden sonraki bir gündür; her durumda 11:00 boştur.

Her örnekte beklenen durum `x-expected-status` alanında tutulur (OpenAPI uzantısı; Swagger UI göstermez, testler okur).

### Şemalar

`Provider`, `Service`, `Appointment`, `ErrorResponse` (`{ error: { code, message } }`). Hata kodları `enum` olarak: `invalid_request`, `invalid_slot`, `provider_not_found`, `service_not_found`, `slot_taken`, `not_found`, `internal_error`.

Belgenin giriş açıklaması: veriler bellekte; 1. örnek bir kez gönderilince o saat dolar; sunucu yeniden başlayınca veriler örnek haline döner.

## Testler (`server/test/openapi.test.ts`, TDD)

1. **Sunuluyor:** `GET /api/openapi.json` 200, JSON, `openapi: "3.1.0"`; `GET /api-docs/` HTML döner.
2. **Yollar kodla eşleşiyor:** `providersRouter`'ın rotaları (yöntem + yol, `:slug` → `{slug}`, `/api/providers` önekiyle) ile belgedeki yollar birebir aynı. Yeni bir router eklenirse bu teste de eklenir.
3. **Örnekler doğru:** örnek veri (`createSeedData`) ve sabit "şu an" ile sunucu açılır; POST örnekleri belgedeki sırayla gönderilir ve `x-expected-status` ile karşılaştırılır; GET uç noktaları varsayılan parametrelerle 200 döner; her `x-expected-status` o uç noktanın belgelenen yanıtları arasındadır.
4. **Tarih hesabı:** `nextWorkingDayAfter` hafta içi ertesi günü, Cuma ve Cumartesi için Pazartesi'yi döner.

`npm test`, `TZ=UTC npm test` ve `npm run typecheck` geçmeli.

## Tarayıcıda doğrulama

Headless Edge + CDP ile `http://localhost:3000/api-docs/`:

- Sayfa açılır, 4 uç nokta görünür, CDN dosyaları SRI ile yüklenir.
- Bir GET ve bir POST "Execute" ile çalışır.
- 375, 768 ve 1280px'te sayfa düzeyinde yan kaydırma yok (Swagger'ın kod kutularının kendi içinde kayması normal).
- Konsolda JavaScript hatası yok.

## Belgelerde güncellenecekler

CLAUDE.md:

- Komutlar: `/api-docs/` adresi.
- Dosyalar: `server/src/openapi.ts`, `public/api-docs/index.html`.
- Yasaklar: Swagger UI istisnası (yalnızca `public/api-docs/`).
- Kurallar: uç nokta eklenince ya da değişince `openapi.ts` de güncellenir.
- Yayından önce: `/api-docs` ve `/api/openapi.json` kapatılmalı ya da korunmalı (erken erişim formu notunun yanına).

## Kapsam dışı

- Swagger butonlarını Türkçeleştirmek.
- Belgeyi koddan otomatik üretmek (ek paket gerekir).
- Yetkilendirme (henüz giriş yok).
