import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useDiceStore } from '@/store/useDiceStore';
import { fmt } from '@/utils/calc';

/** 0 = vazio, 1 = proficiente (preenchido), 2 = especialista (ícone duplo) */
export function ProficiencyMark({ nivel }: { nivel: 0 | 1 | 2 }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.mark,
        { borderColor: t.primary, backgroundColor: nivel > 0 ? t.primary : 'transparent' },
      ]}>
      {nivel === 1 ? <Ionicons name="checkmark" size={16} color={t.onPrimary} /> : null}
      {nivel === 2 ? <Ionicons name="checkmark-done" size={17} color={t.onPrimary} /> : null}
    </View>
  );
}

interface Props {
  nome: string;
  detalhe?: string;
  bonus: number;
  nivel: 0 | 1 | 2;
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * Linha de perícia/teste de resistência:
 * - Tocar na bolinha à esquerda alterna a proficiência (0 -> 1 -> 2).
 * - Tocar no bônus ou no nome rola 1d20 + bônus (segurar rola com Vantagem).
 */
export const ProficiencyRow = memo(function ProficiencyRow({
  nome,
  detalhe,
  bonus,
  nivel,
  onPress,
  disabled,
}: Props) {
  const t = useTheme();
  const rolarD20 = useDiceStore((s) => s.rolarD20);

  return (
    <View style={[styles.row, { borderColor: t.border }]}>
      <Pressable onPress={onPress} disabled={disabled} hitSlop={10}>
        <ProficiencyMark nivel={nivel} />
      </Pressable>

      <Pressable
        onPress={() => rolarD20(nome, bonus)}
        onLongPress={() => rolarD20(nome, bonus, 'vantagem')}
        style={({ pressed }) => [
          styles.rollWrap,
          { backgroundColor: pressed ? t.backgroundSelected : 'transparent' },
        ]}>
        <View style={[styles.bonusBox, { borderColor: nivel > 0 ? t.primary : t.border }]}>
          <Text style={[styles.bonus, { color: t.text }]}>{fmt(bonus)}</Text>
        </View>
        <Text style={[styles.nome, { color: t.text }]} numberOfLines={1}>
          {nome}
          {detalhe ? <Text style={{ color: t.textSecondary, fontSize: 12 }}>{`  ${detalhe}`}</Text> : null}
        </Text>
        <MaterialCommunityIcons name="dice-d20-outline" size={16} color={t.textSecondary} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingHorizontal: 4 },
  mark: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rollWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  bonusBox: { minWidth: 46, paddingVertical: 3, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  bonus: { fontSize: 16, fontWeight: '800' },
  nome: { flex: 1, fontSize: 15, fontWeight: '500' },
});
