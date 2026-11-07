# Kalıcı Veritabanı (PostgreSQL) Tasarımı

Tarih: 7 Kasım 2026
Durum: Uygulandı (plan: `docs/superpowers/plans/2026-11-07-database.md`)
Dal: `feat/database`

## Amaç

Randevu verilerini bellekten Neon PostgreSQL'e taşımak: sunucu yeniden başlayınca kayıtlar kaybolmasın. API'nin dışarıdan görünen davranışı (yollar, yanıtlar, hata kodları) değişmez.

Kapsam dışı: giriş, iptal, hatırlatma, müşteriler tablosu, yayına alma.

## Alınan kararlar

| Konu | Karar | Neden |
|------|-------|-------|
| Sürücü | `pg` (node-postgres) + geliştirme için `@types/pg` | Kullanıcının tercihi; en yaygın ve en çok denenmiş sürücü. ORM yok: build/kod üretme adımı istemez, 4 tablo için gereksiz. |
| Testlerin veritabanı | Tüm testler PostgreSQL'e karşı çalışır | Kullanıcının tercihi; gerçeğe en yakın sonuç. Bedeli: `npm test` internet ve Neon ister, daha yavaştır. |
| Test ayrımı | Aynı veritabanı, ayrı şema: uygulama `ritma`, testler `ritma_test` | Kullanıcının tercihi; tek bağlantı adresi yeter. Risk aşağıdaki korumalarla azaltılır. |
| Bellekteki depo | Silinir | Testler artık onu denemez; bakımsız ölü kod olurdu. |
| Örnek veri | Ayrı komut: `npm run db:seed`, tekrar çalıştırılabilir | Sunucu açılışı veriye dokunmaz; örnek randevular istenince tazelenir. |
| Şema yönetimi | Numaralı `.sql` göç dosyaları + kendi script'imiz (`npm run db:migrate`) | Yayından sonra veriyi koruyarak değişiklik yapılabilir; yeni paket gerekmez. |
| Şema bilgisi | `db/schema.sql`, göç script'i tarafından otomatik üretilir, git'te tutulur; bir test güncelliğini denetler | Kullanıcı her zaman güncel şemanın `db/` altında durmasını istedi; elle güncellemeyi unutma riski yok. |
| Çift randevu koruması | Veritabanı kısıtı (`exclude using gist … tstzrange`) | Asenkron sorgularla "kontrol ile kayıt arasında `await` yok" garantisi kaybolur; korumayı veritabanı sağlamalı. |

## Klasör yapısı

```
db/
  migrations/001-initial.sql   ilk tablolar
  schema.sql                   otomatik üretilir, elle düzenlenmez
server/src/db/
  pool.ts                      DATABASE_URL'den pg.Pool kurar
  migrate.ts                   migrate(pool, schema)
  schema-dump.ts               dumpSchema(pool, schema)
server/src/store/
  pg-store.ts                  createPgStore({ pool, schema })
  store.ts                     Store arayüzü (Promise döndürür)
  seed.ts                      createSeedData(now) – db:seed'e veri sağlar
server/scripts/
  db-migrate.ts                npm run db:migrate
  db-seed.ts                   npm run db:seed
```

Kaldırılanlar: `server/src/store/memory-store.ts`, `server/test/memory-store.test.ts`.

Express yalnızca `public/` klasörünü sunduğu için `db/` tarayıcıdan erişilemez.

## Tablolar

`db/migrations/001-initial.sql` (şema adı yazılmaz; göç script'i `search_path`'i ayarlar):

```sql
create extension if not exists btree_gist with schema public;

create table providers (
  id    text primary key,
  slug  text not null unique,
  name  text not null,
  title text not null
);

create table services (
  id               text not null,
  provider_id      text not null references providers(id),
  name             text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  primary key (provider_id, id)
);

create table working_ranges (
  provider_id text not null references providers(id),
  day         smallint not null check (day between 1 and 7),
  start_time  time not null,
  end_time    time not null check (end_time > start_time),
  primary key (provider_id, day, start_time)
);

create table appointments (
  id           uuid primary key,
  provider_id  text not null references providers(id),
  service_id   text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null check (ends_at > starts_at),
  client_name  text not null,
  client_email text not null,
  created_at   timestamptz not null,
  foreign key (provider_id, service_id) references services(provider_id, id),
  exclude using gist (
    provider_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
);
```

- **Kimlikler:** hizmet veren ve hizmet kimlikleri okunabilir metin (`ayse-yilmaz`, `nutrition-45`); API yanıtları ve OpenAPI örnekleri değişmez. Randevu kimliği `uuid`, Node'da `randomUUID()` ile üretilir.
- **Çalışma saatleri:** her aralık bir satır (`day`: 1 = Pazartesi … 7 = Pazar). Depo bunları `WorkingDay { day, ranges[] }` biçiminde gruplayarak döndürür; slot hesabı değişmez.
- **Zaman:** `timestamptz` saklanır; okurken `time.ts` yardımcılarıyla `…+03:00` biçimine çevrilir.
- **Çakışma:** `[)` aralığın bitişini dışarıda bırakır; 09:00–09:45 ile 09:45–10:30 çakışmaz (mevcut kuralla aynı). `btree_gist` Neon'da desteklenir.

## Bağlantı

- `npm start`, `npm run dev`, `npm test`, `db:migrate` ve `db:seed` komutları `node --env-file-if-exists=.env …` ile çalışır. Node `.env`'i kendisi okur; ek paket yok.
- `pool.ts`: `DATABASE_URL` tanımlı değilse Türkçe bir hata verir ("`DATABASE_URL` tanımlı değil, `.env.example`'a bakın"); sunucu açılmaz.
- Tek `pg.Pool`. Sunucu kapanırken (`SIGINT`, `SIGTERM`) havuz `pool.end()` ile kapatılır. Havuzun `error` olayı dinlenir; Neon'un kapattığı boşta bağlantı süreci çökertmez.
- Sunucu açılırken `checkTables` tabloların kurulu olduğunu kontrol eder; yoksa "Tablolar yok, npm run db:migrate çalıştırın." deyip kapanır.

### Şema seçimi

- `createPgStore({ pool, schema })`, `migrate(pool, schema)` ve `dumpSchema(pool, schema)` yalnızca `"ritma"` ya da `"ritma_test"` kabul eder; başka değer hata verir. Şema adı SQL'e yalnızca bu doğrulamadan sonra yazılır.
- Depo sorguları tabloları şemayla birlikte yazar (`ritma.appointments`); oturum ayarına güvenilmez. Neon'un pooled (`-pooler`) ve direct adresi aynı şekilde çalışır.
- Göç script'i her dosyayı kendi işleminde `set local search_path to <şema>, public` ile çalıştırır. `set local` yalnızca o işlemde geçerli olduğundan pooled adreste de güvenlidir. `btree_gist` `public` şemasına kurulur.

## Depo

- `Store` arayüzü aynı metotları korur; her biri `Promise` döndürür. `listServices` ada göre sıralıdır (veritabanında eklenme sırası yok).
- Route'lar `async` olur; Express 5 reddedilen `Promise`'leri hata ara katmanına iletir.
- `addAppointment`, PostgreSQL `23P01` (exclusion violation) hatasında `SlotTakenError` fırlatır; rota bunu `409 slot_taken` ("Bu saat az önce doldu.") yanıtına çevirir.
- Rota önce "slot hâlâ boş mu?" kontrolünü yapmaya devam eder (çoğu durumda `409`'u kısıta gitmeden verir). Rotadaki "kontrol ile kayıt arasında `await` yok" yorumu kaldırılır.
- Dönüşümler: `timestamptz` → `…+03:00` metni (gerekirse `time.ts`'e test önce yazılmış bir yardımcı eklenir; `Date.parse`'a saat dilimsiz değer verilmez); `time` → `HH:MM`; `duration_minutes` → `durationMinutes` gibi alan adları.
- `listAppointments` sıralamayı ve gün filtresini SQL'de yapar: gün filtresi İstanbul gününün başı ile sonraki günün başı arasındaki aralıktır (`time.ts` ile hesaplanır).

## Script'ler

### `db:migrate`

1. `db/migrations/*.sql` dosyalarını ada göre sıralar. Her dosya için ayrı bir işlem açar ve işlemin başında `pg_advisory_xact_lock` ile kilit alır; kilit commit/rollback ile kendiliğinden bırakılır. Oturum düzeyinde kilit (`pg_advisory_lock`) kullanılmaz: Neon'un pooled (PgBouncer transaction mode) adresinde kilit alma ve bırakma farklı sunucu bağlantılarına düşebilir ve kilit hiç bırakılmaz (uygulama sırasında yaşandı).
2. Aynı işlemde şemayı ve `<şema>.schema_migrations (name text primary key, applied_at timestamptz not null)` tablosunu yoksa oluşturur; dosyanın uygulanıp uygulanmadığına kilit alındıktan sonra bakar. Eşzamanlı iki göçte dosya bir kez uygulanır.
3. Uygulanmamış dosyayı çalıştırır ve `schema_migrations`'a yazar. Hata olursa o işlem geri alınır, script hata koduyla çıkar.
4. Şema `ritma` ise `db/schema.sql`'i yeniden üretir. `ritma_test` dosyaya yazmaz.
5. Uygulanan göçleri Türkçe yazdırır (ör. "Uygulandı: 001-initial.sql", hiçbiri yoksa "Şema güncel.").

### `db/schema.sql` üretimi (`dumpSchema`)

- PostgreSQL katalog bilgisinden: tablolar, sütunlar (tip, `not null`, varsayılan), kısıtlar (`pg_get_constraintdef`), kısıta bağlı olmayan indeksler (`pg_get_indexdef`).
- Sabit sıra: tablo adı, sütun sırası, kısıt adı. Şema değişmedikçe dosya değişmez.
- Şema adı her zaman `ritma` olarak yazılır; `schema_migrations` dahil edilmez.
- Başlık notu: "Bu dosya otomatik üretilir, elle düzenlemeyin; `npm run db:migrate` çalıştırın."

### `db:seed`

- Asıl iş `seedDatabase(pool, schema, now)` fonksiyonunda; script yalnızca `ritma` ve `new Date()` ile çağırır.
- Hizmet veren, hizmetler, çalışma aralıkları: `on conflict do nothing`.
- Örnek randevular `createSeedData(now)`'dan; randevu id'leri orada `randomUUID()` ile üretilir. Çakışan saatler `on conflict do nothing` ile atlanır. Tekrar çalıştırılabilir.
- Eklenen kayıt sayılarını Türkçe yazdırır.

## Testler

### Ortak yardımcı (`server/test/db.ts`)

- `createTestStore(data = testData())`: şemanın `ritma_test` olduğunu doğrular, göçleri (dosya başına bir kez) uygular, tabloları `truncate … cascade` ile boşaltır, veriyi ekler, depoyu döndürür. Boşaltma/doldurma her testten önce.
- Tablo boşaltma yalnızca bu yardımcıda ve yalnızca `ritma_test` için vardır.
- `fixtures.ts` (`testData()`, `TEST_NOW`) aynen kalır; `openapi.test.ts` `createSeedData` verisini yardımcıya geçer.
- Her test dosyası havuzu `after()` içinde kapatır.
- `DATABASE_URL` yoksa veritabanı testleri Türkçe, açık bir mesajla başarısız olur; atlanmaz.

### Sırayla çalışma

Tüm dosyalar aynı `ritma_test`'i kullandığından `npm test` `--test-concurrency=1` ile çalışır. Neon'a ağ üzerinden bağlanıldığı için testler birkaç saniye sürer.

### Senaryolar

- `pg-store.test.ts`: `memory-store.test.ts`'teki tüm senaryolar; ayrıca
  - aynı slota eşzamanlı iki `addAppointment`: biri kaydedilir, diğeri `SlotTakenError`;
  - bitişik randevular (09:00–09:45, 09:45–10:30) ikisi de kaydedilir;
  - `TZ=UTC` altında saatler `…+03:00` döner;
  - çalışma aralıkları güne göre doğru gruplanır.
- `api.test.ts`, `app.test.ts`: aynı testler, depo yardımcıdan; ayrıca aynı slota paralel iki `POST`: biri `201`, diğeri `409 slot_taken`.
- `migrate.test.ts`: ikinci çalıştırma hiçbir göç uygulamaz; `dumpSchema(ritma_test)` çıktısı git'teki `db/schema.sql` ile birebir aynıdır.
- `seed.test.ts`: `seedDatabase` iki kez çalışınca ikinci seferde kayıt sayıları değişmez.
- `slots`, `time`, `validation` testleri değişmez.
- `TZ=UTC npm test` de geçmelidir.

## Belgeler

- `CLAUDE.md`: proje özetindeki "Veriler bellekte" ifadesi; yeni dosyalar ve `db/` klasörü; `db:migrate`, `db:seed` komutları; kural: "Yeni göç eklenince `npm run db:migrate` çalıştırılır ve `db/schema.sql` commit'lenir"; `npm test`'in `DATABASE_URL` istediği.
- `docs/superpowers/specs/2026-10-27-backend-booking-design.md`: çakışma güvenliği maddesine bu belgeye bağlantı.

## Kullanıcıdan gerekenler

- Neon'da veritabanı ve `.env` içinde `DATABASE_URL` (değeri Claude okumaz).
