import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Label, Txt } from '@/components/ficha-ui';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ESCOLAS, NOMES_LIVROS, Spell5e, carregarMagias, entriesParaTexto, resumoMagia } from '@/services/5etools';
import { setField, useFichaStore } from '@/store/useFichaStore';
import { MagiaRef } from '@/types/ficha';
import { bateBuscaBilingue } from '@/utils/traducao5e';

const CLASSES_BASE = [
  'Bard',
  'Cleric',
  'Druid',
  'Paladin',
  'Ranger',
  'Sorcerer',
  'Warlock',
  'Wizard',
  'Artificer',
  'Apothecary',
  'Illrigger',
];

function Chip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: t.primary, backgroundColor: ativo ? t.primary : 'transparent' }]}>
      <Txt style={{ color: ativo ? t.onPrimary : t.text, fontSize: 13 }} bold>
        {label}
      </Txt>
    </Pressable>
  );
}

export default function BuscaMagiasScreen({ nivelInicial }: { nivelInicial?: number }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Spell5e>>(null);
  const [magias, setMagias] = useState<Spell5e[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [fonte, setFonte] = useState<string | null>(null);
  const [nivel, setNivel] = useState<number | null>(nivelInicial ?? null);
  const [classe, setClasse] = useState<string | null>(null);
  const [escola, setEscola] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const q = useDeferredValue(busca);
  const conj = useFichaStore((st) => st.ficha?.conjurador);
  const podeAdicionar = useFichaStore((st) => !!st.ficha && !st.readOnly);

  const qtdFiltrosAtivos =
    (fonte ? 1 : 0) + (nivel !== null ? 1 : 0) + (classe ? 1 : 0) + (escola ? 1 : 0);

  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    carregarMagias()
      .then((m) => vivo && setMagias(m))
      .catch((e: Error) => vivo && setErro(e.message))
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
  }, [tentativa]);

  const carregar = () => {
    setLoading(true);
    setErro(null);
    setTentativa((n) => n + 1);
  };

  const fontesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const s of magias) set.add(s.source.toUpperCase());
    return [...set].sort((a, b) => {
      const aKnown = a in NOMES_LIVROS ? 0 : 1;
      const bKnown = b in NOMES_LIVROS ? 0 : 1;
      return aKnown - bKnown || a.localeCompare(b);
    });
  }, [magias]);

  const filtradas = useMemo(() => {
    return magias.filter((s) => {
      const src = s.source.toUpperCase();
      if (fonte && src !== fonte) return false;
      if (nivel !== null && s.level !== nivel) return false;
      if (escola && s.school !== escola) return false;
      if (classe && !s.classes?.some((c) => c.toLowerCase() === classe.toLowerCase())) return false;
      const textoBusca = `${s.name} ${NOMES_LIVROS[src] ?? src}`;
      return bateBuscaBilingue(textoBusca, q);
    });
  }, [magias, q, fonte, nivel, classe, escola]);

  const adiciona = (s: Spell5e) => {
    const ref: MagiaRef = { nome: s.name, fonte: s.source, nivel: s.level, escola: ESCOLAS[s.school] };
    const { ficha } = useFichaStore.getState();
    if (!ficha) return;
    const path = s.level === 0 ? 'conjurador.truques' : `conjurador.magias.${s.level}`;
    const atual = (s.level === 0 ? ficha.conjurador.truques : ficha.conjurador.magias[String(s.level)]) ?? [];
    if (atual.some((m) => m.nome === ref.nome && m.fonte === ref.fonte)) return;
    setField(path, [...atual, ref]);
  };

  const conhecida = (s: Spell5e) => {
    const f = useFichaStore.getState().ficha;
    if (!f) return false;
    const l = s.level === 0 ? f.conjurador.truques : f.conjurador.magias[String(s.level)];
    return !!l?.some((m) => m.nome === s.name && m.fonte === s.source);
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.safe, { backgroundColor: t.background }]}>
      <Stack.Screen options={{ title: 'Buscar magias' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.search, { flex: 1, borderColor: t.border, backgroundColor: t.input }]}>
              <Ionicons name="search" size={18} color={t.textSecondary} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar magia em Português ou Inglês (ex.: Bola de Fogo / Fireball)"
                placeholderTextColor={t.textSecondary}
                autoCorrect={false}
                style={{ flex: 1, color: t.text, fontSize: 14, paddingVertical: 8, marginLeft: 8 }}
              />
              {busca ? (
                <Pressable onPress={() => setBusca('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={t.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={() => setMostrarFiltros((v) => !v)}
              style={[
                styles.filterToggleBtn,
                {
                  borderColor: mostrarFiltros || qtdFiltrosAtivos > 0 ? t.primary : t.border,
                  backgroundColor: mostrarFiltros ? t.primary : t.backgroundElement,
                },
              ]}>
              <Ionicons
                name="options-outline"
                size={16}
                color={mostrarFiltros ? t.onPrimary : qtdFiltrosAtivos > 0 ? t.primary : t.text}
              />
              <Txt
                bold
                style={{
                  fontSize: 12,
                  color: mostrarFiltros ? t.onPrimary : qtdFiltrosAtivos > 0 ? t.primary : t.text,
                }}>
                Filtros{qtdFiltrosAtivos > 0 ? ` (${qtdFiltrosAtivos})` : ''}
              </Txt>
              <Ionicons
                name={mostrarFiltros ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={mostrarFiltros ? t.onPrimary : t.textSecondary}
              />
            </Pressable>
          </View>

          {mostrarFiltros ? (
            <View style={{ gap: 6, paddingVertical: 4 }}>
              <View style={styles.filterWrap}>
                <Chip label="Todos os Livros" ativo={fonte === null} onPress={() => setFonte(null)} />
                {fontesDisponiveis.map((f) => (
                  <Chip
                    key={f}
                    label={NOMES_LIVROS[f] ?? f}
                    ativo={fonte === f}
                    onPress={() => setFonte(fonte === f ? null : f)}
                  />
                ))}
              </View>

              <View style={styles.filterWrap}>
                <Chip label="Todos os Níveis" ativo={nivel === null} onPress={() => setNivel(null)} />
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <Chip
                    key={n}
                    label={n === 0 ? 'Truque' : `Nv ${n}`}
                    ativo={nivel === n}
                    onPress={() => setNivel(nivel === n ? null : n)}
                  />
                ))}
              </View>

              <View style={styles.filterWrap}>
                <Chip label="Todas as Classes" ativo={classe === null} onPress={() => setClasse(null)} />
                {CLASSES_BASE.map((c) => (
                  <Chip key={c} label={c} ativo={classe === c} onPress={() => setClasse(classe === c ? null : c)} />
                ))}
              </View>

              <View style={styles.filterWrap}>
                <Chip label="Todas as Escolas" ativo={escola === null} onPress={() => setEscola(null)} />
                {Object.entries(ESCOLAS).map(([k, v]) => (
                  <Chip key={k} label={v} ativo={escola === k} onPress={() => setEscola(escola === k ? null : k)} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label style={{ marginBottom: 0 }}>{filtradas.length} magias encontradas</Label>
            {qtdFiltrosAtivos > 0 ? (
              <Pressable
                onPress={() => {
                  setFonte(null);
                  setNivel(null);
                  setClasse(null);
                  setEscola(null);
                }}>
                <Txt bold style={{ fontSize: 11, color: t.primary }}>
                  Limpar filtros
                </Txt>
              </Pressable>
            ) : null}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={t.primary} />
        ) : erro ? (
          <View style={{ padding: 16, gap: 12 }}>
            <Txt>Falha ao carregar do 5etools: {erro}</Txt>
            <Button title="Tentar novamente" onPress={carregar} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filtradas}
            keyExtractor={(s) => `${s.name}|${s.source}`}
            initialNumToRender={20}
            windowSize={7}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 72 }}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item: s, index }) => {
              const id = `${s.name}|${s.source}`;
              const r = resumoMagia(s);
              const open = aberta === id;
              return (
                <View style={[styles.item, { borderColor: t.border }]}>
                  <Pressable
                    onPress={() => {
                      const next = open ? null : id;
                      setAberta(next);
                      if (next) {
                        setTimeout(() => {
                          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.25 });
                        }, 60);
                      }
                    }}
                    style={styles.itemHead}>
                    <View style={{ flex: 1 }}>
                      <Txt bold style={{ fontSize: 16 }}>{s.name}</Txt>
                      <Label style={{ marginBottom: 0 }}>
                        {s.level === 0 ? 'Truque' : `Nível ${s.level}`} · {ESCOLAS[s.school] ?? s.school} · {s.source}
                        {r.ritual ? ' · Ritual' : ''}
                      </Label>
                    </View>
                    {podeAdicionar ? (
                      <Pressable hitSlop={10} onPress={() => adiciona(s)}>
                        <Ionicons
                          name={conhecida(s) ? 'checkmark-circle' : 'add-circle-outline'}
                          size={28}
                          color={t.primary}
                        />
                      </Pressable>
                    ) : (
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={t.textSecondary} />
                    )}
                  </Pressable>
                  {open ? (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 6 }}>
                      <Label>{r.tempo} · {r.alcance} · {r.duracao}</Label>
                      <Txt style={{ fontSize: 14, lineHeight: 20 }}>{entriesParaTexto(s.entries)}</Txt>
                      {s.entriesHigherLevel ? (
                        <Txt style={{ fontSize: 14 }}>{entriesParaTexto(s.entriesHigherLevel)}</Txt>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            }}
            extraData={conj}
          />
        )}
        <View style={{ position: 'absolute', right: 16, bottom: insets.bottom + 16 }}>
          <Button title="Concluir" onPress={() => router.back()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10 },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 5 },
  item: { borderBottomWidth: StyleSheet.hairlineWidth },
  itemHead: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
});
