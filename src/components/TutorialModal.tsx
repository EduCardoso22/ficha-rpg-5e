import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Label, Txt } from '@/components/ficha-ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useTutorialStore } from '@/store/useTutorialStore';

interface PassoTutorial {
  titulo: string;
  subtitulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  dicas: string[];
}

const PASSOS: PassoTutorial[] = [
  {
    titulo: 'Bem-vindo ao Fichas D&D 5e',
    subtitulo: 'Um guia rápido pelas principais funções do app e site',
    icone: 'sparkles-outline',
    dicas: [
      'Suas fichas ficam salvas na nuvem quando você entra com conta, ou no dispositivo quando entra como Convidado.',
      'Você pode rever este tutorial a qualquer momento na aba Perfil, no botão "Refazer Tutorial".',
    ],
  },
  {
    titulo: 'Criação de Fichas e Homebrew',
    subtitulo: 'Monte personagens oficiais do 5etools ou totalmente customizados',
    icone: 'document-text-outline',
    dicas: [
      'Na aba Fichas, toque no botão "+" para criar um novo personagem passo a passo.',
      'Escolha Raças, Classes e Antecedentes oficiais ou ative o modo Homebrew para digitar qualquer raça e classe personalizada.',
      'Nos três pontinhos de cada ficha você pode Duplicar para testar builds ou Exportar PDF para impressão.',
    ],
  },
  {
    titulo: 'Combate, Rolagem de Dados e Condições',
    subtitulo: 'Toque direto nos valores da ficha para rolar',
    icone: 'shield-half-outline',
    dicas: [
      'Toque em Atributos, Perícias, Salvaguardas, Iniciativa ou Ataques Rápidos para abrir o modal de rolagem.',
      'Nos ataques rápidos você pode preencher Alcance e Tipo de Dano, e rolar o dano direto do resultado.',
      'Se alguma Condição ou Exaustão estiver ativa na ficha, o modal de rolagem mostra o alerta de regra na hora.',
      'Use o botão flutuante do d20 no canto inferior para abrir a Bandeja Livre e o Histórico.',
    ],
  },
  {
    titulo: 'Magias, Upcast e Compêndio',
    subtitulo: 'Gerencie espaços de magia e consulte o 5etools bilíngue',
    icone: 'flame-outline',
    dicas: [
      'Na aba Magias da ficha, toque no nome de qualquer magia adicionada para expandir e ler a descrição completa.',
      'Use o botão "Conjurar" para gastar espaços automaticamente (inclusive em níveis maiores) e ativar Concentração.',
      'Na aba Compêndio você pesquisa Magias, Monstros (Bestiário), Itens, Talentos e Regras em inglês ou português.',
    ],
  },
  {
    titulo: 'Lore, Equipamentos e Companheiros',
    subtitulo: 'História, sintonização e aliados em um só lugar',
    icone: 'briefcase-outline',
    dicas: [
      'Na aba Lore, descreva a aparência livremente ou abra os detalhes físicos opcionais (olhos, altura, peso).',
      'Controle itens equipados, Sintonização (até 3 itens mágicos), peso de carga e crie ataques com 1 toque.',
      'Adicione Notas de Sessão no diário e gerencie Familiares, Montarias ou Forma Selvagem.',
    ],
  },
  {
    titulo: 'Mesa ao Vivo, Amigos e Personalização',
    subtitulo: 'Jogue em grupo e deixe o app com a sua cara',
    icone: 'people-outline',
    dicas: [
      'Conecte sua ficha em uma Sala de Mesa pelo código para compartilhar rolagens e ordem de iniciativa ao vivo.',
      'Na aba Perfil, adicione amigos pelo código ou e-mail e compartilhe fichas em modo leitura com o Mestre.',
      'Ainda no Perfil, troque entre tema Claro, Escuro ou Sistema e escolha a paleta de cores do app.',
    ],
  },
];

export function TutorialModal() {
  const t = useTheme();
  const user = useAuthStore((s) => s.user);
  const {
    aberto,
    passo,
    verificarTutorial,
    fecharTutorial,
    setPasso,
    resetarSessao,
  } = useTutorialStore();

  useEffect(() => {
    if (user?.uid) {
      void verificarTutorial(user.uid);
    } else {
      resetarSessao();
    }
  }, [user?.uid, verificarTutorial, resetarSessao]);

  if (!user || !aberto) return null;

  const atual = PASSOS[passo] ?? PASSOS[0];
  const ehPrimeiro = passo === 0;
  const ehUltimo = passo === PASSOS.length - 1;

  return (
    <Modal
      visible={aberto}
      transparent
      animationType="fade"
      onRequestClose={() => void fecharTutorial(user.uid)}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: t.backgroundElement, borderColor: t.primary }]}>
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: t.primary }]}>
              {passo === 2 ? (
                <MaterialCommunityIcons name="dice-d20" size={24} color={t.onPrimary} />
              ) : (
                <Ionicons name={atual.icone} size={24} color={t.onPrimary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Label style={{ marginBottom: 2 }}>
                Tutorial {passo + 1} de {PASSOS.length}
              </Label>
              <Txt bold style={{ fontSize: 18 }}>{atual.titulo}</Txt>
            </View>
            <Pressable
              onPress={() => void fecharTutorial(user.uid)}
              hitSlop={8}
              style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={t.textSecondary} />
            </Pressable>
          </View>

          <Txt style={{ fontSize: 13, color: t.textSecondary }}>{atual.subtitulo}</Txt>

          <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={styles.dicasList}>
            {atual.dicas.map((dica, idx) => (
              <View
                key={idx}
                style={[styles.dicaRow, { backgroundColor: t.background, borderColor: t.border }]}>
                <Ionicons name="checkmark-circle" size={18} color={t.primary} style={{ marginTop: 1 }} />
                <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{dica}</Txt>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 20,
    borderWidth: 2,
    padding: 18,
    gap: 12,
    elevation: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: {
    width: 44,
    height: 44,
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
    marginTop: 4,
  },
  dot: { height: 8, borderRadius: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
