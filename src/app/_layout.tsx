import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { OtaUpdateBanner } from '@/components/OtaUpdateBanner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { observeAuth } from '@/services/auth';
import { useAuthStore } from '@/store/useAuthStore';

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = Colors[scheme];
  const { user, ready, setUser } = useAuthStore();
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => observeAuth(setUser), [setUser]);

  useEffect(() => {
    const map =
      Platform.OS === 'web'
        ? {
            ionicons: '/fonts/Ionicons-v2.ttf',
            'material-community': '/fonts/MaterialCommunityIcons-v2.ttf',
          }
        : {
            ...Ionicons.font,
            ...MaterialCommunityIcons.font,
          };
    Font.loadAsync(map)
      .catch(() => {})
      .finally(() => setFontsReady(true));
  }, []);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: c.background,
      card: c.backgroundElement,
      text: c.text,
      border: c.border,
      primary: c.primary,
    },
  };

  if (!ready || !fontsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <OtaUpdateBanner />
      <Stack>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="ficha/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="nova-ficha" options={{ title: 'Nova Ficha', presentation: 'modal' }} />
          <Stack.Screen name="compartilhar" options={{ title: 'Compartilhar', presentation: 'modal' }} />
          <Stack.Screen name="magias-busca" options={{ title: 'Buscar magias' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
