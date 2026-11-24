import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { StepperModal } from '@/components/StepperModal';
import { Button, Label, SectionTitle, Txt, useReadOnly } from '@/components/ficha-ui';
import { DesktopBreakpoint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { alterarPv } from '@/store/acoesFicha';
import { useDiceStore } from '@/store/useDiceStore';
import { setField, useField } from '@/store/useFichaStore';
import { CONDICOES_5E } from '@/types/ficha';
import { fmt, modificador } from '@/utils/calc';

function BotaoPv({
  icone,
  cor,
  onPress,
  onLongPress,
  disabled,
}: {
  icone: 'remove' | 'add';
  cor: string;
  onPress: () => void;
  onLongPress: () => void;
  disabled: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.pvBtn,
        { borderColor: cor, backgroundColor: pressed ? cor : 'transparent', opacity: disabled ? 0.4 : 1 },
      ]}>
      {({ pressed }) => <Ionicons name={icone} size={30} color={pressed ? t.background : cor} />}
    </Pressable>
  );
}

/** Painel fixo no topo da aba Principal: PV (+/−), CA, Iniciativa (clicável para rolar), Inspiração, Concentração e Condições. */
export function CombatHeader() {
  const t = useTheme();
  const ro = useReadOnly();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DesktopBreakpoint;
  const pv = useField<{ atual: number; total: number; temp: number }>('pv');
  const ca = useField<number>('ca');
  const des = useField<number>('atributos.des');
  const extra = useField<number>('iniciativaExtra');
  const inspiracao = useField<boolean>('inspiracao') ?? false;
  const concentrando = useField<string>('concentrando') ?? '';
  const condicoes = useField<string[]>('condicoes') ?? [];
  const exaustao = useField<number>('exaustao') ?? 0;

  const [editaCa, setEditaCa] = useState(false);
  const [editaIni, setEditaIni] = useState(false);
  const [modalStatus, setModalStatus] = useState(false);
  const rolarD20 = useDiceStore((s) => s.rolarD20);

  const razao = pv.total > 0 ? pv.atual / pv.total : 0;
  const corPv = razao <= 0.25 ? t.danger : razao <= 0.5 ? '#F59E0B' : t.success;
  const ini = modificador(des) + extra;

  const toggleCondicao = (c: string) => {
    const nova = condicoes.includes(c) ? condicoes.filter((x) => x !== c) : [...condicoes, c];
    setField('condicoes', nova);
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: t.backgroundElement,
          borderColor: t.border,
          borderTopWidth: 3,
          borderTopColor: t.primary,
        },
      ]}>
      <View style={isDesktop ? styles.desktopHeroRow : undefined}>
        {/* PV */}
        <View style={isDesktop ? { flex: 1.1 } : undefined}>
          <View style={styles.pvRow}>
            <BotaoPv icone="remove" cor={t.danger} disabled={ro} onPress={() => alterarPv(-1)} onLongPress={() => alterarPv(-5)} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Label style={{ marginBottom: 0 }}>Pontos de Vida</Label>
              <Text style={{ color: corPv, fontSize: 36, fontWeight: '900', lineHeight: 42 }}>
                {pv.atual}
                <Text style={{ color: t.textSecondary, fontSize: 18, fontWeight: '700' }}> / {pv.total}</Text>
              </Text>
              {pv.temp > 0 ? <Text style={{ color: t.primary, fontWeight: '700', fontSize: 12 }}>+{pv.temp} temporários</Text> : null}
            </View>
            <BotaoPv icone="add" cor={t.success} disabled={ro} onPress={() => alterarPv(1)} onLongPress={() => alterarPv(5)} />
          </View>
          <View style={[styles.barra, { backgroundColor: t.backgroundSelected }]}>
            <View style={{ width: `${Math.min(100, razao * 100)}%`, height: '100%', backgroundColor: corPv }} />
          </View>
          {!isDesktop ? <Text style={[styles.dica, { color: t.textSecondary }]}>Segure + ou − para ±5</Text> : null}
        </View>

        {/* CA e Iniciativa */}
        <View style={[styles.statsRow, isDesktop && { flex: 0.9, marginTop: 0 }]}>
          <Pressable
            disabled={ro}
            onPress={() => setEditaCa(true)}
            style={({ pressed }) => [styles.stat, { backgroundColor: pressed ? t.backgroundSelected : 'transparent' }]}>
            <View style={styles.shield}>
              <Ionicons name="shield" size={62} color={t.primary} />
              <Text style={[styles.shieldTxt, { color: t.onPrimary }]}>{ca}</Text>
            </View>
            <Label style={{ marginBottom: 0 }}>Classe de Armadura</Label>
          </Pressable>

          <View style={{ alignItems: 'center' }}>
            <Pressable
              onPress={() => rolarD20('Iniciativa', ini)}
              onLongPress={() => !ro && setEditaIni(true)}
              style={({ pressed }) => [styles.stat, { backgroundColor: pressed ? t.backgroundSelected : 'transparent' }]}>
              <View style={[styles.ini, { borderColor: t.primary }]}>
                <Ionicons name="flash" size={16} color={t.primary} />
                <Text style={{ color: t.text, fontSize: 26, fontWeight: '900' }}>{fmt(ini)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="dice-d20-outline" size={13} color={t.primary} />
                <Label style={{ marginBottom: 0 }}>Rolar Iniciativa</Label>
              </View>
            </Pressable>
            {!ro ? (
              <Pressable onPress={() => setEditaIni(true)} hitSlop={6}>
                <Text style={{ color: t.textSecondary, fontSize: 10 }}>Editar bônus ({fmt(extra)})</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {/* Barra rápida de Inspiração, Concentração e Condições */}
      <View style={styles.statusRow}>
        <Pressable
          disabled={ro}
          onPress={() => setField('inspiracao', !inspiracao)}
          style={[
            styles.statusChip,
            {
              borderColor: inspiracao ? '#D4AF37' : t.border,
              backgroundColor: inspiracao ? '#D4AF37' : 'transparent',
            },
          ]}>
          <Ionicons name={inspiracao ? 'star' : 'star-outline'} size={14} color={inspiracao ? '#1B1B1F' : t.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: inspiracao ? '#1B1B1F' : t.text }}>
            Inspiração
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setModalStatus(true)}
          style={[
            styles.statusChip,
            {
              borderColor: concentrando ? t.primary : t.border,
              backgroundColor: concentrando ? t.primary : 'transparent',
            },
          ]}>
          <Ionicons name="sparkles" size={13} color={concentrando ? t.onPrimary : t.textSecondary} />
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, fontWeight: '700', color: concentrando ? t.onPrimary : t.text, maxWidth: 130 }}>
            {concentrando ? `Conc: ${concentrando}` : 'Concentração'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setModalStatus(true)}
          style={[
            styles.statusChip,
            {
              borderColor: condicoes.length > 0 || exaustao > 0 ? t.danger : t.border,
              backgroundColor: condicoes.length > 0 || exaustao > 0 ? t.danger : 'transparent',
            },
          ]}>
          <Ionicons
            name="warning-outline"
            size={14}
            color={condicoes.length > 0 || exaustao > 0 ? '#fff' : t.textSecondary}
          />
          <Text
            numberOfLines={1}
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: condicoes.length > 0 || exaustao > 0 ? '#fff' : t.text,
            }}>
            {condicoes.length > 0 || exaustao > 0
              ? `${condicoes.join(', ')}${exaustao > 0 ? ` · Exaustão ${exaustao}` : ''}`
              : 'Condições'}
          </Text>
        </Pressable>
      </View>

      <StepperModal
        visible={editaCa}
        title="Classe de Armadura"
        value={ca}
        min={0}
        max={40}
        onChange={(n) => setField('ca', n)}
        onClose={() => setEditaCa(false)}
      />
      <StepperModal
        visible={editaIni}
        title="Bônus extra de Iniciativa"
        subtitle={`Destreza ${fmt(modificador(des))} + extra = ${fmt(ini)}`}
        value={extra}
        min={-20}
        max={20}
        onChange={(n) => setField('iniciativaExtra', n)}
        onClose={() => setEditaIni(false)}
      />

      {/* Modal de Concentração, Condições e Exaustão */}
      <Modal visible={modalStatus} transparent animationType="fade" onRequestClose={() => setModalStatus(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.backgroundElement, borderColor: t.border }]}>
            <SectionTitle>Concentração e Condições</SectionTitle>
            <Label>Magia em Concentração (avisa automaticamente se sofrer dano)</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={concentrando}
                editable={!ro}
                onChangeText={(v) => setField('concentrando', v)}
                placeholder="Ex.: Bless, Spirit Guardians, Hex..."
                placeholderTextColor={t.textSecondary}
                style={[styles.input, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
              />
              {concentrando && !ro ? (
                <Button title="Limpar" variant="ghost" onPress={() => setField('concentrando', '')} />
              ) : null}
            </View>

            <Label style={{ marginTop: 6 }}>Nível de Exaustão (0 a 6)</Label>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[0, 1, 2, 3, 4, 5, 6].map((nv) => (
                <Pressable
                  key={nv}
                  disabled={ro}
                  onPress={() => setField('exaustao', nv)}
                  style={[
                    styles.exChip,
                    {
                      borderColor: nv > 0 ? t.danger : t.border,
                      backgroundColor: exaustao === nv ? (nv > 0 ? t.danger : t.primary) : 'transparent',
                    },
                  ]}>
                  <Txt bold style={{ color: exaustao === nv ? '#fff' : t.text }}>{nv}</Txt>
                </Pressable>
              ))}
            </View>

            <Label style={{ marginTop: 6 }}>Condições Ativas</Label>
            <ScrollView style={{ maxHeight: 200 }}>
              <View style={styles.condGrid}>
                {CONDICOES_5E.map((c) => {
                  const ativa = condicoes.includes(c);
                  return (
                    <Pressable
                      key={c}
                      disabled={ro}
                      onPress={() => toggleCondicao(c)}
                      style={[
                        styles.condChip,
                        {
                          borderColor: ativa ? t.danger : t.border,
                          backgroundColor: ativa ? t.danger : 'transparent',
                        },
                      ]}>
                      <Text style={{ color: ativa ? '#fff' : t.text, fontWeight: '700', fontSize: 13 }}>
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Button title="Fechar" onPress={() => setModalStatus(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  desktopHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  pvRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pvBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  barra: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  dica: { fontSize: 10, textAlign: 'center', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 4 },
  stat: { alignItems: 'center', gap: 2, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 14 },
  shield: { width: 68, height: 72, alignItems: 'center', justifyContent: 'center' },
  shieldTxt: { position: 'absolute', fontSize: 25, fontWeight: '900', top: 19 },
  ini: {
    height: 64,
    minWidth: 68,
    paddingHorizontal: 10,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 6 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 18 },
  modalCard: { width: '100%', maxWidth: 460, alignSelf: 'center', borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  exChip: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  condChip: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6 },
});
