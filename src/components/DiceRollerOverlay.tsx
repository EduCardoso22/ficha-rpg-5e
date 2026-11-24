import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, IconButton, Label, SectionTitle, Txt } from '@/components/ficha-ui';
import { useTheme } from '@/hooks/use-theme';
import { useDiceStore } from '@/store/useDiceStore';
import { setField, useFichaStore } from '@/store/useFichaStore';
import { bonusSalvaguarda, fmt } from '@/utils/calc';

const DADOS_LIVRES = [4, 6, 8, 10, 12, 20, 100];

export function DiceRollerOverlay() {
  const t = useTheme();
  const {
    ultima,
    historico,
    bandejaAberta,
    alertaConcentracao,
    rolarD20,
    rolarFormula,
    fecharBanner,
    setBandejaAberta,
    limparAlertaConcentracao,
    codigoMesa,
    dadosMesa,
    conectarMesa,
    desconectarMesa,
  } = useDiceStore();
  const ficha = useFichaStore((s) => s.ficha);
  const [formulaCustom, setFormulaCustom] = useState('2d6+3');
  const [inputMesa, setInputMesa] = useState(codigoMesa ?? '');

  const corResultado =
    ultima?.critico === 'sucesso'
      ? t.success
      : ultima?.critico === 'falha'
        ? t.danger
        : t.primary;

  const rolarTesteConcentracao = () => {
    if (!ficha || !alertaConcentracao) return;
    const bonusCon = bonusSalvaguarda(ficha, 'con');
    const r = rolarD20(`TR Constituição (Concentração CD ${alertaConcentracao.cd})`, bonusCon);
    if (r.total < alertaConcentracao.cd) {
      // Se falhar, já sugere encerrar concentração
    }
    limparAlertaConcentracao();
  };

  return (
    <>
      {/* Alerta inteligente de Concentração quando o personagem sofre dano */}
      {alertaConcentracao ? (
        <View style={[styles.concBanner, { backgroundColor: t.backgroundElement, borderColor: t.primary }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="flash" size={15} color={t.primary} />
              <Txt bold style={{ color: t.primary }}>
                Teste de Concentração ({alertaConcentracao.magia})
              </Txt>
            </View>
            <Label style={{ marginBottom: 0, textTransform: 'none' }}>
              Você sofreu {alertaConcentracao.dano} de dano! Faça um TR de Constituição (CD {alertaConcentracao.cd}).
            </Label>
          </View>
          <Pressable
            onPress={rolarTesteConcentracao}
            style={[styles.rollActionBtn, { backgroundColor: t.primary }]}>
            <Text style={{ color: t.onPrimary, fontWeight: '800', fontSize: 13 }}>Rolar TR</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setField('concentrando', '');
              limparAlertaConcentracao();
            }}
            style={[styles.rollActionBtn, { borderColor: t.danger, borderWidth: 1 }]}>
            <Text style={{ color: t.danger, fontWeight: '700', fontSize: 12 }}>Perdeu</Text>
          </Pressable>
          <IconButton name="close" size={18} onPress={limparAlertaConcentracao} />
        </View>
      ) : null}

      {/* Banner flutuante do resultado da última rolagem */}
      {ultima ? (
        <View style={[styles.toast, { backgroundColor: t.backgroundElement, borderColor: corResultado }]}>
          <View style={styles.toastMain}>
            <View style={[styles.totalBox, { backgroundColor: corResultado }]}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>{ultima.total}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Txt bold numberOfLines={1} style={{ fontSize: 15 }}>
                {ultima.titulo}
                {ultima.critico === 'sucesso' ? ' · CRÍTICO 20!' : ''}
                {ultima.critico === 'falha' ? ' · FALHA CRÍTICA 1!' : ''}
              </Txt>
              <Label style={{ marginBottom: 0, textTransform: 'none' }}>
                {ultima.formula} → Dados: [{ultima.dados.join(', ')}]
                {ultima.bonus !== 0 ? ` ${fmt(ultima.bonus)}` : ''}
                {ultima.modo !== 'normal' ? ` (${ultima.modo})` : ''}
              </Label>
            </View>
            <IconButton name="close" size={20} onPress={fecharBanner} />
          </View>

          <View style={styles.toastActions}>
            {ultima.ehTesteD20 ? (
              <>
                <Pressable
                  onPress={() =>
                    rolarD20(ultima.titulo, ultima.bonus, 'vantagem', {
                      danoFormula: ultima.danoFormula,
                      tipoDano: ultima.tipoDano,
                    })
                  }
                  style={[
                    styles.miniChip,
                    {
                      borderColor: t.success,
                      backgroundColor: ultima.modo === 'vantagem' ? t.success : 'transparent',
                    },
                  ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons
                      name="arrow-up-circle"
                      size={14}
                      color={ultima.modo === 'vantagem' ? '#fff' : t.success}
                    />
                    <Text
                      style={{
                        color: ultima.modo === 'vantagem' ? '#fff' : t.success,
                        fontWeight: '700',
                        fontSize: 12,
                      }}>
                      Vantagem
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() =>
                    rolarD20(ultima.titulo, ultima.bonus, 'desvantagem', {
                      danoFormula: ultima.danoFormula,
                      tipoDano: ultima.tipoDano,
                    })
                  }
                  style={[
                    styles.miniChip,
                    {
                      borderColor: t.danger,
                      backgroundColor: ultima.modo === 'desvantagem' ? t.danger : 'transparent',
                    },
                  ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons
                      name="arrow-down-circle"
                      size={14}
                      color={ultima.modo === 'desvantagem' ? '#fff' : t.danger}
                    />
                    <Text
                      style={{
                        color: ultima.modo === 'desvantagem' ? '#fff' : t.danger,
                        fontWeight: '700',
                        fontSize: 12,
                      }}>
                      Desvantagem
                    </Text>
                  </View>
                </Pressable>
              </>
            ) : null}

            {ultima.danoFormula ? (
              <Pressable
                onPress={() =>
                  rolarFormula(
                    `Dano: ${ultima.titulo}${ultima.tipoDano ? ` (${ultima.tipoDano})` : ''}`,
                    ultima.danoFormula!,
                    ultima.critico === 'sucesso',
                  )
                }
                style={[styles.miniChip, { backgroundColor: t.primary, borderColor: t.primary }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="flame" size={14} color={t.onPrimary} />
                  <Text style={{ color: t.onPrimary, fontWeight: '800', fontSize: 12 }}>
                    {ultima.critico === 'sucesso' ? 'Rolar Dano Crítico (2x)' : `Rolar Dano (${ultima.danoFormula})`}
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Botão Flutuante (FAB) de Bandeja de Dados */}
      <Pressable
        onPress={() => setBandejaAberta(true)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: t.primary, opacity: pressed ? 0.85 : 1 },
        ]}>
        <MaterialCommunityIcons name="dice-d20" size={26} color={t.onPrimary} />
      </Pressable>

      {/* Modal da Bandeja de Dados Livre e Histórico */}
      <Modal
        visible={bandejaAberta}
        transparent
        animationType="slide"
        onRequestClose={() => setBandejaAberta(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.backgroundElement, borderColor: t.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="dice-d20" size={22} color={t.primary} />
                <Txt bold style={{ fontSize: 18 }}>Bandeja de Dados</Txt>
              </View>
              <IconButton name="close" size={24} onPress={() => setBandejaAberta(false)} />
            </View>

            <Label>Rolagem Rápida (1 dado)</Label>
            <View style={styles.diceRow}>
              {DADOS_LIVRES.map((faces) => (
                <Pressable
                  key={faces}
                  onPress={() => {
                    if (faces === 20) rolarD20('Rolagem Livre (d20)', 0);
                    else rolarFormula(`Rolagem Livre (d${faces})`, `1d${faces}`);
                  }}
                  style={({ pressed }) => [
                    styles.dieBtn,
                    {
                      borderColor: t.primary,
                      backgroundColor: pressed ? t.primary : t.background,
                    },
                  ]}>
                  {({ pressed }) => (
                    <Text
                      style={{
                        color: pressed ? t.onPrimary : t.text,
                        fontWeight: '800',
                        fontSize: 15,
                      }}>
                      d{faces}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>

            <Label style={{ marginTop: 8 }}>Fórmula Personalizada (ex.: 8d6, 2d8+4, 4d4+4)</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={formulaCustom}
                onChangeText={setFormulaCustom}
                placeholder="2d6+3"
                placeholderTextColor={t.textSecondary}
                autoCapitalize="none"
                style={[styles.input, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
              />
              <Button
                title="Rolar"
                onPress={() => rolarFormula(`Fórmula (${formulaCustom})`, formulaCustom)}
              />
            </View>

            <Label style={{ marginTop: 8 }}>Sala de Mesa ao Vivo (sincroniza rolagens e iniciativa com o grupo)</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={codigoMesa ?? inputMesa}
                editable={!codigoMesa}
                onChangeText={setInputMesa}
                placeholder="Código (ex.: MESA-D20)"
                placeholderTextColor={t.textSecondary}
                autoCapitalize="characters"
                style={[styles.input, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
              />
              {codigoMesa ? (
                <Button title="Sair da Sala" variant="ghost" onPress={desconectarMesa} />
              ) : (
                <Button
                  title="Conectar"
                  onPress={() => conectarMesa(inputMesa)}
                  disabled={!inputMesa.trim()}
                />
              )}
            </View>

            <SectionTitle>
              {codigoMesa ? `Feed ao Vivo da Sala (${codigoMesa})` : 'Histórico da Sessão'}
            </SectionTitle>
            <ScrollView style={{ maxHeight: 200 }}>
              {codigoMesa ? (
                (dadosMesa?.rolagens ?? []).length === 0 ? (
                  <Label>Nenhuma rolagem na sala ainda.</Label>
                ) : (
                  (dadosMesa?.rolagens ?? []).map((h) => (
                    <Card key={h.id} style={styles.histCard}>
                      <View style={{ flex: 1 }}>
                        <Txt bold>
                          {h.personagem} · {h.titulo}
                        </Txt>
                        <Label style={{ marginBottom: 0, textTransform: 'none' }}>{h.formula}</Label>
                      </View>
                      <Txt
                        bold
                        style={{
                          fontSize: 20,
                          color:
                            h.critico === 'sucesso'
                              ? t.success
                              : h.critico === 'falha'
                                ? t.danger
                                : t.primary,
                        }}>
                        {h.total}
                      </Txt>
                    </Card>
                  ))
                )
              ) : (
                <>
                  {historico.length === 0 ? (
                    <Label>Nenhuma rolagem ainda. Toque em qualquer perícia, ataque ou dado acima!</Label>
                  ) : null}
                  {historico.map((h) => (
                    <Card key={h.id} style={styles.histCard}>
                      <View style={{ flex: 1 }}>
                        <Txt bold>{h.titulo}</Txt>
                        <Label style={{ marginBottom: 0, textTransform: 'none' }}>
                          {h.formula} → [{h.dados.join(', ')}]
                        </Label>
                      </View>
                      <Txt
                        bold
                        style={{
                          fontSize: 20,
                          color:
                            h.critico === 'sucesso'
                              ? t.success
                              : h.critico === 'falha'
                                ? t.danger
                                : t.primary,
                        }}>
                        {h.total}
                      </Txt>
                    </Card>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  concBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    elevation: 6,
  },
  rollActionBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  toast: {
    position: 'absolute',
    left: 12,
    right: 76,
    bottom: 64,
    zIndex: 30,
    borderRadius: 16,
    borderWidth: 2,
    padding: 10,
    gap: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  toastMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  totalBox: { minWidth: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  toastActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniChip: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  fab: {
    position: 'absolute',
    right: 14,
    bottom: 68,
    zIndex: 25,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, padding: 16, gap: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  diceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dieBtn: { flex: 1, minWidth: 44, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  histCard: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 6 },
});
