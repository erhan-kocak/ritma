# Prompt Netleştirme Skill'i (`clarify-prompt`) Tasarımı

Tarih: 7 Kasım 2026
Durum: Uygulandı (plan: `docs/superpowers/plans/2026-11-07-clarify-prompt.md`)
Dal: `feat/clarify-prompt`

## Amaç

Kullanıcı belirsiz, varsayıma açık bir istek yazdığında Claude'un tahminle işe başlaması yerine, gerekirse birkaç soru sorup isteği net bir prompta dönüştürmesi; kullanıcı onaylayınca aynı oturumda o promptla işe başlaması.

## "Daha iyi prompt" tanımı

Daha uzun ya da süslü değil, doğru yerde net olan prompt. Ölçüt: **iki farklı kişi (ya da iki ayrı Claude oturumu) aynı promptu alsa, önemli noktalarda aynı sonucu üretir.** Bunun için prompt şunları netleştirir:

1. **Hedef:** iş bitince ne olacak, kimin işine yarayacak.
2. **Kapsam:** hangi dosyalara ve bölümlere dokunulacak, nelere dokunulmayacak.
3. **Başarı ölçütü:** işin bittiği nasıl anlaşılacak (test, ekranda görülecek davranış, ölçüm).
4. **Yalnızca kullanıcının bildiği bilgiler:** amaç, öncelik, beğeni, önceden alınmış kararlar.
5. **Sonucu değiştiren belirsizlikler:** yalnızca bunlar giderilir. Koddan bulunabilen, makul bir varsayılanı olan ya da `CLAUDE.md`'de zaten yazan şeyler sorulmaz ve promptta tekrarlanmaz.

Prompt zaten açıksa skill soru sormaz, sessiz kalır.

## Alınan kararlar

| Konu | Karar | Neden |
|------|-------|-------|
| Sonuç | Prompt gösterilir; kullanıcı onaylayınca aynı oturumda o promptla işe başlanır | Kullanıcının tercihi (A). |
| Devreye girme | Kendiliğinden; kullanıcının çağırması gerekmez | Kullanıcının tercihi (B). |
| Eşik | Orta: istek birden fazla makul şekilde yorumlanabiliyor **ve** yanlış yorumu geri almak zahmetliyse | Gereksiz araya girmeden asıl işe yarayan yerde sorar. |
| `brainstorming` ile ilişki | Tasarım ya da yeni özellik işinde devreye girmez; yalnızca diğer işlerde (hata ayıklama, araştırma, küçük kod değişikliği, doküman) | Aynı sorular iki kez sorulmaz, görev ayrımı net olur. |
| Soru biçimi | Her mesajda tek soru, şıklı, önerilen seçenek başta; en fazla 3 soru | Projedeki "tek tek soru" alışkanlığıyla uyumlu. Kalan belirsizlikler varsayım olarak yazılır. |
| Tetikleme yöntemi | Yalnızca skill dosyası; `CLAUDE.md` kuralı ya da hook yok | Kullanıcının tercihi (yaklaşım 1). Risk: tetikleme tamamen açıklamaya bağlı; testler bunu ölçer. |
| Dil | Skill içeriği Türkçe; açıklama İngilizce "Use when…" kalıbında, Türkçe örneklerle | İçerik projenin diğer belgeleriyle uyumlu; açıklama hem skill seçimine hem kullanıcının Türkçe isteklerine uyar. |
| Test | Alt ajanlarla (subagent), ayrı bir git worktree'de; önce skill olmadan, sonra skill ile | Kullanıcı alt ajan kullanımını onayladı. Kod değiştirebilen senaryolar `main`'e dokunmaz. |

## Yapı

```
.claude/skills/clarify-prompt/SKILL.md    Skill'in tamamı (tek dosya)
```

Klasör git'e eklenir; projeye özeldir.

### Açıklama (frontmatter `description`)

> Use when a request in this repo is not design or new-feature work (debugging, investigation, small code changes, docs) and could reasonably be read in more than one way where guessing wrong would be costly to undo — e.g. "takvim yavaş, bak bir", "testleri düzelt", "API'yi toparla". Skip when the request is already clear, trivially reversible, or answerable from the code. Not for design/feature work — that is brainstorming. Internal refactors that keep external behavior the same are not design work.

## Akış

1. **Eşik kontrolü.** Birden fazla makul yorum var mı ve yanlış yorumu geri almak zahmetli mi? İkisi birden "evet" değilse skill sessiz kalır, doğrudan işe başlanır.
2. **Önce kendi araştırması.** Belirsizliklerin bir kısmı kod, `docs/`, `CLAUDE.md` ve git geçmişi okunarak çözülür. Bu adımda yalnızca okuma yapılır, dosya değiştirilmez.
3. **Soruları seçme.** Kalan belirsizlikler sonuca etkisine göre sıralanır; en etkili en fazla 3 tanesi soru olur, diğerleri için makul varsayım belirlenir.
4. **Soruları sorma.** Her mesajda tek soru: şıklı, önerilen seçenek başta. Bir cevap sonraki soruyu gereksiz kılarsa o soru atlanır.
5. **Promptu yazma.** Aşağıdaki biçimle; varsayımlar ayrı satırlarda açıkça görünür.
6. **Onay.** Prompt gösterilir ve beklenir. Düzeltme istenirse güncellenip yeniden gösterilir; bu aşamada yeni soru sorulmaz.
7. **İşe başlama.** Onaydan sonra iş bu prompta göre yapılır. Projenin normal kuralları (TDD, `npm test`, tarayıcıda kontrol vb.) aynen geçerlidir.

### Özel durumlar

- Sorular sırasında işin aslında tasarım ya da yeni özellik işi olduğu anlaşılırsa bu söylenir ve `brainstorming`'e geçilir.
- Kullanıcı "sorma, başla" derse sorular atlanır; belirsizlikler varsayım olarak promptta yazılır, onaydan sonra başlanır.

## Netleşmiş promptun biçimi

```
**Hedef:** İş bitince ne olacak, kimin işine yarayacak. (1-2 cümle)
**Kapsam:** Dokunulacak dosyalar ve bölümler. Dokunulmayacaklar: …
**Bitti sayılır:** Ölçülebilir ölçütler (test, ekranda görülecek davranış, ölçüm).
**Bağlam:** Kullanıcıdan gelen, koddan çıkarılamayan bilgiler.
**Varsayım:** Sorulmayan konulardaki tahminler. Her biri ayrı satırda.
```

- Altına yazacak bir şey olmayan başlık atlanır.
- `CLAUDE.md`'deki kurallar promptta tekrarlanmaz.
- Somut olunur: dosya yolları, sayılar, gerçek örnekler.

### Örnek

"Takvim yavaş, bak bir" isteği ve iki cevaptan sonra:

```
**Hedef:** Takvim sayfasının açılışındaki gecikmenin nedenini bulup düzeltmek.
**Kapsam:** public/calendar.*, GET …/appointments ve ilgili store kodu.
  Dokunulmayacaklar: randevu alma akışı.
**Bitti sayılır:** Nedenin ölçümle gösterilmesi; düzeltme sonrası sayfanın
  1 saniyenin altında açılması; npm test ve typecheck geçer.
**Bağlam:** Yavaşlık haftalar arasında gezinirken fark edildi.
**Varsayım:** Sorun örnek veriyle de tekrarlanabiliyor.
```

## Test

Yöntem `writing-skills` skill'ine göre: her senaryo önce skill olmadan, sonra skill ile ayrı alt ajanlarda çalıştırılır ve davranışlar karşılaştırılır. Testler ayrı bir git worktree'de yapılır; `main`'e hiçbir şey yansımaz.

| # | İstek | Beklenen |
|---|---|---|
| 1 | "Takvim yavaş, bak bir" | Devreye girer; en fazla 3 soru, prompt, onay beklemesi. |
| 2 | "Footer'daki e-posta adresinde yazım hatası var, düzelt" | Sessiz kalır, doğrudan düzeltir. |
| 3 | "Fiyatlandırma bölümü ekle" | Bu skill devreye girmez; `brainstorming` çalışır. |
| 4 | "Testleri düzelt" (yalnızca bir test kırıkken) | Kırık testi kendisi bulur; soru gerekmiyorsa sormaz. |
| 5 | "API'yi toparla, sorma başla" | Soru sormaz; varsayımları promptta yazar, onay bekler. |

Alt ajanlar kullanıcıyla konuşamadığı için sorular ve onay noktası, ajanın son mesajında "kullanıcıya şunu sorardım" biçiminde raporlanır; değerlendirme bu rapora göre yapılır.

Skill tetiklenmezse ya da yanlış davranırsa açıklama ve içerik düzeltilip senaryolar yeniden çalıştırılır.

## Kapsam dışı

- `CLAUDE.md` kuralı ya da `UserPromptSubmit` hook'u (yaklaşım 2 ve 3). Testler tetiklemenin yetersiz olduğunu gösterirse yeniden konuşulur.
- Kullanıcı düzeyinde (`~/.claude/skills/`) genel bir skill; bu skill yalnızca Ritma içindir.
