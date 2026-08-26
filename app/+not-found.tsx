import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppText, Button, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <Screen style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ maxWidth: 360, width: '100%', gap: 16 }}>
          <AppText variant="h1" style={{ textAlign: 'center' }}>Página não encontrada</AppText>
          <AppText style={{ textAlign: 'center' }}>O endereço acessado não existe na Agenda Jurídica.</AppText>
          <Button title="Voltar ao início" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    </>
  );
}
