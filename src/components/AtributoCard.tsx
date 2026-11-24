import { Ionicons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StepperModal } from '@/components/StepperModal';
import { useReadOnly } from '@/components/ficha-ui';
import { useTheme } from '@/hooks/use-theme';
import { useDiceStore } from '@/store/useDiceStore';
import { setField } from '@/store/useFichaStore';
import { ATRIBUTO_NOMES, AtributoKey } from '@/types/ficha';
import { fmt, modificador } from '@/utils/calc';

interface Props {
  atributo: AtributoKey;
  valor: number;
  horizontal?: boolean;
}

/**
 * Toque no modificador para rolar teste de atributo (1d20 + mod);
 * toque no valor base (ou segure) para editar o atributo.
 */
export const AtributoCard = memo(function AtributoCard({ atributo, valor, horizontal }: Props) {
  const t = useTheme();
  const ro = useReadOnly();
  const [editando, setEditando] = useState(false);
  const mod = modificador(valor);
  const rolarD20 = useDiceStore((s) => s.rolarD20);

  return (
    <>
      <View
        style={[
          styles.card,
          horizontal && styles.cardHorizontal,
          { backgroundColor: t.backgroundElement, borderColor: t.border },
        ]}>
        <Pressable
          onPress={() => rolarD20(`Teste de ${ATRIBUTO_NOMES[atributo]}`, mod)}
          onLongPress={() => rolarD20(`Teste de ${ATRIBUTO_NOMES[atributo]}`, mod, 'vantagem')}
          style={({ pressed }) => [
            styles.rollArea,
            pressed && { backgroundColor: t.backgroundSelected },
          ]}>
          <Text style={[styles.nome, { color: t.textSecondary }]} numberOfLines={1}>
            {ATRIBUTO_NOMES[atributo]}
          </Text>
          <Text style={[styles.mod, { color: mod < 0 ? t.danger : t.primary }]}>{fmt(mod)}</Text>
        </Pressable>

        <Pressable
          disabled={ro}
          onPress={() => setEditando(true)}
          hitSlop={6}
          style={({ pressed }) => [
            styles.base,
            {
              borderColor: pressed ? t.primary : t.border,
              backgroundColor: pressed ? t.backgroundSelected : t.background,
            },
          ]}>
          <Text style={[styles.baseTxt, { color: t.text }]}>{valor}</Text>
          {!ro ? <Ionicons name="pencil" size={10} color={t.textSecondary} /> : null}
        </Pressable>
      </View>

      <StepperModal
        visible={editando}
        title={ATRIBUTO_NOMES[atributo]}
        subtitle={`Modificador ${fmt(mod)}`}
        value={valor}
        min={1}
        max={30}
        onChange={(n) => setField(`atributos.${atributo}`, n)}
        onClose={() => setEditando(false)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '31.5%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingBottom: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardHorizontal: {
    width: 'auto',
    flex: 1,
    minWidth: 100,
  },
  rollArea: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  nome: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  mod: { fontSize: 32, fontWeight: '900', lineHeight: 38 },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  baseTxt: { fontSize: 13, fontWeight: '700' },
});
