import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useApp } from '@/context/AppProvider';
import { radius, spacing, typography } from '@/theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useApp();
  return <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>{children}</View>;
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { colors } = useApp();
  const body = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}>
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}>
      {body}
    </Pressable>
  );
}

export function AppText({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  variant?: keyof typeof typography;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { colors } = useApp();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[typography[variant], { color: color ?? colors.text }, style]}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useApp();
  const palette = {
    primary: { bg: colors.primary, fg: colors.primaryContrast },
    secondary: { bg: colors.surfaceAlt, fg: colors.text },
    ghost: { bg: 'transparent', fg: colors.text },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          minHeight: 52,
          borderRadius: radius.md,
          backgroundColor: palette.bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function FAB({ onPress }: { onPress: () => void }) {
  const { colors, scheme } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Adicionar compromisso"
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: colors.fab,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.shadow,
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}>
      <Ionicons name="add" size={30} color={scheme === 'dark' ? colors.primaryContrast : '#F3F0E8'} />
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  const { colors } = useApp();
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={30} color={colors.gold} />
      </View>
      <AppText variant="h3" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText color={colors.textSecondary} style={{ textAlign: 'center', lineHeight: 22 }}>
        {subtitle}
      </AppText>
      {action}
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  color,
  accessibilityLabel,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  accessibilityLabel: string;
} & Pick<PressableProps, 'disabled'>) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}>
      <Ionicons name={name} size={22} color={color ?? colors.text} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.full,
        backgroundColor: selected ? colors.primary : colors.surfaceAlt,
        borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
        borderColor: colors.border,
      }}>
      <Text
        style={{
          color: selected ? colors.primaryContrast : color ?? colors.text,
          fontSize: 13,
          fontWeight: '600',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ToastHost() {
  const { toast, colors } = useApp();
  if (!toast) return null;
  const bg =
    toast.tone === 'error' ? colors.danger : toast.tone === 'info' ? colors.navyMid : colors.success;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 110,
        backgroundColor: bg,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: radius.md,
        zIndex: 50,
      }}>
      <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>{toast.message}</Text>
    </View>
  );
}
