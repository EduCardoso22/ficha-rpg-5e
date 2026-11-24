import { Ionicons } from '@expo/vector-icons';
import { Tabs, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, Platform, Share, Text, View } from 'react-native';

import { DiceRollerOverlay } from '@/components/DiceRollerOverlay';
import { IconButton } from '@/components/ficha-ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useFichaStore } from '@/store/useFichaStore';
import {
  confirmarExclusaoFicha,
  serializarFichaJson,
  useFichasListStore,
} from '@/store/useFichasListStore';
import { imprimirOuExportarFicha } from '@/utils/exportarPdfHtml';

export default function FichaLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const uid = useAuthStore((s) => s.user!.uid);
  const isLocalGuest = useAuthStore((s) => !!s.user?.isLocalGuest);
  const { open, close, loading, error, ficha, readOnly } = useFichaStore();
  const remover = useFichasListStore((s) => s.remover);

  // Listener em tempo real durante toda a permanência na ficha
  useEffect(() => {
    open(id, uid);
    return close;
  }, [id, uid, open, close]);

  if (loading || !ficha) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.background, padding: 24 }}>
        {error ? <Text style={{ color: t.danger, textAlign: 'center' }}>{error}</Text> : <ActivityIndicator color={t.primary} />}
      </View>
    );
  }

  const exportarAtual = async () => {
    const json = serializarFichaJson(ficha);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(json);
      window.alert('JSON da ficha copiado para a área de transferência!');
      return;
    }
    await Share.share({
      title: `${ficha.titulo || 'ficha'}.json`,
      message: json,
    }).catch(() => {});
  };

  const excluirAtual = () => {
    confirmarExclusaoFicha(async () => {
      try {
        await remover(id);
        router.back();
      } catch (e) {
        Alert.alert('Erro ao excluir', (e as Error).message);
      }
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: t.backgroundElement },
          headerTintColor: t.text,
          tabBarStyle: { backgroundColor: t.backgroundElement, borderTopColor: t.border },
          tabBarActiveTintColor: t.primary,
          tabBarInactiveTintColor: t.textSecondary,
          headerTitle: (ficha.titulo || 'Ficha') + (readOnly ? ' (leitura)' : ''),
          headerLeft: () => <IconButton name="arrow-back" onPress={() => router.back()} />,
          headerLeftContainerStyle: { paddingLeft: 8 },
          headerRightContainerStyle: { paddingRight: 8, flexDirection: 'row' },
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <IconButton name="print-outline" onPress={() => imprimirOuExportarFicha(ficha)} />
              <IconButton name="code-slash-outline" onPress={exportarAtual} />
              {!readOnly && !isLocalGuest ? (
                <IconButton
                  name="share-social"
                  onPress={() => router.push({ pathname: '/compartilhar', params: { fichaId: id } })}
                />
              ) : null}
              {!readOnly ? (
                <IconButton name="trash-outline" color={t.danger} onPress={excluirAtual} />
              ) : null}
            </View>
          ),
        }}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Principal', tabBarIcon: ({ color, size }) => <Ionicons name="shield" color={color as string} size={size} /> }}
        />
        <Tabs.Screen
          name="lore"
          options={{ title: 'Interpretação', tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color as string} size={size} /> }}
        />
        <Tabs.Screen
          name="magias"
          options={{ title: 'Magias', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color as string} size={size} /> }}
        />
      </Tabs>
      <DiceRollerOverlay />
    </View>
  );
}
