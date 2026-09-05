# Ring Nerede

Yeditepe kampüs ringini öğrenci bildirimleriyle takip eden mobil uygulama.
Ringi gören öğrenci durağı bildirir, herkes ringin en son nerede görüldüğünü
anında görür.

**Yığın:** React Native + Expo (SDK 57), TypeScript, expo-router.
Tek kod tabanı hem App Store hem Google Play için derlenir.
Sunucu tarafı Node 22+ üzerinde çalışan bağımsız bir servistir.

---

## Hızlı başlangıç

```bash
npm install
npx expo start
```

Sunucu adresi tanımlı değilken uygulama **demo modunda** açılır: bildirimler
cihazda tutulur, 4 haneli herhangi bir kod girişi kabul eder. Her ekran bu
modda denenebilir.

Gerçek veriyle çalıştırmak için sunucuyu ayağa kaldırın:

```bash
cd server && npm install && npm start
```

Sonra uygulamayı sunucu adresiyle başlatın:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000 npx expo start
```

> Fiziksel cihazdan test ederken `localhost` yerine bilgisayarınızın yerel IP
> adresini kullanın (`http://192.168.1.x:4000`).

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
  api/                   RingApi arayüzü + HTTP ve cihaz-içi uygulamaları
  store/AppProvider.tsx  oturum, bildirimler, ayarlar, türetilmiş durum
  components/            Text, Button, Dot, StopRow, Toast, ConfirmSheet

server/                  Node servisi (node:http + node:sqlite, çatı yok)
scripts/make-assets.mjs  ikon/splash üretimi — npm run icons
```

### Mimarideki iki karar

**Tek API arayüzü.** Ekranlar `api.report(...)` çağırır; arkasında sunucu mu
yoksa cihaz-içi demo mu olduğunu bilmez (`src/api/index.ts`). Backend
değiştirilecekse yalnızca `HttpApi` değişir.

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

### 3. Sunucu adresi

`eas.json` içindeki `EXPO_PUBLIC_API_BASE_URL` değerlerini kendi sunucunuzla
değiştirin (`preview` ve `production` profillerinde).

### 4. SMTP

Doğrulama kodları e-postayla gider. `server/` için ortam değişkenleri:

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

## Bilinen sınırlar

- **Konuma göre push filtresi sunucuda yapılmıyor.** Konum sunucuya
  gönderilmediği için "sadece yakın duraklar" tercihi şimdilik cihaz tarafında
  listeleme sırasını etkiler, push seçimini etkilemez (`server/src/push.js`).
- **Güven puanı basit.** Şu an tek bildirim atan herkes "A" alıyor. Yanlış
  bildirim tespiti (aykırı bildirimleri ayıklama) henüz yok.
- **Kroki üzerindeki pin → durak eşleşmesi tahmin.** Krokide isim yoktu;
  pinler konumlarına göre dağıtıldı ve 10 pinden biri boşta kaldı
  (`UNASSIGNED_PIN`). Yanlış olanı düzeltmek `stops.ts` içinde tek satır.
- **Oturumlar süresiz.** Sunucuda jeton sona erme süresi yok; eklenmesi
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
