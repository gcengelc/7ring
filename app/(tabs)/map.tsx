import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Dot } from '@/components/Dot';
import { Text } from '@/components/Text';
import { ROUTE_IMAGE, ROUTE_IMAGE_ASPECT, ROUTE_PATH } from '@/data/route';
import { useApp } from '@/store/AppProvider';
import { colors, spacing } from '@/theme';

const PLOT_INSET = 18;
const DOT_SIZE = 14;

/**
 * Krokinin panel içinde gerçekten kapladığı kutu.
 *
 * Görsel `contain` ile yerleşiyor: panelden farklı orandaysa kenarlarda boşluk
 * kalıyor. Durak noktaları panele göre konumlansaydı krokiden kayardı, o yüzden
 * önce çizimin kutusunu hesaplayıp yüzdeleri onun içine uyguluyoruz.
 */
function drawnBox(plot: { width: number; height: number }) {
  if (!ROUTE_IMAGE) return { x: 0, y: 0, width: plot.width, height: plot.height };
  const panelAspect = plot.width / plot.height;
  if (ROUTE_IMAGE_ASPECT > panelAspect) {
    const height = plot.width / ROUTE_IMAGE_ASPECT;
    return { x: 0, y: (plot.height - height) / 2, width: plot.width, height };
  }
  const width = plot.height * ROUTE_IMAGE_ASPECT;
  return { x: (plot.width - width) / 2, y: 0, width, height: plot.height };
}

/**
 * Hat şeması — kampüs krokisi üzerinde durakların anlık durumu.
 *
 * Krokide durak adı yazılmaz: duraklar kampüsün ortasında kümelendiği için
 * etiketler birbirinin üstüne biniyordu. Noktanın rengi zaten bildirimin
 * tazeliğini söylüyor (bkz. lib/freshness.ts); adı ve geçmişi noktaya
 * dokununca açılan durak sayfası veriyor.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { statuses } = useApp();
  const [plot, setPlot] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPlot({ width, height });
  };

  const box = drawnBox(plot);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Text variant="title">Hat şeması</Text>
      <Text variant="body" style={styles.lede}>
        Duraklar kampüs krokisinde işaretli. Rengi en canlı olan nokta ringin en son
        görüldüğü duraktır; ayrıntı için noktaya dokun.
      </Text>

      {/* Panel kalan alanın tamamını kaplar — kroki büyüdükçe noktalara
          dokunmak kolaylaşıyor. */}
      <View style={styles.board}>
        <View style={styles.plot} onLayout={onLayout}>
          {ROUTE_IMAGE ? (
            <Image
              source={ROUTE_IMAGE}
              resizeMode="contain"
              // absoluteFill tek başına yetmiyor: Image kendi asıl boyutunu
              // kullanıp panelden taşıyor, ölçüyü açıkça vermek gerekiyor.
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
              accessible={false}
            />
          ) : (
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={StyleSheet.absoluteFill}
            >
              <Path
                d={ROUTE_PATH}
                fill="none"
                stroke={colors.onNavy}
                strokeOpacity={0.18}
                strokeWidth={1.4}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </Svg>
          )}

          {plot.width > 0 &&
            statuses.map((s) => (
              <Pressable
                key={s.stop.id}
                onPress={() => router.push(`/stop/${s.stop.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${s.stop.name}, ${s.freshness.state}`}
                // Nokta küçük; dokunma alanı parmak için genişletiliyor.
                hitSlop={16}
                style={({ pressed }) => [
                  styles.dot,
                  {
                    left: box.x + (s.stop.x / 100) * box.width - DOT_SIZE / 2,
                    top: box.y + (s.stop.y / 100) * box.height - DOT_SIZE / 2,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Dot
                  color={s.freshness.color}
                  size={DOT_SIZE}
                  ring={colors.navy}
                  pulse={s.minutesAgo != null && s.minutesAgo < 4}
                />
              </Pressable>
            ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.app,
    paddingHorizontal: spacing.screenX,
  },
  lede: { marginTop: 8, fontSize: 14, color: colors.muted },
  board: {
    flex: 1,
    marginTop: 18,
    // Sekme çubuğu panelin alt köşelerini kapatmasın diye küçük bir pay.
    marginBottom: 4,
    borderRadius: 24,
    backgroundColor: colors.navy,
    padding: PLOT_INSET,
  },
  plot: { flex: 1, overflow: 'hidden' },
  dot: { position: 'absolute' },
});
