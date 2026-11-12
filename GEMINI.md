# Antigravity (Gemini) — Proje Kuralları ve Geliştirme Yönergesi

Bu dosya, Antigravity / Gemini asistanının bu projede (Ritma) çalışırken uyması gereken temel kuralları tanımlar.

## Ana Referans Kaynağı (Single Source of Truth)

Projenin mimarisi, teknoloji yığını, kodlama standartları, komutları, yasakları ve doğrulama adımları için **tek ve ana başvuru kaynağı [CLAUDE.md](CLAUDE.md) dosyasıdır**.

> [!IMPORTANT]
> Bir kuralı, teknik kısıtı, kodlama standardını veya komut kullanımını incelemen gerektiğinde her zaman doğrudan **[CLAUDE.md](CLAUDE.md)** dosyasına başvur ve oradaki kuralları harfiyen uygula.

@[CLAUDE.md](CLAUDE.md)

---

## Özet Referans ve Yönlendirmeler (Detaylar için bkz. CLAUDE.md)

1. **Teknoloji ve Mimari (Bkz. `CLAUDE.md` -> Teknoloji):**
   - **Frontend (`public/`):** Saf HTML, CSS ve düz JavaScript (`<script type="module">`). Kütüphane, framework (React, Vue, Tailwind vb.) ve derleme/build adımı kesinlikle yoktur.
   - **Backend (`server/`):** Node.js 24 + Express 5 + TypeScript 5.9. Build adımı yoktur; Node `.ts` dosyalarını doğrudan çalıştırır (`erasableSyntaxOnly`).
   - **Veritabanı:** Neon PostgreSQL, `pg` sürücüsüyle elle yazılmış SQL. Uygulama `ritma`, testler `ritma_test` şemasını kullanır.
   - **Saat Dilimi:** Sabit `Europe/Istanbul` (`+03:00`). Tarih/saat hesapları `server/src/domain/time.ts` yardımcılarıyla yapılır.

2. **Kritik Kurallar ve Yasaklar (Bkz. `CLAUDE.md` -> Kurallar ve Yasaklar):**
   - **.env Erişim Yasağı (Kritik ve Kesin Kural):** `.env` veya türevi dosyalar (`.env.*`, `.env.local` vb.) hiçbir araçla okunamaz, görüntülenemez, düzenlenemez, terminalden yazdırılamaz veya filtrelenemez. Yalnızca şablon niteliğindeki `.env.example` incelenebilir.
   - **Dil Kuralları:** Dosya ve klasör adları İngilizce, arayüz metinleri ve API hata mesajları Türkçe olur.
   - **TDD:** Backend değişikliklerinde testler önce yazılır; değişiklikten sonra `npm test` ve `npm run typecheck` geçmelidir.
   - **Uç Noktalar ve OpenAPI:** Uç nokta eklenince veya değişince `server/src/openapi.ts` güncellenir.
   - **Kullanıcı Onayı:** Tasarım ve içerik kararları kullanıcıyla birlikte alınır; kararlar `docs/` altında tutulur.

3. **Komutlar (Bkz. `CLAUDE.md` -> Komutlar):**
   - `npm test`: Tüm testleri `ritma_test` şemasında sırayla koşar (`--test-concurrency=1`).
   - `npm run typecheck`: TypeScript tip kontrolü.
   - `npm run dev`: Geliştirme sunucusunu dosyaları izleyerek başlatır.
   - `npm run db:migrate` & `npm run db:seed`: Veritabanı şema göçü ve örnek veri yükleme.
