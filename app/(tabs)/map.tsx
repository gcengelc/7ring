import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Dot } from '@/components/Dot';
import { Text } from '@/components/Text';
import { ROUTE_IMAGE, ROUTE_PATH } from '@/data/route';
import { useApp } from '@/store/AppProvider';
import { colors, spacing } from '@/theme';

const PLOT_INSET = 18;
const DOT_SIZE = 12;

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <Text variant="title">Hat şeması</Text>
      <Text variant="body" style={styles.lede}>
        Duraklar kampüs krokisinde işaretli. Rengi en canlı olan nokta ringin en son
        görüldüğü duraktır; ayrıntı için noktaya dokun.
      </Text>

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
                hitSlop={14}
                style={({ pressed }) => [
                  styles.dot,
                  {
                    left: (s.stop.x / 100) * plot.width - DOT_SIZE / 2,
                    top: (s.stop.y / 100) * plot.height - DOT_SIZE / 2,
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.app },
  content: { paddingHorizontal: spacing.screenX, paddingBottom: 40 },
  lede: { marginTop: 8, fontSize: 14, color: colors.muted },
  board: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: colors.navy,
    padding: PLOT_INSET,
    // Kroki kare; panel de kare olmalı. Aksi hâlde "contain" görseli
    // ortalar, durak yüzdeleri de krokiden kayar.
    aspectRatio: 1,
  },
  plot: { flex: 1, overflow: 'hidden' },
  dot: { position: 'absolute' },
});
