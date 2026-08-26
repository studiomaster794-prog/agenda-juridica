import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppointmentForm } from '@/components/AppointmentForm';
import { AppText, IconButton, Screen } from '@/components/ui';
import { useApp } from '@/context/AppProvider';
import { emptyDraft } from '@/lib/draft';
import { spacing } from '@/theme';

export default function NewAppointmentScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { settings, saveAppointment, showToast } = useApp();
  const initial = emptyDraft(settings, typeof date === 'string' ? date : undefined);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm }}>
          <IconButton name="close" accessibilityLabel="Fechar" onPress={() => router.back()} />
          <AppText variant="h2" style={{ flex: 1 }}>
            Novo compromisso
          </AppText>
        </View>
        <AppointmentForm
          initial={initial}
          submitLabel="Salvar compromisso"
          onSubmit={async (draft) => {
            await saveAppointment(draft);
            showToast('Compromisso salvo.');
            router.replace('/(tabs)');
          }}
        />
      </SafeAreaView>
    </Screen>
  );
}
