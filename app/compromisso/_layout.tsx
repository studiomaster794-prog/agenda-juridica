import { Stack } from 'expo-router';
import React from 'react';
import { useApp } from '@/context/AppProvider';

export default function CompromissoLayout() {
  const { colors } = useApp();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
