# 7Ring

Yeditepe kampüs ringini öğrenci bildirimleriyle takip eden mobil uygulama.
Ringi gören öğrenci durağı bildirir, herkes ringin en son nerede görüldüğünü
anında görür.

**Yığın:** React Native + Expo (SDK 57), TypeScript, expo-router.
Tek kod tabanı hem App Store hem Google Play için derlenir.
Backend Supabase: Auth (e-posta kodu), Postgres (bildirimler) ve push için
bir Edge Function. Ayrıca barındırılan bir sunucu yok.

---

## Hızlı başlangıç

```bash
npm install
npx expo start
```

Supabase anahtarları tanımlı değilken uygulama **demo modunda** açılır:
bildirimler cihazda tutulur, 6 haneli herhangi bir kod girişi kabul edilir.
Her ekran bu modda denenebilir.

Gerçek veriyle çalıştırmak için `.env.example` dosyasını `.env` olarak
kopyalayıp Supabase projenizin değerlerini girin:

```bash
cp .env.example .env
# EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start
```

Şema ve push fonksiyonu depoda hazır:

```bash
npm run db:push            # supabase/migrations → veritabanı
npm run functions:deploy   # push gönderen Edge Function
```

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
  lib/supabase.ts        Supabase istemcisi + oturum kasası
  api/                   RingApi arayüzü + Supabase ve cihaz-içi uygulamaları
  store/AppProvider.tsx  oturum, bildirimler, ayarlar, türetilmiş durum
  components/            Text, Button, Dot, StopRow, Toast, ConfirmSheet

supabase/
  migrations/            şema, RLS, RPC'ler — npm run db:push
  functions/             Edge Function: yeni bildirimde push gönderir

scripts/make-assets.mjs  ikon/splash üretimi — npm run icons
```

### Mimarideki kararlar

**Tek API arayüzü.** Ekranlar `api.report(...)` çağırır; arkasında Supabase mi
yoksa cihaz-içi demo mu olduğunu bilmez (`src/api/index.ts`). Backend
değiştirilecekse yalnızca `SupabaseApi` değişir.

**Yazmalar RPC'den geçer.** Durak doğrulaması, bildirim bekleme süresi ve
kısa ad üretimi veritabanındaki `report_sighting` / `register_push_token`
fonksiyonlarında durur; RLS satır erişimini, RPC ise kuralları uygular.

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

`package.json` içindeki `overrides` alanı `react-dom`'u `react` ile aynı
sürüme sabitler. Sebebi: react-dom doğrudan bağımlılığımız değil, expo-router
üzerinden gelen bir peer; npm onu en yeni sürümle çözmeye çalışıyor ve Expo
SDK'nın sabitlediği react sürümüyle çakışıp `npm install`'ı düşürüyordu.
Expo SDK 57 zaten ikisini de 19.2.3 bekliyor (`bundledNativeModules.json`).

Android emülatörde çalıştırmak için `ANDROID_HOME` tanımlı olmalı:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
npx expo run:android
```

iOS için Xcode → Settings → Platforms altından bir iOS runtime kurulu olmalıdır.

---

## Lisans

MIT — `LICENSE` dosyasına bakın.
