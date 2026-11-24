import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ficha-ui';
import { useTheme } from '@/hooks/use-theme';

/** Verifica manualmente se há atualização OTA e avisa o usuário. */
export async function verificarAtualizacaoManual() {
  if (Platform.OS === 'web' || __DEV__) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('Na versão Web as atualizações são aplicadas automaticamente ao recarregar a página.');
    } else {
      Alert.alert('Modo Desenvolvimento', 'No APK instalado o aplicativo verifica atualizações via EAS Update.');
    }
    return;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      Alert.alert(
        'Atualização Baixada',
        'Uma nova versão do Fichas D&D está pronta! Deseja reiniciar o app agora para aplicar?',
        [
          { text: 'Depois', style: 'cancel' },
          { text: 'Reiniciar Agora', onPress: () => void Updates.reloadAsync() },
        ],
      );
    } else {
      Alert.alert('Tudo Atualizado', 'Você já está usando a versão mais recente do Fichas D&D.');
    }
  } catch (e) {
    Alert.alert('Erro ao verificar atualização', (e as Error).message);
  }
}

/** Verifica automaticamente ao abrir o app se existe uma nova versão OTA e exibe o aviso para o usuário. */
export function OtaUpdateBanner() {
  const t = useTheme();
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' || __DEV__) return;
    let ativo = true;
    (async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          if (ativo) setPronta(true);
        }
      } catch {
        // Falha silenciosa se o usuário estiver sem internet ao abrir o app
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  if (!pronta) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setPronta(false)}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: t.backgroundElement,
              borderColor: t.border,
              borderTopColor: t.primary,
            },
          ]}>
          <View style={[styles.iconCircle, { backgroundColor: t.backgroundSelected, borderColor: t.primary }]}>
            <Ionicons name="cloud-download-outline" size={28} color={t.primary} />
          </View>
          <Text style={[styles.title, { color: t.text }]}>Nova versão disponível!</Text>
          <Text style={[styles.desc, { color: t.textSecondary }]}>
            Uma atualização do Fichas D&D já foi baixada. Reinicie o aplicativo agora para aplicar as novidades e correções.
          </Text>
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button title="Depois" variant="ghost" onPress={() => setPronta(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Atualizar Agora" icon="refresh-outline" onPress={() => void Updates.reloadAsync()} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderTopWidth: 4,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 6 },
});
