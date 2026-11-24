import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Label, Txt } from '@/components/ficha-ui';
import { TutorialTarget } from '@/components/TutorialTarget';
import { DesktopBreakpoint, MaxContentWidth, MaxDesktopWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  Background5e,
  Class5e,
  Feat5e,
  Item5e,
  Monster5e,
  NOMES_LIVROS,
  Race5e,
  deslocamentoEmMetros,
  detalhesMonstro,
  entriesParaTexto,
  listarAntecedentes,
  listarClasses,
  listarItens,
  listarMonstros,
  listarRacas,
  listarTalentos,
  resumoMonstro,
  textoBonusRacial,
} from '@/services/5etools';
import { setField, useFichaStore } from '@/store/useFichaStore';
import { ATRIBUTO_NOMES, AtributoKey } from '@/types/ficha';
import { uid } from '@/utils/calc';
import { atributoDe5etools } from '@/utils/montarFicha';
import { bateBuscaBilingue } from '@/utils/traducao5e';

type Categoria = 'talentos' | 'racas' | 'classes' | 'itens' | 'antecedentes' | 'bestiario';

const ATALHOS: {
  id: Categoria | 'magias';
  titulo: string;
  sub: string;
  icone: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'magias', titulo: 'Magias', sub: 'Grimório completo (PHB, XGE, TCE)', icone: 'sparkles' },
  { id: 'talentos', titulo: 'Talentos', sub: 'Feats oficiais e pré-requisitos', icone: 'ribbon' },
  { id: 'racas', titulo: 'Raças', sub: 'Traços raciais e deslocamento', icone: 'people' },
  { id: 'classes', titulo: 'Classes', sub: 'Dados de vida e proficiências', icone: 'shield-half' },
  { id: 'itens', titulo: 'Itens', sub: 'Equipamentos e itens mágicos', icone: 'cube' },
  { id: 'antecedentes', titulo: 'Antecedentes', sub: 'Backgrounds e benefícios', icone: 'compass' },
  { id: 'bestiario', titulo: 'Bestiário', sub: 'Monstros, feras e familiares', icone: 'paw' },
];

const RARIDADES: { id: string; label: string }[] = [
  { id: 'none', label: 'Mundano' },
  { id: 'common', label: 'Comum' },
  { id: 'uncommon', label: 'Incomum' },
  { id: 'rare', label: 'Raro' },
  { id: 'very rare', label: 'Muito Raro' },
  { id: 'legendary', label: 'Lendário' },
];

function FilterChip({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: t.primary, backgroundColor: ativo ? t.primary : 'transparent' },
      ]}>
      <Txt bold style={{ color: ativo ? t.onPrimary : t.text, fontSize: 12 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export default function CompendioScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DesktopBreakpoint;
  const [aba, setAba] = useState<Categoria>('talentos');
  const [busca, setBusca] = useState('');
  const [fonte, setFonte] = useState<string | null>(null);
  const [filtroDesloc, setFiltroDesloc] = useState<'padrao' | 'rapido' | 'lento' | null>(null);
  const [filtroHd, setFiltroHd] = useState<number | null>(null);
  const [filtroConj, setFiltroConj] = useState<'sim' | 'nao' | null>(null);
  const [filtroRaridade, setFiltroRaridade] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const q = useDeferredValue(busca);

  const qtdFiltrosAtivos =
    (fonte ? 1 : 0) +
    (aba === 'racas' && filtroDesloc ? 1 : 0) +
    (aba === 'classes' && filtroHd ? 1 : 0) +
    (aba === 'classes' && filtroConj ? 1 : 0) +
    (aba === 'itens' && filtroRaridade ? 1 : 0);

  const [talentos, setTalentos] = useState<Feat5e[] | null>(null);
  const [racas, setRacas] = useState<Race5e[] | null>(null);
  const [classes, setClasses] = useState<Class5e[] | null>(null);
  const [itens, setItens] = useState<Item5e[] | null>(null);
  const [antecedentes, setAntecedentes] = useState<Background5e[] | null>(null);
  const [monstros, setMonstros] = useState<Monster5e[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const podeAdicionarNaFicha = useFichaStore((s) => !!s.ficha && !s.readOnly);

  useEffect(() => {
    let vivo = true;
    const load = async () => {
      try {
        if (aba === 'talentos' && !talentos) {
          const f = await listarTalentos();
          if (vivo) setTalentos(f);
        } else if (aba === 'racas' && !racas) {
          const r = await listarRacas();
          if (vivo) setRacas(r);
        } else if (aba === 'classes' && !classes) {
          const c = await listarClasses();
          if (vivo) setClasses(c);
        } else if (aba === 'itens' && !itens) {
          const i = await listarItens();
          if (vivo) setItens(i);
        } else if (aba === 'antecedentes' && !antecedentes) {
          const b = await listarAntecedentes();
          if (vivo) setAntecedentes(b);
        } else if (aba === 'bestiario' && !monstros) {
          const m = await listarMonstros();
          if (vivo) setMonstros(m);
        }
      } catch (e) {
        if (vivo) setErro((e as Error).message);
      }
    };
    load();
    return () => {
      vivo = false;
    };
  }, [aba, talentos, racas, classes, itens, antecedentes, monstros, tentativa]);

  const dadosAtuais =
    aba === 'talentos'
      ? talentos
      : aba === 'racas'
        ? racas
        : aba === 'classes'
          ? classes
          : aba === 'itens'
            ? itens
            : aba === 'antecedentes'
              ? antecedentes
              : monstros;
  const loading = !erro && dadosAtuais === null;

  const fontesDisponiveis = useMemo(() => {
    const lista = (dadosAtuais ?? []) as { source: string }[];
    const cont = new Map<string, number>();
    for (const item of lista) {
      const s = item.source.toUpperCase();
      cont.set(s, (cont.get(s) ?? 0) + 1);
    }
    return [...cont.keys()]
      .sort((a, b) => {
        const aKnown = a in NOMES_LIVROS ? 0 : 1;
        const bKnown = b in NOMES_LIVROS ? 0 : 1;
        return aKnown - bKnown || a.localeCompare(b);
      })
      .slice(0, 26);
  }, [dadosAtuais]);

  const filtrados = useMemo(() => {
    const lista = (dadosAtuais ?? []) as (Feat5e | Race5e | Class5e | Item5e | Background5e)[];
    return lista.filter((x) => {
      const src = x.source.toUpperCase();
      if (fonte && src !== fonte) return false;
      const textoBusca = `${x.name} ${NOMES_LIVROS[src] ?? src}`;
      if (!bateBuscaBilingue(textoBusca, q)) return false;

      if (aba === 'racas') {
        const r = x as Race5e;
        const m = deslocamentoEmMetros(r);
        if (filtroDesloc === 'padrao' && m !== 9) return false;
        if (filtroDesloc === 'rapido' && m <= 9) return false;
        if (filtroDesloc === 'lento' && m >= 9) return false;
      } else if (aba === 'classes') {
        const c = x as Class5e;
        if (filtroHd && c.hd?.faces !== filtroHd) return false;
        if (filtroConj === 'sim' && !c.spellcastingAbility) return false;
        if (filtroConj === 'nao' && !!c.spellcastingAbility) return false;
      } else if (aba === 'itens') {
        const it = x as Item5e;
        if (filtroRaridade && (it.rarity ?? 'none').toLowerCase() !== filtroRaridade) return false;
      }
      return true;
    });
  }, [dadosAtuais, q, fonte, aba, filtroDesloc, filtroHd, filtroConj, filtroRaridade]);

  const trocarAba = (nova: Categoria) => {
    setErro(null);
    setAberto(null);
    setFonte(null);
    setAba(nova);
  };

  const avisar = (titulo: string, msg: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(`${titulo}: ${msg}`);
    else Alert.alert(titulo, msg);
  };

  const adicionarNaFicha = (item: Feat5e | Item5e | Monster5e, detalhe: string) => {
    const f = useFichaStore.getState().ficha;
    if (!f) return;
    if (aba === 'itens') {
      const lista = f.itensEquipamento ?? [];
      setField('itensEquipamento', [...lista, { id: uid(), nome: item.name, qtd: '1', descricao: detalhe }]);
      avisar('Adicionado', `${item.name} foi adicionado aos Equipamentos de ${f.titulo}.`);
    } else if (aba === 'talentos') {
      const lista = f.caracteristicas ?? [];
      setField('caracteristicas', [
        ...lista,
        { id: uid(), nome: item.name, origem: `Talento (${item.source})`, descricao: detalhe },
      ]);
      avisar('Adicionado', `${item.name} foi adicionado às Habilidades/Talentos de ${f.titulo}.`);
    } else if (aba === 'bestiario') {
      const rm = resumoMonstro(item as Monster5e);
      const lista = f.companheiros ?? [];
      setField('companheiros', [
        ...lista,
        {
          id: uid(),
          nome: item.name,
          tipo: `Forma Selvagem / Familiar (ND ${rm.cr})`,
          ca: rm.ca,
          pvAtual: rm.pv,
          pvTotal: rm.pv,
          descricao: detalhe,
        },
      ]);
      avisar('Adicionado', `${item.name} foi adicionado aos Companheiros / Forma Selvagem de ${f.titulo}.`);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: t.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { maxWidth: isDesktop ? MaxDesktopWidth : MaxContentWidth }]}>
        <View
          style={[
            styles.editorialHeader,
            {
              backgroundColor: t.backgroundElement,
              borderColor: t.border,
              borderTopColor: t.primary,
            },
          ]}>
          <View style={styles.grid}>
            {ATALHOS.map((a) => {
              const ativo = a.id === aba;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => {
                    if (a.id === 'magias') {
                      router.push('/magias-busca');
                    } else {
                      trocarAba(a.id);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.atalhoPill,
                    {
                      backgroundColor: ativo ? t.primary : pressed ? t.backgroundSelected : t.backgroundElement,
                      borderColor: ativo ? t.primary : t.border,
                    },
                  ]}>
                  <Ionicons name={a.icone} size={15} color={ativo ? t.onPrimary : t.primary} />
                  <Txt bold style={{ color: ativo ? t.onPrimary : t.text, fontSize: 13 }}>
                    {a.titulo}
                  </Txt>
                  {a.id === 'magias' ? (
                    <Ionicons name="open-outline" size={12} color={t.textSecondary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <TutorialTarget id="compendio-busca" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.search, { flex: 1, borderColor: t.border, backgroundColor: t.input }]}>
              <Ionicons name="search" size={18} color={t.textSecondary} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder={`Buscar ${aba} em Português ou Inglês...`}
                placeholderTextColor={t.textSecondary}
                autoCorrect={false}
                style={{ flex: 1, color: t.text, fontSize: 14, paddingVertical: 7, marginLeft: 8 }}
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
          </TutorialTarget>

          {mostrarFiltros ? (
            <View style={{ gap: 6, paddingVertical: 4 }}>
              {fontesDisponiveis.length > 0 ? (
                <View style={styles.filterWrap}>
                  <FilterChip label="Todos os Livros" ativo={fonte === null} onPress={() => setFonte(null)} />
                  {fontesDisponiveis.map((f) => (
                    <FilterChip
                      key={f}
                      label={NOMES_LIVROS[f] ?? f}
                      ativo={fonte === f}
                      onPress={() => setFonte(fonte === f ? null : f)}
                    />
                  ))}
                </View>
              ) : null}

              {aba === 'racas' ? (
                <View style={styles.filterWrap}>
                  <FilterChip label="Qualquer Desloc." ativo={filtroDesloc === null} onPress={() => setFiltroDesloc(null)} />
                  <FilterChip
                    label="9 m (Padrão)"
                    ativo={filtroDesloc === 'padrao'}
                    onPress={() => setFiltroDesloc(filtroDesloc === 'padrao' ? null : 'padrao')}
                  />
                  <FilterChip
                    label="> 9 m (Rápido)"
                    ativo={filtroDesloc === 'rapido'}
                    onPress={() => setFiltroDesloc(filtroDesloc === 'rapido' ? null : 'rapido')}
                  />
                  <FilterChip
                    label="< 9 m (Reduzido)"
                    ativo={filtroDesloc === 'lento'}
                    onPress={() => setFiltroDesloc(filtroDesloc === 'lento' ? null : 'lento')}
                  />
                </View>
              ) : null}

              {aba === 'classes' ? (
                <View style={styles.filterWrap}>
                  <FilterChip label="Todos os Dados" ativo={filtroHd === null} onPress={() => setFiltroHd(null)} />
                  {[6, 8, 10, 12].map((d) => (
                    <FilterChip
                      key={d}
                      label={`d${d}`}
                      ativo={filtroHd === d}
                      onPress={() => setFiltroHd(filtroHd === d ? null : d)}
                    />
                  ))}
                  <FilterChip
                    label="Conjuradores"
                    ativo={filtroConj === 'sim'}
                    onPress={() => setFiltroConj(filtroConj === 'sim' ? null : 'sim')}
                  />
                  <FilterChip
                    label="Sem Magia"
                    ativo={filtroConj === 'nao'}
                    onPress={() => setFiltroConj(filtroConj === 'nao' ? null : 'nao')}
                  />
                </View>
              ) : null}

              {aba === 'itens' ? (
                <View style={styles.filterWrap}>
                  <FilterChip label="Todas as Raridades" ativo={filtroRaridade === null} onPress={() => setFiltroRaridade(null)} />
                  {RARIDADES.map((r) => (
                    <FilterChip
                      key={r.id}
                      label={r.label}
                      ativo={filtroRaridade === r.id}
                      onPress={() => setFiltroRaridade(filtroRaridade === r.id ? null : r.id)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label style={{ marginBottom: 0 }}>{filtrados.length} resultados</Label>
            {qtdFiltrosAtivos > 0 ? (
              <Pressable
                onPress={() => {
                  setFonte(null);
                  setFiltroDesloc(null);
                  setFiltroHd(null);
                  setFiltroConj(null);
                  setFiltroRaridade(null);
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
            <Txt>Falha ao consultar o 5etools: {erro}</Txt>
            <Button
              title="Tentar novamente"
              onPress={() => {
                setErro(null);
                setTentativa((n) => n + 1);
              }}
            />
          </View>
        ) : (
          <FlatList
            data={filtrados}
            keyExtractor={(item, idx) => `${item.name}|${item.source}|${idx}`}
            initialNumToRender={20}
            windowSize={7}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 12, paddingTop: 4 }}
            renderItem={({ item }) => {
              const key = `${item.name}|${item.source}`;
              const isOpen = aberto === key;

              let subtitulo = item.source;
              let detalhe = '';

              if (aba === 'racas') {
                const r = item as Race5e;
                subtitulo = `${r.source} · Desloc. ${deslocamentoEmMetros(r)} m · ${textoBonusRacial(r)}`;
                detalhe = entriesParaTexto(r.entries);
              } else if (aba === 'classes') {
                const c = item as Class5e;
                const hab = atributoDe5etools(c.spellcastingAbility);
                const resist = (c.proficiency ?? [])
                  .map((p) => ATRIBUTO_NOMES[atributoDe5etools(p) as AtributoKey])
                  .filter(Boolean)
                  .join(', ');
                subtitulo = `${c.source} · Dado de Vida d${c.hd?.faces ?? '?'}`;
                detalhe = [
                  `Dado de Vida: 1d${c.hd?.faces ?? '?'} por nível`,
                  `Testes de Resistência: ${resist || '-'}`,
                  `Habilidade de Conjuração: ${hab ? ATRIBUTO_NOMES[hab] : 'Nenhuma'}`,
                ].join('\n');
              } else if (aba === 'itens') {
                const it = item as Item5e;
                subtitulo = [
                  it.source,
                  it.rarity && it.rarity !== 'none' ? it.rarity : 'Mundano',
                  it.weight ? `${it.weight} lb.` : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                detalhe = entriesParaTexto(it.entries);
              } else if (aba === 'bestiario') {
                const m = item as Monster5e;
                const rm = resumoMonstro(m);
                subtitulo = `${m.source} · ND ${rm.cr} · CA ${rm.ca} · PV ${rm.pv} · ${rm.tipo}`;
                detalhe = detalhesMonstro(m);
              } else {
                const f = item as Feat5e | Background5e;
                subtitulo = `${f.source} · ${aba === 'talentos' ? 'Talento (Feat)' : 'Antecedente'}`;
                detalhe = entriesParaTexto(f.entries);
              }

              return (
                <Card style={{ padding: 12, marginBottom: 8 }}>
                  <Pressable
                    onPress={() => setAberto(isOpen ? null : key)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Txt bold style={{ fontSize: 16 }}>{item.name}</Txt>
                      <Label style={{ marginBottom: 0 }}>{subtitulo}</Label>
                    </View>
                    {podeAdicionarNaFicha && (aba === 'talentos' || aba === 'itens' || aba === 'bestiario') ? (
                      <Pressable
                        hitSlop={8}
                        onPress={() => adicionarNaFicha(item as Feat5e | Item5e | Monster5e, detalhe)}>
                        <Ionicons name="add-circle-outline" size={26} color={t.primary} />
                      </Pressable>
                    ) : null}
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.textSecondary} />
                  </Pressable>
                  {isOpen && detalhe ? (
                    <View
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: t.border,
                        gap: 8,
                      }}>
                      {detalhe.split('\n\n').map((bloco, i) => {
                        const isSectionHeader =
                          bloco.startsWith('TRACOS\n') || bloco.startsWith('ACOES\n');
                        if (isSectionHeader) {
                          const [tituloSecao, ...resto] = bloco.split('\n');
                          return (
                            <View key={i} style={{ gap: 6, marginTop: 4 }}>
                              <Label style={{ color: t.primary, marginBottom: 0 }}>
                                {tituloSecao}
                              </Label>
                              <Txt style={{ fontSize: 14, lineHeight: 21, color: t.text }}>
                                {resto.join('\n')}
                              </Txt>
                            </View>
                          );
                        }
                        return (
                          <Txt
                            key={i}
                            bold={i === 0 && aba === 'bestiario'}
                            style={{
                              fontSize: 14,
                              lineHeight: 21,
                              color: i === 0 && aba === 'bestiario' ? t.primary : t.textSecondary,
                            }}>
                            {bloco}
                          </Txt>
                        );
                      })}
                    </View>
                  ) : null}
                </Card>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  editorialHeader: {
    margin: 12,
    marginBottom: 6,
    padding: 12,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderTopWidth: 3,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  atalhoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10 },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 5 },
});
