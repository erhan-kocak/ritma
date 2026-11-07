# Prompt Netleştirme Skill'i (`clarify-prompt`) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Skill yazımı için ayrıca superpowers:writing-skills.

**Goal:** Belirsiz, tasarım dışı istekleri en fazla 3 soruyla net bir prompta dönüştüren, onaydan sonra işe başlayan projeye özel bir skill.

**Architecture:** Tek dosya: `.claude/skills/clarify-prompt/SKILL.md`. Tetikleme yalnızca frontmatter `description` ile. Skill'ler için TDD: önce skill olmadan alt ajanlarla temel davranış (RED), sonra skill ile (GREEN), sonra açıkları kapatma (REFACTOR).

**Tech Stack:** Claude Code proje skill'i (Markdown + YAML frontmatter), alt ajanlar (Agent aracı), git worktree.

**Spec:** `docs/superpowers/specs/2026-11-07-clarify-prompt-design.md`

## Global Constraints

- Skill yolu: `.claude/skills/clarify-prompt/SKILL.md`; klasör ve dosya adları İngilizce.
- Skill içeriği Türkçe; `description` İngilizce "Use when…" kalıbında, Türkçe örneklerle (metin spec'teki "Açıklama" bölümünden birebir başlar).
- Eşik: birden fazla makul yorum **ve** yanlış yorumu geri almak zahmetli. Açık istekte sessiz kalır.
- Tasarım / yeni özellik işinde devreye girmez; `brainstorming`'e bırakır.
- En fazla 3 soru, her mesajda tek soru, şıklı, önerilen seçenek başta.
- Prompt biçimi: **Hedef / Kapsam / Bitti sayılır / Bağlam / Varsayım**; boş başlık atlanır; `CLAUDE.md` kuralları tekrarlanmaz.
- Onaydan önce dosya değiştirilmez; onay aşamasında yeni soru sorulmaz.
- `CLAUDE.md` kuralı ya da hook eklenmez (kapsam dışı).
- Testler `main`'e dokunmaz; kod değiştirebilen senaryolar ayrı worktree'de.

## Review Focus

Spec'in testlerinde olmayan, en çok sorun çıkarabilecek durumlar (her biri Görev 2'de senaryo olarak test edilir):

1. **Karma istek** ("Fiyatlandırma ekle, bir de takvimdeki tarih hatasını düzelt"): tasarım kısmı `brainstorming`'e, hata kısmı bu skill'e; aynı soru iki kez sorulmaz.
2. **"Bilmiyorum / sen seç" cevabı:** önerilen seçenek varsayım olarak yazılır, aynı soru tekrar sorulmaz.
3. **Salt soru** ("Slot hesabı nasıl çalışıyor?"): yanlış yorumun bedeli yok, skill devreye girmez.
4. **Prompt reddedilir** ("Hayır, kastettiğim bu değil, X"): prompt X'e göre baştan yazılır; 3 soru sınırı aşılmaz.
5. **İngilizce istek** ("the calendar is slow, take a look"): Türkçe istekteki gibi devreye girer.

---

### Görev 1: Test ortamı ve temel davranış (RED)

**Files:**
- Create: `docs/superpowers/skill-tests/2026-11-07-clarify-prompt.md` (test kaydı)
- Geçici: `../ritma-clarify-test` worktree'si (`test/clarify-prompt-sandbox` dalı, hiçbir zaman push edilmez)

**Interfaces:**
- Produces: worktree yolu `../ritma-clarify-test`; test kaydında senaryo başına "Temel" sütunu; Görev 2'nin kullandığı alt ajan istem şablonu (aşağıda).

- [ ] **Adım 1: Worktree'yi aç ve senaryo durumlarını hazırla**

```bash
git worktree add ../ritma-clarify-test -b test/clarify-prompt-sandbox
```
Worktree'de (commit'lenmeden):
- `public/index.html` alt bilgisindeki `merhaba@ritma.app` → `merhaba@ritma.ap` (senaryo 2).
- `server/test/slots.test.ts`'te tek bir beklenen değeri boz (senaryo 4); `npm test` yalnızca o testte kırılmalı.

Doğrula: worktree'de `npm test` → tam olarak 1 kırık test.

- [ ] **Adım 2: Alt ajan istem şablonunu test kaydına yaz**

Alt ajanlar proje skill'lerini kendiliğinden yüklemeyebilir ve kullanıcıyla konuşamaz. Bu yüzden tetikleme benzetilir. Şablon:

```
Çalışma dizinin: <worktree yolu>. CLAUDE.md'yi oku ve uy.
Kullanabileceğin skill'ler (ad: açıklama):
- brainstorming: <gerçek açıklama>
- [yalnızca GREEN'de] clarify-prompt: <SKILL.md description>  — içeriği: <SKILL.md yolu>
Bir skill uygunsa önce onu oku ve uygula.
Kullanıcı isteği: "<senaryo metni>"
[Gerekirse önceki konuşma: …]
Kullanıcıyla konuşamazsın. Bir şey soracaksan sormak yerine raporla.
Rapor: (1) hangi skill'i kullandın/kullanmadın, neden; (2) kullanıcıya
soracağın sorular, tam metniyle; (3) onay öncesi yazdığın prompt, varsa;
(4) dosya değiştirdiysen hangileri.
```

- [ ] **Adım 3: Spec'teki 5 senaryoyu skill olmadan çalıştır**

Her senaryo ayrı alt ajan, paralel. Her raporun özetini test kaydının "Temel" sütununa yaz (birebir alıntıyla: tahminle başladı mı, soru sordu mu, kaç soru).

Beklenen: en az senaryo 1 ve 5'te ajan sormadan tahminle işe başlar. Hiçbir senaryoda fark yoksa dur ve kullanıcıya bildir (skill'e gerek olmayabilir).

- [ ] **Adım 4: Commit (yalnızca `feat/clarify-prompt` dalında, test kaydı)**

```bash
git add docs/superpowers/skill-tests/2026-11-07-clarify-prompt.md
git commit -m "Skill testi: clarify-prompt temel davranış"
```

### Görev 2: Skill'i yaz ve doğrula (GREEN)

**Files:**
- Create: `.claude/skills/clarify-prompt/SKILL.md` (önce worktree'ye kopyalanarak test edilir)
- Modify: `docs/superpowers/skill-tests/2026-11-07-clarify-prompt.md`

**Interfaces:**
- Consumes: Görev 1'in worktree'si ve istem şablonu.
- Produces: `SKILL.md`; test kaydında "Skill ile" sütunu.

- [ ] **Adım 1: `SKILL.md`'yi yaz**

Frontmatter: `name: clarify-prompt`, `description:` spec'teki metin. Gövde bölümleri, spec'e birebir: "Daha iyi prompt" tanımı (5 madde + ölçüt), Eşik (iki koşul + atlama örnekleri), Akış (7 adım), Özel durumlar (2 madde + Review Focus 1, 2, 4'ün kuralları), Prompt biçimi (şablon + 3 kural + takvim örneği). Hedef uzunluk ~120 satırın altında; spec'te olmayan kural eklenmez.

- [ ] **Adım 2: 10 senaryoyu skill ile çalıştır**

Spec'in 5 senaryosu + Review Focus'un 5 senaryosu. Çok adımlı olanlar (RF 2, RF 4) için önceki konuşmayı şablonun "önceki konuşma" alanına yaz. Raporları "Skill ile" sütununa geçir.

Geçme ölçütü, senaryo başına spec'teki ve Review Focus'taki "Beklenen". Ayrıca soru sorulan her senaryoda: ≤3 soru, her biri şıklı ve önerili; prompt beş başlıklı biçimde; onaydan önce dosya değişmemiş.

- [ ] **Adım 3: Commit**

```bash
git add .claude/skills/clarify-prompt/SKILL.md docs/superpowers/skill-tests/2026-11-07-clarify-prompt.md
git commit -m "clarify-prompt skill'i"
```

### Görev 3: Açıkları kapat, temizle, belgele (REFACTOR)

**Files:**
- Modify: `.claude/skills/clarify-prompt/SKILL.md`, test kaydı
- Modify: `CLAUDE.md` ("Dosyalar" bölümüne bir satır: `.claude/skills/clarify-prompt/`: belirsiz, tasarım dışı istekleri netleştiren skill; tasarım: spec yolu)
- Modify: spec `Durum:` satırı → `Uygulandı (plan: docs/superpowers/plans/2026-11-07-clarify-prompt.md)`

- [ ] **Adım 1:** Görev 2'de geçmeyen her senaryo için ajanın raporundaki gerekçeyi test kaydına alıntıla, `SKILL.md`'de o gerekçeyi kapatan en küçük değişikliği yap (çoğunlukla `description` ya da Eşik), yalnızca o senaryoları yeniden çalıştır. En fazla 3 tur; hâlâ geçmeyen varsa dur ve kullanıcıya bildir (spec "Kapsam dışı": tetikleme yetersizse yaklaşım 2/3 yeniden konuşulur).
- [ ] **Adım 2:** Worktree'yi ve sandbox dalını kaldır:
  `git worktree remove --force ../ritma-clarify-test && git branch -D test/clarify-prompt-sandbox`.
  Doğrula: `git worktree list` yalnızca ana klasörü gösterir; `main` ve `feat/clarify-prompt`'ta `merhaba@ritma.ap` yok.
- [ ] **Adım 3:** `CLAUDE.md` ve spec'i güncelle; `npm test` ve `npm run typecheck` geçer (kod değişmediğini doğrular).
- [ ] **Adım 4: Commit**

```bash
git add .claude/skills/clarify-prompt/SKILL.md docs/ CLAUDE.md
git commit -m "clarify-prompt: test bulguları, CLAUDE.md ve tasarım güncellemesi"
```

## Bilinen sınır

Alt ajan testi, gerçek oturumdaki skill seçimini **benzetir**: ajana skill listesi elle verilir. Gerçek oturumda skill listesi Claude Code tarafından verilir ve başka skill'lerle (superpowers vb.) yarışır. Birleştirmeden sonra senaryo 1 ve 2'yi kullanıcının yeni bir oturumda elle denemesi önerilir.
