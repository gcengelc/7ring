import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { colors, fonts, radius } from '@/theme';

const TABS = [
  { name: 'index', label: 'Ana' },
  { name: 'stops', label: 'Duraklar' },
  { name: 'map', label: 'Hat' },
  { name: 'profile', label: 'Profil' },
] as const;

/**
 * Sekmeler tasarımdaki gibi yuvarlatılmış dolu bloklar; iOS/Android'in
 * varsayılan sekme çubuğu yerine kendi çubuğumuzu çiziyoruz.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => {
        const activeName = props.state.routes[props.state.index]?.name;
        return (
          <View
            style={[
              styles.bar,
              { paddingBottom: Math.max(insets.bottom, 12) + (Platform.OS === 'ios' ? 12 : 8) },
            ]}
          >
            {TABS.map((tab) => {
              const focused = activeName === tab.name;
              return (
                <Pressable
                  key={tab.name}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: focused ? colors.navy : colors.tabIdleBg,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (!focused) props.navigation.navigate(tab.name);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={tab.label}
                >
                  <Text
                    style={[styles.label, { color: focused ? colors.onNavy : colors.tabIdleFg }]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.app },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: colors.app,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: radius.control + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.semibold, fontSize: 13.5, letterSpacing: -0.14 },
});
