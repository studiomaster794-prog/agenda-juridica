import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Card, IconButton, Screen } from '@/components/ui';
import { useApp } from '@/context/AppProvider';
import { confirmAction } from '@/lib/dialogs';
import { radius, spacing } from '@/theme';

const COLORS = ['#4A90C3', '#3D8B6E', '#C4453C', '#C4A35A', '#8B6BB0', '#5B7C8A'];

export default function SubjectsScreen() {
  const router = useRouter();
  const { colors, subjects, createSubject, editSubject, removeSubject, showToast } = useApp();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setColor(COLORS[0]);
    setEditingId(null);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Digite o nome do assunto.', 'error');
      return;
    }
    const duplicate = subjects.some(
      (item) => item.name.toLocaleLowerCase('pt-BR') === trimmed.toLocaleLowerCase('pt-BR') && item.id !== editingId,
    );
    if (duplicate) {
      showToast('Já existe um assunto com esse nome.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await editSubject(editingId, trimmed, color);
        showToast('Assunto atualizado.');
      } else {
        await createSubject(trimmed, color);
        showToast('Assunto criado.');
      }
      reset();
    } catch {
      showToast('Não foi possível salvar o assunto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async (id: string, subjectName: string) => {
    const confirmed = await confirmAction(
      'Excluir assunto',
      `Excluir “${subjectName}”? Os compromissos existentes não serão apagados.`,
      'Excluir',
      true,
    );
    if (!confirmed) return;
    await removeSubject(id);
    if (editingId === id) reset();
    showToast('Assunto excluído.', 'info');
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm }}>
          <IconButton name="chevron-back" accessibilityLabel="Voltar" onPress={() => router.back()} />
          <AppText variant="h2" style={{ flex: 1 }}>Assuntos personalizados</AppText>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: 16 }}>
          <Card>
            <View style={{ gap: 12 }}>
              <AppText variant="h3">{editingId ? 'Editar assunto' : 'Novo assunto'}</AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ex.: Previdenciário"
                placeholderTextColor={colors.textMuted}
                style={{
                  minHeight: 48,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  paddingHorizontal: 14,
                  fontSize: 16,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {COLORS.map((option) => (
                  <Pressable
                    key={option}
                    accessibilityLabel={`Cor ${option}`}
                    onPress={() => setColor(option)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: option,
                      borderWidth: color === option ? 3 : 0,
                      borderColor: colors.text,
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {editingId ? <Button title="Cancelar" variant="secondary" onPress={reset} style={{ flex: 1 }} /> : null}
                <Button title={editingId ? 'Salvar alterações' : 'Adicionar'} onPress={save} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </Card>

          <View style={{ gap: 10 }}>
            {subjects.map((subject) => (
              <View
                key={`${subject.custom ? 'custom' : 'built-in'}-${subject.name}`}
                style={{
                  minHeight: 58,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: subject.color }} />
                <AppText style={{ flex: 1 }}>{subject.name}</AppText>
                {subject.custom && subject.id ? (
                  <>
                    <Pressable
                      accessibilityLabel={`Editar ${subject.name}`}
                      hitSlop={8}
                      onPress={() => {
                        setEditingId(subject.id ?? null);
                        setName(subject.name);
                        setColor(subject.color);
                      }}>
                      <Ionicons name="create-outline" size={21} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable accessibilityLabel={`Excluir ${subject.name}`} hitSlop={8} onPress={() => void confirmRemove(subject.id!, subject.name)}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </>
                ) : (
                  <AppText variant="small" color={colors.textMuted}>Padrão</AppText>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
