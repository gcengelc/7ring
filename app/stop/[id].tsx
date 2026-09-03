import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api';
import { Button } from '@/components/Button';
import { Dot } from '@/components/Dot';
import { Text } from '@/components/Text';
import { Toast } from '@/components/Toast';
import { freshness, minutesSince } from '@/lib/freshness';
import { formatDistance, formatTime } from '@/lib/format';
import { useApp } from '@/store/AppProvider';
import { colors, fonts, spacing } from '@/theme';

export default function StopDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { statusFor, report, now, isMine } = useApp();

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  }, []);

  const status = id ? statusFor(id) : undefined;

  if (!status) {
    return (
      <View style={[styles.screen, styles.missing, { paddingTop: insets.top + 24 }]}>
        <Text variant="body" style={{ color: colors.muted }}>
          Bu durak bulunamadı.
        </Text>
        <Button label="Geri dön" tone="outline" onPress={() => router.back()} />
      </View>
    );
  }

  async function onReport() {
    if (!status) return;
    setSubmitting(true);
    try {
      await report(status.stop.id);
      flash(`${status.stop.name} bildirildi · teşekkürler`);
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Bildirim gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  const history = status.sightings.slice(0, 8);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Geri"
        style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={styles.backLabel}>‹ Geri</Text>
      </Pressable>

      <View style={styles.header}>
        <View style={styles.state}>
          <Dot color={status.freshness.color} size={12} />
          <Text variant="label">{status.freshness.state}</Text>
        </View>
        <Text variant="heading" style={styles.name}>
          {status.stop.name}
        </Text>
        <Text variant="body" style={styles.sub}>
          {subtitleFor(status.minutesAgo, status.freshness.phrase, status.sightings.length,
            status.distance)}
        </Text>
      </View>

      <Text variant="label" style={styles.sectionLabel}>
        Bugünkü bildirimler
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 ? (
          <Text variant="body" style={{ color: colors.muted }}>
            Bu durak için bugün hiç bildirim yok.
          </Text>
        ) : (
          history.map((s, i) => {
            const f = freshness(minutesSince(s.at, now));
            const last = i === history.length - 1;
            return (
              <View key={s.id} style={styles.entry}>
                <View style={styles.rail}>
                  <Dot color={f.color} />
                  {!last && <View style={styles.railLine} />}
                </View>
                <View style={styles.entryBody}>
                  <Text variant="row" tabular style={styles.entryTime}>
                    {formatTime(s.at)}
                  </Text>
                  <Text variant="meta" style={styles.entryBy}>
                    {isMine(s) ? 'senin bildirimin' : `${s.by} bildirdi`}
                    {s.pending ? ' · gönderiliyor' : ''}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 16 }}>
        <Button
          label="Ringi burada gördüm"
          tone="primary"
          loading={submitting}
          onPress={onReport}
          accessibilityHint="Bu duraktan yeni bir bildirim gönderir"
        />
      </View>

      {toast ? <Toast message={toast} bottom={insets.bottom + 90} /> : null}
    </View>
  );
}

function subtitleFor(
  minutesAgo: number | null,
  phrase: string,
  total: number,
  distance: number | null
): string {
  const near = distance != null ? ` · ${formatDistance(distance)} uzakta` : '';
  if (minutesAgo == null) return `Bugün hiç bildirim yok${near}`;
  return `${phrase} · toplam ${total} bildirim${near}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.app,
    paddingHorizontal: spacing.screenX,
  },
  missing: { gap: 16, justifyContent: 'center' },
  back: { alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 12 },
  backLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  header: { marginTop: 16 },
  state: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  name: { marginTop: 10 },
  sub: { marginTop: 10, color: colors.muted },
  sectionLabel: { marginTop: 26 },
  list: { flex: 1, marginTop: 14 },
  listContent: { paddingBottom: 8 },
  entry: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  rail: { width: 12, alignItems: 'center', paddingTop: 6 },
  railLine: { width: 1, flex: 1, minHeight: 26, backgroundColor: colors.hairline },
  entryBody: { paddingBottom: 6, flex: 1 },
  entryTime: { fontSize: 15.5 },
  entryBy: { marginTop: 2, fontSize: 13, color: colors.muted },
});
