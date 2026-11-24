import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, Label, Txt } from '@/components/ficha-ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { TutorialRect, useTutorialStore } from '@/store/useTutorialStore';

interface PassoTutorial {
  titulo: string;
  subtitulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  rota?: '/(tabs)' | '/(tabs)/compendio' | '/(tabs)/perfil';
  targetId?: string;
  dicas: string[];
}

const PASSOS: PassoTutorial[] = [
  {
    titulo: 'Passo a passo: Criando uma Ficha',
    subtitulo: 'Comece seu personagem oficial ou Homebrew em segundos',
    icone: 'document-text-outline',
    rota: '/(tabs)',
    targetId: 'fichas-nova',
    dicas: [
      '1. Toque em "Nova Ficha" no topo da aba Fichas.',
      '2. Preencha o nome do personagem e escolha Raça, Classe e Antecedente do 5etools (ou ative o modo Homebrew para digitar tudo livremente).',
      '3. Defina os 6 atributos (Array Padrão ou livre) e salve para abrir a ficha com rolagens automáticas e alertas de condição.',
    ],
  },
  {
    titulo: 'Como abrir uma Sala de Mesa ao Vivo',
    subtitulo: 'Conecte o Mestre e os jogadores em tempo real',
    icone: 'shield-half-outline',
    rota: '/(tabs)',
    targetId: 'fichas-nova',
    dicas: [
      '1. Toque no botão "Mestre" (ao lado de Nova Ficha) para abrir o painel da Sala de Mesa e o Escudo do Mestre.',
      '2. Digite um código de sala (ex.: MESA-D20) e toque em "Conectar".',
      '3. Compartilhe esse código com o grupo: os jogadores conectam pela Bandeja de Dados (botão do d20) e todas as rolagens e a fila de iniciativa sincronizam ao vivo.',
    ],
  },
  {
    titulo: 'Como pesquisar no Compêndio',
    subtitulo: 'Consulte regras e conteúdos bilíngues do 5etools',
    icone: 'book-outline',
    rota: '/(tabs)/compendio',
    targetId: 'compendio-busca',
    dicas: [
      '1. Escolha a categoria desejada no topo (Magias, Bestiário, Itens, Talentos, Raças, Classes ou Antecedentes).',
      '2. Digite na barra de busca em português ou inglês e toque em "Filtros" para refinar por livro, raridade ou ND.',
      '3. Com uma ficha aberta, você pode adicionar itens, talentos ou monstros direto nela com 1 toque.',
    ],
  },
  {
    titulo: 'Como personalizar seu Perfil e o App',
    subtitulo: 'Deixe o visual e sua identidade na mesa do seu jeito',
    icone: 'color-palette-outline',
    rota: '/(tabs)/perfil',
    targetId: 'perfil-aparencia',
    dicas: [
      '1. No topo do Perfil, toque no ícone de lápis para editar seu apelido, papel na mesa (Jogador/Mestre), foto ou ícone de avatar.',
      '2. Aqui em "Aparência e Paleta de Cores", alterne entre Claro, Escuro ou Sistema.',
      '3. Escolha a cor principal do app e do site entre Carmesim, Arcano, Esmeralda, Dourado ou Abissal.',
    ],
  },
  {
    titulo: 'Como adicionar Amigos',
    subtitulo: 'Conecte-se com os jogadores e Mestres da sua campanha',
    icone: 'person-add-outline',
    rota: '/(tabs)/perfil',
    targetId: 'perfil-amigos',
    dicas: [
      '1. Copie seu Código de Amigo destacado acima (ex.: D20-...) e envie para seus colegas.',
      '2. Na seção "Amigos e Solicitações" logo abaixo, cole o código ou o e-mail de alguém para enviar um pedido de amizade.',
      '3. Assim que a outra pessoa aceitar, vocês ficam conectados na agenda um do outro.',
    ],
  },
  {
    titulo: 'Como compartilhar Fichas',
    subtitulo: 'Deixe o Mestre acompanhar sua ficha em tempo real',
    icone: 'share-social-outline',
    rota: '/(tabs)/perfil',
    targetId: 'perfil-amigos',
    dicas: [
      '1. Na aba Fichas, toque nos três pontinhos do card da ficha e escolha "Compartilhar" para liberar acesso somente leitura por e-mail.',
      '2. Ou, na sua lista de Amigos aqui no Perfil, toque no botão de compartilhar ao lado do amigo para enviar a ficha aberta com 1 toque.',
    ],
  },
  {
    titulo: 'Contato e Sugestões de Edições',
    subtitulo: 'Ajude a evoluir o app com ideias e feedback',
    icone: 'logo-github',
    rota: '/(tabs)/perfil',
    targetId: 'perfil-ajuda',
    dicas: [
      '1. Toque em "GitHub (Sugerir ideias e edições)" para abrir o repositório (EduCardoso22/ficha-rpg-5e) e enviar sugestões pela aba Issues.',
      '2. Se preferir contato direto, use o link do Instagram @Edu0_22_ logo abaixo.',
      '3. Sempre que quiser rever este guia, toque em "Refazer Tutorial do App". Bom jogo!',
    ],
  },
];

export function TutorialModal() {
  const t = useTheme();
  const router = useRouter();
  const { width: winW, height: winH } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const {
    aberto,
    passo,
    verificarTutorial,
    fecharTutorial,
    setPasso,
    resetarSessao,
    measureTarget,
  } = useTutorialStore();

  const [medida, setMedida] = useState<{ passo: number; rect: TutorialRect | null }>({
    passo: -1,
    rect: null,
  });

  useEffect(() => {
    if (user?.uid) {
      void verificarTutorial(user.uid);
    } else {
      resetarSessao();
    }
  }, [user?.uid, verificarTutorial, resetarSessao]);

  const atual = PASSOS[passo] ?? PASSOS[0];

  useEffect(() => {
    if (!aberto || !user) return;
    if (atual.rota) {
      router.navigate(atual.rota);
    }
    let ativo = true;
    const timer = setTimeout(() => {
      void measureTarget(atual.targetId).then((r) => {
        if (ativo) setMedida({ passo, rect: r });
      });
    }, 220);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [aberto, user, passo, atual.rota, atual.targetId, router, measureTarget, winW, winH]);

  if (!user || !aberto) return null;

  const rect = medida.passo === passo ? medida.rect : null;

  const ehPrimeiro = passo === 0;
  const ehUltimo = passo === PASSOS.length - 1;

  const pad = 8;
  const hasHole = !!rect && rect.width > 0 && rect.height > 0 && rect.y < winH - 40 && rect.y + rect.height > 0;
  const hx = hasHole ? Math.max(4, rect!.x - pad) : 0;
  const hy = hasHole ? Math.max(4, rect!.y - pad) : 0;
  const hw = hasHole ? Math.min(winW - hx - 4, rect!.width + pad * 2) : 0;
  const hh = hasHole ? Math.min(winH - hy - 4, rect!.height + pad * 2) : 0;

  // Posiciona o card do tutorial acima ou abaixo da area destacada para nao cobrir o alvo
  const colocarAcima = hasHole && hy > winH * 0.45;
  const cardPositionStyle = hasHole
    ? colocarAcima
      ? { position: 'absolute' as const, bottom: Math.max(16, winH - hy + 12), left: 16, right: 16, alignSelf: 'center' as const }
      : { position: 'absolute' as const, top: Math.min(hy + hh + 12, Math.max(16, winH - 320)), left: 16, right: 16, alignSelf: 'center' as const }
    : undefined;

  return (
    <Modal
      visible={aberto}
      transparent
      animationType="fade"
      onRequestClose={() => void fecharTutorial(user.uid)}>
      <View style={styles.root}>
        {hasHole ? (
          <>
            {/* 4 faixas escuras ao redor do elemento destacado */}
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: hy }]} />
            <View style={[styles.dim, { top: hy + hh, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.dim, { top: hy, left: 0, width: hx, height: hh }]} />
            <View style={[styles.dim, { top: hy, left: hx + hw, right: 0, height: hh }]} />
            <View
              pointerEvents="none"
              style={[
                styles.spotlightBorder,
                { left: hx, top: hy, width: hw, height: hh, borderColor: t.primary },
              ]}
            />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFill]} />
        )}

        <View
          style={[
            styles.cardWrap,
            !hasHole ? styles.cardCentered : null,
            cardPositionStyle,
          ]}>
          <View style={[styles.card, { backgroundColor: t.backgroundElement, borderColor: t.primary }]}>
            <View style={styles.header}>
              <View style={[styles.iconBadge, { backgroundColor: t.primary }]}>
                {passo === 2 ? (
                  <MaterialCommunityIcons name="dice-d20" size={22} color={t.onPrimary} />
                ) : (
                  <Ionicons name={atual.icone} size={22} color={t.onPrimary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Label style={{ marginBottom: 2 }}>
                  Tutorial {passo + 1} de {PASSOS.length}
                </Label>
                <Txt bold style={{ fontSize: 17 }}>{atual.titulo}</Txt>
              </View>
              <Pressable
                onPress={() => void fecharTutorial(user.uid)}
                hitSlop={8}
                style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={t.textSecondary} />
              </Pressable>
            </View>

            <Txt style={{ fontSize: 13, color: t.textSecondary }}>{atual.subtitulo}</Txt>

            <ScrollView style={{ maxHeight: 190 }} contentContainerStyle={styles.dicasList}>
              {atual.dicas.map((dica, idx) => (
                <View
                  key={idx}
                  style={[styles.dicaRow, { backgroundColor: t.background, borderColor: t.border }]}>
                  <Ionicons name="checkmark-circle" size={17} color={t.primary} style={{ marginTop: 1 }} />
                  <Txt style={{ flex: 1, fontSize: 13.5, lineHeight: 19 }}>{dica}</Txt>
                </View>
              ))}
            </ScrollView>

            <View style={styles.dotsRow}>
              {PASSOS.map((_, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setPasso(idx)}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: idx === passo ? t.primary : t.border,
                      width: idx === passo ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.footer}>
              {ehPrimeiro ? (
                <Button
                  title="Pular"
                  variant="ghost"
                  onPress={() => void fecharTutorial(user.uid)}
                />
              ) : (
                <Button
                  title="Anterior"
                  variant="ghost"
                  onPress={() => setPasso(Math.max(0, passo - 1))}
                />
              )}

              <View style={{ flex: 1 }} />

              {ehUltimo ? (
                <Pressable
                  onPress={() => void fecharTutorial(user.uid)}
                  style={[styles.primaryBtn, { backgroundColor: t.primary }]}>
                  <Text style={{ color: t.onPrimary, fontWeight: '800', fontSize: 14 }}>
                    Começar a jogar
                  </Text>
                  <Ionicons name="checkmark" size={16} color={t.onPrimary} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setPasso(Math.min(PASSOS.length - 1, passo + 1))}
                  style={[styles.primaryBtn, { backgroundColor: t.primary }]}>
                  <Text style={{ color: t.onPrimary, fontWeight: '800', fontSize: 14 }}>
                    Próximo
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={t.onPrimary} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  spotlightBorder: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 2.5,
  },
  cardWrap: {
    alignItems: 'center',
  },
  cardCentered: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 20,
    borderWidth: 2,
    padding: 16,
    gap: 10,
    elevation: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dicasList: { gap: 8 },
  dicaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: { height: 8, borderRadius: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
