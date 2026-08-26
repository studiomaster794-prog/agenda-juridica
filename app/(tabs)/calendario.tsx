import { addDays, format, startOfWeek } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppointmentCard } from '@/components/AppointmentCard';
import { CalendarMonth } from '@/components/CalendarMonth';
import { AppText, Chip, EmptyState, FAB, Screen } from '@/components/ui';
import { useApp } from '@/context/AppProvider';
import { formatDateLong, formatTimeBR } from '@/lib/dates';
import { spacing } from '@/theme';
import * as Haptics from 'expo-haptics';

type CalendarMode = 'mes' | 'semana' | 'lista';

export default function CalendarScreen() {
  const router = useRouter();
  const { colors, appointments } = useApp();
  const [mode, setMode] = useState<CalendarMode>('mes');
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const selectedKey = format(selected, 'yyyy-MM-dd');

  const dayItems = useMemo(
    () =>
      appointments
        .filter((item) => item.date === selectedKey)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, selectedKey],
  );

  const weekStart = startOfWeek(selected, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthKey = format(visibleMonth, 'yyyy-MM');
  const monthItems = appointments.filter((item) => item.date.startsWith(monthKey));

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: 12, flex: 1 }}>
          <AppText variant="title">Calendário</AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Mês" selected={mode === 'mes'} onPress={() => setMode('mes')} />
            <Chip label="Semana" selected={mode === 'semana'} onPress={() => setMode('semana')} />
            <Chip label="Lista" selected={mode === 'lista'} onPress={() => setMode('lista')} />
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: 16 }}>
            {mode === 'mes' ? (
              <CalendarMonth
                visibleMonth={visibleMonth}
                selected={selected}
                appointments={appointments}
                onChangeMonth={(date) => {
                  setVisibleMonth(date);
                  setSelected(date);
                }}
                onSelectDay={(date) => {
                  setSelected(date);
                  setVisibleMonth(date);
                }}
              />
            ) : null}

            {mode === 'semana' ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {weekDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const active = key === selectedKey;
                  const count = appointments.filter((item) => item.date === key && item.status !== 'cancelado').length;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setSelected(day)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: 10,
                        borderRadius: 14,
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                      }}>
                      <AppText variant="small" color={active ? colors.primaryContrast : colors.textMuted}>
                        {format(day, 'EEEEE')}
                      </AppText>
                      <AppText variant="h3" color={active ? colors.primaryContrast : colors.text}>
                        {format(day, 'd')}
                      </AppText>
                      {count > 0 ? (
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            marginTop: 4,
                            backgroundColor: active ? colors.gold : colors.goldDeep,
                          }}
                        />
                      ) : (
                        <View style={{ height: 10 }} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {mode !== 'lista' ? (
              <View style={{ gap: 10 }}>
                <AppText variant="h3">{formatDateLong(selected)}</AppText>
                {dayItems.length === 0 ? (
                  <EmptyState
                    icon="sunny-outline"
                    title="Nenhum compromisso neste dia"
                    subtitle="Toque no + para agendar uma audiência nesta data."
                  />
                ) : (
                  dayItems.map((item) => (
                    <AppointmentCard
                      key={item.id}
                      appointment={item}
                      onPress={() => router.push(`/compromisso/${item.id}`)}
                    />
                  ))
                )}
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {monthItems.length === 0 ? (
                  <EmptyState
                    icon="calendar-outline"
                    title="Nada neste mês"
                    subtitle="Os compromissos do mês selecionado aparecerão aqui."
                  />
                ) : (
                  monthItems.map((item) => (
                    <AppointmentCard
                      key={item.id}
                      appointment={item}
                      onPress={() => router.push(`/compromisso/${item.id}`)}
                    />
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
        <FAB
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: '/compromisso/novo', params: { date: selectedKey } });
          }}
        />
      </SafeAreaView>
    </Screen>
  );
}
