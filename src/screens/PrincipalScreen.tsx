import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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

import { AtributoCard } from '@/components/AtributoCard';
import { CombatHeader } from '@/components/CombatHeader';
import { LevelUpModal } from '@/components/LevelUpModal';
import { ProficiencyRow } from '@/components/ProficiencyRow';
import {
  Button,
  Card,
  FieldNum,
  FieldText,
  IconButton,
  Label,
  NumInput,
  SectionTitle,
  Txt,
  useReadOnly,
} from '@/components/ficha-ui';
import { DesktopBreakpoint, MaxContentWidth, MaxDesktopWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { alterarPv, descansoCurto, descansoLongo } from '@/store/acoesFicha';
import { useDiceStore } from '@/store/useDiceStore';
import { setField, useField } from '@/store/useFichaStore';
import {
  ATRIBUTO_NOMES,
  ATRIBUTOS,
  Ataque,
  AtributoKey,
  Caracteristica,
  Companheiro,
  ItemEquipamento,
  MOEDA_KEYS,
  MOEDA_LABELS,
  Moedas,
  PERICIAS,
  Proficiencia,
  RecursoClasse,
} from '@/types/ficha';
import { bonusComProf, bonusProficiencia, clamp, fmt, modificador, toInt, uid } from '@/utils/calc';

// ---------- Cabeçalho de identidade + Mini-Avatar + Level Up ----------
function Identidade() {
  const t = useTheme();
  const ro = useReadOnly();
  const titulo = useField<string>('titulo');
  const classe = useField<string>('classe');
  const raca = useField<string>('raca');
  const nivel = useField<number>('nivel');
  const desloc = useField<number>('deslocamento');
  const avatar = useField<string>('lore.avatar');
  const subclasse = useField<string>('subclasse');
  const multiclasse = useField<string>('multiclasse');
  const antecedente = useField<string>('antecedente');
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(false);

  return (
    <Card>
      <View style={styles.idTop}>
        <View style={[styles.miniAvatar, { borderColor: t.primary, backgroundColor: t.input }]}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="person" size={30} color={t.textSecondary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Txt bold style={{ fontSize: 20 }}>{titulo || 'Sem nome'}</Txt>
          <Label style={{ marginBottom: 0 }}>
            {[raca, classe, subclasse ? `(${subclasse})` : '', multiclasse, antecedente]
              .filter(Boolean)
              .join(' · ') || 'Toque no lápis para editar classe/raça'}
          </Label>
        </View>
        {!ro ? (
          <IconButton
            name={editandoId ? 'checkmark-circle' : 'create-outline'}
            size={22}
            color={editandoId ? t.success : t.textSecondary}
            onPress={() => setEditandoId((v) => !v)}
          />
        ) : null}
      </View>

      {editandoId && !ro ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          <FieldText path="titulo" label="Nome do Personagem" />
          <View style={styles.row}>
            <FieldText path="classe" label="Classe" style={{ flex: 1 }} />
            <FieldText path="raca" label="Raça" style={{ flex: 1 }} />
          </View>
          <View style={styles.row}>
            <FieldText path="subclasse" label="Subclasse" placeholder="Opcional" style={{ flex: 1 }} />
            <FieldText path="antecedente" label="Antecedente" placeholder="Opcional" style={{ flex: 1 }} />
          </View>
          <FieldText path="multiclasse" label="Multiclasse (opcional)" placeholder="Ex.: Guerreiro 2" />
        </View>
      ) : null}

      <View style={[styles.row, { marginTop: 12, justifyContent: 'space-around' }]}>
        {editandoId && !ro ? (
          <FieldNum path="nivel" label="Nível" min={1} max={20} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Txt style={styles.big}>{nivel}</Txt>
            <Label>Nível</Label>
          </View>
        )}
        <View style={{ alignItems: 'center' }}>
          <Txt style={styles.big}>{fmt(bonusProficiencia(nivel))}</Txt>
          <Label>Bônus de Prof.</Label>
        </View>
        {editandoId && !ro ? (
          <FieldNum path="deslocamento" label="Desloc. (m)" min={0} max={200} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Txt style={styles.big}>{desloc} m</Txt>
            <Label>Deslocamento</Label>
          </View>
        )}
      </View>

      {!ro && nivel < 20 ? (
        <View style={{ marginTop: 12 }}>
          <Button
            title={`Subir para o Nível ${nivel + 1}`}
            icon="arrow-up-circle-outline"
            onPress={() => setLevelUpOpen(true)}
          />
        </View>
      ) : null}
      <LevelUpModal visible={levelUpOpen} onClose={() => setLevelUpOpen(false)} />
    </Card>
  );
}

// ---------- Grid de atributos ----------
function Atributos({ horizontal }: { horizontal?: boolean }) {
  const attrs = useField<Record<AtributoKey, number>>('atributos');
  return (
    <View style={[styles.attrGrid, horizontal && styles.attrGridHorizontal]}>
      {ATRIBUTOS.map((k) => (
        <AtributoCard key={k} atributo={k} valor={attrs[k]} horizontal={horizontal} />
      ))}
    </View>
  );
}

// ---------- Vida, Dados de Vida e Descanso Longo ----------
function Vida() {
  const t = useTheme();
  const ro = useReadOnly();
  const pv = useField<{ atual: number; total: number; temp: number }>('pv');
  const dv = useField<{ faces: number; total: number; usados: number }>('dadosVida');
  const con = useField<number>('atributos.con');
  const nivel = useField<number>('nivel');

  const restantes = Math.max(0, dv.total - dv.usados);
  const gastaDV = () => {
    if (restantes <= 0) return;
    const rolado = Math.max(0, 1 + Math.floor(Math.random() * dv.faces) + modificador(con));
    setField('dadosVida.usados', dv.usados + 1);
    alterarPv(rolado);
  };

  const recuperaUmDV = () => {
    if (dv.usados <= 0) return;
    setField('dadosVida.usados', Math.max(0, dv.usados - 1));
  };

  const fazerDescansoLongo = () => {
    const recDv = Math.max(1, Math.floor(nivel / 2));
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (
        window.confirm(
          `Fazer Descanso Longo?\n• Restaura PV para ${pv.total}\n• Recupera até ${recDv} Dado(s) de Vida\n• Restaura todos os espaços de magia`,
        )
      ) {
        descansoLongo();
      }
      return;
    }
    Alert.alert(
      'Descanso Longo',
      `Restaurar todos os PV (${pv.total}), recuperar até ${recDv} Dado(s) de Vida e todos os espaços de magia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descansar', onPress: descansoLongo },
      ],
    );
  };

  const fazerDescansoCurto = () => {
    descansoCurto();
    useDiceStore.getState().rolarFormula('Descanso Curto (Recursos Restaurados)', `1d${dv.faces}`);
  };

  return (
    <Card accent>
      <SectionTitle
        right={
          !ro ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                onPress={fazerDescansoCurto}
                style={[styles.restBtn, { borderColor: t.primary, borderWidth: 1.5 }]}>
                <Ionicons name="cafe-outline" size={14} color={t.primary} />
                <Text style={{ color: t.primary, fontWeight: '700', fontSize: 12 }}>
                  Desc. Curto
                </Text>
              </Pressable>
              <Pressable
                onPress={fazerDescansoLongo}
                style={[styles.restBtn, { backgroundColor: t.primary }]}>
                <Ionicons name="moon" size={14} color={t.onPrimary} />
                <Text style={{ color: t.onPrimary, fontWeight: '700', fontSize: 12 }}>
                  Desc. Longo
                </Text>
              </Pressable>
            </View>
          ) : null
        }>
        Pontos de Vida
      </SectionTitle>
      <View style={[styles.row, { justifyContent: 'center', gap: 8, marginBottom: 8 }]}>
        {[-10, -5, 5, 10].map((d) => (
          <Pressable
            key={d}
            disabled={ro}
            onPress={() => alterarPv(d)}
            style={({ pressed }) => [
              styles.chip,
              { borderColor: t.border, backgroundColor: pressed ? t.backgroundSelected : 'transparent' },
            ]}>
            <Txt bold>{fmt(d)}</Txt>
          </Pressable>
        ))}
      </View>
      <View style={[styles.row, { justifyContent: 'space-around' }]}>
        <FieldNum path="pv.atual" label="Atuais" min={0} max={pv.total} />
        <FieldNum path="pv.total" label="Totais" min={1} max={999} />
        <FieldNum path="pv.temp" label="Temporários" min={0} max={999} />
      </View>

      <View style={[styles.divider, { backgroundColor: t.border }]} />
      <SectionTitle>Dados de Vida</SectionTitle>
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }]}>
        <View style={{ alignItems: 'center', minWidth: 80 }}>
          <Txt style={styles.big}>
            {restantes}/{dv.total}
          </Txt>
          <Label>d{dv.faces} restantes</Label>
        </View>
        <View style={[styles.row, { flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }]}>
          <Button
            title={`Rolar d${dv.faces}${fmt(modificador(con))}`}
            onPress={gastaDV}
            disabled={ro || restantes <= 0}
          />
          <Button
            title="+1 Dado"
            variant="ghost"
            onPress={recuperaUmDV}
            disabled={ro || dv.usados <= 0}
          />
        </View>
      </View>
      <View style={[styles.row, { justifyContent: 'space-around', marginTop: 10 }]}>
        <FieldNum path="dadosVida.faces" label="Faces (d)" min={4} max={20} />
        <FieldNum path="dadosVida.total" label="Total" min={0} max={30} />
        <View style={{ alignItems: 'center' }}>
          <NumInput
            value={restantes}
            min={0}
            max={dv.total}
            editable={!ro}
            big
            onChange={(n) => setField('dadosVida.usados', clamp(dv.total - n, 0, dv.total))}
          />
          <Label style={{ marginTop: 4 }}>Restantes</Label>
        </View>
      </View>
    </Card>
  );
}

// ---------- Testes contra a morte ----------
function Marcas({ path, valor, cor }: { path: string; valor: number; cor: string }) {
  const t = useTheme();
  const ro = useReadOnly();
  return (
    <View style={styles.row}>
      {[1, 2, 3].map((i) => (
        <Pressable
          key={i}
          disabled={ro}
          onPress={() => setField(path, valor === i ? i - 1 : i)}
          style={[styles.mark, { borderColor: cor, backgroundColor: valor >= i ? cor : 'transparent' }]}>
          {valor >= i ? (
            <Ionicons name={path.endsWith('falhas') ? 'close' : 'checkmark'} size={16} color={t.background} />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

function Morte() {
  const t = useTheme();
  const m = useField<{ sucessos: number; falhas: number }>('morte');
  return (
    <Card accent>
      <SectionTitle
        right={
          <Pressable onPress={() => setField('morte', { sucessos: 0, falhas: 0 })}>
            <Label style={{ marginBottom: 0 }}>Limpar</Label>
          </Pressable>
        }>
        Testes contra a Morte
      </SectionTitle>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View>
          <Label>Sucessos</Label>
          <Marcas path="morte.sucessos" valor={m.sucessos} cor={t.success} />
        </View>
        <View>
          <Label>Falhas</Label>
          <Marcas path="morte.falhas" valor={m.falhas} cor={t.danger} />
        </View>
      </View>
    </Card>
  );
}

// ---------- Salvaguardas e Perícias ----------
function Salvaguardas() {
  const ro = useReadOnly();
  const attrs = useField<Record<AtributoKey, number>>('atributos');
  const salv = useField<Record<AtributoKey, boolean>>('salvaguardas');
  const nivel = useField<number>('nivel');
  return (
    <Card accent>
      <SectionTitle>Testes de Resistência</SectionTitle>
      {ATRIBUTOS.map((k) => (
        <ProficiencyRow
          key={k}
          nome={ATRIBUTO_NOMES[k]}
          nivel={salv[k] ? 1 : 0}
          bonus={bonusComProf(attrs[k], nivel, salv[k] ? 1 : 0)}
          disabled={ro}
          onPress={() => setField(`salvaguardas.${k}`, !salv[k])}
        />
      ))}
    </Card>
  );
}

function Pericias() {
  const ro = useReadOnly();
  const attrs = useField<Record<AtributoKey, number>>('atributos');
  const pericias = useField<Record<string, Proficiencia>>('pericias') ?? {};
  const nivel = useField<number>('nivel');
  const percepcao = bonusComProf(attrs.sab, nivel, pericias.percepcao ?? 0);
  return (
    <Card accent>
      <SectionTitle>Perícias</SectionTitle>
      {PERICIAS.map((p) => {
        const lvl = (pericias[p.key] ?? 0) as Proficiencia;
        return (
          <ProficiencyRow
            key={p.key}
            nome={p.nome}
            detalhe={p.atributo.toUpperCase()}
            nivel={lvl}
            bonus={bonusComProf(attrs[p.atributo], nivel, lvl)}
            disabled={ro}
            onPress={() => setField(`pericias.${p.key}`, ((lvl + 1) % 3) as Proficiencia)}
          />
        );
      })}
      <Label style={{ marginTop: 8 }}>Toque: vazio -&gt; proficiente -&gt; especialista (2x)</Label>
      <Txt style={{ marginTop: 4, fontSize: 16 }}>
        Sabedoria (Percepção) Passiva: <Txt bold>{10 + percepcao}</Txt>
      </Txt>
    </Card>
  );
}

// ---------- Ataques & magias rápidas (com Alcance e Tipo de Dano + fontes maiores) ----------
function FieldInline({
  value,
  onChange,
  placeholder,
  flex,
  ro,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  flex: number;
  ro: boolean;
}) {
  const t = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      editable={!ro}
      placeholder={placeholder}
      placeholderTextColor={t.textSecondary}
      style={{
        flex,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.input,
        color: t.text,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 16,
      }}
    />
  );
}

function Ataques() {
  const t = useTheme();
  const ro = useReadOnly();
  const ataques = useField<Ataque[]>('ataques') ?? [];
  const { rolarD20, rolarFormula } = useDiceStore();
  const set = (arr: Ataque[]) => setField('ataques', arr);
  const edita = (id: string, patch: Partial<Ataque>) =>
    set(ataques.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  return (
    <Card accent>
      <SectionTitle
        right={
          ro ? null : (
            <IconButton
              name="add-circle"
              size={26}
              color={t.primary}
              onPress={() =>
                set([...ataques, { id: uid(), nome: '', bonus: '', dano: '', alcance: '', tipoDano: '' }])
              }
            />
          )
        }>
        Ataques e Magias Rápidas
      </SectionTitle>
      {ataques.length === 0 ? <Label style={{ fontSize: 12 }}>Nenhum ataque. Toque em + para adicionar.</Label> : null}
      {ataques.map((a) => (
        <View key={a.id} style={[styles.atkBox, { borderColor: t.border, backgroundColor: t.background }]}>
          <View style={styles.atkRow}>
            <FieldInline
              value={a.nome}
              placeholder="Arma / Magia"
              flex={2.2}
              onChange={(v) => edita(a.id, { nome: v })}
              ro={ro}
            />
            <FieldInline
              value={a.bonus}
              placeholder="Bônus (+5)"
              flex={1}
              onChange={(v) => edita(a.id, { bonus: v })}
              ro={ro}
            />
            {ro ? null : (
              <IconButton
                name="trash"
                size={22}
                color={t.danger}
                onPress={() => set(ataques.filter((x) => x.id !== a.id))}
              />
            )}
          </View>
          <View style={styles.atkRow}>
            <FieldInline
              value={a.dano}
              placeholder="Dano (1d8+3)"
              flex={1.2}
              onChange={(v) => edita(a.id, { dano: v })}
              ro={ro}
            />
            <FieldInline
              value={a.tipoDano ?? ''}
              placeholder="Tipo (Perfurante/Ígneo)"
              flex={1.5}
              onChange={(v) => edita(a.id, { tipoDano: v })}
              ro={ro}
            />
            <FieldInline
              value={a.alcance ?? ''}
              placeholder="Alcance (1,5m / 24m)"
              flex={1.3}
              onChange={(v) => edita(a.id, { alcance: v })}
              ro={ro}
            />
          </View>
          <View style={styles.atkRow}>
            <Pressable
              onPress={() =>
                rolarD20(`Ataque: ${a.nome || 'Arma'}`, toInt(a.bonus, 0), 'normal', {
                  danoFormula: a.dano || undefined,
                  tipoDano: a.tipoDano || undefined,
                })
              }
              style={[styles.atkRollBtn, { backgroundColor: t.primary, flexDirection: 'row', gap: 5 }]}>
              <Ionicons name="dice-outline" size={15} color={t.onPrimary} />
              <Text style={{ color: t.onPrimary, fontWeight: '800', fontSize: 13 }}>
                Atacar ({fmt(toInt(a.bonus, 0))})
              </Text>
            </Pressable>
            {a.dano ? (
              <Pressable
                onPress={() =>
                  rolarFormula(
                    `Dano: ${a.nome || 'Arma'}${a.tipoDano ? ` (${a.tipoDano})` : ''}`,
                    a.dano,
                  )
                }
                style={[styles.atkRollBtn, { borderColor: t.primary, borderWidth: 1.5, flexDirection: 'row', gap: 5 }]}>
                <Ionicons name="flame-outline" size={15} color={t.primary} />
                <Text style={{ color: t.primary, fontWeight: '800', fontSize: 13 }}>
                  Dano ({a.dano})
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

// ---------- Recursos de Classe (Fúria, Ki, Feitiçaria, Inspiração de Bardo...) ----------
function RecursosCard() {
  const t = useTheme();
  const ro = useReadOnly();
  const recursos = useField<RecursoClasse[]>('recursos') ?? [];
  const set = (arr: RecursoClasse[]) => setField('recursos', arr);
  const edita = (id: string, patch: Partial<RecursoClasse>) =>
    set(recursos.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <Card accent>
      <SectionTitle
        right={
          ro ? null : (
            <IconButton
              name="add-circle"
              size={26}
              color={t.primary}
              onPress={() =>
                set([...recursos, { id: uid(), nome: '', total: 2, usados: 0, descanso: 'longo' }])
              }
            />
          )
        }>
        Recursos de Classe (Fúria, Ki, Surto...)
      </SectionTitle>
      {recursos.length === 0 ? (
        <Label style={{ fontSize: 12 }}>
          Adicione contadores que resetam automaticamente no Descanso Curto ou Longo.
        </Label>
      ) : null}
      {recursos.map((r) => (
        <View key={r.id} style={[styles.expBox, { borderColor: t.border, backgroundColor: t.background }]}>
          <View style={styles.expHead}>
            <TextInput
              value={r.nome}
              editable={!ro}
              onChangeText={(v) => edita(r.id, { nome: v })}
              placeholder="Nome (ex.: Fúria, Pontos de Ki)"
              placeholderTextColor={t.textSecondary}
              style={[styles.expTitleInput, { color: t.text }]}
            />
            <Pressable
              disabled={ro}
              onPress={() =>
                edita(r.id, { descanso: r.descanso === 'curto' ? 'longo' : 'curto' })
              }
              style={[styles.restTag, { borderColor: t.primary, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Ionicons
                name={r.descanso === 'curto' ? 'cafe-outline' : 'moon-outline'}
                size={12}
                color={t.primary}
              />
              <Text style={{ color: t.primary, fontSize: 11, fontWeight: '700' }}>
                {r.descanso === 'curto' ? 'Curto' : 'Longo'}
              </Text>
            </Pressable>
            <NumInput
              value={r.total}
              min={1}
              max={20}
              editable={!ro}
              onChange={(n) => edita(r.id, { total: n, usados: Math.min(r.usados, n) })}
              style={{ minWidth: 42 }}
            />
            {ro ? null : (
              <IconButton
                name="trash-outline"
                size={20}
                color={t.danger}
                onPress={() => set(recursos.filter((x) => x.id !== r.id))}
              />
            )}
          </View>
          <View style={[styles.row, { marginTop: 8, flexWrap: 'wrap' }]}>
            {Array.from({ length: r.total }, (_, i) => {
              const usado = i < r.usados;
              return (
                <Pressable
                  key={i}
                  disabled={ro}
                  onPress={() =>
                    edita(r.id, { usados: clamp(usado ? r.usados - 1 : r.usados + 1, 0, r.total) })
                  }
                  style={[
                    styles.resDot,
                    { borderColor: t.primary, backgroundColor: usado ? t.primary : 'transparent' },
                  ]}>
                  {usado ? <Ionicons name="close" size={16} color={t.onPrimary} /> : null}
                </Pressable>
              );
            })}
            <Label style={{ marginBottom: 0, marginLeft: 'auto' }}>
              {Math.max(0, r.total - r.usados)}/{r.total} disponíveis
            </Label>
          </View>
        </View>
      ))}
    </Card>
  );
}

// ---------- Moedas (Dinheiro) ----------
function MoedasCard() {
  const ro = useReadOnly();
  const moedas = useField<Moedas>('moedas') ?? { pc: 0, pp: 0, pe: 0, po: 0, pl: 0 };
  return (
    <Card accent>
      <SectionTitle>Moedas (Dinheiro)</SectionTitle>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        {MOEDA_KEYS.map((k) => (
          <View key={k} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: MOEDA_LABELS[k].cor, fontWeight: '800', fontSize: 13, marginBottom: 4 }}>
              {MOEDA_LABELS[k].sigla}
            </Text>
            <NumInput
              value={moedas[k] ?? 0}
              min={0}
              max={999999}
              editable={!ro}
              onChange={(n) => setField(`moedas.${k}`, n)}
              style={{ minWidth: 52, fontSize: 16 }}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

// ---------- Lista de Cards Expansíveis (Equipamentos e Habilidades/Talentos) ----------
function EquipamentosCard() {
  const t = useTheme();
  const ro = useReadOnly();
  const itens = useField<ItemEquipamento[]>('itensEquipamento') ?? [];
  const ataques = useField<Ataque[]>('ataques') ?? [];
  const attrs = useField<Record<AtributoKey, number>>('atributos');
  const nivel = useField<number>('nivel');
  const notasAntigas = useField<string>('equipamento') ?? '';
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [mostrarNotas, setMostrarNotas] = useState(Boolean(notasAntigas));

  const sintonizados = itens.filter((i) => i.sintonizado).length;
  const capKg = Math.round((attrs?.for ?? 10) * 7.5);
  const capLb = (attrs?.for ?? 10) * 15;

  const set = (arr: ItemEquipamento[]) => setField('itensEquipamento', arr);
  const adicionar = () => {
    const id = uid();
    set([...itens, { id, nome: '', qtd: '1', descricao: '' }]);
    setAbertoId(id);
  };
  const edita = (id: string, patch: Partial<ItemEquipamento>) =>
    set(itens.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const alternarSintonia = (item: ItemEquipamento) => {
    if (!item.sintonizado && sintonizados >= 3) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Limite de Sintonização: você só pode estar sintonizado a no máximo 3 itens mágicos por vez.');
      } else {
        Alert.alert('Limite de Sintonização (3/3)', 'Pelas regras do D&D 5e, um personagem só pode estar sintonizado a no máximo 3 itens mágicos por vez.');
      }
      return;
    }
    edita(item.id, { sintonizado: !item.sintonizado });
  };

  const criarAtaqueDoItem = (item: ItemEquipamento) => {
    const modMelhor = Math.max(modificador(attrs?.for ?? 10), modificador(attrs?.des ?? 10));
    const bonusAtk = modMelhor + bonusProficiencia(nivel);
    const novoAtk: Ataque = {
      id: uid(),
      nome: item.nome || 'Arma',
      bonus: fmt(bonusAtk),
      dano: `1d8${modMelhor >= 0 ? `+${modMelhor}` : modMelhor}`,
      tipoDano: 'Cortante/Perfurante',
      alcance: '1,5 m',
    };
    setField('ataques', [...ataques, novoAtk]);
    if (Platform.OS !== 'web') {
      Alert.alert('Ataque criado', `${novoAtk.nome} foi adicionado a Ataques e Magias Rápidas!`);
    }
  };

  return (
    <Card accent>
      <SectionTitle
        right={
          ro ? null : (
            <IconButton name="add-circle" size={26} color={t.primary} onPress={adicionar} />
          )
        }>
        Equipamento
      </SectionTitle>

      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="sparkles-outline" size={13} color={t.primary} />
          <Label style={{ marginBottom: 0 }}>
            Sintonizados: {sintonizados}/3
          </Label>
        </View>
        <Label style={{ marginBottom: 0 }}>
          Carga Máx: {capKg} kg ({capLb} lb)
        </Label>
      </View>

      {itens.length === 0 ? (
        <Label style={{ fontSize: 12 }}>
          Toque em + para adicionar um equipamento (título visível e descrição ao tocar).
        </Label>
      ) : null}

      {itens.map((item) => {
        const open = abertoId === item.id;
        return (
          <View key={item.id} style={[styles.expBox, { borderColor: t.border, backgroundColor: t.background }]}>
            <View style={styles.expHead}>
              <Pressable
                onPress={() => setAbertoId(open ? null : item.id)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={t.primary} />
                <Txt bold style={{ flex: 1, fontSize: 16 }}>
                  {item.nome || 'Novo equipamento'}
                </Txt>
                <Label style={{ marginBottom: 0 }}>x{item.qtd || '1'}</Label>
              </Pressable>
              <Pressable
                disabled={ro}
                onPress={() => edita(item.id, { equipado: !item.equipado })}
                style={[
                  styles.restTag,
                  {
                    borderColor: item.equipado ? t.primary : t.border,
                    backgroundColor: item.equipado ? t.primary : 'transparent',
                  },
                ]}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: item.equipado ? t.onPrimary : t.textSecondary,
                  }}>
                  {item.equipado ? 'Equip.' : 'Mochila'}
                </Text>
              </Pressable>
              <Pressable
                disabled={ro}
                onPress={() => alternarSintonia(item)}
                style={[
                  styles.restTag,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                    borderColor: item.sintonizado ? '#D4AF37' : t.border,
                    backgroundColor: item.sintonizado ? '#D4AF37' : 'transparent',
                  },
                ]}>
                <Ionicons
                  name="sparkles"
                  size={10}
                  color={item.sintonizado ? '#1B1B1F' : t.textSecondary}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: item.sintonizado ? '#1B1B1F' : t.textSecondary,
                  }}>
                  Sint.
                </Text>
              </Pressable>
              {ro ? null : (
                <IconButton
                  name="trash-outline"
                  size={20}
                  color={t.danger}
                  onPress={() => set(itens.filter((x) => x.id !== item.id))}
                />
              )}
            </View>
            {open ? (
              <View style={{ gap: 6, marginTop: 8 }}>
                <View style={styles.row}>
                  <TextInput
                    value={item.nome}
                    editable={!ro}
                    onChangeText={(v) => edita(item.id, { nome: v })}
                    placeholder="Nome do equipamento"
                    placeholderTextColor={t.textSecondary}
                    style={[styles.originInput, { flex: 1, borderColor: t.border, backgroundColor: t.input, color: t.text }]}
                  />
                  <TextInput
                    value={item.qtd ?? '1'}
                    editable={!ro}
                    onChangeText={(v) => edita(item.id, { qtd: v })}
                    placeholder="Qtd"
                    placeholderTextColor={t.textSecondary}
                    style={[styles.qtdInput, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
                  />
                </View>
                <TextInput
                  value={item.descricao ?? ''}
                  editable={!ro}
                  onChangeText={(v) => edita(item.id, { descricao: v })}
                  placeholder="Descrição / propriedades do equipamento..."
                  placeholderTextColor={t.textSecondary}
                  multiline
                  style={[styles.expDescInput, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
                />
                {!ro ? (
                  <Button
                    title="Criar Ataque a partir deste item"
                    icon="flash-outline"
                    variant="ghost"
                    onPress={() => criarAtaqueDoItem(item)}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      <Pressable onPress={() => setMostrarNotas((v) => !v)} style={{ marginTop: 8 }}>
        <Label style={{ marginBottom: 0 }}>
          {mostrarNotas ? '▾ Ocultar notas gerais de equipamento' : '▸ Mostrar notas gerais de equipamento'}
        </Label>
      </Pressable>
      {mostrarNotas ? (
        <FieldText path="equipamento" multiline placeholder="Anotações livres de inventário..." style={{ marginTop: 6 }} />
      ) : null}
    </Card>
  );
}

function CaracteristicasCard() {
  const t = useTheme();
  const ro = useReadOnly();
  const lista = useField<Caracteristica[]>('caracteristicas') ?? [];
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const set = (arr: Caracteristica[]) => setField('caracteristicas', arr);
  const adicionar = () => {
    const id = uid();
    set([...lista, { id, nome: '', origem: 'Raça / Classe / Talento', descricao: '' }]);
    setAbertoId(id);
    setEditandoId(id);
  };
  const edita = (id: string, patch: Partial<Caracteristica>) =>
    set(lista.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <Card accent>
      <SectionTitle
        right={
          ro ? null : (
            <IconButton name="add-circle" size={26} color={t.primary} onPress={adicionar} />
          )
        }>
        Habilidades, Traços e Talentos
      </SectionTitle>
      {lista.length === 0 ? (
        <Label style={{ fontSize: 12 }}>
          Adicione traços raciais, habilidades de classe ou talentos (toque no item para ler a descrição).
        </Label>
      ) : null}

      {lista.map((c) => {
        const open = abertoId === c.id;
        const isEditing = editandoId === c.id;
        return (
          <View key={c.id} style={[styles.expBox, { borderColor: t.border, backgroundColor: t.background }]}>
            <View style={styles.expHead}>
              <Pressable
                onPress={() => setAbertoId(open ? null : c.id)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={t.primary} />
                <View style={{ flex: 1 }}>
                  <Txt bold style={{ fontSize: 16 }}>
                    {c.nome || 'Nova habilidade'}
                  </Txt>
                  {c.origem ? <Label style={{ marginBottom: 0 }}>{c.origem}</Label> : null}
                </View>
              </Pressable>
              {!ro && open ? (
                <IconButton
                  name={isEditing ? 'checkmark-circle' : 'create-outline'}
                  size={20}
                  color={isEditing ? t.success : t.textSecondary}
                  onPress={() => setEditandoId(isEditing ? null : c.id)}
                />
              ) : null}
              {ro ? null : (
                <IconButton
                  name="trash-outline"
                  size={20}
                  color={t.danger}
                  onPress={() => set(lista.filter((x) => x.id !== c.id))}
                />
              )}
            </View>
            {open ? (
              isEditing && !ro ? (
                <View style={{ gap: 6, marginTop: 6 }}>
                  <TextInput
                    value={c.nome}
                    onChangeText={(v) => edita(c.id, { nome: v })}
                    placeholder="Nome da habilidade ou talento"
                    placeholderTextColor={t.textSecondary}
                    style={[styles.originInput, { borderColor: t.border, backgroundColor: t.input, color: t.text, fontWeight: '700' }]}
                  />
                  <TextInput
                    value={c.origem ?? ''}
                    onChangeText={(v) => edita(c.id, { origem: v })}
                    placeholder="Origem (ex.: Raça, Classe, Talento)"
                    placeholderTextColor={t.textSecondary}
                    style={[styles.originInput, { borderColor: t.border, backgroundColor: t.input, color: t.textSecondary }]}
                  />
                  <TextInput
                    value={c.descricao ?? ''}
                    onChangeText={(v) => edita(c.id, { descricao: v })}
                    placeholder="Descrição completa da habilidade ou talento..."
                    placeholderTextColor={t.textSecondary}
                    multiline
                    style={[styles.expDescInput, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
                  />
                </View>
              ) : (
                <View style={{ marginTop: 6 }}>
                  <Txt style={{ fontSize: 14, lineHeight: 20, color: t.textSecondary }}>
                    {c.descricao || 'Sem descrição. Toque no lápis acima para editar.'}
                  </Txt>
                </View>
              )
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

function CompanheirosCard() {
  const t = useTheme();
  const ro = useReadOnly();
  const lista = useField<Companheiro[]>('companheiros') ?? [];
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const set = (arr: Companheiro[]) => setField('companheiros', arr);
  const adicionar = () => {
    const id = uid();
    set([
      ...lista,
      { id, nome: '', tipo: 'Forma Selvagem / Familiar', ca: 12, pvAtual: 10, pvTotal: 10, descricao: '' },
    ]);
    setAbertoId(id);
  };
  const edita = (id: string, patch: Partial<Companheiro>) =>
    set(lista.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <Card accent>
      <SectionTitle
        right={
          ro ? null : (
            <IconButton name="add-circle" size={26} color={t.primary} onPress={adicionar} />
          )
        }>
        Companheiros, Familiar & Forma Selvagem
      </SectionTitle>
      {lista.length === 0 ? (
        <Label style={{ fontSize: 12 }}>
          Adicione Pets, Familiares ou Formas Selvagens de Druida (ou importe direto do Bestiário no Compêndio).
        </Label>
      ) : null}

      {lista.map((c) => {
        const open = abertoId === c.id;
        return (
          <View key={c.id} style={[styles.expBox, { borderColor: t.border, backgroundColor: t.background }]}>
            <View style={styles.expHead}>
              <Pressable
                onPress={() => setAbertoId(open ? null : c.id)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={t.primary} />
                <Txt bold style={{ flex: 1, fontSize: 16 }}>
                  {c.nome || 'Nova criatura'}
                </Txt>
              </Pressable>
              <View style={[styles.restTag, { borderColor: t.primary }]}>
                <Text style={{ color: t.primary, fontWeight: '800', fontSize: 12 }}>CA {c.ca}</Text>
              </View>
              {ro ? null : (
                <IconButton
                  name="trash-outline"
                  size={20}
                  color={t.danger}
                  onPress={() => set(lista.filter((x) => x.id !== c.id))}
                />
              )}
            </View>

            <View style={[styles.row, { justifyContent: 'space-between', marginTop: 8 }]}>
              <View style={styles.row}>
                <IconButton
                  name="remove-circle"
                  size={28}
                  color={t.danger}
                  disabled={ro}
                  onPress={() => edita(c.id, { pvAtual: clamp(c.pvAtual - 1, 0, c.pvTotal) })}
                />
                <Txt bold style={{ fontSize: 17 }}>
                  {c.pvAtual} / {c.pvTotal} PV
                </Txt>
                <IconButton
                  name="add-circle"
                  size={28}
                  color={t.success}
                  disabled={ro}
                  onPress={() => edita(c.id, { pvAtual: clamp(c.pvAtual + 1, 0, c.pvTotal) })}
                />
              </View>
              <Label style={{ marginBottom: 0 }}>{c.tipo}</Label>
            </View>

            {open ? (
              <View style={{ gap: 6, marginTop: 8 }}>
                <TextInput
                  value={c.nome}
                  editable={!ro}
                  onChangeText={(v) => edita(c.id, { nome: v })}
                  placeholder="Nome da criatura (ex.: Lobo, Coruja)"
                  placeholderTextColor={t.textSecondary}
                  style={[styles.originInput, { borderColor: t.border, backgroundColor: t.input, color: t.text, fontWeight: '700' }]}
                />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Label>Tipo (Familiar / Forma Selvagem)</Label>
                    <TextInput
                      value={c.tipo ?? ''}
                      editable={!ro}
                      onChangeText={(v) => edita(c.id, { tipo: v })}
                      placeholder="Forma Selvagem"
                      placeholderTextColor={t.textSecondary}
                      style={[styles.originInput, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
                    />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Label>CA</Label>
                    <NumInput
                      value={c.ca}
                      min={1}
                      max={35}
                      editable={!ro}
                      onChange={(n) => edita(c.id, { ca: n })}
                    />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Label>PV Máx</Label>
                    <NumInput
                      value={c.pvTotal}
                      min={1}
                      max={999}
                      editable={!ro}
                      onChange={(n) => edita(c.id, { pvTotal: n, pvAtual: Math.min(c.pvAtual, n) })}
                    />
                  </View>
                </View>
                <TextInput
                  value={c.descricao ?? ''}
                  editable={!ro}
                  onChangeText={(v) => edita(c.id, { descricao: v })}
                  placeholder="Atributos, deslocamento e ações/ataques da criatura..."
                  placeholderTextColor={t.textSecondary}
                  multiline
                  style={[styles.expDescInput, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

// ---------- Tela ----------
export default function PrincipalScreen() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DesktopBreakpoint;

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          width: '100%',
          maxWidth: isDesktop ? MaxDesktopWidth : MaxContentWidth,
          alignSelf: 'center',
        }}>
        {/* Fora do ScrollView: permanece fixo durante a rolagem */}
        <CombatHeader />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: 12, paddingBottom: insets.bottom + 24 }}>
          {isDesktop ? (
            <View style={{ gap: 14 }}>
              {/* Faixa horizontal dos 6 atributos (Estilo Demiplane Editorial) */}
              <Atributos horizontal />

              {/* Grade assimetrica de 2 colunas (42% / 58%) */}
              <View style={styles.desktopGrid}>
                <View style={styles.desktopLeftCol}>
                  <Identidade />
                  <Salvaguardas />
                  <Pericias />
                  <Vida />
                  <Morte />
                </View>
                <View style={styles.desktopRightCol}>
                  <Ataques />
                  <RecursosCard />
                  <MoedasCard />
                  <EquipamentosCard />
                  <CaracteristicasCard />
                  <CompanheirosCard />
                  <Card>
                    <FieldText path="idiomasProf" label="Idiomas e Outras Proficiências" multiline />
                  </Card>
                </View>
              </View>
            </View>
          ) : (
            <>
              <Atributos />
              <Identidade />
              <Vida />
              <Morte />
              <Salvaguardas />
              <Pericias />
              <RecursosCard />
              <Ataques />
              <MoedasCard />
              <EquipamentosCard />
              <CaracteristicasCard />
              <CompanheirosCard />
              <Card>
                <FieldText path="idiomasProf" label="Idiomas e Outras Proficiências" multiline />
              </Card>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  desktopGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  desktopLeftCol: { flex: 0.85, minWidth: 0 },
  desktopRightCol: { flex: 1.15, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  idTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  big: { fontSize: 24, fontWeight: '800' },
  attrGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  attrGridHorizontal: { flexWrap: 'nowrap', gap: 12, marginBottom: 4 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  restBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  divider: { height: 1, marginVertical: 12 },
  mark: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  atkBox: { borderWidth: 1, borderRadius: 12, padding: 8, marginBottom: 8, gap: 6 },
  atkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  atkRollBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  restTag: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  resDot: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  expBox: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  expHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expTitleInput: { flex: 1, fontSize: 16, fontWeight: '700', paddingVertical: 4 },
  qtdInput: { width: 52, borderWidth: 1, borderRadius: 8, textAlign: 'center', paddingVertical: 4, fontSize: 15, fontWeight: '700' },
  originInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13 },
  expDescInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginTop: 4 },
});
