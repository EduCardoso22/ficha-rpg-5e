import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Label, NumInput, SectionTitle, Txt } from '@/components/ficha-ui';
import { Selector } from '@/components/selector';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  Background5e,
  Class5e,
  Race5e,
  bonusRacialFixo,
  deslocamentoEmMetros,
  listarAntecedentes,
  listarClasses,
  listarRacas,
  textoBonusRacial,
} from '@/services/5etools';
import { useAuthStore } from '@/store/useAuthStore';
import { useFichaStore } from '@/store/useFichaStore';
import { ATRIBUTOS, ATRIBUTO_NOMES, AtributoKey } from '@/types/ficha';
import { fmt, modificador } from '@/utils/calc';
import { ARRAY_PADRAO, aplicarArrayPadrao, atributoDe5etools } from '@/utils/montarFicha';

const PASSOS = ['Identidade', 'Raça e Classe', 'Atributos'];

export default function NovaFichaScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user)!;
  const criar = useFichaStore((s) => s.criar);

  const [passo, setPasso] = useState(0);
  const [nomePersonagem, setNomePersonagem] = useState('');
  const [nomeJogador, setNomeJogador] = useState('');
  const [raca, setRaca] = useState<Race5e | null>(null);
  const [classe, setClasse] = useState<Class5e | null>(null);
  const [antecedente, setAntecedente] = useState<Background5e | null>(null);
  const [aplicarBonusRacial, setAplicarBonusRacial] = useState(true);

  // Modo Homebrew
  const [usarHomebrew, setUsarHomebrew] = useState(false);
  const [racaCustom, setRacaCustom] = useState('');
  const [classeCustom, setClasseCustom] = useState('');
  const [facesCustom, setFacesCustom] = useState(8);
  const [habConjCustom, setHabConjCustom] = useState<AtributoKey | ''>('');
  const [antecedenteCustom, setAntecedenteCustom] = useState('');

  // Modo de atributos: 'padrao' (Standard Array 15,14,13,12,10,8) ou 'livre'
  const [modoAtributos, setModoAtributos] = useState<'padrao' | 'livre'>('padrao');
  const [atributos, setAtributos] = useState<Record<AtributoKey, number>>(aplicarArrayPadrao);
  const [salvando, setSalvando] = useState(false);

  const [racas, setRacas] = useState<Race5e[] | null>(null);
  const [classes, setClasses] = useState<Class5e[] | null>(null);
  const [antecedentes, setAntecedentes] = useState<Background5e[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    Promise.all([listarRacas(), listarClasses(), listarAntecedentes().catch(() => [])])
      .then(([r, c, b]) => {
        if (!vivo) return;
        setRacas(r);
        setClasses(c);
        setAntecedentes(b);
      })
      .catch((e: Error) => vivo && setErro(e.message));
    return () => {
      vivo = false;
    };
  }, [tentativa]);

  const tentarDeNovo = () => {
    setErro(null);
    setTentativa((n) => n + 1);
  };
  const carregando = !erro && (!racas || !classes);

  const temRaca = usarHomebrew ? racaCustom.trim().length > 0 : !!raca;
  const temClasse = usarHomebrew ? classeCustom.trim().length > 0 : !!classe;
  const podeAvancar =
    passo === 0
      ? nomePersonagem.trim().length > 0 && nomeJogador.trim().length > 0
      : passo === 1
        ? temRaca && temClasse
        : true;

  /** No Modo Padrão, atribuir um valor de ARRAY_PADRAO a um atributo troca com o atributo que já o tinha. */
  const escolherValorPadrao = (attr: AtributoKey, novoValor: number) => {
    setAtributos((atual) => {
      const outro = ATRIBUTOS.find((k) => k !== attr && atual[k] === novoValor);
      if (!outro) return { ...atual, [attr]: novoValor };
      return { ...atual, [outro]: atual[attr], [attr]: novoValor };
    });
  };

  const finalizar = async () => {
    setSalvando(true);
    try {
      const id = await criar(user.uid, user.email ?? '', {
        nomePersonagem,
        nomeJogador,
        raca: usarHomebrew ? null : raca,
        classe: usarHomebrew ? null : classe,
        antecedente: usarHomebrew ? null : antecedente,
        atributos,
        aplicarBonusRacial: !usarHomebrew && aplicarBonusRacial,
        racaCustom: usarHomebrew ? racaCustom : undefined,
        classeCustom: usarHomebrew ? classeCustom : undefined,
        facesCustom: usarHomebrew ? facesCustom : undefined,
        habilidadeConjCustom: usarHomebrew ? habConjCustom : undefined,
        antecedenteCustom: usarHomebrew ? antecedenteCustom : undefined,
      });
      router.replace({ pathname: '/ficha/[id]', params: { id } });
    } catch (e) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Erro ao criar personagem: ${(e as Error).message}`);
      } else {
        Alert.alert('Erro ao criar personagem', (e as Error).message);
      }
      setSalvando(false);
    }
  };

  const input = [styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }];
  const habilidade = usarHomebrew ? habConjCustom : atributoDe5etools(classe?.spellcastingAbility);
  const bonusRaca = !usarHomebrew && aplicarBonusRacial ? bonusRacialFixo(raca ?? undefined) : {};

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.steps}>
          {PASSOS.map((p, i) => (
            <View key={p} style={{ flex: 1, alignItems: 'center' }}>
              <View style={[styles.bar, { backgroundColor: i <= passo ? t.primary : t.border }]} />
              <Label style={{ marginTop: 4, marginBottom: 0, color: i === passo ? t.text : t.textSecondary }}>
                {i + 1}. {p}
              </Label>
            </View>
          ))}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
          {passo === 0 ? (
            <Card>
              <SectionTitle>Identidade</SectionTitle>
              <Label>Nome do personagem</Label>
              <TextInput
                style={[input, { marginBottom: 12 }]}
                value={nomePersonagem}
                onChangeText={setNomePersonagem}
                placeholder="Ex.: Thorin Escudo de Carvalho"
                placeholderTextColor={t.textSecondary}
              />
              <Label>Nome do jogador</Label>
              <TextInput
                style={input}
                value={nomeJogador}
                onChangeText={setNomeJogador}
                placeholder="Seu nome"
                placeholderTextColor={t.textSecondary}
              />
            </Card>
          ) : null}

          {passo === 1 ? (
            <Card>
              <SectionTitle>Raça, Classe e Antecedente</SectionTitle>
              <View style={[styles.modeRow, { marginBottom: 12 }]}>
                <Pressable
                  onPress={() => setUsarHomebrew(false)}
                  style={[
                    styles.modePill,
                    { borderColor: t.primary, backgroundColor: !usarHomebrew ? t.primary : 'transparent' },
                  ]}>
                  <Txt bold style={{ color: !usarHomebrew ? t.onPrimary : t.text, fontSize: 13 }}>
                    Oficial (5etools)
                  </Txt>
                </Pressable>
                <Pressable
                  onPress={() => setUsarHomebrew(true)}
                  style={[
                    styles.modePill,
                    { borderColor: t.primary, backgroundColor: usarHomebrew ? t.primary : 'transparent' },
                  ]}>
                  <Txt bold style={{ color: usarHomebrew ? t.onPrimary : t.text, fontSize: 13 }}>
                    Homebrew / Custom
                  </Txt>
                </Pressable>
              </View>

              {!usarHomebrew ? (
                <>
                  <Selector<Race5e>
                    label="Raça"
                    placeholder="Selecione a raça"
                    items={racas}
                    loading={carregando}
                    error={erro}
                    onRetry={tentarDeNovo}
                    value={raca}
                    onChange={setRaca}
                    getKey={(r) => `${r.name}|${r.source}`}
                    getLabel={(r) => r.name}
                    getSub={(r) => `${r.source} · desloc. ${deslocamentoEmMetros(r)} m · ${textoBonusRacial(r)}`}
                  />
                  {raca ? (
                    <Pressable
                      onPress={() => setAplicarBonusRacial((v) => !v)}
                      style={[styles.info, { borderColor: t.border, marginBottom: 12 }]}>
                      <Txt>
                        Bônus Racial: <Txt bold>{textoBonusRacial(raca)}</Txt>
                      </Txt>
                      <Txt style={{ color: aplicarBonusRacial ? t.primary : t.textSecondary, fontSize: 13 }}>
                        {aplicarBonusRacial
                          ? '[Ativo] Bônus raciais fixos serão somados automaticamente'
                          : '[Inativo] Bônus raciais não serão somados automaticamente'}
                      </Txt>
                    </Pressable>
                  ) : null}

                  <Selector<Class5e>
                    label="Classe"
                    placeholder="Selecione a classe"
                    items={classes}
                    loading={carregando}
                    value={classe}
                    onChange={setClasse}
                    getKey={(c) => `${c.name}|${c.source}`}
                    getLabel={(c) => c.name}
                    getSub={(c) => `${c.source} · d${c.hd?.faces ?? '?'}`}
                  />

                  <Selector<Background5e>
                    label="Antecedente (Opcional)"
                    placeholder="Selecione o antecedente (Background)"
                    items={antecedentes}
                    loading={!antecedentes}
                    value={antecedente}
                    onChange={setAntecedente}
                    getKey={(b) => `${b.name}|${b.source}`}
                    getLabel={(b) => b.name}
                    getSub={(b) => b.source}
                  />
                </>
              ) : (
                <View style={{ gap: 10, marginBottom: 12 }}>
                  <View>
                    <Label>Raça Homebrew</Label>
                    <TextInput
                      style={input}
                      value={racaCustom}
                      onChangeText={setRacaCustom}
                      placeholder="Ex.: Meio-Dragão"
                      placeholderTextColor={t.textSecondary}
                    />
                  </View>
                  <View>
                    <Label>Classe Homebrew</Label>
                    <TextInput
                      style={input}
                      value={classeCustom}
                      onChangeText={setClasseCustom}
                      placeholder="Ex.: Caçador de Sangue"
                      placeholderTextColor={t.textSecondary}
                    />
                  </View>
                  <View>
                    <Label>Dado de Vida da Classe</Label>
                    <View style={styles.modeRow}>
                      {[6, 8, 10, 12].map((d) => (
                        <Pressable
                          key={d}
                          onPress={() => setFacesCustom(d)}
                          style={[
                            styles.modePill,
                            { borderColor: t.primary, backgroundColor: facesCustom === d ? t.primary : 'transparent' },
                          ]}>
                          <Txt bold style={{ color: facesCustom === d ? t.onPrimary : t.text }}>d{d}</Txt>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View>
                    <Label>Habilidade de Conjuração (se houver)</Label>
                    <View style={styles.modeRow}>
                      {(['', 'int', 'sab', 'car'] as const).map((h) => (
                        <Pressable
                          key={h || 'none'}
                          onPress={() => setHabConjCustom(h)}
                          style={[
                            styles.modePill,
                            { borderColor: t.primary, backgroundColor: habConjCustom === h ? t.primary : 'transparent' },
                          ]}>
                          <Txt bold style={{ color: habConjCustom === h ? t.onPrimary : t.text, fontSize: 12 }}>
                            {h ? ATRIBUTO_NOMES[h] : 'Nenhuma'}
                          </Txt>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View>
                    <Label>Antecedente (Opcional)</Label>
                    <TextInput
                      style={input}
                      value={antecedenteCustom}
                      onChangeText={setAntecedenteCustom}
                      placeholder="Ex.: Nobre Exilado"
                      placeholderTextColor={t.textSecondary}
                    />
                  </View>
                </View>
              )}

              {classe && !usarHomebrew ? (
                <View style={[styles.info, { borderColor: t.border }]}>
                  <Txt>
                    Dado de Vida: <Txt bold>d{classe.hd?.faces ?? '?'}</Txt>
                  </Txt>
                  <Txt>
                    Habilidade de conjuração:{' '}
                    <Txt bold>{habilidade ? ATRIBUTO_NOMES[habilidade] : 'nenhuma'}</Txt>
                  </Txt>
                  <Txt>
                    Testes de resistência:{' '}
                    <Txt bold>
                      {(classe.proficiency ?? [])
                        .map((p) => ATRIBUTO_NOMES[atributoDe5etools(p) as AtributoKey])
                        .join(', ') || '-'}
                    </Txt>
                  </Txt>
                </View>
              ) : null}
            </Card>
          ) : null}

          {passo === 2 ? (
            <Card>
              <SectionTitle>Atributos Base</SectionTitle>
              <View style={[styles.modeRow, { marginBottom: 12 }]}>
                <Pressable
                  onPress={() => {
                    setModoAtributos('padrao');
                    setAtributos(aplicarArrayPadrao());
                  }}
                  style={[
                    styles.modePill,
                    { borderColor: t.primary, backgroundColor: modoAtributos === 'padrao' ? t.primary : 'transparent' },
                  ]}>
                  <Txt bold style={{ color: modoAtributos === 'padrao' ? t.onPrimary : t.text, fontSize: 13 }}>
                    Pré-definidos (15,14,13,12,10,8)
                  </Txt>
                </Pressable>
                <Pressable
                  onPress={() => setModoAtributos('livre')}
                  style={[
                    styles.modePill,
                    { borderColor: t.primary, backgroundColor: modoAtributos === 'livre' ? t.primary : 'transparent' },
                  ]}>
                  <Txt bold style={{ color: modoAtributos === 'livre' ? t.onPrimary : t.text, fontSize: 13 }}>
                    Modo Livre
                  </Txt>
                </Pressable>
              </View>

              <Label style={{ marginBottom: 8 }}>
                {modoAtributos === 'padrao'
                  ? 'Toque no valor desejado para cada atributo (os valores trocam entre si sem repetir):'
                  : 'Digite livremente o valor base de cada atributo (1 a 30):'}
              </Label>

              {ATRIBUTOS.map((k) => {
                const bonus = bonusRaca[k] ?? 0;
                const final = Math.min(30, atributos[k] + bonus);
                return (
                  <View key={k} style={[styles.attrBlock, { borderColor: t.border }]}>
                    <View style={styles.attrRow}>
                      <View style={{ flex: 1 }}>
                        <Txt bold>{ATRIBUTO_NOMES[k]}</Txt>
                        {bonus ? (
                          <Label style={{ marginBottom: 0, color: t.primary }}>
                            Base {atributos[k]} +{bonus} racial = {final}
                          </Label>
                        ) : null}
                      </View>
                      <Txt bold style={{ fontSize: 18, marginRight: 8 }}>
                        {final} ({fmt(modificador(final))})
                      </Txt>
                      {modoAtributos === 'livre' ? (
                        <NumInput
                          value={atributos[k]}
                          min={1}
                          max={30}
                          onChange={(n) => setAtributos((a) => ({ ...a, [k]: n }))}
                        />
                      ) : null}
                    </View>
                    {modoAtributos === 'padrao' ? (
                      <View style={[styles.modeRow, { marginTop: 6 }]}>
                        {ARRAY_PADRAO.map((val) => {
                          const ativo = atributos[k] === val;
                          return (
                            <Pressable
                              key={val}
                              onPress={() => escolherValorPadrao(k, val)}
                              style={[
                                styles.valPill,
                                { borderColor: t.primary, backgroundColor: ativo ? t.primary : 'transparent' },
                              ]}>
                              <Txt bold style={{ color: ativo ? t.onPrimary : t.text, fontSize: 14 }}>
                                {val}
                              </Txt>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </Card>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderColor: t.border, paddingBottom: insets.bottom + 12 }]}>
          <View style={{ flex: 1 }}>
            <Button
              title={passo === 0 ? 'Cancelar' : 'Voltar'}
              variant="ghost"
              onPress={() => (passo === 0 ? router.back() : setPasso(passo - 1))}
              disabled={salvando}
            />
          </View>
          <View style={{ flex: 1 }}>
            {passo < PASSOS.length - 1 ? (
              <Button title="Avançar" onPress={() => setPasso(passo + 1)} disabled={!podeAvancar} />
            ) : (
              <Button title={salvando ? 'Criando...' : 'Criar Personagem'} onPress={finalizar} disabled={salvando} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  bar: { height: 4, borderRadius: 2, alignSelf: 'stretch' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  info: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 4 },
  modeRow: { flexDirection: 'row', gap: 6 },
  modePill: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  attrBlock: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  attrRow: { flexDirection: 'row', alignItems: 'center' },
  valPill: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  footer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1 },
});
