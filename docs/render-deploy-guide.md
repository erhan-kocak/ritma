# Ritma'yı Render'da ücretsiz yayınlama rehberi

Amaç: Ritma'yı (landing, randevu ve takvim sayfaları, API) geçici bir `onrender.com` adresinde ücretsiz olarak denemek. Veritabanı yine Neon'da kalır. Claude Code'a Render MCP bağlanır; böylece yayın durumu, loglar ve ortam değişkenleri sohbetten yönetilebilir.

Rehber 2026-11-07'de Render ve Neon'un resmi belgelerine bakılarak yazıldı (kaynaklar en altta). Paneller zamanla değişebilir; bir adım tutmazsa ilgili kaynağa bakın.

## Önce bilinmesi gerekenler

### Render ücretsiz planı

- Ücretsiz web servisi 15 dakika istek almazsa uykuya geçer. Sonraki ilk istekte yaklaşık 1 dakikada uyanır; bu sırada tarayıcıda bir bekleme sayfası görünür.
- Her çalışma alanına (workspace) ayda 750 ücretsiz saat verilir. Tek servis bütün ay açık kalsa bile yeter (ay en fazla 744 saat). Saat biterse ücretsiz servisler ay sonuna kadar durdurulur.
- Dosya sistemi geçicidir: her yeniden yayında, yeniden başlatmada ya da uykuda silinir. Ritma veriyi Neon'da tuttuğu için sorun değil.
- Ücretsiz serviste Shell/SSH yok. Bu yüzden göçler (migration) yayın sırasında build komutuyla çalıştırılır (Adım 5).
- Render ücretsiz servisi istediği zaman yeniden başlatabilir. Render'ın kendi uyarısı: ücretsiz servisleri gerçek ürün (production) için kullanmayın. Bu kurulum yalnızca deneme içindir.
- Render'ın kendi ücretsiz Postgres'i 30 gün sonra siliniyor. Onu kullanmıyoruz; Neon'da kalıyoruz.

### Render MCP'nin yapabildikleri ve yapamadıkları

Render MCP (`https://mcp.render.com/mcp`) şunları yapabilir:

- Çalışma alanlarını ve servisleri listelemek, servis ayrıntılarını göstermek
- Yeniden yayın (deploy) başlatmak, yayın geçmişini ve logları okumak
- Bir servisin ortam değişkenlerini güncellemek
- Metrikleri (CPU, bellek, istek sayıları) okumak

Şunları **yapamaz**:

- **Ücretsiz web servisi oluşturamaz.** `create_web_service` aracının `plan` alanı yalnızca ücretli planları kabul ediyor (`starter`, `standard`, …); `free` değeri listede yok. Bu yüzden servisi Render panelinden siz oluşturacaksınız (Adım 5). MCP'yi kurulumdan sonraki işler için kullanacağız.
- Servis silemez, ölçekleme ayarlarını değiştiremez. Bunlar için panel gerekir.

Dikkat edilecek iki nokta:

- `update_environment_variables` aracı belgede "servisin tüm ortam değişkenlerini güncelle" diye tanımlanıyor ve "tam liste" istiyor. Yani büyük olasılıkla eksik verilen değişkenleri siler. Bu araç kullanılacaksa önce mevcut liste kontrol edilmeli. `DATABASE_URL`'i panelden yönetmek daha güvenli.
- Render, MCP üzerinden gizli bilgilerin (ör. `DATABASE_URL`) sohbete düşmeyeceğini garanti etmiyor. Proje kuralı gereği Claude bu değeri okumamalı. Claude'dan ortam değişkenlerini listelemesini istemeyin.

## Adım 1: Render hesabı

1. <https://render.com> adresinde **Get Started** ile hesap açın. **GitHub ile giriş** en pratik seçenek, çünkü sonraki adımda zaten GitHub bağlantısı gerekecek.
2. Ücretsiz plan için kredi kartı istenmiyor. Karta yalnızca kota aşımında başvuruluyor; kart eklemezseniz servis o ay durdurulur, ücret çıkmaz.
3. Hesap açılınca bir çalışma alanı (workspace) oluşur. Adını not edin; MCP'de bu ad gerekecek.

## Adım 2: GitHub bağlantısı

Render'ın `erhan-kocak/ritma` reposunu okuyabilmesi gerekiyor. Repo gizli (private) olsa da olur.

1. Render panelinde **Account Settings → Account Security** sayfasına gidin.
2. **Git Deployment Credentials** altında **Add credential → GitHub** seçin ve GitHub'ın yetkilendirme ekranını onaylayın.
3. GitHub'da Render uygulamasına hangi repolara erişebileceği sorulursa **Only select repositories** seçip yalnızca `ritma`'yı işaretleyin. Bu ayarı sonradan <https://github.com/apps/render/installations/new> adresinden **Repository access** bölümünde değiştirebilirsiniz.

(Adım 1'de GitHub ile giriş yaptıysanız bu bağlantı kendiliğinden kurulmuş olabilir. Adım 5'te repo listede görünüyorsa bu adımı atlayın.)

## Adım 3: Neon'da canlı ortam için ayrı branch

Canlı ortamın, yerelde geliştirme yaptığınız veritabanını bozmaması için Neon'da ayrı bir branch açıyoruz. Neon'un ücretsiz planı proje başına 10 branch'e izin veriyor.

1. <https://console.neon.tech> adresinde Ritma projesini seçin.
2. Sol menüden **Branches → New branch**.
3. **Parent branch**: şu anki ana branch (varsayılan).
4. **Name**: `render`.
5. İçerik olarak **Current data** seçin. Böylece `ritma` şeması, tablolar ve örnek veri (Ayşe Yılmaz) branch'e kopyalanır; ayrıca göç ya da seed çalıştırmanız gerekmez.
6. **Önemli:** Otomatik silme (auto-deletion) seçeneği varsayılan olarak **1 gün** ile işaretli geliyor. **İşareti kaldırın**; yoksa branch bir gün sonra silinir ve site çalışmaz.
7. **Create**.

Bağlantı adresini alın:

1. Üst menüden **Connect**.
2. **Branch** olarak `render`'ı, veritabanını ve rolü seçin.
3. **Connection pooling** açık olsun. Ritma pooled (`-pooler` içeren) adresle çalışacak şekilde yazıldı (CLAUDE.md'deki kurallar).
4. Adresi kopyalayın. Bu adres gizlidir: sohbete, koda ya da commit'e yazmayın. Yalnızca Adım 5'te Render paneline yapıştıracaksınız.

Neon projesinin hangi bölgede (region) olduğuna da bakın (proje ayarlarında ya da adresin içinde, ör. `eu-central-1`). Render'da yakın bir bölge seçeceğiz.

## Adım 4: Node sürümünü sabitleme (repo değişikliği)

Ritma, `.ts` dosyalarını derlemeden çalıştırdığı için Node 24'e dayanıyor. Render'ın şu anki varsayılanı zaten 24 (`24.22.1`). Yine de varsayılan ileride değişirse diye sürümü `package.json`'da sabitlemek güvenli:

```json
"engines": {
  "node": "24.x"
}
```

Render, üst sınırı olan bir aralık yazılmasını öneriyor (`>=24` gibi açık uçlu bir aralık en son sürüme gider). `24.x` bu koşula uyuyor.

Bu alan `main`'e eklendi; bu adımda yapmanız gereken bir şey yok.

## Adım 5: Web servisini panelden oluşturma

1. Render panelinde **New → Web Service**.
2. **Git Provider** altında `erhan-kocak/ritma` reposunu seçin.
3. Alanları şöyle doldurun:

| Alan | Değer |
| --- | --- |
| Name | `ritma` (adres `ritma.onrender.com` olur; ad alınmışsa Render sona ek koyar) |
| Language | `Node` |
| Branch | `main` |
| Region | Neon'a en yakın bölge. Neon Avrupa'daysa `Frankfurt` |
| Root Directory | boş bırakın |
| Build Command | `npm install && npm run db:migrate` |
| Start Command | `npm start` |
| Instance Type / plan | **Free** |

4. **Environment Variables** bölümünde **+ Add Environment Variable**:
   - Key: `DATABASE_URL`
   - Value: Adım 3'te kopyaladığınız `render` branch'inin pooled adresi
   `PORT` eklemeyin. Render bunu kendisi veriyor (varsayılan `10000`), Ritma da `process.env.PORT`'u okuyor.
5. **Create Web Service**.

Build komutu hakkında not: Render ücretsiz serviste Shell vermediği için göçleri build sırasında çalıştırıyoruz. `npm run db:migrate` bekleyen göçleri uygular; ileride yeni bir `db/migrations/NNN-…sql` eklendiğinde de yayın sırasında kendiliğinden uygulanır. Göç başarısız olursa build başarısız olur ve önceki sürüm çalışmaya devam eder. Komut ayrıca `db/schema.sql`'i yeniden yazar; bu yalnızca Render'ın geçici kopyasında olur, repoya dokunmaz.

İlk yayın birkaç dakika sürer. **Logs** sekmesinde `npm install`, göç çıktısı (`Şema güncel.`) ve sunucunun başladığı görülmeli.

`main`'e her push'ta Render otomatik olarak yeniden yayınlar. Build başarısız olursa eski sürüm açık kalır.

## Adım 6: Render MCP'yi Claude Code'a bağlama

İki yol var. **A yolunu öneriyorum**: API anahtarı oluşturmanız ya da bir yere yapıştırmanız gerekmiyor, tarayıcıdan onaylıyorsunuz.

### A yolu (önerilen): Render eklentisi, OAuth ile

Claude Code'da, sohbet satırına sırayla yazın:

```text
/plugin marketplace add render-oss/render-plugin-claude-code
/plugin install render
```

- Kurulumda erişim kapsamı (scope) sorulursa **yalnızca bu proje** seçeneğini seçin.
- Ardından `/reload-plugins` çalıştırın.
- Claude ilk kez bir Render aracı kullandığında tarayıcıda Render onay ekranı açılır. Onaylayın. API anahtarı gerekmez.

Eklenti MCP'nin yanında Render'a özel skill'ler de ekler.

### B yolu: API anahtarı

Eklenti çalışmazsa:

1. <https://dashboard.render.com/u/settings?add-api-key> adresinde bir API anahtarı oluşturun. Anahtar yalnızca bir kez gösterilir.
2. Anahtar hesabınızın **tamamına** erişim verir (yalnızca bir çalışma alanıyla sınırlı anahtarlar henüz erken erişimde). Sohbete yazmayın, commit'lemeyin.
3. **Claude Code'un dışında**, ayrı bir PowerShell penceresinde proje klasöründeyken çalıştırın (`!` ile Claude Code içinden çalıştırırsanız anahtar sohbete düşer):

   ```powershell
   claude mcp add --transport http render https://mcp.render.com/mcp --header "Authorization: Bearer <ANAHTARINIZ>"
   ```

   Kapsam belirtilmezse `local` kullanılır: yalnızca sizde ve yalnızca bu projede geçerli olur, ayar `~/.claude.json` içinde durur ve git'e girmez. **`--scope project` kullanmayın**: anahtar repoya girecek `.mcp.json` dosyasına yazılır.
4. Claude Code'u yeniden başlatın.

### Bağlantıyı kontrol etme

- Claude Code içinde `/mcp` yazın: `render` görünmeli ve bağlı olmalı.
- Ya da ayrı terminalde `claude mcp list`: `✔ Connected` görmelisiniz.
- Claude'a şunu söyleyin: **"Render çalışma alanlarımı listele"**. Birden çok çalışma alanı varsa: **"Render çalışma alanımı `<ad>` yap"**.

## Adım 7: Yayını doğrulama

Siteyi `https://<servis-adı>.onrender.com` adresinde açın ve şunlara bakın:

- `/`: landing sayfası
- `/book.html?p=ayse-yilmaz`: bir hafta içi gününe tıklayınca boş saatler çıkıyor ve randevu alınabiliyor
- `/calendar.html?p=ayse-yilmaz`: alınan randevu takvimde görünüyor
- `/api-docs/`: Swagger arayüzü açılıyor
- Telefonda da bakın (375px civarı genişlikte yan kaydırma olmamalı).

MCP ile Claude'a sorabileceğiniz örnekler:

- "Ritma servisinin son yayın durumu ne?"
- "Ritma servisinin son hata loglarını getir."
- "Ritma servisini yeniden yayınla."
- "ritma.onrender.com neden açılmıyor?"

## Adım 8: Bilinen riskler

Bunlar CLAUDE.md'deki "Yayından önce" listesinden. Deneme için kabul edilebilir, ama adresi geniş bir çevreyle paylaşmayın:

- `/api-docs/` ve `/api/openapi.json` herkese açık. Adresi bilen herkes API'yi deneyebilir ve randevu oluşturabilir.
- Takvim uç noktası (`GET …/appointments`) herkese açık. Randevu alan kişilerin adları ve iletişim bilgileri görülebilir. **Bu adreste gerçek kişilerin bilgileriyle randevu almayın.**
- Erken erişim formu hiçbir yere veri göndermiyor. Bu adreste yapılan kayıtlar kaybolur.

## Kapatma ve temizlik

Deneme bittiğinde:

1. **Render servisi:** servisin **Settings** sayfasının altından **Suspend** (durdurma) ya da **Delete** (silme). MCP servis silemez, bunu panelden yapın.
2. **Neon branch'i:** **Branches** sayfasında `render` branch'ini silin.
3. **MCP:** A yolunu kullandıysanız `/plugin` menüsünden `render` eklentisini kaldırın. B yolunu kullandıysanız `claude mcp remove render` çalıştırın. Sonra API anahtarını **Account Settings → API Keys → ••• → Revoke** ile iptal edin (MCP'yi kaldırmak anahtarı iptal etmez).
4. **GitHub:** Render uygulamasının repo erişimini GitHub'da **Settings → Applications** altından kaldırabilirsiniz.

## Sorun giderme

| Belirti | Olası sebep ve çözüm |
| --- | --- |
| Build'de `npm run db:migrate` hata veriyor | `DATABASE_URL` eksik ya da yanlış. Panelde **Environment** sekmesinden kontrol edin; adres `render` branch'ine ait mi? |
| Logda "npm run db:migrate çalıştırın" | Tablolar yok. Neon branch'i **Current data** ile açılmamış olabilir; build komutunda `npm run db:migrate` var mı kontrol edin. |
| Randevu sayfasında hizmet veren bulunamıyor | Branch'te örnek veri yok. Yerelde, `render` branch'inin adresiyle bir kez `npm run db:seed` çalıştırın (Claude'dan yardım isteyebilirsiniz; adres sohbete yazılmamalı). |
| Site birkaç gün sonra veritabanı hatası veriyor | Neon branch'inin otomatik silmesi açık kalmış olabilir (Adım 3, 6. madde). |
| İlk açılış çok yavaş | Ücretsiz servis uykudan uyanıyor (yaklaşık 1 dakika). Normal. |
| Saatler yanlış görünüyor | Ritma saatleri sabit `Europe/Istanbul` ile hesaplıyor; sunucunun UTC'de çalışması sorun olmamalı. Sorun sürerse `TZ=UTC npm test` ile yerelde deneyin. |
| Sayfa açılıyor ama Node sürümü hatası | Adım 4'teki `engines` alanı `main`'de mi? Panelde `NODE_VERSION` ortam değişkeni de en yüksek öncelikle sürümü belirler. |

## Kaynaklar

- Render MCP: <https://render.com/docs/mcp-server>, <https://render.com/agents/claude>, <https://github.com/render-oss/render-mcp-server>
- Render ücretsiz plan: <https://render.com/docs/free>
- Render Node sürümü: <https://render.com/docs/node-version>
- Render web servisi ve Express: <https://render.com/docs/web-services>, <https://render.com/docs/deploy-node-express-app>
- Render GitHub bağlantısı: <https://render.com/docs/github>
- Render ortam değişkenleri: <https://render.com/docs/configure-environment-variables>
- Render API anahtarı: <https://render.com/docs/api>
- Claude Code MCP: <https://code.claude.com/docs/en/mcp>
- Neon branch'ler: <https://neon.com/docs/manage/branches>, <https://neon.com/docs/introduction/plans>
- Neon connection pooling: <https://neon.com/docs/connect/connection-pooling>
