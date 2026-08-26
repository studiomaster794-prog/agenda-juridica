import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Screen } from '@/components/ui';
import { APP_NAME, APP_VERSION } from '@/constants';
import { useApp } from '@/context/AppProvider';
import { isBiometricAvailable } from '@/lib/auth';
import { confirmAction, showMessage } from '@/lib/dialogs';
import { appointmentsToBackup, appointmentsToCsv, pickBackupFile, parseBackupJson, shareTextFile } from '@/lib/importExport';
import {
  getNotificationPermission,
  openSystemNotificationSettings,
  requestNotificationPermission,
} from '@/lib/notifications';
import { spacing } from '@/theme';
import type { NotificationPrivacy, ThemePreference } from '@/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, settings, updateSettings, appointments, restoreBackup, showToast } = useApp();
  const [showTime, setShowTime] = useState(false);
  const alertTime = parse(settings.defaultAlertTime, 'HH:mm', new Date());

  const toggleFaceId = async (enabled: boolean) => {
    if (enabled) {
      const available = await isBiometricAvailable();
      if (!available) {
        showMessage('Face ID indisponível', 'Ative o Face ID ou a senha do iPhone nas configurações do aparelho.');
        return;
      }
    }
    await updateSettings('faceIdEnabled', enabled);
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const status = await requestNotificationPermission();
      if (status !== 'granted') {
        Alert.alert(
          'Notificações desativadas',
          'Para receber alertas com o app fechado, permita as notificações nas configurações do iPhone.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Abrir ajustes do iPhone', onPress: () => openSystemNotificationSettings() },
          ],
        );
        return;
      }
    }
    await updateSettings('notificationsEnabled', enabled);
  };

  const exportCsv = async () => {
    try {
      await shareTextFile('agenda-juridica.csv', appointmentsToCsv(appointments), 'text/csv');
      showToast('Cópia em CSV pronta para compartilhar.');
    } catch {
      showToast('Não foi possível exportar o CSV.', 'error');
    }
  };

  const exportBackup = async () => {
    try {
      await shareTextFile('agenda-juridica-backup.json', appointmentsToBackup(appointments), 'application/json');
      showToast('Cópia de segurança gerada.');
    } catch {
      showToast('Não foi possível gerar a cópia de segurança.', 'error');
    }
  };

  const importBackup = async () => {
    try {
      const raw = await pickBackupFile();
      if (!raw) return;
      const items = parseBackupJson(raw);
      const confirmed = await confirmAction(
        'Importar cópia de segurança',
        `Isso substitui os ${appointments.length} compromissos atuais por ${items.length} registros. Continuar?`,
        'Substituir',
        true,
      );
      if (!confirmed) return;
      await restoreBackup(items);
      showToast('Cópia de segurança restaurada.');
    } catch {
      showToast('Arquivo de cópia inválido.', 'error');
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: 18 }}>
          <AppText variant="title">Ajustes</AppText>

          <Section title="Lembretes">
            <Toggle
              label="Notificações"
              subtitle="Alertas na tela bloqueada e na Central de Notificações"
              value={settings.notificationsEnabled}
              onValueChange={toggleNotifications}
            />
            <Toggle
              label="10 dias antes"
              value={settings.defaultReminder10d}
              onValueChange={(value) => updateSettings('defaultReminder10d', value)}
            />
            <Toggle
              label="7 dias antes"
              value={settings.defaultReminder7d}
              onValueChange={(value) => updateSettings('defaultReminder7d', value)}
            />
            <Toggle
              label="1 dia antes"
              value={settings.defaultReminder1d}
              onValueChange={(value) => updateSettings('defaultReminder1d', value)}
            />
            <Toggle
              label="No mesmo dia"
              value={settings.defaultReminderSameDay}
              onValueChange={(value) => updateSettings('defaultReminderSameDay', value)}
            />
            <Row
              label="Horário padrão dos alertas"
              value={settings.defaultAlertTime}
              onPress={() => setShowTime(true)}
            />
            {showTime ? (
              <View>
                <DateTimePicker
                  value={alertTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  is24Hour
                  locale="pt-BR"
                  onChange={(_, date) => {
                    if (Platform.OS !== 'ios') setShowTime(false);
                    if (date) updateSettings('defaultAlertTime', format(date, 'HH:mm'));
                  }}
                />
                {Platform.OS === 'ios' ? (
                  <Pressable onPress={() => setShowTime(false)} style={{ padding: 12, alignItems: 'center' }}>
                    <AppText color={colors.goldDeep}>Pronto</AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <Row
              label="Verificar permissão de notificações"
              onPress={async () => {
                const status = await getNotificationPermission();
                if (status === 'granted') {
                  showToast('Notificações permitidas.', 'info');
                } else {
                  Alert.alert('Notificações desativadas', 'Abra os ajustes do iPhone para permitir os alertas.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Abrir ajustes do iPhone', onPress: () => openSystemNotificationSettings() },
                  ]);
                }
              }}
            />
          </Section>

          <Section title="Privacidade">
            <Toggle label="Proteger com Face ID" value={settings.faceIdEnabled} onValueChange={toggleFaceId} />
            <Row
              label="Notificação completa"
              value={settings.notificationPrivacy === 'completa' ? 'Ativa' : ''}
              onPress={() => updateSettings('notificationPrivacy', 'completa' as NotificationPrivacy)}
            />
            <Row
              label="Notificação privada"
              subtitle="Mostra apenas “Você possui um compromisso agendado”"
              value={settings.notificationPrivacy === 'privada' ? 'Ativa' : ''}
              onPress={() => updateSettings('notificationPrivacy', 'privada' as NotificationPrivacy)}
            />
          </Section>

          <Section title="Aparência">
            {(['automatico', 'claro', 'escuro'] as ThemePreference[]).map((theme) => (
              <Row
                key={theme}
                label={theme === 'automatico' ? 'Automático' : theme === 'claro' ? 'Claro' : 'Escuro'}
                value={settings.theme === theme ? 'Selecionado' : ''}
                onPress={() => updateSettings('theme', theme)}
              />
            ))}
          </Section>

          <Section title="Dados">
            <Row label="Importar planilha" subtitle="CSV ou XLSX" onPress={() => router.push('/importar')} />
            <Row label="Exportar CSV" subtitle="Cópia de segurança simples" onPress={exportCsv} />
            <Row label="Exportar cópia de segurança" onPress={exportBackup} />
            <Row label="Importar cópia de segurança" onPress={importBackup} />
            <Row label="Assuntos personalizados" onPress={() => router.push('/assuntos')} />
          </Section>

          <Section title="Sobre">
            <Row label={APP_NAME} value={APP_VERSION} />
            <Row label="Fuso horário" value="America/Sao_Paulo" />
            <Row
              label="Ajuda do iPhone"
              onPress={() => Linking.openURL('app-settings:')}
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useApp();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption" color={colors.textMuted} style={{ marginLeft: 4 }}>
        {title.toUpperCase()}
      </AppText>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  subtitle,
  value,
  onPress,
}: {
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
      })}>
      <View style={{ flex: 1 }}>
        <AppText>{label}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {value}
          </AppText>
        ) : null}
        {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
      </View>
    </Pressable>
  );
}

function Toggle({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors } = useApp();
  return (
    <View
      style={{
        minHeight: 52,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
      <View style={{ flex: 1 }}>
        <AppText>{label}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.gold, false: colors.border }} />
    </View>
  );
}
