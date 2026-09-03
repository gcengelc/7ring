import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { RowGroup, StopRow } from '@/components/StopRow';
import { Text } from '@/components/Text';
import { Toast } from '@/components/Toast';
import { formatDistance } from '@/lib/format';
import { useApp } from '@/store/AppProvider';
import { colors, spacing } from '@/theme';
import type { StopStatus } from '@/types';

export default function Stops() {
  const insets = useSafeAreaInsets();
  const { statuses, report, settings } = useApp();

  const [pending, setPending] = useState<StopStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  }, []);

  async function confirm() {
    if (!pending) return;
    setSubmitting(true);
    try {
      await report(pending.stop.id);
      flash(`${pending.stop.name} bildirildi · teşekkürler`);
      setPending(null);
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Bildirim gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  // "Sadece yakın duraklar" açıkken en yakın durak başa gelir; kapalıyken
  // duraklar hat sırasında kalır, çünkü sıra kampüsteki güzergâhı anlatır.
  const ordered =
    settings.nearbyOnly && statuses.every((s) => s.distance != null)
      ? [...statuses].sort((a, b) => (a.distance as number) - (b.distance as number))
      : statuses;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
        <Text variant="title">Duraklar</Text>
        <Text variant="body" style={styles.lede}>
          Ringi gördüğün durağa dokun. Onaydan sonra bildirim herkese düşer.
        </Text>

        <RowGroup>
          {ordered.map((s) => (
            <StopRow
              key={s.stop.id}
              name={s.stop.name}
              color={s.freshness.color}
              sub={subtitleFor(s)}
              action="BİLDİR"
              onPress={() => setPending(s)}
              accessibilityHint="Bu duraktan ring bildirimi gönderir"
            />
          ))}
        </RowGroup>
      </ScrollView>

      <ConfirmSheet
        stopName={pending?.stop.name ?? null}
        submitting={submitting}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />

      {toast ? <Toast message={toast} bottom={24} /> : null}
    </View>
  );
}

function subtitleFor(s: StopStatus): string {
  const distance = s.distance != null ? ` · ${formatDistance(s.distance)}` : '';
  if (s.minutesAgo == null) return `bugün bildirim yok${distance}`;
  return `${s.freshness.phrase} · ${s.sightings.length} bildirim${distance}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.app },
  content: { paddingHorizontal: spacing.screenX, paddingBottom: 40 },
  lede: { marginTop: 8, fontSize: 14, color: colors.muted },
});
