import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, IconButton, Label, SectionTitle, Txt } from '@/components/ficha-ui';
import { TutorialTarget } from '@/components/TutorialTarget';
import { DesktopBreakpoint, MaxContentWidth, MaxDesktopWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useDiceStore } from '@/store/useDiceStore';
import {
  confirmarExclusaoFicha,
  serializarFichaJson,
  useFichasListStore,
} from '@/store/useFichasListStore';
import { Ficha } from '@/types/ficha';
import { cdMagia, fmt, iniciativa, intuicaoPassiva, percepcaoPassiva } from '@/utils/calc';

type Item = { header: string } | { ficha: Ficha; compartilhada: boolean };

function EscudoMestreCard({ ficha }: { ficha: Ficha }) {
  const t = useTheme();
  const razao = ficha.pv.total > 0 ? ficha.pv.atual / ficha.pv.total : 0;
  const corPv = razao <= 0.25 ? t.danger : razao <= 0.5 ? '#F59E0B' : t.success;
  const cd = cdMagia(ficha);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: ficha.id } })}
      style={[styles.dmCard, { backgroundColor: t.backgroundElement, borderColor: t.border }]}>
      <View style={styles.dmHead}>
        <View style={{ flex: 1 }}>
          <Txt bold style={{ fontSize: 16 }} numberOfLines={1}>
            {ficha.titulo || 'Sem nome'}
          </Txt>
          <Label style={{ marginBottom: 0 }}>
            {[ficha.raca, ficha.classe, `Nv ${ficha.nivel}`].filter(Boolean).join(' · ')}
          </Label>
        </View>
        {ficha.inspiracao ? <Ionicons name="star" size={16} color="#D4AF37" /> : null}
      </View>

      {/* Barra de PV */}
      <View style={{ marginVertical: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Label style={{ marginBottom: 0 }}>PV</Label>
          <Text style={{ color: corPv, fontWeight: '800', fontSize: 14 }}>
            {ficha.pv.atual}/{ficha.pv.total}
            {ficha.pv.temp > 0 ? ` (+${ficha.pv.temp})` : ''}
          </Text>
        </View>
        <View style={[styles.dmBar, { backgroundColor: t.backgroundSelected }]}>
          <View style={{ width: `${Math.min(100, razao * 100)}%`, height: '100%', backgroundColor: corPv }} />
        </View>
      </View>

      {/* Estatísticas rápidas do Escudo do Mestre */}
      <View style={styles.dmStatsGrid}>
        <View style={[styles.dmStatBox, { borderColor: t.border }]}>
          <Txt bold>{ficha.ca}</Txt>
          <Label style={{ marginBottom: 0, fontSize: 9 }}>CA</Label>
        </View>
        <View style={[styles.dmStatBox, { borderColor: t.border }]}>
          <Txt bold>{fmt(iniciativa(ficha))}</Txt>
          <Label style={{ marginBottom: 0, fontSize: 9 }}>Inic.</Label>
        </View>
        <View style={[styles.dmStatBox, { borderColor: t.border }]}>
          <Txt bold>{percepcaoPassiva(ficha)}</Txt>
          <Label style={{ marginBottom: 0, fontSize: 9 }}>Percep. P.</Label>
        </View>
        <View style={[styles.dmStatBox, { borderColor: t.border }]}>
          <Txt bold>{intuicaoPassiva(ficha)}</Txt>
          <Label style={{ marginBottom: 0, fontSize: 9 }}>Intui. P.</Label>
        </View>
        {cd > 0 ? (
          <View style={[styles.dmStatBox, { borderColor: t.border }]}>
            <Txt bold>{cd}</Txt>
            <Label style={{ marginBottom: 0, fontSize: 9 }}>CD Magia</Label>
          </View>
        ) : null}
      </View>

      {ficha.concentrando ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Ionicons name="flash" size={13} color={t.primary} />
          <Text style={{ color: t.primary, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
            Conc: {ficha.concentrando}
          </Text>
        </View>
      ) : null}
      {(ficha.condicoes?.length ?? 0) > 0 || (ficha.exaustao ?? 0) > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Ionicons name="warning-outline" size={13} color={t.danger} />
          <Text style={{ color: t.danger, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
            {[...(ficha.condicoes ?? []), (ficha.exaustao ?? 0) > 0 ? `Exaustão ${ficha.exaustao}` : ''].filter(Boolean).join(', ')}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function FichasScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DesktopBreakpoint;
  const user = useAuthStore((s) => s.user)!;
  const { minhas, compartilhadas, loading, error, start, stop, remover, duplicar, importarJson } =
    useFichasListStore();
  const {
    codigoMesa,
    dadosMesa,
    conectarMesa,
    desconectarMesa,
    adicionarIniciativaManual,
    avancarTurnoMesa,
    limparIniciativasMesa,
  } = useDiceStore();

  const [modoEscudoMestre, setModoEscudoMestre] = useState(false);
  const [inputMesa, setInputMesa] = useState(codigoMesa ?? '');
  const [nomeInimigo, setNomeInimigo] = useState('');
  const [iniInimigo, setIniInimigo] = useState('12');
  const [modalMode, setModalMode] = useState<'import' | 'export' | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [exportTitle, setExportTitle] = useState('');

  useEffect(() => {
    start(user.uid, user.email ?? '');
    return stop;
  }, [user.uid, user.email, start, stop]);

  const pedirExclusao = (id: string) => {
    confirmarExclusaoFicha(async () => {
      try {
        await remover(id);
      } catch (e) {
        Alert.alert('Erro ao excluir', (e as Error).message);
      }
    });
  };

  const abrirExport = (ficha: Ficha) => {
    setExportTitle(ficha.titulo || 'Ficha');
    setJsonText(serializarFichaJson(ficha));
    setModalMode('export');
  };

  const compartilharExport = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(jsonText);
      window.alert('JSON copiado para a área de transferência!');
      return;
    }
    await Share.share({
      title: `${exportTitle}.json`,
      message: jsonText,
    }).catch(() => {});
  };

  const confirmarImport = async () => {
    try {
      const novoId = await importarJson(user.uid, user.email ?? '', jsonText);
      setModalMode(null);
      setJsonText('');
      router.push({ pathname: '/ficha/[id]', params: { id: novoId } });
    } catch (e) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert((e as Error).message);
      } else {
        Alert.alert('Erro ao importar', (e as Error).message);
      }
    }
  };

  const data: Item[] = [
    { header: 'Minhas fichas' },
    ...minhas.map((ficha) => ({ ficha, compartilhada: false })),
    ...(compartilhadas.length ? [{ header: 'Compartilhadas comigo (leitura)' }] : []),
    ...compartilhadas.map((ficha) => ({ ficha, compartilhada: true })),
  ];

  const todasFichasGrupo = [...compartilhadas, ...minhas];

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: t.background }]}>
      <View style={[styles.container, { maxWidth: isDesktop ? MaxDesktopWidth : MaxContentWidth }]}>
        {/* Editorial Hero Header (Estilo Demiplane) */}
        <View
          style={[
            styles.heroBar,
            {
              backgroundColor: t.backgroundElement,
              borderColor: t.border,
              borderTopColor: t.primary,
            },
          ]}>
          <View style={isDesktop ? styles.heroRowDesktop : styles.heroColMobile}>
            <View style={{ flex: 1 }}>
              <Label style={{ color: t.primary, marginBottom: 2 }}>GRIMORIO DE PERSONAGENS</Label>
              <Txt bold style={{ fontSize: isDesktop ? 22 : 18 }}>
                Minhas Fichas e Campanhas
              </Txt>
            </View>
            <TutorialTarget id="fichas-nova" style={styles.heroActions}>
              <Button title="Nova Ficha" icon="add-circle-outline" onPress={() => router.push('/nova-ficha')} />
              <Button
                title="Importar"
                icon="code-slash-outline"
                variant="ghost"
                onPress={() => {
                  setJsonText('');
                  setModalMode('import');
                }}
              />
              <Pressable
                onPress={() => setModoEscudoMestre((v) => !v)}
                style={[
                  styles.dmToggle,
                  {
                    borderColor: t.primary,
                    backgroundColor: modoEscudoMestre ? t.primary : 'transparent',
                  },
                ]}>
                <Ionicons
                  name="shield-half"
                  size={18}
                  color={modoEscudoMestre ? t.onPrimary : t.primary}
                />
                <Text
                  style={{
                    color: modoEscudoMestre ? t.onPrimary : t.primary,
                    fontWeight: '800',
                    fontSize: 13,
                  }}>
                  Mestre
                </Text>
              </Pressable>
            </TutorialTarget>
          </View>
        </View>

        {error ? <Txt style={{ color: t.danger, padding: 12 }}>{error}</Txt> : null}
        {loading ? (
          <ActivityIndicator color={t.primary} style={{ marginTop: 32 }} />
        ) : modoEscudoMestre ? (
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 16 }}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <MaterialCommunityIcons name="dice-d20" size={16} color={t.primary} />
                <Text style={{ color: t.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
                  SALA DE MESA AO VIVO (INICIATIVA E FEED DO GRUPO)
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={codigoMesa ?? inputMesa}
                  editable={!codigoMesa}
                  onChangeText={setInputMesa}
                  placeholder="Código da Sala (ex.: MESA-D20)"
                  placeholderTextColor={t.textSecondary}
                  autoCapitalize="characters"
                  style={[styles.mesaInput, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
                />
                {codigoMesa ? (
                  <Button title="Desconectar" variant="ghost" onPress={desconectarMesa} />
                ) : (
                  <Button
                    title="Abrir Sala"
                    onPress={() => conectarMesa(inputMesa)}
                    disabled={!inputMesa.trim()}
                  />
                )}
              </View>

              {codigoMesa && dadosMesa ? (
                <View style={{ marginTop: 12, gap: 10 }}>
                  <SectionTitle
                    right={
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <Pressable
                          onPress={avancarTurnoMesa}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ color: t.primary, fontWeight: '800', fontSize: 13 }}>
                            Próximo Turno
                          </Text>
                          <Ionicons name="arrow-forward" size={14} color={t.primary} />
                        </Pressable>
                        <Pressable onPress={limparIniciativasMesa}>
                          <Label style={{ marginBottom: 0 }}>Limpar</Label>
                        </Pressable>
                      </View>
                    }>
                    Ordem de Iniciativa ({dadosMesa.iniciativas.length})
                  </SectionTitle>

                  {dadosMesa.iniciativas.length === 0 ? (
                    <Label>
                      Quando os jogadores clicarem em &quot;Rolar Iniciativa&quot; na ficha (conectados na sala {codigoMesa}), eles entram aqui automaticamente!
                    </Label>
                  ) : (
                    <View style={{ gap: 6 }}>
                      {dadosMesa.iniciativas.map((item, idx) => {
                        const ativo = idx === dadosMesa.turnoIdx;
                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.iniRow,
                              {
                                borderColor: ativo ? t.primary : t.border,
                                backgroundColor: ativo ? t.backgroundSelected : t.background,
                              },
                            ]}>
                            <Txt bold style={{ color: t.primary, width: 32 }}>
                              {item.valor}
                            </Txt>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {ativo ? <Ionicons name="play" size={13} color={t.primary} /> : null}
                              <Txt bold={ativo}>{item.nome}</Txt>
                            </View>
                            {ativo ? <Label style={{ marginBottom: 0, color: t.primary }}>Turno Atual</Label> : null}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TextInput
                      value={nomeInimigo}
                      onChangeText={setNomeInimigo}
                      placeholder="Adicionar monstro/NPC..."
                      placeholderTextColor={t.textSecondary}
                      style={[styles.mesaInput, { borderColor: t.border, backgroundColor: t.input, color: t.text, flex: 2 }]}
                    />
                    <TextInput
                      value={iniInimigo}
                      onChangeText={setIniInimigo}
                      keyboardType="numbers-and-punctuation"
                      placeholder="Inic."
                      placeholderTextColor={t.textSecondary}
                      style={[styles.mesaInput, { borderColor: t.border, backgroundColor: t.input, color: t.text, width: 64, textAlign: 'center' }]}
                    />
                    <Button
                      title="+ Fila"
                      onPress={() => {
                        void adicionarIniciativaManual(nomeInimigo, parseInt(iniInimigo, 10) || 10);
                        setNomeInimigo('');
                      }}
                      disabled={!nomeInimigo.trim()}
                    />
                  </View>
                </View>
              ) : null}
            </Card>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Ionicons name="shield-half" size={15} color={t.primary} />
              <Text style={{ color: t.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
                ESCUDO DO MESTRE - VISÃO DE GRUPO EM TEMPO REAL
              </Text>
            </View>
            <Label style={{ marginBottom: 10 }}>
              Acompanhe PV, CA, Percepção/Intuição Passiva, CD de Magia, Concentração e Condições de todos os personagens:
            </Label>
            {todasFichasGrupo.length === 0 ? <Label>Nenhuma ficha disponível.</Label> : null}
            <View style={styles.dmGrid}>
              {todasFichasGrupo.map((f) => (
                <EscudoMestreCard key={f.id} ficha={f} />
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            key={isDesktop ? 'grid-2' : 'list-1'}
            data={data}
            numColumns={isDesktop ? 1 : 1}
            keyExtractor={(i, idx) => ('header' in i ? `h${idx}` : i.ficha.id)}
            contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 16 }}
            ListEmptyComponent={<Label>Nenhuma ficha ainda.</Label>}
            renderItem={({ item }) =>
              'header' in item ? (
                <SectionTitle>{item.header}</SectionTitle>
              ) : (
                <Pressable
                  onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: item.ficha.id } })}
                  onLongPress={() => {
                    if (!item.compartilhada) pedirExclusao(item.ficha.id);
                  }}>
                  <Card accent={!item.compartilhada} style={styles.card}>
                    <View style={[styles.initialsBadge, { backgroundColor: t.backgroundSelected, borderColor: t.primary }]}>
                      <Text style={{ color: t.primary, fontWeight: '900', fontSize: 15 }}>
                        {(item.ficha.titulo || 'SN').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Txt bold style={{ fontSize: 17 }}>{item.ficha.titulo || 'Sem nome'}</Txt>
                        <View style={[styles.lvlPill, { backgroundColor: t.backgroundSelected, borderColor: t.primary }]}>
                          <Text style={{ color: t.primary, fontSize: 11, fontWeight: '800' }}>
                            Nv {item.ficha.nivel}
                          </Text>
                        </View>
                      </View>
                      <Label style={{ marginBottom: 0 }}>
                        {[item.ficha.raca, item.ficha.classe].filter(Boolean).join(' · ')}
                        {item.compartilhada ? ` · de ${item.ficha.ownerEmail}` : ''}
                      </Label>
                      <View style={[styles.hpMiniTrack, { backgroundColor: t.backgroundSelected }]}>
                        <View
                          style={{
                            width: `${Math.min(100, item.ficha.pv.total > 0 ? (item.ficha.pv.atual / item.ficha.pv.total) * 100 : 0)}%`,
                            height: '100%',
                            backgroundColor: t.success,
                          }}
                        />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Txt bold style={{ color: t.success, fontSize: 14 }}>
                        {item.ficha.pv.atual}/{item.ficha.pv.total} PV
                      </Txt>
                      <Label style={{ marginBottom: 0 }}>CA {item.ficha.ca}</Label>
                    </View>
                    <IconButton
                      name="copy-outline"
                      size={19}
                      color={t.textSecondary}
                      onPress={() => void duplicar(item.ficha, user.uid, user.email ?? '')}
                    />
                    <IconButton
                      name="code-slash-outline"
                      size={20}
                      color={t.textSecondary}
                      onPress={() => abrirExport(item.ficha)}
                    />
                    {!item.compartilhada ? (
                      <IconButton
                        name="trash-outline"
                        size={20}
                        color={t.danger}
                        onPress={() => pedirExclusao(item.ficha.id)}
                      />
                    ) : null}
                    <Ionicons name="chevron-forward" size={18} color={t.textSecondary} />
                  </Card>
                </Pressable>
              )
            }
          />
        )}
      </View>

      <Modal
        visible={modalMode !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModalMode(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.backgroundElement, borderColor: t.border }]}>
            <SectionTitle>
              {modalMode === 'export' ? `Exportar JSON - ${exportTitle}` : 'Importar Ficha (JSON)'}
            </SectionTitle>
            <Label>
              {modalMode === 'export'
                ? 'Copie ou compartilhe o JSON abaixo para salvar backup ou enviar para outro dispositivo:'
                : 'Cole abaixo o conteúdo JSON de uma ficha exportada:'}
            </Label>
            <TextInput
              value={jsonText}
              onChangeText={setJsonText}
              editable={modalMode === 'import'}
              selectTextOnFocus
              multiline
              placeholder='{"titulo": "Thorin", ...}'
              placeholderTextColor={t.textSecondary}
              style={[styles.jsonBox, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button title="Fechar" variant="ghost" onPress={() => setModalMode(null)} />
              </View>
              <View style={{ flex: 1 }}>
                {modalMode === 'export' ? (
                  <Button
                    title={Platform.OS === 'web' ? 'Copiar JSON' : 'Compartilhar'}
                    onPress={compartilharExport}
                  />
                ) : (
                  <Button title="Importar" onPress={confirmarImport} disabled={!jsonText.trim()} />
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  heroBar: {
    margin: 12,
    marginBottom: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderTopWidth: 3,
  },
  heroRowDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  heroColMobile: { gap: 12 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  initialsBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lvlPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  hpMiniTrack: { height: 5, borderRadius: 3, overflow: 'hidden', maxWidth: 200, marginTop: 2 },
  dmToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dmGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dmCard: { width: '48%', flexGrow: 1, minWidth: 250, borderWidth: 1.5, borderRadius: 14, padding: 12 },
  dmHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dmBar: { height: 7, borderRadius: 4, overflow: 'hidden' },
  dmStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  dmStatBox: { flex: 1, minWidth: 44, borderWidth: 1, borderRadius: 8, paddingVertical: 4, alignItems: 'center' },
  mesaInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  iniRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 18 },
  modalCard: { width: '100%', maxWidth: 520, alignSelf: 'center', borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  jsonBox: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 12, height: 220, textAlignVertical: 'top' },
});
