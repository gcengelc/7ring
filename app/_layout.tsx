import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
  useFonts,
} from '@expo-google-fonts/instrument-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from '@/store/AppProvider';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });

  // Font indirilemezse sistem yazı tipiyle devam ederiz; açılışta takılmak
  // fontun doğru olmasından daha kötü.
  if (!fontsLoaded && fontError === null) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { booting, session } = useApp();

  useEffect(() => {
    if (!booting) void SplashScreen.hideAsync();
  }, [booting]);

  // Oturum okunana kadar hiçbir rota gösterilmez; aksi hâlde giriş ekranı
  // bir kare görünüp kayboluyor.
  if (booting) return <View style={{ flex: 1, backgroundColor: colors.navy }} />;

  return (
    <View style={{ flex: 1, backgroundColor: session ? colors.app : colors.navy }}>
      <StatusBar style={session ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.app },
        }}
      >
        {/* Rota koruması router'ın kendi mekanizmasıyla: oturum durumu
            değiştiğinde yönlendirme kendiliğinden yapılır. */}
        <Stack.Protected guard={session !== null}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="stop/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
        <Stack.Protected guard={session === null}>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </View>
  );
}
