import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { APPOINTMENT_TYPES } from '@/constants';
import { useApp } from '@/context/AppProvider';
import { formatDateShort, formatTimeBR } from '@/lib/dates';
import { validateAppointment } from '@/lib/validation';
import { radius, spacing } from '@/theme';
import type { AppointmentDraft, AppointmentType } from '@/types';
import { AppText, Button, Chip } from '@/components/ui';

export function AppointmentForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: AppointmentDraft;
  submitLabel: string;
  onSubmit: (draft: AppointmentDraft) => Promise<void>;
}) {
  const { colors, settings, subjects } = useApp();
  const [draft, setDraft] = useState<AppointmentDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<'date' | 'time' | 'custom' | null>(null);
  const [saving, setSaving] = useState(false);
  const [customSubject, setCustomSubject] = useState('');

  const dateValue = useMemo(() => parse(draft.date || format(new Date(), 'yyyy-MM-dd'), 'yyyy-MM-dd', new Date()), [draft.date]);
  const timeValue = useMemo(() => parse(draft.time || '09:00', 'HH:mm', new Date()), [draft.time]);
  const customValue = useMemo(
    () => (draft.reminderCustom ? new Date(draft.reminderCustom) : new Date()),
    [draft.reminderCustom],
  );

  const update = (patch: Partial<AppointmentDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const onPicker = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setPicker(null);
    if (event.type === 'dismissed' || !selected) return;
    if (picker === 'date') update({ date: format(selected, 'yyyy-MM-dd') });
    if (picker === 'time') update({ time: format(selected, 'HH:mm') });
    if (picker === 'custom') update({ reminderCustom: selected.toISOString() });
  };

  const handleSave = async () => {
    const nextErrors = validateAppointment(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      await onSubmit(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Field label="Cliente" error={errors.clientName} required>
          <Input
            value={draft.clientName}
            placeholder="Nome do cliente"
            onChangeText={(clientName) => update({ clientName })}
            autoCapitalize="words"
          />
        </Field>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Data" error={errors.date} required>
              <SelectBox label={formatDateShort(draft.date)} onPress={() => setPicker('date')} />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Horário" error={errors.time} required>
              <SelectBox label={formatTimeBR(draft.time)} onPress={() => setPicker('time')} />
            </Field>
          </View>
        </View>

        {picker ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' }}>
            <DateTimePicker
              value={picker === 'date' ? dateValue : picker === 'time' ? timeValue : customValue}
              mode={picker === 'time' || picker === 'custom' ? (picker === 'custom' ? 'datetime' : 'time') : 'date'}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              locale="pt-BR"
              is24Hour
              onChange={onPicker}
              themeVariant={colors.background === '#0B1220' ? 'dark' : 'light'}
            />
            {Platform.OS === 'ios' ? (
              <Button title="Pronto" variant="ghost" onPress={() => setPicker(null)} />
            ) : null}
          </View>
        ) : null}

        <Field label="Nº do processo">
          <Input
            value={draft.processNumber}
            placeholder="0000000-00.0000.0.00.0000"
            onChangeText={(processNumber) => update({ processNumber })}
            autoCapitalize="none"
          />
        </Field>

        <Field label="Assunto">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {subjects.map((subject) => (
              <Chip
                key={subject.name}
                label={subject.name}
                selected={draft.subject === subject.name}
                onPress={() => update({ subject: subject.name })}
              />
            ))}
          </View>
          <Input
            value={customSubject}
            placeholder="Assunto personalizado"
            onChangeText={setCustomSubject}
            onSubmitEditing={() => {
              if (customSubject.trim()) {
                update({ subject: customSubject.trim() });
                setCustomSubject('');
              }
            }}
          />
        </Field>

        <Field label="Comarca">
          <Input value={draft.courthouse} placeholder="Ex.: Pinheiro" onChangeText={(courthouse) => update({ courthouse })} />
        </Field>

        <Field label="Local da audiência">
          <Input value={draft.location} placeholder="Fórum, sala ou endereço" onChangeText={(location) => update({ location })} />
        </Field>

        <Field label="Tipo de compromisso">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {APPOINTMENT_TYPES.map((type) => (
              <Chip
                key={type.value}
                label={type.label}
                selected={draft.type === type.value}
                onPress={() => update({ type: type.value as AppointmentType })}
              />
            ))}
          </View>
        </Field>

        <Field label="Observações">
          <Input
            value={draft.notes}
            placeholder="Anotações internas"
            onChangeText={(notes) => update({ notes })}
            multiline
          />
        </Field>

        <Field label="Lembretes">
          <ReminderRow
            label="10 dias antes"
            value={draft.reminder10d}
            onValueChange={(reminder10d) => update({ reminder10d })}
          />
          <ReminderRow
            label="7 dias antes"
            value={draft.reminder7d}
            onValueChange={(reminder7d) => update({ reminder7d })}
          />
          <ReminderRow
            label="1 dia antes"
            value={draft.reminder1d}
            onValueChange={(reminder1d) => update({ reminder1d })}
          />
          <ReminderRow
            label="No mesmo dia"
            value={draft.reminderSameDay}
            onValueChange={(reminderSameDay) => update({ reminderSameDay })}
          />
          <ReminderRow
            label="Horário personalizado"
            value={Boolean(draft.reminderCustom)}
            onValueChange={(enabled) => {
              if (enabled) {
                setPicker('custom');
                if (!draft.reminderCustom) update({ reminderCustom: new Date().toISOString() });
              } else {
                update({ reminderCustom: null });
              }
            }}
          />
          {draft.reminderCustom ? (
            <AppText variant="caption" color={colors.textSecondary}>
              Personalizado: {format(new Date(draft.reminderCustom), "dd/MM/yyyy 'às' HH:mm")}
            </AppText>
          ) : null}
          <AppText variant="caption" color={colors.textMuted}>
            Os alertas de 10 e 7 dias vêm ativados por padrão. Horário padrão: {settings.defaultAlertTime}.
          </AppText>
        </Field>

        <Button title={submitLabel} onPress={handleSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  const { colors } = useApp();
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
        {required ? ' *' : ''}
      </AppText>
      {children}
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function Input({
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput> & { multiline?: boolean }) {
  const { colors } = useApp();
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      style={{
        backgroundColor: colors.inputBg,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 14,
        minHeight: multiline ? 96 : 48,
        color: colors.text,
        fontSize: 16,
        textAlignVertical: multiline ? 'top' : 'center',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    />
  );
}

function SelectBox({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.inputBg,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        minHeight: 48,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      <AppText>{label}</AppText>
    </Pressable>
  );
}

function ReminderRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      <AppText>{label}</AppText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.gold, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}
