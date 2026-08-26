import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import React from 'react';
import { Pressable, View } from 'react-native';
import { WEEKDAYS_SHORT } from '@/constants';
import { useApp } from '@/context/AppProvider';
import { formatMonthYear } from '@/lib/dates';
import { radius } from '@/theme';
import type { Appointment } from '@/types';
import { AppText, IconButton } from '@/components/ui';

export function CalendarMonth({
  visibleMonth,
  selected,
  appointments,
  onChangeMonth,
  onSelectDay,
}: {
  visibleMonth: Date;
  selected: Date;
  appointments: Appointment[];
  onChangeMonth: (date: Date) => void;
  onSelectDay: (date: Date) => void;
}) {
  const { colors, subjectColor } = useApp();
  const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  const dotsByDay = new Map<string, string[]>();
  for (const item of appointments) {
    if (item.status === 'cancelado') continue;
    const key = item.date;
    const current = dotsByDay.get(key) ?? [];
    if (current.length < 3) current.push(subjectColor(item.subject));
    dotsByDay.set(key, current);
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <IconButton
          name="chevron-back"
          accessibilityLabel="Mês anterior"
          onPress={() => onChangeMonth(subMonths(visibleMonth, 1))}
        />
        <AppText variant="h3">{formatMonthYear(visibleMonth)}</AppText>
        <IconButton
          name="chevron-forward"
          accessibilityLabel="Próximo mês"
          onPress={() => onChangeMonth(addMonths(visibleMonth, 1))}
        />
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {WEEKDAYS_SHORT.map((label, index) => (
          <View key={`${label}-${index}`} style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="caption" color={colors.textMuted}>
              {label}
            </AppText>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, visibleMonth);
          const selectedDay = isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const dots = dotsByDay.get(key) ?? [];
          return (
            <Pressable
              key={key}
              onPress={() => onSelectDay(day)}
              style={{
                width: '14.28%',
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selectedDay ? colors.primary : 'transparent',
                  borderWidth: isToday && !selectedDay ? 1.5 : 0,
                  borderColor: colors.gold,
                }}>
                <AppText
                  variant="caption"
                  color={selectedDay ? colors.primaryContrast : inMonth ? colors.text : colors.textMuted}>
                  {format(day, 'd')}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 2, height: 6, marginTop: 2 }}>
                {dots.map((color, index) => (
                  <View
                    key={`${key}-${index}`}
                    style={{ width: 5, height: 5, borderRadius: radius.full, backgroundColor: color }}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
