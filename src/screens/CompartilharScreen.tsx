import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, IconButton, Label, SectionTitle, Txt } from '@/components/ficha-ui';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { compartilharCom, removerCompartilhamento } from '@/services/fichas';
import { useFichaStore } from '@/store/useFichaStore';
import { confirmarExclusaoFicha, useFichasListStore } from '@/store/useFichasListStore';

export default function CompartilharScreen() {
  const t = useTheme();
  const { fichaId } = useLocalSearchParams<{ fichaId: string }>();
  const ficha = useFichaStore((s) => s.ficha);
  const readOnly = useFichaStore((s) => s.readOnly);
  const remover = useFichasListStore((s) => s.remover);
  const [email, setEmail] = useState('');

  if (!ficha || readOnly) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: t.background }}>
        <Txt>Apenas o dono da ficha pode gerenciar o compartilhamento.</Txt>
      </SafeAreaView>
    );
  }

  const avisar = (titulo: string, msg?: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(msg ? `${titulo}: ${msg}` : titulo);
    } else {
      Alert.alert(titulo, msg);
    }
  };

  const adicionar = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return avisar('E-mail inválido');
    try {
      await compartilharCom(fichaId, email);
      setEmail('');
    } catch (e) {
      avisar('Erro', (e as Error).message);
    }
  };

  const excluir = () =>
    confirmarExclusaoFicha(async () => {
      try {
        await remover(fichaId);
        router.dismissAll();
      } catch (e) {
        avisar('Erro', (e as Error).message);
      }
    });

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 12, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' }}>
          <Card>
            <SectionTitle>Compartilhar com o mestre (leitura)</SectionTitle>
            <Label>E-mail do mestre (a conta dele precisa usar este e-mail)</Label>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="mestre@email.com"
              placeholderTextColor={t.textSecondary}
              style={{
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: t.input,
                color: t.text,
                borderRadius: 10,
                padding: 10,
                marginBottom: 8,
              }}
            />
            <Button title="Compartilhar" onPress={adicionar} disabled={!email} />
          </Card>
          <Card>
            <SectionTitle>Com acesso</SectionTitle>
            {ficha.sharedWithEmails.length === 0 ? <Label>Ninguém ainda.</Label> : null}
            {ficha.sharedWithEmails.map((e) => (
              <View key={e} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt>{e}</Txt>
                <IconButton name="close-circle" color={t.danger} onPress={() => removerCompartilhamento(fichaId, e)} />
              </View>
            ))}
          </Card>
          <Button title="Excluir ficha" variant="danger" onPress={excluir} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
