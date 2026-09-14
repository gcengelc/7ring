import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isDemoMode } from '@/api';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { hasCoordinates } from '@/data/stops';
import { useApp } from '@/store/AppProvider';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Settings } from '@/types';

interface Option {
  key: keyof Settings;
  label: string;
  /** Kapalıysa nedenini söyleyen satır; boşsa anahtar kullanılabilir. */
  disabledNote?: string;
}

const OPTIONS: Option[] = [
  { key: 'push', label: 'Ring bildirimleri' },
  {
    key: 'nearbyOnly',
    label: 'Sadece yakın duraklar',
    ...(hasCoordinates ? {} : { disabledNote: 'Durak koordinatları girilince açılır' }),
  },
  { key: 'sound', label: 'Bildirim sesi' },
];

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { session, myReports, settings, setSetting, signOut } = useApp();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <Text variant="title">Profil</Text>

      <View style={styles.card}>
        <Text variant="label" style={styles.cardLabel}>
          Doğrulanmış öğrenci
        </Text>
        <Text style={styles.email}>{session?.email ?? '—'}</Text>

        <View style={styles.stats}>
          <View>
            <Text variant="stat" tabular>
              {myReports}
            </Text>
            <Text variant="meta" style={styles.statLabel}>
              bildirimin
            </Text>
          </View>
          <View>
            <Text variant="stat">{myReports > 0 ? 'A' : '—'}</Text>
            <Text variant="meta" style={styles.statLabel}>
              güven puanı
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.group}>
        {OPTIONS.map((opt) => {
          const disabled = Boolean(opt.disabledNote);
          const on = settings[opt.key] && !disabled;
          return (
            <Pressable
              key={opt.key}
              onPress={() => !disabled && setSetting(opt.key, !settings[opt.key])}
              disabled={disabled}
              accessibilityRole="switch"
              accessibilityState={{ checked: on, disabled }}
              accessibilityLabel={opt.label}
              style={({ pressed }) => [styles.option, { opacity: pressed ? 0.75 : 1 }]}
            >
              <View style={styles.optionText}>
                <Text
                  variant="row"
                  style={{ fontSize: 15.5, color: disabled ? colors.muted : colors.ink }}
                >
                  {opt.label}
                </Text>
                {opt.disabledNote ? (
                  <Text variant="meta" style={styles.optionNote}>
                    {opt.disabledNote}
                  </Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.track,
                  {
                    backgroundColor: on ? colors.navy : colors.switchOff,
                    justifyContent: on ? 'flex-end' : 'flex-start',
                    opacity: disabled ? 0.5 : 1,
                  },
                ]}
              >
                <View style={styles.knob} />
              </View>
            </Pressable>
          );
        })}
      </View>

      {isDemoMode ? (
        <Text variant="meta" style={styles.demoNote}>
          Demo modu: bildirimler yalnızca bu cihazda tutuluyor. Supabase anahtarları
          tanımlandığında uygulama gerçek veriye geçer.
        </Text>
      ) : null}

      <Button label="Çıkış yap" tone="outline" onPress={signOut} style={styles.signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.app },
  content: { paddingHorizontal: spacing.screenX, paddingBottom: 40 },

  card: {
    marginTop: 18,
    padding: 20,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  cardLabel: { fontSize: 11.5 },
  email: { marginTop: 8, fontFamily: fonts.semibold, fontSize: 17, letterSpacing: -0.17 },
  stats: { marginTop: 18, flexDirection: 'row', gap: 26 },
  statLabel: { fontSize: 12.5, color: colors.muted },

  group: {
    marginTop: 16,
    backgroundColor: colors.hairline,
    borderRadius: radius.card,
    overflow: 'hidden',
    gap: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: colors.card,
  },
  optionText: { flex: 1 },
  optionNote: { marginTop: 2, fontSize: 12, color: colors.muted },
  track: { width: 46, height: 28, borderRadius: 14, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.card },

  demoNote: { marginTop: 16, color: colors.muted, lineHeight: 18 },
  signOut: { marginTop: 16 },
});
