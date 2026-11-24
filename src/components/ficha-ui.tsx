import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFichaStore, useField, setField } from '@/store/useFichaStore';
import { clamp } from '@/utils/calc';

export function useReadOnly() {
  return useFichaStore((s) => s.readOnly);
}

export function Card({
  children,
  style,
  accent,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.backgroundElement, borderColor: t.border },
        accent && { borderTopWidth: 3, borderTopColor: t.primary },
        style,
      ]}>
      {children}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionTitleWrap}>
        <View style={[styles.sectionAccentPill, { backgroundColor: t.primary }]} />
        <Text style={[styles.section, { color: t.text }]}>{String(children).toUpperCase()}</Text>
      </View>
      {right}
    </View>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[styles.label, { color: t.textSecondary }, style]}>{children}</Text>;
}

export function Txt({
  children,
  style,
  bold,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  bold?: boolean;
  numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ color: t.text, fontSize: 15 }, bold && { fontWeight: '700' }, style]}>
      {children}
    </Text>
  );
}

/** Campo de texto ligado a um caminho da ficha. */
export function FieldText({
  path,
  label,
  multiline,
  placeholder,
  style,
}: {
  path: string;
  label?: string;
  multiline?: boolean;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const value = useField<string>(path) ?? '';
  const readOnly = useReadOnly();
  return (
    <View style={style}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        value={value}
        onChangeText={(v) => setField(path, v)}
        editable={!readOnly}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={t.textSecondary}
        style={[
          styles.input,
          { backgroundColor: t.input, borderColor: t.border, color: t.text },
          multiline && { minHeight: 90, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}

/** Campo numérico: aceita edição livre e grava quando há um número válido. */
export function NumInput({
  value,
  onChange,
  min = -999,
  max = 9999,
  style,
  big,
  editable = true,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  style?: StyleProp<TextStyle>;
  big?: boolean;
  editable?: boolean;
}) {
  const t = useTheme();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={focused ? text : String(value)}
      keyboardType="numbers-and-punctuation"
      editable={editable}
      selectTextOnFocus
      onFocus={() => {
        setText(String(value));
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
      }}
      onChangeText={(s) => {
        setText(s);
        const n = parseInt(s, 10);
        if (!Number.isNaN(n)) onChange(clamp(n, min, max));
      }}
      style={[
        styles.num,
        { backgroundColor: t.input, borderColor: t.border, color: t.text },
        big && { fontSize: 24, fontWeight: '800', width: 76 },
        style,
      ]}
    />
  );
}

export function FieldNum({ path, label, min, max, style }: { path: string; label?: string; min?: number; max?: number; style?: StyleProp<ViewStyle> }) {
  const value = useField<number>(path) ?? 0;
  const readOnly = useReadOnly();
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <NumInput value={value} min={min} max={max} onChange={(n) => setField(path, n)} editable={!readOnly} big />
      {label ? <Label style={{ marginTop: 4 }}>{label}</Label> : null}
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  disabled,
  color,
  size = 22,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  size?: number;
}) {
  const t = useTheme();
  return (
    <Pressable
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}>
      <Ionicons name={name} size={size} color={color ?? t.text} />
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : variant === 'danger' ? t.danger : 'transparent';
  const fg = variant === 'ghost' ? t.text : variant === 'danger' ? '#fff' : t.onPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: variant === 'ghost' ? t.border : bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}>
      {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

/** Bolinha de proficiência (0/1/2). */
export function ProfDot({ level, onPress, disabled }: { level: number; onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8}>
      <View
        style={[
          styles.dot,
          { borderColor: t.primary, backgroundColor: level > 0 ? t.primary : 'transparent' },
        ]}>
        {level === 2 ? <Ionicons name="star" size={11} color={t.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  sectionAccentPill: { width: 3, height: 14, borderRadius: 2 },
  section: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, minWidth: 0 },
  num: { borderWidth: 1, borderRadius: Radii.sm, width: 58, minWidth: 0, paddingHorizontal: 6, paddingVertical: 6, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  iconBtn: { padding: 4 },
  btn: { flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: Radii.md, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
