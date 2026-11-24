import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, IconButton, Label, SectionTitle, Txt } from '@/components/ficha-ui';
import {
  AccentPaletteKey,
  AccentPalettes,
  DesktopBreakpoint,
  MaxContentWidth,
  MaxDesktopWidth,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { compartilharCom } from '@/services/fichas';
import {
  AVATARES_RPG,
  AmigoRef,
  AmizadeDoc,
  PapelMesa,
  PerfilUsuario,
  aceitarSolicitacaoAmizade,
  criarPerfilPadrao,
  enviarSolicitacaoAmizade,
  escutarMeuPerfil,
  escutarMinhasAmizades,
  recusarOuRemoverAmizade,
  salvarPerfil,
  sincronizarDadosAmigos,
} from '@/services/perfil';
import { useAuthStore } from '@/store/useAuthStore';
import { useDiceStore } from '@/store/useDiceStore';
import { useFichaStore } from '@/store/useFichaStore';
import { ThemePreference, useThemeStore } from '@/store/useThemeStore';
import { useTutorialStore } from '@/store/useTutorialStore';

const OPCOES: { v: ThemePreference; label: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { v: 'system', label: 'Sistema', icone: 'phone-portrait-outline' },
  { v: 'light', label: 'Claro', icone: 'sunny-outline' },
  { v: 'dark', label: 'Escuro', icone: 'moon-outline' },
];

const PAPEIS: { id: PapelMesa; label: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'jogador', label: 'Jogador', icone: 'dice-outline' },
  { id: 'mestre', label: 'Mestre (DM)', icone: 'shield-half' },
  { id: 'ambos', label: 'Jogador e Mestre', icone: 'sparkles' },
];

const PALETAS_LISTA = Object.entries(AccentPalettes) as [
  AccentPaletteKey,
  (typeof AccentPalettes)[AccentPaletteKey],
][];

function iconeAvatar(avatarId: string): keyof typeof Ionicons.glyphMap {
  const found = AVATARES_RPG.find((a) => a.id === avatarId);
  return (found?.icon ?? 'dice-outline') as keyof typeof Ionicons.glyphMap;
}

function labelPapel(p: PapelMesa): string {
  return PAPEIS.find((x) => x.id === p)?.label ?? 'Jogador';
}

function mostrarAviso(titulo: string, msg: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}: ${msg}`);
  } else {
    Alert.alert(titulo, msg);
  }
}

export default function PerfilScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DesktopBreakpoint;
  const user = useAuthStore((s) => s.user);
  const fichaAberta = useFichaStore((s) => s.ficha);
  const codigoMesaAtiva = useDiceStore((s) => s.codigoMesa);
  const conectarMesa = useDiceStore((s) => s.conectarMesa);
  const { preference, setPreference, palette, setPalette } = useThemeStore();
  const abrirTutorial = useTutorialStore((s) => s.abrirTutorial);

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const editandoRef = useRef(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  useEffect(() => {
    editandoRef.current = editandoPerfil;
  }, [editandoPerfil]);

  // Campos de edição do perfil
  const [apelido, setApelido] = useState('');
  const [avatar, setAvatar] = useState('dice');
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(undefined);
  const [papel, setPapel] = useState<PapelMesa>('jogador');
  const [classeFav, setClasseFav] = useState('');
  const [bio, setBio] = useState('');

  // Campos de amizades mútuas
  const [amigos, setAmigos] = useState<AmigoRef[]>([]);
  const [recebidas, setRecebidas] = useState<AmizadeDoc[]>([]);
  const [enviadas, setEnviadas] = useState<AmizadeDoc[]>([]);
  const [buscaAmigo, setBuscaAmigo] = useState('');
  const [adicionandoAmigo, setAdicionandoAmigo] = useState(false);
  const [sincronizandoAmigos, setSincronizandoAmigos] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubPerfil = escutarMeuPerfil(user.uid, user.email ?? '', (p) => {
      setPerfil(p);
      if (!editandoRef.current) {
        setApelido(p.apelido);
        setAvatar(p.avatar || 'dice');
        setFotoUrl(p.fotoUrl);
        setPapel(p.papel || 'jogador');
        setClasseFav(p.classeFavorita || '');
        setBio(p.bio || '');
      }
    });
    const unsubAmizades = escutarMinhasAmizades(user.uid, (res) => {
      setAmigos(res.amigos);
      setRecebidas(res.recebidas);
      setEnviadas(res.enviadas);
    });
    return () => {
      unsubPerfil();
      unsubAmizades();
    };
  }, [user]);

  // Sincroniza mesaAtual com o perfil quando o usuário entra/sai de uma sala ao vivo
  useEffect(() => {
    if (!perfil) return;
    if ((perfil.mesaAtual ?? '') !== (codigoMesaAtiva ?? '')) {
      void salvarPerfil({ ...perfil, mesaAtual: codigoMesaAtiva ?? '' });
    }
  }, [codigoMesaAtiva, perfil]);

  const escolherImagemPerfil = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      mostrarAviso('Permissão negada', 'Libere o acesso às fotos para escolher uma imagem.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (res.canceled) return;
    const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 256, height: 256 } }], {
      compress: 0.65,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (out.base64) {
      setFotoUrl(`data:image/jpeg;base64,${out.base64}`);
    }
  };

  const confirmarEdicaoPerfil = async () => {
    if (!user) return;
    setSalvandoPerfil(true);
    const base = perfil ?? criarPerfilPadrao(user.uid, user.email ?? '');
    const novo: PerfilUsuario = {
      ...base,
      apelido: apelido.trim() || base.apelido,
      avatar,
      fotoUrl,
      papel,
      classeFavorita: classeFav.trim(),
      bio: bio.trim(),
    };
    await salvarPerfil(novo);
    setPerfil(novo);
    setSalvandoPerfil(false);
    setEditandoPerfil(false);
  };

  const copiarCodigoAmigo = async () => {
    if (!perfil?.codigoAmigo) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(perfil.codigoAmigo);
      window.alert(`Código de amigo ${perfil.codigoAmigo} copiado!`);
    } else {
      await Share.share({
        message: `Meu código de amigo no Fichas D&D é: ${perfil.codigoAmigo}`,
      });
    }
  };

  const enviarSolicitacao = async () => {
    if (!user || !perfil) return;
    const termo = buscaAmigo.trim();
    if (!termo) return;

    if (
      termo.toLowerCase() === (user.email ?? '').toLowerCase() ||
      termo.toUpperCase() === perfil.codigoAmigo.toUpperCase()
    ) {
      mostrarAviso('Ops', 'Esse é o seu próprio perfil!');
      return;
    }

    setAdicionandoAmigo(true);
    try {
      const res = await enviarSolicitacaoAmizade(perfil, termo);
      if (res.status === 'not_found') {
        mostrarAviso(
          'Jogador não encontrado',
          'Verifique se a pessoa já entrou no aplicativo pelo menos uma vez e confira o E-mail ou Código (ex.: D20-ABCDE).',
        );
      } else if (res.status === 'already_friends') {
        mostrarAviso('Já conectados', `${res.alvo?.apelido} já está na sua lista de amigos.`);
      } else if (res.status === 'auto_accepted') {
        mostrarAviso('Amizade Confirmada', `${res.alvo?.apelido} já havia te enviado um pedido e agora vocês são amigos!`);
        setBuscaAmigo('');
      } else {
        mostrarAviso('Solicitação Enviada', `Pedido de amizade enviado para ${res.alvo?.apelido}. Assim que aceitar, ambos aparecerão na agenda!`);
        setBuscaAmigo('');
      }
    } catch (e) {
      mostrarAviso('Erro ao enviar pedido', (e as Error).message);
    } finally {
      setAdicionandoAmigo(false);
    }
  };

  const atualizarListaAmigos = async () => {
    if (!amigos.length) return;
    setSincronizandoAmigos(true);
    try {
      const atualizados = await sincronizarDadosAmigos(amigos);
      setAmigos(atualizados);
    } finally {
      setSincronizandoAmigos(false);
    }
  };

  const compartilharFichaComAmigo = async (amigo: AmigoRef) => {
    if (!fichaAberta) {
      mostrarAviso('Abra uma ficha primeiro', 'Abra um personagem na aba Fichas para compartilhar com seus amigos.');
      return;
    }
    if (!amigo.email) {
      mostrarAviso('Sem e-mail', 'Este amigo está em modo convidado.');
      return;
    }
    const emailLimpo = amigo.email.trim().toLowerCase();
    const atuais = fichaAberta.sharedWithEmails ?? [];
    if (atuais.includes(emailLimpo)) {
      mostrarAviso('Já compartilhada', `${fichaAberta.titulo} já está compartilhada com ${amigo.apelido}.`);
      return;
    }
    const novos = [...atuais, emailLimpo];
    await compartilharCom(fichaAberta.id, emailLimpo);
    useFichaStore.setState((s) => (s.ficha ? { ficha: { ...s.ficha, sharedWithEmails: novos } } : s));
    mostrarAviso('Ficha Compartilhada', `${amigo.apelido} agora pode acompanhar ${fichaAberta.titulo} no Escudo do Mestre.`);
  };

  const pAtual = perfil ?? criarPerfilPadrao(user?.uid ?? 'guest', user?.email ?? '');
  const fotoExibida = editandoPerfil ? fotoUrl : pAtual.fotoUrl;

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          padding: 12,
          width: '100%',
          maxWidth: isDesktop ? MaxDesktopWidth : MaxContentWidth,
          alignSelf: 'center',
        }}>
        {/* CARD DO PERFIL DO AVENTUREIRO */}
        <Card accent>
          <View style={styles.profileTop}>
            <View style={[styles.avatar, { backgroundColor: t.backgroundSelected, borderColor: t.primary }]}>
              {fotoExibida ? (
                <Image source={{ uri: fotoExibida }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name={iconeAvatar(editandoPerfil ? avatar : pAtual.avatar)} size={32} color={t.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Txt bold style={{ fontSize: 19 }}>{pAtual.apelido}</Txt>
                <View style={[styles.roleBadge, { backgroundColor: t.backgroundSelected, borderColor: t.primary }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: t.primary }}>
                    {labelPapel(pAtual.papel)}
                  </Text>
                </View>
              </View>
              <Label style={{ marginTop: 2, marginBottom: 0, textTransform: 'none' }}>
                {user?.isAnonymous ? 'Modo Convidado' : user?.email}
              </Label>
              {pAtual.classeFavorita ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <Ionicons name="star" size={13} color={t.primary} />
                  <Txt style={{ fontSize: 13, color: t.primary }} bold>
                    Favorito: {pAtual.classeFavorita}
                  </Txt>
                </View>
              ) : null}
              {pAtual.bio ? (
                <Txt style={{ fontSize: 13, color: t.textSecondary, marginTop: 2 }}>{pAtual.bio}</Txt>
              ) : null}
            </View>
            <IconButton
              name={editandoPerfil ? 'close-circle-outline' : 'create-outline'}
              size={22}
              color={t.primary}
              onPress={() => setEditandoPerfil((v) => !v)}
            />
          </View>

          {/* Código de Amigo */}
          <View style={[styles.friendCodeBar, { backgroundColor: t.backgroundElement, borderColor: t.border }]}>
            <View style={{ flex: 1 }}>
              <Label style={{ marginBottom: 0 }}>SEU CÓDIGO DE AMIGO</Label>
              <Txt bold style={{ fontSize: 16, letterSpacing: 1, color: t.primary }}>
                {pAtual.codigoAmigo}
              </Txt>
            </View>
            <Pressable
              onPress={copiarCodigoAmigo}
              style={[styles.copyChip, { borderColor: t.primary, backgroundColor: t.backgroundSelected }]}>
              <Ionicons name="copy-outline" size={14} color={t.primary} />
              <Txt bold style={{ fontSize: 12, color: t.primary }}>Copiar código</Txt>
            </Pressable>
          </View>

          {/* Formulário de Edição do Perfil */}
          {editandoPerfil ? (
            <View style={[styles.editBox, { borderTopColor: t.border }]}>
              <Label>Seu Apelido / Nome na Mesa</Label>
              <TextInput
                value={apelido}
                onChangeText={setApelido}
                placeholder="Ex.: Edu, Mestre Corvax..."
                placeholderTextColor={t.textSecondary}
                style={[styles.input, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
              />

              <Label style={{ marginTop: 10 }}>Foto ou Ícone do Perfil</Label>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <Button title="Escolher Imagem Própria" icon="image-outline" variant="ghost" onPress={escolherImagemPerfil} />
                {fotoUrl ? (
                  <Button title="Remover Foto" icon="trash-outline" variant="ghost" onPress={() => setFotoUrl(undefined)} />
                ) : null}
              </View>

              <View style={styles.avatarGrid}>
                {AVATARES_RPG.map((av) => {
                  const ativo = !fotoUrl && avatar === av.id;
                  return (
                    <Pressable
                      key={av.id}
                      onPress={() => {
                        setFotoUrl(undefined);
                        setAvatar(av.id);
                      }}
                      style={[
                        styles.avatarChoice,
                        {
                          borderColor: ativo ? t.primary : t.border,
                          backgroundColor: ativo ? t.primary : t.backgroundElement,
                        },
                      ]}>
                      <Ionicons
                        name={av.icon as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={ativo ? t.onPrimary : t.primary}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <Label style={{ marginTop: 10 }}>Seu Papel no RPG</Label>
              <View style={styles.row}>
                {PAPEIS.map((p) => {
                  const ativo = papel === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setPapel(p.id)}
                      style={[
                        styles.roleOption,
                        { borderColor: t.primary, backgroundColor: ativo ? t.primary : 'transparent' },
                      ]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: ativo ? t.onPrimary : t.text }}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Label style={{ marginTop: 8 }}>Classe / Raça Favorita</Label>
              <TextInput
                value={classeFav}
                onChangeText={setClasseFav}
                placeholder="Ex.: Bruxo · Corvum (Humblewood)"
                placeholderTextColor={t.textSecondary}
                style={[styles.input, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
              />

              <Label style={{ marginTop: 8 }}>Bio / Frase de RPG</Label>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Ex.: Mestre de campanhas sombrias aos sábados!"
                placeholderTextColor={t.textSecondary}
                style={[styles.input, { borderColor: t.border, backgroundColor: t.input, color: t.text }]}
              />

              <View style={{ marginTop: 10 }}>
                <Button
                  title={salvandoPerfil ? 'Salvando...' : 'Salvar Perfil'}
                  onPress={confirmarEdicaoPerfil}
                  disabled={salvandoPerfil}
                />
              </View>
            </View>
          ) : null}
        </Card>

        {/* CARD DE AMIGOS & SOLICITAÇÕES MÚTUAS */}
        <Card accent>
          <SectionTitle
            right={
              amigos.length > 0 ? (
                <Pressable onPress={atualizarListaAmigos} disabled={sincronizandoAmigos} hitSlop={8}>
                  {sincronizandoAmigos ? (
                    <ActivityIndicator size="small" color={t.primary} />
                  ) : (
                    <Ionicons name="refresh" size={18} color={t.primary} />
                  )}
                </Pressable>
              ) : undefined
            }>
            Amigos e Grupo de RPG ({amigos.length})
          </SectionTitle>
          <Label style={{ marginTop: 2, marginBottom: 8 }}>
            Envie uma solicitação pelo E-mail ou Código de Amigo. Quando aceita, os dois aparecem na agenda um do outro!
          </Label>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={buscaAmigo}
              onChangeText={setBuscaAmigo}
              placeholder="E-mail ou código (ex.: D20-ABCDE)"
              placeholderTextColor={t.textSecondary}
              autoCapitalize="none"
              style={[styles.input, { flex: 1, borderColor: t.border, backgroundColor: t.input, color: t.text }]}
              onSubmitEditing={enviarSolicitacao}
            />
            <Button
              title={adicionandoAmigo ? '...' : 'Solicitar'}
              icon="person-add-outline"
              onPress={enviarSolicitacao}
              disabled={adicionandoAmigo || !buscaAmigo.trim()}
            />
          </View>

          {/* Solicitações Recebidas */}
          {recebidas.length > 0 ? (
            <View style={{ marginTop: 14, gap: 8 }}>
              <Label style={{ color: t.primary, marginBottom: 0 }}>
                SOLICITAÇÕES RECEBIDAS ({recebidas.length})
              </Label>
              {recebidas.map((req) => (
                <View
                  key={req.id}
                  style={[styles.friendCard, { borderColor: t.primary, backgroundColor: t.backgroundElement }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.friendAvatar, { borderColor: t.primary, backgroundColor: t.backgroundSelected }]}>
                      {req.fromPerfil.fotoUrl ? (
                        <Image source={{ uri: req.fromPerfil.fotoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <Ionicons name={iconeAvatar(req.fromPerfil.avatar)} size={20} color={t.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt bold>{req.fromPerfil.apelido}</Txt>
                      <Label style={{ marginBottom: 0, textTransform: 'none' }}>{req.fromPerfil.email}</Label>
                    </View>
                    <Pressable
                      onPress={() => void aceitarSolicitacaoAmizade(req.id, pAtual)}
                      style={[styles.reqBtn, { backgroundColor: t.success }]}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Aceitar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void recusarOuRemoverAmizade(req.id)}
                      style={[styles.reqBtn, { borderColor: t.danger, borderWidth: 1 }]}>
                      <Text style={{ color: t.danger, fontWeight: '700', fontSize: 12 }}>Recusar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Solicitações Enviadas */}
          {enviadas.length > 0 ? (
            <View style={{ marginTop: 12, gap: 6 }}>
              <Label style={{ marginBottom: 0 }}>AGUARDANDO ACEITAÇÃO ({enviadas.length})</Label>
              {enviadas.map((req) => (
                <View
                  key={req.id}
                  style={[styles.pendingRow, { borderColor: t.border, backgroundColor: t.input }]}>
                  <Txt style={{ flex: 1, fontSize: 13 }}>
                    {req.toPerfil.apelido} ({req.toPerfil.email})
                  </Txt>
                  <Pressable onPress={() => void recusarOuRemoverAmizade(req.id)}>
                    <Text style={{ color: t.danger, fontSize: 12, fontWeight: '700' }}>Cancelar</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {/* Lista de Amigos Aceitos */}
          {amigos.length === 0 ? (
            <Label style={{ marginTop: 12, marginBottom: 0 }}>
              Nenhum amigo conectado ainda. Compartilhe seu código {pAtual.codigoAmigo} com seu grupo!
            </Label>
          ) : (
            <View style={{ gap: 8, marginTop: 12 }}>
              {amigos.map((a) => (
                <View
                  key={a.uid}
                  style={[styles.friendCard, { borderColor: t.border, backgroundColor: t.backgroundElement }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.friendAvatar, { borderColor: t.primary, backgroundColor: t.backgroundSelected }]}>
                      {a.fotoUrl ? (
                        <Image source={{ uri: a.fotoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <Ionicons name={iconeAvatar(a.avatar)} size={22} color={t.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Txt bold style={{ fontSize: 15 }}>{a.apelido}</Txt>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: t.primary }}>
                          {labelPapel(a.papel)}
                        </Text>
                      </View>
                      {a.email ? (
                        <Label style={{ marginBottom: 0, textTransform: 'none' }}>{a.email}</Label>
                      ) : null}
                      {a.classeFavorita ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="star-outline" size={12} color={t.textSecondary} />
                          <Txt style={{ fontSize: 12, color: t.textSecondary }}>{a.classeFavorita}</Txt>
                        </View>
                      ) : null}
                      {a.bio ? (
                        <Txt style={{ fontSize: 12, color: t.textSecondary, fontStyle: 'italic' }}>
                          &ldquo;{a.bio}&rdquo;
                        </Txt>
                      ) : null}
                    </View>
                    {a.amizadeId ? (
                      <IconButton
                        name="trash-outline"
                        size={18}
                        color={t.danger}
                        onPress={() => void recusarOuRemoverAmizade(a.amizadeId!)}
                      />
                    ) : null}
                  </View>

                  <View style={styles.friendActions}>
                    {a.email ? (
                      <Pressable
                        onPress={() => compartilharFichaComAmigo(a)}
                        style={[styles.friendActionBtn, { borderColor: t.primary }]}>
                        <Ionicons name="share-social-outline" size={14} color={t.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: t.primary }}>
                          {fichaAberta ? `Compartilhar ${fichaAberta.titulo}` : 'Compartilhar Ficha'}
                        </Text>
                      </Pressable>
                    ) : null}

                    {a.mesaAtual ? (
                      <Pressable
                        onPress={() => {
                          conectarMesa(a.mesaAtual!);
                          mostrarAviso('Conectado à Mesa', `Você entrou na sala ${a.mesaAtual} com ${a.apelido}.`);
                        }}
                        style={[styles.friendActionBtn, { borderColor: t.success, backgroundColor: t.backgroundSelected }]}>
                        <Ionicons name="radio-outline" size={14} color={t.success} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: t.success }}>
                          Entrar na Sala {a.mesaAtual}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* CARD DE APARÊNCIA (TEMA + PALETA DE CORES PERSONALIZÁVEL) */}
        <Card>
          <SectionTitle>Aparência e Paleta de Cores</SectionTitle>
          <Label style={{ marginBottom: 8 }}>Modo de exibição</Label>
          <View style={styles.row}>
            {OPCOES.map((o) => {
              const ativo = preference === o.v;
              return (
                <Pressable
                  key={o.v}
                  onPress={() => setPreference(o.v)}
                  style={[
                    styles.opt,
                    { borderColor: t.primary, backgroundColor: ativo ? t.primary : 'transparent' },
                  ]}>
                  <Ionicons name={o.icone} size={18} color={ativo ? t.onPrimary : t.text} />
                  <Txt bold style={{ color: ativo ? t.onPrimary : t.text }}>
                    {o.label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          <Label style={{ marginTop: 14, marginBottom: 8 }}>Cor Principal do App e Site</Label>
          <View style={styles.paletteGrid}>
            {PALETAS_LISTA.map(([key, pal]) => {
              const ativo = palette === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setPalette(key)}
                  style={[
                    styles.paletteChip,
                    {
                      borderColor: ativo ? pal.dark : t.border,
                      backgroundColor: ativo ? t.backgroundSelected : 'transparent',
                    },
                  ]}>
                  <View style={[styles.swatch, { backgroundColor: pal.dark }]} />
                  <Txt bold={ativo} style={{ fontSize: 13 }}>{pal.nome}</Txt>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <SectionTitle>Sobre o App e Ajuda</SectionTitle>
          <Txt bold style={{ fontSize: 16, marginBottom: 4 }}>Fichas D&D (5e)</Txt>
          <Txt style={{ color: t.textSecondary, fontSize: 14, marginBottom: 12 }}>
            Desenvolvido por Eduardo Cardoso Oliveira.
          </Txt>
          <Button
            title="Refazer Tutorial do App"
            icon="compass-outline"
            variant="ghost"
            onPress={abrirTutorial}
          />
          <Pressable
            onPress={() => Linking.openURL('https://instagram.com/Edu0_22_')}
            style={styles.instaBtn}>
            <Ionicons name="logo-instagram" size={18} color={t.primary} />
            <Txt bold style={{ color: t.primary, fontSize: 14 }}>
              Instagram @Edu0_22_
            </Txt>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  roleBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  friendCodeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarChoice: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
  },
  roleOption: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCard: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  friendAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reqBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  friendActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  friendActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  row: { flexDirection: 'row', gap: 8 },
  opt: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paletteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  instaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 4 },
});
