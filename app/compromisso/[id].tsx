import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Screen } from '@/components/ui';
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '@/constants';
import { useApp } from '@/context/AppProvider';
import { formatDateShort, formatTimeBR, relativeAppointmentLabel } from '@/lib/dates';
import { confirmAction } from '@/lib/dialogs';
import { spacing } from '@/theme';
import type { AppointmentStatus } from '@/types';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { appointments, colors, saveAppointment, removeAppointment, showToast } = useApp();
  const appointment = appointments.find((item) => item.id === id);

  if (!appointment) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
          <AppText variant="h2">Compromisso não encontrado</AppText>
          <Button title="Voltar" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </SafeAreaView>
      </Screen>
    );
  }

  const setStatus = (status: AppointmentStatus) => {
    saveAppointment({ ...appointment, status }).then(() => {
      showToast(status === 'concluido' ? 'Compromisso concluído.' : 'Compromisso atualizado.');
    });
  };

  const confirmDelete = async () => {
    const confirmed = await confirmAction(
      'Excluir compromisso',
      `Excluir o compromisso de ${appointment.clientName}? Esta ação não pode ser desfeita.`,
      'Excluir',
      true,
    );
    if (!confirmed) return;
    await removeAppointment(appointment.id);
    showToast('Compromisso excluído.', 'info');
    router.replace('/(tabs)');
  };

  const typeLabel = APPOINTMENT_TYPES.find((item) => item.value === appointment.type)?.label ?? appointment.type;
  const statusLabel = APPOINTMENT_STATUSES.find((item) => item.value === appointment.status)?.label ?? appointment.status;

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <AppText variant="h2" style={{ flex: 1 }}>
            Compromisso
          </AppText>
          <Pressable
            accessibilityLabel="Editar compromisso"
            onPress={() => router.push(`/compromisso/${appointment.id}/editar`)}
            hitSlop={10}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="create-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 16, paddingBottom: 48 }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 18,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 8,
            }}>
            <AppText variant="caption" color={colors.goldDeep}>
              {relativeAppointmentLabel(appointment.date, appointment.time)}
            </AppText>
            <AppText variant="h1">{appointment.clientName}</AppText>
            <AppText color={colors.textSecondary}>
              {formatDateShort(appointment.date)} · {formatTimeBR(appointment.time)} · {statusLabel}
            </AppText>
          </View>

          <Info label="Tipo" value={typeLabel} />
          <Info label="Assunto" value={appointment.subject || '—'} />
          <Info label="Nº do processo" value={appointment.processNumber || '—'} />
          <Info label="Comarca" value={appointment.courthouse || '—'} />
          <Info label="Local" value={appointment.location || '—'} />
          <Info label="Observações" value={appointment.notes || '—'} />
          <Info
            label="Lembretes"
            value={[
              appointment.reminder10d ? '10 dias' : null,
              appointment.reminder7d ? '7 dias' : null,
              appointment.reminder1d ? '1 dia' : null,
              appointment.reminderSameDay ? 'No mesmo dia' : null,
              appointment.reminderCustom ? 'Personalizado' : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Nenhum'}
          />

          {appointment.status === 'agendado' ? (
            <View style={{ gap: 10 }}>
              <Button title="Marcar como concluído" icon="checkmark-circle-outline" onPress={() => setStatus('concluido')} />
              <Button title="Marcar como adiado" variant="secondary" onPress={() => setStatus('adiado')} />
              <Button title="Cancelar compromisso" variant="secondary" onPress={() => setStatus('cancelado')} />
            </View>
          ) : (
            <Button title="Reabrir como agendado" variant="secondary" onPress={() => setStatus('agendado')} />
          )}
          <Button title="Excluir" variant="danger" onPress={confirmDelete} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const { colors } = useApp();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText style={{ marginTop: 4 }}>{value}</AppText>
    </View>
  );
}
