import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppointmentCard } from '@/components/AppointmentCard';
import { AppText, Card, EmptyState, FAB, Screen } from '@/components/ui';
import { useApp } from '@/context/AppProvider';
import { formatDateLong, formatTimeBR, greetingForHour, relativeAppointmentLabel } from '@/lib/dates';
import { spacing } from '@/theme';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, stats, nextAppointment, upcoming, attentionItems } = useApp();
  const greeting = greetingForHour(new Date().getHours());

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: 16 }}>
          <View>
            <AppText variant="caption" color={colors.goldDeep}>
              {formatDateLong(new Date())}
            </AppText>
            <AppText variant="title">{greeting}</AppText>
          </View>

          {nextAppointment ? (
            <Card onPress={() => router.push(`/compromisso/${nextAppointment.id}`)}>
              <AppText variant="caption" color={colors.goldDeep}>
                Próximo compromisso
              </AppText>
              <AppText variant="h2" style={{ marginTop: 6 }}>
                {nextAppointment.clientName}
              </AppText>
              <AppText color={colors.textSecondary} style={{ marginTop: 4 }}>
                {relativeAppointmentLabel(nextAppointment.date, nextAppointment.time)}
                {nextAppointment.courthouse ? ` · ${nextAppointment.courthouse}` : ''}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Pill icon="time-outline" text={formatTimeBR(nextAppointment.time)} />
                {nextAppointment.subject ? <Pill icon="pricetag-outline" text={nextAppointment.subject} /> : null}
              </View>
            </Card>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="Nenhum compromisso cadastrado"
              subtitle="Toque no + para registrar a próxima audiência, prazo ou reunião."
            />
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat label="Hoje" value={stats.today} tone="today" />
            <Stat label="7 dias" value={stats.week} tone="soon" />
            <Stat label="30 dias" value={stats.month} tone="future" />
          </View>

          {attentionItems.length > 0 ? (
            <View style={{ gap: 10 }}>
              <AppText variant="h3">Precisa de atenção</AppText>
              {attentionItems.map((item) => (
                <AppointmentCard
                  key={item.id}
                  appointment={item}
                  compact
                  onPress={() => router.push(`/compromisso/${item.id}`)}
                />
              ))}
            </View>
          ) : null}

          {upcoming.length > 0 ? (
            <View style={{ gap: 10 }}>
              <AppText variant="h3">Próximos compromissos</AppText>
              {upcoming.slice(0, 12).map((item) => (
                <AppointmentCard
                  key={item.id}
                  appointment={item}
                  onPress={() => router.push(`/compromisso/${item.id}`)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
        <FAB
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/compromisso/novo');
          }}
        />
      </SafeAreaView>
    </Screen>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'today' | 'soon' | 'future' }) {
  const { colors } = useApp();
  const color = colors[tone];
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="h1" color={color} style={{ marginTop: 4 }}>
        {value}
      </AppText>
    </View>
  );
}

function Pill({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useApp();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surfaceAlt,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
      }}>
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <AppText variant="caption">{text}</AppText>
    </View>
  );
}
