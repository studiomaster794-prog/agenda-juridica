import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppointmentForm } from '@/components/AppointmentForm';
import { AppText, Button, IconButton, Screen } from '@/components/ui';
import { useApp } from '@/context/AppProvider';
import { spacing } from '@/theme';

export default function EditAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { appointments, saveAppointment, showToast } = useApp();
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

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm }}>
          <IconButton name="close" accessibilityLabel="Fechar" onPress={() => router.back()} />
          <AppText variant="h2" style={{ flex: 1 }}>
            Editar compromisso
          </AppText>
        </View>
        <AppointmentForm
          initial={appointment}
          submitLabel="Salvar alterações"
          onSubmit={async (draft) => {
            await saveAppointment({ ...draft, id: appointment.id });
            showToast('Compromisso atualizado.');
            router.back();
          }}
        />
      </SafeAreaView>
    </Screen>
  );
}
