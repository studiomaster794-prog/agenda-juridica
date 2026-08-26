import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Screen } from '@/components/ui';
import { useApp } from '@/context/AppProvider';
import { requestNotificationPermission } from '@/lib/notifications';
import { spacing } from '@/theme';

const PAGES = [
  {
    icon: 'briefcase-outline' as const,
    title: 'Organize suas audiências e compromissos.',
    text: 'Tudo o que hoje está na planilha — data, horário, processo, cliente, assunto e comarca — em um aplicativo feito para o dia a dia do escritório.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Receba alertas com 10 e 7 dias de antecedência.',
    text: 'Os lembretes aparecem na tela bloqueada do iPhone, mesmo com o aplicativo fechado. Você escolhe os demais avisos.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Seus dados protegidos e disponíveis mesmo sem internet.',
    text: 'Nomes de clientes e números de processo ficam neste aparelho. Depois, se quiser, dá para proteger com Face ID.',
  },
];

export default function OnboardingScreen() {
  const { colors, updateSettings } = useApp();
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const page = PAGES[index];
  const last = index === PAGES.length - 1;

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);

    try {
      if (Platform.OS !== 'web') {
        await requestNotificationPermission().catch(() => undefined);
      }
      await updateSettings('onboardingDone', true);
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1, padding: spacing.xl, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <AppText variant="caption" color={colors.goldDeep}>
            AGENDA JURÍDICA
          </AppText>
        </View>
        <View style={{ alignItems: 'center', gap: 18, paddingHorizontal: 12 }}>
          <View
            style={{
              width: 92,
              height: 92,
              borderRadius: 46,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name={page.icon} size={38} color={colors.gold} />
          </View>
          <AppText variant="h1" style={{ textAlign: 'center' }}>
            {page.title}
          </AppText>
          <AppText color={colors.textSecondary} style={{ textAlign: 'center', lineHeight: 24 }}>
            {page.text}
          </AppText>
        </View>
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {PAGES.map((_, pageIndex) => (
              <View
                key={pageIndex}
                style={{
                  width: pageIndex === index ? 18 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: pageIndex === index ? colors.gold : colors.border,
                }}
              />
            ))}
          </View>
          {last ? (
            <Button
              title={Platform.OS === 'web' ? 'Começar' : 'Permitir notificações e começar'}
              onPress={finish}
              loading={finishing}
            />
          ) : (
            <Button title="Continuar" onPress={() => setIndex((value) => value + 1)} />
          )}
        </View>
      </SafeAreaView>
    </Screen>
  );
}
