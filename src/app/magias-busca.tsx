import { useLocalSearchParams } from 'expo-router';

import BuscaMagiasScreen from '@/screens/BuscaMagiasScreen';

export default function Route() {
  const { nivel } = useLocalSearchParams<{ nivel?: string }>();
  return <BuscaMagiasScreen nivelInicial={nivel !== undefined ? Number(nivel) : undefined} />;
}
