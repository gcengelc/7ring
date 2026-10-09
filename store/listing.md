# Mağaza dosyası — Ring Nerede

Metinleri App Store Connect ve Play Console'a yapıştırın. **Bu dosyaya şifre,
test hesabı ya da anahtar yazmayın**; repo herkese açıksa orada görünür.

## Kimlik

| | |
|---|---|
| Ad | Ring Nerede |
| Paket / bundle | `com.ringnerede.app` |
| Kategori | Navigasyon (alternatif: Yardımcı Programlar / Eğitim) |
| Dil | Türkçe |
| Gizlilik politikası | `https://gcengelc.github.io/7ring/privacy.html` |
| Hesap silme (Play) | `https://gcengelc.github.io/7ring/account-deletion.html` |
| Destek e-postası | `DESTEK_EPOSTA` (docs/ ve burada değiştirin) |

## Metinler

**Alt başlık (App Store, ≤30):** Kampüs ringi şimdi nerede?

**Kısa açıklama (Play, ≤80):** Öğrencilerin bildirimleriyle kampüs ringinin hangi durakta olduğunu gör.

**Uzun açıklama:**

Ring Nerede, kampüs ringinin şu an hangi durakta olduğunu öğrencilerin kendi bildirimleriyle gösterir.

• Ringi gören bir öğrenci tek dokunuşla bildirir; sen de ringin son görüldüğü durağı ve kaç dakika önce olduğunu hemen görürsün.
• Aynı durakta birden fazla öğrenci bildirdiyse bilgi “doğrulandı” olarak işaretlenir. Tek kişinin bildirimi “doğrulanmadı” görünür.
• Hat şemasında tüm durakları renk kodlu tazeliğiyle izle.
• İstersen yeni ring bildirimlerinde push al.
• Yanlış bir bildirim gördüysen “Yanlış” ile şikayet et; birkaç şikayet alan bildirim herkesten gizlenir.
• Giriş şifresizdir: e-postana gelen kodla yapılır.

Ring Nerede bağımsız bir öğrenci projesidir; üniversitenin resmî uygulaması değildir.

**Anahtar kelimeler (App Store, ≤100):** ring,kampüs,otobüs,servis,durak,öğrenci,ulaşım

**Yenilikler (1.0.0):** İlk sürüm.

## Yaş derecelendirmesi

Şiddet, cinsellik, kumar, alkol vb. yok. Kullanıcı içeriği: yalnızca durak ve zaman
bildirimi (serbest metin yok). Sonuç: App Store 4+, Play “Herkes”.

## Apple — Uygulama Gizliliği (App Privacy)

“Verileri toplar” seçin; hiçbirini izleme (tracking) için kullanmıyoruz.

| Veri türü | Amaç | Kimliğe bağlı | İzleme |
|---|---|---|---|
| E-posta adresi | Uygulama işlevselliği, kimlik doğrulama | Evet | Hayır |
| Kullanıcı kimliği | Uygulama işlevselliği | Evet | Hayır |
| Diğer kullanıcı içeriği (ring bildirimi) | Uygulama işlevselliği | Evet | Hayır |
| Cihaz kimliği (push jetonu) | Uygulama işlevselliği | Evet | Hayır |

Konum: **toplanmıyor** (yalnızca cihazda kullanılıyor, sunucuya gitmiyor).

## Google Play — Veri güvenliği

- Veri topluyor mu: **Evet**. Paylaşıyor mu: **Hayır** (Supabase ve Expo “hizmet sağlayıcı” sayılır, paylaşım değil).
- Aktarım sırasında şifreleme: **Evet** (HTTPS).
- Kullanıcı silme talebi: **Evet** — uygulama içinden ve yukarıdaki web adresinden.
- Toplanan türler: E-posta adresi, Kullanıcı kimlikleri, Diğer uygulama içi içerik, Cihaz veya diğer kimlikler (push). Konum: toplanmıyor.
- Hepsi “uygulama işlevselliği” / “hesap yönetimi” amacıyla; isteğe bağlı değil (giriş için gerekli).

## İnceleme notları (App Review / Play erişim talimatları)

> Uygulama yalnızca @std.yeditepe.edu.tr öğrenci e-postalarıyla giriş kabul eder
> ve şifre yoktur; e-postaya 6 haneli kod gelir. İncelemeniz için şu hesabı
> hazırladık: **E-POSTA** — kod, bu kutuya gelir; kutuya erişim: **ERİŞİM
> BİLGİSİ**. Giriş sonrası ana sayfada ringin son görüldüğü durak, “Duraklar”
> sekmesinde durak listesi, durak ekranında “Ringi burada gördüm” (bildirim) ve
> başkasının bildiriminde “Yanlış” (şikayet) bulunur. Hesap silme: Profil →
> Hesabımı sil. Konum izni yalnızca cihazda durak sıralaması içindir.

Doldurulacaklar: inceleme için üniversiteden alınmış bir test posta kutusu
(en temizi) ve o kutuya erişim bilgisi. Bunlar yalnızca mağaza formlarına
yazılır, repoya değil.

## Ekran görüntüleri

Ana sayfa (hero), Duraklar listesi, Hat şeması (harita), Durak detayı, Profil.
iPhone 6.7" (1290×2796) ve 6.1" setleri; Play için en az 2 telefon görüntüsü
(1080×1920 üstü). Gerçek bildirim verisiyle, demo modu uyarısı olmadan alın.

## Yayın kontrol listesi

- [ ] Üniversiteden yazılı isim/e-posta alan adı izni
- [ ] Supabase: `supabase db push`, edge function, secrets, Vault, özel SMTP
- [ ] `eas.json`: Supabase URL/anahtar, submit alanları (Apple ID, ASC App ID, Team ID, Play servis hesabı)
- [ ] `eas init` (`extra.eas.projectId`)
- [ ] Android push: Firebase projesi + FCM anahtarı EAS'e (`eas credentials`)
- [ ] GitHub Pages açık (main /docs); `DESTEK_EPOSTA` gerçek adresle değiştirildi
- [ ] Durak koordinatları (`src/data/stops.ts`) — girilene kadar “yakın duraklar” kapalı
- [ ] İnceleme test hesabı hazır
- [ ] Preview derlemesiyle gerçek ring üzerinde saha testi
- [ ] `eas build --profile production` → `eas submit`
