# 7Ring

Yeditepe kampüs ringini öğrenci bildirimleriyle takip eden mobil uygulama.
Ringi gören öğrenci durağı bildirir, herkes ringin en son nerede görüldüğünü
anında görür.

**Yığın:** React Native + Expo (SDK 57), TypeScript, expo-router.
Tek kod tabanı hem App Store hem Google Play için derlenir.
Arka uç iki seçenekten biridir: **Supabase** (Auth + Postgres + Edge Function)
ya da Node 22+ üzerinde çalışan bağımsız servis (`server/`).

---

## Hızlı başlangıç

```bash
npm install
npx expo start
```

Arka uç tanımlı değilken uygulama **demo modunda** açılır: bildirimler
cihazda tutulur, 4 haneli herhangi bir kod girişi kabul eder. Her ekran bu
modda denenebilir.

Gerçek veriyle çalıştırmak için ya Supabase'i bağlayın (aşağıda
[Supabase](#supabase) bölümü) ya da Node sunucusunu ayağa kaldırın:

```bash
cd server && npm install && npm start
```

Sonra uygulamayı sunucu adresiyle başlatın:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000 npx expo start
```

> Fiziksel cihazdan test ederken `localhost` yerine bilgisayarınızın yerel IP
> adresini kullanın (`http://192.168.1.x:4000`).

Hangi arka ucun kullanılacağı ortam değişkenlerinden seçilir
(`src/api/index.ts`): Supabase değişkenleri doluysa **Supabase**, değilse
`EXPO_PUBLIC_API_BASE_URL` doluysa **Node sunucusu**, ikisi de boşsa **demo**.

---

## Supabase

Şema, kurallar ve push gönderimi `supabase/` klasöründedir:

```
supabase/
  config.toml                           yerel geliştirme ayarları (OTP 6 hane)
  migrations/20260928000000_ring_schema.sql
                                        tablolar, RLS, RPC'ler, tetikleyici, pg_cron
  functions/notify-sighting/            yeni bildirimde Expo push gönderir
  templates/otp.html                    giriş kodu e-posta şablonu
```

| Node sunucusu | Supabase karşılığı |
|---|---|
| `codes`, `sessions`, SMTP | Supabase Auth — e-posta OTP |
| `POST /sightings` | `report_sighting(p_stop_id)` RPC — durak kontrolü, 60 sn bekleme |
| `GET /sightings` | `sightings` tablosu, RLS ile son 24 saat |
| `POST /push/register` · `unregister` | `register_push_token` · `unregister_push_token` RPC |
| `push.js` | `notify-sighting` edge function (tetikleyici + pg_net) |
| `pruneOldRows` | saatlik `pg_cron` işi |

Öğrenci alan adı kısıtı veritabanında da uygulanır: `auth.users` üzerindeki
tetikleyici başka alan adıyla hesap açılmasını engeller, RLS ve RPC'ler
yalnızca öğrenci e-postasıyla giriş yapmış oturumlara izin verir. Alan adı
`private.mail_domain()` içinde tanımlı; `src/data/stops.ts` ile aynı olmalı.

### Kurulum (barındırılan proje)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <proje-ref>
supabase db push                                   # migration'ı uygular
supabase functions deploy notify-sighting --no-verify-jwt
supabase secrets set NOTIFY_SIGHTING_SECRET=<rastgele-uzun-bir-değer>
```

Tetikleyicinin edge function'ı çağırabilmesi için proje adresini ve aynı sırrı
Vault'a yazın (SQL Editor):

```sql
select vault.create_secret('https://<proje-ref>.supabase.co', 'ring_project_url');
select vault.create_secret('<NOTIFY_SIGHTING_SECRET ile aynı değer>', 'ring_notify_secret');
```

Bu iki kayıt yoksa bildirimler yine kaydedilir, yalnızca push gitmez.

Panelde **Authentication** altında:

- **Sign In / Providers → Email:** açık. *Email OTP Length* → `6`,
  *Email OTP Expiration* → `600`.
- **Emails → Templates:** *Confirm signup* ve *Magic Link* şablonlarını
  `supabase/templates/otp.html` içeriğiyle değiştirin. Varsayılan şablonlar
  bağlantı gönderir; uygulama ise `{{ .Token }}` kodunu bekler. Şablonlar
  ancak özel SMTP tanımlıyken düzenlenebilir. Panel yerine betikle de
  yazılabilir (erişim jetonu: Account → Access Tokens):
  `SUPABASE_ACCESS_TOKEN=sbp_... node scripts/push-email-templates.mjs <proje-ref>`
- **Emails → SMTP Settings:** kendi SMTP sunucunuzu tanımlayın. Supabase'in
  yerleşik e-postası saatte birkaç iletiyle sınırlıdır, üretim için yetmez.

### Uygulamayı bağlamak

`.env.example` dosyasını `.env.local` olarak kopyalayıp doldurun ya da
`eas.json` profillerine ekleyin:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<proje-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon ya da publishable anahtar>
EXPO_PUBLIC_SUPABASE_OTP_LENGTH=6
```

Anon anahtarı istemcide durması için tasarlanmıştır; erişimi RLS ve RPC'ler
sınırlar. **Service role anahtarını uygulamaya koymayın.**

### Yerel geliştirme

```bash
supabase start          # Docker gerekir; migration otomatik uygulanır
supabase functions serve notify-sighting --env-file supabase/functions/.env
```

Yerelde giden e-postalar (giriş kodları) http://localhost:54324 adresine düşer.
Uygulamayı `EXPO_PUBLIC_SUPABASE_URL=http://<yerel-ip>:54321` ve
`supabase status` çıktısındaki anon anahtarla başlatın.

---

## Proje yapısı

```
app/                     expo-router ekranları (dosya = rota)
  _layout.tsx            fontlar, sağlayıcılar, oturum korumalı kök yığın
  login.tsx              e-posta → doğrulama kodu akışı
  (tabs)/                Ana · Duraklar · Hat · Profil
  stop/[id].tsx          durak detayı ve bildirim geçmişi

src/
  theme.ts               renk, tipografi, yarıçap jetonları — tek kaynak
  types.ts               paylaşılan tipler
  data/stops.ts          durak listesi ve e-posta alan adı
  data/route.ts          hat şeması görseli / çizgisi — çiziminizi buraya koyun
  lib/freshness.ts       bildirim yaşı → renk ve metin
  lib/format.ts          saat, mesafe, e-posta normalleştirme
  lib/push.ts            push izni ve jeton kaydı
  api/                   RingApi arayüzü + Supabase, HTTP ve cihaz-içi uygulamaları
  store/AppProvider.tsx  oturum, bildirimler, ayarlar, türetilmiş durum
  components/            Text, Button, Dot, StopRow, Toast, ConfirmSheet

supabase/                Supabase şeması, edge function, e-posta şablonu
server/                  Node servisi (node:http + node:sqlite, çatı yok)
scripts/make-assets.mjs  ikon/splash üretimi — npm run icons
```

### Mimarideki iki karar

**Tek API arayüzü.** Ekranlar `api.report(...)` çağırır; arkasında sunucu mu
Supabase mi, cihaz-içi demo mu olduğunu bilmez (`src/api/index.ts`). Backend
değiştirilecekse yalnızca ilgili `RingApi` uygulaması değişir.

**Tazelik = renk.** Bir bildirimin yaşı tek bir yerde (`lib/freshness.ts`)
renge, duruma ve metne çevrilir. Ana ekrandaki nokta, liste satırı, harita pini
ve detay zaman çizelgesi hep aynı ölçeği kullanır.

---

## Ringin yeri nasıl tahmin ediliyor

Duraklar şu sıraya göre değerlendirilir:

1. **Son 10 dakikadaki bildirim sayısı** — kalabalık onay, tek bildirimden
   güvenilirdir.
2. Eşitlik durumunda **en taze bildirim**.

Renk skalası (`lib/freshness.ts`):

| Yaş | Renk | Durum |
|---|---|---|
| < 4 dk | `#F0A81E` amber | Şu anda burada |
| 4–10 dk | `#D69B32` | Az önce görüldü |
| 10–25 dk | `#BFA05C` | Bir süre önce |
| 25–60 dk | `#B6AFA2` | Eskimiş bildirim |
| > 60 dk | `#CFC9BC` | Eski bildirim |

---

## Yapılacaklar (mağazaya çıkmadan önce)

### 1. Durak koordinatları

`src/data/stops.ts` içindeki `coords` alanları bilerek `null`. Uydurulmuş
koordinat "en yakın durak" özelliğini sessizce yanlış çalıştırır. Gerçek
enlem/boylam girildiğinde **Sadece yakın duraklar** ayarı kendiliğinden
etkinleşir; o zamana kadar Profil'de gerekçesiyle birlikte kapalı görünür.

### 2. Hat şeması çizimi

Şu anki şema geçici: güzergâhın topolojisini doğru gösterir ama kaba durur.
Kendi çiziminizi koymak için tek dosya değişir — `src/data/route.ts`:

1. Çizimi `assets/route-map.png` olarak kaydedin (kare, en az 1000×1000,
   şeffaf zemin, lacivert üzerinde okunacağı için açık renk çizgi).
2. `src/data/route.ts` içindeki satırı açın:
   `export const ROUTE_IMAGE = require('../../assets/route-map.png');`
3. `src/data/stops.ts` içindeki her durağın `x`/`y` yüzdelerini çiziminizdeki
   konumlara göre güncelleyin — sol üst (0,0), sağ alt (100,100).

Durak noktalarını ve renklerini uygulama görselin üstüne kendisi çizer;
çiziminize nokta koymayın. Etiketler kenar konumuna göre otomatik yerleşir
(sol kenar → sağda, sağ kenar → solda, üst/alt orta → dikey).

### 3. Arka uç adresi

Supabase kullanılıyorsa `eas.json` içindeki `preview` ve `production`
profillerinde `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY`
yer tutucularını (`PROJE_REF`, `SUPABASE_ANON_VEYA_PUBLISHABLE_KEY`) kendi
değerlerinizle değiştirin. Node sunucusu kullanılıyorsa `EXPO_PUBLIC_API_BASE_URL` değerlerini
kendi sunucunuzla değiştirin.

### 4. SMTP

Doğrulama kodları e-postayla gider. Supabase'te SMTP panelden tanımlanır
(yukarıda). `server/` için ortam değişkenleri:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="Ring Nerede <noreply@ringnerede.app>"
MAIL_DOMAIN=@std.yeditepe.edu.tr
DB_PATH=./data/ring.db
PORT=4000
```

SMTP tanımlı değilse kodlar sunucu günlüğüne yazılır ve servis açılışta uyarır.
**Üretimde SMTP tanımlanmadan yayına alınmamalı.**

### 5. EAS proje kimliği

```bash
npm install -g eas-cli
eas login
eas init
```

Bu komut `app.json` içindeki `extra.eas.projectId` alanını doldurur. Push
bildirimleri bu kimlik olmadan çalışmaz.

### 6. Kurumsal onay

Uygulama Yeditepe adını ve öğrenci e-posta alan adını kullanıyor. Her iki mağaza
da bir kuruma ait isim/marka kullanımında yetki belgesi isteyebilir. Yayına
çıkmadan önce üniversiteden yazılı izin alın.

---

## Mağazaya gönderim

### Hazırlık

```bash
npm run icons          # ikon, adaptive-icon, splash, bildirim ikonu üretir
npm run typecheck      # tip kontrolü
npx expo export        # paketin derlendiğini doğrular
```

### Google Play

```bash
eas build --profile production --platform android    # .aab üretir
eas submit --platform android
```

- Play Console'da uygulama oluşturun, paket adı: `com.ringnerede.app`
- `eas.json` → `submit.production.android.serviceAccountKeyPath` alanına Play
  Console'dan indirdiğiniz servis hesabı JSON'unu gösterin
- İlk gönderim **internal testing** kanalına gider; oradan production'a
  yükseltirsiniz
- Gerekli beyanlar: veri güvenliği formu (konum ve e-posta topluyorsunuz),
  gizlilik politikası URL'si

### App Store

```bash
eas build --profile production --platform ios        # .ipa üretir
eas submit --platform ios
```

- App Store Connect'te uygulama oluşturun, bundle id: `com.ringnerede.app`
- `eas.json` → `submit.production.ios` altındaki `appleId`, `ascAppId`,
  `appleTeamId` alanlarını doldurun
- Konum izni açıklaması `app.json` içinde tanımlı; App Review bu metni okur
- `usesNonExemptEncryption: false` ayarlandı (uygulama yalnızca standart HTTPS
  kullanıyor)

### Sürüm numaraları

`eas.json` içinde `autoIncrement` açık — `versionCode` ve `buildNumber` her
üretim derlemesinde otomatik artar. Kullanıcıya görünen sürümü (`version`)
`app.json` içinden elle yükseltin.

---

## Hesap silme ve şikayet

Mağaza kuralları gereği profilde **Hesabımı sil**, durak ekranında başkasının
bildiriminde **Yanlış** (şikayet) vardır. Üç arka uçta da aynı davranır:

- Hesap silinince kullanıcının bildirimleri, push jetonları ve şikayetleri de
  silinir (Supabase: `delete_my_account()`, Node: `DELETE /account`).
- Şikayet eden kişi o bildirimi bir daha görmez; **3 farklı kişi** şikayet
  ederse bildirim herkesten gizlenir, satır inceleme için veritabanında kalır
  (Supabase: `flag_sighting()` + `private.flag_limit()`, Node: `POST /sightings/flag`
  + `FLAG_LIMIT`). Kendi bildirimini şikayet etmek ve aynı bildirimi iki kez
  saymak engellidir.

---

## Bilinen sınırlar

- **Konuma göre push filtresi sunucuda yapılmıyor.** Konum sunucuya
  gönderilmediği için "sadece yakın duraklar" tercihi şimdilik cihaz tarafında
  listeleme sırasını etkiler, push seçimini etkilemez (`server/src/push.js`).
- **Güven puanı basit.** Şu an tek bildirim atan herkes "A" alıyor. Yanlış
  bildirim tespiti (aykırı bildirimleri ayıklama) henüz yok.
- **Kroki üzerindeki pin → durak eşleşmesi tahmin.** Krokide isim yoktu;
  pinler konumlarına göre dağıtıldı ve 10 pinden biri boşta kaldı
  (`UNASSIGNED_PIN`). Yanlış olanı düzeltmek `stops.ts` içinde tek satır.
- **Supabase oturumu AsyncStorage'da.** Supabase istemcisi erişim ve yenileme
  jetonunu AsyncStorage'da tutar (Keychain/Keystore değil); SecureStore'un
  2 KB sınırı Supabase oturumu için dar kalıyor. Node sunucusunun jetonu
  SecureStore'da kalmaya devam ediyor.
- **Oturumlar süresiz (Node sunucusu).** Sunucuda jeton sona erme süresi yok; eklenmesi
  önerilir (`sessions.created_at` bu iş için hazır duruyor).

---

## Doğrulama durumu

| Kontrol | Durum |
|---|---|
| `npx tsc --noEmit` | ✅ hatasız |
| `npx expo export` | ✅ paket derleniyor |
| Sunucu uçtan uca (curl) | ✅ giriş, bildirim, liste, push kaydı, hata yolları |
| Android emülatör (Pixel 9 Pro, API 35) | ✅ tüm ekranlar elle gezildi |
| iOS Simulator | ⚠️ bu makinede iOS runtime kurulu değil (Xcode → Platforms) |

Emülatörde doğrulanan akış: giriş kapısı (oturumsuz açılışta giriş ekranı) →
e-posta → kod → ana ekran → durak bildirimi → onay sayfası → toast → hat şeması
→ durak detayı → profil. Bildirim sayacının uygulama kapanıp açıldıktan sonra
korunduğu da ayrıca doğrulandı.

### Emülatörde çalıştırmak için

`ANDROID_HOME` tanımlı olmalı, yoksa Gradle SDK yolunu bulamaz:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
npx expo run:android
```

iOS için Xcode → Settings → Platforms altından bir iOS runtime kurmanız gerekir;
bu makinede kurulu değil.
