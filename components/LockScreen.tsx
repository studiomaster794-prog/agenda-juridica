import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useApp } from '@/context/AppProvider';
import { AppText, Button, Screen } from '@/components/ui';

export function LockScreen() {
  const { colors, unlock, locked } = useApp();

  useEffect(() => {
    if (locked) {
      unlock().catch(() => undefined);
    }
  }, [locked, unlock]);

  if (!locked) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 80,
      }}>
      <Screen style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="lock-closed" size={34} color={colors.gold} />
        </View>
        <AppText variant="h1">Agenda protegida</AppText>
        <AppText color={colors.textSecondary} style={{ textAlign: 'center' }}>
          Use o Face ID ou a senha do iPhone para ver os dados dos seus clientes.
        </AppText>
        <Button title="Desbloquear" icon="scan-outline" onPress={() => unlock()} />
      </Screen>
    </View>
  );
}
