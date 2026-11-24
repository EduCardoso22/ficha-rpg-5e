import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Label, NumInput, Txt } from '@/components/ficha-ui';
import { useTheme } from '@/hooks/use-theme';
import { clamp } from '@/utils/calc';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  onClose: () => void;
}

/** Pequeno diálogo para ajustar um número com −/+ ou digitando. */
export function StepperModal({ visible, title, subtitle, value, min = 0, max = 99, onChange, onClose }: Props) {
  const t = useTheme();
  const step = (d: number) => onChange(clamp(value + d, min, max));
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* o Pressable interno impede que toques no cartão fechem o modal */}
        <Pressable style={[styles.card, { backgroundColor: t.backgroundElement, borderColor: t.border }]}>
          <Txt bold style={{ fontSize: 18, textAlign: 'center' }}>{title}</Txt>
          {subtitle ? <Label style={{ textAlign: 'center', marginTop: 4 }}>{subtitle}</Label> : null}
          <View style={styles.row}>
            <Pressable
              hitSlop={8}
              onPress={() => step(-1)}
              style={({ pressed }) => [styles.btn, { borderColor: t.border, backgroundColor: pressed ? t.backgroundSelected : 'transparent' }]}>
              <Ionicons name="remove" size={28} color={t.text} />
            </Pressable>
            <NumInput value={value} min={min} max={max} onChange={onChange} big style={{ minWidth: 80 }} />
            <Pressable
              hitSlop={8}
              onPress={() => step(1)}
              style={({ pressed }) => [styles.btn, { borderColor: t.border, backgroundColor: pressed ? t.backgroundSelected : 'transparent' }]}>
              <Ionicons name="add" size={28} color={t.text} />
            </Pressable>
          </View>
          <Button title="Concluir" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, borderRadius: 18, borderWidth: 1, padding: 20, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  btn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
