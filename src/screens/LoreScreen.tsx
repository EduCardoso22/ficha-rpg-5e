import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, FieldText, IconButton, Label, SectionTitle, Txt, useReadOnly } from '@/components/ficha-ui';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setField, useField } from '@/store/useFichaStore';
import { NotaSessao } from '@/types/ficha';
import { uid } from '@/utils/calc';

/** Escolhe uma imagem, reduz para 256px e grava como data URI no próprio documento (sem Firebase Storage). */
async function escolherAvatar() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return Alert.alert('Permissão negada', 'Libere o acesso às fotos para escolher um avatar.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (res.canceled) return;
  const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 256, height: 256 } }], {
    compress: 0.6,
    format: SaveFormat.JPEG,
    base64: true,
  });
  setField('lore.avatar', `data:image/jpeg;base64,${out.base64}`);
}

function Avatar() {
  const t = useTheme();
  const ro = useReadOnly();
  const avatar = useField<string>('lore.avatar');
  return (
    <View style={{ alignItems: 'center', marginBottom: 12 }}>
      <Pressable disabled={ro} onPress={escolherAvatar}>
        <View style={[styles.avatar, { borderColor: t.border, backgroundColor: t.input }]}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="person" size={64} color={t.textSecondary} />
          )}
        </View>
      </Pressable>
      {ro ? null : (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Button title={avatar ? 'Trocar imagem' : 'Escolher imagem'} variant="ghost" onPress={escolherAvatar} />
          {avatar ? <Button title="Remover" variant="ghost" onPress={() => setField('lore.avatar', '')} /> : null}
        </View>
      )}
    </View>
  );
}

function DiarioCard() {
  const t = useTheme();
  const ro = useReadOnly();
  const diario = useField<NotaSessao[]>('diario') ?? [];
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const set = (arr: NotaSessao[]) => setField('diario', arr);
  const adicionar = () => {
    const id = uid();
    set([...diario, { id, titulo: `Sessão ${diario.length + 1}`, texto: '' }]);
    setAbertoId(id);
  };
  const edita = (id: string, patch: Partial<NotaSessao>) =>
    set(diario.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  return (
    <Card>
      <SectionTitle
        right={
          ro ? null : (
            <IconButton name="add-circle" size={26} color={t.primary} onPress={adicionar} />
          )
        }>
        Diário de Sessões & Missões
      </SectionTitle>
      {diario.length === 0 ? (
        <Label>Toque em + para criar anotações organizadas por sessão, NPCs ou Quests.</Label>
      ) : null}
      {diario.map((nota) => {
        const open = abertoId === nota.id;
        return (
          <View key={nota.id} style={[styles.notaBox, { borderColor: t.border, backgroundColor: t.background }]}>
            <View style={styles.notaHead}>
              <Pressable onPress={() => setAbertoId(open ? null : nota.id)} hitSlop={8}>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={t.primary} />
              </Pressable>
              <TextInput
                value={nota.titulo}
                editable={!ro}
                onChangeText={(v) => edita(nota.id, { titulo: v })}
                placeholder="Título da sessão ou missão"
                placeholderTextColor={t.textSecondary}
                style={{ flex: 1, color: t.text, fontSize: 16, fontWeight: '700', paddingVertical: 4 }}
              />
              {ro ? null : (
                <IconButton
                  name="trash-outline"
                  size={20}
                  color={t.danger}
                  onPress={() => set(diario.filter((x) => x.id !== nota.id))}
                />
              )}
            </View>
            {open ? (
              <TextInput
                value={nota.texto}
                editable={!ro}
                onChangeText={(v) => edita(nota.id, { texto: v })}
                placeholder="Resumo dos acontecimentos, pistas, NPCs..."
                placeholderTextColor={t.textSecondary}
                multiline
                style={[styles.notaInput, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
              />
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

export default function LoreScreen() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const [mostrarFisicos, setMostrarFisicos] = useState(false);

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            width: '100%',
            maxWidth: MaxContentWidth,
            alignSelf: 'center',
            padding: 12,
            paddingBottom: insets.bottom + 24,
          }}>
          <Card>
            <SectionTitle>Aparência</SectionTitle>
            <Avatar />
            <FieldText path="lore.nome" label="Nome" style={{ marginBottom: 8 }} />
            <FieldText
              path="lore.aparencia"
              label="Descrição da Aparência"
              placeholder="Descreva livremente como o personagem aparenta..."
              multiline
            />

            <Pressable
              onPress={() => setMostrarFisicos((v) => !v)}
              style={[styles.toggleRow, { borderColor: t.border }]}>
              <Txt style={{ fontSize: 13, color: t.textSecondary }}>
                Detalhes físicos opcionais (idade, altura, peso, olhos...)
              </Txt>
              <Ionicons
                name={mostrarFisicos ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={t.textSecondary}
              />
            </Pressable>
            {mostrarFisicos ? (
              <View style={{ marginTop: 8, gap: 8 }}>
                <View style={styles.row}>
                  <FieldText path="lore.idade" label="Idade" style={{ flex: 1 }} />
                  <FieldText path="lore.altura" label="Altura" style={{ flex: 1 }} />
                  <FieldText path="lore.peso" label="Peso" style={{ flex: 1 }} />
                </View>
                <View style={styles.row}>
                  <FieldText path="lore.olhos" label="Olhos" style={{ flex: 1 }} />
                  <FieldText path="lore.pele" label="Pele" style={{ flex: 1 }} />
                  <FieldText path="lore.cabelos" label="Cabelos" style={{ flex: 1 }} />
                </View>
              </View>
            ) : null}
          </Card>

          <Card accent>
            <SectionTitle>Personalidade</SectionTitle>
            <FieldText path="personalidade.tracos" label="Traços de Personalidade" multiline style={{ marginBottom: 8 }} />
            <FieldText path="personalidade.ideais" label="Ideais" multiline style={{ marginBottom: 8 }} />
            <FieldText path="personalidade.ligacoes" label="Ligações" multiline style={{ marginBottom: 8 }} />
            <FieldText path="personalidade.defeitos" label="Defeitos" multiline />
          </Card>

          <Card>
            <FieldText path="lore.historia" label="História do Personagem" multiline />
          </Card>
          <DiarioCard />
          <Card>
            <FieldText path="lore.aliados" label="Aliados e Organizações" multiline />
          </Card>
          <Card>
            <FieldText path="lore.outras" label="Outras Características e Habilidades" multiline />
          </Card>
          <Card>
            <FieldText path="lore.tesouro" label="Tesouro" multiline />
          </Card>
          <Label>Os dados são sincronizados em tempo real.</Label>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  notaBox: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  notaHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notaInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15, minHeight: 90, textAlignVertical: 'top', marginTop: 6 },
});
