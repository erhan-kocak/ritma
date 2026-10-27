# Backend Randevu Akışı Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bellekte veri tutan bir Express + TypeScript backend'i ve iki sayfa (randevu alma, takvim) ile müşterinin boş saat görüp randevu alabildiği, hizmet verenin de bunu takviminde gördüğü uçtan uca akışı kurmak.

**Architecture:** `server/src/domain` saf fonksiyonlar (zaman, slot hesabı, doğrulama), `server/src/store` bellekteki depo, `server/src/routes` Express yönlendiricileri. `createApp({ store, now })` hem `/api`'yi hem `public/` klasörünü sunar. Sayfalar düz HTML/CSS/JS, `public/` altında.

**Tech Stack:** Node 24.21 (yerleşik TypeScript tip ayıklama), Express 5.3, TypeScript 5.9.3 (yalnızca tip kontrolü), `node:test`, yerleşik `fetch`.

**Spec:** `docs/superpowers/specs/2026-10-27-backend-booking-design.md`

## Global Constraints

- Node 24, `.ts` dosyaları build olmadan çalışır: `node server/src/server.ts`. Göreli import'lar `.ts` uzantısıyla yazılır (`import { x } from "./time.ts"`).
- Yalnızca silinebilir TypeScript sözdizimi: `enum`, `namespace`, constructor parametre özellikleri (`constructor(private x)`) yok. `tsconfig.json`'da `erasableSyntaxOnly: true` bunu zorlar.
- `package.json`: `"type": "module"`, `"private": true`. Bağımlılıklar: `express@^5.3.0`; geliştirme: `typescript@~5.9.3`, `@types/express@^5.0.6`, `@types/node@^24.19.2`. Başka paket eklenmez.
- TypeScript 7 yerine 5.9 seçildi: 7 yeni yerel derleyici, 5.9 tüm gereken ayarlarla (`erasableSyntaxOnly`, `allowImportingTsExtensions`) kararlı.
- Saat dilimi sabit `Europe/Istanbul` = `+03:00`, yaz saati yok. Tüm zaman damgaları `YYYY-MM-DDTHH:MM:00+03:00` biçiminde üretilir ve saklanır.
- Slot adımı 15 dk; randevu penceresi bugün dahil 14 gün.
- Dosya/klasör adları İngilizce; sayfada görünen metinler ve API hata mesajları Türkçe.
- Frontend'de framework/kütüphane yok; `<script type="module">`, build yok. Renkler `public/styles.css` içindeki `:root` değişkenlerinden; yeni değer gerekirse önce `:root`'a eklenir.
- Her sayfa 375, 768 ve 1280px'te yan kaydırmasız.
- Commit mesajları Türkçe, sonu `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Bozuk JSON gövdesi** (`{"serviceId":`): `500` değil, `400 invalid_request` "İstek okunamadı." dönmeli. Test: Task 4.
- **Aynı anı farklı biçimde gönderen `start`** (`2026-10-28T06:30:00Z` = 09:30 İstanbul): anlık zamana göre karşılaştırılıp kabul edilmeli, `+03:00` biçiminde saklanmalı. Test: Task 4.
- **Geçersiz takvim tarihi** (`date=2026-02-30`, `date=bugün`, `date` yok): `400 invalid_request` "Geçersiz tarih." dönmeli, boş liste değil. Test: Task 2 (`isValidDate`) ve Task 4.
- **Sadece boşluktan oluşan veya çok uzun ad**: ad kırpılır, boşsa "Lütfen adınızı ve soyadınızı yazın.", 100 karakterden uzunsa "Ad soyad en fazla 100 karakter olabilir." Test: Task 3.
- **Tarayıcı başka saat diliminde** (ör. New York): sayfalar yine İstanbul saatini göstermeli (09:30 → "09:30"), gün şeridi İstanbul'daki bugünden başlamalı. Test: Task 7 (CDP `Emulation.setTimezoneOverride`).

---

### Task 1: İskelet, klasör taşıma ve statik sunum

**Files:**
- Move: `index.html`, `styles.css`, `script.js` → `public/` (`git mv`)
- Create: `package.json`, `tsconfig.json`, `server/src/app.ts`, `server/src/server.ts`, `server/test/app.test.ts`
- Modify: `.gitignore` (ekle: `node_modules/`), `CLAUDE.md`, `docs/landing-page-plan.md`

**Interfaces:**
- Produces: `createApp(deps: AppDeps): express.Express` (`server/src/app.ts`). Bu task'ta `AppDeps = {}`; Task 4 `{ store: Store; now: () => Date }` olarak genişletir.
- Produces: test yardımcısı `startTestServer(app): Promise<{ baseUrl: string; close(): Promise<void> }>` (`server/test/helpers.ts`): `app.listen(0)` ile açar, `http://127.0.0.1:<port>` döner.

- [ ] **Step 1: Dosyaları taşı ve `package.json`, `tsconfig.json` oluştur**

`package.json` scriptleri:
```json
"start": "node server/src/server.ts",
"dev": "node --watch server/src/server.ts",
"test": "node --test \"server/test/**/*.test.ts\"",
"typecheck": "tsc --noEmit"
```
`tsconfig.json` `compilerOptions`: `target: "es2023"`, `module: "nodenext"`, `moduleResolution: "nodenext"`, `strict: true`, `noEmit: true`, `allowImportingTsExtensions: true`, `erasableSyntaxOnly: true`, `verbatimModuleSyntax: true`, `types: ["node"]`; `include: ["server"]`.

Run: `npm install express@^5.3.0 && npm install -D typescript@~5.9.3 @types/express@^5.0.6 @types/node@^24.19.2`
Expected: `node_modules/` oluşur, `git status`'ta görünmez.

- [ ] **Step 2: Başarısız testi yaz** (`server/test/app.test.ts`)

```ts
test("GET / landing sayfasını döner", async () => {
  // res.status 200, content-type text/html, gövde "Randevular sizde" içerir
});
test("public dışındaki dosyalar sunulmaz", async () => {
  // GET /package.json → 404, GET /server/src/app.ts → 404, GET /CLAUDE.md → 404
});
```

- [ ] **Step 3: Testin başarısız olduğunu gör**

Run: `npm test`
Expected: FAIL, `app.ts` bulunamıyor.

- [ ] **Step 4: `createApp` ve `server.ts`'i yaz**

`createApp`, `express.static` ile yalnızca `public/` klasörünü sunar (yol `import.meta.dirname` üzerinden `../../public`). `server.ts` `PORT` ortam değişkeni ya da `3000` ile dinler ve `Ritma: http://localhost:3000` yazar.

- [ ] **Step 5: Testlerin ve tip kontrolünün geçtiğini gör**

Run: `npm test && npm run typecheck`
Expected: 2 test PASS, `tsc` çıktısız.

- [ ] **Step 6: Dokümanları güncelle**

- `CLAUDE.md`: spec'teki "Doküman ve yapılandırma güncellemeleri" maddesine göre (özet, teknoloji ikiye ayrılır, `public/` ve `server/` yolları, komutlar, sunucu üzerinden doğrulama, yasakların güncellenmesi). Dosya listesinde `index.html` → `public/index.html` vb.
- `docs/landing-page-plan.md`: "Dosyalar" bölümündeki yollar `public/` ile.
- `CLAUDE.local.md`: sayfa adresi `.../Ritma/public/index.html` olur; `npm start` sonrası `http://localhost:3000` notu eklenir. (Git'e girmez.)

- [ ] **Step 7: Landing'in hâlâ doğrudan açıldığını kontrol et**

Run: headless Edge ile `file:///C:/Users/Erhan%20Ko%C3%A7ak/Desktop/Projects/Ritma/public/index.html` ve `http://localhost:3000/` açılır.
Expected: ikisinde de stil yüklü, konsolda hata yok.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Backend iskeleti: Express + TypeScript, landing public/ altına taşındı"
```

---

### Task 2: Zaman yardımcıları ve slot hesabı

**Files:**
- Create: `server/src/domain/types.ts`, `server/src/domain/time.ts`, `server/src/domain/slots.ts`
- Test: `server/test/time.test.ts`, `server/test/slots.test.ts`

**Interfaces:**
- Produces (`types.ts`): spec'teki `Provider`, `Service`, `Appointment`; ayrıca
  ```ts
  type TimeRange = { start: string; end: string };        // "HH:MM"
  type WorkingDay = { providerId: string; day: number; ranges: TimeRange[] }; // 1=Pzt … 7=Paz
  ```
- Produces (`time.ts`):
  - `TZ_OFFSET = "+03:00"`, `SLOT_STEP_MINUTES = 15`, `BOOKING_WINDOW_DAYS = 14`
  - `isValidDate(date: string): boolean`: `YYYY-MM-DD` biçimi ve gerçek takvim günü (`2026-02-30` → false)
  - `localDateOf(instant: Date): string`: İstanbul'daki takvim günü
  - `addDays(date: string, days: number): string`
  - `dayOfWeek(date: string): number`: 1=Pazartesi … 7=Pazar
  - `parseHm(hm: string): number`: "09:30" → 570
  - `toLocalIso(date: string, minutes: number): string`: `("2026-10-28", 570)` → `"2026-10-28T09:30:00+03:00"`
- Produces (`slots.ts`):
  ```ts
  getAvailableSlots(input: {
    date: string; durationMinutes: number; workingDays: WorkingDay[];
    appointments: Appointment[]; now: Date;
  }): string[]   // toLocalIso biçiminde, artan sırada
  ```

Test sabitleri: `now = new Date("2026-10-28T08:00:00+03:00")` (Çarşamba). Çalışma saatleri Pzt–Cum `09:00–12:00` ve `13:00–18:00`.

- [ ] **Step 1: `time.test.ts`'i yaz**

```ts
assert.equal(isValidDate("2026-10-28"), true);
assert.equal(isValidDate("2026-02-30"), false);
assert.equal(isValidDate("2026-10-8"), false);
assert.equal(isValidDate("bugün"), false);
assert.equal(localDateOf(new Date("2026-10-27T21:30:00Z")), "2026-10-28"); // İstanbul'da 00:30
assert.equal(addDays("2026-10-31", 1), "2026-11-01");
assert.equal(dayOfWeek("2026-10-26"), 1);
assert.equal(dayOfWeek("2026-11-01"), 7);
assert.equal(toLocalIso("2026-10-28", 570), "2026-10-28T09:30:00+03:00");
```

- [ ] **Step 2: `slots.test.ts`'i yaz**

```ts
test("aralıkları ve öğle arasını böler, sığmayan slotu üretmez", () => {
  // 45 dk, 2026-10-28, randevu yok
  // ilk "2026-10-28T09:00:00+03:00", "…11:15…" var, "…11:30…" yok, "…12:00…" yok,
  // "…13:00…" var, son "…17:15…", "…17:30…" yok; toplam 28 slot
});
test("30 dk hizmette 30 slot üretir, son slot 17:30", () => {});
test("çakışanları eler, bitişik randevu çakışma sayılmaz", () => {
  // randevular: 09:00–09:45 ve 10:30–11:00 (45 dk hizmet), değerler aşağıda
});
test("şu andan önceki slotları eler", () => {
  // now = 2026-10-28T10:05:00+03:00 → ilk slot "…10:15…"
});
test("hafta sonu, geçmiş gün ve 14 gün dışı boş döner", () => {
  // "2026-10-31" (Cumartesi) → []; "2026-10-27" → []
  // "2026-11-10" (bugün+13) → boş değil; "2026-11-11" (bugün+14) → []
});
```
Üçüncü testteki beklenen değerler kesin olarak: randevular `09:00–09:45` ve `10:30–11:00`, 45 dk hizmet için **yok:** `09:00, 09:15, 09:30, 10:00, 10:15, 10:30, 10:45`; **var:** `09:45` (09:45–10:30, iki randevuya da bitişik), `11:00`.

- [ ] **Step 3: Testlerin başarısız olduğunu gör**

Run: `npm test`
Expected: FAIL, modüller bulunamıyor.

- [ ] **Step 4: `types.ts`, `time.ts`, `slots.ts`'i yaz**

`time.ts` tarih aritmetiğini `Date.UTC` üzerinden yapar (saat dilimine bağlı `Date` yöntemleri kullanılmaz); `localDateOf` anı 3 saat ileri kaydırıp UTC gününü alır. `getAvailableSlots`: tarih geçersizse, `localDateOf(now)`'dan önceyse ya da `addDays(today, BOOKING_WINDOW_DAYS - 1)`'den sonraysa `[]`; o günün `WorkingDay` aralıklarında `start` dakikasından `end - duration`'a kadar 15 dk adımla aday üretir; adayın `[başlangıç, bitiş)` aralığı bir randevunun `[start, end)` aralığıyla kesişiyorsa (anlık zaman karşılaştırması, `Date.parse`) ya da başlangıç `now`'dan önceyse eler.

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck`
Expected: tüm testler PASS.

- [ ] **Step 6: Commit**

```bash
git add server && git commit -m "Slot hesabı ve zaman yardımcıları"
```

---

### Task 3: Doğrulama, depo ve örnek veri

**Files:**
- Create: `server/src/domain/validation.ts`, `server/src/store/store.ts`, `server/src/store/memory-store.ts`, `server/src/store/seed.ts`
- Test: `server/test/validation.test.ts`, `server/test/memory-store.test.ts`, `server/test/fixtures.ts`

**Interfaces:**
- Produces (`validation.ts`):
  ```ts
  type AppointmentInput = { serviceId: string; start: string; clientName: string; clientEmail: string };
  type ValidationResult = { ok: true; value: AppointmentInput } | { ok: false; message: string };
  validateAppointmentInput(body: unknown): ValidationResult
  ```
  Değerler kırpılır. Kontrol sırası ve mesajlar:
  - `serviceId` boş/string değil → "Lütfen bir hizmet seçin."
  - `start` boş ya da `Date.parse` ile okunamıyor → "Lütfen bir saat seçin."
  - `clientName` boş → "Lütfen adınızı ve soyadınızı yazın."; 100 karakterden uzun → "Ad soyad en fazla 100 karakter olabilir."
  - `clientEmail` boş → "Lütfen e-posta adresinizi yazın."; `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` ile uyuşmuyor → "Geçerli bir e-posta adresi yazın."
  - `body` nesne değilse → "İstek okunamadı."
- Produces (`store.ts`):
  ```ts
  type NewAppointment = Omit<Appointment, "id" | "createdAt">;
  interface Store {
    getProviderBySlug(slug: string): Provider | undefined;
    listServices(providerId: string): Service[];
    getService(providerId: string, serviceId: string): Service | undefined;
    listWorkingDays(providerId: string): WorkingDay[];
    listAppointments(providerId: string, date?: string): Appointment[]; // start'a göre sıralı; date verilirse o İstanbul günü
    addAppointment(input: NewAppointment, now: Date): Appointment;      // id: crypto.randomUUID(), createdAt: now.toISOString()
  }
  type StoreData = { providers: Provider[]; services: Service[]; workingDays: WorkingDay[]; appointments: Appointment[] };
  ```
- Produces: `createMemoryStore(data: StoreData): Store` (verinin kopyasını tutar), `createSeedData(now: Date): StoreData` (`seed.ts`).
- Produces (`server/test/fixtures.ts`): `TEST_NOW = new Date("2026-10-28T08:00:00+03:00")`, `testData(): StoreData`. Hizmet veren `{ id: "p1", slug: "ayse-yilmaz", name: "Ayşe Yılmaz", title: "Diyetisyen" }`; hizmetler `s45` "Beslenme danışmanlığı" 45 dk, `s30` "Takip görüşmesi" 30 dk; Pzt–Cum `09:00–12:00`, `13:00–18:00`; randevu yok.

- [ ] **Step 1: `validation.test.ts`'i yaz**

Geçerli girdi kırpılmış haliyle `ok: true` döner (`"  Mehmet Kaya "` → `"Mehmet Kaya"`). Her mesaj için bir test: `null` gövde, `serviceId` yok, `start: "yarın"`, `clientName: "   "`, `clientName: "a".repeat(101)`, `clientEmail: ""`, `clientEmail: "mehmet@"`; mesajlar yukarıdakiyle birebir.

- [ ] **Step 2: `memory-store.test.ts`'i yaz**

```ts
test("listAppointments güne göre süzer ve sıralar", () => {
  // 28 Ekim 14:00, 28 Ekim 09:00, 29 Ekim 10:00 eklenir
  // listAppointments("p1", "2026-10-28") → başlangıçlar [09:00, 14:00]
});
test("addAppointment id ve createdAt atar, veriyi dışarıdan değiştirilemez tutar", () => {
  // dönen randevunun id'si boş değil, createdAt === TEST_NOW.toISOString()
  // testData() nesnesine sonradan push etmek store'u etkilemez
});
test("getService başka hizmet verenin hizmetini döndürmez", () => {});
test("createSeedData bugün ve yarın için randevu içerir", () => {
  // createSeedData(TEST_NOW) → en az bir randevu "2026-10-28", en az bir randevu "2026-10-29" gününde;
  // hepsi çalışma saatleri içinde ve birbiriyle çakışmıyor
});
```

- [ ] **Step 3: Testlerin başarısız olduğunu gör**

Run: `npm test`
Expected: FAIL, modüller bulunamıyor.

- [ ] **Step 4: Modülleri yaz**

`createSeedData`: hizmet veren, hizmetler ve çalışma saatleri `testData()` ile aynı değerler (id'ler `"ayse-yilmaz"`, `"nutrition-45"`, `"follow-up-30"`); randevular `localDateOf(now)` ve ertesi gün için 10:00 "Mehmet Kaya" (45 dk), 14:00 "Zeynep Demir" (30 dk), 16:30 "Can Öztürk" (30 dk) gibi 3–4 kayıt; e-postalar `@ornek.com`.

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck`
Expected: tüm testler PASS.

- [ ] **Step 6: Commit**

```bash
git add server && git commit -m "Doğrulama, bellekteki depo ve örnek veri"
```

---

### Task 4: API uç noktaları ve hata yönetimi

**Files:**
- Create: `server/src/errors.ts`, `server/src/routes/providers.ts`
- Modify: `server/src/app.ts`, `server/src/server.ts`
- Test: `server/test/api.test.ts`

**Interfaces:**
- Consumes: Task 2 `getAvailableSlots`, `isValidDate`, `localDateOf`, `toLocalIso`; Task 3 `Store`, `validateAppointmentInput`, `createMemoryStore`, `createSeedData`, `testData`, `TEST_NOW`; Task 1 `startTestServer`.
- Produces: `createApp(deps: { store: Store; now: () => Date }): express.Express`.
- Produces (`errors.ts`): `class ApiError extends Error { status: number; code: string }` (alanlar constructor gövdesinde atanır) ve `errorHandler: express.ErrorRequestHandler`.
- Produces: spec'teki dört uç nokta. Yanıt biçimleri:
  - `GET /api/providers/:slug` → `{ provider: Provider, services: Service[] }`
  - `GET …/slots` → `{ date: string, slots: string[] }`
  - `POST …/appointments` → `201`, `{ appointment: Appointment }`
  - `GET …/appointments` → `{ date: string, appointments: (Appointment & { serviceName: string; durationMinutes: number })[] }`

Hata kodları ve mesajları:

| Durum | `code` | `message` |
|---|---|---|
| 400 | `invalid_request` | doğrulayıcı mesajı; bozuk JSON → "İstek okunamadı."; geçersiz/eksik `date` → "Geçersiz tarih." |
| 400 | `invalid_slot` | "Seçilen saat uygun değil." |
| 404 | `provider_not_found` | "Hizmet veren bulunamadı." |
| 404 | `service_not_found` | "Hizmet bulunamadı." |
| 404 | `not_found` | "Bulunamadı." (bilinmeyen `/api/...` yolu) |
| 409 | `slot_taken` | "Bu saat az önce doldu." |
| 500 | `internal_error` | "Beklenmeyen bir hata oluştu." (asıl hata `console.error` ile) |

`POST` akışı: doğrula → hizmeti bul → `date = localDateOf(new Date(start))`; `start` anı, randevular yok sayılarak hesaplanan slotlardan birine denk gelmiyorsa `400 invalid_slot`; mevcut randevularla hesaplanan slotlarda yoksa `409 slot_taken`; varsa `toLocalIso` biçimindeki başlangıç ve bitişle `addAppointment`. Kontrol ile kayıt arasında `await` yok.

- [ ] **Step 1: `api.test.ts`'i yaz**

Her test `createApp({ store: createMemoryStore(testData()), now: () => TEST_NOW })` ile kendi sunucusunu açar.
```ts
test("hizmet veren ve hizmetleri döner");                    // 200, provider.name "Ayşe Yılmaz", 2 hizmet
test("bilinmeyen slug 404 provider_not_found");
test("slot listesi döner");                                  // s45, 2026-10-28 → 28 slot, ilki 09:00
test("geçersiz ya da eksik tarih 400");                       // date=2026-02-30 ve date yok → invalid_request, "Geçersiz tarih."
test("bilinmeyen hizmet 404 service_not_found");             // slots ve POST için
test("randevu oluşturur ve slot listeden kalkar");           // POST 09:30 → 201; ardından slots'ta 09:30 yok, 09:00 yok, 10:15 var
test("aynı slota ikinci istek 409 slot_taken");              // mesaj "Bu saat az önce doldu."
test("slot olmayan saat 400 invalid_slot");                  // 09:10, 12:00 ve 2026-10-31T10:00
test("hatalı veri 400 ve Türkçe mesaj");                     // clientEmail "mehmet@" → "Geçerli bir e-posta adresi yazın."
test("bozuk JSON 400 İstek okunamadı");                      // gövde '{"serviceId":', content-type application/json
test("aynı an farklı biçimde kabul edilir");                 // start "2026-10-28T06:30:00Z" → 201, appointment.start "2026-10-28T09:30:00+03:00"
test("takvim o günün randevularını sıralı döner");           // 14:00 ve 09:30 eklenir → [09:30, 14:00], serviceName dolu
test("bilinmeyen /api yolu 404 not_found");
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npm test`
Expected: FAIL, uç noktalar 404 / `createApp` imzası uyuşmuyor.

- [ ] **Step 3: `errors.ts`, `routes/providers.ts`'i yaz, `app.ts`'i genişlet**

`app.ts` sırası: `express.json()` → `/api/providers` yönlendiricisi → `/api` için `not_found` → `express.static(public)` → `errorHandler`. `errorHandler` Express'in JSON ayrıştırma hatasını (`err.type === "entity.parse.failed"`) `invalid_request` "İstek okunamadı." olarak çevirir. `server.ts`: `createApp({ store: createMemoryStore(createSeedData(new Date())), now: () => new Date() })`.

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npm test && npm run typecheck`
Expected: tüm testler PASS.

- [ ] **Step 5: Elle dene**

Run: `npm start`, ardından `curl http://localhost:3000/api/providers/ayse-yilmaz`
Expected: `provider` ve 2 hizmet içeren JSON.

- [ ] **Step 6: Commit**

```bash
git add server && git commit -m "Randevu API uç noktaları ve hata yönetimi"
```

---

### Task 5: Ortak frontend modülü ve randevu alma sayfası

**Files:**
- Create: `public/api.js`, `public/app.css`, `public/book.html`, `public/book.js`

**Interfaces:**
- Consumes: Task 4'teki uç noktalar ve hata biçimi.
- Produces (`api.js`, ES modülü):
  - `class ApiError extends Error { status; code }`
  - `getJson(path)`, `postJson(path, body)`: başarıda JSON; hata yanıtında `ApiError` (mesaj sunucudan; ağ hatasında "Sunucuya ulaşılamadı. Lütfen tekrar deneyin.")
  - `todayInIstanbul(): string` (`YYYY-MM-DD`), `addDays(date, n): string`
  - `formatTime(iso): string` → "09:30"; `formatDayShort(date): { weekday: "Çar", day: "28" }`; `formatDateLong(dateOrIso): string` → "28 Ekim 2026 Çarşamba". Hepsi `Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", … })`.
  - `providerSlugFromUrl(): string | null` (`?p=`)

Sayfa yapısı ve metinler (`book.html`, landing'in `<head>` yazı tipi bağlantıları + `styles.css` + `app.css`; üstte landing'deki logo):
1. Başlık: hizmet veren adı (`h1`), altında unvanı.
2. "1. Hizmet seçin": her hizmet bir buton kartı, "{ad}" ve "{süre} dk".
3. "2. Gün ve saat seçin": hizmet seçilince görünür. 14 günlük yatay kaydırılabilir şerit (her gün kısa gün adı + gün numarası), varsayılan bugün. Altında saat butonları ızgarası; boşsa "Bu gün için boş saat yok."; yüklenirken "Saatler yükleniyor…".
4. "3. Bilgileriniz": saat seçilince görünür; seçilen özet ("Beslenme danışmanlığı · 28 Ekim 2026 Çarşamba · 09:30"); "Ad Soyad" ve "E-posta" alanları, buton "Randevuyu onayla". Alan kontrolü ve mesajlar landing formuyla aynı ("Lütfen adınızı ve soyadınızı yazın.", "Lütfen e-posta adresinizi yazın.", "Geçerli bir e-posta adresi yazın."); ilk hatalı alana odak; düzeltirken uyarı güncellenir.
5. Başarı: form ve adımlar gizlenir; "Randevunuz onaylandı" ve hizmet, tarih, saat; "Yeni randevu al" butonu sayfayı başa döndürür.
6. `409`: saat listesi yeniden yüklenir, seçim temizlenir, saat ızgarasının üstünde "Bu saat az önce doldu, lütfen başka bir saat seçin." uyarısı.
7. Diğer API hataları: formun altında sunucu mesajı.
8. `?p=` yok ya da `404`: tüm içerik yerine "Bu randevu sayfası bulunamadı."

Seçili gün/hizmet/saat `aria-pressed="true"` taşır; stil `app.css`'te `[aria-pressed="true"]` ile. Yeni renk gerekmez; `--primary`, `--primary-soft`, `--border`, `--surface` kullanılır.

- [ ] **Step 1: `api.js`, `book.html`, `book.js`, `app.css`'i yaz**

- [ ] **Step 2: Tarayıcıda akışı doğrula**

Run: `npm start`; headless Edge + CDP ile `http://localhost:3000/book.html?p=ayse-yilmaz`.
Expected:
- Hizmet seç → saatler gelir. Boş form gönder → iki uyarı, odak "Ad Soyad"ta. Hatalı e-posta → yalnızca e-posta uyarısı. Doğru bilgi → "Randevunuz onaylandı".
- Aynı saati ikinci kez almaya çalış (sayfa A'da saati seç, B'de aynı saati onayla, A'da onayla) → "Bu saat az önce doldu…" uyarısı ve yenilenen liste.
- `book.html` (parametresiz) ve `?p=yok` → "Bu randevu sayfası bulunamadı."
- 375/768/1280px'te yan kaydırma yok; konsolda hata yok.

- [ ] **Step 3: Commit**

```bash
git add public && git commit -m "Randevu alma sayfası"
```

---

### Task 6: Takvim sayfası

**Files:**
- Create: `public/calendar.html`, `public/calendar.js`
- Modify: `public/app.css`

**Interfaces:**
- Consumes: `api.js` (`getJson`, `todayInIstanbul`, `addDays`, `formatTime`, `formatDateLong`, `providerSlugFromUrl`), `GET /api/providers/:slug` ve `GET …/appointments?date=`.

Sayfa yapısı ve metinler:
- En üstte bilgi notu: "Henüz giriş yok, bu sayfa şimdilik herkese açık."
- Kart başlığı: hizmet veren adı; altında "‹" ve "›" butonları (`aria-label` "Önceki gün" / "Sonraki gün"), arada `formatDateLong(date)`; "Bugün" butonu bugüne döner.
- Liste: hero takvimindeki `.slot` görünümü (`.time` + `.slot-body`): sol saat, sağda müşteri adı ve "{hizmet} · {süre} dk". Renkler hizmete göre sırayla `.c1`, `.c2`, `.c3` (landing'deki sınıflar).
- Boş gün: "Bu gün için randevu yok."
- `?p=` yok / `404`: "Bu takvim bulunamadı."
- Gün değişince URL'ye `&date=` yazılır (`history.replaceState`), sayfa yenilenince aynı gün açılır; geçersiz `date` bugüne düşer.

- [ ] **Step 1: `calendar.html`, `calendar.js`'i yaz, `app.css`'e takvim stillerini ekle**

- [ ] **Step 2: Tarayıcıda doğrula**

Run: `npm start`; `http://localhost:3000/calendar.html?p=ayse-yilmaz`
Expected: bugünün örnek randevuları saat sırasıyla; "›" ile yarının randevuları; boş bir hafta sonu gününde "Bu gün için randevu yok."; 375/768/1280px'te yan kaydırma yok; konsolda hata yok.

- [ ] **Step 3: Commit**

```bash
git add public && git commit -m "Hizmet veren takvim sayfası"
```

---

### Task 7: Uçtan uca doğrulama ve dokümanların kapanışı

**Files:**
- Modify: `docs/superpowers/specs/2026-10-27-backend-booking-design.md` (Durum satırı), `CLAUDE.md` (gerekirse)

- [ ] **Step 1: Uçtan uca kontrolü çalıştır**

Run: `npm test && npm run typecheck`, ardından `npm start` ve headless Edge + CDP:
- `book.html?p=ayse-yilmaz` üzerinden yarın 11:00 için randevu al → `calendar.html?p=ayse-yilmaz&date=<yarın>` sayfasında 11:00'da görünür.
- CDP `Emulation.setTimezoneOverride({ timezoneId: "America/New_York" })` ile iki sayfayı tekrar aç: saatler İstanbul saatiyle aynı ("11:00"), gün şeridi İstanbul'daki bugünle başlar.
- `/` landing eskisi gibi; menü bağlantıları ve erken erişim formu çalışır.
- Üç sayfa için 375/768/1280px yan kaydırma yok, konsolda hata yok.

Expected: hepsi geçer.

- [ ] **Step 2: Spec'in durumunu "Uygulandı" yap, doğrulama sonuçlarını ekle; `CLAUDE.md`'yi son haliyle karşılaştır**

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "Backend randevu akışı: uçtan uca doğrulama"
```
