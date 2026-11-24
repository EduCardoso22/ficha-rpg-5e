import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { verificarAtualizacaoManual } from '@/components/OtaUpdateBanner';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { logout } from '@/services/auth';
import { AVATARES_RPG, PerfilUsuario, criarPerfilPadrao, escutarMeuPerfil } from '@/services/perfil';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';

function iconeAvatar(avatarId?: string): keyof typeof Ionicons.glyphMap {
  const found = AVATARES_RPG.find((a) => a.id === avatarId);
  return (found?.icon ?? 'person') as keyof typeof Ionicons.glyphMap;
}

export function UserMenuButton() {
  const t = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setPreference = useThemeStore((s) => s.setPreference);

  const [aberto, setAberto] = useState(false);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);

  useEffect(() => {
    if (!user) return;
    return escutarMeuPerfil(user.uid, user.email ?? '', setPerfil);
  }, [user]);

  if (!user) return null;

  const p = perfil ?? criarPerfilPadrao(user.uid, user.email ?? '');

  const navegar = (path: '/(tabs)' | '/(tabs)/compendio' | '/(tabs)/perfil') => {
    setAberto(false);
    router.push(path);
  };

  return (
    <>
      <Pressable
        onPress={() => setAberto(true)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.avatarBtn,
          {
            borderColor: t.primary,
            backgroundColor: t.backgroundSelected,
            opacity: pressed ? 0.75 : 1,
          },
        ]}>
        {p.fotoUrl ? (
          <Image source={{ uri: p.fotoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Ionicons name={iconeAvatar(p.avatar)} size={18} color={t.primary} />
        )}
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAberto(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.menu,
              {
                top: insets.top + 52,
                backgroundColor: t.backgroundElement,
                borderColor: t.border,
              },
            ]}>
            {/* Cabeçalho do usuário */}
            <View style={styles.menuHeader}>
              <View style={[styles.menuAvatar, { borderColor: t.primary, backgroundColor: t.backgroundSelected }]}>
                {p.fotoUrl ? (
                  <Image source={{ uri: p.fotoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Ionicons name={iconeAvatar(p.avatar)} size={20} color={t.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuName, { color: t.text }]} numberOfLines={1}>
                  {p.apelido}
                </Text>
                <Text style={[styles.menuSub, { color: t.textSecondary }]} numberOfLines={1}>
                  {user.isAnonymous ? 'Modo Convidado' : p.codigoAmigo}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: t.border }]} />

            <MenuItem
              icon="person-outline"
              label="Meu Perfil e Amigos"
              color={t.text}
              onPress={() => navegar('/(tabs)/perfil')}
            />
            <MenuItem
              icon="documents-outline"
              label="Minhas Fichas"
              color={t.text}
              onPress={() => navegar('/(tabs)')}
            />
            <MenuItem
              icon="book-outline"
              label="Compêndio 5etools"
              color={t.text}
              onPress={() => navegar('/(tabs)/compendio')}
            />

            <View style={[styles.divider, { backgroundColor: t.border }]} />

            <MenuItem
              icon={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
              label={scheme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              color={t.text}
              onPress={() => {
                setPreference(scheme === 'dark' ? 'light' : 'dark');
                setAberto(false);
              }}
            />
            {Platform.OS !== 'web' ? (
              <MenuItem
                icon="cloud-download-outline"
                label="Verificar Atualizações"
                color={t.primary}
                onPress={() => {
                  setAberto(false);
                  void verificarAtualizacaoManual();
                }}
              />
            ) : null}

            <View style={[styles.divider, { backgroundColor: t.border }]} />

            <MenuItem
              icon="log-out-outline"
              label={user.isAnonymous ? 'Sair do Modo Convidado' : 'Sair da Conta (Logout)'}
              color={t.danger}
              bold
              onPress={() => {
                setAberto(false);
                void logout();
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuItem({
  icon,
  label,
  color,
  bold,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bold?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: t.backgroundSelected },
      ]}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={{ color, fontSize: 14, fontWeight: bold ? '700' : '500', flex: 1 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menu: {
    position: 'absolute',
    right: 16,
    width: 265,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  menuName: { fontSize: 14, fontWeight: '800' },
  menuSub: { fontSize: 12 },
  divider: { height: 1, marginVertical: 4 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
});
