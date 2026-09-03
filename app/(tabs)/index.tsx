import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dot } from '@/components/Dot';
import { RowGroup, StopRow } from '@/components/StopRow';
import { Text } from '@/components/Text';
import { formatTime } from '@/lib/format';
import { useApp } from '@/store/AppProvider';
import { colors, fonts, freshnessScale, radius, spacing } from '@/theme';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { top, seen, now, refresh, refreshing, syncError } = useApp();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />
      }
    >
      <View style={styles.topRow}>
        <Text variant="label">Kampüs ringi · tek hat</Text>
        <Text variant="meta" tabular style={styles.clock}>
          {formatTime(now)}
        </Text>
      </View>

      {/* Ringin şu an nerede olduğu tahmini — ekranın tek büyük iddiası. */}
      <View style={styles.hero}>
        <Text variant="label" style={styles.heroEyebrow}>
          En son burada görüldü
        </Text>
        <View style={styles.heroName}>
          <Dot color={top.freshness.color} size={12} pulse />
          <Text variant="heading" style={styles.heroTitle}>
            {top.stop.name}
          </Text>
        </View>
        <View style={styles.heroMeta}>
          <Text style={[styles.heroAgo, { color: top.freshness.color }]}>
            {top.freshness.ago}
          </Text>
          <View style={styles.heroDivider} />
          <Text style={styles.heroCount}>
            {Math.max(1, top.recentCount || top.sightings.length)} öğrenci bildirdi
          </Text>
        </View>
        <View style={styles.heroRule} />
        <Text style={styles.heroHint}>{hintFor(top.recentCount, top.minutesAgo)}</Text>
      </View>

      {syncError ? <Text style={styles.syncError}>{syncError}</Text> : null}

      <Text variant="label" style={styles.sectionLabel}>
        Son bildirimler
      </Text>

      {seen.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="body" style={styles.emptyText}>
            Bugün henüz bildirim yok. Ringi görürsen Duraklar sekmesinden ilk sen bildir.
          </Text>
        </View>
      ) : (
        <RowGroup>
          {seen.slice(0, 5).map((s) => (
            <StopRow
              key={s.stop.id}
              name={s.stop.name}
              color={s.freshness.color}
              nameColor={s.freshness.textColor}
              ago={s.freshness.ago}
              onPress={() => router.push(`/stop/${s.stop.id}`)}
              accessibilityHint="Durak geçmişini açar"
            />
          ))}
        </RowGroup>
      )}

      {/* Renk skalasının ne anlama geldiğini bir kez söyle. */}
      <View style={styles.legend}>
        <View style={styles.legendBars}>
          <View style={[styles.bar, { backgroundColor: freshnessScale.now }]} />
          <View style={[styles.bar, { backgroundColor: '#CDA45C' }]} />
          <View style={[styles.bar, { backgroundColor: freshnessScale.stale }]} />
        </View>
        <Text variant="meta" style={styles.legendText}>
          Renk soldukça bildirim eskiyor
        </Text>
      </View>
    </ScrollView>
  );
}

function hintFor(recentCount: number, minutesAgo: number | null): string {
  if (minutesAgo == null) {
    return 'Henüz kimse bildirim atmadı. Ringi görürsen ilk sen bildir.';
  }
  if (recentCount > 1) {
    return `${recentCount} öğrenci son 10 dakikada burada gördü. Yakınsan yetişebilirsin.`;
  }
  return 'Tek bildirim var. Sen de görürsen onayla, bilgi güçlensin.';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.app },
  content: { paddingHorizontal: spacing.screenX, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  clock: { fontSize: 12, color: colors.muted },

  hero: {
    marginTop: 18,
    borderRadius: radius.panel,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 24,
    backgroundColor: colors.navy,
  },
  heroEyebrow: { color: colors.onNavy55, fontSize: 11.5 },
  heroName: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  heroTitle: { color: colors.onNavy, flexShrink: 1 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  heroAgo: { fontSize: 14.5, fontFamily: fonts.semibold },
  heroDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.onNavy35 },
  heroCount: { fontSize: 14.5, fontFamily: fonts.regular, color: colors.onNavy75 },
  heroRule: { marginTop: 20, height: 1, backgroundColor: colors.onNavy14 },
  heroHint: { marginTop: 16, fontSize: 13.5, lineHeight: 20, fontFamily: fonts.regular, color: colors.onNavy62 },

  syncError: { marginTop: 14, fontSize: 12.5, color: colors.muted },
  sectionLabel: { marginTop: 28 },

  empty: {
    marginTop: 12,
    padding: 20,
    borderRadius: radius.row,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  emptyText: { color: colors.muted },

  legend: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, paddingHorizontal: 4 },
  legendBars: { flexDirection: 'row', gap: 4 },
  bar: { width: 22, height: 6, borderRadius: 3 },
  legendText: { fontSize: 12.5, color: colors.muted, flex: 1 },
});
