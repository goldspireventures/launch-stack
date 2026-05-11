import '../../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TRPCProvider } from '@/lib/trpc';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TRPCProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0B0B0F' },
            headerTintColor: '#FFFFFF',
            contentStyle: { backgroundColor: '#0B0B0F' },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Heartline' }} />
          <Stack.Screen name="matches" options={{ title: 'Matches' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        </Stack>
      </TRPCProvider>
    </SafeAreaProvider>
  );
}
