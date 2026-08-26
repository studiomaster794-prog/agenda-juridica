import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Card, IconButton, Screen } from '@/components/ui';
import { useApp } from '@/context/AppProvider';
import { pickSpreadsheet } from '@/lib/importExport';
import { formatDateShort, formatTimeBR } from '@/lib/dates';
import { spacing } from '@/theme';
import type { AppointmentDraft, ImportPreview } from '@/types';

export default function ImportSpreadsheetScreen() {
  const router = useRouter();
  const { appointments, colors, importAppointments, showToast } = useApp();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const selected = useMemo(
    () => preview?.rows.filter((row) => row.selected && row.errors.length === 0 && !row.isDuplicate) ?? [],
    [preview],
  );

  const chooseFile = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await pickSpreadsheet(appointments);
      if (!result) return;
      if ('error' in result) {
        setError(result.error);
        setPreview(null);
        return;
      }
      if (result.total === 0) {
        setError('Não encontrei colunas de Data, Horário e Cliente nesse arquivo.');
        setPreview(null);
        return;
      }
      setPreview(result);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (rowNumber: number) => {
    setPreview((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) =>
              row.rowNumber === rowNumber && row.errors.length === 0 && !row.isDuplicate
                ? { ...row, selected: !row.selected }
                : row,
            ),
          }
        : current,
    );
  };

  const confirmImport = async () => {
    if (selected.length === 0) return;
    setImporting(true);
    try {
      const drafts: AppointmentDraft[] = selected.map((row) => ({
        date: row.date,
        time: row.time,
        processNumber: row.processNumber,
        clientName: row.clientName,
        subject: row.subject,
        courthouse: row.courthouse,
        location: '',
        notes: '',
        status: 'agendado',
        type: 'audiencia',
        reminder10d: true,
        reminder7d: true,
        reminder1d: false,
        reminderSameDay: false,
        reminderCustom: null,
      }));
      const count = await importAppointments(drafts);
      showToast(`${count} compromisso${count === 1 ? '' : 's'} importado${count === 1 ? '' : 's'}.`);
      router.replace('/compromissos');
    } catch {
      showToast('Não foi possível concluir a importação.', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm }}>
          <IconButton name="close" accessibilityLabel="Fechar" onPress={() => router.back()} />
          <AppText variant="h2" style={{ flex: 1 }}>Importar planilha</AppText>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: 16 }}>
          <Card>
            <View style={{ gap: 8 }}>
              <AppText variant="h3">Selecione um arquivo CSV ou XLSX</AppText>
              <AppText color={colors.textSecondary} style={{ lineHeight: 22 }}>
                A planilha deve ter colunas como Data, Horário, Cliente, Processo, Assunto e Comarca.
              </AppText>
              <Button title="Escolher arquivo" icon="document-attach-outline" onPress={chooseFile} loading={loading} />
            </View>
          </Card>

          {error ? (
            <Card style={{ borderColor: colors.danger }}>
              <AppText color={colors.danger}>{error}</AppText>
            </Card>
          ) : null}

          {preview ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Summary label="Válidos" value={preview.valid} color={colors.success} />
                <Summary label="Duplicados" value={preview.duplicates} color={colors.warning} />
                <Summary label="Com erro" value={preview.invalid} color={colors.danger} />
              </View>

              <View style={{ gap: 10 }}>
                {preview.rows.map((row) => {
                  const disabled = row.errors.length > 0 || row.isDuplicate;
                  return (
                    <Pressable
                      key={row.rowNumber}
                      disabled={disabled}
                      onPress={() => toggleRow(row.rowNumber)}
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: row.selected && !disabled ? colors.gold : colors.border,
                        borderWidth: row.selected && !disabled ? 2 : 1,
                        borderRadius: 14,
                        padding: 14,
                        opacity: disabled ? 0.65 : 1,
                      }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons
                          name={disabled ? 'alert-circle-outline' : row.selected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={disabled ? colors.danger : colors.goldDeep}
                        />
                        <View style={{ flex: 1 }}>
                          <AppText variant="bodyStrong">{row.clientName || `Linha ${row.rowNumber}`}</AppText>
                          <AppText variant="caption" color={colors.textSecondary}>
                            {row.date ? formatDateShort(row.date) : 'Data inválida'} · {row.time ? formatTimeBR(row.time) : 'Horário inválido'}
                          </AppText>
                          {row.processNumber ? <AppText variant="caption">Processo: {row.processNumber}</AppText> : null}
                          {row.isDuplicate ? <AppText variant="caption" color={colors.warning}>Já cadastrado</AppText> : null}
                          {row.errors.length ? <AppText variant="caption" color={colors.danger}>{row.errors.join(' · ')}</AppText> : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Button
                title={`Importar ${selected.length} selecionado${selected.length === 1 ? '' : 's'}`}
                onPress={confirmImport}
                disabled={selected.length === 0}
                loading={importing}
              />
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useApp();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border }}>
      <AppText variant="h2" color={color}>{value}</AppText>
      <AppText variant="small" color={colors.textMuted}>{label}</AppText>
    </View>
  );
}
