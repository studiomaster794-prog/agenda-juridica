import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '@/constants';
import { useApp } from '@/context/AppProvider';
import { formatDateShort, formatTimeBR, relativeAppointmentLabel, urgencyOf } from '@/lib/dates';
import { radius, spacing } from '@/theme';
import type { Appointment } from '@/types';
import { AppText } from '@/components/ui';

export function AppointmentCard({
  appointment,
  onPress,
  compact,
}: {
  appointment: Appointment;
  onPress?: () => void;
  compact?: boolean;
}) {
  const { colors, subjectColor } = useApp();
  const urgency = urgencyOf(appointment.date, appointment.status);
  const accent =
    urgency === 'today'
      ? colors.today
      : urgency === 'soon'
        ? colors.soon
        : urgency === 'done'
          ? colors.done
          : urgency === 'cancelled'
            ? colors.cancelled
            : colors.future;
  const typeLabel = APPOINTMENT_TYPES.find((item) => item.value === appointment.type)?.label ?? 'Compromisso';
  const statusLabel = APPOINTMENT_STATUSES.find((item) => item.value === appointment.status)?.label ?? appointment.status;
  const subject = appointment.subject || typeLabel;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        overflow: 'hidden',
        flexDirection: 'row',
        opacity: pressed ? 0.88 : 1,
        borderWidth: 1,
        borderColor: colors.border,
      })}>
      <View style={{ width: 5, backgroundColor: subjectColor(appointment.subject) || accent }} />
      <View style={{ flex: 1, padding: spacing.lg, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="caption" color={accent}>
            {relativeAppointmentLabel(appointment.date, appointment.time)}
          </AppText>
          <View
            style={{
              backgroundColor: `${accent}22`,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
            }}>
            <AppText variant="small" color={accent}>
              {statusLabel}
            </AppText>
          </View>
        </View>
        <AppText variant="h3" numberOfLines={1}>
          {appointment.clientName}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Meta icon="time-outline" text={formatTimeBR(appointment.time)} />
          {!compact ? <Meta icon="calendar-outline" text={formatDateShort(appointment.date)} /> : null}
          <Meta icon="pricetag-outline" text={subject} />
          {appointment.courthouse ? <Meta icon="location-outline" text={appointment.courthouse} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <AppText variant="caption" color={colors.textSecondary}>
        {text}
      </AppText>
    </View>
  );
}
