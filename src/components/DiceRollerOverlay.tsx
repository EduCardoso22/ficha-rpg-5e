import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, IconButton, Label, SectionTitle, Txt } from '@/components/ficha-ui';
import { useTheme } from '@/hooks/use-theme';
import { ResultadoRolagem, useDiceStore } from '@/store/useDiceStore';
import { setField, useFichaStore } from '@/store/useFichaStore';
import { Ficha } from '@/types/ficha';
import { bonusSalvaguarda, fmt } from '@/utils/calc';

const DADOS_LIVRES = [4, 6, 8, 10, 12, 20, 100];

interface AlertaCondicao {
  avisos: string[];
  sugerirDesvantagem: boolean;
  sugerirVantagem: boolean;
}

function avaliarAlertasCondicoes(ficha: Ficha | null, res: ResultadoRolagem | null): AlertaCondicao {
  if (!ficha || !res || !res.ehTesteD20) {
    return { avisos: [], sugerirDesvantagem: false, sugerirVantagem: false };
  }

  const tituloLower = res.titulo.toLowerCase();
  const ehAtaque = tituloLower.includes('ataque');
  const ehSalvaguarda = tituloLower.startsWith('tr ') || tituloLower.includes('salvaguarda');
  const ehTrForDes =
    ehSalvaguarda && (tituloLower.includes('força') || tituloLower.includes('destreza'));

  const avisos: string[] = [];
  let sugerirDesvantagem = false;
  let sugerirVantagem = false;

  if ((ficha.exaustao ?? 0) >= 1) {
    if ((ficha.exaustao ?? 0) >= 3 && (ehAtaque || ehSalvaguarda)) {
      avisos.push(`Exaustão Nv ${ficha.exaustao}: desvantagem em ataques e salvaguardas.`);
      sugerirDesvantagem = true;
    } else if (!ehAtaque && !ehSalvaguarda) {
      avisos.push(`Exaustão Nv ${ficha.exaustao}: desvantagem em testes de atributo e perícia.`);
      sugerirDesvantagem = true;
    }
  }

  for (const cond of ficha.condicoes ?? []) {
    switch (cond) {
      case 'Envenenado':
        avisos.push('Envenenado: desvantagem em jogadas de ataque e testes de atributo.');
        if (!ehSalvaguarda) sugerirDesvantagem = true;
        break;
      case 'Amedrontado':
        avisos.push('Amedrontado: desvantagem em testes e ataques enquanto a fonte do medo estiver à vista.');
        if (!ehSalvaguarda) sugerirDesvantagem = true;
        break;
      case 'Caído':
        if (ehAtaque) {
          avisos.push('Caído: desvantagem nas suas jogadas de ataque.');
          sugerirDesvantagem = true;
        }
        break;
      case 'Cego':
        avisos.push('Cego: desvantagem em ataques; falha automática em testes que dependam de visão.');
        if (ehAtaque) sugerirDesvantagem = true;
        break;
      case 'Impedido':
        if (ehAtaque || (ehSalvaguarda && tituloLower.includes('destreza'))) {
          avisos.push('Impedido: desvantagem em ataques e salvaguardas de Destreza.');
          sugerirDesvantagem = true;
        }
        break;
      case 'Invisível':
        if (ehAtaque) {
          avisos.push('Invisível: vantagem nas suas jogadas de ataque.');
          sugerirVantagem = true;
        }
        break;
      case 'Paralisado':
      case 'Inconsciente':
      case 'Atordoado':
      case 'Petrificado':
        avisos.push(
          `${cond}: personagem incapacitado${ehTrForDes ? ' (falha automática em TR de Força/Destreza)' : ''}.`,
        );
        break;
      case 'Surdo':
        if (!ehAtaque && !ehSalvaguarda) {
          avisos.push('Surdo: falha automática em testes que dependam de audição.');
        }
        break;
    }
  }

  return { avisos, sugerirDesvantagem, sugerirVantagem };
}

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

  const alertaCondicoes = useMemo(
    () => avaliarAlertasCondicoes(ficha, ultima),
    [ficha, ultima],
  );

  const rolarTesteConcentracao = () => {
    if (!ficha || !alertaConcentracao) return;
    const bonusCon = bonusSalvaguarda(ficha, 'con');
    rolarD20(`TR Constituição (Concentração CD ${alertaConcentracao.cd})`, bonusCon);
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

      {/* Modal centralizado de Resultado da Rolagem + Alertas de Condição */}
      <Modal
        visible={!!ultima && !bandejaAberta}
        transparent
        animationType="fade"
        onRequestClose={fecharBanner}>
        <Pressable style={styles.resultOverlay} onPress={fecharBanner}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.resultCard,
              { backgroundColor: t.backgroundElement, borderColor: corResultado },
            ]}>
            {ultima ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <MaterialCommunityIcons name="dice-d20" size={22} color={corResultado} />
                    <Txt bold numberOfLines={2} style={{ fontSize: 17, flex: 1 }}>
                      {ultima.titulo}
                    </Txt>
                  </View>
                  <IconButton name="close" size={22} onPress={fecharBanner} />
                </View>

                {ultima.critico ? (
                  <View
                    style={[
                      styles.critBadge,
                      {
                        backgroundColor:
                          ultima.critico === 'sucesso' ? t.success : t.danger,
                      },
                    ]}>
                    <Ionicons
                      name={ultima.critico === 'sucesso' ? 'sparkles' : 'warning'}
                      size={14}
                      color="#fff"
                    />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                      {ultima.critico === 'sucesso' ? 'ACERTO CRÍTICO (20 NATURAL)' : 'FALHA CRÍTICA (1 NATURAL)'}
                    </Text>
                  </View>
                ) : null}

                <View style={[styles.resultHero, { backgroundColor: t.background, borderColor: t.border }]}>
                  <View style={[styles.totalBoxLarge, { backgroundColor: corResultado }]}>
                    <Text style={{ color: '#fff', fontSize: 38, fontWeight: '900' }}>
                      {ultima.total}
                    </Text>
                  </View>

                  <View style={{ flex: 1, gap: 6 }}>
                    <Label style={{ marginBottom: 0, textTransform: 'none', fontSize: 13 }}>
                      Fórmula: {ultima.formula}
                      {ultima.modo !== 'normal' ? ` (${ultima.modo})` : ''}
                    </Label>
                    <View style={styles.diceChipsRow}>
                      {ultima.dados.map((d, idx) => {
                        const descartado =
                          ultima.modo !== 'normal' &&
                          ultima.dadoEscolhido !== undefined &&
                          d !== ultima.dadoEscolhido;
                        return (
                          <View
                            key={idx}
                            style={[
                              styles.dieChip,
                              {
                                borderColor: descartado ? t.border : corResultado,
                                backgroundColor: descartado ? 'transparent' : t.backgroundElement,
                                opacity: descartado ? 0.45 : 1,
                              },
                            ]}>
                            <Txt
                              bold
                              style={{
                                fontSize: 14,
                                textDecorationLine: descartado ? 'line-through' : 'none',
                              }}>
                              {d}
                            </Txt>
                          </View>
                        );
                      })}
                      {ultima.bonus !== 0 ? (
                        <Txt bold style={{ fontSize: 15, color: t.textSecondary, alignSelf: 'center' }}>
                          {fmt(ultima.bonus)}
                        </Txt>
                      ) : null}
                    </View>
                  </View>
                </View>

                {alertaCondicoes.avisos.length > 0 ? (
                  <View
                    style={[
                      styles.condAlertBox,
                      { borderColor: '#D97706', backgroundColor: t.background },
                    ]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="alert-circle" size={16} color="#D97706" />
                      <Txt bold style={{ color: '#D97706', fontSize: 13 }}>
                        Condições Ativas na Ficha
                      </Txt>
                    </View>
                    {alertaCondicoes.avisos.map((aviso, i) => (
                      <Txt key={i} style={{ fontSize: 12, lineHeight: 17, color: t.text }}>
                        • {aviso}
                      </Txt>
                    ))}
                  </View>
                ) : null}

                <View style={styles.resultActions}>
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
                          styles.actionChip,
                          {
                            borderColor: t.success,
                            backgroundColor:
                              ultima.modo === 'vantagem' || alertaCondicoes.sugerirVantagem
                                ? t.success
                                : 'transparent',
                          },
                        ]}>
                        <Ionicons
                          name="arrow-up-circle"
                          size={15}
                          color={
                            ultima.modo === 'vantagem' || alertaCondicoes.sugerirVantagem
                              ? '#fff'
                              : t.success
                          }
                        />
                        <Text
                          style={{
                            color:
                              ultima.modo === 'vantagem' || alertaCondicoes.sugerirVantagem
                                ? '#fff'
                                : t.success,
                            fontWeight: '700',
                            fontSize: 13,
                          }}>
                          Vantagem
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          rolarD20(ultima.titulo, ultima.bonus, 'desvantagem', {
                            danoFormula: ultima.danoFormula,
                            tipoDano: ultima.tipoDano,
                          })
                        }
                        style={[
                          styles.actionChip,
                          {
                            borderColor: t.danger,
                            backgroundColor:
                              ultima.modo === 'desvantagem' || alertaCondicoes.sugerirDesvantagem
                                ? t.danger
                                : 'transparent',
                          },
                        ]}>
                        <Ionicons
                          name="arrow-down-circle"
                          size={15}
                          color={
                            ultima.modo === 'desvantagem' || alertaCondicoes.sugerirDesvantagem
                              ? '#fff'
                              : t.danger
                          }
                        />
                        <Text
                          style={{
                            color:
                              ultima.modo === 'desvantagem' || alertaCondicoes.sugerirDesvantagem
                                ? '#fff'
                                : t.danger,
                            fontWeight: '700',
                            fontSize: 13,
                          }}>
                          Desvantagem
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          rolarD20(ultima.titulo, ultima.bonus, ultima.modo, {
                            danoFormula: ultima.danoFormula,
                            tipoDano: ultima.tipoDano,
                          })
                        }
                        style={[styles.actionChip, { borderColor: t.border }]}>
                        <Ionicons name="refresh" size={15} color={t.text} />
                        <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>
                          Rolar de novo
                        </Text>
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
                      style={[
                        styles.actionChip,
                        { backgroundColor: t.primary, borderColor: t.primary, width: '100%', justifyContent: 'center' },
                      ]}>
                      <Ionicons name="flame" size={16} color={t.onPrimary} />
                      <Text style={{ color: t.onPrimary, fontWeight: '800', fontSize: 14 }}>
                        {ultima.critico === 'sucesso'
                          ? `Rolar Dano Crítico (2x ${ultima.danoFormula})`
                          : `Rolar Dano (${ultima.danoFormula})`}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.resultFooter}>
                  <Pressable
                    onPress={() => setBandejaAberta(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 }}>
                    <Ionicons name="time-outline" size={16} color={t.primary} />
                    <Txt bold style={{ color: t.primary, fontSize: 13 }}>
                      Abrir Bandeja e Histórico
                    </Txt>
                  </Pressable>
                  <Button title="Fechar" variant="ghost" onPress={fecharBanner} />
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

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

            {ultima ? (
              <View style={[styles.trayLastBox, { backgroundColor: t.background, borderColor: corResultado }]}>
                <View style={[styles.totalBox, { backgroundColor: corResultado }]}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{ultima.total}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt bold numberOfLines={1} style={{ fontSize: 14 }}>{ultima.titulo}</Txt>
                  <Label style={{ marginBottom: 0, textTransform: 'none' }}>
                    {ultima.formula} · Dados: [{ultima.dados.join(', ')}]
                  </Label>
                </View>
              </View>
            ) : null}

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
                          {h.formula} · [{h.dados.join(', ')}]
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
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 2,
    padding: 18,
    gap: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  critBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  resultHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  totalBoxLarge: {
    minWidth: 74,
    height: 74,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  diceChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dieChip: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  condAlertBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  resultActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  trayLastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  totalBox: {
    minWidth: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
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
