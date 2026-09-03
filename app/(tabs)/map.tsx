import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Dot } from '@/components/Dot';
import { Text } from '@/components/Text';
import { ROUTE_IMAGE, ROUTE_PATH } from '@/data/route';
import { useApp } from '@/store/AppProvider';
import { colors, fonts, spacing } from '@/theme';

const PLOT_INSET_X = 18;
const PLOT_INSET_Y = 22;
const PLOT_HEIGHT = 430;

/**
 * Hat şeması — gerçek harita değil, güzergâhın topolojisi.
 * Kampüs koordinatları girildiğinde buranın yerini gerçek harita alabilir;
 * o zamana kadar şema, "hangi durak hangisinden sonra" sorusunu doğru yanıtlar.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { statuses } = useApp();
  const [plot, setPlot] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPlot({ width, height });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <Text variant="title">Hat şeması</Text>
      <Text variant="body" style={styles.lede}>
        Kampüs krokisi yerine geçici şema. Gerçek harita için kampüs koordinatları gerekiyor.
      </Text>

      <View style={styles.board}>
        <View style={styles.plot} onLayout={onLayout}>
          {/* Elle çizilmiş kroki varsa o kullanılır; yoksa geçici şema. */}
          {ROUTE_IMAGE ? (
            <Image
              source={ROUTE_IMAGE}
              resizeMode="contain"
              style={StyleSheet.absoluteFill}
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
            statuses.map((s) => {
              const fresh = s.minutesAgo != null && s.minutesAgo < 10;
              const x = (s.stop.x / 100) * plot.width;
              const y = (s.stop.y / 100) * plot.height;
              return (
                <Pressable
                  key={s.stop.id}
                  onPress={() => router.push(`/stop/${s.stop.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.stop.name}, ${s.freshness.state}`}
                  style={({ pressed }) => [
                    styles.pin,
                    labelPlacement(s.stop.x, s.stop.y, x, y, plot),
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Dot color={s.freshness.color} size={11} ring={colors.navy} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.pinLabel,
                      { color: fresh ? colors.onNavy : colors.onNavy55 },
                    ]}
                  >
                    {s.stop.name}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      </View>

      <Text variant="meta" style={styles.footnote}>
        Bir durağa dokunarak o durağın bugünkü bildirimlerini görebilirsin.
      </Text>
    </ScrollView>
  );
}

/**
 * Etiket, noktanın hangi tarafına yazılacak?
 *
 * Hat dikdörtgen bir güzergâh olduğu için duraklar kenarlarda toplanıyor.
 * Kenara göre yön seçilmezse etiketler ya kutudan taşar ya da birbirinin
 * üstüne biner:
 *   sol kenar  → etiket sağda
 *   sağ kenar  → etiket solda (pin sağ kenarından konumlanır, yoksa taşar)
 *   üst orta   → etiket altta
 *   alt orta   → etiket üstte
 */
function labelPlacement(
  px: number,
  py: number,
  x: number,
  y: number,
  plot: { width: number; height: number }
): ViewStyle {
  const middleColumn = px > 40 && px < 60;

  if (middleColumn) {
    const half = 80;
    const horizontal = { left: x - half, width: half * 2, alignItems: 'center' as const };
    return py < 50
      ? { ...horizontal, top: y - DOT_RADIUS, flexDirection: 'column' }
      : { ...horizontal, bottom: plot.height - y - DOT_RADIUS, flexDirection: 'column-reverse' };
  }

  const vertical = { top: y - DOT_RADIUS * 2, alignItems: 'center' as const };
  return px > 60
    ? { ...vertical, right: plot.width - x - DOT_RADIUS, flexDirection: 'row-reverse' }
    : { ...vertical, left: x - DOT_RADIUS, flexDirection: 'row' };
}

/** Nokta yarıçapı + halka kalınlığı — konumlandırma bu değere göre ortalanır. */
const DOT_RADIUS = 8.5;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.app },
  content: { paddingHorizontal: spacing.screenX, paddingBottom: 40 },
  lede: { marginTop: 8, fontSize: 14, color: colors.muted },
  board: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: colors.navy,
    paddingHorizontal: PLOT_INSET_X,
    paddingVertical: PLOT_INSET_Y,
    height: PLOT_HEIGHT,
  },
  plot: { flex: 1 },
  pin: { position: 'absolute', gap: 6 },
  pinLabel: { fontFamily: fonts.medium, fontSize: 11.5 },
  footnote: { marginTop: 14, color: colors.muted, fontSize: 12.5 },
});
