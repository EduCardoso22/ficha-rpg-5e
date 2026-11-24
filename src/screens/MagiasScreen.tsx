import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, FieldText, IconButton, Label, NumInput, SectionTitle, Txt, useReadOnly } from '@/components/ficha-ui';
import { DesktopBreakpoint, MaxContentWidth, MaxDesktopWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  Spell5e,
  carregarMagias,
  entriesParaTexto,
  extrairFormulasDados,
  resumoMagia,
} from '@/services/5etools';
import { useDiceStore } from '@/store/useDiceStore';
import { setField, useField } from '@/store/useFichaStore';
import { ATRIBUTO_NOMES, AtributoKey, MagiaRef, Slot } from '@/types/ficha';
import { bonusProficiencia, calcularSlotsPorClasseNivel, clamp, fmt, modificador } from '@/utils/calc';

const HABILIDADES: AtributoKey[] = ['int', 'sab', 'car'];

function Cabecalho({
  soPreparadas,
  setSoPreparadas,
}: {
  soPreparadas: boolean;
  setSoPreparadas: (v: boolean) => void;
}) {
  const t = useTheme();
  const ro = useReadOnly();
  const hab = useField<AtributoKey | ''>('conjurador.habilidade');
  const conjClasse = useField<string>('conjurador.classe');
  const fichaClasse = useField<string>('classe');
  const slotsAtuais = useField<Record<string, Slot>>('conjurador.slots');
  const attrs = useField<Record<AtributoKey, number>>('atributos');
  const nivel = useField<number>('nivel');
  const magiasPorNivel = useField<Record<string, MagiaRef[]>>('conjurador.magias') ?? {};
  const rolarD20 = useDiceStore((s) => s.rolarD20);
  const mod = hab ? modificador(attrs[hab]) : 0;
  const cd = hab ? 8 + bonusProficiencia(nivel) + mod : 0;
  const atk = hab ? bonusProficiencia(nivel) + mod : 0;

  const autoCalcularSlots = () => {
    const novos = calcularSlotsPorClasseNivel(conjClasse || fichaClasse || '', nivel, slotsAtuais);
    if (novos) setField('conjurador.slots', novos);
  };

  const totalPreparadas = Object.values(magiasPorNivel)
    .flat()
    .filter((m) => m.preparada).length;

  return (
    <Card>
      <FieldText path="conjurador.classe" label="Classe de Conjurador" style={{ marginBottom: 12 }} />
      <Label>Habilidade-Chave</Label>
      <View style={styles.row}>
        {HABILIDADES.map((h) => (
          <Pressable
            key={h}
            disabled={ro}
            onPress={() => setField('conjurador.habilidade', h === hab ? '' : h)}
            style={[
              styles.pill,
              { borderColor: t.primary, backgroundColor: hab === h ? t.primary : 'transparent' },
            ]}>
            <Txt bold style={{ color: hab === h ? t.onPrimary : t.text, fontSize: 13 }}>
              {ATRIBUTO_NOMES[h]}
            </Txt>
          </Pressable>
        ))}
      </View>
      <View style={[styles.row, { justifyContent: 'space-around', marginTop: 12 }]}>
        <View style={{ alignItems: 'center' }}>
          <Txt style={styles.big}>{hab ? cd : '-'}</Txt>
          <Label>CD do TR</Label>
        </View>
        <Pressable
          disabled={!hab}
          onPress={() => rolarD20('Ataque Mágico', atk)}
          style={{ alignItems: 'center' }}>
          <Txt style={styles.big}>{hab ? fmt(atk) : '-'}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="dice-outline" size={13} color={t.primary} />
            <Label style={{ marginBottom: 0 }}>Bônus de Ataque</Label>
          </View>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Txt style={styles.big}>{totalPreparadas}</Txt>
          <Label>Preparadas</Label>
        </View>
      </View>

      {!ro && (conjClasse || fichaClasse) ? (
        <View style={{ marginTop: 10 }}>
          <Button
            title={`Auto-calcular espaços (${conjClasse || fichaClasse} Nv ${nivel})`}
            icon="flash-outline"
            variant="ghost"
            onPress={autoCalcularSlots}
          />
        </View>
      ) : null}

      <View style={[styles.row, { marginTop: 12 }]}>
        <Pressable
          onPress={() => setSoPreparadas(false)}
          style={[
            styles.filterTab,
            { borderColor: t.primary, backgroundColor: !soPreparadas ? t.primary : 'transparent' },
          ]}>
          <Txt bold style={{ color: !soPreparadas ? t.onPrimary : t.text, fontSize: 13 }}>
            Todas Conhecidas
          </Txt>
        </Pressable>
        <Pressable
          onPress={() => setSoPreparadas(true)}
          style={[
            styles.filterTab,
            { borderColor: t.primary, backgroundColor: soPreparadas ? t.primary : 'transparent' },
          ]}>
          <Txt bold style={{ color: soPreparadas ? t.onPrimary : t.text, fontSize: 13 }}>
            Só Preparadas ({totalPreparadas})
          </Txt>
        </Pressable>
      </View>
    </Card>
  );
}

function MagiaItem({
  m,
  nivel,
  spell5e,
  onTogglePrep,
  onRemove,
  onExpand,
  ro,
}: {
  m: MagiaRef;
  nivel: number;
  spell5e?: Spell5e;
  onTogglePrep: () => void;
  onRemove: () => void;
  onExpand: (y: number) => void;
  ro: boolean;
}) {
  const t = useTheme();
  const [aberta, setAberta] = useState(false);
  const [upcastOpen, setUpcastOpen] = useState(false);
  const yRef = useRef(0);
  const slots = useField<Record<string, Slot>>('conjurador.slots') ?? {};
  const concentrando = useField<string>('concentrando') ?? '';
  const { rolarFormula } = useDiceStore();

  const r = spell5e ? resumoMagia(spell5e) : null;
  const ehConc = !!spell5e?.duration?.[0]?.concentration;
  const texto = m.descricaoCustom || (spell5e ? entriesParaTexto(spell5e.entries) : '');
  const textoAcima = spell5e?.entriesHigherLevel ? entriesParaTexto(spell5e.entriesHigherLevel) : '';
  const formulas = useMemo(() => extrairFormulasDados(`${texto}\n${textoAcima}`), [texto, textoAcima]);

  const executarConjuracao = (nvSlot: number | 'ritual') => {
    if (typeof nvSlot === 'number' && nvSlot > 0) {
      const atual = slots[String(nvSlot)] ?? { total: 0, usados: 0 };
      setField(`conjurador.slots.${nvSlot}.usados`, clamp(atual.usados + 1, 0, atual.total));
    }
    if (ehConc) {
      setField('concentrando', m.nome);
    }
    if (formulas.length > 0) {
      rolarFormula(
        `Magia: ${m.nome}${typeof nvSlot === 'number' && nvSlot > 0 ? ` (Nv ${nvSlot})` : ''}`,
        formulas[0],
      );
    }
    setUpcastOpen(false);
  };

  const aoClicarConjurar = () => {
    if (nivel === 0) {
      executarConjuracao(0);
      return;
    }
    setUpcastOpen(true);
  };

  const niveisDisponiveis = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => {
    const s = slots[String(n)];
    return n >= nivel && s && s.total - s.usados > 0;
  });

  return (
    <View
      onLayout={(e) => {
        yRef.current = e.nativeEvent.layout.y;
      }}
      style={[styles.spellWrap, { borderColor: t.border }]}>
      <View style={styles.spell}>
        {nivel > 0 ? (
          <Pressable
            disabled={ro}
            onPress={onTogglePrep}
            hitSlop={8}
            style={[
              styles.prepBadge,
              {
                borderColor: m.preparada ? t.primary : t.border,
                backgroundColor: m.preparada ? t.primary : 'transparent',
              },
            ]}>
            <Ionicons
              name={m.preparada ? 'flame' : 'flame-outline'}
              size={14}
              color={m.preparada ? t.onPrimary : t.textSecondary}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: m.preparada ? t.onPrimary : t.textSecondary,
              }}>
              {m.preparada ? 'Prep' : 'Conh'}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            const novo = !aberta;
            setAberta(novo);
            if (novo) onExpand(yRef.current);
          }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flex: 1 }}>
            <Txt bold style={{ fontSize: 16 }}>{m.nome}</Txt>
            <Label style={{ marginBottom: 0 }}>
              {m.fonte}
              {m.escola ? ` · ${m.escola}` : ''}
              {ehConc ? ' · Conc.' : ''}
              {r?.ritual ? ' · Ritual' : ''}
            </Label>
          </View>
          <Ionicons name={aberta ? 'chevron-up' : 'chevron-down'} size={18} color={t.textSecondary} />
        </Pressable>

        {!ro ? (
          <Pressable
            onPress={aoClicarConjurar}
            style={[styles.castBtn, { backgroundColor: t.primary, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <Ionicons name="sparkles" size={13} color={t.onPrimary} />
            <Text style={{ color: t.onPrimary, fontSize: 12, fontWeight: '800' }}>Conjurar</Text>
          </Pressable>
        ) : null}

        {ro ? null : <IconButton name="close-circle" size={20} color={t.danger} onPress={onRemove} />}
      </View>

      {aberta ? (
        <View style={[styles.spellDetail, { backgroundColor: t.background, borderColor: t.border }]}>
          {r ? (
            <Label style={{ marginBottom: 4 }}>
              Tempo: {r.tempo} · Alcance: {r.alcance} · Duração: {r.duracao}
            </Label>
          ) : null}

          {formulas.length > 0 || ehConc ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {formulas.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => rolarFormula(`${m.nome} (${f})`, f)}
                  style={[styles.prepBadge, { borderColor: t.primary, backgroundColor: t.primary }]}>
                  <Ionicons name="flame" size={13} color={t.onPrimary} />
                  <Text style={{ color: t.onPrimary, fontWeight: '800', fontSize: 12 }}>
                    Rolar {f}
                  </Text>
                </Pressable>
              ))}
              {ehConc && !ro ? (
                <Pressable
                  onPress={() => setField('concentrando', concentrando === m.nome ? '' : m.nome)}
                  style={[
                    styles.prepBadge,
                    {
                      borderColor: t.primary,
                      backgroundColor: concentrando === m.nome ? t.primary : 'transparent',
                    },
                  ]}>
                  <Ionicons
                    name="flash"
                    size={13}
                    color={concentrando === m.nome ? t.onPrimary : t.primary}
                  />
                  <Text
                    style={{
                      color: concentrando === m.nome ? t.onPrimary : t.primary,
                      fontWeight: '700',
                      fontSize: 12,
                    }}>
                    {concentrando === m.nome ? 'Concentrando (Ativo)' : 'Ativar Concentração'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Txt style={{ fontSize: 14, lineHeight: 20 }}>
            {texto || 'Carregando descrição do 5etools...'}
          </Txt>
          {textoAcima ? (
            <Txt style={{ fontSize: 13, lineHeight: 19, marginTop: 6, color: t.textSecondary }}>
              {textoAcima}
            </Txt>
          ) : null}
        </View>
      ) : null}

      {/* Modal de Conjuração / Upcasting */}
      <Modal visible={upcastOpen} transparent animationType="fade" onRequestClose={() => setUpcastOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.backgroundElement, borderColor: t.border }]}>
            <SectionTitle>Conjurar {m.nome}</SectionTitle>
            <Label>
              Escolha o nível do espaço de magia para gastar{ehConc ? ' (ativará Concentração automaticamente)' : ''}:
            </Label>
            {niveisDisponiveis.length === 0 ? (
              <Txt style={{ color: t.danger }}>
                Nenhum espaço de magia disponível de nível {nivel} ou superior!
              </Txt>
            ) : (
              <View style={{ gap: 8 }}>
                {niveisDisponiveis.map((n) => {
                  const s = slots[String(n)];
                  const rest = s.total - s.usados;
                  return (
                    <Button
                      key={n}
                      title={`Nível ${n}${n > nivel ? ' (Upcast)' : ''} - ${rest}/${s.total} disponíveis`}
                      onPress={() => executarConjuracao(n)}
                    />
                  );
                })}
              </View>
            )}
            {r?.ritual ? (
              <Button
                title="Conjurar como Ritual (sem gastar espaço)"
                variant="ghost"
                onPress={() => executarConjuracao('ritual')}
              />
            ) : null}
            <Button title="Cancelar" variant="ghost" onPress={() => setUpcastOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ListaMagias({
  fichaId,
  nivel,
  mapaSpells,
  soPreparadas,
  onScrollTo,
}: {
  fichaId: string;
  nivel: number;
  mapaSpells: Map<string, Spell5e>;
  soPreparadas: boolean;
  onScrollTo: (offset: number) => void;
}) {
  const t = useTheme();
  const ro = useReadOnly();
  const path = nivel === 0 ? 'conjurador.truques' : `conjurador.magias.${nivel}`;
  const lista = useField<MagiaRef[]>(path) ?? [];
  const [homebrewOpen, setHomebrewOpen] = useState(false);
  const [hbNome, setHbNome] = useState('');
  const [hbEscola, setHbEscola] = useState('');
  const [hbDesc, setHbDesc] = useState('');

  const visiveis = nivel > 0 && soPreparadas ? lista.filter((m) => m.preparada) : lista;

  const togglePrep = (alvo: MagiaRef) => {
    setField(
      path,
      lista.map((x) =>
        x.nome === alvo.nome && x.fonte === alvo.fonte ? { ...x, preparada: !x.preparada } : x,
      ),
    );
  };

  const salvarHomebrew = () => {
    if (!hbNome.trim()) return;
    const nova: MagiaRef = {
      nome: hbNome.trim(),
      fonte: 'Homebrew',
      nivel,
      escola: hbEscola.trim() || undefined,
      preparada: true,
      descricaoCustom: hbDesc.trim() || 'Magia personalizada.',
    };
    setField(path, [...lista, nova]);
    setHbNome('');
    setHbEscola('');
    setHbDesc('');
    setHomebrewOpen(false);
  };

  return (
    <View>
      {visiveis.map((m) => (
        <MagiaItem
          key={m.nome + m.fonte}
          m={m}
          nivel={nivel}
          spell5e={mapaSpells.get(`${m.nome.toLowerCase()}|${m.fonte.toLowerCase()}`)}
          ro={ro}
          onTogglePrep={() => togglePrep(m)}
          onRemove={() => setField(path, lista.filter((x) => x !== m))}
          onExpand={(y) => onScrollTo(y)}
        />
      ))}
      {ro ? null : (
        <View style={[styles.row, { marginTop: 8 }]}>
          <Pressable
            onPress={() => router.push({ pathname: '/magias-busca', params: { fichaId, nivel: String(nivel) } })}
            style={[styles.add, { borderColor: t.primary, flex: 1 }]}>
            <Ionicons name="search" size={16} color={t.primary} />
            <Txt bold style={{ color: t.primary, marginLeft: 6, fontSize: 14 }}>
              Buscar no 5etools
            </Txt>
          </Pressable>
          <Pressable
            onPress={() => setHomebrewOpen(true)}
            style={[styles.add, { borderColor: t.border }]}>
            <Ionicons name="create-outline" size={16} color={t.text} />
            <Txt bold style={{ marginLeft: 4, fontSize: 13 }}>
              + Homebrew
            </Txt>
          </Pressable>
        </View>
      )}

      <Modal visible={homebrewOpen} transparent animationType="fade" onRequestClose={() => setHomebrewOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.backgroundElement, borderColor: t.border }]}>
            <SectionTitle>Nova Magia Homebrew ({nivel === 0 ? 'Truque' : `Nível ${nivel}`})</SectionTitle>
            <TextInput
              value={hbNome}
              onChangeText={setHbNome}
              placeholder="Nome da magia"
              placeholderTextColor={t.textSecondary}
              style={[styles.hbInput, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
            />
            <TextInput
              value={hbEscola}
              onChangeText={setHbEscola}
              placeholder="Escola (ex.: Evocação)"
              placeholderTextColor={t.textSecondary}
              style={[styles.hbInput, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
            />
            <TextInput
              value={hbDesc}
              onChangeText={setHbDesc}
              placeholder="Descrição, alcance, dano e efeito..."
              placeholderTextColor={t.textSecondary}
              multiline
              style={[
                styles.hbInput,
                { borderColor: t.border, backgroundColor: t.input, color: t.text, minHeight: 90, textAlignVertical: 'top' },
              ]}
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button title="Cancelar" variant="ghost" onPress={() => setHomebrewOpen(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Adicionar" onPress={salvarHomebrew} disabled={!hbNome.trim()} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Slots({ nivel }: { nivel: number }) {
  const t = useTheme();
  const ro = useReadOnly();
  const slot = useField<Slot>(`conjurador.slots.${nivel}`) ?? { total: 0, usados: 0 };
  const base = `conjurador.slots.${nivel}`;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={styles.row}>
          <Label style={{ marginBottom: 0 }}>Total</Label>
          <NumInput
            value={slot.total}
            min={0}
            max={9}
            editable={!ro}
            style={{ minWidth: 40 }}
            onChange={(n) => {
              setField(`${base}.total`, n);
              if (slot.usados > n) setField(`${base}.usados`, n);
            }}
          />
        </View>
        <Label style={{ marginBottom: 0 }}>
          Restantes: {Math.max(0, slot.total - slot.usados)} / {slot.total}
        </Label>
      </View>
      <View style={[styles.row, { marginTop: 8, flexWrap: 'wrap' }]}>
        {Array.from({ length: slot.total }, (_, i) => {
          const usado = i < slot.usados;
          return (
            <Pressable
              key={i}
              disabled={ro}
              // Tocar em um espaço vazio gasta +1 espaço; tocar em um espaço usado recupera 1 espaço
              onPress={() =>
                setField(
                  `${base}.usados`,
                  clamp(usado ? slot.usados - 1 : slot.usados + 1, 0, slot.total),
                )
              }
              style={[styles.slot, { borderColor: t.primary, backgroundColor: usado ? t.primary : 'transparent' }]}>
              {usado ? <Ionicons name="close" size={18} color={t.onPrimary} /> : null}
            </Pressable>
          );
        })}
        {slot.usados > 0 && !ro ? (
          <Pressable onPress={() => setField(`${base}.usados`, 0)} hitSlop={8}>
            <Label style={{ marginBottom: 0, marginLeft: 6 }}>Recuperar todos</Label>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Secao({
  fichaId,
  nivel,
  mapaSpells,
  soPreparadas,
  onScrollTo,
}: {
  fichaId: string;
  nivel: number;
  mapaSpells: Map<string, Spell5e>;
  soPreparadas: boolean;
  onScrollTo: (y: number) => void;
}) {
  const t = useTheme();
  const [aberto, setAberto] = useState(false);
  const secaoY = useRef(0);
  const slot = useField<Slot>(`conjurador.slots.${nivel}`) ?? { total: 0, usados: 0 };
  const lista = useField<MagiaRef[]>(`conjurador.magias.${nivel}`) ?? [];
  const prepCount = lista.filter((m) => m.preparada).length;

  return (
    <View
      onLayout={(e) => {
        secaoY.current = e.nativeEvent.layout.y;
      }}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Pressable onPress={() => setAberto((v) => !v)} style={styles.secaoHead}>
          <Txt bold style={{ fontSize: 16, flex: 1 }}>Nível {nivel}</Txt>
          <Label style={{ marginBottom: 0, marginRight: 8 }}>
            {slot.total - slot.usados}/{slot.total} espaços · {prepCount}/{lista.length} prep.
          </Label>
          <Ionicons name={aberto ? 'chevron-up' : 'chevron-down'} size={18} color={t.textSecondary} />
        </Pressable>
        {aberto ? (
          <View style={{ padding: 12, paddingTop: 0 }}>
            <Slots nivel={nivel} />
            <ListaMagias
              fichaId={fichaId}
              nivel={nivel}
              mapaSpells={mapaSpells}
              soPreparadas={soPreparadas}
              onScrollTo={(itemY) => onScrollTo(secaoY.current + itemY)}
            />
          </View>
        ) : null}
      </Card>
    </View>
  );
}

export default function MagiasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DesktopBreakpoint;
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const truquesY = useRef(0);
  const [spells, setSpells] = useState<Spell5e[]>([]);
  const [soPreparadas, setSoPreparadas] = useState(false);

  useEffect(() => {
    carregarMagias()
      .then(setSpells)
      .catch(() => {});
  }, []);

  const mapaSpells = useMemo(() => {
    const m = new Map<string, Spell5e>();
    for (const s of spells) {
      m.set(`${s.name.toLowerCase()}|${s.source.toLowerCase()}`, s);
    }
    return m;
  }, [spells]);

  const rolarPara = (y: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
    }, 80);
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            width: '100%',
            maxWidth: isDesktop ? MaxDesktopWidth : MaxContentWidth,
            alignSelf: 'center',
            padding: 12,
            paddingBottom: insets.bottom + 24,
          }}>
          <Cabecalho soPreparadas={soPreparadas} setSoPreparadas={setSoPreparadas} />
          <View
            onLayout={(e) => {
              truquesY.current = e.nativeEvent.layout.y;
            }}>
            <Card accent>
              <SectionTitle>Truques</SectionTitle>
              <ListaMagias
                fichaId={id}
                nivel={0}
                mapaSpells={mapaSpells}
                soPreparadas={false}
                onScrollTo={(itemY) => rolarPara(truquesY.current + itemY)}
              />
            </Card>
          </View>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Secao
              key={n}
              fichaId={id}
              nivel={n}
              mapaSpells={mapaSpells}
              soPreparadas={soPreparadas}
              onScrollTo={rolarPara}
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  filterTab: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  big: { fontSize: 26, fontWeight: '800' },
  spellWrap: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  spell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  castBtn: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  spellDetail: { marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 10,
  },
  slot: { width: 34, height: 34, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  secaoHead: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  hbInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});
