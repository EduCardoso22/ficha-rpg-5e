import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Label, SectionTitle, Txt } from '@/components/ficha-ui';
import { Selector } from '@/components/selector';
import { useTheme } from '@/hooks/use-theme';
import { Feat5e, entriesParaTexto, listarTalentos } from '@/services/5etools';
import { setField, useFichaStore } from '@/store/useFichaStore';
import { ATRIBUTOS, ATRIBUTO_NOMES, AtributoKey, Caracteristica } from '@/types/ficha';
import { calcularSlotsPorClasseNivel, clamp, fmt, modificador, uid } from '@/utils/calc';

const NIVEIS_ASI = [4, 8, 12, 16, 19];

export function LevelUpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible ? <LevelUpContent onClose={onClose} /> : null}
    </Modal>
  );
}

function LevelUpContent({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  const ficha = useFichaStore((s) => s.ficha);

  const nivelAtual = ficha?.nivel ?? 1;
  const novoNivel = Math.min(20, nivelAtual + 1);
  const faces = ficha?.dadosVida.faces ?? 8;
  const modCon = modificador(ficha?.atributos.con ?? 10);
  const mediaDado = Math.floor(faces / 2) + 1;

  const [dadoRolado, setDadoRolado] = useState<number>(mediaDado);
  const [subclasse, setSubclasse] = useState(ficha?.subclasse ?? '');
  const [multiclasse, setMulticlasse] = useState(ficha?.multiclasse ?? '');

  const temAsiPadrao = NIVEIS_ASI.includes(novoNivel);
  const [modoUpgrade, setModoUpgrade] = useState<'nenhum' | 'asi' | 'talento'>(temAsiPadrao ? 'asi' : 'nenhum');
  const [asi1, setAsi1] = useState<AtributoKey>('for');
  const [asi2, setAsi2] = useState<AtributoKey>('for');

  const [talentos, setTalentos] = useState<Feat5e[] | null>(null);
  const [talentoSel, setTalentoSel] = useState<Feat5e | null>(null);
  const [talentoCustomNome, setTalentoCustomNome] = useState('');
  const [talentoCustomDesc, setTalentoCustomDesc] = useState('');

  useEffect(() => {
    if (modoUpgrade === 'talento' && !talentos) {
      listarTalentos()
        .then(setTalentos)
        .catch(() => setTalentos([]));
    }
  }, [modoUpgrade, talentos]);

  if (!ficha) return null;

  const ganhoPv = Math.max(1, dadoRolado + modCon);

  const rolarDado = () => {
    const r = 1 + Math.floor(Math.random() * faces);
    setDadoRolado(r);
  };

  const confirmar = () => {
    setField('nivel', novoNivel);
    setField('dadosVida.total', ficha.dadosVida.total + 1);
    setField('pv.total', ficha.pv.total + ganhoPv);
    setField('pv.atual', ficha.pv.atual + ganhoPv);
    if (subclasse.trim() !== (ficha.subclasse ?? '')) setField('subclasse', subclasse.trim());
    if (multiclasse.trim() !== (ficha.multiclasse ?? '')) setField('multiclasse', multiclasse.trim());

    const novosSlots = calcularSlotsPorClasseNivel(
      ficha.conjurador.classe || ficha.classe,
      novoNivel,
      ficha.conjurador.slots,
    );
    if (novosSlots) setField('conjurador.slots', novosSlots);

    if (modoUpgrade === 'asi') {
      const novosAttrs = { ...ficha.atributos };
      novosAttrs[asi1] = clamp(novosAttrs[asi1] + 1, 1, 30);
      novosAttrs[asi2] = clamp(novosAttrs[asi2] + 1, 1, 30);
      setField('atributos', novosAttrs);
    } else if (modoUpgrade === 'talento') {
      const nome = talentoCustomNome.trim() || talentoSel?.name;
      if (nome) {
        const descricao =
          talentoCustomDesc.trim() ||
          (talentoSel ? entriesParaTexto(talentoSel.entries) : '');
        const novaCarac: Caracteristica = {
          id: uid(),
          nome,
          origem: `Talento (Nv ${novoNivel})`,
          descricao,
        };
        setField('caracteristicas', [...(ficha.caracteristicas ?? []), novaCarac]);
      }
    }
    onClose();
  };

  const inputStyle = [styles.input, { borderColor: t.border, backgroundColor: t.input, color: t.text }];

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
        <View style={[styles.header, { borderColor: t.border, backgroundColor: t.backgroundElement }]}>
          <Txt bold style={{ fontSize: 19 }}>
            Subir de Nível: {nivelAtual} → {novoNivel}
          </Txt>
          <Button title="Cancelar" variant="ghost" onPress={onClose} />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 14, gap: 12 }}>
          <Card>
            <SectionTitle>1. Pontos de Vida e Dado de Vida</SectionTitle>
            <Txt style={{ marginBottom: 8 }}>
              Você recebe <Txt bold>+1d{faces}</Txt> de Dado de Vida. Escolha como calcular o ganho de PV:
            </Txt>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button
                  title={`Média Fixa (${mediaDado})`}
                  variant={dadoRolado === mediaDado ? 'primary' : 'ghost'}
                  onPress={() => setDadoRolado(mediaDado)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button title={`Rolar 1d${faces}`} variant="ghost" onPress={rolarDado} />
              </View>
            </View>
            <View style={[styles.pvPreview, { borderColor: t.border, backgroundColor: t.background }]}>
              <Txt>
                Dado ({dadoRolado}) + CON ({fmt(modCon)}) ={' '}
                <Txt bold style={{ color: t.success, fontSize: 18 }}>
                  +{ganhoPv} PV Máximos
                </Txt>
              </Txt>
              <Label style={{ marginBottom: 0 }}>
                PV Total passará de {ficha.pv.total} para {ficha.pv.total + ganhoPv}
              </Label>
            </View>
          </Card>

          <Card>
            <SectionTitle>2. Subclasse e Multiclasse (Opcional)</SectionTitle>
            <Label>Subclasse / Arquétipo (geralmente escolhida no nível 3)</Label>
            <TextInput
              value={subclasse}
              onChangeText={setSubclasse}
              placeholder="Ex.: Mestre de Batalha, Escola de Evocação..."
              placeholderTextColor={t.textSecondary}
              style={[inputStyle, { marginBottom: 10 }]}
            />
            <Label>Multiclasse (se possuir níveis em outra classe)</Label>
            <TextInput
              value={multiclasse}
              onChangeText={setMulticlasse}
              placeholder="Ex.: Guerreiro 2 / Ladino 1"
              placeholderTextColor={t.textSecondary}
              style={inputStyle}
            />
          </Card>

          <Card>
            <SectionTitle>3. Incremento de Atributo ou Talento (Feat)</SectionTitle>
            <Label style={{ marginBottom: 8 }}>
              {temAsiPadrao
                ? `O nível ${novoNivel} concede Incremento de Habilidade (+2) ou um novo Talento!`
                : 'Classes como Guerreiro (nv 6, 14) ou Ladino (nv 10) recebem incrementos extras. Ative abaixo se aplicável:'}
            </Label>

            <View style={[styles.row, { marginBottom: 12 }]}>
              {(['nenhum', 'asi', 'talento'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setModoUpgrade(m)}
                  style={[
                    styles.pill,
                    {
                      borderColor: t.primary,
                      backgroundColor: modoUpgrade === m ? t.primary : 'transparent',
                    },
                  ]}>
                  <Txt bold style={{ color: modoUpgrade === m ? t.onPrimary : t.text, fontSize: 13 }}>
                    {m === 'nenhum' ? 'Nenhum' : m === 'asi' ? '+2 Atributo' : 'Talento (Feat)'}
                  </Txt>
                </Pressable>
              ))}
            </View>

            {modoUpgrade === 'asi' ? (
              <View style={{ gap: 10 }}>
                <Label>Escolha dois aumentos de +1 (podem ser no mesmo atributo para +2):</Label>
                <View>
                  <Label>Primeiro +1:</Label>
                  <View style={styles.chipsWrap}>
                    {ATRIBUTOS.map((k) => (
                      <Pressable
                        key={k}
                        onPress={() => setAsi1(k)}
                        style={[
                          styles.attrChip,
                          { borderColor: t.primary, backgroundColor: asi1 === k ? t.primary : 'transparent' },
                        ]}>
                        <Txt bold style={{ color: asi1 === k ? t.onPrimary : t.text, fontSize: 13 }}>
                          {ATRIBUTO_NOMES[k]} ({ficha.atributos[k]})
                        </Txt>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View>
                  <Label>Segundo +1:</Label>
                  <View style={styles.chipsWrap}>
                    {ATRIBUTOS.map((k) => (
                      <Pressable
                        key={k}
                        onPress={() => setAsi2(k)}
                        style={[
                          styles.attrChip,
                          { borderColor: t.primary, backgroundColor: asi2 === k ? t.primary : 'transparent' },
                        ]}>
                        <Txt bold style={{ color: asi2 === k ? t.onPrimary : t.text, fontSize: 13 }}>
                          {ATRIBUTO_NOMES[k]} ({ficha.atributos[k] + (asi1 === k ? 1 : 0)})
                        </Txt>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {modoUpgrade === 'talento' ? (
              <View style={{ gap: 8 }}>
                <Selector<Feat5e>
                  label="Buscar Talento Oficial (5etools)"
                  placeholder="Selecione um talento..."
                  items={talentos}
                  loading={!talentos}
                  value={talentoSel}
                  onChange={setTalentoSel}
                  getKey={(f) => `${f.name}|${f.source}`}
                  getLabel={(f) => f.name}
                  getSub={(f) => f.source}
                />
                {talentoSel ? (
                  <View style={[styles.pvPreview, { borderColor: t.border }]}>
                    <Txt bold>{talentoSel.name}</Txt>
                    <Txt style={{ fontSize: 13, color: t.textSecondary }}>
                      {entriesParaTexto(talentoSel.entries)}
                    </Txt>
                  </View>
                ) : null}
                <Label>Ou digite um Talento Homebrew / Personalizado:</Label>
                <TextInput
                  value={talentoCustomNome}
                  onChangeText={setTalentoCustomNome}
                  placeholder="Nome do talento personalizado"
                  placeholderTextColor={t.textSecondary}
                  style={inputStyle}
                />
                {talentoCustomNome.trim() ? (
                  <TextInput
                    value={talentoCustomDesc}
                    onChangeText={setTalentoCustomDesc}
                    placeholder="Descrição do talento..."
                    placeholderTextColor={t.textSecondary}
                    multiline
                    style={[inputStyle, { minHeight: 70, textAlignVertical: 'top' }]}
                  />
                ) : null}
              </View>
            ) : null}
          </Card>

          <Button title={`Confirmar Nível ${novoNivel}`} onPress={confirmar} />
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pvPreview: { marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  pill: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  attrChip: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
});
