import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppointmentCard } from '@/components/AppointmentCard';
import { AppText, Chip, EmptyState, FAB, Screen } from '@/components/ui';
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '@/constants';
import { useApp } from '@/context/AppProvider';
import { uniqueSorted } from '@/lib/search';
import { filterAppointments } from '@/lib/search';
import { spacing } from '@/theme';
import type { AppointmentFilters } from '@/types';
import * as Haptics from 'expo-haptics';

const INITIAL: AppointmentFilters = {
  query: '',
  status: 'todos',
  type: 'todos',
  subject: 'todos',
  courthouse: 'todos',
  client: 'todos',
  period: 'futuros',
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const { colors, appointments, subjects } = useApp();
  const [filters, setFilters] = useState<AppointmentFilters>(INITIAL);
  const [showFilters, setShowFilters] = useState(false);

  const results = useMemo(() => filterAppointments(appointments, filters), [appointments, filters]);
  const courthouses = uniqueSorted(appointments.map((item) => item.courthouse));
  const clients = uniqueSorted(appointments.map((item) => item.clientName));

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ padding: spacing.lg, gap: 12, flex: 1 }}>
          <AppText variant="title">Compromissos</AppText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.inputBg,
              borderRadius: 14,
              paddingHorizontal: 12,
              minHeight: 48,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 8,
            }}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={filters.query}
              onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
              placeholder="Cliente, processo, comarca..."
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, color: colors.text, fontSize: 16, minHeight: 44 }}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label="Filtros" selected={showFilters} onPress={() => setShowFilters((value) => !value)} />
            <Chip
              label="Futuros"
              selected={filters.period === 'futuros'}
              onPress={() => setFilters((current) => ({ ...current, period: 'futuros' }))}
            />
            <Chip
              label="Hoje"
              selected={filters.period === 'hoje'}
              onPress={() => setFilters((current) => ({ ...current, period: 'hoje' }))}
            />
            <Chip
              label="7 dias"
              selected={filters.period === '7d'}
              onPress={() => setFilters((current) => ({ ...current, period: '7d' }))}
            />
            <Chip
              label="Todos"
              selected={filters.period === 'todos'}
              onPress={() => setFilters((current) => ({ ...current, period: 'todos' }))}
            />
          </ScrollView>

          {showFilters ? (
            <View style={{ gap: 10 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <Chip
                  label="Status: todos"
                  selected={filters.status === 'todos'}
                  onPress={() => setFilters((current) => ({ ...current, status: 'todos' }))}
                />
                {APPOINTMENT_STATUSES.map((status) => (
                  <Chip
                    key={status.value}
                    label={status.label}
                    selected={filters.status === status.value}
                    onPress={() => setFilters((current) => ({ ...current, status: status.value }))}
                  />
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {APPOINTMENT_TYPES.map((type) => (
                  <Chip
                    key={type.value}
                    label={type.label}
                    selected={filters.type === type.value}
                    onPress={() =>
                      setFilters((current) => ({
                        ...current,
                        type: current.type === type.value ? 'todos' : type.value,
                      }))
                    }
                  />
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {subjects.map((subject) => (
                  <Chip
                    key={subject.name}
                    label={subject.name}
                    selected={filters.subject === subject.name}
                    onPress={() =>
                      setFilters((current) => ({
                        ...current,
                        subject: current.subject === subject.name ? 'todos' : subject.name,
                      }))
                    }
                  />
                ))}
              </ScrollView>
              {courthouses.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {courthouses.map((courthouse) => (
                    <Chip
                      key={courthouse}
                      label={courthouse}
                      selected={filters.courthouse === courthouse}
                      onPress={() =>
                        setFilters((current) => ({
                          ...current,
                          courthouse: current.courthouse === courthouse ? 'todos' : courthouse,
                        }))
                      }
                    />
                  ))}
                </ScrollView>
              ) : null}
              {clients.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {clients.slice(0, 20).map((client) => (
                    <Chip
                      key={client}
                      label={client}
                      selected={filters.client === client}
                      onPress={() =>
                        setFilters((current) => ({
                          ...current,
                          client: current.client === client ? 'todos' : client,
                        }))
                      }
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ) : null}

          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 120 }}>
            {results.length === 0 ? (
              <EmptyState
                icon="search-outline"
                title="Nenhum resultado encontrado"
                subtitle="Tente outro nome, número de processo ou limpe os filtros."
              />
            ) : (
              results.map((item) => (
                <AppointmentCard
                  key={item.id}
                  appointment={item}
                  onPress={() => router.push(`/compromisso/${item.id}`)}
                />
              ))
            )}
          </ScrollView>
        </View>
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
