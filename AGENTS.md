# Ritma — Ajan Kuralları ve Yönergeleri

Bu dosya, projede çalışan ajanların uyması gereken temel kuralları tanımlar.

## Ana Referans Kaynağı (Single Source of Truth)

Projenin mimarisi, teknoloji yığını, kodlama standartları, komutları, yasakları ve doğrulama adımları için **tek ve ana başvuru kaynağı [CLAUDE.md](CLAUDE.md) dosyasıdır**.

> [!IMPORTANT]
> Bir kuralı, teknik kısıtı, kodlama standardını veya komut kullanımını incelemen gerektiğinde her zaman doğrudan **[CLAUDE.md](CLAUDE.md)** dosyasına başvur ve oradaki kuralları harfiyen uygula.

@[CLAUDE.md](CLAUDE.md)

---

## Temel Güvenlik Kuralı: .env Dosyası Erişim Yasağı

Asistan / Ajan, hiçbir koşulda `.env` veya türevi ortam değişkeni dosyalarını okumayacak, görüntülemeyecek, düzenlemeyecek ve içeriğini yazdırmayacaktır.

1. **Dosya Okuma Yasağı:** `read_file` veya benzeri herhangi bir araçla `.env`, `.env.local`, `.env.*` dosyaları açılamaz ve okunamaz.
2. **Terminal Yasağı:** Terminal/kabuk üzerinden `cat`, `Get-Content`, `type` vb. komutlar veya scriptlerle `.env` okunamaz veya aktarılamaz.
3. **Şablon ve İletişim:** Yalnızca `.env.example` okunabilir. Bir değişken gerektiğinde kullanıcıya doğrudan sorulmalıdır.
