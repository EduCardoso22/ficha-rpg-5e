import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Label, Txt } from '@/components/ficha-ui';
import { useTheme } from '@/hooks/use-theme';
import { NOMES_LIVROS } from '@/services/5etools';
import { bateBuscaBilingue } from '@/utils/traducao5e';

interface Props<T> {
  label: string;
  placeholder: string;
  items: T[] | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  value: T | null;
  onChange: (item: T) => void;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getSub?: (item: T) => string;
}

/** Dropdown com busca: abre um modal de tela cheia com a lista filtrável. */
export function Selector<T>({ label, placeholder, items, loading, error, onRetry, value, onChange, getKey, getLabel, getSub }: Props<T>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [fonte, setFonte] = useState<string | null>(null);
  const [mostrarFontes, setMostrarFontes] = useState(false);

  const fontesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const item of items ?? []) {
      const s = (item as { source?: string })?.source;
      if (s) set.add(s.toUpperCase());
    }
    return [...set].sort((a, b) => {
      const aKnown = a in NOMES_LIVROS ? 0 : 1;
      const bKnown = b in NOMES_LIVROS ? 0 : 1;
      return aKnown - bKnown || a.localeCompare(b);
    });
  }, [items]);

  const filtrados = useMemo(() => {
    return (items ?? []).filter((i) => {
      const s = (i as { source?: string })?.source?.toUpperCase();
      if (fonte && s !== fonte) return false;
      const labelCompleto = `${getLabel(i)} ${s ? (NOMES_LIVROS[s] ?? s) : ''}`;
      return bateBuscaBilingue(labelCompleto, busca);
    });
  }, [items, busca, fonte, getLabel]);

  return (
    <View style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor: t.border, backgroundColor: t.input }]}>
        {loading ? <ActivityIndicator color={t.primary} /> : null}
        <Txt style={{ flex: 1, color: value ? t.text : t.textSecondary }}>
          {value ? getLabel(value) : placeholder}
        </Txt>
        <Ionicons name="chevron-down" size={18} color={t.textSecondary} />
      </Pressable>
      {error ? (
        <View style={{ marginTop: 8, gap: 8 }}>
          <Txt style={{ color: t.danger, fontSize: 13 }}>Falha ao carregar do 5etools: {error}</Txt>
          {onRetry ? <Button title="Tentar novamente" variant="ghost" onPress={onRetry} /> : null}
        </View>
      ) : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top }}>
          <View style={[styles.head, { borderColor: t.border }]}>
            <Txt bold style={{ fontSize: 18, flex: 1 }}>{label}</Txt>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={26} color={t.text} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar nome ou livro (ex.: Humblewood, Ravenloft, Corvum)..."
                placeholderTextColor={t.textSecondary}
                autoCorrect={false}
                style={[styles.search, { flex: 1, margin: 0, borderColor: t.border, backgroundColor: t.input, color: t.text }]}
              />
              {fontesDisponiveis.length > 1 ? (
                <Pressable
                  onPress={() => setMostrarFontes((v) => !v)}
                  style={[
                    styles.filterBtn,
                    {
                      borderColor: mostrarFontes || fonte ? t.primary : t.border,
                      backgroundColor: mostrarFontes ? t.primary : t.backgroundElement,
                    },
                  ]}>
                  <Ionicons
                    name="book-outline"
                    size={16}
                    color={mostrarFontes ? t.onPrimary : fonte ? t.primary : t.text}
                  />
                  <Txt
                    bold
                    style={{
                      fontSize: 12,
                      color: mostrarFontes ? t.onPrimary : fonte ? t.primary : t.text,
                    }}>
                    {fonte ? fonte : 'Livros'}
                  </Txt>
                </Pressable>
              ) : null}
            </View>
            {mostrarFontes && fontesDisponiveis.length > 1 ? (
              <View style={styles.chipWrap}>
                <Pressable
                  onPress={() => setFonte(null)}
                  style={[
                    styles.chip,
                    { borderColor: t.primary, backgroundColor: fonte === null ? t.primary : 'transparent' },
                  ]}>
                  <Txt bold style={{ fontSize: 11, color: fonte === null ? t.onPrimary : t.text }}>
                    Todos ({items?.length ?? 0})
                  </Txt>
                </Pressable>
                {fontesDisponiveis.map((f) => {
                  const ativo = fonte === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setFonte(ativo ? null : f)}
                      style={[
                        styles.chip,
                        { borderColor: t.primary, backgroundColor: ativo ? t.primary : 'transparent' },
                      ]}>
                      <Txt bold style={{ fontSize: 11, color: ativo ? t.onPrimary : t.text }}>
                        {NOMES_LIVROS[f] ?? f}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
          <FlatList
            data={filtrados}
            keyExtractor={getKey}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => {
              const ativo = value ? getKey(value) === getKey(item) : false;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                    setBusca('');
                  }}
                  style={[styles.item, { borderColor: t.border }]}>
                  <View style={{ flex: 1 }}>
                    <Txt bold={ativo} style={{ fontSize: 16 }}>{getLabel(item)}</Txt>
                    {getSub ? <Label style={{ marginBottom: 0 }}>{getSub(item)}</Label> : null}
                  </View>
                  {ativo ? <Ionicons name="checkmark" size={20} color={t.primary} /> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={<Label style={{ padding: 16 }}>Nada encontrado.</Label>}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  head: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  search: { margin: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
