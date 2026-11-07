# `clarify-prompt` skill testleri

Tasarım: `docs/superpowers/specs/2026-11-07-clarify-prompt-design.md`
Plan: `docs/superpowers/plans/2026-11-07-clarify-prompt.md`

## Ortam

- Ayrı worktree (`test/clarify-prompt-sandbox` dalı, push edilmedi, test sonunda silindi).
- Senaryo 2 için alt bilgideki adres `merhaba@ritma.ap` yapıldı; senaryo 4 için `server/test/slots.test.ts:49` bozuldu (`npm test`: 52 geçti, 1 kırık).
- Alt ajanlara dosya değiştirmemeleri söylendi; ne yapacaklarını raporladılar. Böylece aynı ortam tüm turlarda aynı kaldı.

## Alt ajan istem şablonu

```
Çalışma dizinin: <worktree yolu>. CLAUDE.md'yi oku ve uy.
Kullanabileceğin skill'ler (ad: açıklama):
- brainstorming: You MUST use this before any creative work - creating features,
  building components, adding functionality, or modifying behavior. Explores user
  intent, requirements and design before implementation.
- [yalnızca "Skill ile" turunda] clarify-prompt: <SKILL.md description> — içeriği: <SKILL.md yolu>
Bir skill uygunsa önce onu oku ve uygula.
Kullanıcı isteği: "<senaryo metni>"
[Gerekirse önceki konuşma]
Kullanıcıyla konuşamazsın. Bir şey soracaksan sormak yerine raporla.
Dosya değiştirme; değiştireceğin şeyi raporla. Okuma ve komut çalıştırma serbest.
Rapor: (1) hangi skill'i kullandın/kullanmadın, neden; (2) kullanıcıya
soracağın sorular, tam metniyle; (3) onay öncesi yazdığın prompt, varsa;
(4) değiştireceğin dosyalar ve ilk adımın.
```

## Sonuçlar


| # | İstek | Beklenen | Temel (skill yok) | Skill ile |
|---|---|---|---|---|
| 1 | "Takvim yavaş, bak bir" | Devreye girer; ≤3 soru, prompt, onay | **Kısmen.** Önce okuyup ölçtü (iyi), ama 4 soru; sorular açık uçlu, şıksız ve önerisiz; onaya sunulan plan "Başlayayım mı?" ile biten serbest metin, başarı ölçütü yok. | **Geçti.** Önce ölçtü (API < 15 ms); 3 şıklı, önerili soru; beş başlıklı prompt, ölçülebilir "Bitti sayılır"; onay bekliyor. |
| 2 | "Footer'daki e-posta adresinde yazım hatası var, düzelt" | Sessiz, doğrudan düzeltir | **Geçti.** Soru yok, doğrudan düzeltiyor. | **Geçti.** "Tek satırlık yazım hatası" diye sessiz kaldı, doğrudan düzeltiyor. |
| 3 | "Fiyatlandırma bölümü ekle" | Bu skill değil, brainstorming | **Geçti.** brainstorming, tek tek soru. | **Geçti.** Sınır kuralına göre brainstorming'e bıraktı. |
| 4 | "Testleri düzelt" | Kırık testi bulur; gereksiz soru yok | **Geçti.** Kırık testi ve nedenini buldu, soru yok. | **Geçti.** Koddan tek yoruma indi, sessiz kaldı. |
| 5 | "API'yi toparla, sorma başla" | Soru yok; varsayımlı prompt, onay | **Kaldı.** "Sorma" denmesine rağmen soru sordu; iç düzenlemeyi brainstorming'e götürdü ("davranışı ya da yapısını değiştirmek"). Varsayımlar ayrı yazılmadı. | **Geçti.** Soru yok; "toparla = davranışı koruyan iç düzenleme" dahil 4 Varsayım satırı; beş başlıklı prompt; onay bekliyor. |
| RF1 | "Fiyatlandırma ekle, bir de takvimdeki tarih hatasını düzelt" | Tasarım → brainstorming, hata → bu skill; tekrar soru yok | — | **Geçti.** İsteği ikiye ayırdığını tek cümleyle söyledi; hata için 2 soru + prompt, fiyatlandırma için brainstorming soruları; tekrar yok. |
| RF2 | "Takvim yavaş" + 1. soruya "bilmiyorum, sen seç" | Önerilen seçenek varsayım olur, soru tekrarlanmaz | — | **Geçti.** A'yı "Varsayım" olarak yazdı, soruyu tekrarlamadı, prompta geçti. |
| RF3 | "Slot hesabı nasıl çalışıyor?" | Devreye girmez | — | **Geçti.** "Salt bilgi sorusu" diye sessiz kaldı, doğrudan cevapladı. |
| RF4 | "Takvim yavaş" + prompta "hayır, randevu sayfası yavaş" | Prompt baştan yazılır, toplam soru ≤3 | — | **Geçti.** `book` sayfası için yeni prompt; toplam 2 soru. |
| RF5 | "the calendar is slow, take a look" | Devreye girer | — | **Geçti.** Devreye girdi, 3 şıklı soru, beş başlıklı prompt. |

### Temel turdan çıkanlar

- Hata biçimi **çıktının şekli** (soru sayısı, şıksız soru, başarı ölçütü olmayan plan) ve **"sorma" talimatının çiğnenmesi**. Skill buna göre bir tarif/şablon olarak yazıldı, yasak listesi olarak değil.
- Tasarım dışı bir iş (iç düzenleme) brainstorming'in "modifying behavior" ifadesine takılıyordu; skill bu sınırı gözlemlenebilir bir koşulla çiziyor: dışarıdan görünen davranış değişiyor mu?
- 2, 3, 4 zaten doğruydu; skill bunları bozmadı.

### Skill ile turdan çıkanlar

- 10/10 geçti; REFACTOR turuna gerek kalmadı.
- 1 ve RF5'te üçüncü soru "düzeltme ne kadar ileri gitsin?" oldu ve görünür değişikliği brainstorming'e yönlendirdi; sınır kuralı doğru uygulanıyor.
- Bilinen sınır: skill listesi ajana elle verildi; gerçek oturumdaki seçim birleştirmeden sonra elle denenmeli (senaryo 1 ve 2).

## Son inceleme düzeltmesi: sınır kuralı

Son incelemede bulunan önemli sorun: "Dışarıdan görünen davranış değişiyorsa brainstorming" cümlesi harfiyen okununca her hata düzeltmesini brainstorming'e gönderiyordu.

| İstek (kural harfiyen uygulanarak) | Önce | Sonra |
|---|---|---|
| "Randevu alma sayfasında boş saatler bir saat kaymış görünüyor, düzelt" | unclear, çelişki var | clarify-prompt, çelişki yok |
| "Takvim yavaş açılıyor, hızlandır" | unclear, çelişki var | clarify-prompt, çelişki yok |
| "Formda hatalı e-posta girilince mesaj çıkmıyor, düzelt" | unclear, çelişki var | clarify-prompt; ilk düzeltmede "beklenen neye göre?" belirsizliği kaldı, ikinci düzeltmeden sonra beklenen davranışı `public/script.js` ve `docs/landing-page-plan.md`'de bulup çelişkisiz karar verdi |
| "Fiyatlandırma bölümü ekle" (gerileme) | — | brainstorming, çelişki yok |

Düzeltme: sınır, "yeni ya da farklı bir şey mi, yoksa var olanın beklendiği gibi çalışması mı?" sorusuna bağlandı; "beklenen" kod, test ya da `docs/` altında tanımlı olan davranıştır.
