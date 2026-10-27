# Backend: Randevu Akışı Tasarımı

Tarih: 27 Ekim 2026
Durum: Uygulandı (plan: `docs/superpowers/plans/2026-10-27-backend-booking.md`)
Dal: `feat/backend`

## Amaç

Ritma'nın asıl ürününün çekirdeğini kurmak: bir müşterinin, hizmet verenin boş saatlerini görüp randevu alabilmesi ve hizmet verenin bu randevuları takviminde görebilmesi. Landing page'deki "Nasıl çalışır" bölümünün 3 adımının çalışan hali.

Veriler bellekte tutulur; sunucu yeniden başlayınca örnek veriye döner.

## Kapsam

Bu alt projede:

1. Hizmet veren ve hizmetleri
2. Haftalık çalışma saatleri ve boş slot hesabı
3. Müşterinin randevu alması
4. Hizmet verenin günlük takvimi
5. Bunlar için iki sayfa: randevu alma ve takvim

Kapsam dışı (sonraki alt projeler):

- Landing'deki erken erişim formunun backend'e bağlanması (önerilen sıradaki alt proje)
- Giriş / kimlik doğrulama, birden fazla hizmet veren kaydı
- Randevu iptali ve değiştirme
- Hatırlatmalar (e-posta/SMS)
- Kalıcı veritabanı
- Yayına alma

## Teknoloji kararları

| Konu | Karar | Neden |
|------|-------|-------|
| Çalışma ortamı | Node.js 24 | Bilgisayarda kurulu; frontend'le aynı dil. |
| Web çatısı | Express | Kullanıcı tercihi. Yönlendirme ve ara katmanlar hazır. |
| Dil | TypeScript, build adımı yok | Node 24 `.ts` dosyalarını doğrudan çalıştırır. Tarih/slot hesaplarında tipler hataları erken yakalar. Tip kontrolü `tsc --noEmit` ile. |
| TypeScript kısıtı | Yalnızca silinebilir sözdizimi: `enum`, `namespace`, parametre özellikleri yok | Node'un tip ayıklama özelliği bunları desteklemez. Yerine birleşim tipleri ve düz nesneler. |
| Testler | `node:test` + yerleşik `fetch` | Ek test paketi gerekmez. |
| Doğrulama | Elle yazılmış küçük doğrulayıcılar | Kapsam küçük; ek kütüphane gerekmez. |
| Frontend | Düz HTML/CSS/JS, `<script type="module">` | Landing'le aynı yaklaşım; build yok. |
| Bağımlılıklar | Çalışma: `express`. Geliştirme: `typescript`, `@types/express`, `@types/node` | Yenileri kullanıcı onayıyla eklenir. |

## Klasör yapısı

```
ritma/
├─ package.json
├─ tsconfig.json
├─ public/                 Express yalnızca bunu sunar
│  ├─ index.html           landing (kökten taşındı)
│  ├─ styles.css           (taşındı)
│  ├─ script.js            (taşındı)
│  ├─ app.css              yeni sayfaların ek stilleri
│  ├─ api.js               ortak fetch ve tarih biçimlendirme
│  ├─ book.html / book.js           müşteri: randevu al
│  └─ calendar.html / calendar.js   hizmet veren: takvim
├─ server/
│  ├─ src/
│  │  ├─ domain/           saf fonksiyonlar (slots.ts, types.ts, validation.ts)
│  │  ├─ store/            Store arayüzü, memory-store.ts, seed.ts
│  │  ├─ routes/           Express yönlendiricileri
│  │  ├─ app.ts            uygulamayı kurar, dinlemez
│  │  └─ server.ts         app'i 3000 portunda dinletir
│  └─ test/
│     ├─ slots.test.ts
│     └─ api.test.ts
└─ docs/
```

Landing dosyaları `public/` altına taşınır; Express kök klasörü sunmadığı için `package.json`, sunucu kodu ve `CLAUDE.md` tarayıcıdan erişilemez. Landing `index.html` dosyası tarayıcıda doğrudan açıldığında da çalışmaya devam eder.

## Alan modeli

Tüm varlıklar bellekte. Sunucu açılırken `seed.ts` örnek veriyi yükler.

```ts
type Provider = { id: string; slug: string; name: string; title: string };

type Service = { id: string; providerId: string; name: string; durationMinutes: number };

// Gün: 1 = Pazartesi … 7 = Pazar. Saatler "HH:MM", yerel saat.
type WeeklyHours = { providerId: string; day: number; ranges: { start: string; end: string }[] }[];

type Appointment = {
  id: string;
  providerId: string;
  serviceId: string;
  start: string;      // ISO 8601, ör. "2026-10-28T09:30:00+03:00"
  end: string;
  clientName: string;
  clientEmail: string;
  createdAt: string;
};
```

Örnek veri:

- Hizmet veren: Ayşe Yılmaz, Diyetisyen, slug `ayse-yilmaz`
- Hizmetler: "Beslenme danışmanlığı" 45 dk, "Takip görüşmesi" 30 dk
- Çalışma saatleri: Pazartesi–Cuma 09:00–12:00 ve 13:00–18:00; hafta sonu kapalı
- Birkaç örnek randevu: takvim sayfası ilk açılışta boş görünmesin diye bugün ve yarın için

## Kurallar

- **Saat dilimi:** Tek saat dilimi, `Europe/Istanbul` (UTC+3, yaz saati yok). Sunucu ve tarayıcı bu dilime göre hesaplar ve gösterir.
- **Slot üretimi:** Seçilen hizmetin süresi kadar bir pencere, her çalışma aralığının içinde 15 dakikalık adımlarla kaydırılır. Pencerenin tamamı aralığın içinde kalmalıdır.
- **Elenen slotlar:** mevcut bir randevuyla çakışanlar (bitişik olanlar çakışma sayılmaz: 09:00–09:45 randevusu varken 09:45 slotu boştur) ve başlangıcı "şu an"dan önce olanlar.
- **Ne kadar ileri:** bugün dahil 14 gün. Bunun dışındaki tarihler için boş liste döner.
- **Müşteriden istenenler:** ad soyad (boş olamaz) ve e-posta (biçimi kontrol edilir).
- **Onay:** randevu anında onaylanır. Aynı saate ikinci istek `409` alır.
- **Çakışma güvenliği:** "slot hâlâ boş mu?" kontrolü ile kaydetme arasında `await` yoktur. Node tek iş parçacıklı olduğu için eşzamanlı iki istekten yalnızca biri kaydedilir.
- **"Şu an":** domain fonksiyonları "şu an"ı parametre olarak alır; testler sabit bir zaman verir.

## API

Tüm uç noktalar JSON döner.

| Yöntem | Yol | Açıklama |
|--------|-----|----------|
| `GET` | `/api/providers/:slug` | Hizmet veren bilgisi ve hizmetleri |
| `GET` | `/api/providers/:slug/slots?serviceId=…&date=YYYY-MM-DD` | O gün için boş başlangıç saatleri |
| `POST` | `/api/providers/:slug/appointments` | Randevu oluşturur |
| `GET` | `/api/providers/:slug/appointments?date=YYYY-MM-DD` | O günün randevuları, başlangıca göre sıralı |

`POST` gövdesi:

```json
{ "serviceId": "…", "start": "2026-10-28T09:30:00+03:00", "clientName": "Mehmet Kaya", "clientEmail": "mehmet@ornek.com" }
```

Başarılı yanıt `201` ve oluşturulan randevu.

Takvim uç noktası şimdilik herkese açık; giriş alt projesinde korunacak.

### Hatalar

Tüm hatalar aynı biçimde döner; mesajlar Türkçe, sayfalar doğrudan gösterir:

```json
{ "error": { "code": "slot_taken", "message": "Bu saat az önce doldu." } }
```

| Durum | Ne zaman | Örnek `code` |
|-------|----------|--------------|
| `400` | Eksik/hatalı veri, slot olmayan başlangıç saati, geçersiz tarih | `invalid_request`, `invalid_slot` |
| `404` | Bilinmeyen hizmet veren veya hizmet | `provider_not_found`, `service_not_found` |
| `409` | Slot dolu | `slot_taken` |
| `500` | Beklenmeyen hata; ayrıntı yalnızca sunucu kaydına yazılır | `internal_error` |

## Katmanlar

- **`domain/`**: Express'ten ve depodan habersiz saf fonksiyonlar. `slots.ts` çalışma saatleri, hizmet süresi, mevcut randevular ve "şu an"dan boş slotları hesaplar. `validation.ts` gelen veriyi kontrol eder.
- **`store/`**: `Store` arayüzü ve bellekteki uygulaması (`memory-store.ts`). Gerçek veritabanına geçişte yalnızca bu katman değişir.
- **`routes/`**: İsteği doğrular, domain ve store'u çağırır, yanıtı biçimlendirir. Hata yanıtları tek bir hata ara katmanından geçer.
- **`app.ts`**: `createApp({ store, now })` Express uygulamasını kurar (`public/` statik sunumu + `/api` yönlendiricileri) ama dinlemez. Testler buna kendi store'unu ve sabit "şu an"ı verir.
- **`server.ts`**: örnek veriyle bir store kurar, `createApp` çağırır, 3000 portunda dinler.

## Sayfalar

Düz HTML/CSS/JS, metinler Türkçe. Renkler, yazı tipi ve `.card`, `.btn` gibi sınıflar `styles.css`'ten gelir; yeni sayfalara özgü stiller `app.css`'te, renkler yine `:root` değişkenlerinden. 375, 768 ve 1280px'te düzgün görünmeli.

### `book.html?p=ayse-yilmaz` (müşteri)

1. Üstte hizmet verenin adı ve unvanı; hizmet kartları, biri seçilir.
2. Bugünden itibaren 14 günlük yatay gün şeridi; bir gün seçilince o günün boş saatleri buton olarak listelenir. Boşsa "Bu gün için boş saat yok".
3. Saat seçilince ad soyad ve e-posta formu açılır; landing formuyla aynı kontrol ve uyarı davranışı.
4. Gönderince onay ekranı: "Randevunuz onaylandı" ve hizmet, tarih, saat.
5. `409` gelirse saat listesi yenilenir, "Bu saat az önce doldu, lütfen başka bir saat seçin" uyarısı gösterilir.
6. `p` parametresi yoksa veya hizmet veren bulunamazsa "Bu randevu sayfası bulunamadı" mesajı.

### `calendar.html?p=ayse-yilmaz` (hizmet veren)

- Hero'daki takvim görselinin çalışan hali: tarih başlığı, "‹ ›" ile gün değiştirme, randevular saat sırasıyla (saat, müşteri adı, hizmet ve süre).
- Boş günde "Bu gün için randevu yok".
- Üstte "Henüz giriş yok, bu sayfa şimdilik herkese açık" notu.

### Ortak

- `api.js`: `fetch` yardımcısı (hata biçimini çözer) ve `Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul' })` ile tarih/saat biçimlendirme.
- Landing'deki butonlar ve form değişmez; landing'den yeni sayfalara bağlantı verilmez.

## Test ve doğrulama

Uygulama TDD ile yazılır: önce başarısız test, sonra kod.

**`slots.test.ts`:**
- Çalışma saatleri ve öğle arası doğru bölünür.
- Aralığın sonuna sığmayan slot üretilmez (ör. 17:30'da 45 dk).
- Çakışan slotlar elenir; bitişik randevu çakışma sayılmaz.
- "Şu an"dan önceki slotlar ve geçmiş günler elenir.
- Hafta sonu ve 14 gün dışı boş döner.

**`api.test.ts`** (her test kendi boş store'u ve sabit "şu an"ıyla):
- Hizmet veren bilgisi döner; bilinmeyen slug `404`.
- Slot listesi doğru döner.
- Randevu oluşturulur (`201`) ve o slot listeden kalkar.
- Aynı slota ikinci istek `409`.
- Hatalı veri `400` ve Türkçe mesaj.
- Takvim uç noktası o günün randevularını sıralı döner.

**Sayfa doğrulaması** (headless Edge + CDP, çalışan sunucu üzerinden):
- 375, 768 ve 1280px'te yan kaydırma yok.
- Randevu akışı baştan sona tamamlanır; alınan randevu takvim sayfasında görünür.
- Dolu slot uyarısı çıkar.
- Konsolda hata yok.
- Landing `/` adresinde eskisi gibi çalışır.

## Komutlar

| Komut | Ne yapar |
|-------|----------|
| `npm install` | İlk kurulum |
| `npm start` | `node server/src/server.ts`; sayfalar `http://localhost:3000` |
| `npm run dev` | Aynısı, `--watch` ile |
| `npm test` | `node --test` |
| `npm run typecheck` | `tsc --noEmit` |

## Doküman ve yapılandırma güncellemeleri

- **`CLAUDE.md`:** proje özetine backend; teknoloji bölümü frontend (değişmedi) ve backend (Node 24 + Express + TypeScript, build yok) olarak ikiye ayrılır; dosya yolları `public/` ve `server/`; komutlar eklenir; doğrulama bölümüne sunucu üzerinden kontrol eklenir. Yasaklar: frontend'de framework/kütüphane yasağı sürer; `npm` ve `package.json` yasağı kalkar, backend bağımlılıkları kullanıcı onayıyla eklenir.
- **`.gitignore`:** `node_modules/`.
- **`docs/landing-page-plan.md`:** dosya yolları `public/` olarak güncellenir.

## Doğrulama sonuçları (27 Ekim 2026)

- `npm test`: 37/37 geçti; `npm run typecheck`: hatasız.
- Headless Edge, `npm start` ile açılan sunucu üzerinden:
  - Randevu akışı baştan sona tamamlandı; alınan randevu takvim sayfasında doğru saatte göründü.
  - Aynı saate iki sekmeden randevu: ikinci sekmede "Bu saat az önce doldu…" uyarısı çıktı, saat listeden kalktı.
  - Boş, hatalı ve doğru bilgilerle form davranışı doğru; bulunamayan hizmet veren için hata mesajı gösterildi.
  - Tarayıcı saat dilimi America/New_York iken saatler ve gün şeridi İstanbul saatine göre gösterildi.
  - Landing `/` adresinde eskisi gibi çalıştı (menü bağlantıları, erken erişim formu).
  - Üç sayfada 375, 768 ve 1280px genişliklerde yan kaydırma yok; konsolda JavaScript hatası yok.
