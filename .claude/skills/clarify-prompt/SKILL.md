---
name: clarify-prompt
description: Use when a request in this repo is not design or new-feature work (debugging, investigation, small code changes, docs) and could reasonably be read in more than one way where guessing wrong would be costly to undo — e.g. "takvim yavaş, bak bir", "testleri düzelt", "API'yi toparla". Skip when the request is already clear, trivially reversible, or answerable from the code. Not for design/feature work — that is brainstorming. Internal refactors that keep external behavior the same are not design work.
---

# Prompt netleştirme

Belirsiz bir isteği tahminle yapmak yerine, onu net bir prompta çevirip kullanıcıya onaylatırsın; onaydan sonra o promptla işe başlarsın.

**İyi prompt:** iki farklı kişi aynı promptu alsa, önemli noktalarda aynı sonucu üretir. Uzun olması gerekmez; hedef, kapsam ve başarı ölçütü net, gerisi kısa.

## Devreye girme

İki koşul **birlikte** doğruysa devreye gir:
1. İstek birden fazla makul şekilde yorumlanabiliyor (koddan okuyarak tek yoruma indiremiyorsun).
2. Yanlış yorumla yapılan işi geri almak zahmetli (birden çok dosya, harcanan zaman, yanlış yönde ilerleme).

Biri yanlışsa sessiz kal ve doğrudan işe başla. Örnekler: tek satırlık yazım hatası, koddan nedeni bulunan kırık test, salt bilgi sorusu ("X nasıl çalışıyor?").

**Sınır:** Belirleyici soru: kullanıcı **yeni ya da farklı** bir şey mi istiyor (yeni özellik, sayfaya yeni metin ya da bölüm, akışın değişmesi), yoksa var olanın **beklendiği gibi** çalışmasını mı (hata, yavaşlık, kırık test)? Yeni ya da farklıysa `brainstorming` işidir, bu skill'i bırak. "Beklenen" davranış kodda, testlerde ya da `docs/` altında zaten tanımlı olandır; hiçbirinde tanımlı değilse istek yenidir. Var olanı beklendiği gibi çalıştırmak bu skill'in işidir; düzeltme ekranda görüneni değiştirse de öyledir. Davranışı aynı bırakan iç düzenleme, araştırma ve doküman da bu skill'in işidir. İstek ikisini birden içeriyorsa tasarım kısmını `brainstorming`'e, kalanını buraya ayır ve bunu kullanıcıya bir cümleyle söyle; aynı soruyu iki kez sorma.

## Akış

1. **Oku ve ölç.** Kodu, `docs/`, `CLAUDE.md` ve git geçmişini oku; gerekirse komut çalıştırıp ölç. Dosya değiştirme. Koddan çözdüğün belirsizliği sorma.
2. **Seç.** Kalan belirsizlikleri sonuca etkisine göre sırala. En etkili **en fazla 3** tanesi soru olur; gerisi için makul bir varsayım belirle.
3. **Sor.** Her mesajda tek soru, bu biçimde:
   ```
   <Bulduğun şey, 1 cümle.> <Soru>?
   - **A) <seçenek> (önerim)** — <neden, kısa>
   - **B) <seçenek>**
   - **C) <seçenek>**
   ```
   Önerilen seçenek her zaman A'dır. Bir cevap sonraki soruyu gereksiz kılarsa onu atla.
4. **Yaz.** Promptu aşağıdaki biçimle yaz.
5. **Onay al.** Promptu göster, "Bu promptla başlayayım mı?" diye sor ve bekle.
6. **Başla.** Onaydan sonra işi bu prompta göre yap; projenin normal kuralları (TDD, `npm test`, tarayıcı kontrolü) geçerli.

## Cevaplara göre

| Kullanıcı | Yapacağın |
|---|---|
| "Sorma", "sorma başla" | Soru yok. 1-2. adımları yap, tüm belirsizlikleri **Varsayım** satırı olarak yaz, promptu göster, onayla başla. |
| "Bilmiyorum", "sen seç" | Önerdiğin seçeneği **Varsayım** olarak yaz, o soruyu tekrar sorma, sıradakine geç. |
| Promptta düzeltme | Promptu güncelle ve yeniden göster. Yeni soru sorma. |
| "Kastettiğim bu değil, X" | Promptu X'e göre baştan yaz. Kalan soru hakkın 3'ten sorduklarını düşünce kalandır. |

## Prompt biçimi

```
**Hedef:** İş bitince ne olacak, kimin işine yarayacak. (1-2 cümle)
**Kapsam:** Dokunulacak dosyalar/bölümler. Dokunulmayacaklar: …
**Bitti sayılır:** Ölçülebilir ölçütler (test, görülecek davranış, ölçüm).
**Bağlam:** Kullanıcıdan gelen, koddan çıkarılamayan bilgiler.
**Varsayım:** Sormadığın konulardaki tahminler; her biri ayrı satırda.
```

- Altına yazacak bir şey olmayan başlığı atla.
- `CLAUDE.md`'deki kuralları tekrarlama.
- Somut yaz: dosya yolları, sayılar, gerçek örnekler.

Örnek ("Takvim yavaş, bak bir" + iki cevap):

```
**Hedef:** Takvim sayfasında günler arasında gezinirkenki gecikmenin nedenini bulup düzeltmek.
**Kapsam:** public/calendar.*, GET …/appointments ve ilgili store kodu.
  Dokunulmayacaklar: randevu alma akışı.
**Bitti sayılır:** Neden ölçümle gösterilir; düzeltmeden sonra gün geçişi
  1 saniyenin altında; npm test ve typecheck geçer.
**Bağlam:** Yavaşlık telefonda, gün değiştirirken fark edildi.
**Varsayım:** Sorun örnek veriyle de tekrarlanabiliyor.
```
