import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { UserMenuButton } from '@/components/UserMenuButton';
import { useTheme } from '@/hooks/use-theme';

export default function MainTabsLayout() {
  const t = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.backgroundElement },
        headerTintColor: t.text,
        headerRight: () => <UserMenuButton />,
        tabBarStyle: { backgroundColor: t.backgroundElement, borderTopColor: t.border },
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textSecondary,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Fichas',
          headerTitle: 'Minhas Fichas',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dice-d20" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="compendio"
        options={{
          title: 'Compêndio',
          headerTitle: 'Compêndio D&D 5e',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          headerTitle: 'Perfil e Configurações',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
