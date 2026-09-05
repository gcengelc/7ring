# 7Ring

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

## Katkı ve geliştirme

```bash
npm run icons          # ikon, adaptive-icon, splash, bildirim ikonu üretir
npm run typecheck      # tip kontrolü
npx expo export        # paketin derlendiğini doğrular
```

Android emülatörde çalıştırmak için `ANDROID_HOME` tanımlı olmalı:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
npx expo run:android
```

iOS için Xcode → Settings → Platforms altından bir iOS runtime kurulu olmalıdır.

---

## Lisans

MIT — `LICENSE` dosyasına bakın.
